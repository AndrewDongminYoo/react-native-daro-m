package com.darom

import com.darom.constants.InternalDaroMBannerSize
import com.darom.event.AdViewEvent
import com.darom.view.DaroMAdBannerViewContainer
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.uimanager.ReactStylesDiffMap
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.StateWrapper
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class DaroMAdBannerViewManager : SimpleViewManager<DaroMAdBannerViewContainer>() {
    override fun getName(): String = "DaroMAdBannerView"

    companion object {
        private const val COMMAND_LOAD_AD: Int = 1

        private val viewCache: MutableMap<String, DaroMAdBannerViewContainer> = mutableMapOf()
    }

    override fun createViewInstance(
        reactTag: Int,
        reactContext: ThemedReactContext,
        initialProps: ReactStylesDiffMap?,
        stateWrapper: StateWrapper?,
    ): DaroMAdBannerViewContainer {
        val placement = initialProps?.getString("placement")
        val adUnitId = initialProps?.getString("adUnitId")

        val cacheKey =
            when {
                adUnitId.isNullOrBlank() || placement.isNullOrBlank() -> ""
                else -> "{$adUnitId}_${placement}${reactContext.hashCode()}"
            }

        if (cacheKey.isNotBlank()) {
            viewCache.keys
                .filter { it.contains(cacheKey) && it != cacheKey }
                .forEach { viewCache.remove(it)?.destroy() }
        }

        return cacheKey.let {
            viewCache[cacheKey].let { cachedView ->
                cachedView?.id = reactTag

                if (cachedView?.parent == null) {
                    cachedView?.resumeAd()
                    cachedView
                } else {
                    null
                }
            }
        } ?: super.createViewInstance(reactTag, reactContext, initialProps, stateWrapper).also { view ->
            if (cacheKey.isNotBlank()) viewCache[cacheKey] = view
        }
    }

    override fun createViewInstance(reactContext: ThemedReactContext): DaroMAdBannerViewContainer =
        DaroMAdBannerViewContainer(reactContext).apply {
            loadOnMount = true
        }

    override fun getCommandsMap(): MutableMap<String, Int> =
        mutableMapOf(
            "loadAd" to COMMAND_LOAD_AD,
        )

    override fun onAfterUpdateTransaction(view: DaroMAdBannerViewContainer) {
        super.onAfterUpdateTransaction(view)
        view.onSetProps()
    }

    override fun onDropViewInstance(view: DaroMAdBannerViewContainer) {
        super.onDropViewInstance(view)

        val isCached = viewCache.values.contains(view)
        if (isCached) {
            view.pauseAd()
        } else {
            view.destroy()
        }
    }

    @Deprecated("")
    override fun receiveCommand(
        root: DaroMAdBannerViewContainer,
        commandId: Int,
        args: ReadableArray?,
    ) {
        when (commandId) {
            COMMAND_LOAD_AD -> {
                root.loadAd()
            }
        }
    }

    @ReactProp(name = "isVisible")
    fun setIsVisible(
        view: DaroMAdBannerViewContainer,
        isVisible: Boolean,
    ) {
        view.setAdVisibility(isVisible)
    }

    @ReactProp(name = "adUnitId")
    fun setAdUnitId(
        view: DaroMAdBannerViewContainer,
        adUnitId: String,
    ) {
        view.adUnitId = adUnitId
    }

    @ReactProp(name = "adFormat")
    fun setAdFormat(
        view: DaroMAdBannerViewContainer,
        adFormat: String,
    ) {
        view.adSize = InternalDaroMBannerSize.fromName(adFormat).toBannerSize()
    }

    @ReactProp(name = "loadOnMount")
    fun setLoadOnMount(
        view: DaroMAdBannerViewContainer,
        loadOnMount: Boolean,
    ) {
        view.loadOnMount = loadOnMount
    }

    @ReactProp(name = "placement")
    fun setPlacement(
        view: DaroMAdBannerViewContainer,
        placement: String,
    ) {
    }

    @OptIn(ExperimentalStdlibApi::class)
    override fun getExportedCustomBubblingEventTypeConstants(): MutableMap<String, Any> =
        AdViewEvent.entries
            .associate {
                it.value to mutableMapOf("phasedRegistrationNames" to mutableMapOf("bubbled" to it.key))
            }.toMutableMap()
}
