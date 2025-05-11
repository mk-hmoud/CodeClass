import { EventEmitter } from 'events';
import { ClassroomEvent, EventPayload } from './types';

class StronglyTypedEventEmitter extends EventEmitter {
  emit<T extends ClassroomEvent['type']>(
    eventName: T,
    payload: EventPayload<T>
  ): boolean {
    return super.emit(eventName, payload);
  }

  on<T extends ClassroomEvent['type']>(
    eventName: T,
    listener: (payload: EventPayload<T>) => void
  ): this {
    return super.on(eventName, listener);
  }

  once<T extends ClassroomEvent['type']>(
    eventName: T,
    listener: (payload: EventPayload<T>) => void
  ): this {
    return super.once(eventName, listener);
  }
}

export const statisticsEventEmitter = new StronglyTypedEventEmitter();
