# ADR-001: Single-Subscriber Constraint in EventEmitter

**Status:** Accepted
**Date:** 2026-05-01

## Context

The library bridges the DaroM native SDK to JavaScript via `NativeModules` and `NativeEventEmitter`. Ad lifecycle events (loaded, failed, clicked, hidden, etc.) are delivered from native code as named string events on a shared emitter instance.

The original `EventEmitter.ts` maintained a module-level `subscriptions` record keyed only by event name. When `addEventListener` was called for an already-subscribed event, the previous subscription was silently removed and replaced. This behavior was undocumented and meant:

1. A developer mounting two interstitial ad units simultaneously would find that only the most-recently registered listener received events — with no error and no warning.
2. The `removeXxxEventListener` functions in `FullScreenAdType` and all concrete ad objects accepted a `listener` argument in their type signature, implying per-listener targeted removal. The implementations ignored this argument entirely, making the contract misleading.

## Decision

### 1. Remove the unused `listener` parameter from all `removeXxx` signatures

`FullScreenAdType` and all types extending it (`InterstitialAdType`, `RewardedAdType`, `AppOpenAdType`, `LightPopupAdType`) now declare `removeXxxEventListener(): void` with no parameters. The implementations already matched this behavior; the type is now accurate.

### 2. Emit a `__DEV__` warning when a subscription is replaced

`EventEmitter.addEventListener` now logs a `console.warn` in development builds when an existing subscription for the same event name is overwritten. This surfaces the single-subscriber constraint at the moment a second caller registers for the same event, rather than leaving the first caller silently broken.

```ts
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
```

### 3. Do not redesign to multi-subscriber

A multi-subscriber model (keying by `(event, listener)` pairs) was considered. It was deferred because:

- The DaroM native SDK treats each ad unit type as a singleton at the native layer. Running two concurrent interstitial instances against the same native singleton is not a supported usage pattern.
- The added complexity (managing sets of subscriptions, returning cleanup handles) would not benefit the primary use case.

## Consequences

- The public API contract now accurately reflects the single-listener limitation.
- Developers who accidentally register a second listener for the same event will see a visible warning in DEV mode instead of experiencing a silent failure.
- Callers who were passing a `listener` argument to `removeXxxEventListener` will encounter a TypeScript compile error, which is the correct outcome — those calls were already no-ops.
