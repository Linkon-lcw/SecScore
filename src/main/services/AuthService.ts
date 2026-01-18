import { Service } from '../../shared/kernel'
import { MainContext } from '../context'
import { permissionLevel } from './PermissionService'
import crypto from 'crypto'

declare module '../../shared/kernel' {
  interface Context {
    auth: AuthService
  }
}

export class AuthService extends Service {
  private SETTINGS_SECURITY_ADMIN = 'security_admin_password'
  private SETTINGS_SECURITY_POINTS = 'security_points_password'
  private SETTINGS_SECURITY_RECOVERY = 'security_recovery_string'

  constructor(ctx: MainContext) {
    super(ctx, 'auth')
    this.registerIpc()
  }

  private get mainCtx() {
    return this.ctx as MainContext
  }

  private registerIpc() {
    const ctx = this.mainCtx

    ctx.handle('auth:getStatus', (event) => {
      const senderId = event?.sender?.id
      const permission =
        typeof senderId === 'number'
          ? ctx.permissions.getPermission(senderId)
          : ctx.permissions.getDefaultPermission()
      return {
        success: true,
        data: {
          permission,
          hasAdminPassword: ctx.security.hasSecret(this.SETTINGS_SECURITY_ADMIN),
          hasPointsPassword: ctx.security.hasSecret(this.SETTINGS_SECURITY_POINTS),
          hasRecoveryString: ctx.security.hasSecret(this.SETTINGS_SECURITY_RECOVERY)
        }
      }
    })

    ctx.handle('auth:login', async (event, password: string) => {
      const senderId = event?.sender?.id
      if (typeof senderId !== 'number') return { success: false, message: 'Invalid sender' }
      if (!ctx.security.isSixDigit(String(password ?? ''))) {
        ctx.permissions.setPermission(senderId, ctx.permissions.getDefaultPermission())
        return { success: false, message: 'Invalid password format' }
      }

      const adminCipher = ctx.settings.getRaw(this.SETTINGS_SECURITY_ADMIN)
      const pointsCipher = ctx.settings.getRaw(this.SETTINGS_SECURITY_POINTS)
      const adminPlain = await ctx.security.decryptSecret(adminCipher)
      const pointsPlain = await ctx.security.decryptSecret(pointsCipher)

      if (adminCipher && adminPlain === password) {
        ctx.permissions.setPermission(senderId, 'admin')
        return { success: true, data: { permission: 'admin' as permissionLevel } }
      }
      if (pointsCipher && pointsPlain === password) {
        ctx.permissions.setPermission(senderId, 'points')
        return { success: true, data: { permission: 'points' as permissionLevel } }
      }

      ctx.permissions.setPermission(senderId, ctx.permissions.getDefaultPermission())
      return { success: false, message: 'Password incorrect' }
    })

    ctx.handle('auth:logout', (event) => {
      const senderId = event?.sender?.id
      if (typeof senderId === 'number')
        ctx.permissions.setPermission(senderId, ctx.permissions.getDefaultPermission())
      return { success: true, data: { permission: ctx.permissions.getDefaultPermission() } }
    })

    ctx.handle(
      'auth:setPasswords',
      async (event, payload: { adminPassword?: string | null; pointsPassword?: string | null }) => {
        const alreadyHasAdmin = ctx.security.hasSecret(this.SETTINGS_SECURITY_ADMIN)
        if (alreadyHasAdmin && !ctx.permissions.requirePermission(event, 'admin'))
          return { success: false, message: 'Permission denied' }

        const adminPasswordRaw = payload?.adminPassword
        const pointsPasswordRaw = payload?.pointsPassword

        if (typeof adminPasswordRaw === 'string') {
          const trimmed = adminPasswordRaw.trim()
          if (trimmed.length === 0) await ctx.settings.setRaw(this.SETTINGS_SECURITY_ADMIN, '')
          else {
            if (!ctx.security.isSixDigit(trimmed))
              return { success: false, message: 'Admin password must be 6 digits' }
            await ctx.settings.setRaw(
              this.SETTINGS_SECURITY_ADMIN,
              await ctx.security.encryptSecret(trimmed)
            )
          }
        }

        if (typeof pointsPasswordRaw === 'string') {
          const trimmed = pointsPasswordRaw.trim()
          if (trimmed.length === 0) await ctx.settings.setRaw(this.SETTINGS_SECURITY_POINTS, '')
          else {
            if (!ctx.security.isSixDigit(trimmed))
              return { success: false, message: 'Points password must be 6 digits' }
            await ctx.settings.setRaw(
              this.SETTINGS_SECURITY_POINTS,
              await ctx.security.encryptSecret(trimmed)
            )
          }
        }

        if (!ctx.security.hasSecret(this.SETTINGS_SECURITY_RECOVERY)) {
          const recovery = crypto.randomBytes(18).toString('base64url')
          await ctx.settings.setRaw(
            this.SETTINGS_SECURITY_RECOVERY,
            await ctx.security.encryptSecret(recovery)
          )
          return { success: true, data: { recoveryString: recovery } }
        }

        return { success: true, data: {} }
      }
    )

    ctx.handle('auth:generateRecovery', async (event) => {
      if (
        ctx.security.hasSecret(this.SETTINGS_SECURITY_ADMIN) &&
        !ctx.permissions.requirePermission(event, 'admin')
      )
        return { success: false, message: 'Permission denied' }
      const recovery = crypto.randomBytes(18).toString('base64url')
      await ctx.settings.setRaw(
        this.SETTINGS_SECURITY_RECOVERY,
        await ctx.security.encryptSecret(recovery)
      )
      return { success: true, data: { recoveryString: recovery } }
    })

    ctx.handle('auth:resetByRecovery', async (event, recoveryString: string) => {
      const cipher = ctx.settings.getRaw(this.SETTINGS_SECURITY_RECOVERY)
      const plain = await ctx.security.decryptSecret(cipher)
      if (!plain || plain !== String(recoveryString ?? '').trim())
        return { success: false, message: 'Recovery string incorrect' }

      await ctx.settings.setRaw(this.SETTINGS_SECURITY_ADMIN, '')
      await ctx.settings.setRaw(this.SETTINGS_SECURITY_POINTS, '')

      const newRecovery = crypto.randomBytes(18).toString('base64url')
      await ctx.settings.setRaw(
        this.SETTINGS_SECURITY_RECOVERY,
        await ctx.security.encryptSecret(newRecovery)
      )

      const senderId = event?.sender?.id
      if (typeof senderId === 'number')
        ctx.permissions.setPermission(senderId, ctx.permissions.getDefaultPermission())
      return { success: true, data: { recoveryString: newRecovery } }
    })

    ctx.handle('auth:clearAll', async (event) => {
      if (!ctx.permissions.requirePermission(event, 'admin'))
        return { success: false, message: 'Permission denied' }
      await ctx.settings.setRaw(this.SETTINGS_SECURITY_ADMIN, '')
      await ctx.settings.setRaw(this.SETTINGS_SECURITY_POINTS, '')
      await ctx.settings.setRaw(this.SETTINGS_SECURITY_RECOVERY, '')
      const senderId = event?.sender?.id
      if (typeof senderId === 'number')
        ctx.permissions.setPermission(senderId, ctx.permissions.getDefaultPermission())
      return { success: true }
    })
  }
}
