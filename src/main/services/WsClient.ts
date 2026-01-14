import WebSocket from 'ws'
import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from 'events'

export class WsClient extends EventEmitter {
  private ws: WebSocket | null = null
  private url: string = ''
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private pendingRequests: Map<
    string,
    {
      resolve: (value: any) => void
      reject: (reason?: any) => void
      timeout: NodeJS.Timeout
    }
  > = new Map()
  private isManualClose: boolean = false

  constructor() {
    super()
  }

  connect(url: string) {
    this.url = url
    this.isManualClose = false
    this._connect()
  }

  private _connect() {
    if (this.ws) {
      this.ws.terminate()
    }

    console.log(`[WS] Connecting to ${this.url}...`)
    this.ws = new WebSocket(this.url)

    this.ws.on('open', () => {
      console.log('[WS] Connected')
      this.emit('connected')
      this.startHeartbeat()
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }
    })

    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        this.handleMessage(msg)
      } catch (e) {
        console.error('[WS] Parse error', e)
      }
    })

    this.ws.on('close', () => {
      console.log('[WS] Closed')
      this.stopHeartbeat()
      this.emit('disconnected')
      if (!this.isManualClose) {
        this.reconnect()
      }
    })

    this.ws.on('error', (err) => {
      console.error('[WS] Error', err)
    })
  }

  private handleMessage(msg: any) {
    // 1. 处理请求响应 (seq 匹配)
    if (msg.seq && this.pendingRequests.has(msg.seq)) {
      const { resolve, timeout } = this.pendingRequests.get(msg.seq)!
      clearTimeout(timeout)
      this.pendingRequests.delete(msg.seq)
      resolve(msg)
      return
    }

    // 2. 处理服务器主动推送 (事件)
    if (msg.type === 'event' || msg.type === 'correction') {
      this.emit('event', msg)
    } else if (msg.type === 'reason_sync') {
      this.emit('reason_sync', msg)
    }
  }

  private reconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this._connect()
    }, 5000)
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'heartbeat' }).catch(() => {})
    }, 30000)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  send(data: any, timeoutMs: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('WebSocket not connected'))
      }

      const seq = uuidv4()
      const payload = { ...data, seq }

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(seq)
        reject(new Error('Request timeout'))
      }, timeoutMs)

      this.pendingRequests.set(seq, { resolve, reject, timeout })
      this.ws.send(JSON.stringify(payload))
    })
  }

  close() {
    this.isManualClose = true
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
