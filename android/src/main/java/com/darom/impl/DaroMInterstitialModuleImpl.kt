package com.darom.impl

import android.app.Activity
import com.darom.DaroMModule
import com.darom.event.InterstitialEvent
import com.darom.util.AdInfoUtil
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import droom.daro.core.adunit.DaroInterstitialAdUnit
import droom.daro.core.listener.DaroInterstitialAdListener
import droom.daro.core.listener.DaroInterstitialAdLoaderListener
import droom.daro.core.model.DaroAdDisplayFailError
import droom.daro.core.model.DaroAdInfo
import droom.daro.core.model.DaroAdLoadError
import droom.daro.core.model.DaroInterstitialAd
import droom.daro.loader.DaroInterstitialAdLoader

internal class DaroMInterstitialModuleImpl(
    context: ReactApplicationContext,
    private val getCurrentActivity: () -> Activity?,
) : DaroMModule.DaroMInterstitialModule(context) {
    private val currentActivity: Activity?
        get() = getCurrentActivity()

    private val loaderMap: MutableMap<String, DaroInterstitialAdLoader> = mutableMapOf()
    private val interstitialAdMap: MutableMap<String, DaroInterstitialAd> = mutableMapOf()

    override fun isInterstitialReady(
        adUnitId: String,
        promise: Promise,
    ) {
        promise.resolve(retrieveAd(adUnitId) != null)
    }

    override fun loadInterstitial(adUnitId: String) {
        retrieveLoader(adUnitId).load()
    }

    override fun showInterstitial(adUnitId: String) {
        currentActivity?.let {
            retrieveAd(adUnitId)?.apply {
                setListener(
                    object : DaroInterstitialAdListener {
                        override fun onDismiss(ad: DaroAdInfo) {
                            sendNativeEvent(
                                event = InterstitialEvent.ON_INTERSTITIAL_HIDDEN_EVENT,
                                params = AdInfoUtil.getAdInfo(adUnitId, ad),
                            )
                        }

                        override fun onFailedToShow(
                            ad: DaroAdInfo,
                            error: DaroAdDisplayFailError,
                        ) {
                            sendNativeEvent(
                                event = InterstitialEvent.ON_INTERSTITIAL_AD_FAILED_TO_DISPLAY_EVENT,
                                params = AdInfoUtil.getAdDisplayFailedInfo(adUnitId, ad, error),
                            )
                        }

                        override fun onShown(ad: DaroAdInfo) {
                            sendNativeEvent(
                                event = InterstitialEvent.ON_INTERSTITIAL_DISPLAYED_EVENT,
                                params = AdInfoUtil.getAdInfo(adUnitId, ad),
                            )

                            interstitialAdMap.remove(adUnitId)
                        }

                        override fun onAdClicked(responseInfo: DaroAdInfo) {
                            sendNativeEvent(
                                event = InterstitialEvent.ON_INTERSTITIAL_CLICKED_EVENT,
                                params = AdInfoUtil.getAdInfo(adUnitId, responseInfo),
                            )
                        }

                        override fun onAdImpression(responseInfo: DaroAdInfo) {
                            sendNativeEvent(
                                event = InterstitialEvent.ON_INTERSTITIAL_AD_IMPRESSION_RECORDED,
                                params = AdInfoUtil.getAdInfo(adUnitId, responseInfo),
                            )
                        }
                    },
                )

                show(it)
            }
        }
    }

    private fun retrieveLoader(adUnitId: String): DaroInterstitialAdLoader =
        loaderMap[adUnitId] ?: DaroInterstitialAdLoader(
            context,
            DaroInterstitialAdUnit(adUnitId, adUnitId),
        ).also {
            loaderMap[adUnitId] = it
            it.setListener(
                object : DaroInterstitialAdLoaderListener {
                    override fun onAdLoadSuccess(
                        ad: DaroInterstitialAd,
                        responseInfo: DaroAdInfo,
                    ) {
                        interstitialAdMap[adUnitId] = ad
                        sendNativeEvent(
                            event = InterstitialEvent.ON_INTERSTITIAL_LOADED_EVENT,
                            params = AdInfoUtil.getAdInfo(adUnitId, responseInfo),
                        )
                    }

                    override fun onAdLoadFail(err: DaroAdLoadError) {
                        sendNativeEvent(
                            event = InterstitialEvent.ON_INTERSTITIAL_LOAD_FAILED_EVENT,
                            params = AdInfoUtil.getAdLoadFailedInfo(adUnitId, err),
                        )
                    }
                },
            )
        }

    private fun retrieveAd(adUnitId: String): DaroInterstitialAd? = interstitialAdMap[adUnitId]
}
