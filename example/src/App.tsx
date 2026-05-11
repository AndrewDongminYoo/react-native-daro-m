import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AdBannerView,
  AdFormat,
  initialize,
  InterstitialAd,
  LightPopupAd,
  RewardedAd,
} from '@dongminyu/react-native-daro-m';

// NOTE: AppOpenAd exists in src/ but is not re-exported from the package
// barrel (src/index.tsx) — neither in this fork nor in upstream. The host
// app does not depend on it, so the smoke test mirrors the actually-exposed
// surface instead of patching in another export.

// Test ad units are placeholders — replace with values issued by the DaroM
// dashboard before running on a real device. Smoke testing without valid IDs
// still exercises the bridge wiring (loads will fail, but JS<->native event
// round-trips and the Promise<void> return types remain observable).
const UNITS = {
  banner: Platform.select({
    ios: 'YOUR_IOS_BANNER_UNIT',
    android: 'YOUR_ANDROID_BANNER_UNIT',
    default: 'YOUR_BANNER_UNIT',
  }),
  interstitial: Platform.select({
    ios: 'YOUR_IOS_INTERSTITIAL_UNIT',
    android: 'YOUR_ANDROID_INTERSTITIAL_UNIT',
    default: 'YOUR_INTERSTITIAL_UNIT',
  }),
  rewarded: Platform.select({
    ios: 'YOUR_IOS_REWARDED_UNIT',
    android: 'YOUR_ANDROID_REWARDED_UNIT',
    default: 'YOUR_REWARDED_UNIT',
  }),
  lightPopup: Platform.select({
    ios: 'YOUR_IOS_LIGHT_POPUP_UNIT',
    android: 'YOUR_ANDROID_LIGHT_POPUP_UNIT',
    default: '',
  }),
};

type LogLine = { ts: number; tag: string; msg: string };

// Fullscreen ad lifecycle is event-driven and asymmetric:
//   loadAd()  → eventually fires onAdLoaded (or onAdLoadFailed)
//   showAd()  → must be called only after onAdLoaded
//   onAdHidden→ caller is responsible for triggering the *next* loadAd()
// Calling showAd() before onAdLoaded surfaces as a `Promise<void>` rejection
// "Error: Interstitial ad not loaded" — which is exactly the kind of silent
// failure the fork's Promise<void> patch is designed to make observable.
// The host app should use the pattern below rather than naively chaining
// load-then-show inside a single button handler.

