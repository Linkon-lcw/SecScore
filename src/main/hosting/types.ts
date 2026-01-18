import type { ServiceCollection, ServiceProvider } from './serviceCollection'

export type awaitable<T> = T | Promise<T>
export type disposer = () => awaitable<void>

export type serviceToken<T = unknown> = string | symbol | (new (...args: any[]) => T)

export interface injectableClass<T = unknown> {
  new (...args: any[]): T
  inject?: readonly serviceToken[]
}

export type serviceFactory<T> = (provider: ServiceProvider) => T
export type serviceFactoryOrValue<T> = serviceFactory<T> | injectableClass<T> | T

export type serviceLifetime = 'singleton' | 'scoped' | 'transient'

export interface serviceDescriptor<T = unknown> {
  token: serviceToken<T>
  lifetime: serviceLifetime
  factory: serviceFactory<T>
}

export interface hostedService {
  start(): awaitable<void>
  stop(): awaitable<void>
}

export interface hostBuilderSettings {
  environment?: string
  properties?: Record<string, unknown>
}

export interface hostApplicationLifetime {
  onStarted(handler: () => awaitable<void>): disposer
  onStopping(handler: () => awaitable<void>): disposer
  onStopped(handler: () => awaitable<void>): disposer
  notifyStarted(): Promise<void>
  notifyStopping(): Promise<void>
  notifyStopped(): Promise<void>
}

export interface appRuntimeContext {
  logger?: { error: (...args: any[]) => void }
}

export interface hostBuilderContext {
  ctx: appRuntimeContext
  environmentName: string
  properties: Map<string | symbol, unknown>
  lifetime: hostApplicationLifetime
}

export interface hostApplicationContext {
  services: ServiceProvider
  host: hostBuilderContext
}

export type configureServicesDelegate = (
  context: hostBuilderContext,
  services: ServiceCollection
) => awaitable<void>

export type configureHostDelegate = (
  context: hostBuilderContext,
  app: hostApplicationContext
) => awaitable<void>

export type middleware = (app: hostApplicationContext, next: () => Promise<void>) => awaitable<void>

export type { ServiceCollection, ServiceProvider }
