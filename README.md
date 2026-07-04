# @dongminyu/react-native-daro-m

A maintenance fork of [`react-native-daro-m`](https://www.npmjs.com/package/react-native-daro-m), the DaroM advertising SDK bridge for Android and iOS.

## Why this fork exists

This package is consumed by the **the host reward app** at [`/Users/dongminyu/Development/02_work/host-rn-app`](../host-rn-app). The production app was hitting reward-attribution bugs that the upstream `void`-returning ad APIs made impossible to diagnose or recover from:

- Reward callbacks were occasionally lost when the host screen re-mounted between `loadAd` and the reward event.
- `showAd(...)` returned `void`, so the host could not `await` display completion before navigating, dismissing the screen, or initiating reward verification.
- Display-time errors surfaced as unhandled native promise rejections instead of being caught by the call site.

The upstream source is **not publicly hosted**. The package's npm metadata advertises [`github.com/delightroom/daro-m-react-native`](https://github.com/delightroom/daro-m-react-native), but that repository returns `404` — the maintainers publish only the compiled tarball to npm. This fork was therefore bootstrapped by **extracting the contents of `node_modules/react-native-daro-m`** from a recent install and re-packaging them under the `@dongminyu` scope on GitHub Packages.

> **Scope of the fork**: minimum-viable patches required to unblock the host app. We do not intend to track upstream feature work line-for-line — only to keep the surface area compatible while the bug fixes ship.

## Origin of the source code

| Artifact                             | Source                                                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `src/**`                             | Extracted from `node_modules/react-native-daro-m@1.0.31` and reformatted under this repo's Prettier config |
| `android/**`                         | Extracted from the same tarball; no functional changes yet                                                 |
| `ios/**`                             | Extracted from the same tarball; no functional changes yet                                                 |
| `react-native-daro-m.podspec`        | Pod name preserved as `react-native-daro-m` for native-module autolinking compatibility                    |
| Upstream version pinned in this fork | See [`.upstream-version`](./.upstream-version)                                                             |

Because the source originated from a published tarball, formatting differences (tabs → 2-space indent, double quotes → single quotes, line-wrap at 80 cols) appear in every file. Those are cosmetic and tracked separately from the functional patches below.

## Differences from upstream

The functional deltas — the reason this fork exists — are intentionally small:

### 1. `showAd` returns `Promise<void>` instead of `void`

Applied to `InterstitialAd`, `RewardedAd`, `AppOpenAd`, and `LightPopupAd`. The native module already returns a promise; upstream simply discards it. The fork forwards the promise so the host app can `await` display and observe native-side rejections:

```ts
// upstream
const showAd = (adUnitId: string): void => {
  DaroMModule.showInterstitial(adUnitId);
};

// this fork
const showAd = (adUnitId: string): Promise<void> => {
  return DaroMModule.showInterstitial(adUnitId);
};
```

### 2. `EventEmitter.addEventListener` warns on silent listener replacement

The bridge supports only one listener per event type. Upstream silently overwrites the previous handler — which is exactly how reward events get lost during re-render. The fork emits a `__DEV__`-gated `console.warn` so the regression is visible during development.

### 3. `setUserId` parameter typed as `string` (not `String`)

Upstream typed the parameter as the boxed wrapper type `String`. Corrected to the primitive `string`.

### 4. Native: `DispatchQueue.main.async` around SDK entry points

`DaroAds.shared.initialized` (iOS) calls `UIApplication.applicationState` inside a `dispatch_once` block. Under New Architecture's TurboModule interop, all native modules execute on the shared `com.meta.react.turbomodulemanager.queue` (not main thread), so Main Thread Checker flags the access on every cold start. The fork wraps `initializeSdk` and `showMediationDebugger` in `DispatchQueue.main.async` so the once-block captures main as its execution thread. See [ADR-005 §2 / Validation](./docs/adr/005-defer-turbomodule-migration.md) for the trade-off analysis.

### 5. Package identity

| Field                             | Upstream                 | This fork                                         |
| --------------------------------- | ------------------------ | ------------------------------------------------- |
| `name`                            | `react-native-daro-m`    | `@dongminyu/react-native-daro-m`                  |
| Registry                          | npm public               | GitHub Packages (`npm.pkg.github.com`)            |
| Pod name                          | `react-native-daro-m`    | `react-native-daro-m` _(unchanged — autolinking)_ |
| Diagnostic message in `index.tsx` | references unscoped name | references scoped name                            |

Anything not listed above is either upstream-equivalent or a formatting-only change.

## Installation

Authenticate against GitHub Packages, then:

```sh
yarn add @dongminyu/react-native-daro-m
```

The package ships compiled output in `lib/` plus the original `android/` and `ios/` native modules for autolinking.

## Usage

The public API matches upstream. Migrating an existing host app is import-rename plus the `Promise<void>` change at call sites that previously fired-and-forgot:

```ts
import {
  InterstitialAd,
  RewardedAd,
  AppOpenAd,
} from '@dongminyu/react-native-daro-m';

// new: await display so reward verification runs after the ad closes
await RewardedAd.showAd(unitId, customData);
```

## Development

```sh
yarn install
yarn prepare      # build lib/ via react-native-builder-bob
yarn typecheck
yarn lint
yarn test
```

See [`CLAUDE.md`](./CLAUDE.md) for architecture notes.

## Upstream tracking

`react-native-daro-m` on the public npm registry is treated as the canonical upstream. A scheduled GitHub Action (`.github/workflows/upstream-watch.yml`) polls the registry daily and opens an issue whenever the published version exceeds the one pinned in [`.upstream-version`](./.upstream-version).

When a new upstream release lands:

1. The watcher opens an issue tagged `upstream-sync`.
2. A maintainer pulls the new tarball, diffs it against `src/` (and `android/` / `ios/` if those changed), and applies the relevant deltas on top of this fork's functional patches.
3. Bump `.upstream-version` and close the issue.

The watcher can also be triggered manually via `workflow_dispatch`.

## License

MIT — inherited from upstream.
