import type { AdDisplayFailedInfo, AdInfo, AdLoadFailedInfo } from "./AdInfo";

export type FullScreenAdType = {
	isAdReady: (adUnitId: string) => Promise<boolean>;
	loadAd: (adUnitId: string) => void;
	showAd: (adUnitId: string) => void;

	addAdLoadedEventListener: (listener: (adInfo: AdInfo) => void) => void;
	removeAdLoadedEventListener: (listener: (adInfo: AdInfo) => void) => void;

	addAdLoadFailedEventListener: (listener: (errorInfo: AdLoadFailedInfo) => void) => void;
	removeAdLoadFailedEventListener: (listener: (errorInfo: AdLoadFailedInfo) => void) => void;

	addAdClickedEventListener: (listener: (adInfo: AdInfo) => void) => void;
	removeAdClickedEventListener: (listener: (adInfo: AdInfo) => void) => void;

	addAdDisplayedEventListener: (listener: (adInfo: AdInfo) => void) => void;
	removeAdDisplayedEventListener: (listener: (adInfo: AdInfo) => void) => void;

	addAdFailedToDisplayEventListener: (listener: (errorInfo: AdDisplayFailedInfo) => void) => void;
	removeAdFailedToDisplayEventListener: (listener: (errorInfo: AdDisplayFailedInfo) => void) => void;

	addAdHiddenEventListener: (listener: (adInfo: AdInfo) => void) => void;
	removeAdHiddenEventListener: (listener: (adInfo: AdInfo) => void) => void;

	addAdImpressionRecordedListener: (listener: (adInfo: AdInfo) => void) => void;
	removeAdImpressionRecordedListener: (listener: (adInfo: AdInfo) => void) => void;
};