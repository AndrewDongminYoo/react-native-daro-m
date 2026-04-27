import { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { findNodeHandle, NativeModules, requireNativeComponent, UIManager, View, type ViewProps } from 'react-native';
import type { AdNativeEvent } from '../types/AdEvent';
import type { AdInfo, AdLoadFailedInfo } from '../types/AdInfo';
import type { NativeAdViewHandler, NativeAdViewProps } from '../types/NativeAdViewProps';
import { NativeAdViewContext, NativeAdViewProvider, type NativeAdViewContextType, type NativeAdViewType } from './NativeAdViewProvider';

const { DaroMModule } = NativeModules;

type NativeAdViewNativeEvents = {
  onAdLoadedEvent(event: AdNativeEvent<AdInfo>): void;
  onAdLoadFailedEvent(event: AdNativeEvent<AdLoadFailedInfo>): void;
  onAdClickedEvent(event: AdNativeEvent<AdInfo>): void;
  onAdImpressionRecordedEvent(event: AdNativeEvent<AdInfo>): void;
};

const ComponentName = 'DaroMNativeAdView';
const NativeAdViewComponent = requireNativeComponent<NativeAdViewProps & ViewProps & NativeAdViewNativeEvents>(ComponentName);

export const NativeAdView = forwardRef<NativeAdViewHandler, NativeAdViewProps & ViewProps>(function NativeAdView(props, ref) {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    const checkInitialization = async () => {
      const result = await DaroMModule.isInitialized();
      setIsInitialized(result);
      if (!result) {
        console.warn('NativeAdView is mounted before the initialization of the DaroM React Native module.');
      }
    };

    checkInitialization();
  }, []);

  // Avoid rendering the NativeAdView if the SDK is not initialized
  if (!isInitialized) {
    return <View {...props} />;
  }

  return (
    <NativeAdViewProvider>
      <NativeAdViewImpl {...props} ref={ref} />
    </NativeAdViewProvider>
  );  
});

const NativeAdViewImpl = forwardRef<NativeAdViewHandler, NativeAdViewProps & ViewProps>(function NativeAdViewImpl(
  { adUnitId, onAdLoaded, onAdLoadFailed, onAdClicked, onAdImpressionRecorded, children, style, loadOnMount = true, ...otherProps },
  ref
) {
  // Context provides functions to manage native ad and native ad view state
  const { setNativeAdView } = useContext(NativeAdViewContext) as NativeAdViewContextType;

  const nativeAdViewRef = useRef<NativeAdViewType | null>(null);

  // Load a new ad
  const loadAd = useCallback(() => {
    if (nativeAdViewRef.current) {
      UIManager.dispatchViewManagerCommand(
        findNodeHandle(nativeAdViewRef.current),
        // @ts-ignore: Issue in RN ts defs
        UIManager.getViewManagerConfig(ComponentName).Commands.loadAd,
        [],
      );
    }
  }, []);

  useImperativeHandle(ref, () => ({ loadAd }), [loadAd]);

  // Save the DOM element reference
  const saveElement = useCallback(
    (element: NativeAdViewType | null) => {
      if (element) {
        nativeAdViewRef.current = element;
        setNativeAdView(element);
      }
    },
    [setNativeAdView]
  );

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

  return (
    <NativeAdViewComponent
      ref={saveElement}
      adUnitId={adUnitId}
      loadOnMount={loadOnMount}
      onAdLoadedEvent={onAdLoadedEvent}
      onAdLoadFailedEvent={onAdLoadFailedEvent}
      onAdClickedEvent={onAdClickedEvent}
      onAdImpressionRecordedEvent={onAdImpressionRecordedEvent}
      style={style}
      {...otherProps}
    >
      {children}
    </NativeAdViewComponent>
  );
});
