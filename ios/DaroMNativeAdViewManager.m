#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE (DaroMNativeAdViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(adUnitId, NSString)

RCT_EXPORT_VIEW_PROPERTY(titleView, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(bodyView, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(callToActionView, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(iconView, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(optionsView, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(mediaView, NSNumber)

RCT_EXPORT_VIEW_PROPERTY(titleViewStyleProps, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(bodyViewStyleProps, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(callToActionViewStyleProps, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(iconViewStyleProps, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(mediaViewStyleProps, NSDictionary)

RCT_EXPORT_VIEW_PROPERTY(onAdLoadedEvent, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onAdLoadFailedEvent, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onAdClickedEvent, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onAdImpressionRecordedEvent, RCTDirectEventBlock)

RCT_EXTERN_METHOD(loadAd : (nonnull NSNumber *)viewTag)
@end