export default function App() {
  const [log, setLog] = useState<LogLine[]>([]);
  const [ready, setReady] = useState(false);
  const [interstitialReady, setInterstitialReady] = useState(false);
  const [rewardedReady, setRewardedReady] = useState(false);
  const [lightPopupReady, setLightPopupReady] = useState(false);

  const append = useCallback((tag: string, msg: string) => {
    setLog((prev) => [{ ts: Date.now(), tag, msg }, ...prev].slice(0, 50));
    console.debug(`[🎆] ${tag}: ${msg}`);
  }, []);

  useEffect(() => {
    let cancelled = false;
    initialize()
      .then(() => {
        if (cancelled) return;
        setReady(true);
        append('SDK', 'initialize() resolved');
      })
      .catch((err) => append('SDK', `initialize failed: ${String(err)}`));

    InterstitialAd.addAdLoadedEventListener((info) => {
      setInterstitialReady(true);
      append('Interstitial', `loaded ${JSON.stringify(info)}`);
    });
    InterstitialAd.addAdLoadFailedEventListener((info) => {
      setInterstitialReady(false);
      append('Interstitial', `load failed ${JSON.stringify(info)}`);
    });
    InterstitialAd.addAdHiddenEventListener(() => {
      setInterstitialReady(false);
      // Pre-load the next one so the user does not wait when they tap again.
      InterstitialAd.loadAd(UNITS.interstitial!);
      append('Interstitial', 'hidden — reloading');
    });

    RewardedAd.addAdLoadedEventListener((info) => {
      setRewardedReady(true);
      append('Rewarded', `loaded ${JSON.stringify(info)}`);
    });
    RewardedAd.addAdLoadFailedEventListener((info) => {
      setRewardedReady(false);
      append('Rewarded', `load failed ${JSON.stringify(info)}`);
    });
    RewardedAd.addAdReceivedRewardEventListener((info) =>
      append('Rewarded', `reward ${JSON.stringify(info)}`)
    );
    RewardedAd.addAdHiddenEventListener(() => {
      setRewardedReady(false);
      RewardedAd.loadAd(UNITS.rewarded!);
      append('Rewarded', 'hidden — reloading');
    });

    LightPopupAd.addAdLoadedEventListener((info) => {
      setLightPopupReady(true);
      append('LightPopup', `loaded ${JSON.stringify(info)}`);
    });
    LightPopupAd.addAdLoadFailedEventListener((info) => {
      setLightPopupReady(false);
      append('LightPopup', `load failed ${JSON.stringify(info)}`);
    });

    return () => {
      cancelled = true;
      InterstitialAd.removeAdLoadedEventListener();
      InterstitialAd.removeAdLoadFailedEventListener();
      InterstitialAd.removeAdHiddenEventListener();
      RewardedAd.removeAdLoadedEventListener();
      RewardedAd.removeAdLoadFailedEventListener();
      RewardedAd.removeAdReceivedRewardEventListener();
      RewardedAd.removeAdHiddenEventListener();
      LightPopupAd.removeAdLoadedEventListener();
      LightPopupAd.removeAdLoadFailedEventListener();
    };
  }, [append]);

  // Pre-load every fullscreen format the moment the SDK reports ready. The
  // SDK retries internally on transient failures — do not layer another
  // retry tier on top.
  useEffect(() => {
    if (!ready) return;
    InterstitialAd.loadAd(UNITS.interstitial!);
    RewardedAd.loadAd(UNITS.rewarded!);
    LightPopupAd.loadAd(UNITS.lightPopup!);
    append('SDK', 'pre-loading interstitial / rewarded / lightPopup');
  }, [ready, append]);

  const showInterstitial = useCallback(async () => {
    if (!interstitialReady) {
      append('Interstitial', 'not ready — wait for onAdLoaded then retap');
      return;
    }
    try {
      // Demonstrates the fork's `Promise<void>` return type — the host app
      // can await display completion before navigating or running reward
      // verification. Upstream `void` would silently swallow rejections.
      await InterstitialAd.showAd(UNITS.interstitial!);
      append('Interstitial', 'showAd() resolved');
    } catch (err) {
      append('Interstitial', `showAd rejected: ${String(err)}`);
    }
  }, [append, interstitialReady]);

  const showRewarded = useCallback(async () => {
    if (!rewardedReady) {
      append('Rewarded', 'not ready — wait for onAdLoaded then retap');
      return;
    }
    try {
      await RewardedAd.showAd(UNITS.rewarded!, 'smoke-test-payload');
      append('Rewarded', 'showAd() resolved');
    } catch (err) {
      append('Rewarded', `showAd rejected: ${String(err)}`);
    }
  }, [append, rewardedReady]);

  const showLightPopup = useCallback(async () => {
    if (!lightPopupReady) {
      append('LightPopup', 'not ready — wait for onAdLoaded then retap');
      return;
    }
    try {
      await LightPopupAd.showAd(UNITS.lightPopup!);
      append('LightPopup', 'showAd() resolved');
    } catch (err) {
      append('LightPopup', `showAd rejected: ${String(err)}`);
    }
  }, [append, lightPopupReady]);

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.h1}>@dongminyu/react-native-daro-m</Text>
      <Text style={styles.h2}>
        SDK status: {ready ? 'initialized' : 'initializing…'}
      </Text>

      <View style={styles.section}>
        <Text style={styles.h2}>Banner</Text>
        {/*
          Gate the native ad view on `ready` so we never mount AdBannerView
          before initialize() resolves. The fork's defensive isInitialized()
          check inside AdBannerView falls back to an empty <View>, but that
          path also emits the "AdBannerView is mounted before the
          initialization of the DaroM React Native module" warning — which
          masks real issues when scanning the runtime log.
        */}
        {ready ? (
          <AdBannerView
            adUnitId={UNITS.banner!}
            adFormat={AdFormat.BANNER}
            style={styles.banner}
            onAdLoaded={(info) => append('Banner', `loaded ${info.adUnitId}`)}
            onAdLoadFailed={(info) =>
              append('Banner', `load failed ${JSON.stringify(info)}`)
            }
          />
        ) : (
          <View style={styles.banner} />
        )}
      </View>

      <View style={styles.row}>
        <Button title="Interstitial" onPress={showInterstitial} />
        <Button title="Rewarded" onPress={showRewarded} />
        <Button title="LightPopup" onPress={showLightPopup} />
      </View>

      <Text style={styles.h2}>Event log</Text>
      <ScrollView style={styles.log}>
        {log.map((line) => (
          <Text key={line.ts} style={styles.logLine}>
            [{line.tag}] {line.msg}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16 },
  h1: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  h2: { fontSize: 14, fontWeight: '500', marginTop: 12, marginBottom: 4 },
  section: { marginVertical: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 4,
  },
  banner: { alignSelf: 'stretch', height: 60 },
  log: {
    flex: 1,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#111',
  },
  logLine: { color: '#0f0', fontFamily: 'Menlo', fontSize: 11 },
});
