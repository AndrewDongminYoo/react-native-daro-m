package com.darom.view

import android.annotation.SuppressLint
import android.os.Handler
import android.os.Looper
import android.text.SpannableString
import android.text.Spanned
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import androidx.annotation.IdRes
import androidx.core.view.children
import com.darom.event.AdViewEvent
import com.darom.util.AdInfoUtil
import com.darom.util.EventEmitterUtil.sendNativeViewEvent
import com.facebook.react.bridge.ReactContext
import com.facebook.react.views.text.ReactTextView
import com.facebook.react.views.view.ReactViewGroup
import droom.daro.core.adunit.DaroNativeAdUnit
import droom.daro.core.model.DaroAdInfo
import droom.daro.core.model.DaroAdLoadError
import droom.daro.core.model.DaroNativeAdBinder
import droom.daro.core.model.DaroViewAd
import droom.daro.view.DaroAdViewListener
import droom.daro.view.DaroNativeAdView
import kotlin.math.min
import kotlin.math.roundToInt

@SuppressLint("ViewConstructor")
class DaroMAdNativeViewContainer(
    val context: ReactContext,
) : ReactViewGroup(context),
    DaroAdViewListener {
    private val adViewContainer: ReactViewGroup = ReactViewGroup(context)

    init {
        post {
            setOnClickListener {
                adView?.performClick()
            }
        }
    }

    private var adView: DaroNativeAdView? = null

    internal var adUnitId: String = ""

    internal var loadOnMount: Boolean = true

    private var isFirstLoad: Boolean = true

    fun loadAd() {
        (adView ?: buildAdView())?.apply {
            adView = this

            if (this.parent == null) {
                this@DaroMAdNativeViewContainer.addView(this)
            }

            loadAd()
        }
    }

    internal fun applyPrevSetting() {
        if (adView != null && adView!!.parent == null) addView(adView)
    }

    private fun buildAdView(): DaroNativeAdView? {
        if (adUnitId.isEmpty()) {
            return null
        }

        return DaroNativeAdView(
            context,
            DaroNativeAdUnit(
                key = adUnitId,
                placement = adUnitId,
            ),
        ).also { view ->
            view.setAdBinder(
                DaroNativeAdBinder
                    .Builder(adViewContainer)
                    .let { if (titleViewId != null) it.setTitleViewId(titleViewId!!) else it }
                    .let { if (bodyViewId != null) it.setBodyTextViewId(bodyViewId!!) else it }
                    .let { if (iconViewId != null) it.setIconViewId(iconViewId!!) else it }
                    .let { if (mediaViewId != null) it.setMediaViewGroupId(mediaViewId!!) else it }
                    .let { if (callToActionViewId != null) it.setCallToActionViewId(callToActionViewId!!) else it }
                    .build(),
            )

            view.setListener(this)
            view.setOnHierarchyChangeListener(
                object : OnHierarchyChangeListener {
                    override fun onChildViewAdded(
                        parent: View?,
                        child: View?,
                    ) {
                        if (child != null && parent != null) {
                            view.layoutParams =
                                LayoutParams(
                                    LayoutParams.WRAP_CONTENT,
                                    LayoutParams.WRAP_CONTENT,
                                )
                            view.layout(0, 0, parent.width, parent.height)
                        }
                    }

                    override fun onChildViewRemoved(
                        parent: View?,
                        child: View?,
                    ) {}
                },
            )
        }
    }

    fun destroy() {
        adView?.destroy()
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

        post({
            context.currentActivity?.window.let { window ->
                window?.decorView?.requestLayout()
            }
        })
    }

    override fun onAdLoadFail(err: DaroAdLoadError) {
        sendNativeViewEvent(
            reactContext = context,
            event = AdViewEvent.ON_AD_FAILED_TO_LOAD,
            params = AdInfoUtil.getAdLoadFailedInfo(adUnitId, err),
        )
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

    private val loadAdHandler = Handler(Looper.getMainLooper())
    private val loadAdTask = LoadAdTask(this)

    private inner class LoadAdTask(
        private val nativeAdView: DaroMAdNativeViewContainer,
    ) : Runnable {
        override fun run() {
            nativeAdView.loadAd()
            nativeAdView.isFirstLoad = false
        }
    }

    internal fun onSetProps() {
        if (loadOnMount && isFirstLoad) {
            loadAdHandler.removeCallbacksAndMessages(null)
            loadAdHandler.postDelayed(loadAdTask, 50)
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

            adViewContainer.parent?.let {
                (it as ViewGroup)
                    .children
                    .filter { it != adViewContainer && it is ViewGroup }
                    .lastOrNull()
                    ?.let {
                        it.measure(
                            MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
                            MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
                        )

                        it.layout(0, 0, width, height)

                        findImageView(it as ViewGroup)?.let { adChoiceImageView ->
                            if ((adChoiceImageView.parent as View).measuredWidth == adChoiceImageView.measuredWidth) return@let

                            val ratio =
                                adChoiceImageView.drawable.intrinsicHeight.toFloat() / (adChoiceImageView.parent as View).height

                            val w = ((adChoiceImageView.parent as View).width * ratio).roundToInt()
                            val h = ((adChoiceImageView.parent as View).height * ratio).roundToInt()

                            it.measure(
                                MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY),
                                MeasureSpec.makeMeasureSpec(h, MeasureSpec.EXACTLY),
                            )

                            it.layout(width - w, 0, width, height)

                            (adChoiceImageView.parent as View).let { v ->
                                v.measure(
                                    MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY),
                                    MeasureSpec.makeMeasureSpec(h, MeasureSpec.EXACTLY),
                                )

                                v.layout(0, 0, w, h)
                            }
                        }
                    }
            }

            mediaViewId?.let { adViewContainer.findViewById<View>(it) }?.let {
                (it as ViewGroup).children.forEach { child ->
                    val width = it.width
                    val height = it.height

                    child.measure(
                        MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
                        MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
                    )

                    child.layout(0, 0, width, height)
                }
            }

            titleViewId
                ?.let { adViewContainer.findViewById<ReactTextView>(it) }
                ?.restoreSpannableFromMap()
            bodyViewId?.let { adViewContainer.findViewById<ReactTextView>(it) }?.restoreSpannableFromMap()
            callToActionViewId
                ?.let { adViewContainer.findViewById<ReactTextView>(it) }
                ?.restoreSpannableFromMap()
        } catch (_: Exception) {
            // Ignore
        }
    }

    private fun findImageView(root: ViewGroup): ImageView? {
        for (i in 0 until root.childCount) {
            val child = root.getChildAt(i)
            if (child is ImageView) {
                return child
            } else if (child is ViewGroup) {
                val result = findImageView(child)
                if (result != null) return result
            }
        }
        return null
    }

  /*
   * Mapping View
   * */

    @IdRes
    private var titleViewId: Int? = null

    @IdRes
    private var bodyViewId: Int? = null

    @IdRes
    private var callToActionViewId: Int? = null

    @IdRes
    private var iconViewId: Int? = null

    @IdRes
    private var mediaViewId: Int? = null

    fun setTitleView(tag: Int) {
        if (titleViewId != null) return

        this.titleViewId = tag
        findViewById<ReactTextView>(tag)?.let {
            it.moveViewsToAdViewContainer()
            it.saveSpannableToMap()
        }
    }

    fun setBodyView(tag: Int) {
        if (bodyViewId != null) return

        this.bodyViewId = tag
        findViewById<ReactTextView>(tag)?.let {
            it.moveViewsToAdViewContainer()
            it.saveSpannableToMap()
        }
    }

    fun setCallToActionView(tag: Int) {
        if (callToActionViewId != null) return

        this.callToActionViewId = tag
        findViewById<ReactTextView>(tag)?.let {
            it.moveViewsToAdViewContainer()
            it.saveSpannableToMap()
        }
    }

    fun setIconView(tag: Int) {
        if (iconViewId != null) return

        this.iconViewId = tag
        findViewById<View>(tag)?.moveViewsToAdViewContainer()
    }

    fun setMediaView(tag: Int) {
        if (mediaViewId != null) return

        this.mediaViewId = tag
        findViewById<View>(tag)?.moveViewsToAdViewContainer()
    }

  /*
   * Setting View
   * */

    private fun View.moveViewsToAdViewContainer() {
        val layoutParams = layoutParams

        (this.parent as? ViewGroup)?.removeView(this)
        adViewContainer.addView(this, layoutParams)
    }

    private val testSpanMap: MutableMap<Int, Spanned> = mutableMapOf()

    private fun ReactTextView.saveSpannableToMap() {
        val text: CharSequence? = getText()

        if (text is Spanned) {
            testSpanMap[id] = text
        }
    }

    private fun ReactTextView.restoreSpannableFromMap() {
        testSpanMap[id]?.let {
            val newSpannable = replaceTextPreserveSpans(it, text.toString())
            text = newSpannable
        }
    }

    fun replaceTextPreserveSpans(
        oldSpanned: Spanned,
        newText: String,
    ): SpannableString {
        val newSpannable = SpannableString(newText)

        val spans = oldSpanned.getSpans<Any>(0, oldSpanned.length, Any::class.java)
        for (span in spans) {
            val start = oldSpanned.getSpanStart(span)
            val end = oldSpanned.getSpanEnd(span)
            val flags = oldSpanned.getSpanFlags(span)

            val newStart = start.coerceAtMost(newText.length)
            val newEnd = if (end == oldSpanned.length) newText.length else min(end, newText.length)

            if (newStart < newEnd) {
                newSpannable.setSpan(span, newStart, newEnd, flags)
            }
        }

        return newSpannable
    }
}
