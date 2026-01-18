import { Context, Service } from '../../shared/kernel'

export type permissionLevel = 'admin' | 'points' | 'view'

declare module '../../shared/kernel' {
  interface Context {
    permissions: PermissionService
  }
}

export class PermissionService extends Service {
  public permissionRank: Record<permissionLevel, number> = { view: 0, points: 1, admin: 2 }
  private permissionsBySenderId = new Map<number, permissionLevel>()
  private SETTINGS_SECURITY_ADMIN = 'security_admin_password'
  private SETTINGS_SECURITY_POINTS = 'security_points_password'

  constructor(ctx: Context) {
    super(ctx, 'permissions')
  }

  shouldProtect() {
    return (
      this.ctx.security.hasSecret(this.SETTINGS_SECURITY_ADMIN) ||
      this.ctx.security.hasSecret(this.SETTINGS_SECURITY_POINTS)
    )
  }

  getDefaultPermission(): permissionLevel {
    return this.shouldProtect() ? 'view' : 'admin'
  }

  getPermission(senderId: number): permissionLevel {
    const existing = this.permissionsBySenderId.get(senderId)
    if (existing) return existing
    const def = this.getDefaultPermission()
    this.permissionsBySenderId.set(senderId, def)
    return def
  }

  setPermission(senderId: number, level: permissionLevel) {
    this.permissionsBySenderId.set(senderId, level)
  }

  requirePermission(event: any, required: permissionLevel): boolean {
    const senderId = event?.sender?.id
    if (typeof senderId !== 'number') return false
    const current = this.getPermission(senderId)
    return this.permissionRank[current] >= this.permissionRank[required]
  }
}
