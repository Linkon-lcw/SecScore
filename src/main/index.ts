import 'reflect-metadata'
import { app } from 'electron'
import { join, dirname } from 'path'
import fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/SecScore_logo.ico?asset'
import { MainContext } from './context'
import { DbManager } from './db/DbManager'
import { LoggerService, logLevel } from './services/LoggerService'
import { SettingsService } from './services/SettingsService'
import { SecurityService } from './services/SecurityService'
import { PermissionService } from './services/PermissionService'
import { AuthService } from './services/AuthService'
import { DataService } from './services/DataService'
import { ThemeService } from './services/ThemeService'
import { WindowManager, type windowManagerOptions } from './services/WindowManager'
import { StudentRepository } from './repos/StudentRepository'
import { ReasonRepository } from './repos/ReasonRepository'
import { EventRepository } from './repos/EventRepository'
import { SettlementRepository } from './repos/SettlementRepository'
import {
  AppConfigToken,
  createHostBuilder,
  DbManagerToken,
  EventRepositoryToken,
  LoggerToken,
  PermissionServiceToken,
  ReasonRepositoryToken,
  SecurityServiceToken,
  SettlementRepositoryToken,
  SettingsStoreToken,
  StudentRepositoryToken,
  ThemeServiceToken,
  WindowManagerToken
} from './hosting'

