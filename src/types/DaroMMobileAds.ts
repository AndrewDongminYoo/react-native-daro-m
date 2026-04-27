
export type DaroMMobileAds = {

	isInitialized: () => Promise<boolean>;
	initialize: (sdkKey: string) => Promise<void>;
	setUserId: (userId: String) => Promise<void>;
	
};
