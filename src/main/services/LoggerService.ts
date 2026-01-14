import fs from 'fs'
import path from 'path'

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export class LoggerService {
  private logPath: string
  private currentLevel: LogLevel = 'info'

  constructor(logDir: string) {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    this.logPath = path.join(logDir, 'app.log')
  }

  setLevel(level: LogLevel) {
    this.currentLevel = level
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.currentLevel)
  }

  log(level: LogLevel, message: string, ...args: any[]) {
    if (!this.shouldLog(level)) return

    const timestamp = new Date().toISOString()
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message} ${args.length ? JSON.stringify(args) : ''}\n`

    console.log(formattedMessage.trim())

    try {
      fs.appendFileSync(this.logPath, formattedMessage)
    } catch (err) {
      console.error('Failed to write to log file', err)
    }
  }

  info(message: string, ...args: any[]) {
    this.log('info', message, ...args)
  }
  warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args)
  }
  error(message: string, ...args: any[]) {
    this.log('error', message, ...args)
  }
  debug(message: string, ...args: any[]) {
    this.log('debug', message, ...args)
  }

  getLogPath() {
    return this.logPath
  }

  clearLogs() {
    try {
      fs.writeFileSync(this.logPath, '')
    } catch (err) {
      console.error('Failed to clear logs', err)
    }
  }

  readLogs(lines: number = 100): string[] {
    try {
      if (!fs.existsSync(this.logPath)) return []
      const content = fs.readFileSync(this.logPath, 'utf-8')
      const allLines = content.split('\n').filter((line) => line.trim().length > 0)
      return allLines.slice(-lines)
    } catch (err) {
      console.error('Failed to read logs', err)
      return []
    }
  }
}
