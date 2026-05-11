# 2026-05-11 — New Architecture validation session (iOS device)

Field notes captured while running the newly scaffolded `example/` workspace on a physical iPhone with `RCT_NEW_ARCH_ENABLED=1`. Companion to [ADR-005](../adr/005-defer-turbomodule-migration.md) — these are operational details that did not fit in the ADR.

## What confirmed

- React Native registers the app with `{"fabric": true}` — New Architecture active end-to-end.
- The `RCT_EXTERN_MODULE`-declared `DaroMModule` runs on `com.meta.react.turbomodulemanager.queue`, i.e. the interop layer auto-wraps it as a TurboModule. No native source changes needed.
- After fixing the `ios-daro-key.txt` Copy Bundle Resources issue, `DaroAds.shared.initialized { ... }` resolves successfully and downstream AppLovin MAX bring-up proceeds.
- `AdBannerView.loadAd` reaches AppLovin and gets a real rejection (`invalidAdUnitIdentifier`) — i.e. the bridge path is end-to-end functional under New Architecture.

## DaroM ↔ AppLovin MAX surface

DaroM is a thin wrapper over AppLovin MAX mediation. The bring-up log exposes this directly:

```log
[AppLovinSdk] Initializing with key: oF957_6ts3...
Mediation Provider: max
```

Implications:

- The "ad unit ID" handed to `loadAd()` is a **DaroM-issued UUID**. Internally DaroM maps it to an AppLovin MAX ad unit ID (`fbc3b4efc9775c02` in the failing case). Errors surface using the AppLovin ID, so a UUID error message containing a non-UUID identifier is normal, not a bug.
- The AppLovin SDK key is a per-DaroM-app constant baked into the DaroM SDK initialization path — not something the host app or this package manages. It is logged at DEBUG level only.
- Debugging an `invalidAdUnitIdentifier` can therefore be done from either side: DaroM dashboard (entry point) or AppLovin MAX dashboard (downstream mapping). Sometimes only one side is misconfigured.

## The license / identity 3-tuple

For the iOS SDK to initialize at all, three values must agree:

| Where                              | What                                 |
| ---------------------------------- | ------------------------------------ |
| `Info.plist` → `DaroAppKey`        | UUID issued by the DaroM dashboard   |
| `Bundle.main` → `ios-daro-key.txt` | Encrypted license tied to the above  |
| App bundle identifier              | Must match the dashboard's app entry |

Mismatch on any one of the three surfaces as an opaque `invalidAdUnitIdentifier` on the _first_ ad unit load — not as an initialization error. The actual root cause we hit in this session was a bundle ID mismatch (`dev.reactnativedarom.example` was not the value registered on the dashboard). The error message points at the ad unit, but the real fix is on the bundle ID / dashboard side.

**Debugging order**, in increasing-pain order:

1. Wait 30–60 minutes. AppLovin's own message states new ad units need that long to propagate.
2. Confirm the bundle ID in the running app matches the dashboard entry.
3. Confirm the dashboard entry has the specific ad unit ID enabled.
4. Cross-check the same ad unit on the AppLovin MAX dashboard.

## SDK retries autonomously

Banner load failures retry from inside the SDK with rough exponential backoff:

```log
10:40:57.908   first attempt
10:40:59.002   +1.1s
10:41:00.589   +1.6s
10:41:02.920   +2.3s
10:41:06.534   +3.6s
10:41:11.674   +5.1s
10:41:19.354   +7.7s
```

**Host-app implication**: do not layer a custom retry loop on top of `loadAd()`. The SDK already retries — adding another tier would double the request rate and burn through ad inventory quickly. If the host needs a different cadence (e.g. give up after N attempts), it should debounce/cancel rather than retry.

## Main Thread Checker — resolved via targeted main-dispatch

The `UIApplication.applicationState` background-thread access (documented in ADR-005 §2) fires both _before_ and _after_ SDK initialization, so it is not gated by license/app-key state. It is a closed-source SDK bug; our bridge does not invoke `applicationState` anywhere.

**Resolution (later same day)**: ADR-005 §2 open question closed. `initializeSdk` and `showMediationDebugger` in `ios/DaroMModule.swift` are now wrapped in `DispatchQueue.main.async` — added as fork patch #4 (renumbered the package-identity item to #5). The stack trace traced the violation to a `dispatch_once` inside `DaroAds.shared.initialized`; `dispatch_once` captures the calling thread for the once-block, so forcing the first call onto main is sufficient. A blanket `methodQueue` override was rejected — would serialize every method (including high-frequency `isXxxReady` / `loadXxx`) through main with no payoff for the methods that do not trigger the warning.

**Verified on device (11:32 run)**: rebuilt the example with patch #4 applied. Main Thread Checker did not fire during SDK init or any subsequent ad call. The previously-observed `Main Thread Checker: UI API called on a background thread: -[UIApplication applicationState]` lines are absent from the new log. All four ad-load paths (Banner / Interstitial / Rewarded / LightPopup-placeholder) and the full Rewarded `showAd → reward → hidden → reload` sequence completed without the warning.

