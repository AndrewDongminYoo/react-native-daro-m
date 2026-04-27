import Combine
import DaroM
import UIKit

@objc(DaroMNativeAdViewManager)
class DaroMNativeAdViewManager: RCTViewManager {
  override func view() -> RNDaroMNativeAdView {
    RNDaroMNativeAdView(bridge: bridge)
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(loadAd:)
  func loadAd(viewTag: NSNumber) {
    bridge?.uiManager.addUIBlock({ uiManager, viewRegistry in
      if let view = viewRegistry?[viewTag] as? RNDaroMNativeAdView {
        view._internalAdView?.loadAd()
      }
    })
  }
}

final class RNDaroMNativeAdView: UIView, RenderDelegate {

  var _internalAdView: BridgeNativeAdView?
  var adUnit: DaroAdUnit

  @objc var adUnitId: String?
  @objc var titleViewStyleProps: NSDictionary? {
    didSet {
      _internalTitleLabel.applyStyle(titleViewStyleProps)
    }
  }
  @objc var titleView: NSNumber?
  @objc var bodyViewStyleProps: NSDictionary? {
    didSet {
      _internalBodyLabel.applyStyle(bodyViewStyleProps)
    }
  }
  @objc var bodyView: NSNumber?
  @objc var callToActionViewStyleProps: NSDictionary? {
    didSet {
      _internalFakeCTAButton.applyStyle(callToActionViewStyleProps)
    }
  }
  @objc var callToActionView: NSNumber?
  @objc var iconViewStyleProps: NSDictionary? {
    didSet {
      _internalIconImageView.applyStyle(iconViewStyleProps)
    }
  }
  @objc var iconView: NSNumber?
  @objc var mediaViewStyleProps: NSDictionary? {
    didSet {
      _internalMediaView.baseApplyStyle(mediaViewStyleProps)
    }
  }
  @objc var mediaView: NSNumber?

  var _internalTitleLabel: UILabel = {
    let label = UILabel()
    label.isUserInteractionEnabled = false
    label.clipsToBounds = true
    label.font = .systemFont(ofSize: 15, weight: .bold)
    label.textColor = UIColor.black
    return label
  }()

  var _internalBodyLabel: UILabel = {
    let label = UILabel()
    label.isUserInteractionEnabled = false
    label.clipsToBounds = true
    label.font = .systemFont(ofSize: 15, weight: .regular)
    label.textColor = UIColor.black
    return label
  }()

  let _internalMediaView: UIView = UIView()

  var _internalIconImageView: UIImageView = {
    let view = UIImageView()
    view.contentMode = .scaleAspectFill
    return view
  }()

  /// Call to Action
  var _internalCallToActionButton: UIButton = {
    let button = UIButton()
    button.translatesAutoresizingMaskIntoConstraints = false
    button.titleLabel?.font = .systemFont(ofSize: 20, weight: .bold)
    button.setTitleColor(.white, for: .normal)
    return button
  }()

  var _internalFakeCTAButton: UIButton = {
    let button = UIButton()
    button.translatesAutoresizingMaskIntoConstraints = false
    button.setTitleColor(.white, for: .normal)
    return button
  }()

  @objc var onAdLoadedEvent: RCTDirectEventBlock?
  @objc var onAdLoadFailedEvent: RCTDirectEventBlock?
  @objc var onAdClickedEvent: RCTDirectEventBlock?
  @objc var onAdImpressionRecordedEvent: RCTDirectEventBlock?

  @Atomic private var isAdUnitIdSet: Bool = false
  @Atomic private var isBindBridge: Bool = false


  var bridge: RCTBridge?

  convenience init(bridge: RCTBridge?) {
    self.init()
    self.bridge = bridge
  }

