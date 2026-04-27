import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { findNodeHandle, NativeModules, requireNativeComponent, UIManager, View, type DimensionValue, type NativeMethods, type ViewProps } from 'react-native';
import type { AdBannerViewHandler, AdBannerViewProps } from './types/AdBannerViewProps';
import type { AdNativeEvent } from './types/AdEvent';
import type { AdInfo, AdLoadFailedInfo } from './types/AdInfo';

const { DaroMModule } = NativeModules;

const {
  BANNER_AD_FORMAT_LABEL,
  MREC_AD_FORMAT_LABEL,
} = DaroMModule.getConstants();

export enum AdFormat {
  BANNER = BANNER_AD_FORMAT_LABEL,
  MREC = MREC_AD_FORMAT_LABEL,
}

type AdViewNativeEvents = {
  onAdLoadedEvent(event: AdNativeEvent<AdInfo>): void;
  onAdLoadFailedEvent(event: AdNativeEvent<AdLoadFailedInfo>): void;
  onAdClickedEvent(event: AdNativeEvent<AdInfo>): void;
  onAdImpressionRecordedEvent(event: AdNativeEvent<AdInfo>): void;
};

const ComponentName = 'DaroMAdBannerView';
const AdViewComponent = requireNativeComponent<AdBannerViewProps & ViewProps & AdViewNativeEvents>(ComponentName);
type AdViewType = React.Component<AdBannerViewProps> & NativeMethods;

type SizeKey = 'width' | 'height';
type SizeRecord = Partial<Record<SizeKey, DimensionValue>>;

const ADVIEW_SIZE = {
  banner: { width: 320, height: 50 },
  mrec: { width: 300, height: 250 },
};

export const AdBannerView = forwardRef<AdBannerViewHandler, AdBannerViewProps & ViewProps>(function AdBannerView(
  {
    adUnitId,
    adFormat,
    placement,
    loadOnMount = true,
    isVisible = true,
    onAdLoaded,
    onAdLoadFailed,
    onAdClicked,
    onAdImpressionRecorded,
    style,
    ...otherProps
  },
  ref
) {

  const adFormatSize = useRef<SizeRecord>({});
  const adViewRef = useRef<AdViewType | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const loadAd = useCallback(() => {
    if (adViewRef.current) {
      UIManager.dispatchViewManagerCommand(
        findNodeHandle(adViewRef.current),
        // @ts-ignore: Issue in RN ts defs
        UIManager.getViewManagerConfig(ComponentName).Commands.loadAd,
        [],
      );
    }
  }, []);

  useImperativeHandle(ref, () => ({ loadAd }), [loadAd]);

  const saveElement = useCallback((element: AdViewType | null) => {
    adViewRef.current = element;
  }, []);

  useEffect(() => {
    (async () => {
      if (adFormat === AdFormat.BANNER) {
        adFormatSize.current = { width: ADVIEW_SIZE.banner.width, height: ADVIEW_SIZE.banner.height };
      } else {
        adFormatSize.current = { width: ADVIEW_SIZE.mrec.width, height: ADVIEW_SIZE.mrec.height };
      }
      const initialized = await DaroMModule.isInitialized();
      setIsInitialized(initialized);

      if (!initialized) {
        console.warn('AdBannerView is mounted before the initialization of the DaroM React Native module');
      }
    })();
  }, [adFormat]);

  const onAdLoadedEvent = useCallback(
    (event: AdNativeEvent<AdInfo>) => {
      onAdLoaded?.(event.nativeEvent);
    },
    [onAdLoaded]
  );

  const onAdLoadFailedEvent = useCallback(
    (event: AdNativeEvent<AdLoadFailedInfo>) => {
      onAdLoadFailed?.(event.nativeEvent);
    },
    [onAdLoadFailed]
  );

  const onAdClickedEvent = useCallback(
    (event: AdNativeEvent<AdInfo>) => {
      onAdClicked?.(event.nativeEvent);
    },
    [onAdClicked]
  );

  const onAdImpressionRecordedEvent = useCallback(
    (event: AdNativeEvent<AdInfo>) => {
      onAdImpressionRecorded?.(event.nativeEvent);
    },
    [onAdImpressionRecorded]
  );

  if (!isInitialized) {
    // Early return if not initialized
    console.log('AdBannerView is not initialized');
    return <View style={style} {...otherProps} />;
  }

  return (
    <AdViewComponent
      style={style}
      adFormat={adFormat}
      ref={saveElement}
      adUnitId={adUnitId}
      placement={placement}
      isVisible={isVisible}
      onAdLoadedEvent={onAdLoadedEvent}
      onAdLoadFailedEvent={onAdLoadFailedEvent}
      onAdClickedEvent={onAdClickedEvent}
      onAdImpressionRecordedEvent={onAdImpressionRecordedEvent}
      {...otherProps} />
  );
});