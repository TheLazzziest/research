export type Factory<T> = (container: Container) => T;

// Minimal DI container shared by server and client: register a factory per token,
// resolve lazily as a singleton. Consumers depend on tokens, not concrete adapters.
export class Container {
  private readonly factories = new Map<string, Factory<unknown>>();
  private readonly instances = new Map<string, unknown>();

  register<T>(token: string, factory: Factory<T>): this {
    this.factories.set(token, factory as Factory<unknown>);
    return this;
  }

  resolve<T>(token: string): T {
    if (!this.instances.has(token)) {
      const factory = this.factories.get(token);
      if (!factory) throw new Error(`no provider registered for token: ${token}`);
      this.instances.set(token, factory(this));
    }
    return this.instances.get(token) as T;
  }
}
