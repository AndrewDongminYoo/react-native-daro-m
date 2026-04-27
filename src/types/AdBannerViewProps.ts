import type { AdFormat } from "../AdBannerView";
import type { AdProps } from "./AdProps";

export type AdBannerViewHandler = {
	/**
	 * If the {@link loadOnMount} attribute is set to false, you can call this API to start loading ads in this AdView.
	 */
	loadAd(): void;
};

export type AdBannerViewProps = AdProps & {
	color?: string;
	adFormat: AdFormat;
	loadOnMount?: boolean;
	isVisible?: boolean;
}
