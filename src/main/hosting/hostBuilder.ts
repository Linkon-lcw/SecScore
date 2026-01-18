import { ServiceCollection } from './serviceCollection'
import { HostApplication } from './hostApplication'
import {
  type appRuntimeContext,
  type configureHostDelegate,
  type configureServicesDelegate,
  type hostBuilderContext,
  type hostBuilderSettings,
  type hostedService,
  type middleware,
  type serviceToken
} from './types'

export class SecScoreHostBuilder {
  private readonly serviceCollection: ServiceCollection
  private readonly configureServicesDelegates: configureServicesDelegate[] = []
  private readonly configureDelegates: configureHostDelegate[] = []
  private readonly middleware: middleware[] = []
  private readonly hostedServices: serviceToken<hostedService>[] = []
  private readonly builderContext: hostBuilderContext

  constructor(runtimeCtx: appRuntimeContext, settings: hostBuilderSettings = {}) {
    this.serviceCollection = new ServiceCollection(runtimeCtx)
    this.builderContext = {
      ctx: runtimeCtx,
      environmentName: settings.environment ?? process.env.SECSCORE_ENV ?? 'Production',
      properties: new Map(Object.entries(settings.properties ?? {})),
      lifetime: this.serviceCollection.getLifetime()
    }
  }

  get context(): hostBuilderContext {
    return this.builderContext
  }

  configureServices(callback: configureServicesDelegate): this {
    this.configureServicesDelegates.push(callback)
    return this
  }

  configure(callback: configureHostDelegate): this {
    this.configureDelegates.push(callback)
    return this
  }

  use(middleware: middleware): this {
    this.middleware.push(middleware)
    return this
  }

  addHostedService(token: serviceToken<hostedService>): this {
    this.hostedServices.push(token)
    return this
  }

  async build(): Promise<SecScoreHost> {
    for (const configure of this.configureServicesDelegates) {
      await configure(this.builderContext, this.serviceCollection)
    }

    const provider = this.serviceCollection.buildServiceProvider()
    const application = new HostApplication(
      this.builderContext,
      provider,
      this.configureDelegates,
      this.middleware,
      this.hostedServices
    )
    return new SecScoreHost(application)
  }
}

export class SecScoreHost {
  constructor(private readonly app: HostApplication) {}

  get services() {
    return this.app.services
  }

  get hostContext() {
    return this.app.hostContext
  }

  async start() {
    await this.app.start()
  }

  async stop() {
    await this.app.stop()
  }

  async dispose() {
    await this.app.dispose()
  }

  async run() {
    await this.start()
    return async () => {
      await this.dispose()
    }
  }
}

export function createHostBuilder(ctx: appRuntimeContext, settings?: hostBuilderSettings) {
  return new SecScoreHostBuilder(ctx, settings)
}

export const Host = {
  createApplicationBuilder: createHostBuilder
}
