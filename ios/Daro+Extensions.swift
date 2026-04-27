import UIKit

extension UIColor {
  convenience init(hex: String) {
    let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    var int = UInt64()
    Scanner(string: hex).scanHexInt64(&int)
    let a, r, g, b: UInt64
    switch hex.count {
    case 3: // RGB (12-bit)
      (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
    case 6: // RGB (24-bit)
      (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
    case 8: // ARGB (32-bit)
      (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
    default:
      (a, r, g, b) = (255, 0, 0, 0)
    }
    self.init(red: CGFloat(r) / 255, green: CGFloat(g) / 255, blue: CGFloat(b) / 255, alpha: CGFloat(a) / 255)
  }
}

extension UILabel {
  func applyStyle(_ style: NSDictionary?) {
    baseApplyStyle(style)
    guard let style = style as? [String: Any] else { return }

    if let fontSize = style["fontSize"] as? CGFloat {
      self.font = self.font.withSize(fontSize)
    }

    if let fontWeight = style["fontWeight"] as? String {
      let weight: UIFont.Weight
      switch fontWeight {
      case "100": weight = .ultraLight
      case "200": weight = .thin
      case "300": weight = .light
      case "400", "normal": weight = .regular
      case "500": weight = .medium
      case "600": weight = .semibold
      case "700", "bold": weight = .bold
      case "800": weight = .heavy
      case "900": weight = .black
      default: weight = .regular
      }
      self.font = UIFont.systemFont(ofSize: self.font.pointSize, weight: weight)
    }

    if let fontFamily = style["fontFamily"] as? String {
      if let fontSize = style["fontSize"] as? CGFloat {
        self.font = UIFont(name: fontFamily, size: fontSize)
      }
    }

    if let colorHex = style["color"] as? String {
      self.textColor = UIColor(hex: colorHex)
    }

    if let backgroundColorHex = style["backgroundColor"] as? String {
      self.backgroundColor = UIColor(hex: backgroundColorHex)
    }

    if let textAlign = style["textAlign"] as? String {
      switch textAlign {
      case "center":
        self.textAlignment = .center
      case "right":
        self.textAlignment = .right
      case "left":
        self.textAlignment = .left
      case "justify":
        self.textAlignment = .justified
      default:
        self.textAlignment = .natural
      }
    }

    if let numberOfLines = style["numberOfLines"] as? Int {
      self.numberOfLines = numberOfLines
    }

    if let lineBreakMode = style["lineBreakMode"] as? String {
      switch lineBreakMode {
      case "head":
        self.lineBreakMode = .byTruncatingHead
      case "middle":
        self.lineBreakMode = .byTruncatingMiddle
      case "tail":
        self.lineBreakMode = .byTruncatingTail
      case "clip":
        self.lineBreakMode = .byClipping
      case "word-wrap":
        self.lineBreakMode = .byWordWrapping
      default:
        self.lineBreakMode = .byTruncatingTail
      }
    }
  }
}

extension UIImageView {
  func applyStyle(_ style: NSDictionary?) {
    baseApplyStyle(style)
    guard let style = style as? [String: Any] else { return }

    if let resizeMode = style["resizeMode"] as? String {
      switch resizeMode {
      case "cover":
        self.contentMode = .scaleAspectFill
      case "contain":
        self.contentMode = .scaleAspectFit
      case "stretch":
        self.contentMode = .scaleToFill
      case "repeat":
        self.contentMode = .scaleToFill // iOS에서는 repeat이 없어서 scaleToFill로 대체
      case "center":
        self.contentMode = .center
      default:
        self.contentMode = .scaleAspectFill
      }
    }
    if let aspectRatio = style["aspectRatio"] as? CGFloat {
      self.contentMode = .scaleAspectFit
      let constraint = NSLayoutConstraint(
        item: self,
        attribute: .width,
        relatedBy: .equal,
        toItem: self,
        attribute: .height,
        multiplier: aspectRatio,
        constant: 0
      )
      self.addConstraint(constraint)
    }
  }
}

extension UIButton {
  func applyStyle(_ style: NSDictionary?) {
    titleLabel?.applyStyle(style)
    baseApplyStyle(style)
    guard let style = style as? [String: Any] else { return }
    if let colorHex = style["color"] as? String {
      setTitleColor(UIColor(hex: colorHex), for: .normal)
    }
    if let textAlign = style["textAlign"] as? String {
      switch textAlign {
      case "center":
        self.contentHorizontalAlignment = .center
      case "right":
        self.contentHorizontalAlignment = .right
      case "left":
        self.contentHorizontalAlignment = .left
      default:
        self.contentHorizontalAlignment = .center
      }
    }
  }
}

extension UIView {
  func baseApplyStyle(_ style: NSDictionary?) {
    guard let style = style as? [String: Any] else { return }
    if let tintColorHex = style["tintColor"] as? String {
      self.tintColor = UIColor(hex: tintColorHex)
    }

    if let cornerRadius = style["borderRadius"] as? CGFloat {
      self.layer.cornerRadius = cornerRadius
      self.clipsToBounds = true
    }

    if let backgroundColorHex = style["backgroundColor"] as? String {
      self.backgroundColor = UIColor(hex: backgroundColorHex)
    }

    if let clipsToBounds = style["clipsToBounds"] as? Bool {
      self.clipsToBounds = clipsToBounds
    }

    if let borderWidth = style["borderWidth"] as? CGFloat {
      self.layer.borderWidth = borderWidth
    }

    if let borderColorHex = style["borderColor"] as? String {
      self.layer.borderColor = UIColor(hex: borderColorHex).cgColor
    }

    if let shadowColorHex = style["shadowColor"] as? String {
      self.layer.shadowColor = UIColor(hex: shadowColorHex).cgColor
    }

    if let shadowOffset = style["shadowOffset"] as? [String: CGFloat] {
      self.layer.shadowOffset = CGSize(
        width: shadowOffset["width"] ?? 0,
        height: shadowOffset["height"] ?? 0
      )
    }

    if let shadowOpacity = style["shadowOpacity"] as? Float {
      self.layer.shadowOpacity = shadowOpacity
    }

    if let shadowRadius = style["shadowRadius"] as? CGFloat {
      self.layer.shadowRadius = shadowRadius
    }
  }
}
