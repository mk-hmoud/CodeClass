import EventEmitter from 'events';
import { StatisticsEvent, StatisticsEventType } from './types';

class StatisticsEventEmitter extends EventEmitter {
  private static instance: StatisticsEventEmitter;

  private constructor() {
    super();
  }

  public static getInstance(): StatisticsEventEmitter {
    if (!StatisticsEventEmitter.instance) {
      StatisticsEventEmitter.instance = new StatisticsEventEmitter();
    }
    return StatisticsEventEmitter.instance;
  }

  public emit(eventType: StatisticsEventType, payload: any): boolean {
    const event: StatisticsEvent = {
      type: eventType,
      payload,
      timestamp: new Date().toISOString()
    };
    
    console.log(`Emitting statistics event: ${eventType}`);
    return super.emit(eventType, event);
  }
}

export const statisticsEventEmitter = StatisticsEventEmitter.getInstance();