  required init() {
    self.adUnit = DaroAdUnit(unitId: "")
    super.init(frame: .zero)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  /// Invoked after all the JavaScript properties are set when mounting AdView
  /// after all the user's asset views are mounted, following the 1st event
  /// 두 번 호출됨. 첫번째는 adUnitId가 설정된 후, 두번째는 모든 subview들이 마운트된 후
  override func didSetProps(_ changedProps: [String]) {
    guard let adUnitId else {
      DaroMModule.logger.warning("[native-ad] AdUnitId is required")
      return
    }
    guard changedProps.isEmpty == false else { return }
    DaroMModule.logger.info("[native-ad] \(#function): \(changedProps)")
    guard !isAdUnitIdSet else { return }
    isAdUnitIdSet = true
    makeAdViews(unitId: adUnitId)
    self._internalAdView?.loadAd()
  }

  override func didMoveToWindow() {
      super.didMoveToWindow()

      guard window != nil else { return }

      DispatchQueue.main.async { [weak self] in
          self?.bindBridgeViews()
      }
  }

  private func makeAdViews(unitId: String) {
    self.adUnit = DaroAdUnit(unitId: unitId)
    let native = BridgeNativeAdView(unit: adUnit)
    native.delegate = self
    self._internalAdView = native
    super.addSubview(native)
    native.pinToEdges(to: self)

    self._internalAdView?.listener.onAdLoadSuccess = { [weak self] ad, adInfo in
//      print("[QWER] onSuccess \(ad) \(adInfo)")
      self?.onAdLoadedEvent?(adInfo?.toBody)
    }
    self._internalAdView?.listener.onAdLoadFail = { [weak self] error in
//      print("[QWER] onFailure \(error)")
      self?.onAdLoadFailedEvent?(error.toBody)
    }
    self._internalAdView?.listener.onAdImpression = { [weak self] adInfo in
//      print("[QWER] adImpression\(adInfo)")
      self?.onAdImpressionRecordedEvent?(adInfo?.toBody)
    }
    self._internalAdView?.listener.onAdClicked = { [weak self] adInfo in
//      print("[QWER] adClicked \(adInfo)")
      self?.onAdClickedEvent?(adInfo?.toBody)
    }
  }

  private func getBridgeView(tag: NSNumber?) -> UIView? {
    guard let tag, let bridgeView = bridge?.uiManager.view(forReactTag: tag) else {
      return nil
    }
    return bridgeView
  }

  private func bindBridgeViews() {
    guard !isBindBridge else { return }
    isBindBridge = true
    var bindTitleLabel: UILabel?
    if let bridgeTitleView = getBridgeView(tag: titleView) {
      _internalTitleLabel.pinToEdges(to: bridgeTitleView)
      bindTitleLabel = _internalTitleLabel
    }

    var bindBodyLabel: UILabel?
    if let bridgeBodyView = getBridgeView(tag: bodyView) {
      _internalBodyLabel.pinToEdges(to: bridgeBodyView)
      bindBodyLabel = _internalBodyLabel
    }

    if let bridgeCallToActionView = getBridgeView(tag: callToActionView) {
      _internalFakeCTAButton.pinToEdges(to: bridgeCallToActionView)
    }

    var bindIconImageView: UIImageView?
    if let bridgeIconView = getBridgeView(tag: iconView) {
      _internalIconImageView.pinToEdges(to: bridgeIconView)
      bindIconImageView = _internalIconImageView
    }

    var bindMediaView: UIView?
    if let bridgeMediaView = getBridgeView(tag: mediaView) {
      _internalMediaView.pinToEdges(to: bridgeMediaView)
      bindMediaView = _internalMediaView
    }

    _internalCallToActionButton.pinToEdges(to: self)

    _internalAdView?.bindViews(
      titleLabel: bindTitleLabel,
      bodyLabel: bindBodyLabel,
      iconImageView: bindIconImageView,
      mediaContentView: bindMediaView,
      callToActionButton: _internalCallToActionButton
    )
  }

  func renderAd(for nativeAd: DaroAdNative) {
    self._internalFakeCTAButton.setTitle(_internalCallToActionButton.titleLabel?.text, for: .normal)
    self._internalCallToActionButton.setTitle("", for: .normal)
    self._internalCallToActionButton.alpha = 1
  }

  override func addSubview(_ view: UIView) {
    self._internalAdView?.addSubview(view)
  }
}

protocol RenderDelegate: AnyObject {
  func renderAd(for nativeAd: DaroAdNative)
}

class BridgeNativeAdView: DaroAdNativeView {
  weak var delegate: RenderDelegate?

  override func renderAd(for nativeAd: DaroAdNative, loader: any AdNativeLoadable) {
    super.renderAd(for: nativeAd, loader: loader)
    self.delegate?.renderAd(for: nativeAd)
  }
}

@propertyWrapper
private struct Atomic<Value> {
  private var value: Value
  private let lock = NSLock()

  init(wrappedValue value: Value) {
    self.value = value
  }

  var wrappedValue: Value {
    get {
      lock.lock()
      defer { lock.unlock() }
      return value
    }
    set {
      lock.lock()
      value = newValue
      lock.unlock()
    }
  }
}

private extension UIView {
  func pinToEdges(to: UIView) {
    translatesAutoresizingMaskIntoConstraints = false
    if self.superview != to {
      removeFromSuperview()
      to.addSubview(self)
    }
    NSLayoutConstraint.activate([
      topAnchor.constraint(equalTo: to.topAnchor),
      bottomAnchor.constraint(equalTo: to.bottomAnchor),
      leftAnchor.constraint(equalTo: to.leftAnchor),
      rightAnchor.constraint(equalTo: to.rightAnchor),
    ])
  }
}
