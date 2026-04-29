package com.darom.impl

import android.app.Activity
import com.darom.DaroMModule
import com.darom.event.RewardedEvent
import com.darom.util.AdInfoUtil
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import droom.daro.core.adunit.DaroRewardedAdUnit
import droom.daro.core.listener.DaroRewardedAdListener
import droom.daro.core.listener.DaroRewardedAdLoaderListener
import droom.daro.core.model.DaroAdDisplayFailError
import droom.daro.core.model.DaroAdInfo
import droom.daro.core.model.DaroAdLoadError
import droom.daro.core.model.DaroRewardedAd
import droom.daro.loader.DaroRewardedAdLoader

internal class DaroMRewardedAdModuleImpl(
    context: ReactApplicationContext,
    private val getCurrentActivity: () -> Activity?,
) : DaroMModule.DaroMRewardedModule(context) {
    private val currentActivity: Activity?
        get() = getCurrentActivity()

    private val rewardedAdMap: MutableMap<String, DaroRewardedAd> = mutableMapOf()
    private val loaderMap: MutableMap<String, DaroRewardedAdLoader> = mutableMapOf()

    override fun isRewardedAdReady(
        adUnitId: String,
        promise: Promise,
    ) {
        promise.resolve(retrieveAd(adUnitId) != null)
    }

    override fun loadRewardedAd(adUnitId: String) {
        retrieveLoader(adUnitId).load()
    }

    override fun showRewardedAd(
        adUnitId: String,
        customData: String?,
    ) {
        currentActivity?.let { activity ->
            retrieveAd(adUnitId)?.apply {
                setListener(
                    object : DaroRewardedAdListener {
                        override fun onAdImpression(adInfo: DaroAdInfo) {
                            super.onAdImpression(adInfo)
                        }

                        override fun onAdClicked(adInfo: DaroAdInfo) {
                            super.onAdClicked(adInfo)
                        }

                        override fun onDismiss(adInfo: DaroAdInfo) {
                            sendNativeEvent(
                                event = RewardedEvent.ON_REWARDED_AD_HIDDEN_EVENT,
                                params = AdInfoUtil.getAdInfo(adUnitId, adInfo),
                            )
                        }

                        override fun onEarnedReward(
                            adInfo: DaroAdInfo,
                            rewardItem: DaroRewardedAd.DaroRewardedItem,
                        ) {
                            sendNativeEvent(
                                event = RewardedEvent.ON_REWARDED_AD_RECEIVED_REWARD_EVENT,
                                params = AdInfoUtil.getRewardInfo(adUnitId, rewardItem),
                            )
                        }

                        override fun onFailedToShow(
                            adInfo: DaroAdInfo,
                            error: DaroAdDisplayFailError,
                        ) {
                            sendNativeEvent(
                                event = RewardedEvent.ON_REWARDED_AD_FAILED_TO_DISPLAY_EVENT,
                                params = AdInfoUtil.getAdDisplayFailedInfo(adUnitId, adInfo, error),
                            )
                        }

                        override fun onShown(adInfo: DaroAdInfo) {
                            sendNativeEvent(
                                event = RewardedEvent.ON_REWARDED_AD_DISPLAYED_EVENT,
                                params = AdInfoUtil.getAdInfo(adUnitId, adInfo),
                            )

                            rewardedAdMap.remove(adUnitId)
                        }
                    },
                )

                customData?.let { it -> setCustomData(it) }
                activity.runOnUiThread {
                    show(activity)
                }
            }
        }
    }

    private fun retrieveLoader(adUnitId: String): DaroRewardedAdLoader =
        loaderMap[adUnitId] ?: DaroRewardedAdLoader(
            context,
            DaroRewardedAdUnit(adUnitId, adUnitId),
        ).also {
            loaderMap[adUnitId] = it
            it.setListener(
                object : DaroRewardedAdLoaderListener {
                    override fun onAdLoadFail(err: DaroAdLoadError) {
                        sendNativeEvent(
                            event = RewardedEvent.ON_REWARDED_AD_LOAD_FAILED_EVENT,
                            params = AdInfoUtil.getAdLoadFailedInfo(adUnitId, err),
                        )
                    }

                    override fun onAdLoadSuccess(
                        ad: DaroRewardedAd,
                        adInfo: DaroAdInfo,
                    ) {
                        rewardedAdMap[adUnitId] = ad

                        sendNativeEvent(
                            event = RewardedEvent.ON_REWARDED_AD_LOADED_EVENT,
                            params = AdInfoUtil.getAdInfo(adUnitId, adInfo),
                        )
                    }
                },
            )
        }

    private fun retrieveAd(adUnitId: String): DaroRewardedAd? = rewardedAdMap[adUnitId]
}
