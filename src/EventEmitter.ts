import { NativeModules, NativeEventEmitter } from 'react-native';
import type { EventSubscription } from 'react-native';
import type { AdEventObject, AdEventListener } from './types/AdEvent';

const { DaroMModule } = NativeModules;

const emitter = new NativeEventEmitter(DaroMModule);
const subscriptions: Record<string, EventSubscription> = {};

export const addEventListener = <T extends AdEventObject>(
  event: string,
  handler: AdEventListener<T>
): void => {
  const subscription: EventSubscription = emitter.addListener(event, handler);
  const currentSubscription = subscriptions[event];
  if (currentSubscription) {
    if (__DEV__) {
      console.warn(
        `[DaroM] Replacing existing listener for event "${event}". ` +
          'Only one listener per event type is supported. ' +
          'Call removeEventListener before registering a new one.'
      );
    }
    currentSubscription.remove();
  }
  subscriptions[event] = subscription;
};

export const removeEventListener = (event: string): void => {
  const currentSubscription = subscriptions[event];
  if (currentSubscription) {
    currentSubscription.remove();
    delete subscriptions[event];
  }
};
