import type { AdDisplayFailedInfo, AdInfo, AdLoadFailedInfo } from './AdInfo';

export type FullScreenAdType = {
  isAdReady: (adUnitId: string) => Promise<boolean>;
  loadAd: (adUnitId: string) => void;
  showAd: (adUnitId: string) => Promise<void>;

  addAdLoadedEventListener: (listener: (adInfo: AdInfo) => void) => void;
  removeAdLoadedEventListener: () => void;

  addAdLoadFailedEventListener: (
    listener: (errorInfo: AdLoadFailedInfo) => void
  ) => void;
  removeAdLoadFailedEventListener: () => void;

  addAdClickedEventListener: (listener: (adInfo: AdInfo) => void) => void;
  removeAdClickedEventListener: () => void;

  addAdDisplayedEventListener: (listener: (adInfo: AdInfo) => void) => void;
  removeAdDisplayedEventListener: () => void;

  addAdFailedToDisplayEventListener: (
    listener: (errorInfo: AdDisplayFailedInfo) => void
  ) => void;
  removeAdFailedToDisplayEventListener: () => void;

  addAdHiddenEventListener: (listener: (adInfo: AdInfo) => void) => void;
  removeAdHiddenEventListener: () => void;

  addAdImpressionRecordedListener: (listener: (adInfo: AdInfo) => void) => void;
  removeAdImpressionRecordedListener: () => void;
};
