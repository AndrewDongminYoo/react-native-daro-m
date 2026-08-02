import type { ReactNode } from 'react';
import * as React from 'react';
import { createContext, useState } from 'react';
import type { HostInstance } from 'react-native';

export type NativeAdViewType = HostInstance;

export type NativeAdViewContextType = {
  nativeAdView: NativeAdViewType | null;
  setNativeAdView: React.Dispatch<
    React.SetStateAction<NativeAdViewType | null>
  >;
};

export const NativeAdViewContext = createContext<NativeAdViewContextType>({
  nativeAdView: null,
  setNativeAdView: () => {},
});

export const NativeAdViewProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [nativeAdView, setNativeAdView] = useState<NativeAdViewType | null>(
    null
  );

  const providerValue = React.useMemo(
    () => ({
      nativeAdView,
      setNativeAdView,
    }),
    [nativeAdView]
  );

  return (
    <NativeAdViewContext.Provider value={providerValue}>
      {children}
    </NativeAdViewContext.Provider>
  );
};
