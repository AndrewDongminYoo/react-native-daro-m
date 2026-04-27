package com.darom.constants

import droom.daro.core.model.DaroBannerSize

internal enum class InternalDaroMBannerSize(val key: String) {
  BANNER("BANNER_AD_FORMAT_LABEL"),
  MREC("MREC_AD_FORMAT_LABEL"),
  UNKNOWN("UNKNOWN_AD_FORMAT_LABEL");

  fun toBannerSize(): DaroBannerSize? {
    return when (this) {
      BANNER -> DaroBannerSize.Banner
      MREC -> DaroBannerSize.MREC
      UNKNOWN -> null
    }
  }

  companion object{
    fun fromName(name: String): InternalDaroMBannerSize {
      return entries.firstOrNull { it.name == name } ?: UNKNOWN
    }
  }
}
