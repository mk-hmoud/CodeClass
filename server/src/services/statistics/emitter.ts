import { EventEmitter } from 'events';
import { EventType, EventPayload, SystemEvent } from './events';


class SystemEventEmitter extends EventEmitter {
  private static instance: SystemEventEmitter;

  private constructor() {
    super();
  }


  public static getInstance(): SystemEventEmitter {
    if (!SystemEventEmitter.instance) {
      SystemEventEmitter.instance = new SystemEventEmitter();
    }
    return SystemEventEmitter.instance;
  }


  public emit<T extends EventType>(eventType: T, payload: EventPayload<T>): boolean {
    const event: SystemEvent = {
      type: eventType,
      payload,
      timestamp: new Date().toISOString()
    } as SystemEvent;
    
    console.log(`Emitting system event: ${eventType}`);
    return super.emit(eventType, event);
  }


  public on<T extends EventType>(
    eventType: T,
    listener: (event: Extract<SystemEvent, { type: T }>) => void
  ): this {
    return super.on(eventType, listener);
  }


  public once<T extends EventType>(
    eventType: T,
    listener: (event: Extract<SystemEvent, { type: T }>) => void
  ): this {
    return super.once(eventType, listener);
  }
}

export const systemEventEmitter = SystemEventEmitter.getInstance();