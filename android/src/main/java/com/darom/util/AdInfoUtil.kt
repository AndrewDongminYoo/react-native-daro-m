package com.darom.util

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import droom.daro.core.model.DaroAdDisplayFailError
import droom.daro.core.model.DaroAdInfo
import droom.daro.core.model.DaroAdLoadError
import droom.daro.core.model.DaroRewardedAd

internal object AdInfoUtil {
    fun getAdInfo(
        adUnitId: String,
        ad: DaroAdInfo,
    ): WritableMap {
        val adInfo = Arguments.createMap()
        adInfo.putString("adUnitId", adUnitId)
        adInfo.putInt("latencyMillis", ad.latency)

        return adInfo
    }

    fun getAdLoadFailedInfo(
        adUnitId: String?,
        error: DaroAdLoadError?,
    ): WritableMap {
        val errInfo = Arguments.createMap()
        errInfo.putString("adUnitId", adUnitId)

        if (error != null) {
            errInfo.putInt("code", error.code)
            errInfo.putString("message", error.message)
            errInfo.putInt("latencyMillis", error.latency)
        } else {
            errInfo.putInt("code", -1)
        }

        return errInfo
    }

    fun getAdDisplayFailedInfo(
        adUnitId: String,
        ad: DaroAdInfo,
        error: DaroAdDisplayFailError,
    ): WritableMap {
        val info = getAdInfo(adUnitId, ad)

        info.putString("message", error.message)

        return info
    }

    fun getRewardInfo(
        adUnitId: String,
        reward: DaroRewardedAd.DaroRewardedItem,
    ): WritableMap {
        val adInfo = Arguments.createMap()

        adInfo.putString("adUnitId", adUnitId)
        adInfo.putString("rewardLabel", reward.type)
        adInfo.putInt("rewardAmount", reward.amount)

        return adInfo
    }
}
