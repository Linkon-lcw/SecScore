import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { ThemeService } from './services/ThemeService'
import { DbManager } from './db/DbManager'
import { StudentRepository } from './repos/StudentRepository'
import { ReasonRepository } from './repos/ReasonRepository'
import { EventRepository } from './repos/EventRepository'
import { WsClient } from './services/WsClient'
import { SyncEngine } from './services/SyncEngine'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize Services
  const themeDir = is.dev ? join(process.cwd(), 'themes') : join(app.getPath('userData'), 'themes');
  if (!fs.existsSync(themeDir)) {
    fs.mkdirSync(themeDir, { recursive: true });
  }
  const themeService = new ThemeService(themeDir)
  themeService.init()

  // Initialize DB
  const dbPath = is.dev ? join(process.cwd(), 'db.sqlite') : join(app.getPath('userData'), 'db.sqlite');
  const dbManager = new DbManager(dbPath);
  const studentRepo = new StudentRepository(dbManager.getDb());
  const reasonRepo = new ReasonRepository(dbManager.getDb());
  const eventRepo = new EventRepository(dbManager.getDb());

  // Initialize Sync
  const wsClient = new WsClient();
  const syncEngine = new SyncEngine(wsClient, dbManager);

  const startSyncIfRemote = () => {
    const syncMode = dbManager.getDb().prepare("SELECT value FROM settings WHERE key = 'sync_mode'").get() as any;
    const wsServer = dbManager.getDb().prepare("SELECT value FROM settings WHERE key = 'ws_server'").get() as any;
    
    if (syncMode?.value === 'remote' && wsServer?.value) {
      wsClient.connect(wsServer.value);
    } else {
      wsClient.close();
    }
  };

  startSyncIfRemote();

  // 监听本地事件创建，触发同步
  app.on('score-event-created' as any, () => {
    syncEngine.startOutboxSync();
  });

  // Student IPC
  ipcMain.handle('db:student:query', async () => ({ success: true, data: studentRepo.findAll() }));
  ipcMain.handle('db:student:create', async (_, data) => ({ success: true, data: studentRepo.create(data) }));
  ipcMain.handle('db:student:update', async (_, id, data) => { studentRepo.update(id, data); return { success: true }; });
  ipcMain.handle('db:student:delete', async (_, id) => { studentRepo.delete(id); return { success: true }; });

  // Reason IPC
  ipcMain.handle('db:reason:query', async () => ({ success: true, data: reasonRepo.findAll() }));
  ipcMain.handle('db:reason:create', async (_, data) => ({ success: true, data: reasonRepo.create(data) }));
  ipcMain.handle('db:reason:update', async (_, id, data) => { reasonRepo.update(id, data); return { success: true }; });
  ipcMain.handle('db:reason:delete', async (_, id) => { reasonRepo.delete(id); return { success: true }; });
  // 兼容前端 deleteReason 命名错误
  ipcMain.handle('db:deleteReason', async (_, id) => { reasonRepo.delete(id); return { success: true }; });

  // Event IPC
  ipcMain.handle('db:event:query', async (_, params) => ({ success: true, data: eventRepo.findAll(params?.limit) }));
  ipcMain.handle('db:event:create', async (_, data) => {
    try {
      const id = eventRepo.create(data);
      return { success: true, data: id };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  });

  // Settings IPC
  ipcMain.handle('db:getSettings', () => {
    const rows = dbManager.getDb().prepare('SELECT key, value FROM settings').all() as { key: string, value: string }[];
    const settings: Record<string, string> = {};
    rows.forEach(r => settings[r.key] = r.value);
    return { success: true, data: settings };
  });

  ipcMain.handle('db:updateSetting', (_event, key, value) => {
    dbManager.getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
    if (key === 'sync_mode' || key === 'ws_server') {
      startSyncIfRemote();
    }
    return { success: true };
  });

  ipcMain.handle('ws:getStatus', () => {
    return {
      success: true,
      data: {
        connected: wsClient.isConnected(),
        lastSync: new Date().toISOString() // TODO: 记录真正的最后同步时间
      }
    };
  });

  ipcMain.handle('ws:triggerSync', async () => {
    await syncEngine.triggerFullSync();
    return { success: true };
  });

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
