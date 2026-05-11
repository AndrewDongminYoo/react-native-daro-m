import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    default: 'YOUR_LIGHT_POPUP_UNIT',
  }),
};

type LogLine = { ts: number; tag: string; msg: string };

export default function App() {
  const [log, setLog] = useState<LogLine[]>([]);
  const [ready, setReady] = useState(false);

  const append = useCallback((tag: string, msg: string) => {
    setLog((prev) => [{ ts: Date.now(), tag, msg }, ...prev].slice(0, 50));
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

    InterstitialAd.addAdLoadedEventListener((info) =>
      append('Interstitial', `loaded ${JSON.stringify(info)}`)
    );
    InterstitialAd.addAdLoadFailedEventListener((info) =>
      append('Interstitial', `load failed ${JSON.stringify(info)}`)
    );
    InterstitialAd.addAdHiddenEventListener(() =>
      append('Interstitial', 'hidden')
    );

    RewardedAd.addAdLoadedEventListener((info) =>
      append('Rewarded', `loaded ${JSON.stringify(info)}`)
    );
    RewardedAd.addAdLoadFailedEventListener((info) =>
      append('Rewarded', `load failed ${JSON.stringify(info)}`)
    );
    RewardedAd.addAdReceivedRewardEventListener((info) =>
      append('Rewarded', `reward ${JSON.stringify(info)}`)
    );
    RewardedAd.addAdHiddenEventListener(() => append('Rewarded', 'hidden'));

    LightPopupAd.addAdLoadedEventListener((info) =>
      append('LightPopup', `loaded ${JSON.stringify(info)}`)
    );
    LightPopupAd.addAdLoadFailedEventListener((info) =>
      append('LightPopup', `load failed ${JSON.stringify(info)}`)
    );

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

  const showInterstitial = useCallback(async () => {
    try {
      InterstitialAd.loadAd(UNITS.interstitial!);
      // Demonstrates the fork's `Promise<void>` return type — the host app
      // can await display completion before navigating or running reward
      // verification. Upstream `void` would silently swallow rejections.
      await InterstitialAd.showAd(UNITS.interstitial!);
      append('Interstitial', 'showAd() resolved');
    } catch (err) {
      append('Interstitial', `showAd rejected: ${String(err)}`);
    }
  }, [append]);

  const showRewarded = useCallback(async () => {
    try {
      RewardedAd.loadAd(UNITS.rewarded!);
      await RewardedAd.showAd(UNITS.rewarded!, 'smoke-test-payload');
      append('Rewarded', 'showAd() resolved');
    } catch (err) {
      append('Rewarded', `showAd rejected: ${String(err)}`);
    }
  }, [append]);

  const showLightPopup = useCallback(async () => {
    try {
      LightPopupAd.loadAd(UNITS.lightPopup!);
      await LightPopupAd.showAd(UNITS.lightPopup!);
      append('LightPopup', 'showAd() resolved');
    } catch (err) {
      append('LightPopup', `showAd rejected: ${String(err)}`);
    }
  }, [append]);

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.h1}>@dongminyu/react-native-daro-m</Text>
      <Text style={styles.h2}>
        SDK status: {ready ? 'initialized' : 'initializing…'}
      </Text>

      <View style={styles.section}>
        <Text style={styles.h2}>Banner</Text>
        <AdBannerView
          adUnitId={UNITS.banner!}
          adFormat={AdFormat.BANNER}
          style={styles.banner}
          onAdLoaded={(info) => append('Banner', `loaded ${info.adUnitId}`)}
          onAdLoadFailed={(info) =>
            append('Banner', `load failed ${JSON.stringify(info)}`)
          }
        />
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
