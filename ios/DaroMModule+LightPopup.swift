import DaroM
import UIKit
// MARK: - LightPopup Ad
extension DaroMModule {

  @objc(isLightPopupReady:::)
  func isLightPopupReady(
    _ adUnitId: String,
    resolve: RCTPromiseResolveBlock,
    reject: RCTPromiseRejectBlock
  ) {
    if !Self.sdkInitialized {
      DaroMModule.logger.debug("[DaroMMobileAds] !isInitialized")
      resolve(false)
      return
    }
    resolve(lightPopups[adUnitId]?.loadedAd != nil)
  }

  @objc(loadLightPopup:::)
  func loadLightPopup(
    _ adUnitId: String,
    resolve: RCTPromiseResolveBlock,
    reject: RCTPromiseRejectBlock
  ) {
    let lightPopupLoader = retrieveLightPopupLoader(for: adUnitId)
    lightPopupLoader.loadAd()
    resolve(Void())
  }

  @objc(showLightPopup:::)
  func showLightPopup(
    _ adUnitId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let loadedAd = lightPopups[adUnitId]?.loadedAd else {
      reject("LIGHTPOPUP_NOT_LOADED", "LightPopup ad not loaded", nil)
      return
    }
    executeOnMainThread { [weak self] in
      guard let viewController = UIApplication.shared.windows.first?.rootViewController else {
        reject("VIEW_CONTROLLER_NOT_FOUND", "Root view controller not found", nil)
        return
      }
      self?.applyStoredConfiguration(to: loadedAd, for: adUnitId)
      loadedAd.show(viewController: viewController)
      resolve(Void())
    }
  }

  @objc(setLightPopupAdConfiguration::::)
    func setLightPopupAdConfiguration(
      _ adUnitId: String,
      configuration: [String: Any],
      resolve: RCTPromiseResolveBlock,
      reject: RCTPromiseRejectBlock
    ) {
      guard let loadedAd = lightPopups[adUnitId]?.loadedAd else {
        lightPopupConfigurations[adUnitId] = configuration
        resolve(Void())
        return
      }
      executeOnMainThread { [weak self] in
          self?.applyStoredConfiguration(to: loadedAd, for: adUnitId)
      }
      resolve(Void())
    }

    func applyStoredConfiguration(to ad: DaroLightPopupAd, for unitId: String) {
        if let configuration = lightPopupConfigurations[unitId] {
            let lightPopupConfig = DaroLightPopupConfiguration()

            func setColorIfValid(_ key: String, setter: (UIColor) -> Void) {
              if let colorString = configuration[key] as? String {
                setter(UIColor(hex: colorString))
              }
            }

            setColorIfValid("backgroundColor") { lightPopupConfig.backgroundColor = $0 }
            setColorIfValid("cardViewBackgroundColor") { lightPopupConfig.cardViewBackgroundColor = $0 }
            setColorIfValid("adMarkLabelTextColor") { lightPopupConfig.adMarkLabelTextColor = $0 }
            setColorIfValid("adMarkLabelBackgroundColor") { lightPopupConfig.adMarkLabelBackgroundColor = $0 }
            setColorIfValid("closeButtonTextColor") { lightPopupConfig.closeButtonTextColor = $0 }
            setColorIfValid("titleTextColor") { lightPopupConfig.titleTextColor = $0 }
            setColorIfValid("bodyTextColor") { lightPopupConfig.bodyTextColor = $0 }
            setColorIfValid("ctaButtonTextColor") { lightPopupConfig.ctaButtonTextColor = $0 }
            setColorIfValid("ctaButtonBackgroundColor") { lightPopupConfig.ctaButtonBackgroundColor = $0 }

            if let closeButtonText = configuration["closeButtonText"] as? String {
              lightPopupConfig.closeButtonText = closeButtonText
            }

            ad.configuration = lightPopupConfig
        }
    }

  func retrieveLightPopupLoader(for unitId: String) -> DaroLightPopupAdLoader {
    if let lightPopupAd = lightPopups[unitId] {
      return lightPopupAd.loader
    } else {
      let lightPopupLoader = DaroLightPopupAdLoader(unit: DaroAdUnit(unitId: unitId))

      lightPopupLoader.listener.onAdClicked = { [weak self] adInfo in
        self?.sendEvent(with: .onLightPopupClickedEvent, body: adInfo?.toBody)
      }

      lightPopupLoader.listener.onAdImpression = { [weak self] adInfo in
        self?.lightPopups[unitId]?.loadedAd = nil
        self?.sendEvent(with: .onLightPopupAdImpressionRecordedEvent, body: adInfo?.toBody)
      }

      lightPopupLoader.listener.onAdLoadSuccess = { [weak self] ad, adInfo in
        self?.lightPopups[unitId]?.loadedAd = ad
        self?.sendEvent(with: .onLightPopupLoadedEvent, body: adInfo?.toBody)
        self?.setupLightPopupListener(for: ad)
      }

      lightPopupLoader.listener.onAdLoadFail = { [weak self] error in
        self?.sendEvent(with: .onLightPopupLoadFailedEvent, body: error.toBody)
      }

      self.lightPopups[unitId] = LightPopupAd(loader: lightPopupLoader)
      return lightPopupLoader
    }
  }

  private func setupLightPopupListener(for ad: DaroLightPopupAd) {
    ad.lightPopupAdListener.onShown = { [weak self] adInfo in
      self?.sendEvent(with: .onLightPopupDisplayedEvent, body: adInfo?.toBody)
    }

    ad.lightPopupAdListener.onDismiss = { [weak self] adInfo in
      self?.sendEvent(with: .onLightPopupHiddenEvent, body: adInfo?.toBody)
    }

    ad.lightPopupAdListener.onFailedToShow = { [weak self] adInfo, error in
      self?.sendEvent(with: .onLightPopupAdFailedToDisplayEvent, body: adInfo?.toBody)
    }
  }

  // 메인 스레드에서 실행하는 헬퍼 메서드
  private func executeOnMainThread<T>(_ block: () -> T) -> T {
    if Thread.isMainThread {
      return block()
    } else {
      var result: T!
      DispatchQueue.main.sync {
        result = block()
      }
      return result
    }
  }
}

extension DaroLightPopupConfiguration {
    convenience init(from configuration: [String: Any]) {
        self.init()
        func setColorIfValid(_ key: String, setter: (UIColor) -> Void) {
            if let colorString = configuration[key] as? String {
                setter(UIColor(hex: colorString))
            }
        }

        setColorIfValid("backgroundColor") { self.backgroundColor = $0 }
        setColorIfValid("cardViewBackgroundColor") { self.cardViewBackgroundColor = $0 }
        setColorIfValid("adMarkLabelTextColor") { self.adMarkLabelTextColor = $0 }
        setColorIfValid("adMarkLabelBackgroundColor") { self.adMarkLabelBackgroundColor = $0 }
        setColorIfValid("closeButtonTextColor") { self.closeButtonTextColor = $0 }
        setColorIfValid("titleTextColor") { self.titleTextColor = $0 }
        setColorIfValid("bodyTextColor") { self.bodyTextColor = $0 }
    }
}
