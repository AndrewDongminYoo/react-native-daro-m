import type { ColorValue } from "react-native";
import type { FullScreenAdType } from "./FullScreenAd";

export interface LightPopupAdType extends FullScreenAdType {
  setLightPopupAdConfiguration: (adUnitId: string, configuration: LightPopupAdConfiguration) => void;
}

export interface LightPopupAdConfiguration {
  backgroundColor?: ColorValue;
  cardViewBackgroundColor?: ColorValue;
  adMarkLabelTextColor?: ColorValue;
  adMarkLabelBackgroundColor?: ColorValue;
  closeButtonText?: string;
  closeButtonTextColor?: ColorValue;
  titleTextColor?: ColorValue;
  bodyTextColor?: ColorValue;
  ctaButtonTextColor?: ColorValue;
  ctaButtonBackgroundColor?: ColorValue;
}