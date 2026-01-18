import { Service } from '../../shared/kernel'
import crypto from 'crypto'
import { app } from 'electron'
import { MainContext } from '../context'

declare module '../../shared/kernel' {
  interface Context {
    security: SecurityService
  }
}

export class SecurityService extends Service {
  private ivKey = 'security_crypto_iv'

  constructor(ctx: MainContext) {
    super(ctx, 'security')
  }

  async ensureSecurityIv() {
    let ivHex = this.ctx.settings.getRaw(this.ivKey)
    if (!ivHex) {
      ivHex = crypto.randomBytes(16).toString('hex')
      await this.ctx.settings.setRaw(this.ivKey, ivHex)
    }
    return ivHex
  }

  getCryptoKey() {
    return crypto.scryptSync(app.getPath('userData'), 'secscore-salt', 32)
  }

  async encryptSecret(plainText: string) {
    const ivHex = await this.ensureSecurityIv()
    const key = this.getCryptoKey()
    const cipher = crypto.createCipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'))
    let encrypted = cipher.update(plainText, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return encrypted
  }

  async decryptSecret(cipherText: string) {
    try {
      if (!cipherText) return ''
      const ivHex = await this.ensureSecurityIv()
      const key = this.getCryptoKey()
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'))
      let plain = decipher.update(cipherText, 'hex', 'utf8')
      plain += decipher.final('utf8')
      return plain
    } catch {
      return ''
    }
  }

  isSixDigit(s: string) {
    return /^\d{6}$/.test(s)
  }

  hasSecret(key: string) {
    const v = this.ctx.settings.getRaw(key)
    return typeof v === 'string' && v.trim().length > 0
  }
}
