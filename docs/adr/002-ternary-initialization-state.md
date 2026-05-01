# ADR-002: Ternary Initialization State for Native Ad Components

**Status:** Accepted  
**Date:** 2026-05-01

## Context

`AdBannerView` and `NativeAdView` must not render the underlying native view until the DaroM SDK is initialized. They call `DaroMModule.isInitialized()` — an async native method — and conditionally render a placeholder `<View>` until the check resolves.

The original implementation used `useState<boolean>(false)`. This created an ambiguity: `false` could mean either "the SDK is confirmed not initialized" or "the async check has not yet completed". Both states were rendered identically (placeholder `<View>`), but only the first warranted a warning.

Two additional issues were present:

1. **Render-path `console.log`:** `AdBannerView` called `console.log('AdBannerView is not initialized')` inside the conditional render block. This fired on every re-render that occurred during the pending window, not just once.
2. **Race condition on unmount:** The async IIFE in `useEffect` had no cancellation guard. If the component unmounted before `isInitialized()` resolved, `setIsInitialized` would be called on an unmounted component, producing a React state-update-on-unmounted-component warning.
3. **Dead code:** `AdBannerView` maintained an `adFormatSize` ref, `ADVIEW_SIZE`, `SizeKey`, and `SizeRecord` that were written in `useEffect` but never read anywhere in the render path.

## Decision

### 1. Use `useState<boolean | null>(null)` — three distinct states

| Value   | Meaning                       |
| ------- | ----------------------------- |
| `null`  | Async check in progress       |
| `true`  | SDK confirmed initialized     |
| `false` | SDK confirmed not initialized |

The render condition becomes `if (isInitialized === null \|\| !isInitialized)`, which correctly handles the pending case without conflating it with the failure case.

### 2. Move the warning out of the render path; emit it once

The `console.warn` is now inside the `.then()` callback, which runs exactly once regardless of subsequent re-renders.

### 3. Add a cancellation flag to the async effect

```ts
useEffect(() => {
  let cancelled = false;
  DaroMModule.isInitialized().then((initialized: boolean) => {
    if (cancelled) return;
    // ...
    setIsInitialized(initialized);
  });
  return () => {
    cancelled = true;
  };
}, []);
```

### 4. Remove dead code from `AdBannerView`

`adFormatSize`, `ADVIEW_SIZE`, `SizeKey`, `SizeRecord`, and the `DimensionValue` import were removed. The `useEffect` dependency on `adFormat` was also removed — the initialization state is global, not per-format.

## Consequences

- "Loading" and "not initialized" are now distinct states, preventing incorrect warning suppression.
- `console.warn` fires at most once per component instance.
- No state updates on unmounted components.
- `AdBannerView` is smaller and has no unreachable code paths.
