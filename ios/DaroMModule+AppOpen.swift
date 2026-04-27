import DaroM

// MARK: - AppOpen Ad Methods

extension DaroMModule {
    
    @objc(isAppOpenAdReady:::)
    func isAppOpenAdReady(
        _ adUnitId: String,
        resolve: RCTPromiseResolveBlock,
        reject: RCTPromiseRejectBlock
    ) {
      if !Self.sdkInitialized {
        DaroMModule.logger.debug("[DaroMMobileAds] !isInitialized")
        resolve(false)
        return
      }
      resolve(appOpenAds[adUnitId]?.loadedAd != nil)
    }

    @objc(loadAppOpenAd:::)
    func loadAppOpenAd(
        _ adUnitId: String,
        resolve: RCTPromiseResolveBlock,
        reject: RCTPromiseRejectBlock
    ) {
        let appOpenAdLoader = retrieveAppOpenLoader(for: adUnitId)
      appOpenAdLoader.loadAd()
        resolve(Void())
    }

    @objc(showAppOpenAd::::)
    func showAppOpenAd(
        _ adUnitId: String,
        customData: String?,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: RCTPromiseRejectBlock
    ) {
      guard let loadedAd = appOpenAds[adUnitId]?.loadedAd else {
        reject("APPOPEN_NOT_LOADED", "AppOpen ad not loaded", nil)
        return
      }
      DispatchQueue.main.async {
        loadedAd.show()
        resolve(Void())
      }
    }

  func retrieveAppOpenLoader(for unitId: String) -> DaroAppOpenAdLoader {
    if let appOpenLoader = appOpenAds[unitId] {
      return appOpenLoader.loader
    } else {
      let appOpenLoader = DaroAppOpenAdLoader(unit: DaroAdUnit(unitId: unitId))
      appOpenLoader.listener.onAdClicked = { [weak self] adInfo in
        DaroMModule.logger.debug("[DARO] Sample AppOpen Ad clicked")
        self?.sendEvent(with: .onAppOpenAdClickedEvent, body: adInfo?.toBody)
      }

      appOpenLoader.listener.onAdImpression = { [weak self] adInfo in
        DaroMModule.logger.debug("[DARO] Sample AppOpen Ad impression")
        self?.appOpenAds[unitId]?.loadedAd = nil
        self?.sendEvent(with: .onAppOpenAdImpressionRecordedEvent, body: adInfo?.toBody)
      }

      appOpenLoader.listener.onAdLoadSuccess = { [weak self] ad, adInfo in
        DaroMModule.logger.debug("[DARO] Sample AppOpen Ad loaded")
        self?.appOpenAds[unitId]?.loadedAd = ad
        self?.sendEvent(with: .onAppOpenAdLoadedEvent, body: adInfo?.toBody)
        self?.setupAppOpenListener(for: ad)
      }

      appOpenLoader.listener.onAdLoadFail = { [weak self] error in
        DaroMModule.logger.debug("[DARO] Sample AppOpen Ad failed: \(error)")
        self?.sendEvent(with: .onAppOpenAdLoadFailedEvent, body: error.toBody)
      }
      self.appOpenAds[unitId] = AppOpenAd(loader: appOpenLoader)
      return appOpenLoader
    }
  }

  private func setupAppOpenListener(for ad: DaroAppOpenAd) {
    ad.appOpenAdListener.onShown = { [weak self] adInfo in
      DaroMModule.logger.debug("[DARO] Sample AppOpen Ad displayed")
      self?.sendEvent(with: .onAppOpenAdDisplayedEvent, body: adInfo?.toBody)
    }

    ad.appOpenAdListener.onDismiss = { [weak self] adInfo in
      DaroMModule.logger.debug("[DARO] Sample AppOpen Ad hidden")
      self?.sendEvent(with: .onAppOpenAdHiddenEvent, body: adInfo?.toBody)
    }

    ad.appOpenAdListener.onFailedToShow = { [weak self] adInfo, error in
      DaroMModule.logger.debug("[DARO] Sample AppOpen Ad failed to display")
      self?.sendEvent(with: .onAppOpenAdFailedToDisplayEvent, body: adInfo?.toBody)
    }
  }
}

