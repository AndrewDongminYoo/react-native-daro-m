#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE (DaroMModule, RCTEventEmitter)

#pragma mark - Initialization

RCT_EXTERN_METHOD(isInitialized : (RCTPromiseResolveBlock)resolve : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(initializeSdk : (RCTPromiseResolveBlock)resolve : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(setUserId : (NSString *)userId : (RCTPromiseResolveBlock)resolve : (RCTPromiseRejectBlock)reject)

#pragma mark - Mediation Debugger

RCT_EXTERN_METHOD(showMediationDebugger : (RCTPromiseResolveBlock)resolve : (RCTPromiseRejectBlock)reject)

#pragma mark - Interstitial

RCT_EXTERN_METHOD(isInterstitialReady : (NSString *)adUnitId : (RCTPromiseResolveBlock)resolve : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(loadInterstitial : (NSString *)adUnitId : (RCTPromiseResolveBlock)resolve : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(showInterstitial : (NSString *)adUnitIdentifier : (RCTPromiseResolveBlock)resolve : (RCTPromiseRejectBlock)reject)

#pragma mark - Rewarded

RCT_EXTERN_METHOD(isRewardedAdReady : (NSString *)adUnitId : (RCTPromiseResolveBlock)resolve : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(loadRewardedAd : (NSString *)adUnitId : (RCTPromiseResolveBlock)resolve : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(showRewardedAd : (NSString *)adUnitIdentifier : (nullable NSString *)customData : (RCTPromiseResolveBlock)resolve : (RCTPromiseRejectBlock)reject)

#pragma mark - AppOpen Ad

RCT_EXTERN_METHOD(isAppOpenAdReady : (NSString *)adUnitId : (RCTPromiseResolveBlock)resolve : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(loadAppOpenAd : (NSString *)adUnitId : (RCTPromiseResolveBlock)resolve : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(showAppOpenAd : (NSString *)adUnitIdentifier : (nullable NSString *)customData : (RCTPromiseResolveBlock)resolve : (RCTPromiseRejectBlock)reject)

#pragma mark - Light Popup

RCT_EXTERN_METHOD(isLightPopupReady : (NSString *)adUnitId : (RCTPromiseResolveBlock)resolve : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(loadLightPopup : (NSString *)adUnitId : (RCTPromiseResolveBlock)resolve : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(showLightPopup : (NSString *)adUnitId : (RCTPromiseResolveBlock)resolve : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(setLightPopupAdConfiguration : (NSString *)adUnitId : (NSDictionary *)configuration : (RCTPromiseResolveBlock)resolve : (RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

@end
