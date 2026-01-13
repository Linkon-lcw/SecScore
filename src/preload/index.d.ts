import { ElectronApi } from './types'

declare global {
  interface Window {
    api: ElectronApi
  }
}
