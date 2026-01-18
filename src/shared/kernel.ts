export type disposer = () => void

type eventListener = (...args: any[]) => void

/**
 * Simple EventEmitter implementation to avoid Node.js 'events' dependency in browser.
 */
export class EventEmitter {
  protected _events: Record<string | symbol, eventListener[]> = {}

  on(event: string | symbol, listener: eventListener): this {
    if (!this._events[event]) {
      this._events[event] = []
    }
    this._events[event].push(listener)
    return this
  }

  off(event: string | symbol, listener: eventListener): this {
    if (!this._events[event]) return this
    this._events[event] = this._events[event].filter((l) => l !== listener)
    return this
  }

  once(event: string | symbol, listener: eventListener): this {
    const onceListener = (...args: any[]) => {
      this.off(event, onceListener)
      listener(...args)
    }
    return this.on(event, onceListener)
  }

  emit(event: string | symbol, ...args: any[]): boolean {
    if (!this._events[event]) return false
    // Copy to avoid issues if listeners are removed during emission
    const listeners = [...this._events[event]]
    listeners.forEach((listener) => listener(...args))
    return true
  }

  removeAllListeners(event?: string | symbol): this {
    if (event) {
      delete this._events[event]
    } else {
      this._events = {}
    }
    return this
  }
}

/**
 * Context class that manages lifecycle and side effects (disposables).
 * Inspired by Koishi's Cordis.
 */
export class Context extends EventEmitter {
  private _disposables: disposer[] = []

  constructor() {
    super()
  }

  /**
   * Register a side effect to be disposed when the context is disposed.
   * @param callback The cleanup function
   * @returns A function to manually dispose this effect
   */
  effect(callback: disposer): disposer {
    this._disposables.push(callback)
    return () => {
      const index = this._disposables.indexOf(callback)
      if (index >= 0) {
        this._disposables.splice(index, 1)
        callback()
      }
    }
  }

  /**
   * Register an event listener that is automatically disposed when the context is disposed.
   */
  on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener)
    this.effect(() => {
      super.off(event, listener)
    })
    return this
  }

  once(event: string | symbol, listener: (...args: any[]) => void): this {
    const onceListener = (...args: any[]) => {
      super.off(event, onceListener)
      listener(...args)
    }
    super.on(event, onceListener)
    this.effect(() => {
      super.off(event, onceListener)
    })
    return this
  }

  /**
   * Dispose the context and all its side effects.
   */
  dispose() {
    this.emit('dispose')
    // Dispose in reverse order of registration
    while (this._disposables.length) {
      const dispose = this._disposables.pop()
      try {
        if (dispose) dispose()
      } catch (e) {
        ;(this as any).logger?.error?.('Error during disposal', {
          meta: e instanceof Error ? { message: e.message, stack: e.stack } : { e }
        })
      }
    }
    this.removeAllListeners()
  }

  /**
   * Extend the context (create a new context that shares state but has its own lifecycle).
   */
  extend(): Context {
    const child = new Context()
    const disposeChild = this.effect(() => child.dispose())
    child.on('dispose', disposeChild)

    // Copy prototype chain to access services
    Object.setPrototypeOf(child, this)

    return child
  }
}

/**
 * Base class for services.
 * Services are attached to the context.
 */
export abstract class Service {
  constructor(
    protected ctx: Context,
    name: string
  ) {
    if ((ctx as any)[name]) {
      ;(ctx as any).logger?.warn?.('Service already exists on context. Overwriting.', { name })
    }
    ;(ctx as any)[name] = this

    ctx.effect(() => {
      if ((ctx as any)[name] === this) {
        delete (ctx as any)[name]
      }
    })
  }

  protected get logger() {
    return (this.ctx as any).logger
  }
}