type mainAppConfig = {
  isDev: boolean
  appRoot: string
  dataRoot: string
  logDir: string
  themeDir: string
  dbPath: string
  window: windowManagerOptions
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const appRoot = is.dev ? process.cwd() : dirname(process.execPath)

  const ensureWritableDir = (preferred: string, fallback: string) => {
    try {
      if (!fs.existsSync(preferred)) fs.mkdirSync(preferred, { recursive: true })
      return preferred
    } catch {
      if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true })
      return fallback
    }
  }

  const dataRoot = is.dev
    ? process.cwd()
    : ensureWritableDir(join(appRoot, 'data'), join(app.getPath('userData'), 'secscore-data'))

  const logDir = is.dev ? join(process.cwd(), 'logs') : join(dataRoot, 'logs')
  const themeDir = is.dev
    ? join(process.cwd(), 'themes')
    : ensureWritableDir(join(appRoot, 'themes'), join(dataRoot, 'themes'))
  const dbPath = is.dev ? join(process.cwd(), 'db.sqlite') : join(dataRoot, 'db.sqlite')

  const config: mainAppConfig = {
    isDev: is.dev,
    appRoot,
    dataRoot,
    logDir,
    themeDir,
    dbPath,
    window: {
      icon,
      preloadPath: join(__dirname, '../preload/index.js'),
      rendererHtmlPath: join(__dirname, '../renderer/index.html'),
      getRendererUrl: () => (is.dev ? process.env['ELECTRON_RENDERER_URL'] : undefined)
    }
  }

  const builder = createHostBuilder({
    logger: {
      error: (...args: any[]) => {
        try {
          process.stderr.write(`${args.map((a) => String(a)).join(' ')}\n`)
        } catch {
          return
        }
      }
    }
  })
    .configureServices(async (_builderContext, services) => {
      services.addSingleton(AppConfigToken, config)

      services.addSingleton(MainContext, () => new MainContext())

      services.addSingleton(
        LoggerToken,
        (p) => new LoggerService(p.get(MainContext), config.logDir)
      )
      services.addSingleton(DbManagerToken, (p) => new DbManager(p.get(MainContext), config.dbPath))
      services.addSingleton(SettingsStoreToken, (p) => new SettingsService(p.get(MainContext)))
      services.addSingleton(SecurityServiceToken, (p) => new SecurityService(p.get(MainContext)))
      services.addSingleton(
        PermissionServiceToken,
        (p) => new PermissionService(p.get(MainContext))
      )
      services.addSingleton(AuthService, (p) => new AuthService(p.get(MainContext)))
      services.addSingleton(DataService, (p) => new DataService(p.get(MainContext)))

      services.addSingleton(
        StudentRepositoryToken,
        (p) => new StudentRepository(p.get(MainContext))
      )
      services.addSingleton(ReasonRepositoryToken, (p) => new ReasonRepository(p.get(MainContext)))
      services.addSingleton(EventRepositoryToken, (p) => new EventRepository(p.get(MainContext)))
      services.addSingleton(
        SettlementRepositoryToken,
        (p) => new SettlementRepository(p.get(MainContext))
      )

      services.addSingleton(
        ThemeServiceToken,
        (p) => new ThemeService(p.get(MainContext), config.themeDir)
      )
      services.addSingleton(
        WindowManagerToken,
        (p) => new WindowManager(p.get(MainContext), config.window)
      )
    })
    .configure(async (_builderContext, appCtx) => {
      const services = appCtx.services
      const ctx = services.get(MainContext)
      services.get(LoggerToken)
      const db = services.get(DbManagerToken) as DbManager
      await db.initialize()
      const settings = services.get(SettingsStoreToken) as SettingsService
      await settings.initialize()
      services.get(SecurityServiceToken)
      services.get(PermissionServiceToken)
      services.get(AuthService)
      services.get(DataService)
      services.get(StudentRepositoryToken)
      services.get(ReasonRepositoryToken)
      services.get(EventRepositoryToken)
      services.get(SettlementRepositoryToken)
      services.get(ThemeServiceToken)
      services.get(WindowManagerToken)

      const logLevelSetting = ctx.settings.getValue('log_level') as logLevel
      if (logLevelSetting) {
        ctx.logger.setLevel(logLevelSetting)
      }
      ctx.logger.info('Application starting...')

      const mainConsole = console as any
      mainConsole.log = (...args: any[]) => ctx.logger.info(String(args[0] ?? ''), ...args.slice(1))
      mainConsole.info = (...args: any[]) =>
        ctx.logger.info(String(args[0] ?? ''), ...args.slice(1))
      mainConsole.warn = (...args: any[]) =>
        ctx.logger.warn(String(args[0] ?? ''), ...args.slice(1))
      mainConsole.error = (...args: any[]) =>
        ctx.logger.error(String(args[0] ?? ''), ...args.slice(1))
      mainConsole.debug = (...args: any[]) =>
        ctx.logger.debug(String(args[0] ?? ''), ...args.slice(1))
      mainConsole.trace = (...args: any[]) =>
        ctx.logger.debug('console.trace', { args, stack: new Error('console.trace').stack })

      if (!config.isDev) {
        try {
          if (!fs.existsSync(config.themeDir)) {
            fs.mkdirSync(config.themeDir, { recursive: true })
          }
          const existing = fs
            .readdirSync(config.themeDir)
            .filter((f) => f.toLowerCase().endsWith('.json'))
          if (existing.length === 0) {
            const builtinThemeDir = join(app.getAppPath(), 'themes')
            if (fs.existsSync(builtinThemeDir)) {
              const files = fs
                .readdirSync(builtinThemeDir)
                .filter((f) => f.toLowerCase().endsWith('.json'))
              for (const f of files) {
                const src = join(builtinThemeDir, f)
                const dest = join(config.themeDir, f)
                try {
                  fs.copyFileSync(src, dest)
                } catch (e: any) {
                  ctx.logger.warn('Failed to copy builtin theme', {
                    src,
                    dest,
                    message: e?.message
                  })
                }
              }
            }
          }
        } catch (e: any) {
          ctx.logger.warn('Failed to initialize theme directory', { message: e?.message })
        }
      }

      const uncaughtExceptionHandler = (err: any) => {
        ctx.logger.error('uncaughtException', {
          message: err?.message,
          stack: err?.stack
        })
      }
      process.on('uncaughtException', uncaughtExceptionHandler)
      ctx.effect(() => process.removeListener('uncaughtException', uncaughtExceptionHandler))

      const unhandledRejectionHandler = (reason: any) => {
        if (reason instanceof Error) {
          ctx.logger.error('unhandledRejection', { message: reason.message, stack: reason.stack })
        } else {
          ctx.logger.error('unhandledRejection', reason)
        }
      }
      process.on('unhandledRejection', unhandledRejectionHandler)
      ctx.effect(() => process.removeListener('unhandledRejection', unhandledRejectionHandler))

      const renderProcessGoneHandler = (_: any, __: any, details: any) => {
        ctx.logger.error('render-process-gone', details)
      }
      app.on('render-process-gone', renderProcessGoneHandler)
      ctx.effect(() => app.removeListener('render-process-gone', renderProcessGoneHandler))

      const childProcessGoneHandler = (_: any, details: any) => {
        ctx.logger.error('child-process-gone', details)
      }
      app.on('child-process-gone', childProcessGoneHandler)
      ctx.effect(() => app.removeListener('child-process-gone', childProcessGoneHandler))

      ctx.windows.open({ key: 'main', title: 'SecScore', route: '/' })

      const activateHandler = () => {
        if (!ctx.windows.get('main')) {
          ctx.windows.open({ key: 'main', title: 'SecScore', route: '/' })
        }
      }
      app.on('activate', activateHandler)
      ctx.effect(() => app.removeListener('activate', activateHandler))
    })

  const host = await builder.build()
  await host.start()

  let disposing = false
  const beforeQuitHandler = () => {
    if (disposing) return
    disposing = true
    app.removeListener('before-quit', beforeQuitHandler)
    void host.dispose()
  }
  app.on('before-quit', beforeQuitHandler)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
