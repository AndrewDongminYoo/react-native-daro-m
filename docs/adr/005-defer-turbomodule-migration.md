# ADR-005: Defer TurboModule / Fabric Migration; Rely on New Architecture Interop

**Status:** Accepted
**Date:** 2026-05-11

## Context

The host application that consumes this fork — the 영끌 (Youngkeul) reward app at `../youngkeul-rn-app` — is preparing to enable React Native's New Architecture (`newArchEnabled=true`). This raised the question of whether this package must be rewritten against the TurboModule and Fabric specs before that transition can land.

The package currently uses two distinct native-integration mechanisms:

| Integration                                        | Surface                                                                 | Files                                                                                      |
| -------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Native Module** (legacy bridge)                  | `NativeModules.DaroMModule.*` invocations + `NativeEventEmitter` events | `EventEmitter.ts`, `InterstitialAd.ts`, `RewardedAd.ts`, `AppOpenAd.ts`, `LightPopupAd.ts` |
| **View Manager** (legacy `requireNativeComponent`) | `AdBannerView`, `NativeAdView` and its child components                 | `AdBannerView.tsx`, `nativeAd/NativeAdView.tsx`, `nativeAd/NativeAdViewComponents.tsx`     |

Two additional constraints frame the decision:

1. **Fork mandate.** This repository exists to ship minimum-viable patches against the upstream npm tarball. A wholesale architectural rewrite contradicts that mandate and would multiply the work required to integrate each upstream release tracked by `.github/workflows/upstream-watch.yml`.
2. **Upstream divergence cost.** Upstream (`react-native-daro-m` on the public npm registry) ships only compiled tarballs and is not on a public source repository. Every functional patch we apply has to be manually re-applied on top of each upstream sync. A TurboModule rewrite would turn every sync into a translation exercise.

React Native 0.74+ ships a **Legacy Interop Layer** that wraps legacy native modules and view managers so they run on the New Architecture without modification. Interop is not free — Fabric's view-manager interop in particular has more rough edges (layout, measurement, imperative `UIManager.dispatchViewManagerCommand` calls) than native-module interop — but for ad-SDK call frequencies (single-digit calls per session, not per frame) the overhead is not measurable.

## Decision

### 1. Do not migrate proactively

This package will continue to use the legacy native-module and view-manager APIs. The host app should enable New Architecture by flipping `newArchEnabled=true` only, without expecting any changes here first.

### 2. Treat the two view managers as the actual risk surface

If the host app reports rendering or sizing regressions under New Architecture, the suspects in priority order are:

1. `AdBannerView` — banner size measurement and the `UIManager.dispatchViewManagerCommand`-based `loadAd()` call.
2. `NativeAdView` and its `requireNativeComponent`-registered children (`TitleView`, `BodyView`, `MediaView`, `IconView`, `CallToActionView`).
3. Native modules (very unlikely; interop here is essentially 1:1).

### 3. Stage any future migration

If interop breaks for a specific component, migrate only that component to a Fabric component spec. Do not bundle a TurboModule rewrite of the native-module side at the same time — the two changes have independent risk profiles and independent upstream-sync costs.

Trigger conditions for revisiting this ADR:

- A concrete interop-layer bug is reproducible against this package under New Architecture and cannot be worked around in the host app.
- Meta publishes a deprecation timeline for the interop layer.
- Upstream itself migrates to TurboModule/Fabric — in which case we pull their work in via the normal `upstream-watch.yml` sync flow rather than authoring our own spec.

## Consequences

- **No immediate work.** The host app's New Architecture migration is unblocked by this package as-is.
- **Existing fork patches stay relevant.** ADR-001's single-subscriber `EventEmitter` warning and the `showAd → Promise<void>` change in `Interstitial/Rewarded/AppOpen/LightPopup` remain meaningful under New Architecture — they address lifecycle and call-site semantics, not architecture-specific behaviors.
- **`Promise<void>` becomes a free pre-migration.** TurboModule specs declare async methods as `Promise<T>`. The fork's existing return-type change already matches that shape, so host-app call sites will not need to be revisited if the native-module side is eventually moved to a TurboModule spec.
- **Upstream-sync workflow stays simple.** Every upstream release continues to be a diff-and-reapply exercise against legacy APIs, not a re-translation into our own TurboModule/Fabric specs.
- **Smoke-test burden moves to the host app.** When the host flips `newArchEnabled=true`, all six ad formats (Banner, MREC, Interstitial, Rewarded, AppOpen, LightPopup, NativeAd) must be exercised end-to-end. This responsibility is documented here so it is not forgotten when the time comes.
- **Partial-migration door is left open.** If only the view managers prove unstable under interop, ADR-005 explicitly authorizes migrating those alone without committing to a full TurboModule rewrite.
