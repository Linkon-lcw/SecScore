import { contextBridge, ipcRenderer } from 'electron'
import { ThemeConfig } from './types'

const api = {
  // Theme
  getThemes: () => ipcRenderer.invoke('theme:list'),
  getCurrentTheme: () => ipcRenderer.invoke('theme:current'),
  setTheme: (themeId: string) => ipcRenderer.invoke('theme:set', themeId),
  onThemeChanged: (callback: (theme: ThemeConfig) => void) => {
    const subscription = (_event: any, theme: ThemeConfig) => callback(theme)
    ipcRenderer.on('theme:updated', subscription)
    return () => ipcRenderer.removeListener('theme:updated', subscription)
  },

  // DB - Student
  queryStudents: (params: any) => ipcRenderer.invoke('db:student:query', params),
  createStudent: (data: any) => ipcRenderer.invoke('db:student:create', data),
  updateStudent: (id: number, data: any) => ipcRenderer.invoke('db:student:update', id, data),
  deleteStudent: (id: number) => ipcRenderer.invoke('db:student:delete', id),

  // DB - Reason
  queryReasons: () => ipcRenderer.invoke('db:reason:query'),
  createReason: (data: any) => ipcRenderer.invoke('db:reason:create', data),
  updateReason: (id: number, data: any) => ipcRenderer.invoke('db:reason:update', id, data),
  deleteReason: (id: number) => ipcRenderer.invoke('db:deleteReason', id),

  // DB - Event
  queryEvents: (params: any) => ipcRenderer.invoke('db:event:query', params),
  createEvent: (data: any) => ipcRenderer.invoke('db:event:create', data),

  // Settings & Sync
  getSettings: () => ipcRenderer.invoke('db:getSettings'),
  updateSetting: (key: string, value: string) => ipcRenderer.invoke('db:updateSetting', key, value),
  getSyncStatus: () => ipcRenderer.invoke('ws:getStatus'),
  triggerSync: () => ipcRenderer.invoke('ws:triggerSync'),
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
