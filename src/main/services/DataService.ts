import { Service } from '../../shared/kernel'
import { MainContext } from '../context'
import { DataBackupRepository } from '../db/backup/DataBackupRepository'

declare module '../../shared/kernel' {
  interface Context {
    data: DataService
  }
}

export class DataService extends Service {
  constructor(ctx: MainContext) {
    super(ctx, 'data')
    this.registerIpc()
  }

  private get mainCtx() {
    return this.ctx as MainContext
  }

  private registerIpc() {
    this.mainCtx.handle('data:exportJson', async (event) => {
      if (!this.mainCtx.permissions.requirePermission(event, 'admin'))
        return { success: false, message: 'Permission denied' }

      const backup = new DataBackupRepository(this.mainCtx.db.dataSource)
      return {
        success: true,
        data: await backup.exportJson()
      }
    })

    this.mainCtx.handle('data:importJson', async (event, jsonText: string) => {
      if (!this.mainCtx.permissions.requirePermission(event, 'admin'))
        return { success: false, message: 'Permission denied' }

      const backup = new DataBackupRepository(this.mainCtx.db.dataSource)
      const result = await backup.importJson(jsonText)
      if (!result.success) return result

      await this.mainCtx.settings.reloadFromDb()
      return { success: true }
    })
  }
}
