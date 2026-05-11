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

## Main Thread Checker — still present after init

The `UIApplication.applicationState` background-thread access (documented in ADR-005 §2) fires both _before_ and _after_ SDK initialization, so it is not gated by license/app-key state. It is a closed-source SDK bug; our bridge does not invoke `applicationState` anywhere.

Open question (carried forward to a future ADR if pursued): override `methodQueue` on `DaroMModule` to force main-thread dispatch.

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

Not blocking in development, but the host app must add the full `SKAdNetworkItems` array (published by AppLovin) to `Info.plist` before App Store submission — otherwise iOS attribution drops and revenue from those networks is lost. AppLovin's list is the canonical source: <https://monetization-support.applovin.com/hc/en-us/articles/4404486141581>.

## Flavor migration impact

The host app (`youngkeul-rn-app`) plans `development` / `staging` / `production` flavors with distinct bundle IDs and distinct DaroM dashboard apps. Each flavor needs its **own** identity 3-tuple. See [example/README.md → Build flavors](../../example/README.md) for the two viable patterns (multi-target vs per-configuration Run Script). The Run Script approach is the lower-friction choice for a single Xcode target.
