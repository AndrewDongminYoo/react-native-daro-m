import AppLovinSDK
import DaroM
import os.log

@objc(DaroMModule)
class DaroMModule: RCTEventEmitter {

    // 중앙집중식 로거 - 다른 파일에서도 사용 가능
    static let logger = Logger(subsystem: "com.darom.react-native", category: "DaroMModule")

    enum Event: String, CaseIterable {

        // MARK: - Interstitial Ad

        case onInterstitialLoadedEvent = "ON_INTERSTITIAL_LOADED_EVENT"
        case onInterstitialLoadFailedEvent = "ON_INTERSTITIAL_LOAD_FAILED_EVENT"
        case onInterstitialClickedEvent = "ON_INTERSTITIAL_CLICKED_EVENT"
        case onInterstitialDisplayedEvent = "ON_INTERSTITIAL_DISPLAYED_EVENT"
        case onInterstitialAdFailedToDisplayEvent = "ON_INTERSTITIAL_AD_FAILED_TO_DISPLAY_EVENT"
        case onInterstitialHiddenEvent = "ON_INTERSTITIAL_HIDDEN_EVENT"
        case onInterstitialAdImpressionRecordedEvent = "ON_INTERSTITIAL_AD_IMPRESSION_RECORDED"

        // MARK: - Rewarded Ad

        case onRewardedAdLoadedEvent = "ON_REWARDED_AD_LOADED_EVENT"
        case onRewardedAdLoadFailedEvent = "ON_REWARDED_AD_LOAD_FAILED_EVENT"
        case onRewardedAdClickedEvent = "ON_REWARDED_AD_CLICKED_EVENT"
        case onRewardedAdDisplayedEvent = "ON_REWARDED_AD_DISPLAYED_EVENT"
        case onRewardedAdFailedToDisplayEvent = "ON_REWARDED_AD_FAILED_TO_DISPLAY_EVENT"
        case onRewardedAdHiddenEvent = "ON_REWARDED_AD_HIDDEN_EVENT"
        case onRewardedAdReceivedRewardEvent = "ON_REWARDED_AD_RECEIVED_REWARD_EVENT"
        case onRewardedAdImpressionRecordedEvent = "ON_REWARDED_AD_IMPRESSION_RECORDED"

        // MARK: - AppOpen Ad

        case onAppOpenAdLoadedEvent = "ON_APPOPEN_AD_LOADED_EVENT"
        case onAppOpenAdLoadFailedEvent = "ON_APPOPEN_AD_LOAD_FAILED_EVENT"
        case onAppOpenAdClickedEvent = "ON_APPOPEN_AD_CLICKED_EVENT"
        case onAppOpenAdDisplayedEvent = "ON_APPOPEN_AD_DISPLAYED_EVENT"
        case onAppOpenAdFailedToDisplayEvent = "ON_APPOPEN_AD_FAILED_TO_DISPLAY_EVENT"
        case onAppOpenAdHiddenEvent = "ON_APPOPEN_AD_HIDDEN_EVENT"
        case onAppOpenAdImpressionRecordedEvent = "ON_APPOPEN_AD_IMPRESSION_RECORDED"

      // MARK: - LightPopup Ad
      case onLightPopupLoadedEvent = "ON_LIGHTPOPUP_LOADED_EVENT"
      case onLightPopupLoadFailedEvent = "ON_LIGHTPOPUP_LOAD_FAILED_EVENT"
      case onLightPopupClickedEvent = "ON_LIGHTPOPUP_CLICKED_EVENT"
      case onLightPopupDisplayedEvent = "ON_LIGHTPOPUP_DISPLAYED_EVENT"
      case onLightPopupAdFailedToDisplayEvent = "ON_LIGHTPOPUP_AD_FAILED_TO_DISPLAY_EVENT"
      case onLightPopupHiddenEvent = "ON_LIGHTPOPUP_HIDDEN_EVENT"
      case onLightPopupAdImpressionRecordedEvent = "ON_LIGHTPOPUP_AD_IMPRESSION_RECORDED"

        static var supportedEvents: [String] {
            allCases.map(\.rawValue)
        }

        static var constantsToExports: [AnyHashable: Any] {
            Event.allCases.reduce(into: [:]) { result, event in
                result[event.rawValue] = event.rawValue
            }
        }
    }

