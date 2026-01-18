import { Service } from '../../shared/kernel'
import { MainContext } from '../context'
import { ScoreEventEntity, StudentEntity } from '../db/entities'

export interface student {
  id: number
  name: string
  score: number
  extra_json?: string
}

declare module '../../shared/kernel' {
  interface Context {
    students: StudentRepository
  }
}

export class StudentRepository extends Service {
  constructor(ctx: MainContext) {
    super(ctx, 'students')
    this.registerIpc()
  }

  private get mainCtx() {
    return this.ctx as MainContext
  }

  private registerIpc() {
    this.mainCtx.handle('db:student:query', async () => ({
      success: true,
      data: await this.findAll()
    }))
    this.mainCtx.handle('db:student:create', async (event, data) => {
      if (!this.mainCtx.permissions.requirePermission(event, 'admin'))
        return { success: false, message: 'Permission denied' }
      return { success: true, data: await this.create(data) }
    })
    this.mainCtx.handle('db:student:update', async (event, id, data) => {
      if (!this.mainCtx.permissions.requirePermission(event, 'admin'))
        return { success: false, message: 'Permission denied' }
      await this.update(id, data)
      return { success: true }
    })
    this.mainCtx.handle('db:student:delete', async (event, id) => {
      if (!this.mainCtx.permissions.requirePermission(event, 'admin'))
        return { success: false, message: 'Permission denied' }
      await this.delete(id)
      return { success: true }
    })
  }

  async findAll(): Promise<student[]> {
    const repo = this.ctx.db.dataSource.getRepository(StudentEntity)
    return (await repo.find({ order: { score: 'DESC', name: 'ASC' } })) as any
  }

  async create(student: { name: string }): Promise<number> {
    const repo = this.ctx.db.dataSource.getRepository(StudentEntity)
    const created = repo.create({
      name: String(student?.name ?? '').trim(),
      score: 0,
      extra_json: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    const saved = await repo.save(created)
    return saved.id
  }

  async update(id: number, student: Partial<student>): Promise<void> {
    const next: any = {}
    for (const [key, val] of Object.entries(student)) {
      if (key === 'id') continue
      next[key] = val
    }
    next.updated_at = new Date().toISOString()
    await this.ctx.db.dataSource.getRepository(StudentEntity).update(id, next)
  }

  async delete(id: number): Promise<void> {
    const ds = this.ctx.db.dataSource
    await ds.transaction(async (manager) => {
      const studentsRepo = manager.getRepository(StudentEntity)
      const studentRow = await studentsRepo.findOne({ where: { id } })
      if (!studentRow) return
      await manager.getRepository(ScoreEventEntity).delete({ student_name: studentRow.name })
      await studentsRepo.delete({ id })
    })
  }
}
