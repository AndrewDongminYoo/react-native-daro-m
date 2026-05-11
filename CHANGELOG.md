# Changelog

All notable changes to `@dev-teamremited/react-native-daro-m` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

For an itemized list of every difference between this fork and upstream `react-native-daro-m`, see [`docs/fork-differences.md`](./docs/fork-differences.md).

## [1.1.0] — 2026-05-11

First release validated end-to-end against React Native's New Architecture (`fabric: true` on iPhone + `newArchEnabled=true` on Android device, all four ad formats with reward callbacks and `customData` round-trip). See [`docs/notes/2026-05-11-new-arch-validation.md`](./docs/notes/2026-05-11-new-arch-validation.md) for the validation log.

### Changed

- `NativeEventEmitter` is now constructed without the `NativeModules.DaroMModule` argument. Under Bridgeless / New Architecture, passing a non-null module made React Native probe for `addListener` / `removeListeners` methods on the JS module surface and emit two DEV-mode warnings on every listener registration. Event flow is unchanged.

### Fixed

- **iOS**: `initializeSdk` and `showMediationDebugger` now dispatch onto `DispatchQueue.main` so the DaroM SDK's internal `dispatch_once` block runs on the main thread when it touches `UIApplication.applicationState`. Eliminates the `Main Thread Checker: UI API called on a background thread` warning that fired on every cold start under New Architecture interop. See [ADR-005 §2 / Validation](./docs/adr/005-defer-turbomodule-migration.md).
- **Android**: scoped the React gradle plugin's codegen scan to this library's own `src/` via `react { jsRootDir = file("../src/") }`. Without this block the plugin's default scan walked the consuming workspace's `node_modules`, emitting foreign `*ManagerDelegate` classes (notably `RNCSafeAreaProviderManagerDelegate` from `react-native-safe-area-context`) into the library AAR and causing `:app:mergeLibDexDebug` `Type ... is defined multiple times` failures whenever consumers depended on another codegen-using library.

### Internal

- Adopted ADR-005 — defer TurboModule / Fabric migration and rely on the New Architecture interop layer. Trigger conditions documented for revisiting the decision.
- Scaffolded `example/` workspace (RN 0.85.3 + React 19) with `newArchEnabled=true` / `RCT_NEW_ARCH_ENABLED=1`, demonstrating the recommended `loadAd → onAdLoaded → showAd → onAdHidden → re-load` lifecycle pattern in `example/src/App.tsx`.
- Documented host-app integration requirements for both platforms in `example/README.md`:
  - iOS: `ios-daro-key.txt` must be in `Copy Bundle Resources`; per-flavor key copy script for build variants.
  - Android: `so.daro:daro-plugin` Gradle plugin, mediation network Maven repos (with AppLovin's repo last to avoid HTTP 403 short-circuits), `implementation("so.daro:daro-m")` runtime dep.
- Added `.github/workflows/upstream-watch.yml` — daily poll of npm for new upstream `react-native-daro-m` releases, opens a tracking issue when the published version exceeds `.upstream-version`.
- Authored [`docs/fork-differences.md`](./docs/fork-differences.md) — full inventory of breaking changes, non-breaking improvements, and native bug fixes versus upstream.
- Authored [`docs/notes/2026-05-11-new-arch-validation.md`](./docs/notes/2026-05-11-new-arch-validation.md) — field notes from the validation session, including DaroM ↔ AppLovin MAX mapping, license-key debugging order, SDK retry backoff measurements, and the Android dex-merge / mediation-repo / CMake-race findings.

## [1.0.31] — baseline

Inherited from upstream `react-native-daro-m@1.0.31`. The published `@dev-teamremited` 1.0.31 already carried this fork's breaking API changes (Promise-returning `showAd`, parameter-free `removeXxx`, expanded `AppOpenAdType.showAd`, `setUserId` primitive `string`) and non-breaking improvements (single-subscriber `EventEmitter` warning, ternary banner init state, `StyleSheet.flatten` style bridging) and the iOS/Android native bug fixes catalogued in [`docs/fork-differences.md`](./docs/fork-differences.md).
