package com.darom.event

internal interface DaroMEvent {
    val value: String
}

internal enum class InterstitialEvent : DaroMEvent {
    ON_INTERSTITIAL_LOADED_EVENT,
    ON_INTERSTITIAL_LOAD_FAILED_EVENT,
    ON_INTERSTITIAL_CLICKED_EVENT,
    ON_INTERSTITIAL_DISPLAYED_EVENT,
    ON_INTERSTITIAL_AD_FAILED_TO_DISPLAY_EVENT,
    ON_INTERSTITIAL_HIDDEN_EVENT,
    ON_INTERSTITIAL_AD_IMPRESSION_RECORDED,
    ;

    override val value: String
        get() = name
}

internal enum class RewardedEvent : DaroMEvent {
    ON_REWARDED_AD_LOADED_EVENT,
    ON_REWARDED_AD_LOAD_FAILED_EVENT,
    ON_REWARDED_AD_CLICKED_EVENT,
    ON_REWARDED_AD_DISPLAYED_EVENT,
    ON_REWARDED_AD_FAILED_TO_DISPLAY_EVENT,
    ON_REWARDED_AD_HIDDEN_EVENT,
    ON_REWARDED_AD_RECEIVED_REWARD_EVENT,
    ON_REWARDED_AD_IMPRESSION_RECORDED,
    ;

    override val value: String
        get() = name
}

internal enum class LightPopupEvent : DaroMEvent {
    ON_LIGHTPOPUP_LOADED_EVENT,
    ON_LIGHTPOPUP_LOAD_FAILED_EVENT,
    ON_LIGHTPOPUP_CLICKED_EVENT,
    ON_LIGHTPOPUP_DISPLAYED_EVENT,
    ON_LIGHTPOPUP_AD_FAILED_TO_DISPLAY_EVENT,
    ON_LIGHTPOPUP_HIDDEN_EVENT,
    ON_LIGHTPOPUP_AD_IMPRESSION_RECORDED,
    ;

    override val value: String
        get() = name
}

internal enum class AdViewEvent(
    val key: String,
) : DaroMEvent {
    ON_AD_CLICKED("onAdClickedEvent"),
    ON_AD_FAILED_TO_LOAD("onAdLoadFailedEvent"),
    ON_AD_IMPRESSION("onAdImpressionRecordedEvent"),
    ON_AD_LOADED("onAdLoadedEvent"),
    ;

    override val value: String
        get() = name
}
