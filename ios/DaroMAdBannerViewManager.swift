import DaroM

@objc(DaroMAdBannerViewManager)
class DaroMAdBannerViewManager: RCTViewManager {
    override func view() -> DaroMAdBannerView {
        DaroMAdBannerView()
    }

    @objc override static func requiresMainQueueSetup() -> Bool {
        false
    }
}

final class DaroMAdBannerView: UIView {
    var adBannerView: DaroAdBannerView?

    @objc var adUnitId: String?
    @objc var adFormat: String = DaroMModule.Constants.bannerAdFormatLabel.value

    // MARK: - Events

    @objc var onAdLoadedEvent: RCTDirectEventBlock?
    @objc var onAdLoadFailedEvent: RCTDirectEventBlock?
    @objc var onAdClickedEvent: RCTDirectEventBlock?
    @objc var onAdImpressionRecordedEvent: RCTDirectEventBlock?

    init() {
        super.init(frame: CGRect.zero)
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    /// Invoked after all the JavaScript properties are set when mounting AdView
    override func didSetProps(_: [String]!) {
        initialize()
        adBannerView?.loadAd()
    }

    @objc
    func loadAd() {
        adBannerView?.loadAd()
    }

    @objc(initialize)
    func initialize() {
        guard adBannerView == nil else {
            DaroMModule.logger.warning("AdView is already initialized")
            return
        }
        guard let adUnitId else {
            DaroMModule.logger.warning("AdUnitId is required")
            return
        }

        let bannerSize = adFormat == DaroMModule.Constants.bannerAdFormatLabel.value ? DaroAdBannerSize.banner : DaroAdBannerSize.MREC
        let adUnit = DaroAdUnit(unitId: adUnitId)
        let adBannerView = DaroAdBannerView(unit: adUnit, bannerSize: bannerSize)
        setupBannerListener(for: adBannerView)

        adBannerView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(adBannerView)
        self.adBannerView = adBannerView

        NSLayoutConstraint.activate([
            adBannerView.widthAnchor.constraint(equalToConstant: bannerSize.width),
            adBannerView.heightAnchor.constraint(equalToConstant: bannerSize.height),
            adBannerView.centerXAnchor.constraint(equalTo: centerXAnchor),
            adBannerView.centerYAnchor.constraint(equalTo: centerYAnchor),
        ])
    }

    private func setupBannerListener(for bannerView: DaroAdBannerView) {
        bannerView.listener.onAdLoadSuccess = { [weak self] _, adInfo in
            self?.onAdLoadedEvent?(adInfo?.toBody)
        }

        bannerView.listener.onAdLoadFail = { [weak self] error in
            self?.onAdLoadFailedEvent?(error.toBody)
        }

        bannerView.listener.onAdImpression = { [weak self] adInfo in
            self?.onAdImpressionRecordedEvent?(adInfo?.toBody)
        }
    }
}
