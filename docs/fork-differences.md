# Fork Differences from `react-native-daro-m` (upstream)

This document compares this forked repository against the published
[`react-native-daro-m@1.0.31`](https://www.npmjs.com/package/react-native-daro-m) package.

> **Base version**: `1.0.31` (the latest published release as of this writing)

---

## Table of Contents

- [Breaking API Changes](#breaking-api-changes)
- [Non-Breaking Improvements](#non-breaking-improvements)
- [Native Bug Fixes (iOS)](#native-bug-fixes-ios)
- [Native Bug Fixes (Android)](#native-bug-fixes-android)
- [Migration Guide](#migration-guide)

---

## Breaking API Changes

These changes require updates to call-site code when migrating from the published package.

### 1. `showAd()` now returns `Promise<void>` (was `void`)

Applies to: `InterstitialAd`, `RewardedAd`, `LightPopupAd`, `AppOpenAd`

**Before (upstream)**

```ts
InterstitialAd.showAd(adUnitId);
```

**After (this fork)**

```ts
// showAd now rejects if the ad is not loaded or the activity/window is unavailable
await InterstitialAd.showAd(adUnitId);
// or
InterstitialAd.showAd(adUnitId).catch(console.error);
```

The upstream implementation silently did nothing if the ad was not loaded. This fork rejects
the promise with a descriptive error code so callers can handle the failure.

Error codes per ad type:

| Situation                                                        | Error code                                         |
| ---------------------------------------------------------------- | -------------------------------------------------- |
| Activity unavailable (Android) / View controller not found (iOS) | `ACTIVITY_NOT_FOUND` / `VIEW_CONTROLLER_NOT_FOUND` |
| Ad not loaded — Interstitial                                     | `INTERSTITIAL_NOT_LOADED`                          |
| Ad not loaded — Rewarded                                         | `REWARDED_AD_NOT_LOADED`                           |
| Ad not loaded — LightPopup                                       | `LIGHTPOPUP_NOT_LOADED`                            |
| Ad not loaded — AppOpen                                          | `APPOPEN_NOT_LOADED`                               |

> **Callers that do not `await` or chain `.catch()`**: runtime behavior is unchanged. The
> only observable difference is that a rejection is now surfaced rather than swallowed.

---

### 2. `removeXxx()` event listener methods no longer accept a parameter

Applies to all seven `removeXxx` methods on every ad type.

**Before (upstream)**

```ts
const listener = (adInfo: AdInfo) => {
  /* ... */
};
InterstitialAd.addAdLoadedEventListener(listener);
// ...
InterstitialAd.removeAdLoadedEventListener(listener); // listener arg required by types
```

**After (this fork)**

```ts
InterstitialAd.addAdLoadedEventListener((adInfo) => {
  /* ... */
});
// ...
InterstitialAd.removeAdLoadedEventListener(); // no argument
```

**Why**: The `EventEmitter` implementation stores exactly one listener per event type.
The listener argument in the upstream types was never actually used — the native bridge always
removed the single registered subscription by event name. This fork aligns the type signature
with the actual runtime behavior and adds a `__DEV__` warning when a second `addXxx` call
replaces an existing listener.

> **Callers passing the listener argument**: TypeScript will now raise a type error
> ("Expected 0 arguments, but got 1"). Remove the argument from all `removeXxx` call sites.

---

### 3. `AppOpenAdType.showAd` signature expanded

**Before (upstream)**

```ts
// AppOpenAdType was a plain alias for InterstitialAdType
showAd(adUnitId: string): void;
```

**After (this fork)**

```ts
showAd(
  adUnitId: string,
  placement?: string | null,
  customData?: string | null
): Promise<void>;
```

The extra parameters are passed through to the underlying native `showAppOpenAd` call.
Both `placement` and `customData` are optional — existing call sites with just `adUnitId`
continue to work.

---

### 4. `setUserId` parameter type corrected

**Before (upstream)**

```ts
setUserId(userId: String): Promise<void>  // uppercase String — JS wrapper object
```

**After (this fork)**

```ts
setUserId(userId: string): Promise<void>  // lowercase string — primitive
```

In practice this was never observable at runtime (JavaScript coerces both), but TypeScript
strict mode treats `String` (wrapper object) and `string` (primitive) as distinct types.
Any call site that explicitly typed the argument as `String` should be updated to `string`.

---

## Non-Breaking Improvements

These changes improve correctness or developer experience without requiring call-site changes.

### Single-subscriber enforcement with DEV warning

`EventEmitter.ts` now emits a `console.warn` in `__DEV__` builds when `addXxx` is called
while a previous listener is still registered:

```
[DaroM] Replacing existing listener for event "ON_INTERSTITIAL_LOADED_EVENT".
Only one listener per event type is supported.
Call removeEventListener before registering a new one.
```

This surfaces a class of bugs where multiple components each call `addXxx` and the last one
silently wins. In production builds no warning is emitted and the behavior is unchanged.

### Ternary initialization state in Banner / NativeAd components

`AdBannerView` and `NativeAdView` previously used `useState<boolean>(false)` to track SDK
initialization. This meant the components rendered an empty `<View>` on the initial mount
before the async check resolved — even when the SDK was already initialized. The state is now
`boolean | null`, where `null` means "check in progress". The empty view is rendered only
when `null` or `false`, preventing a flash of nothing on re-mounts.

### `StyleSheet.flatten` for native style bridging (`NativeAdViewComponents`)

`useStyleProps` and `useImageStyleProps` in `NativeAdViewComponents.tsx` previously cast the
`style` prop directly with `style as TextStyle`, which would fail for array-style or nested
`StyleSheet` references. The cast is replaced with `StyleSheet.flatten(style) ?? {}`, which
correctly resolves all React Native style variants before accessing individual properties.

---

## Native Bug Fixes (iOS)

These fixes are invisible to the JavaScript API but affect runtime behavior.

| Area                       | Issue                                                                                                      | Fix                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| All ad types               | `UIApplication.shared.windows` deprecated in iOS 15                                                        | Replaced with `connectedScenes` / `isKeyWindow` lookup via a shared `keyWindow` computed property |
| Interstitial / Rewarded    | `show()` called on wrong thread in some cases                                                              | Dispatch is explicitly sent to `DispatchQueue.main.async`                                         |
| LightPopup                 | `executeOnMainThread` used `DispatchQueue.main.sync` — deadlock if already on main thread                  | Replaced with `if Thread.isMainThread { block() } else { DispatchQueue.main.async { block() } }`  |
| LightPopup                 | `reject: RCTPromiseRejectBlock` not marked `@escaping` — captured in async closure                         | Added `@escaping` to both `reject` and `resolve` in `showAppOpenAd`                               |
| Banner                     | `onAdClicked` listener was never wired up in `setupBannerListener`                                         | Added the missing `bannerView.listener.onAdClicked` callback                                      |
| `Daro+Extensions.swift`    | `UIImageView.applyStyle` accumulated `aspectRatio` constraints on every style update, causing layout drift | Existing width/height constraints are removed before adding the new one                           |
| `DaroMNativeAdViewManager` | Four `print("[QWER]...")` debug statements were left in `makeAdViews`                                      | Removed                                                                                           |

---

## Native Bug Fixes (Android)

| Area                       | Issue                                                                                                                      | Fix                                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `DaroMModule`              | `isInitialized` flag read from multiple threads without synchronization                                                    | Annotated `@Volatile`                                                                                     |
| `DaroMModule`              | `initializeSdk` had no Promise — callers could not detect initialization failure                                           | Added `Promise` parameter; wraps `Daro.init()` in try/catch; rejects on exception                         |
| `DaroMModule`              | `setDebugMode(false)` was hardcoded — debug logging disabled even in debug builds                                          | Reads `ApplicationInfo.FLAG_DEBUGGABLE` from the consuming app's `ApplicationInfo`                        |
| Rewarded                   | `onAdImpression` and `onAdClicked` called `super.*()` no-ops instead of `sendNativeEvent`                                  | Fixed to emit the correct events                                                                          |
| LightPopup                 | `toColorInt()` throws on invalid color strings — would crash if an invalid hex was passed                                  | Replaced with `toColorIntOrNull()` using `runCatching`                                                    |
| NativeAdView               | `postDelayed(50ms)` was a race-condition hack to wait for layout dimensions                                                | Replaced with a one-shot `ViewTreeObserver.OnGlobalLayoutListener`; listener is cleaned up in `destroy()` |
| `DaroMAdNativeViewManager` | `viewCache` was in `companion object` (static) — shared across all manager instances, causing cross-context view leaks     | Moved to instance field                                                                                   |
| `DaroMAdBannerViewManager` | Same `companion object` cache issue                                                                                        | Moved to instance field                                                                                   |
| `DaroMAdNativeViewManager` | `setPlacement` `@ReactProp` had wrong receiver type (`DaroMAdBannerViewContainer` instead of `DaroMAdNativeViewContainer`) | Fixed receiver type                                                                                       |

---

## Migration Guide

### Step 1 — Update `removeXxx` call sites

Find every `removeXxx` call that passes the listener as an argument and remove it:

```ts
// Before
InterstitialAd.removeAdLoadedEventListener(onAdLoaded);
RewardedAd.removeAdReceivedRewardEventListener(onReward);

// After
InterstitialAd.removeAdLoadedEventListener();
RewardedAd.removeAdReceivedRewardEventListener();
```

### Step 2 — Handle `showAd` rejections

`showAd` now rejects when called with no loaded ad. Depending on your usage:

```ts
// Option A — await and catch
try {
  await InterstitialAd.showAd(adUnitId);
} catch (e) {
  console.warn('Ad not ready:', e);
}

// Option B — fire-and-forget with error suppression
InterstitialAd.showAd(adUnitId).catch(() => {});

// Option C — guard before showing (recommended)
const isReady = await InterstitialAd.isAdReady(adUnitId);
if (isReady) {
  await InterstitialAd.showAd(adUnitId);
}
```

### Step 3 — Update `AppOpenAd.showAd` call sites (if using AppOpenAd)

If you were calling `AppOpenAd.showAd(adUnitId)` with no additional arguments, no change is
needed (the new params are optional). If you want to pass custom data:

```ts
// Before — custom data was not supported in types
AppOpenAd.showAd(adUnitId);

// After — custom data and placement are now typed
AppOpenAd.showAd(adUnitId, null, 'my_custom_data');
```

### Step 4 — Verify `setUserId` call sites (TypeScript strict mode only)

If any call site explicitly annotated the argument as `String` (uppercase), update it:

```ts
// Before
const id: String = getUserId();
setUserId(id);

// After
const id: string = getUserId();
setUserId(id);
```

### Step 5 — Review multi-listener patterns

If any screen registers multiple listeners for the same event without removing the previous
one, the `__DEV__` warning will appear. The recommended pattern:

```ts
useEffect(() => {
  InterstitialAd.addAdLoadedEventListener((adInfo) => {
    setIsAdReady(true);
  });
  return () => {
    InterstitialAd.removeAdLoadedEventListener();
  };
}, []);
```

Ensure `removeAdLoadedEventListener()` is called in the cleanup function of every `useEffect`
that calls `addAdLoadedEventListener`.
