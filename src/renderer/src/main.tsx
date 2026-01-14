import './react-19-patch'
import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

const safeWriteLog = (payload: {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  meta?: any
}) => {
  try {
    const api = (window as any).api
    if (!api?.writeLog) return
    api.writeLog(payload)
  } catch {
    return
  }
}

window.addEventListener('error', (e: any) => {
  const error = e?.error
  safeWriteLog({
    level: 'error',
    message: 'renderer:error',
    meta: {
      message: error?.message || e?.message,
      stack: error?.stack,
      filename: e?.filename,
      lineno: e?.lineno,
      colno: e?.colno
    }
  })
})

window.addEventListener('unhandledrejection', (e: any) => {
  const reason = e?.reason
  safeWriteLog({
    level: 'error',
    message: 'renderer:unhandledrejection',
    meta: reason instanceof Error ? { message: reason.message, stack: reason.stack } : { reason }
  })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
