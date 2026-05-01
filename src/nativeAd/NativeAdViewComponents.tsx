import * as React from 'react';
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import type {
  ImageProps,
  StyleProp,
  TextProps,
  TextStyle,
  ImageStyle,
  ViewProps,
} from 'react-native';
import {
  findNodeHandle,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeAdViewContext } from './NativeAdViewProvider';

// 스타일 속성 추출을 위한 타입 정의
type StyleProps = {
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  numberOfLines?: number;
  lineBreakMode?: 'head' | 'middle' | 'tail' | 'clip' | 'word-wrap';
  opacity?: number;
  display?: 'none' | 'flex';
  isEnabled?: boolean;
  clipsToBounds?: boolean;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  padding?: number;
  margin?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  position?: 'absolute' | 'relative';
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  width?: number | string;
  height?: number | string;
  transform?: any[];
  scale?: number;
  rotate?: string;
  translateX?: number;
  translateY?: number;
  zIndex?: number;
  overflow?: 'visible' | 'hidden' | 'scroll';
  backfaceVisibility?: 'visible' | 'hidden';
};

// 스타일 속성 추출 커스텀 훅
const useStyleProps = (style: StyleProp<TextStyle>): StyleProps => {
  return useMemo(() => {
    const styleObj: TextStyle = StyleSheet.flatten(style) ?? {};
    return {
      // 1. 폰트 관련
      fontSize: styleObj.fontSize as number,
      fontWeight: styleObj.fontWeight as string,
      fontFamily: styleObj.fontFamily as string,
      color: styleObj.color as string,

      // 2. 배경색
      backgroundColor: styleObj.backgroundColor as string,

      // 3. 정렬
      textAlign: styleObj.textAlign as
        | 'auto'
        | 'left'
        | 'right'
        | 'center'
        | 'justify',

      // 6. 투명도
      opacity: styleObj.opacity as number,

      // 7. 숨김
      display: styleObj.display as 'none' | 'flex',

      // 10. 모서리 둥글게
      borderRadius: styleObj.borderRadius as number,

      // 11. 테두리
      borderWidth: styleObj.borderWidth as number,
      borderColor: styleObj.borderColor as string,

      // 12. 그림자
      shadowColor: styleObj.shadowColor as string,
      shadowOffset: styleObj.shadowOffset as { width: number; height: number },
      shadowOpacity: styleObj.shadowOpacity as number,
      shadowRadius: styleObj.shadowRadius as number,

      // 13. 여백
      padding: styleObj.padding as number,
      margin: styleObj.margin as number,
      paddingTop: styleObj.paddingTop as number,
      paddingRight: styleObj.paddingRight as number,
      paddingBottom: styleObj.paddingBottom as number,
      paddingLeft: styleObj.paddingLeft as number,
      marginTop: styleObj.marginTop as number,
      marginRight: styleObj.marginRight as number,
      marginBottom: styleObj.marginBottom as number,
      marginLeft: styleObj.marginLeft as number,

      // 14. 위치
      position: styleObj.position as 'absolute' | 'relative',
      top: styleObj.top as number,
      right: styleObj.right as number,
      bottom: styleObj.bottom as number,
      left: styleObj.left as number,

      // 15. 크기
      width: styleObj.width as number,
      height: styleObj.height as number,

      // 16. 변환
      transform: styleObj.transform as any[],

      // 17. 기타
      zIndex: styleObj.zIndex as number,
      overflow: styleObj.overflow as 'visible' | 'hidden' | 'scroll',
      backfaceVisibility: styleObj.backfaceVisibility as 'visible' | 'hidden',
    };
  }, [style]);
};

// Image 스타일 속성을 위한 타입 정의 추가
type ImageStyleProps = StyleProps & {
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  tintColor?: string;
  overlayColor?: string;
  borderRadius?: number;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;
  aspectRatio?: number;
};

// Image 스타일 속성 추출 커스텀 훅
const useImageStyleProps = (style: StyleProp<ImageStyle>): ImageStyleProps => {
  return useMemo(() => {
    const styleObj: ImageStyle = StyleSheet.flatten(style) ?? {};
    return {
      // 기본 스타일 속성
      backgroundColor: styleObj.backgroundColor as string,
      borderRadius: styleObj.borderRadius as number,
      borderWidth: styleObj.borderWidth as number,
      borderColor: styleObj.borderColor as string,

      shadowColor: styleObj.shadowColor as string,
      shadowOffset: styleObj.shadowOffset as { width: number; height: number },
      shadowOpacity: styleObj.shadowOpacity as number,
      shadowRadius: styleObj.shadowRadius as number,

      width: styleObj.width as number,
      height: styleObj.height as number,

      // Image 전용 스타일 속성
      resizeMode: styleObj.resizeMode as
        | 'cover'
        | 'contain'
        | 'stretch'
        | 'repeat'
        | 'center',
      tintColor: styleObj.tintColor as string,
      overlayColor: styleObj.overlayColor as string,
      aspectRatio: styleObj.aspectRatio as number,
    };
  }, [style]);
};

// 네이티브 뷰 속성 설정 커스텀 훅
const useNativeAdViewProps = (
  ref: React.RefObject<any>,
  nativePropKey: string,
  styleProps?: StyleProps
) => {
  const { nativeAdView } = useContext(NativeAdViewContext);

  const setNativeProps = useCallback(() => {
    if (!ref.current) return;
    const props: any = {
      [nativePropKey]: findNodeHandle(ref.current),
    };

    if (styleProps) {
      props[`${nativePropKey}StyleProps`] = styleProps;
    }

    nativeAdView?.setNativeProps(props);
  }, [nativeAdView, ref, nativePropKey, styleProps]);

  useEffect(() => {
    setNativeProps();
  }, [setNativeProps]);
};

// 공통 Text 컴포넌트
const AdTextView = (props: TextProps & { nativePropKey: string }) => {
  const { nativePropKey, ...restProps } = props;
  const textRef = useRef<Text | null>(null);
  const styleProps = useStyleProps(props.style);

  useNativeAdViewProps(textRef, nativePropKey, styleProps);

  return <Text {...restProps} ref={textRef} />;
};

export const TitleView = (props: TextProps) => {
  return <AdTextView {...props} nativePropKey="titleView" />;
};

export const BodyView = (props: TextProps) => {
  return <AdTextView {...props} nativePropKey="bodyView" />;
};

export const CallToActionView = (props: TextProps) => {
  const callToActionRef = useRef<Text | null>(null);
  const styleProps = useStyleProps(props.style);

  useNativeAdViewProps(callToActionRef, 'callToActionView', styleProps);

  // TouchableOpacity disables clicking on certain Android devices.
  if (Platform.OS === 'android') {
    return <Text {...props} ref={callToActionRef} />;
  } else {
    return (
      <View>
        <Text {...props} ref={callToActionRef} />
      </View>
    );
  }
};

export const IconView = (props: Omit<ImageProps, 'source'>) => {
  const imageRef = useRef<Image | null>(null);
  const iconViewStyleProps = useImageStyleProps(props.style);
  useNativeAdViewProps(imageRef, 'iconView', iconViewStyleProps);

  return <Image {...props} ref={imageRef} source={0} />;
};

export const MediaView = (props: ViewProps) => {
  const viewRef = useRef<View | null>(null);
  useNativeAdViewProps(viewRef, 'mediaView');

  return <View {...props} ref={viewRef} />;
};
