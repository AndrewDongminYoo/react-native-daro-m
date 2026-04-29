import DaroM


extension DaroMModule {
  @objc(isRewardedAdReady:::)
    func isRewardedAdReady(
      _ adUnitId: String,
      resolve: RCTPromiseResolveBlock,
      reject: RCTPromiseRejectBlock
    ) {
      if !Self.sdkInitialized {
        DaroMModule.logger.debug("[DaroMMobileAds] !isInitialized")
        resolve(false)
        return
      }

      resolve(rewardedAds[adUnitId]?.loadedAd != nil)
    }

    @objc(loadRewardedAd:::)
    func loadRewardedAd(
      _ adUnitId: String,
      resolve: RCTPromiseResolveBlock,
      reject: RCTPromiseRejectBlock
    ) {
      let rewardedLoader = retrieveRewardedLoader(for: adUnitId)
      rewardedLoader.loadAd()
      resolve(Void())
    }

    @objc(showRewardedAd::::)
    func showRewardedAd(
      _ adUnitId: String,
      customData: String?,
      resolve: @escaping RCTPromiseResolveBlock,
      reject: @escaping RCTPromiseRejectBlock
    ) {
      guard let loadedAd = rewardedAds[adUnitId]?.loadedAd else {
        reject("REWARDED_AD_NOT_LOADED", "Rewarded ad not loaded", nil)
        return
      }
      DispatchQueue.main.async {
        guard let window = UIApplication.shared.windows.first,
              let viewController = window.rootViewController else {
          reject("VIEW_CONTROLLER_NOT_FOUND", "Root view controller not found", nil)
          return
        }
        // Fix: same safe area patch as Interstitial — apply window's actual insets so
        // DARO SDK positions the close [X] button below the status bar on notched devices.
        let topInset = window.safeAreaInsets.top
        if topInset > 0 {
          self.savedAdditionalSafeAreaInsets = viewController.additionalSafeAreaInsets
          viewController.additionalSafeAreaInsets.top = topInset
        }
        if let customData {
          loadedAd.setCustomData(customData)
        }
        loadedAd.show(viewController: viewController)
        resolve(Void())
      }
    }

    func retrieveRewardedLoader(for unitId: String) -> DaroRewardedAdLoader {
      if let rewardedAd = rewardedAds[unitId] {
        return rewardedAd.loader
      } else {
        let rewardedAdLoader = DaroRewardedAdLoader(unit: DaroAdUnit(unitId: unitId))
        rewardedAdLoader.listener.onAdClicked = { [weak self] adInfo in
          DaroMModule.logger.debug("[DARO] Sample Rewarded Ad clicked")
          self?.sendEvent(with: .onRewardedAdClickedEvent, body: adInfo?.toBody)
        }

        rewardedAdLoader.listener.onAdImpression = { [weak self] adInfo in
          DaroMModule.logger.debug("[DARO] Sample Rewarded Ad impression")
          self?.rewardedAds[unitId]?.loadedAd = nil
          self?.sendEvent(with: .onRewardedAdImpressionRecordedEvent, body: adInfo?.toBody)
        }

        rewardedAdLoader.listener.onAdLoadSuccess = { [weak self] ad, adInfo in
          DaroMModule.logger.debug("[DARO] Sample Rewarded Ad loaded")
          self?.rewardedAds[unitId]?.loadedAd = ad
          self?.sendEvent(with: .onRewardedAdLoadedEvent, body: adInfo?.toBody)
          self?.setupRewardedListener(for: ad)
        }

        rewardedAdLoader.listener.onAdLoadFail = { [weak self] error in
          DaroMModule.logger.debug("[DARO] Sample Rewarded Ad failed to load: \(error)")
          self?.sendEvent(with: .onRewardedAdLoadFailedEvent, body: error.toBody)
        }
        self.rewardedAds[unitId] = RewardedAd(loader: rewardedAdLoader)
        return rewardedAdLoader
      }
    }

    private func setupRewardedListener(for ad: DaroRewardedAd) {
      ad.rewardedAdListener.onShown = { [weak self] adInfo in
        DaroMModule.logger.debug("[DARO] Sample Rewarded Ad displayed")
        self?.sendEvent(with: .onRewardedAdDisplayedEvent, body: adInfo?.toBody)
      }

      ad.rewardedAdListener.onDismiss = { [weak self] adInfo in
        DaroMModule.logger.debug("[DARO] Sample Rewarded Ad hidden")
        self?.restoreAdditionalSafeAreaInsets()
        self?.sendEvent(with: .onRewardedAdHiddenEvent, body: adInfo?.toBody)
      }

      ad.rewardedAdListener.onFailedToShow = { [weak self] adInfo, error in
        DaroMModule.logger.debug("[DARO] Sample Rewarded Ad failed to display: \(error)")
        self?.restoreAdditionalSafeAreaInsets()
        self?.sendEvent(with: .onRewardedAdFailedToDisplayEvent, body: adInfo?.toBody)
      }

      ad.rewardedAdListener.onEarnedReward = { [weak self] adInfo, rewardItem in
        DaroMModule.logger.debug("[DARO] Sample Rewarded Ad received reward")
        self?.sendEvent(with: .onRewardedAdReceivedRewardEvent, body: rewardItem?.toBody(unitId: adInfo?.adUnitId ?? ""))
      }
    }
}

private extension DaroRewardedItem {
  func toBody(unitId: String) -> [String: Any] {
    return [
      "adUnitId": unitId,
      "rewardLabel": self.rewardType,
      "rewardAmount": self.amount,
    ]
  }
}
