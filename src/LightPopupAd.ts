import { NativeModules } from 'react-native';
import { addEventListener, removeEventListener } from './EventEmitter';
import type {
  AdDisplayFailedInfo,
  AdInfo,
  AdLoadFailedInfo,
} from './types/AdInfo';
import type {
  LightPopupAdConfiguration,
  LightPopupAdType,
} from './types/LightPopupAd';
import tinycolor from 'tinycolor2';

const { DaroMModule } = NativeModules;

const {
  ON_LIGHTPOPUP_LOADED_EVENT,
  ON_LIGHTPOPUP_LOAD_FAILED_EVENT,
  ON_LIGHTPOPUP_CLICKED_EVENT,
  ON_LIGHTPOPUP_DISPLAYED_EVENT,
  ON_LIGHTPOPUP_AD_FAILED_TO_DISPLAY_EVENT,
  ON_LIGHTPOPUP_HIDDEN_EVENT,
  ON_LIGHTPOPUP_AD_IMPRESSION_RECORDED,
} = DaroMModule.getConstants();

const isAdReady = (adUnitId: string): Promise<boolean> => {
  return DaroMModule.isLightPopupReady(adUnitId);
};

const loadAd = (adUnitId: string): void => {
  DaroMModule.loadLightPopup(adUnitId);
};

const showAd = (adUnitId: string): void => {
  DaroMModule.showLightPopup(adUnitId);
};

function colorToHex(color: any): string | undefined {
  if (typeof color === 'number') {
    // react-native에서 number로 오는 경우 (ex: processColor)
    // #AARRGGBB로 변환
    return `#${color.toString(16).padStart(8, '0')}`.toUpperCase();
  }
  if (typeof color === 'string') {
    const tc = tinycolor(color);
    if (tc.isValid()) {
      // alpha가 1이면 #RRGGBB, 아니면 #AARRGGBB
      const hex = tc.toHexString().toUpperCase();
      const alpha = Math.round(tc.getAlpha() * 255);
      if (alpha === 255) {
        return hex;
      } else {
        // #AARRGGBB
        return (
          '#' +
          alpha.toString(16).padStart(2, '0').toUpperCase() +
          tc.toHex().toUpperCase()
        );
      }
    }
  }
  return undefined;
}

const setLightPopupAdConfiguration = (
  adUnitId: string,
  configuration: LightPopupAdConfiguration
): void => {
  const config = { ...configuration };

  // color 관련 필드만 hex string으로 변환
  if (config.backgroundColor)
    config.backgroundColor = colorToHex(config.backgroundColor);
  if (config.cardViewBackgroundColor)
    config.cardViewBackgroundColor = colorToHex(config.cardViewBackgroundColor);
  if (config.adMarkLabelTextColor)
    config.adMarkLabelTextColor = colorToHex(config.adMarkLabelTextColor);
  if (config.adMarkLabelBackgroundColor)
    config.adMarkLabelBackgroundColor = colorToHex(
      config.adMarkLabelBackgroundColor
    );
  if (config.closeButtonText) config.closeButtonText = config.closeButtonText;
  if (config.closeButtonTextColor)
    config.closeButtonTextColor = colorToHex(config.closeButtonTextColor);
  if (config.titleTextColor)
    config.titleTextColor = colorToHex(config.titleTextColor);
  if (config.bodyTextColor)
    config.bodyTextColor = colorToHex(config.bodyTextColor);
  if (config.ctaButtonTextColor)
    config.ctaButtonTextColor = colorToHex(config.ctaButtonTextColor);
  if (config.ctaButtonBackgroundColor)
    config.ctaButtonBackgroundColor = colorToHex(
      config.ctaButtonBackgroundColor
    );

  DaroMModule.setLightPopupAdConfiguration(adUnitId, config);
};

const addAdLoadedEventListener = (listener: (adInfo: AdInfo) => void): void => {
  addEventListener(ON_LIGHTPOPUP_LOADED_EVENT, listener);
};

const removeAdLoadedEventListener = (): void => {
  removeEventListener(ON_LIGHTPOPUP_LOADED_EVENT);
};

const addAdLoadFailedEventListener = (
  listener: (errorInfo: AdLoadFailedInfo) => void
): void => {
  addEventListener(ON_LIGHTPOPUP_LOAD_FAILED_EVENT, listener);
};

const removeAdLoadFailedEventListener = (): void => {
  removeEventListener(ON_LIGHTPOPUP_LOAD_FAILED_EVENT);
};

const addAdClickedEventListener = (
  listener: (adInfo: AdInfo) => void
): void => {
  addEventListener(ON_LIGHTPOPUP_CLICKED_EVENT, listener);
};

const removeAdClickedEventListener = (): void => {
  removeEventListener(ON_LIGHTPOPUP_CLICKED_EVENT);
};

const addAdDisplayedEventListener = (
  listener: (adInfo: AdInfo) => void
): void => {
  addEventListener(ON_LIGHTPOPUP_DISPLAYED_EVENT, listener);
};

const removeAdDisplayedEventListener = (): void => {
  removeEventListener(ON_LIGHTPOPUP_DISPLAYED_EVENT);
};

const addAdFailedToDisplayEventListener = (
  listener: (errorInfo: AdDisplayFailedInfo) => void
): void => {
  addEventListener(ON_LIGHTPOPUP_AD_FAILED_TO_DISPLAY_EVENT, listener);
};

const removeAdFailedToDisplayEventListener = (): void => {
  removeEventListener(ON_LIGHTPOPUP_AD_FAILED_TO_DISPLAY_EVENT);
};

const addAdHiddenEventListener = (listener: (adInfo: AdInfo) => void): void => {
  addEventListener(ON_LIGHTPOPUP_HIDDEN_EVENT, listener);
};

const removeAdHiddenEventListener = (): void => {
  removeEventListener(ON_LIGHTPOPUP_HIDDEN_EVENT);
};

const addAdImpressionRecordedListener = (
  listener: (adInfo: AdInfo) => void
): void => {
  addEventListener(ON_LIGHTPOPUP_AD_IMPRESSION_RECORDED, listener);
};

const removeAdImpressionRecordedListener = (): void => {
  removeEventListener(ON_LIGHTPOPUP_AD_IMPRESSION_RECORDED);
};

export const LightPopupAd: LightPopupAdType = {
  isAdReady,
  loadAd,
  showAd,

  addAdLoadedEventListener,
  removeAdLoadedEventListener,

  addAdLoadFailedEventListener,
  removeAdLoadFailedEventListener,

  addAdClickedEventListener,
  removeAdClickedEventListener,

  addAdDisplayedEventListener,
  removeAdDisplayedEventListener,

  addAdFailedToDisplayEventListener,
  removeAdFailedToDisplayEventListener,

  addAdHiddenEventListener,
  removeAdHiddenEventListener,

  addAdImpressionRecordedListener,
  removeAdImpressionRecordedListener,

  setLightPopupAdConfiguration,
};

export default LightPopupAd;
