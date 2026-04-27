import {
  NativeModules,
  Platform
} from 'react-native';

export * from './AdBannerView';
export * from './types';
export { InterstitialAd } from './InterstitialAd';
export { RewardedAd } from './RewardedAd';
export { LightPopupAd } from './LightPopupAd';

export { NativeAdView } from './nativeAd/NativeAdView';
export { BodyView, CallToActionView, IconView, MediaView, TitleView } from './nativeAd/NativeAdViewComponents';

const LINKING_ERROR =
  `The package 'react-native-daro-m' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const DaroMModule = NativeModules.DaroMModule ? NativeModules.DaroMModule : new Proxy({}, {
  get() {
    throw new Error(LINKING_ERROR);
  },
});

export async function initialize() {
  await DaroMModule.initializeSdk();
};

export async function showMediationDebugger() {
  await DaroMModule.showMediationDebugger();
}

export async function setUserId(userId: String) {
  await DaroMModule.setUserId(userId);
}