## Android dex merge conflict — codegen scoping fix

A separate build failure surfaced when running `yarn example android`:

```log
> Task :app:mergeLibDexDebug FAILED
Type com.facebook.react.viewmanagers.RNCSafeAreaProviderManagerDelegate is defined multiple times:
  react-native-daro-m/android/build/.transforms/.../RNCSafeAreaProviderManagerDelegate.dex,
  example/node_modules/react-native-safe-area-context/android/build/.transforms/.../RNCSafeAreaProviderManagerDelegate.dex
```

Root cause: `android/build.gradle` applied the `com.facebook.react` plugin under New Architecture _without_ a scoping `react { }` block. The plugin's default codegen scan walks the entire consuming workspace's `node_modules` for packages declaring `codegenConfig` and emits the corresponding `*ManagerDelegate` classes into the library AAR — landing them in this fork's AAR even though the fork itself has no codegen surface (no `codegenConfig` in `package.json`, no `*NativeComponent` / `*Spec` files in `src/`, no TurboModule classes in `android/`).

The same class then gets emitted into the _real_ owning library's AAR (`react-native-safe-area-context`), and Android's D8 dex merger refuses two definitions of the same type.

**Fix (added as a row to `docs/fork-differences.md → Native Bug Fixes (Android)`)**:

```gradle
react {
  jsRootDir = file("../src/")
  libraryName = "DaroM"
  codegenJavaPackageName = "com.darom"
}
```

Scoping `jsRootDir` to this library's own `src/` makes codegen's scan find nothing — which is correct, since there is no codegen surface — and the AAR no longer carries foreign `*ManagerDelegate` classes.

**Verification**: rebuilt with `./gradlew clean && ./gradlew :app:mergeLibDexDebug` (in `example/android/`). Task succeeded. The library's bundleLibRuntime dex output now contains only `com/darom/*` classes; no `com/facebook/react/viewmanagers/*` entries.

This bug also exists in upstream (same `apply plugin: "com.facebook.react"` without scoping). Any consumer enabling New Arch with a codegen-using sibling library (safe-area-context, screens, masked-view, etc.) would hit it. Worth reporting upstream once a stable channel exists.

## Promise<void> patch validated by dogfooding

A later run of the example (after the bundle-ID fix landed and banner loads succeeded) reproduced the original motivation for fork patch #1 live:

```log
[🎆] Interstitial: showAd rejected: Error: Interstitial ad not loaded
[🎆] Interstitial: loaded {"latencyMillis": 2714.97, ...}
```

What happened: the smoke screen's button handler called `loadAd()` then immediately `await showAd()`. Loading is event-driven (`onAdLoaded` fires ~2.7s later), so `showAd` ran before the SDK had any ad to display. The SDK rejected the show request with `"Interstitial ad not loaded"`.

The point is _who saw the rejection_. The fork's `Promise<void>` patch made it visible to the JS `.catch()` block and into the in-app log. Upstream's `void` return would have:

- Made `await` a no-op.
- Discarded the rejection silently inside the native module.
- Left the user staring at a button that did nothing.

This is the **exact bug class** the host app was bleeding rewards through. Example app refactored to the correct event-driven 2-step pattern (preload on SDK ready → track per-format ready state → button checks ready flag → reload after hidden). Documented in `example/README.md → Recommended host-app pattern` for direct copy by the host app.

## SKAdNetwork / AdNetworkIdentifiers — production checklist

The full run logs include repeated:

```log
[HyBidAAKNetworkRequestModel] The key `AdNetworkIdentifiers` could not be found
  in `info.plist` file of the app. Please add the required item and try again.
```

This warning comes from HyBid, one of the mediation adapters bundled into AppLovin MAX (originally PubNative/Verve). There are two distinct Info.plist keys at play:

| Key                    | Defined by       | Who reads it                        |
| ---------------------- | ---------------- | ----------------------------------- |
| `SKAdNetworkItems`     | Apple standard   | iOS system + all mainstream ad SDKs |
| `AdNetworkIdentifiers` | HyBid convention | Only HyBid                          |

Same SKAdNetwork ID list, two different keys. For production, the host app should:

1. Add the full `SKAdNetworkItems` array (Apple standard) to `Info.plist`. AppLovin maintains the canonical list across all adapters: <https://monetization-support.applovin.com/hc/en-us/articles/4404486141581>.
2. Optionally mirror the same list under `AdNetworkIdentifiers` if HyBid traffic is a material share of revenue. The warning is otherwise non-blocking — Interstitial impressions in this session were recorded normally without either key.

The warning fires on every load request and is harmless in development. Do not silence it via Xcode log filters — it will be a useful breadcrumb when SKAdNetwork attribution is finally wired up.

## End-to-end success milestone (11:08–11:10)

The 11:08 run produced the first fully clean fullscreen flow:

