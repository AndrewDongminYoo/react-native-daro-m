# `@dev-teamremited/react-native-daro-m` example

A smoke-test workspace that exercises the fork's public API (Banner / Interstitial / Rewarded / LightPopup) on iOS and Android with **New Architecture enabled** (`newArchEnabled=true` on Android, `RCT_NEW_ARCH_ENABLED=1` in `ios/.xcode.env`).

This exists primarily to validate [ADR-005](../docs/adr/005-defer-turbomodule-migration.md) — that the legacy native bridge keeps working through the New Architecture interop layer without a TurboModule/Fabric rewrite.

## DaroM SDK license keys

The DaroM SDK refuses to initialize without per-platform license files issued by [dashboard.daro.so](https://dashboard.daro.so):

| Platform | File                   | Required location                                   |
| -------- | ---------------------- | --------------------------------------------------- |
| iOS      | `ios-daro-key.txt`     | Must be in the app's **main bundle** at runtime     |
| Android  | `android-daro-key.txt` | Must be on the app's resource/asset path at runtime |

Both filenames are `.gitignore`d at the repo root — never commit them.

> The iOS side additionally needs a `DaroAppKey` string in `Info.plist` (and the Android equivalent is `com.google.android.gms.ads.APPLICATION_ID` meta-data in `AndroidManifest.xml` for the underlying AppLovin mediation). The dashboard issues both the app key (public identifier) and the license file (encrypted secret) — the SDK validates them together at startup.

### iOS: dragging the file in is not enough

`DaroAds`/`DaroService` resolves the key via roughly `Bundle.main.url(forResource: "ios-daro-key", withExtension: "txt")`. For that call to return non-nil, the file must end up inside `<YourApp>.app/ios-daro-key.txt` after build — which only happens if it is part of the **Copy Bundle Resources** build phase of the app target.

Common failure mode (and what we hit in this example workspace): the file is dragged into the Xcode navigator but the "Add to targets" checkbox in the dialog is unchecked or dismissed. The file then exists as a `PBXFileReference` only — no `PBXBuildFile`, no entry in `PBXResourcesBuildPhase` — so it never enters the bundle.

**Symptom**: SDK throws

```log
DaroM/DaroService.swift:151: Fatal error: ios-daro-key.txt file not found.
  Please ensure the file is included in your project.
```

**Diagnosis**:

```sh
# Verify the file made it into the built app bundle. Empty output = not bundled.
find example/ios/build -name 'ios-daro-key.txt'

# Or grep pbxproj for the *PBXBuildFile* / Resources phase entry (not just the
# bare PBXFileReference). Two hits means: reference only — not bundled.
grep -c ios-daro-key example/ios/ReactNativeDaroMExample.xcodeproj/project.pbxproj
```

**Fix**: in Xcode, select `ios-daro-key.txt` in the navigator, open the File Inspector (right pane), and tick the host target under **Target Membership**. Re-run `xcodebuild` / `yarn ios` and confirm the file appears in `<YourApp>.app/`.

### Build flavors

The host app at `../youngkeul-rn-app` uses `development` / `staging` / `production` flavors with separate bundle IDs and separate DaroM dashboard apps. Each flavor needs its own key file pair.

Two viable patterns:

1. **Multiple Xcode targets** — one target per flavor, each with its own `ios-daro-key.txt` in its `Copy Bundle Resources`. Simple, but you maintain N targets.
2. **Single target + per-configuration script** — keep flavor-suffixed files outside the bundle (`ios-daro-key.development.txt`, `.staging.txt`, `.production.txt`), and add a "Run Script" build phase that copies the right one based on `${CONFIGURATION}`. Less project bloat, but you must not also add `ios-daro-key.txt` itself to Copy Bundle Resources — the script writes the final file.

For pattern 2, the script and matching Build Phase ordering look like this:

```sh
# Run Script build phase — place AFTER "Copy Bundle Resources".
# Input File Lists / Output File Lists can be left empty; the script
# unconditionally overwrites the output every build so Xcode's
# incremental-build heuristics will not skip it.
set -euo pipefail

case "${CONFIGURATION}" in
  *Debug*|*Development*) FLAVOR=development ;;
  *Staging*)             FLAVOR=staging ;;
  *Release*|*Production*) FLAVOR=production ;;
  *) echo "error: no DaroM key mapping for configuration '${CONFIGURATION}'"; exit 1 ;;
esac

SRC="${SRCROOT}/keys/ios-daro-key.${FLAVOR}.txt"
DST="${BUILT_PRODUCTS_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/ios-daro-key.txt"

if [ ! -f "${SRC}" ]; then
  echo "error: ${SRC} is missing — download from dashboard.daro.so"
  exit 1
fi

cp "${SRC}" "${DST}"
echo "DaroM key: copied ${FLAVOR} → ${DST}"
```

Pair this with per-configuration `Info.plist` values for `DaroAppKey` (the public identifier issued alongside each license file). The simplest way is to declare a build setting `DARO_APP_KEY` per configuration in the xcconfig and reference it from Info.plist as `$(DARO_APP_KEY)`. The same idea applies to `GADApplicationIdentifier`.

The Android equivalent is simpler: place each `android-daro-key.txt` under `app/src/<flavor>/assets/` so Gradle merges the right one based on `productFlavors`. No additional script needed.

## Running

```sh
# From the repo root
yarn install
yarn example start            # Metro
yarn example ios              # iOS
yarn example android          # Android
```

The smoke screen prints every native event to an in-app log. Tap `Interstitial` / `Rewarded` / `LightPopup` to verify that `showAd()` returns a `Promise<void>` that resolves or rejects (the fork's primary patch — upstream returns `void` and swallows rejections).

Replace the placeholder ad unit IDs in `src/App.tsx` with values from your DaroM dashboard before testing on a real device.

## Recommended host-app pattern

The fullscreen ad APIs (`InterstitialAd`, `RewardedAd`, `LightPopupAd`) are an event-driven 2-step protocol:

```log
loadAd(unit)  ─► (network round-trip)  ─► onAdLoaded   = ready
                                       ╲► onAdLoadFailed = not ready
showAd(unit)  ─► (must be after onAdLoaded)
onAdHidden    ─► caller responsible for next loadAd()
```

Calling `showAd()` before `onAdLoaded` arrives produces a real `Promise<void>` rejection (`"Error: Interstitial ad not loaded"`) — observable only because of the fork's patch. Upstream's `void` would silently no-op and the user would see "I tapped the button but nothing happened."

The example in `src/App.tsx` implements the recommended pattern:

1. Track a per-format `*Ready` boolean in state.
2. On SDK `initialize()` resolve, pre-load every format you intend to show.
3. Flip the corresponding ready flag in `onAdLoaded` / clear it in `onAdLoadFailed` / `onAdHidden`.
4. Trigger the next `loadAd()` inside the `onAdHidden` handler — never on the show callsite.
5. Have the button handler check the ready flag and surface a "not ready" message if the user taps too early.

Do **not** layer additional retry logic on top of `loadAd()`. The DaroM/AppLovin SDK retries internally with exponential backoff (~1s, 2s, 3s, 5s, 8s — see [`docs/notes/2026-05-11-new-arch-validation.md`](../docs/notes/2026-05-11-new-arch-validation.md)). Adding another tier doubles the request rate and exhausts ad inventory.

## Pre-production checklist

Before shipping the host app with this fork:

### iOS

- [ ] Add the full `SKAdNetworkItems` array to `Info.plist`. AppLovin publishes the canonical list of advertiser SKAdNetwork IDs covering every mediation adapter bundled with DaroM: <https://monetization-support.applovin.com/hc/en-us/articles/4404486141581>. Without this, iOS attribution drops for SKAdNetwork-only inventory and revenue is lost.
- [ ] Optionally mirror the same list under `AdNetworkIdentifiers` if HyBid is a material share of revenue (only HyBid reads this key; non-HyBid traffic does not need it).
- [ ] Per-flavor `ios-daro-key.txt` provisioned and bundled — see [Build flavors](#build-flavors) above.
- [ ] `NSUserTrackingUsageDescription` string in `Info.plist` and ATT prompt wired up where appropriate (App Tracking Transparency) — otherwise IDFA is unavailable and bid prices drop.
- [ ] `GADApplicationIdentifier` (AdMob bidding) populated per flavor.

### Android

- [ ] Per-flavor `android-daro-key.txt` placed under `app/src/<flavor>/assets/` so Gradle merges the right one.
- [ ] `com.google.android.gms.ads.APPLICATION_ID` meta-data set in `AndroidManifest.xml` per flavor.

### Monitoring

- [ ] Watch for `[ErrorLogger] FATAL: No incoming parser found for method: handleCallback` in production crash/log dashboards. The 2026-05-11 validation run hit this once during a successful rewarded flow; it does not block ad delivery but may indicate a missing URL-scheme allowlist (`LSApplicationQueriesSchemes`) in `Info.plist`. Investigate only if it appears at non-trivial volume.

## Known limitations of this example

- **LightPopup ad unit ID is a placeholder.** The DaroM dashboard test account used while authoring this example did not have a LightPopup unit provisioned, so `src/App.tsx` uses `YOUR_*_LIGHT_POPUP_UNIT` strings. `LightPopup: load failed {"message":"No ad unit found"}` in the in-app log on first run is expected; replace with real values to validate.
- **Main Thread Checker warnings appear in Xcode console.** As of fork patch #4 (`initializeSdk` / `showMediationDebugger` main-dispatch — see [`README.md → Differences from upstream`](../README.md)), the warning is silenced for the SDK initialization path. If additional warnings appear during your runs, they indicate other DaroM SDK methods we have not yet wrapped; capture the stack trace and file an issue.

## Companion documents

- [`../README.md → Differences from upstream`](../README.md) — full fork patch list
- [`../docs/adr/005-defer-turbomodule-migration.md`](../docs/adr/005-defer-turbomodule-migration.md) — why we keep the legacy bridge under New Architecture
- [`../docs/notes/2026-05-11-new-arch-validation.md`](../docs/notes/2026-05-11-new-arch-validation.md) — field notes from the validation session that produced this example
