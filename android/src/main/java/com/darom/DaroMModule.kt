package com.darom

import android.app.Application
import android.content.Context
import android.content.pm.ApplicationInfo
import com.darom.constants.InternalDaroMBannerSize
import com.darom.event.DaroMEvent
import com.darom.event.InterstitialEvent
import com.darom.event.LightPopupEvent
import com.darom.event.RewardedEvent
import com.darom.impl.DaroMBannerViewModuleImpl
import com.darom.impl.DaroMInterstitialModuleImpl
import com.darom.impl.DaroMLightPopupModuleImpl
import com.darom.impl.DaroMRewardedAdModuleImpl
import com.darom.util.EventEmitterUtil
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import droom.daro.SDKConfig
import droom.daro.m.Daro

class DaroMModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  companion object {
    const val NAME = "DaroMModule"
  }

  override fun getName(): String = NAME

  private val context: Context = reactApplicationContext

  @Volatile
  private var isInitialized: Boolean = false

  @ReactMethod
  fun initializeSdk(promise: Promise) {
    if (isInitialized) {
      promise.resolve(null)
      return
    }
    try {
      val isDebuggable = (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
      Daro.init(
        application = context.applicationContext as Application,
        sdkConfig =
          SDKConfig
            .Builder()
            .setDebugMode(isDebuggable)
            .build(),
      )
      isInitialized = true
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("INIT_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun isInitialized(promise: Promise) {
    promise.resolve(isInitialized)
  }

  @ReactMethod
  fun showMediationDebugger() {
    Daro.openDebugger(context)
  }

  @ReactMethod
  fun setUserId(userId: String) {
    Daro.setUserId(context, userId)
  }

  override fun getConstants(): MutableMap<String, Any>? {
    val constants = mutableMapOf<String, Any>()
    constants.putAll(daroMInterstitialModule.getComponents())
    constants.putAll(daroMRewardedModule.getComponents())
    constants.putAll(daroMLightPopupModule.getComponents())
    constants.putAll(daroMBannerModule.getComponents())

    return constants
  }

  internal abstract class DaroMComponentModule(
    protected val context: ReactContext,
  ) {
    abstract fun getComponents(): MutableMap<String, Any>

    fun sendNativeEvent(
      event: DaroMEvent,
      params: WritableMap?,
    ) {
      EventEmitterUtil.sendReactNativeEvent(
        reactContext = context,
        event = event,
        params = params,
      )
    }
  }

  @OptIn(ExperimentalStdlibApi::class)
  internal abstract class DaroMInterstitialModule(
    context: ReactContext,
  ) : DaroMComponentModule(context) {
    abstract fun isInterstitialReady(
      adUnitId: String,
      promise: Promise,
    )

    abstract fun loadInterstitial(adUnitId: String)

    abstract fun showInterstitial(
      adUnitId: String,
      promise: Promise,
    )

    override fun getComponents(): MutableMap<String, Any> = InterstitialEvent.entries.associate { it.value to it.value }.toMutableMap()
  }

  private val daroMInterstitialModule: DaroMInterstitialModule =
    DaroMInterstitialModuleImpl(
      context = reactContext,
      getCurrentActivity = { getCurrentActivity() },
    )

  @ReactMethod
  fun isInterstitialReady(
    adUnitId: String,
    promise: Promise,
  ) {
    daroMInterstitialModule.isInterstitialReady(adUnitId, promise)
  }

  @ReactMethod
  fun loadInterstitial(adUnitId: String) {
    daroMInterstitialModule.loadInterstitial(adUnitId)
  }

  @ReactMethod
  fun showInterstitial(
    adUnitId: String,
    promise: Promise,
  ) {
    daroMInterstitialModule.showInterstitial(adUnitId, promise)
  }

  @OptIn(ExperimentalStdlibApi::class)
  internal abstract class DaroMRewardedModule(
    context: ReactContext,
  ) : DaroMComponentModule(context) {
    abstract fun isRewardedAdReady(
      adUnitId: String,
      promise: Promise,
    )

    abstract fun loadRewardedAd(adUnitId: String)

    abstract fun showRewardedAd(
      adUnitId: String,
      customData: String?,
      promise: Promise,
    )

    override fun getComponents(): MutableMap<String, Any> = RewardedEvent.entries.associate { it.value to it.value }.toMutableMap()
  }

  private val daroMRewardedModule: DaroMRewardedModule =
    DaroMRewardedAdModuleImpl(
      context = reactContext,
      getCurrentActivity = { getCurrentActivity() },
    )

  @ReactMethod
  fun isRewardedAdReady(
    adUnitId: String,
    promise: Promise,
  ) {
    daroMRewardedModule.isRewardedAdReady(adUnitId, promise)
  }

  @ReactMethod
  fun loadRewardedAd(adUnitId: String) {
    daroMRewardedModule.loadRewardedAd(adUnitId)
  }

  @ReactMethod
  fun showRewardedAd(
    adUnitId: String,
    customData: String?,
    promise: Promise,
  ) {
    daroMRewardedModule.showRewardedAd(adUnitId, customData, promise)
  }

  @OptIn(ExperimentalStdlibApi::class)
  internal abstract class DaroMLightPopupModule(
    context: ReactContext,
  ) : DaroMComponentModule(context) {
    abstract fun isLightPopupReady(
      adUnitId: String,
      promise: Promise,
    )

    abstract fun loadLightPopup(adUnitId: String)

    abstract fun showLightPopup(
      adUnitId: String,
      promise: Promise,
    )

    abstract fun setLightPopupAdConfiguration(
      adUnitId: String,
      parameterMap: ReadableMap,
    )

    override fun getComponents(): MutableMap<String, Any> = LightPopupEvent.entries.associate { it.value to it.value }.toMutableMap()
  }

  private val daroMLightPopupModule: DaroMLightPopupModule =
    DaroMLightPopupModuleImpl(
      context = reactContext,
      getCurrentActivity = { getCurrentActivity() },
    )

  @ReactMethod
  fun isLightPopupReady(
    adUnitId: String,
    promise: Promise,
  ) {
    daroMLightPopupModule.isLightPopupReady(adUnitId, promise)
  }

  @ReactMethod
  fun loadLightPopup(adUnitId: String) {
    daroMLightPopupModule.loadLightPopup(adUnitId)
  }

  @ReactMethod
  fun showLightPopup(
    adUnitId: String,
    promise: Promise,
  ) {
    daroMLightPopupModule.showLightPopup(adUnitId, promise)
  }

  @ReactMethod
  fun setLightPopupAdConfiguration(
    adUnitId: String,
    configurationMap: ReadableMap,
  ) {
    daroMLightPopupModule.setLightPopupAdConfiguration(adUnitId, configurationMap)
  }

  @OptIn(ExperimentalStdlibApi::class)
  internal abstract class DaroMBannerModule(
    context: ReactContext,
  ) : DaroMComponentModule(context) {
    override fun getComponents(): MutableMap<String, Any> = InternalDaroMBannerSize.entries.associate { it.key to it.name }.toMutableMap()
  }

  private val daroMBannerModule: DaroMBannerModule =
    DaroMBannerViewModuleImpl(context = reactContext)
}
