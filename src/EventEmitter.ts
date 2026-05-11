import { NativeEventEmitter } from 'react-native';
import type { EventSubscription } from 'react-native';
import type { AdEventObject, AdEventListener } from './types/AdEvent';

// Constructed without the legacy NativeModules.DaroMModule argument. Under
// Bridgeless / New Architecture, passing a non-null module makes RN's
// NativeEventEmitter probe for `addListener` / `removeListeners` on the JS
// module surface — methods that exist on the native `RCTEventEmitter`
// superclass but are not exposed through the JS interop, producing two
// DEV-mode warnings on every listener registration. The native side does not
// gate emission on JS listener count for this module, so the no-arg form is
// behaviorally equivalent and silences the noise.
const emitter = new NativeEventEmitter();
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