```log
11:08:02  ✅ Banner: loaded               (pre-load on SDK ready)
11:08:03  ✅ Interstitial: loaded         (pre-load — refactored pattern)
11:08:05  ✅ Rewarded: loaded             (pre-load)
... user taps Interstitial ...
11:09:19  ✅ Interstitial: showAd() resolved   (Promise<void> resolves on success too)
11:09:19  ✅ Interstitial Ad impression / displayed
... 57-second ad view ...
11:10:16  ✅ Interstitial: hidden — reloading  (onAdHidden auto-reloads next ad)
11:10:16  ✅ Interstitial: loaded               (re-load: 1.8s — likely cached bid)
```

This is the canonical happy path for a fork patch + ADR-005 + App.tsx refactor combined:

- **ADR-005 Decision 1**: legacy bridge runs on TurboModule interop, no rewrite needed.
- **Fork patch #1 (Promise<void>)**: both success (`resolved`) and failure (`rejected: Interstitial ad not loaded`) paths are now observable from JS.
- **Refactored event-driven pattern**: pre-load on SDK ready → button checks ready flag → onAdHidden triggers next loadAd. Worked unattended.
- **Re-load latency 1.8s**: AppLovin caches the next bid eagerly, so consecutive shows are fast.

This is the behavior the host app should expect after migration.

## Rewarded callback flow — the bug class that motivated this fork

The 11:15–11:16 run is the one that matters most. Rewarded ads with server-side reward verification are the exact failure mode that pushed the host app to fork in the first place.

```log
11:15:13.941  rewarded Ad show ... customData : smoke-test-payload   ← param passed through
11:15:13.941  Rewarded: showAd() resolved                            ← Promise<void> resolves
11:15:14.499  rewarded Ad impression
11:15:14.509  rewarded Ad onShown
11:15:17.513  rewarded Ad ad Clicked
11:16:20.651  rewarded Ad rewarded user with 0                       ← reward fires natively
11:16:20.651  Rewarded: reward {"adUnitId":"e15...","rewardAmount":0,"rewardLabel":""}
11:16:21.177  rewarded Ad onDismiss
11:16:21.177  Rewarded: hidden — reloading
11:16:21.216  ✅ rewarded 광고 로드 성공                              (auto-reload: 39ms)
```

Concretely validated:

| Concern                                                                                                                                                  | Evidence                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `customData` survives the JS→native→AppLovin→ad-network→callback round-trip under New Arch interop                                                       | `customData: smoke-test-payload` reaches the DaroM debug log unchanged                                                     |
| `addAdReceivedRewardEventListener` receives the full reward payload                                                                                      | `{adUnitId, rewardAmount, rewardLabel}` arrives in JS within milliseconds of the native `rewarded user with 0` line        |
| ADR-001 single-subscriber `EventEmitter` does not lose the reward listener despite intervening lifecycle events (show → click → click → reward → hidden) | All 6 events in the sequence reached JS in order                                                                           |
| Refactored `onAdHidden` → next `loadAd()` keeps inventory warm                                                                                           | 39ms wall clock from `hidden` to next `loaded` (the bid was cached)                                                        |
| `rewardAmount: 0`                                                                                                                                        | DaroM dashboard test unit has no reward configured. Production units return real values — this is not a fork/bridge defect |

This is the code path the host app's reward-attribution bugs lived on. Under upstream's `void`-returning `showAd()` and the SDK's silent listener overwrites, a remount between `show()` and `reward` event would have:

- swallowed the `showAd` rejection silently if anything went wrong
- silently overwritten the reward listener with a new mount's listener, sending the reward to a stale closure (or nowhere)

Both failure modes are now blocked by fork patches #1 (Promise<void>) and #2 (DEV-time single-listener warning). The host app should expect reward attribution to work after migration.

### Open observation: `No incoming parser found for method: handleCallback`

The rewarded flow surfaced this once, logged as FATAL by a mediation adapter's `ErrorLogger`:

```log
📋 LOG ENTRY
System: ErrorLogger
Level: 🛑 FATAL
Description: No incoming parser found for method: handleCallback
```

Despite the `FATAL` label, the rewarded ad continued through impression → click → reward → dismiss without missing any callback. The `FATAL` is the adapter's own severity tag, not an actual process-fatal event. Likely cause: a mediation adapter (Unity Ads / Vungle / IronSource — order of likelihood) tried to dispatch through a callback parser the host has not registered. Common when `LSApplicationQueriesSchemes` or similar URL-scheme allowlists are missing from `Info.plist`.

Action: not blocking; recorded so that if Sentry/Crashlytics surfaces this in production volume after the host app migrates, the symptom is already mapped to a known cause.

## Flavor migration impact

The host app (`host-rn-app`) plans `development` / `staging` / `production` flavors with distinct bundle IDs and distinct DaroM dashboard apps. Each flavor needs its **own** identity 3-tuple. See [example/README.md → Build flavors](../../example/README.md) for the two viable patterns (multi-target vs per-configuration Run Script). The Run Script approach is the lower-friction choice for a single Xcode target.
