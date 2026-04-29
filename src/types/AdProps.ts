import type { AdLoadFailedInfo } from './AdInfo';

import type { AdInfo } from './AdInfo';

export type AdProps = {
  adUnitId: string;

  placement?: string | null;

  onAdLoaded?: (adInfo: AdInfo) => void;

  onAdLoadFailed?: (error: AdLoadFailedInfo) => void;

  onAdClicked?: (adInfo: AdInfo) => void;

  onAdImpressionRecorded?: (adInfo: AdInfo) => void;
};
