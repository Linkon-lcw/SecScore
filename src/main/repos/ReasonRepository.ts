import { Service } from '../../shared/kernel'
import { MainContext } from '../context'
import { ReasonEntity } from '../db/entities'

export interface reason {
  id: number
  content: string
  category: string
  delta: number
  is_system: number
}

declare module '../../shared/kernel' {
  interface Context {
    reasons: ReasonRepository
  }
}

export class ReasonRepository extends Service {
  constructor(ctx: MainContext) {
    super(ctx, 'reasons')
    this.registerIpc()
  }

  private get mainCtx() {
    return this.ctx as MainContext
  }

  private registerIpc() {
    this.mainCtx.handle('db:reason:query', async () => ({
      success: true,
      data: await this.findAll()
    }))
    this.mainCtx.handle('db:reason:create', async (event, data) => {
      if (!this.mainCtx.permissions.requirePermission(event, 'admin'))
        return { success: false, message: 'Permission denied' }
      return { success: true, data: await this.create(data) }
    })
    this.mainCtx.handle('db:reason:update', async (event, id, data) => {
      if (!this.mainCtx.permissions.requirePermission(event, 'admin'))
        return { success: false, message: 'Permission denied' }
      await this.update(id, data)
      return { success: true }
    })
    this.mainCtx.handle('db:reason:delete', async (event, id) => {
      if (!this.mainCtx.permissions.requirePermission(event, 'admin'))
        return { success: false, message: 'Permission denied' }
      const changes = await this.delete(id)
      if (!changes) return { success: false, message: '记录不存在' }
      return { success: true, data: { changes } }
    })
    // 兼容前端 deleteReason 命名错误
    this.mainCtx.handle('db:deleteReason', async (event, id) => {
      if (!this.mainCtx.permissions.requirePermission(event, 'admin'))
        return { success: false, message: 'Permission denied' }
      const changes = await this.delete(id)
      if (!changes) return { success: false, message: '记录不存在' }
      return { success: true, data: { changes } }
    })
  }

  async findAll(): Promise<reason[]> {
    const repo = this.ctx.db.dataSource.getRepository(ReasonEntity)
    return (await repo.find({ order: { category: 'ASC', content: 'ASC' } })) as any
  }

  async create(reason: Omit<reason, 'id' | 'is_system'>): Promise<number> {
    const repo = this.ctx.db.dataSource.getRepository(ReasonEntity)
    const created = repo.create({
      content: String(reason?.content ?? '').trim(),
      category: String(reason?.category ?? '其他'),
      delta: Number(reason?.delta ?? 0),
      is_system: 0,
      updated_at: new Date().toISOString()
    })
    const saved = await repo.save(created)
    return saved.id
  }

  async update(id: number, reason: Partial<reason>): Promise<void> {
    const next: any = {}
    for (const [key, val] of Object.entries(reason)) {
      if (key === 'id') continue
      next[key] = val
    }
    next.updated_at = new Date().toISOString()
    await this.ctx.db.dataSource.getRepository(ReasonEntity).update(id, next)
  }

  async delete(id: number): Promise<number> {
    const result = await this.ctx.db.dataSource.getRepository(ReasonEntity).delete(id)
    return Number(result.affected ?? 0)
  }
}
