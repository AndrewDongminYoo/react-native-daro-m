# ADR-006: Expose `adUnitId` on the RewardedAd reward event

**Status:** Accepted — implementation gated (see "Gates before merge")
**Date:** 2026-06-30

## Context

The the host reward app (`../host-rn-app`) suffers a long-running, cross-platform class of "watched the ad but got no reward" VOC (scratch ticket never appears / points never credited). Root-cause analysis (see the host app's `docs/plans/2026-06-30-rewarded-ad-error-program-diagnosis.md`, bucket B) traced the dominant client-side cause to **reward mis-routing**:

- The reward event listener is global and singleton (one listener per event type — see [ADR-001](./001-single-subscriber-event-emitter.md)). The host app registers it once and routes each reward to the right `DaroRewardedAdManager` instance by **guessing** the active instance via a mutable `currentDisplayingManager` / `recentDisplayingManager` pointer, kept in sync by a web of timers (15s no-reward timer, 2s foreground-recovery timer, `onDisplayed` cancellation).
- When that pointer is `null` or wrong at the moment the reward arrives — re-mount between load and reward, backgrounding, **interleaved sequential same-unit ads** ("watch 3 lottery / 7 attendance ads in a row") — the reward is credited to the wrong instance or dropped (`DaroRewardedAd_RewardGranted_NoManager`).

### The load-bearing finding

The reward event **already carries `adUnitId` on both native platforms today**:

| Platform | Emission site | Field |
| --- | --- | --- |
| Android | `android/src/main/java/com/darom/util/AdInfoUtil.kt:58` (`getRewardInfo`) | `adInfo.putString("adUnitId", adUnitId)` |
| iOS | `ios/DaroMModule+Rewarded.swift:115,121-126` (`onEarnedReward` → `toBody(unitId:)`) | `"adUnitId": unitId` (from `adInfo?.adUnitId ?? ""`) |

The **only** gap is the public TypeScript type: `src/types/AdInfo.ts`'s `AdRewardInfo` declares just `rewardLabel?` and `rewardAmount`, **not** `adUnitId`. React Native erases TS types at runtime, so the field is on the wire and reaches the JS listener — but it is invisible to typed consumers, so the host app cannot route by it and falls back to the pointer guess.

Therefore the fix is **not** a native change. It is exposing an already-emitted field in the type, after which the consumer can route deterministically.

## Decision

Add `adUnitId: string` to the `AdRewardInfo` type in `src/types/AdInfo.ts`, aligning it with every other `AdInfo`-family type (`AdInfo`, `AdLoadFailedInfo`), which already expose `adUnitId`.

```ts
// src/types/AdInfo.ts
export type AdRewardInfo = {
  // The ad unit ID that produced this reward. Already emitted natively
  // (Android AdInfoUtil.getRewardInfo, iOS DaroRewardedItem.toBody) — this
  // type previously omitted it. Consumers route rewards by this id (ADR-006).
  adUnitId: string;
  rewardLabel?: string | null;
  rewardAmount: string;
};
```

No native (Kotlin/Swift) change. This is a type-only delta plus a patch version bump and republish to GitHub Packages.

> iOS edge: `onEarnedReward` uses `adInfo?.adUnitId ?? ""`, so `adUnitId` can be the empty string if the SDK hands back a nil `adInfo`. The type is non-optional (the key is always present) but consumers must treat `""` as "unknown" and fall back — see consumer migration.

## Alternatives considered (rejected)

- **(b2) Native multi-subscriber `EventEmitter`.** Replace the single-listener contract ([ADR-001](./001-single-subscriber-event-emitter.md)) so each manager subscribes independently. Solves routing structurally but is a large native change across both platforms, contradicts the fork's minimum-viable mandate, and is unnecessary once `adUnitId` lets a single listener route deterministically.
- **App-only pointer hardening.** Keep routing by pointer but add more recovery heuristics. Treats the symptom; the pointer is fundamentally a guess and cannot be made correct for interleaved sequential ads. Rejected.
- **Add `adUnitId` natively.** Not needed — both platforms already emit it.

## Gates before merge (host app)

1. **Runtime confirmation.** Add one `console.log` of the reward payload in the host reward listener and watch one reward ad via `rn-metro-console` to confirm `rewardInfo.adUnitId` is populated at runtime on a real build (source says yes; verify before relying on it).
2. **Sizing.** Pull the `DaroRewardedAd_RewardGranted_NoManager` Sentry count over the VOC window — the **lower bound** on mis-routed (null-pointer) rewards. It undercounts *wrong*-pointer routing (reward credited to the wrong instance fires no Sentry event), which is exactly the interleaved-sequential case, so true impact ≥ this number. If near-zero, re-prioritize before building (bucket B would then be mostly genuine no-reward, owned by vendor/BE, not this change).

## Consumer migration (host app)

The field ships in the **currently installed** fork build, so the host fix does **not** block on this republish — the app can read it immediately via a local cast and adopt the published type later:

```ts
// DaroRewardedAdManager reward listener — route deterministically, pointer as fallback
RewardedAd.addAdReceivedRewardEventListener((rewardInfo) => {
  const unitId = (rewardInfo as { adUnitId?: string }).adUnitId;
  const routed = unitId ? DaroRewardedAdManager.instances.get(unitId) : undefined;
  const manager = routed ?? currentDisplayingManager ?? recentDisplayingManager; // fallback unchanged
  // ...credit `manager` as today
});
```

- Change **only** the reward listener. `currentDisplayingManager` / `recentDisplayingManager` remain load-bearing for the no-reward-timeout path and `isAdDisplaying()` — do not remove them.
- Empty/unknown `adUnitId` → fall back to today's exact pointer behavior (zero regression on the iOS `?? ""` edge).

## Consequences

- **Fixes:** reward mis-routing (null/wrong pointer) = the host app's "bucket B / P1".
- **Does NOT fix:** genuine no-reward (vendor/no-fill), the sequential-ad *timer* masking (`onDisplayed` cancels the 15s `pendingClearTimeout` — independent of routing), or bucket-A availability ("준비중" / ad never shows).
- **Measurement discontinuity (host app):** after the host adopts deterministic routing, `REWARDED_AD_NO_REWARD` will *drop* for the previously-mis-routed subset (the reward now sets `rewardReceived=true` on the correct instance, so the 15s timer no longer fires). Bucket-B counts are therefore **not comparable across the deploy boundary**; the delta ≈ mis-routing volume (a useful confirmation of this ADR's impact). Record this next to the host app's measurement caveats.
- **Upstream-sync cost:** zero native delta to re-apply; one type line tracked alongside the existing functional patches.
