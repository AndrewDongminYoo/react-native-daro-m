import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  findNodeHandle,
  NativeModules,
  requireNativeComponent,
  UIManager,
  View,
  type NativeMethods,
  type ViewProps,
} from 'react-native';
import type {
  AdBannerViewHandler,
  AdBannerViewProps,
} from './types/AdBannerViewProps';
import type { AdNativeEvent } from './types/AdEvent';
import type { AdInfo, AdLoadFailedInfo } from './types/AdInfo';

const { DaroMModule } = NativeModules;

const { BANNER_AD_FORMAT_LABEL, MREC_AD_FORMAT_LABEL } =
  DaroMModule.getConstants();

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
const AdViewComponent = requireNativeComponent<
  AdBannerViewProps & ViewProps & AdViewNativeEvents
>(ComponentName);
type AdViewType = React.Component<AdBannerViewProps> & NativeMethods;

export const AdBannerView = forwardRef<
  AdBannerViewHandler,
  AdBannerViewProps & ViewProps
>(function AdBannerView(
  {
    adUnitId,
    adFormat,
    placement,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const adViewRef = useRef<AdViewType | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);

  const loadAd = useCallback(() => {
    if (adViewRef.current) {
      UIManager.dispatchViewManagerCommand(
        findNodeHandle(adViewRef.current),
        // @ts-ignore: Issue in RN ts defs
        UIManager.getViewManagerConfig(ComponentName).Commands.loadAd,
        []
      );
    }
  }, []);

  useImperativeHandle(ref, () => ({ loadAd }), [loadAd]);

  const saveElement = useCallback((element: AdViewType | null) => {
    adViewRef.current = element;
  }, []);

  useEffect(() => {
    let cancelled = false;
    DaroMModule.isInitialized().then((initialized: boolean) => {
      if (cancelled) return;
      if (!initialized) {
        console.warn(
          'AdBannerView is mounted before the initialization of the DaroM React Native module'
        );
      }
      setIsInitialized(initialized);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  if (isInitialized === null || !isInitialized) {
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
      {...otherProps}
    />
  );
});
