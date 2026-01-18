import type {
  configureHostDelegate,
  hostApplicationContext,
  hostBuilderContext,
  hostedService,
  middleware,
  serviceToken
} from './types'
import { ServiceProvider } from './serviceCollection'

export class HostApplication {
  private hostedInstances: hostedService[] = []
  private started = false

  constructor(
    private readonly context: hostBuilderContext,
    private readonly provider: ServiceProvider,
    private readonly configureDelegates: configureHostDelegate[],
    private readonly middleware: middleware[],
    private readonly hostedTokens: serviceToken<hostedService>[]
  ) {}

  async start(): Promise<void> {
    if (this.started) return

    const appCtx = this.createApplicationContext()
    for (const configure of this.configureDelegates) {
      await configure(this.context, appCtx)
    }

    await this.dispatch(0, appCtx, async () => {
      await this.bootstrapHostedServices()
    })

    this.started = true
    await this.context.lifetime.notifyStarted()
  }

  async stop(): Promise<void> {
    if (!this.started) return
    await this.context.lifetime.notifyStopping()
    await this.disposeHostedServices()
    await this.context.lifetime.notifyStopped()
    this.started = false
  }

  async dispose(): Promise<void> {
    await this.stop()
    await this.provider.dispose()
  }

  get services(): ServiceProvider {
    return this.provider
  }

  get hostContext(): hostBuilderContext {
    return this.context
  }

  private createApplicationContext(): hostApplicationContext {
    return { services: this.provider, host: this.context }
  }

  private async bootstrapHostedServices() {
    for (const token of this.hostedTokens) {
      const service = this.provider.get(token)
      this.hostedInstances.push(service)
      await service.start()
    }
  }

  private async disposeHostedServices() {
    while (this.hostedInstances.length) {
      const service = this.hostedInstances.pop()
      if (!service) continue
      await service.stop()
    }
  }

  private async dispatch(
    index: number,
    appCtx: hostApplicationContext,
    terminal: () => Promise<void>
  ) {
    const middleware = this.middleware[index]
    if (!middleware) {
      await terminal()
      return
    }
    await middleware(appCtx, () => this.dispatch(index + 1, appCtx, terminal))
  }
}
