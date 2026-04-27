package com.darom

import com.darom.event.AdViewEvent
import com.darom.view.DaroMAdBannerViewContainer
import com.darom.view.DaroMAdNativeViewContainer
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.uimanager.ReactStylesDiffMap
import com.facebook.react.uimanager.StateWrapper
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp

class DaroMAdNativeViewManager : ViewGroupManager<DaroMAdNativeViewContainer>() {

  override fun getName(): String {
    return "DaroMNativeAdView"
  }

  override fun createViewInstance(
    reactTag: Int,
    reactContext: ThemedReactContext,
    initialProps: ReactStylesDiffMap?,
    stateWrapper: StateWrapper?,
  ): DaroMAdNativeViewContainer {
    val placement = initialProps?.getString("placement")
    val adUnitId = initialProps?.getString("adUnitId")

    val key = "{$adUnitId}_${placement}"

    if (key.isNotEmpty()) {
      viewCache.keys.firstOrNull { it.contains(key) }?.let {
        if (it != key + reactContext.hashCode()) {
          viewCache.remove(it)
        }
      }
    }

    return key.let {
      viewCache[it + reactContext.hashCode()].let { view ->
        view?.id = reactTag

        if(view?.parent == null) view.also {
          it?.applyPrevSetting()
        }

        else null
      }
    } ?: super.createViewInstance(reactTag, reactContext, initialProps, stateWrapper).also {
      if (key.isNotEmpty()) viewCache[key + reactContext.hashCode()] = it
    }
  }

  override fun createViewInstance(context: ThemedReactContext): DaroMAdNativeViewContainer {
    return DaroMAdNativeViewContainer(context)
  }

  companion object {
    private const val COMMAND_LOAD_AD: Int = 1

    private val viewCache: MutableMap<String, DaroMAdNativeViewContainer> = mutableMapOf()
  }

  override fun getExportedCustomBubblingEventTypeConstants(): MutableMap<String, Any> {
    return AdViewEvent.entries.associate {
      it.value to mutableMapOf("phasedRegistrationNames" to mutableMapOf("bubbled" to it.key))
    }.toMutableMap()
  }

  override fun getCommandsMap(): MutableMap<String, Int> {
    return mutableMapOf(
      "loadAd" to COMMAND_LOAD_AD,
    )
  }

  @Deprecated("")
  override fun receiveCommand(
    root: DaroMAdNativeViewContainer,
    commandId: Int,
    args: ReadableArray?,
  ) {
    when (commandId) {
      COMMAND_LOAD_AD -> {
        root.loadAd()
      }
    }
  }

  @ReactProp(name = "adUnitId")
  fun setAdUnitId(view: DaroMAdNativeViewContainer, adUnitId: String) {
    view.adUnitId = adUnitId
  }

  @ReactProp(name = "loadOnMount")
  fun setLoadOnMount(view: DaroMAdNativeViewContainer, loadOnMount: Boolean) {
    view.loadOnMount = loadOnMount
  }

  @ReactProp(name = "titleView")
  fun setTitleView(view: DaroMAdNativeViewContainer, value: Int) {
    view.setTitleView(value)
  }

  @ReactProp(name = "bodyView")
  fun setBodyView(view: DaroMAdNativeViewContainer, value: Int) {
    view.setBodyView(value)
  }

  @ReactProp(name = "callToActionView")
  fun setCallToActionView(view: DaroMAdNativeViewContainer, value: Int) {
    view.setCallToActionView(value)
  }

  @ReactProp(name = "iconView")
  fun setIconView(view: DaroMAdNativeViewContainer, value: Int) {
    view.setIconView(value)
  }

  @ReactProp(name = "mediaView")
  fun setMediaView(view: DaroMAdNativeViewContainer, value: Int) {
    view.setMediaView(value)
  }

  @ReactProp(name = "placement")
  fun setPlacement(view: DaroMAdBannerViewContainer, placement: String) {
  }

  override fun onAfterUpdateTransaction(view: DaroMAdNativeViewContainer) {
    super.onAfterUpdateTransaction(view)
    view.onSetProps()
  }

  override fun onDropViewInstance(view: DaroMAdNativeViewContainer) {
    super.onDropViewInstance(view)
//    view.destroy()
  }
}
