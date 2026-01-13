import { ipcMain, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';

export interface ThemeConfig {
  name: string;
  id: string;
  mode: 'light' | 'dark';
  config: {
    tdesign: Record<string, string>;
    custom: Record<string, string>;
  };
}

export class ThemeService {
  private themeDir: string;
  private watcher: chokidar.FSWatcher | null = null;
  private currentThemeId: string = 'light-default';

  constructor(themeDir: string) {
    this.themeDir = themeDir;
  }

  public init() {
    this.setupWatcher();
    this.registerIpc();
  }

  private setupWatcher() {
    if (this.watcher) this.watcher.close();
    
    this.watcher = chokidar.watch(this.themeDir, {
      ignored: /(^|[\/\\])\../,
      persistent: true
    });

    this.watcher.on('change', (filePath) => {
      if (filePath.endsWith('.json')) {
        console.log(`Theme file changed: ${filePath}`);
        this.notifyThemeUpdate();
      }
    });
  }

  private registerIpc() {
    ipcMain.handle('theme:list', async () => {
      return { success: true, data: this.getThemeList() };
    });

    ipcMain.handle('theme:current', async () => {
      const theme = this.getThemeById(this.currentThemeId);
      return { success: true, data: theme };
    });

    ipcMain.handle('theme:set', async (_, themeId: string) => {
      this.currentThemeId = themeId;
      this.notifyThemeUpdate();
      return { success: true };
    });
  }

  private getThemeList(): ThemeConfig[] {
    try {
      if (!fs.existsSync(this.themeDir)) return [];
      const files = fs.readdirSync(this.themeDir);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => {
          try {
            const content = fs.readFileSync(path.join(this.themeDir, f), 'utf-8');
            return JSON.parse(content) as ThemeConfig;
          } catch (e) {
            return null;
          }
        })
        .filter((t): t is ThemeConfig => t !== null);
    } catch (e) {
      console.error('Failed to read themes:', e);
      return [];
    }
  }

  private getThemeById(id: string): ThemeConfig | null {
    const list = this.getThemeList();
    return list.find(t => t.id === id) || list[0] || null;
  }

  private notifyThemeUpdate() {
    const theme = this.getThemeById(this.currentThemeId);
    if (!theme) return;

    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      win.webContents.send('theme:updated', theme);
    }
  }
}
