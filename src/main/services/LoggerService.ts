import fs from 'fs'
import path from 'path'
import { Service } from '../../shared/kernel'
import { MainContext } from '../context'
import * as winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

export type logLevel = 'info' | 'warn' | 'error' | 'debug'

declare module '../../shared/kernel' {
  interface Context {
    logger: LoggerService
  }
}

export class LoggerService extends Service {
  private logDir: string
  private currentLevel: logLevel = 'info'
  private winstonLogger: winston.Logger

  constructor(ctx: MainContext, logDir: string) {
    super(ctx, 'logger')
    this.logDir = logDir
    fs.mkdirSync(this.logDir, { recursive: true })
    this.winstonLogger = this.createLogger()
    this.registerIpc()
  }

  private get mainCtx() {
    return this.ctx as MainContext
  }

  private registerIpc() {
    this.mainCtx.handle('log:query', (_, lines) => ({ success: true, data: this.readLogs(lines) }))
    this.mainCtx.handle('log:clear', (event) => {
      if (!this.mainCtx.permissions.requirePermission(event, 'admin'))
        return { success: false, message: 'Permission denied' }
      this.clearLogs()
      return { success: true }
    })
    this.mainCtx.handle('log:setLevel', async (event, level: logLevel) => {
      if (!this.mainCtx.permissions.requirePermission(event, 'admin'))
        return { success: false, message: 'Permission denied' }
      await this.mainCtx.settings.setValue('log_level', level as any)
      return { success: true }
    })
    this.mainCtx.handle('log:write', (_event, payload: any) => {
      const level = String(payload?.level || 'info')
      const message = String(payload?.message || '')
      const meta = payload?.meta
      if (level === 'debug' || level === 'info' || level === 'warn' || level === 'error') {
        this.log(level as logLevel, message, { source: 'renderer', meta })
      } else {
        this.info(message, { source: 'renderer', meta })
      }
      return { success: true }
    })
  }

  setLevel(level: logLevel) {
    this.currentLevel = level
    this.winstonLogger.level = level
  }

  log(level: logLevel, message: string, meta?: any) {
    this.winstonLogger.log(level, message, meta ?? {})
  }

  info(message: string, ...args: any[]) {
    this.log('info', message, args.length ? { args } : undefined)
  }
  warn(message: string, ...args: any[]) {
    this.log('warn', message, args.length ? { args } : undefined)
  }
  error(message: string, ...args: any[]) {
    this.log('error', message, args.length ? { args } : undefined)
  }
  debug(message: string, ...args: any[]) {
    this.log('debug', message, args.length ? { args } : undefined)
  }

  private createLogger(): winston.Logger {
    const timestampFormat = winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' })
    const withErrors = winston.format.errors({ stack: true })

    const safeJsonStringify = (value: unknown) => {
      const seen = new WeakSet<object>()
      return JSON.stringify(value, (_key, v) => {
        if (!v || typeof v !== 'object') return v
        if (seen.has(v)) return '[Circular]'
        seen.add(v)
        return v
      })
    }

    const consoleFormat = winston.format.combine(
      timestampFormat,
      withErrors,
      winston.format.colorize({ all: true }),
      winston.format.printf((info) => {
        const { timestamp, level, message, stack, ...rest } = info as any
        const metaText = rest && Object.keys(rest).length ? ` ${safeJsonStringify(rest)}` : ''
        const stackText = stack ? `\n${String(stack)}` : ''
        return `${timestamp} ${level} ${String(message)}${metaText}${stackText}`
      })
    )

    const fileFormat = winston.format.combine(
      timestampFormat,
      withErrors,
      winston.format.printf((info) => safeJsonStringify(info))
    )

    const rotateTransport = new DailyRotateFile({
      filename: path.join(this.logDir, 'secscore-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '20m'
    })
    rotateTransport.format = fileFormat

    return winston.createLogger({
      level: this.currentLevel,
      defaultMeta: { source: 'main', pid: process.pid },
      transports: [new winston.transports.Console({ format: consoleFormat }), rotateTransport]
    })
  }

  clearLogs() {
    try {
      const files = this.getLogFiles()
      for (const f of files) {
        try {
          fs.unlinkSync(f)
        } catch {
          continue
        }
      }
    } catch (err) {
      this.winstonLogger.log('error', 'Failed to clear logs', {
        meta: err instanceof Error ? { message: err.message, stack: err.stack } : { err }
      })
    }
  }

  readLogs(lines: number = 100): string[] {
    try {
      const files = this.getLogFiles()
      const picked: string[] = []
      for (let i = files.length - 1; i >= 0; i--) {
        const filePath = files[i]
        const content = fs.readFileSync(filePath, 'utf-8')
        const fileLines = content.split(/\r?\n/).filter((line) => line.trim().length > 0)
        for (let j = fileLines.length - 1; j >= 0 && picked.length < lines; j--) {
          picked.push(fileLines[j])
        }
        if (picked.length >= lines) break
      }
      return picked.reverse()
    } catch (err) {
      this.winstonLogger.log('error', 'Failed to read logs', {
        meta: err instanceof Error ? { message: err.message, stack: err.stack } : { err }
      })
      return []
    }
  }

  private getLogFiles(): string[] {
    if (!fs.existsSync(this.logDir)) return []
    const entries = fs.readdirSync(this.logDir)
    const files = entries.filter((f) => f.endsWith('.log')).map((f) => path.join(this.logDir, f))

    files.sort((a, b) => {
      try {
        const sa = fs.statSync(a)
        const sb = fs.statSync(b)
        return sa.mtimeMs - sb.mtimeMs
      } catch {
        return a.localeCompare(b)
      }
    })
    return files
  }
}
