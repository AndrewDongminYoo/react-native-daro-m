export type DaroMMobileAds = {
  isInitialized: () => Promise<boolean>;
  initialize: (sdkKey: string) => Promise<void>;
  setUserId: (userId: string) => Promise<void>;
};
