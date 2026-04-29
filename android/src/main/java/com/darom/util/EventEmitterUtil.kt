package com.darom.util

import android.view.View
import com.darom.event.DaroMEvent
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.events.RCTEventEmitter

internal object EventEmitterUtil {
    // React Native Bridge
    fun sendReactNativeEvent(
        reactContext: ReactContext,
        event: DaroMEvent,
        params: WritableMap?,
    ) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event.value, params)
    }

    fun View.sendNativeViewEvent(
        reactContext: ReactContext,
        event: DaroMEvent,
        params: WritableMap?,
    ) {
        reactContext
            .getJSModule(RCTEventEmitter::class.java)
            .receiveEvent(id, event.value, params)
    }
}
