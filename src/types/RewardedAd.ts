import type { AdEventListener } from './AdEvent';
import type { AdRewardInfo } from './AdInfo';
import type { FullScreenAdType } from './FullScreenAd';

export type RewardedAdType = FullScreenAdType & {

	showAd(adUnitId: string, customData?: string | null): void;

	// Adds the specified event listener to receive {@link AdRewardInfo} when {@link RewardedAd}
	// rewards the user.
	addAdReceivedRewardEventListener(listener: AdEventListener<AdRewardInfo>): void;

	// Removes the event listener to receive {@link AdRewardInfo} when {@link RewardedAd} rewards the user.
	removeAdReceivedRewardEventListener(): void;
};
