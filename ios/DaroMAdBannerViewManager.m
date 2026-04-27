#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(DaroMAdBannerViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(adUnitId, NSString)
RCT_EXPORT_VIEW_PROPERTY(adFormat, NSString)

RCT_EXPORT_VIEW_PROPERTY(onAdLoadedEvent, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onAdLoadFailedEvent, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onAdClickedEvent, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onAdImpressionRecordedEvent, RCTDirectEventBlock)

RCT_EXTERN_METHOD(loadAd)

@end