    enum Constants: String, CaseIterable {
        case bannerAdFormatLabel = "BANNER_AD_FORMAT_LABEL"
        case mrecAdFormatLabel = "MREC_AD_FORMAT_LABEL"

        var value: String {
            switch self {
            case .bannerAdFormatLabel:
              return DaroAdFormat.banner.rawValue
            case .mrecAdFormatLabel:
              return DaroAdFormat.mrec.rawValue
            }
        }

        static var constantsToExports: [AnyHashable: Any] {
            allCases.reduce(into: [:]) { result, constant in
                result[constant.rawValue] = constant.value
            }
        }
    }

  static var sdkInitialized: Bool = false
    // 광고 인스턴스 저장소
  internal var interstitials: [String: InterstitialAd] = [:]
  internal var rewardedAds: [String: RewardedAd] = [:]
  internal var appOpenAds: [String: AppOpenAd] = [:]
  internal var lightPopups: [String: LightPopupAd] = [:]
  internal var lightPopupConfigurations: [String: [String: Any]] = [:]
  internal var savedAdditionalSafeAreaInsets: UIEdgeInsets?

    // MARK: - SDK 초기화 및 설정

    @objc(isInitialized::)
    func isInitialized(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
      resolve(Self.sdkInitialized)
    }

  @objc(initializeSdk::)
  func initializeSdk(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    // 이미 초기화되었는지 확인
    if Self.sdkInitialized {
      Self.logger.debug("SDK already initialized, returning success")
      resolve(Void())
      return
    }

    // 초기화 진행
    DaroAds.shared.logLevel = .debug
    DaroAds.shared.initialized { error in
      if let error {
        Self.logger.error("SDK initialization failed: \(error.localizedDescription)")
        reject("INIT_ERROR", error.localizedDescription, error)
      } else {
        Self.sdkInitialized = true
        Self.logger.info("SDK initialized successfully")
        resolve(Void())
      }
    }
  }

    @objc(showMediationDebugger::)
    func showMediationDebugger(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
      ALSdk.shared().showMediationDebugger()
      resolve(Void())
    }

    @objc(setUserId:::)
    func setUserId(userId: String, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
      DaroAds.shared.userId = userId
         resolve(Void())
    }

  class InterstitialAd {
    let loader: DaroInterstitialAdLoader
    var loadedAd: DaroInterstitialAd?

    init(loader: DaroInterstitialAdLoader) {
      self.loader = loader
    }
  }

  class RewardedAd {
    let loader: DaroRewardedAdLoader
    var loadedAd: DaroRewardedAd?

    init(loader: DaroRewardedAdLoader) {
      self.loader = loader
    }
  }

  class AppOpenAd {
    let loader: DaroAppOpenAdLoader
    var loadedAd: DaroAppOpenAd?

    init(loader: DaroAppOpenAdLoader) {
      self.loader = loader
    }
  }

  class LightPopupAd {
    let loader: DaroLightPopupAdLoader
    var loadedAd: DaroLightPopupAd?

    init(loader: DaroLightPopupAdLoader) {
      self.loader = loader
    }
  }
}

// MARK: - Constants
extension DaroMModule {

    // https://reactnative.dev/docs/legacy/native-modules-ios#sending-events-to-javascript
    // Sending Events to JavaScript
    override func supportedEvents() -> [String]! {
        Event.supportedEvents
    }

    // https://reactnative.dev/docs/legacy/native-modules-ios#exporting-constants
    // Exporting Constants
    override func constantsToExport() -> [AnyHashable: Any]! {
        Event.constantsToExports.merging(Constants.constantsToExports) { (_, new) in new }
    }
}

// MARK: - Helpers
extension DaroMModule {
  func sendEvent(with event: Event, body: Any?) {
    sendEvent(withName: event.rawValue, body: body)
  }

  func restoreAdditionalSafeAreaInsets() {
    guard let savedInsets = savedAdditionalSafeAreaInsets else { return }
    DispatchQueue.main.async {
      UIApplication.shared.windows.first?.rootViewController?.additionalSafeAreaInsets = savedInsets
    }
    savedAdditionalSafeAreaInsets = nil
  }
}

extension DaroAdInfo {
  var toBody: [String: Any] {
    return [
      "adUnitId": self.adUnitId,
      "latencyMillis": self.latency as Any,
    ]
  }
}

extension DaroError {
  var toBody: [String: Any] {
    return [
      "code": self.code,
      "message": self.message,
    ]
  }
}
