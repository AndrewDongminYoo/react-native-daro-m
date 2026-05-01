package com.darom.impl

import android.app.Activity
import androidx.core.graphics.toColorInt
import com.darom.DaroMModule
import com.darom.event.LightPopupEvent
import com.darom.util.AdInfoUtil
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import droom.daro.core.adunit.DaroLightPopupAdUnit
import droom.daro.core.listener.DaroLightPopupAdListener
import droom.daro.core.listener.DaroLightPopupAdLoaderListener
import droom.daro.core.model.DaroAdDisplayFailError
import droom.daro.core.model.DaroAdInfo
import droom.daro.core.model.DaroAdLoadError
import droom.daro.core.model.DaroLightPopupAd
import droom.daro.core.model.DaroLightPopupAdOptions
import droom.daro.loader.DaroLightPopupAdLoader

internal class DaroMLightPopupModuleImpl(
  context: ReactApplicationContext,
  private val getCurrentActivity: () -> Activity?,
) : DaroMModule.DaroMLightPopupModule(context) {
  private val currentActivity: Activity?
    get() = getCurrentActivity()

  private val lightpopupAdMap: MutableMap<String, DaroLightPopupAd> = mutableMapOf()
  private val optionMap: MutableMap<String, DaroLightPopupAdOptions> = mutableMapOf()
  private val loaderMap: MutableMap<String, DaroLightPopupAdLoader> = mutableMapOf()

  override fun isLightPopupReady(
    adUnitId: String,
    promise: Promise,
  ) {
    promise.resolve(retrieveAd(adUnitId) != null)
  }

  override fun loadLightPopup(adUnitId: String) {
    context.runOnUiQueueThread {
      retrieveLoader(adUnitId).load()
    }
  }

  private fun String.toColorIntOrNull(): Int? = runCatching { toColorInt() }.getOrNull()

  override fun setLightPopupAdConfiguration(
    adUnitId: String,
    parameterMap: ReadableMap,
  ) {
    val newOption =
      DaroLightPopupAdOptions().let {
        it.copy(
          backgroundColor =
            parameterMap.getString("backgroundColor")?.toColorIntOrNull()
              ?: it.backgroundColor,
          containerColor =
            parameterMap.getString("cardViewBackgroundColor")?.toColorIntOrNull()
              ?: it.containerColor,
          adMarkLabelTextColor =
            parameterMap.getString("adMarkLabelTextColor")?.toColorIntOrNull()
              ?: it.adMarkLabelTextColor,
          adMarkLabelBackgroundColor =
            parameterMap
              .getString("adMarkLabelBackgroundColor")
              ?.toColorIntOrNull() ?: it.adMarkLabelBackgroundColor,
          titleColor = parameterMap.getString("titleTextColor")?.toColorIntOrNull() ?: it.titleColor,
          bodyColor = parameterMap.getString("bodyTextColor")?.toColorIntOrNull() ?: it.bodyColor,
          ctaBackgroundColor =
            parameterMap.getString("ctaButtonBackgroundColor")?.toColorIntOrNull()
              ?: it.ctaBackgroundColor,
          ctaTextColor =
            parameterMap.getString("ctaButtonTextColor")?.toColorIntOrNull()
              ?: it.ctaTextColor,
          closeButtonText = parameterMap.getString("closeButtonText") ?: it.closeButtonText,
          closeButtonColor =
            parameterMap.getString("closeButtonTextColor")?.toColorIntOrNull()
              ?: it.closeButtonColor,
        )
      }

    optionMap[adUnitId] = newOption
  }

  override fun showLightPopup(
    adUnitId: String,
    promise: Promise,
  ) {
    val activity =
      currentActivity ?: run {
        promise.reject("ACTIVITY_NOT_FOUND", "Current activity is null")
        return
      }
    val ad =
      retrieveAd(adUnitId) ?: run {
        promise.reject("LIGHTPOPUP_NOT_LOADED", "LightPopup ad not loaded for unit: $adUnitId")
        return
      }
    activity.runOnUiThread {
      ad.setListener(
        object : DaroLightPopupAdListener {
          override fun onDismiss(ad: DaroAdInfo) {
            sendNativeEvent(
              event = LightPopupEvent.ON_LIGHTPOPUP_HIDDEN_EVENT,
              params = AdInfoUtil.getAdInfo(adUnitId, ad),
            )
          }

          override fun onFailedToShow(
            ad: DaroAdInfo,
            error: DaroAdDisplayFailError,
          ) {
            sendNativeEvent(
              event = LightPopupEvent.ON_LIGHTPOPUP_AD_FAILED_TO_DISPLAY_EVENT,
              params = AdInfoUtil.getAdDisplayFailedInfo(adUnitId, ad, error),
            )
          }

          override fun onShown(ad: DaroAdInfo) {
            sendNativeEvent(
              event = LightPopupEvent.ON_LIGHTPOPUP_DISPLAYED_EVENT,
              params = AdInfoUtil.getAdInfo(adUnitId, ad),
            )
            lightpopupAdMap.remove(adUnitId)
          }

          override fun onAdClicked(responseInfo: DaroAdInfo) {
            sendNativeEvent(
              event = LightPopupEvent.ON_LIGHTPOPUP_CLICKED_EVENT,
              params = AdInfoUtil.getAdInfo(adUnitId, responseInfo),
            )
          }

          override fun onAdImpression(responseInfo: DaroAdInfo) {
            sendNativeEvent(
              event = LightPopupEvent.ON_LIGHTPOPUP_AD_IMPRESSION_RECORDED,
              params = AdInfoUtil.getAdInfo(adUnitId, responseInfo),
            )
          }
        },
      )
      ad.show(activity)
      promise.resolve(null)
    }
  }

  private fun retrieveLoader(adUnitId: String): DaroLightPopupAdLoader =
    loaderMap[adUnitId] ?: DaroLightPopupAdLoader(
      context,
      DaroLightPopupAdUnit(adUnitId, adUnitId, optionMap[adUnitId] ?: DaroLightPopupAdOptions()),
    ).also {
      loaderMap[adUnitId] = it
      it.setListener(
        object : DaroLightPopupAdLoaderListener {
          override fun onAdLoadSuccess(
            ad: DaroLightPopupAd,
            responseInfo: DaroAdInfo,
          ) {
            lightpopupAdMap[adUnitId] = ad
            sendNativeEvent(
              event = LightPopupEvent.ON_LIGHTPOPUP_LOADED_EVENT,
              params = AdInfoUtil.getAdInfo(adUnitId, responseInfo),
            )
          }

          override fun onAdLoadFail(err: DaroAdLoadError) {
            sendNativeEvent(
              event = LightPopupEvent.ON_LIGHTPOPUP_LOAD_FAILED_EVENT,
              params = AdInfoUtil.getAdLoadFailedInfo(adUnitId, err),
            )
          }
        },
      )
    }

  private fun retrieveAd(adUnitId: String): DaroLightPopupAd? = lightpopupAdMap[adUnitId]
}
