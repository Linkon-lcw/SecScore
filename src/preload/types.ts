export interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ThemeConfig {
  name: string;
  id: string;
  mode: 'light' | 'dark';
  config: {
    tdesign: Record<string, string>;
    custom: Record<string, string>;
  };
}

export interface ElectronApi {
  // Theme
  getThemes: () => Promise<IpcResponse<ThemeConfig[]>>;
  getCurrentTheme: () => Promise<IpcResponse<ThemeConfig>>;
  setTheme: (themeId: string) => Promise<IpcResponse<void>>;
  onThemeChanged: (callback: (theme: ThemeConfig) => void) => () => void;

  // DB - Student
  queryStudents: (params?: any) => Promise<IpcResponse<any[]>>;
  createStudent: (data: { name: string }) => Promise<IpcResponse<number>>;
  updateStudent: (id: number, data: any) => Promise<IpcResponse<void>>;
  deleteStudent: (id: number) => Promise<IpcResponse<void>>;

  // DB - Reason
  queryReasons: () => Promise<IpcResponse<any[]>>;
  createReason: (data: any) => Promise<IpcResponse<number>>;
  updateReason: (id: number, data: any) => Promise<IpcResponse<void>>;
  deleteReason: (id: number) => Promise<IpcResponse<void>>;
  
  // DB - Event
  queryEvents: (params?: any) => Promise<IpcResponse<any[]>>;
  createEvent: (data: { student_name: string; reason_content: string; delta: number }) => Promise<IpcResponse<number>>;

  // Settings & Sync
  getSettings: () => Promise<IpcResponse<Record<string, string>>>;
  updateSetting: (key: string, value: string) => Promise<IpcResponse<void>>;
  getSyncStatus: () => Promise<IpcResponse<{ connected: boolean, lastSync?: string }>>;
  triggerSync: () => Promise<IpcResponse<void>>;
}
