import { Service } from '../../shared/kernel'
import { MainContext } from '../context'
import { IsNull } from 'typeorm'
import { ScoreEventEntity, SettlementEntity, StudentEntity } from '../db/entities'

export interface settlementSummary {
  id: number
  start_time: string
  end_time: string
  event_count: number
}

export interface settlementLeaderboardRow {
  name: string
  score: number
}

declare module '../../shared/kernel' {
  interface Context {
    settlements: SettlementRepository
  }
}

export class SettlementRepository extends Service {
  constructor(ctx: MainContext) {
    super(ctx, 'settlements')
    this.registerIpc()
  }

  private get mainCtx() {
    return this.ctx as MainContext
  }

  private registerIpc() {
    this.mainCtx.handle('db:settlement:query', async () => {
      try {
        return { success: true, data: await this.findAll() }
      } catch (err: any) {
        return { success: false, message: err.message }
      }
    })

    this.mainCtx.handle('db:settlement:create', async (event) => {
      try {
        if (!this.mainCtx.permissions.requirePermission(event, 'admin'))
          return { success: false, message: 'Permission denied' }
        const data = await this.settleNow()
        return { success: true, data }
      } catch (err: any) {
        return { success: false, message: err.message }
      }
    })

    this.mainCtx.handle('db:settlement:leaderboard', async (_, params) => {
      try {
        const settlementId = Number(params?.settlement_id)
        if (!Number.isFinite(settlementId))
          return { success: false, message: 'Invalid settlement_id' }
        return { success: true, data: await this.getLeaderboard(settlementId) }
      } catch (err: any) {
        return { success: false, message: err.message }
      }
    })
  }

  async findAll(): Promise<settlementSummary[]> {
    const qb = this.ctx.db.dataSource
      .getRepository(SettlementEntity)
      .createQueryBuilder('s')
      .select('s.id', 'id')
      .addSelect('s.start_time', 'start_time')
      .addSelect('s.end_time', 'end_time')
      .addSelect((subQb) => {
        return subQb
          .select('COUNT(1)', 'cnt')
          .from(ScoreEventEntity, 'e')
          .where('e.settlement_id = s.id')
      }, 'event_count')
      .orderBy('julianday(s.end_time)', 'DESC')

    const rows = await qb.getRawMany()
    return rows.map((r: any) => ({
      id: Number(r.id),
      start_time: String(r.start_time),
      end_time: String(r.end_time),
      event_count: Number(r.event_count ?? 0)
    }))
  }

  async settleNow() {
    const ds = this.ctx.db.dataSource
    return await ds.transaction(async (manager) => {
      const eventsRepo = manager.getRepository(ScoreEventEntity)
      const unassignedCount = await eventsRepo.count({ where: { settlement_id: IsNull() } })
      const eventCount = Number(unassignedCount ?? 0)
      if (eventCount <= 0) {
        throw new Error('暂无可结算记录')
      }

      const endTime = new Date().toISOString()

      const settlementsRepo = manager.getRepository(SettlementEntity)
      const lastSettlement = await settlementsRepo
        .createQueryBuilder('s')
        .select('s.end_time', 'end_time')
        .orderBy('julianday(s.end_time)', 'DESC')
        .limit(1)
        .getRawOne<{ end_time?: string }>()

      const minEvent = await eventsRepo
        .createQueryBuilder('e')
        .select('MIN(e.event_time)', 'min_time')
        .where('e.settlement_id IS NULL')
        .getRawOne<{ min_time?: string }>()

      const startTime = String(lastSettlement?.end_time || minEvent?.min_time || endTime)

      const created = await settlementsRepo.save(
        settlementsRepo.create({
          start_time: startTime,
          end_time: endTime,
          created_at: new Date().toISOString()
        })
      )
      const settlementId = created.id

      await eventsRepo
        .createQueryBuilder()
        .update(ScoreEventEntity)
        .set({ settlement_id: settlementId })
        .where('settlement_id IS NULL')
        .execute()

      await manager
        .getRepository(StudentEntity)
        .createQueryBuilder()
        .update(StudentEntity)
        .set({ score: 0, updated_at: new Date().toISOString() })
        .execute()

      return { settlementId, startTime, endTime, eventCount }
    })
  }

  async getLeaderboard(settlementId: number) {
    const settlementsRepo = this.ctx.db.dataSource.getRepository(SettlementEntity)
    const settlement = await settlementsRepo.findOne({ where: { id: settlementId } })
    if (!settlement) {
      throw new Error('结算记录不存在')
    }

    const rows = await this.ctx.db.dataSource
      .getRepository(ScoreEventEntity)
      .createQueryBuilder('e')
      .select('e.student_name', 'name')
      .addSelect('COALESCE(SUM(e.delta), 0)', 'score')
      .where('e.settlement_id = :settlementId', { settlementId })
      .groupBy('e.student_name')
      .orderBy('score', 'DESC')
      .addOrderBy('name', 'ASC')
      .getRawMany<settlementLeaderboardRow>()

    return {
      settlement: {
        id: settlement.id,
        start_time: settlement.start_time,
        end_time: settlement.end_time
      },
      rows: rows.map((r: any) => ({ name: String(r.name), score: Number(r.score ?? 0) }))
    }
  }
}
