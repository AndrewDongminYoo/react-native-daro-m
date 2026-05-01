# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Native **native bridge library module** (not an app) that wraps the DaroM advertising SDK. It exposes TypeScript APIs for Banner, Interstitial, Rewarded, AppOpen, LightPopup, and Native ad formats.

Built with [react-native-builder-bob](https://github.com/callstack/react-native-builder-bob), published to npm. Build output goes to `lib/` (gitignored); source is in `src/`.

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

# Release a new version
yarn release
```

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

| File/Dir | Purpose |
|---|---|
| `index.tsx` | Public API entry point |
| `EventEmitter.ts` | Central NativeEventEmitter wrapper |
| `AdBannerView.tsx` | Banner/MREC component (`forwardRef` + `useImperativeHandle`) |
| `InterstitialAd.ts` | Programmatic interstitial API |
| `RewardedAd.ts` | Programmatic rewarded API |
| `AppOpenAd.ts` | Programmatic app-open API |
| `LightPopupAd.ts` | Programmatic light-popup API (uses `tinycolor2`) |
| `nativeAd/` | NativeAdView component + Context provider |
| `types/` | All TypeScript interfaces and event types |

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

- **Package manager**: Yarn v3 (Berry) — use `yarn`, not `npm`
- **Linting**: Trunk orchestrates ESLint + Prettier + KtLint; pre-commit and pre-push hooks are active
- **TypeScript**: strict mode enabled in `tsconfig.json`
- **Releases**: `release-it` with `@release-it/conventional-changelog` (Angular preset); tags as `v{version}`
