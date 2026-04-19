import type { DomainEvent } from "./domain-events";

type Handler<E extends DomainEvent = DomainEvent> = (event: E) => void | Promise<void>;

class DomainEventBus {
  private handlers = new Map<string, Handler[]>();

  on<T extends DomainEvent["type"]>(
    type: T,
    handler: Handler<Extract<DomainEvent, { type: T }>>,
  ): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler as Handler);
    this.handlers.set(type, list);
  }

  emit(event: DomainEvent): void {
    const list = this.handlers.get(event.type) ?? [];
    for (const handler of list) {
      Promise.resolve(handler(event)).catch((err) =>
        console.error(`[EventBus] handler error for ${event.type}:`, err),
      );
    }
  }
}

export const eventBus = new DomainEventBus();
