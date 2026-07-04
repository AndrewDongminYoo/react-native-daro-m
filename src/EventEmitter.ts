import { NativeEventEmitter, NativeModules } from 'react-native';
import type { EventSubscription } from 'react-native';
import type { AdEventObject, AdEventListener } from './types/AdEvent';

// React Native's `NativeEventEmitter` constructor on iOS enforces
//   invariant(nativeModule != null, '... requires a non-null argument.')
// at module-init time. Passing no argument therefore crashes the host app on
// iOS the moment this file is imported (RN 0.79 and prior verified; behavior
// is unchanged in later legacy-bridge versions).
//
// Passing the module satisfies the invariant, but RN then probes the module
// object for `addListener` and `removeListeners` methods to manage native
// listener counts. Our `RCTEventEmitter` subclass implements both natively
// but they are not exposed through the JS interop layer — so RN logs two
// DEV-mode warnings per listener registration. We polyfill the methods as
// no-ops on the JS surface to silence the warnings without altering native
// behavior: `RCTEventEmitter` broadcasts events regardless of these counts,
// so the stubs are functionally equivalent.
// RN's NativeEventEmitter expects a module with this exact shape. We define
// it locally so the polyfill assignments below typecheck without leaking the
// optional fields to the constructor argument.
type NativeEventEmitterModule = {
  addListener: (eventType: string) => void;
  removeListeners: (count: number) => void;
};
const DaroMModule = NativeModules.DaroMModule as
  | (Partial<NativeEventEmitterModule> & Record<string, unknown>) // no-format
  | undefined;
if (DaroMModule) {
  if (typeof DaroMModule.addListener !== 'function') {
    DaroMModule.addListener = () => {};
  }
  if (typeof DaroMModule.removeListeners !== 'function') {
    DaroMModule.removeListeners = () => {};
  }
}

const emitter = new NativeEventEmitter(
  DaroMModule as NativeEventEmitterModule | undefined
);
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
