import type { DataSource } from 'typeorm'
import {
  ReasonEntity,
  ScoreEventEntity,
  SettlementEntity,
  SettingEntity,
  StudentEntity
} from '../entities'

type exportBundle = {
  students: StudentEntity[]
  reasons: ReasonEntity[]
  events: ScoreEventEntity[]
  settlements: SettlementEntity[]
  settings: SettingEntity[]
}

type importResult = { success: true } | { success: false; message: string }

export class DataBackupRepository {
  constructor(private readonly dataSource: DataSource) {}

  async exportJson(): Promise<string> {
    const bundle = await this.exportBundle()
    return JSON.stringify(bundle, null, 2)
  }

  private async exportBundle(): Promise<exportBundle> {
    const students = await this.dataSource.getRepository(StudentEntity).find()
    const reasons = await this.dataSource.getRepository(ReasonEntity).find()
    const events = await this.dataSource.getRepository(ScoreEventEntity).find()
    const settlements = await this.dataSource
      .getRepository(SettlementEntity)
      .find({ order: { id: 'ASC' } })
    const settings = await this.dataSource
      .getRepository(SettingEntity)
      .createQueryBuilder('s')
      .where("s.key NOT LIKE 'security_%'")
      .getMany()
    return { students, reasons, events, settlements, settings }
  }

  async importJson(jsonText: string): Promise<importResult> {
    let parsed: any
    try {
      parsed = JSON.parse(String(jsonText ?? ''))
    } catch {
      return { success: false, message: 'Invalid JSON' }
    }

    const students = Array.isArray(parsed?.students) ? parsed.students : []
    const reasons = Array.isArray(parsed?.reasons) ? parsed.reasons : []
    const events = Array.isArray(parsed?.events) ? parsed.events : []
    const settlements = Array.isArray(parsed?.settlements) ? parsed.settlements : []
    const settings = Array.isArray(parsed?.settings) ? parsed.settings : []

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.clear(ScoreEventEntity)
        await manager.clear(SettlementEntity)
        await manager.clear(StudentEntity)
        await manager.clear(ReasonEntity)
        await manager
          .getRepository(SettingEntity)
          .createQueryBuilder()
          .delete()
          .where("key NOT LIKE 'security_%'")
          .execute()

        const insertStudents: Partial<StudentEntity>[] = []
        for (const s of students) {
          const name = String(s?.name ?? '').trim()
          if (!name) continue
          const score = Number(s?.score ?? 0)
          const extraJson = s?.extra_json != null ? String(s.extra_json) : null
          const createdAt = s?.created_at != null ? String(s.created_at) : new Date().toISOString()
          const updatedAt = s?.updated_at != null ? String(s.updated_at) : new Date().toISOString()
          insertStudents.push({
            name,
            score: Number.isFinite(score) ? score : 0,
            extra_json: extraJson,
            created_at: createdAt,
            updated_at: updatedAt
          })
        }
        if (insertStudents.length) {
          await manager.getRepository(StudentEntity).insert(insertStudents)
        }

        const insertReasons: Partial<ReasonEntity>[] = []
        for (const r of reasons) {
          const content = String(r?.content ?? '').trim()
          if (!content) continue
          const category = String(r?.category ?? '其他')
          const delta = Number(r?.delta ?? 0)
          const isSystem = Number(r?.is_system ?? 0) ? 1 : 0
          const updatedAt = r?.updated_at != null ? String(r.updated_at) : new Date().toISOString()
          insertReasons.push({
            content,
            category,
            delta: Number.isFinite(delta) ? delta : 0,
            is_system: isSystem,
            updated_at: updatedAt
          })
        }
        if (insertReasons.length) {
          await manager.getRepository(ReasonEntity).insert(insertReasons)
        }

        const insertSettlements: Partial<SettlementEntity>[] = []
        for (const s of settlements) {
          const id = Number(s?.id)
          const startTime = String(s?.start_time ?? '').trim()
          const endTime = String(s?.end_time ?? '').trim()
          const createdAt = String(s?.created_at ?? new Date().toISOString())
          if (!Number.isFinite(id) || !startTime || !endTime) continue
          insertSettlements.push({
            id,
            start_time: startTime,
            end_time: endTime,
            created_at: createdAt
          })
        }
        if (insertSettlements.length) {
          await manager.getRepository(SettlementEntity).insert(insertSettlements)
        }

        const insertEvents: Partial<ScoreEventEntity>[] = []
        for (const e of events) {
          const uuid = String(e?.uuid ?? '').trim()
          const studentName = String(e?.student_name ?? '').trim()
          const reasonContent = String(e?.reason_content ?? '').trim()
          if (!uuid || !studentName || !reasonContent) continue
          const delta = Number(e?.delta ?? 0)
          const valPrev = Number(e?.val_prev ?? 0)
          const valCurr = Number(e?.val_curr ?? 0)
          const eventTime = String(e?.event_time ?? new Date().toISOString())
          const settlementIdRaw = e?.settlement_id
          const settlementId =
            settlementIdRaw === null || settlementIdRaw === undefined
              ? null
              : Number(settlementIdRaw)
          insertEvents.push({
            uuid,
            student_name: studentName,
            reason_content: reasonContent,
            delta: Number.isFinite(delta) ? delta : 0,
            val_prev: Number.isFinite(valPrev) ? valPrev : 0,
            val_curr: Number.isFinite(valCurr) ? valCurr : 0,
            event_time: eventTime,
            settlement_id: Number.isFinite(settlementId as any) ? (settlementId as any) : null
          })
        }
        if (insertEvents.length) {
          await manager.getRepository(ScoreEventEntity).insert(insertEvents)
        }

        for (const it of settings) {
          const key = String(it?.key ?? '').trim()
          if (!key || key.startsWith('security_')) continue
          await manager.getRepository(SettingEntity).save({ key, value: String(it?.value ?? '') })
        }
      })
    } catch (e: any) {
      return { success: false, message: e?.message || 'Import failed' }
    }

    return { success: true }
  }
}
