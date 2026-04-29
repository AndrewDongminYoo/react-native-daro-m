package com.darom.view

import android.annotation.SuppressLint
import android.view.View
import androidx.core.view.children
import androidx.core.view.isVisible
import com.darom.event.AdViewEvent
import com.darom.util.AdInfoUtil
import com.darom.util.EventEmitterUtil.sendNativeViewEvent
import com.facebook.react.bridge.ReactContext
import com.facebook.react.views.view.ReactViewGroup
import droom.daro.core.adunit.DaroBannerAdUnit
import droom.daro.core.model.DaroAdInfo
import droom.daro.core.model.DaroAdLoadError
import droom.daro.core.model.DaroBannerSize
import droom.daro.core.model.DaroViewAd
import droom.daro.view.DaroAdViewListener
import droom.daro.view.DaroBannerAdView

@SuppressLint("ViewConstructor")
class DaroMAdBannerViewContainer(
    val context: ReactContext,
) : ReactViewGroup(context),
    DaroAdViewListener {
    private var adView: DaroBannerAdView? = null

    internal var adUnitId: String = ""

    internal var adSize: DaroBannerSize? = null

    internal var loadOnMount: Boolean = true

    private var isVisible: Boolean = true
    private var isAdPaused: Boolean = false

    fun loadAd() {
        (adView ?: buildAdView())?.apply {
            adView = this

            if (this.parent == null) {
                this@DaroMAdBannerViewContainer.addView(this)
            }

            loadAd()
        }
    }

    private fun buildAdView(): DaroBannerAdView? {
        if (adUnitId.isEmpty() || adSize == null) {
            return null
        }

        return DaroBannerAdView(
            context,
            DaroBannerAdUnit(
                key = adUnitId,
                placement = adUnitId,
                bannerSize = adSize!!,
            ),
        ).also { view ->
            view.setListener(this)
        }
    }

    fun destroy() {
        adView?.destroy()
    }

    fun setAdVisibility(visible: Boolean) {
        isVisible = visible
        this.isVisible = visible
        adView?.isVisible = visible

        if (visible) {
            resumeAd()
        } else {
            pauseAd()
        }
    }

    fun pauseAd() {
        if (!isAdPaused) {
            isAdPaused = true
            adView?.pause()
        }
    }

    fun resumeAd() {
        if (isAdPaused) {
            isAdPaused = false
            adView?.resume()
        }
    }

    override fun onAdClicked(adInfo: DaroAdInfo) {
        sendNativeViewEvent(
            reactContext = context,
            event = AdViewEvent.ON_AD_CLICKED,
            params = AdInfoUtil.getAdInfo(adUnitId, adInfo),
        )
    }

    override fun onAdImpression(adInfo: DaroAdInfo) {
        sendNativeViewEvent(
            reactContext = context,
            event = AdViewEvent.ON_AD_IMPRESSION,
            params = AdInfoUtil.getAdInfo(adUnitId, adInfo),
        )
    }

    override fun onAdLoadFail(err: DaroAdLoadError) {
        sendNativeViewEvent(
            reactContext = context,
            event = AdViewEvent.ON_AD_FAILED_TO_LOAD,
            params = AdInfoUtil.getAdLoadFailedInfo(adUnitId, err),
        )
    }

    override fun onAdLoadSuccess(
        ad: DaroViewAd,
        adInfo: DaroAdInfo,
    ) {
        sendNativeViewEvent(
            reactContext = context,
            event = AdViewEvent.ON_AD_LOADED,
            params = AdInfoUtil.getAdInfo(adUnitId, adInfo),
        )

        adView?.children?.first()?.let {
            it.measure(
                MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
                MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
            )

            it.layout(0, 0, width, height)
            it.requestLayout()
            adView!!.requestLayout()
        }
    }

    override fun requestLayout() {
        super.requestLayout()

        // https://stackoverflow.com/a/39838774/5477988
        // This is required to ensure ad refreshes render correctly in RN Android due to known issue
        // where `getWidth()` and `getHeight()` return 0 on attach
        try {
            adView?.measure(
                MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
                MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
            )

            adView?.layout(0, 0, width, height)
        } catch (_: Exception) {
            // Ignore
        }
    }

    fun onSetProps() {
        if (loadOnMount) {
            loadAd()
        }
    }
}
