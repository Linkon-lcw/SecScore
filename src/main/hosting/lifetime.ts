import type { awaitable, disposer, hostApplicationLifetime } from './types'

type loggerLike = { error: (...args: any[]) => void }

// 默认的应用生命周期实现，管理启动/停止事件
export class DefaultHostApplicationLifetime implements hostApplicationLifetime {
  constructor(private readonly logger: loggerLike = console) {}
  private readonly started = new Set<() => awaitable<void>>() // 启动事件处理器
  private readonly stopping = new Set<() => awaitable<void>>() // 停止事件处理器
  private readonly stopped = new Set<() => awaitable<void>>() // 已停止事件处理器

  // 注册启动事件处理器
  onStarted(handler: () => awaitable<void>): disposer {
    this.started.add(handler)
    return () => {
      this.started.delete(handler)
    } // 返回清理函数
  }

  // 注册停止事件处理器
  onStopping(handler: () => awaitable<void>): disposer {
    this.stopping.add(handler)
    return () => {
      this.stopping.delete(handler)
    }
  }

  // 注册已停止事件处理器
  onStopped(handler: () => awaitable<void>): disposer {
    this.stopped.add(handler)
    return () => {
      this.stopped.delete(handler)
    }
  }

  // 通知所有启动事件处理器
  async notifyStarted() {
    await this.dispatch(this.started)
  }

  // 通知所有停止事件处理器
  async notifyStopping() {
    await this.dispatch(this.stopping)
  }

  // 通知所有已停止事件处理器
  async notifyStopped() {
    await this.dispatch(this.stopped)
  }

  // 执行事件处理器列表
  private async dispatch(targets: Set<() => awaitable<void>>) {
    for (const handler of Array.from(targets)) {
      try {
        await handler()
      } catch (error) {
        this.logger.error('[HostLifetime] handler failed', error as Error) // 记录错误但不中断
      }
    }
  }
}
