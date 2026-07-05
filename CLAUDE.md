# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Native **native bridge library module** (not an app) that wraps the DaroM advertising SDK. It exposes TypeScript APIs for Banner, Interstitial, Rewarded, AppOpen, LightPopup, and Native ad formats.

Built with [react-native-builder-bob](https://github.com/callstack/react-native-builder-bob), published to **GitHub Packages** under the `dongminyu` scope. Build output goes to `lib/` (gitignored); source is in `src/`.

## Fork Context

**Source code provenance**: upstream's GitHub repo (`delightroom/daro-m-react-native`) is not publicly accessible — only the compiled tarball is on npm. `src/`, `android/`, and `ios/` were therefore extracted from `node_modules/react-native-daro-m` and re-formatted. See `README.md` for the full background.

**Functional patches that distinguish this fork from upstream** (do not regress these when syncing):

1. `InterstitialAd.showAd`, `RewardedAd.showAd`, `AppOpenAd.showAd`, `LightPopupAd.showAd` return `Promise<void>` — the host app `await`s them to sync reward verification and navigation.
2. `EventEmitter.addEventListener` emits a `__DEV__`-gated `console.warn` when an existing listener for the same event is being replaced (the bridge supports only one listener per event type; silent overwrites were how reward events were getting lost).
3. `setUserId` parameter type corrected from `String` to `string`.
4. `initializeSdk` and `showMediationDebugger` (iOS) wrapped in `DispatchQueue.main.async` so the DaroM SDK's internal `dispatch_once` + `UIApplication.applicationState` access captures the main thread — silences Main Thread Checker under New Architecture interop without overriding `methodQueue` globally. See ADR-005 §2 / Validation.
5. Package name scoped to `@dongminyu/react-native-daro-m`. The CocoaPods spec name stays `react-native-daro-m` for autolinking compatibility.

Everything else versus upstream is Prettier-driven formatting (single quotes, 2-space indent, 80-col wrap) and should not be treated as load-bearing.

## Commands

```sh
# Build library (CommonJS + ESM + TypeScript declarations → lib/)
yarn prepare

# Type check
yarn typecheck

# Lint
yarn lint

# Run tests
yarn test

# Run a single test
yarn test -- --testPathPattern="<file>" --testNamePattern="<name>"

# Clean all build artifacts
yarn clean
```

Releases are cut with the `/release` skill (`.claude/skills/release/SKILL.md`), not a
package script: bump the version in `package.json`, update `CHANGELOG.md`, run
typecheck + lint + test, commit as `chore(release): 🔖 vX.Y.Z`, then push the `v{version}`
tag on a separate branch (never straight to `main`). The `v*.*.*` tag triggers `publish.yml`.

Run example app commands via the workspace:

```sh
yarn example start       # Metro dev server
yarn example android     # Run on Android
yarn example ios         # Run on iOS
```

## Architecture

### Core Pattern: Native Bridge + Event-Driven

All ad operations follow this flow:

1. JS calls `NativeModules.DaroMModule.methodName()` (sync trigger)
2. Native code emits events back via `NativeEventEmitter`
3. `src/EventEmitter.ts` centralizes listener registration — one listener per event type (replaces previous if duplicate)

```plaintext
App → NativeModules.DaroMModule.loadInterstitial(unitId)
    → Native emits ON_INTERSTITIAL_LOADED_EVENT
    → EventEmitter.addEventListener() → JS callback
```

### Source Layout (`src/`)

| File/Dir            | Purpose                                                      |
| ------------------- | ------------------------------------------------------------ |
| `index.tsx`         | Public API entry point                                       |
| `EventEmitter.ts`   | Central NativeEventEmitter wrapper                           |
| `AdBannerView.tsx`  | Banner/MREC component (`forwardRef` + `useImperativeHandle`) |
| `InterstitialAd.ts` | Programmatic interstitial API                                |
| `RewardedAd.ts`     | Programmatic rewarded API                                    |
| `AppOpenAd.ts`      | Programmatic app-open API                                    |
| `LightPopupAd.ts`   | Programmatic light-popup API (uses `tinycolor2`)             |
| `ErrorCode.ts`      | `ErrorCode` enum consumed by the `AdInfo` type               |
| `nativeAd/`         | NativeAdView component + Context provider                    |
| `types/`            | All TypeScript interfaces and event types                    |

### Component Patterns

**UI Components** (`AdBannerView`, `NativeAdView`):

- Use `forwardRef` + `useImperativeHandle` to expose `loadAd()` imperatively to parent components
- Check `DaroMModule.isInitialized()` before rendering; fall back to empty `<View>` if not ready
- Native event prop naming convention: `onAdLoadedEvent` (native side) → `onAdLoaded` (JS-facing prop)

**Programmatic APIs** (Interstitial, Rewarded, AppOpen, LightPopup):

- Named object exports (not classes)
- Call `NativeModules.DaroMModule.*` directly and subscribe to responses via `EventEmitter`

### Build System

react-native-builder-bob compiles `src/` into three targets:

- `lib/commonjs/` — CJS
- `lib/module/` — ESM
- `lib/typescript/` — `.d.ts` declarations (from `tsconfig.build.json`)

Entry point: `src/index.tsx`. Only runtime dependency: `tinycolor2`.

## Tooling

- **Package manager**: Yarn v4 (Berry) — use `yarn`, not `npm`
- **Linting**: Trunk orchestrates ESLint + Prettier + KtLint; pre-commit and pre-push hooks are active
- **TypeScript**: strict mode enabled in `tsconfig.json`
- **Releases**: the `/release` skill drives a manual flow (version bump → `CHANGELOG.md` → gates → tag); pushing a `v{version}` tag triggers `publish.yml`. (`release-it` was removed in favour of the skill.)
- **CI** (`.github/workflows/`): `ci.yml` runs lint + typecheck + test + `yarn npm audit`; `publish.yml` pushes to GitHub Packages on `v*.*.*` tags; `release.yml` builds the library + native Android/iOS on GitHub Release `published`; `upstream-watch.yml` polls npm for new upstream versions

## Upstream Tracking

`.upstream-version` (single-line file at the repo root) records the upstream npm version this fork is currently synced against. `.github/workflows/upstream-watch.yml` runs daily and on `workflow_dispatch`:

1. Reads `.upstream-version`.
2. Runs `npm view react-native-daro-m version`.
3. If they differ, opens a tracking issue labeled `upstream-sync` with a checklist for diffing the new tarball, re-applying the fork's functional patches, and bumping `.upstream-version`.

The `upstream-sync` label must exist on the GitHub repo for issue creation to succeed. To sync manually:

```sh
npm pack react-native-daro-m@<new-version>
tar -xzf react-native-daro-m-<new-version>.tgz -C /tmp/upstream
diff -wru src/ /tmp/upstream/package/src/   # ignore whitespace; surface functional drift
# re-apply the four fork patches listed in "Fork Context" if needed
echo "<new-version>" > .upstream-version
yarn typecheck && yarn lint && yarn test && yarn prepare
```
