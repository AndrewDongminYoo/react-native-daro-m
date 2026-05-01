import type { InterstitialAdType } from './InterstitialAd';

export type AppOpenAdType = Omit<InterstitialAdType, 'showAd'> & {
  showAd(
    adUnitId: string,
    placement?: string | null,
    customData?: string | null
  ): void;
};
