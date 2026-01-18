import { Service } from '../../shared/kernel'
import { MainContext } from '../context'
import { v4 as uuidv4 } from 'uuid'
import { IsNull } from 'typeorm'
import { ScoreEventEntity, StudentEntity } from '../db/entities'

export interface scoreEvent {
  id: number
  uuid: string
  student_name: string
  reason_content: string
  delta: number
  val_prev: number
  val_curr: number
  event_time: string
  settlement_id?: number | null
}

declare module '../../shared/kernel' {
  interface Context {
    events: EventRepository
  }
}

export class EventRepository extends Service {
  constructor(ctx: MainContext) {
    super(ctx, 'events')
    this.registerIpc()
  }

  private get mainCtx() {
    return this.ctx as MainContext
  }

  private registerIpc() {
    this.mainCtx.handle('db:event:query', async (_, params) => {
      try {
        return { success: true, data: await this.findAll(params?.limit) }
      } catch (err: any) {
        return { success: false, message: err.message }
      }
    })

    this.mainCtx.handle('db:event:delete', async (event, uuid) => {
      try {
        if (!this.mainCtx.permissions.requirePermission(event, 'points'))
          return { success: false, message: 'Permission denied' }
        await this.deleteByUuid(uuid)
        return { success: true }
      } catch (err: any) {
        return { success: false, message: err.message }
      }
    })

    this.mainCtx.handle('db:event:create', async (event, data) => {
      try {
        if (!this.mainCtx.permissions.requirePermission(event, 'points'))
          return { success: false, message: 'Permission denied' }
        const id = await this.create(data)
        return { success: true, data: id }
      } catch (e: any) {
        return { success: false, message: e.message }
      }
    })

    this.mainCtx.handle('db:event:queryByStudent', async (_, params) => {
      try {
        const limit = Number(params?.limit ?? 50)
        const studentName = String(params?.student_name ?? '')
        const startTime = params?.startTime ? String(params.startTime) : null
        if (!studentName) return { success: true, data: [] }
        const rows = await this.queryByStudent(studentName, startTime, limit)
        return { success: true, data: rows }
      } catch (err: any) {
        return { success: false, message: err.message }
      }
    })

    this.mainCtx.handle('db:leaderboard:query', async (_, params) => {
      try {
        const range = String(params?.range ?? 'today')
        const data = await this.queryLeaderboard(range)
        return { success: true, data }
      } catch (err: any) {
        return { success: false, message: err.message }
      }
    })
  }

  async findAll(limit = 100) {
    const repo = this.ctx.db.dataSource.getRepository(ScoreEventEntity)
    return await repo.find({
      where: { settlement_id: IsNull() },
      order: { event_time: 'DESC' },
      take: limit
    })
  }

  async create(event: { student_name: string; reason_content: string; delta: number }) {
    const ds = this.ctx.db.dataSource
    return await ds.transaction(async (manager) => {
      const studentName = String(event?.student_name ?? '').trim()
      const reasonContent = String(event?.reason_content ?? '').trim()
      const delta = Number(event?.delta ?? 0)

      const studentRepo = manager.getRepository(StudentEntity)
      const existingStudent = await studentRepo.findOne({ where: { name: studentName } })
      if (!existingStudent) throw new Error('Student not found')

      const val_prev = Number(existingStudent.score ?? 0)
      const val_curr = val_prev + (Number.isFinite(delta) ? delta : 0)
      const uuid = uuidv4()
      const event_time = new Date().toISOString()

      const eventsRepo = manager.getRepository(ScoreEventEntity)
      const saved = await eventsRepo.save(
        eventsRepo.create({
          uuid,
          student_name: studentName,
          reason_content: reasonContent,
          delta: Number.isFinite(delta) ? delta : 0,
          val_prev,
          val_curr,
          event_time,
          settlement_id: null
        })
      )

      await studentRepo.update(
        { id: existingStudent.id },
        { score: val_curr, updated_at: new Date().toISOString() }
      )

      return saved.id
    })
  }

  async deleteByUuid(uuid: string) {
    const ds = this.ctx.db.dataSource
    await ds.transaction(async (manager) => {
      const eventsRepo = manager.getRepository(ScoreEventEntity)
      const ev = await eventsRepo.findOne({ where: { uuid: String(uuid ?? '').trim() } })
      if (!ev) return
      if (ev.settlement_id !== null && ev.settlement_id !== undefined) {
        throw new Error('该记录已结算，无法撤销')
      }

      const studentRepo = manager.getRepository(StudentEntity)
      const student = await studentRepo.findOne({ where: { name: ev.student_name } })
      if (student) {
        await studentRepo.update(
          { id: student.id },
          {
            score: Number(student.score ?? 0) - Number(ev.delta ?? 0),
            updated_at: new Date().toISOString()
          }
        )
      }

      await eventsRepo.delete({ uuid: ev.uuid })
    })
  }

  async queryByStudent(studentName: string, startTime: string | null, limit: number) {
    const repo = this.ctx.db.dataSource.getRepository(ScoreEventEntity)
    const qb = repo
      .createQueryBuilder('e')
      .where('e.student_name = :studentName', { studentName })
      .andWhere('e.settlement_id IS NULL')
      .orderBy('e.event_time', 'DESC')
      .limit(limit)
    if (startTime) {
      qb.andWhere('julianday(e.event_time) >= julianday(:startTime)', { startTime })
    }
    return await qb.getMany()
  }

  async queryLeaderboard(range: string) {
    const now = new Date()
    let start = new Date(now)
    if (range === 'today') {
      start.setHours(0, 0, 0, 0)
    } else if (range === 'week') {
      const day = start.getDay()
      const diff = (day === 0 ? -6 : 1) - day
      start.setDate(start.getDate() + diff)
      start.setHours(0, 0, 0, 0)
    } else if (range === 'month') {
      start = new Date(start.getFullYear(), start.getMonth(), 1)
      start.setHours(0, 0, 0, 0)
    } else {
      start.setHours(0, 0, 0, 0)
    }
    const startTime = start.toISOString()

    const qb = this.ctx.db.dataSource
      .getRepository(StudentEntity)
      .createQueryBuilder('s')
      .leftJoin(
        ScoreEventEntity,
        'e',
        'e.student_name = s.name AND e.settlement_id IS NULL AND julianday(e.event_time) >= julianday(:startTime)',
        { startTime }
      )
      .select('s.id', 'id')
      .addSelect('s.name', 'name')
      .addSelect('s.score', 'score')
      .addSelect('COALESCE(SUM(e.delta), 0)', 'range_change')
      .groupBy('s.id')
      .addGroupBy('s.name')
      .addGroupBy('s.score')
      .orderBy('s.score', 'DESC')
      .addOrderBy('range_change', 'DESC')
      .addOrderBy('s.name', 'ASC')

    const rows = await qb.getRawMany()
    return { startTime, rows }
  }
}
