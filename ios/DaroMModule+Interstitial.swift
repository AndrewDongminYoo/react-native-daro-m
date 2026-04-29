import DaroM

// MARK: - Interstitial Ad Methods

extension DaroMModule {
    @objc(isInterstitialReady:::)
    func isInterstitialReady(
        _ adUnitId: String,
        resolve: RCTPromiseResolveBlock,
        reject _: RCTPromiseRejectBlock
    ) {
        if !Self.sdkInitialized {
            DaroMModule.logger.debug("[DaroMMobileAds] !isInitialized")
            resolve(false)
            return
        }
        resolve(interstitials[adUnitId]?.loadedAd != nil)
    }

    @objc(loadInterstitial:::)
    func loadInterstitial(
        _ adUnitId: String,
        resolve: RCTPromiseResolveBlock,
        reject _: RCTPromiseRejectBlock
    ) {
        let interstitialLoader = retrieveInterstitialLoader(for: adUnitId)
        interstitialLoader.loadAd()
        resolve(())
    }

    @objc(showInterstitial:::)
    func showInterstitial(
        _ adUnitId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let loadedAd = interstitials[adUnitId]?.loadedAd else {
            reject("INTERSTITIAL_NOT_LOADED", "Interstitial ad not loaded", nil)
            return
        }
        DispatchQueue.main.async {
            guard let window = UIApplication.shared.windows.first,
                  let viewController = window.rootViewController
            else {
                reject("VIEW_CONTROLLER_NOT_FOUND", "Root view controller not found", nil)
                return
            }
            // Fix: RN rootViewController may report safeAreaInsets.top == 0 because safe area
            // is handled in JS via react-native-safe-area-context. Set additionalSafeAreaInsets
            // so DARO SDK (AppLovin-based) positions the close [X] button below the status bar.
            let topInset = window.safeAreaInsets.top
            if topInset > 0 {
                self.savedAdditionalSafeAreaInsets = viewController.additionalSafeAreaInsets
                viewController.additionalSafeAreaInsets.top = topInset
            }
            loadedAd.show(viewController: viewController)
            resolve(())
        }
    }

    func retrieveInterstitialLoader(for unitId: String) -> DaroInterstitialAdLoader {
        if let interstitialAd = interstitials[unitId] {
            return interstitialAd.loader
        } else {
            let interstitialLoader = DaroInterstitialAdLoader(unit: DaroAdUnit(unitId: unitId))
            interstitialLoader.listener.onAdClicked = { [weak self] adInfo in
                DaroMModule.logger.debug("[DARO] Sample Interstitial Ad clicked")
                self?.sendEvent(with: .onInterstitialClickedEvent, body: adInfo?.toBody)
            }

            interstitialLoader.listener.onAdImpression = { [weak self] adInfo in
                DaroMModule.logger.debug("[DARO] Sample Interstitial Ad impression")
                self?.interstitials[unitId]?.loadedAd = nil
                self?.sendEvent(with: .onInterstitialAdImpressionRecordedEvent, body: adInfo?.toBody)
            }

            interstitialLoader.listener.onAdLoadSuccess = { [weak self] ad, adInfo in
                DaroMModule.logger.debug("[DARO] Sample Interstitial Ad loaded")
                self?.interstitials[unitId]?.loadedAd = ad
                self?.sendEvent(with: .onInterstitialLoadedEvent, body: adInfo?.toBody)
                self?.setupInterstitialListener(for: ad)
            }

            interstitialLoader.listener.onAdLoadFail = { [weak self] error in
                DaroMModule.logger.debug("[DARO] Sample Interstitial Ad failed: \(error)")
                self?.sendEvent(with: .onInterstitialLoadFailedEvent, body: error.toBody)
            }
            interstitials[unitId] = InterstitialAd(loader: interstitialLoader)
            return interstitialLoader
        }
    }

    private func setupInterstitialListener(for ad: DaroInterstitialAd) {
        ad.interstitialListener.onShown = { [weak self] adInfo in
            DaroMModule.logger.debug("[DARO] Sample Interstitial Ad displayed")
            self?.sendEvent(with: .onInterstitialDisplayedEvent, body: adInfo?.toBody)
        }

        ad.interstitialListener.onDismiss = { [weak self] adInfo in
            DaroMModule.logger.debug("[DARO] Sample Interstitial Ad hidden")
            self?.restoreAdditionalSafeAreaInsets()
            self?.sendEvent(with: .onInterstitialHiddenEvent, body: adInfo?.toBody)
        }

        ad.interstitialListener.onFailedToShow = { [weak self] adInfo, _ in
            DaroMModule.logger.debug("[DARO] Sample Interstitial Ad failed to display")
            self?.restoreAdditionalSafeAreaInsets()
            self?.sendEvent(with: .onInterstitialAdFailedToDisplayEvent, body: adInfo?.toBody)
        }
    }
}
