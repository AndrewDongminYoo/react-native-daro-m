import UIKit

extension UIColor {
    convenience init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int = UInt64()
        Scanner(string: hex).scanHexInt64(&int)
        let alpha, red, green, blue: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (alpha, red, green, blue) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (alpha, red, green, blue) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (alpha, red, green, blue) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (alpha, red, green, blue) = (255, 0, 0, 0)
        }
        self.init(red: CGFloat(red) / 255, green: CGFloat(green) / 255, blue: CGFloat(blue) / 255, alpha: CGFloat(alpha) / 255)
    }
}

extension UILabel {
    func applyStyle(_ style: NSDictionary?) {
        baseApplyStyle(style)
        guard let style = style as? [String: Any] else { return }

        if let fontSize = style["fontSize"] as? CGFloat {
            font = font.withSize(fontSize)
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
            font = UIFont.systemFont(ofSize: font.pointSize, weight: weight)
        }

        if let fontFamily = style["fontFamily"] as? String {
            if let fontSize = style["fontSize"] as? CGFloat {
                font = UIFont(name: fontFamily, size: fontSize)
            }
        }

        if let colorHex = style["color"] as? String {
            textColor = UIColor(hex: colorHex)
        }

        if let backgroundColorHex = style["backgroundColor"] as? String {
            backgroundColor = UIColor(hex: backgroundColorHex)
        }

        if let textAlign = style["textAlign"] as? String {
            switch textAlign {
            case "center":
                textAlignment = .center
            case "right":
                textAlignment = .right
            case "left":
                textAlignment = .left
            case "justify":
                textAlignment = .justified
            default:
                textAlignment = .natural
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
                contentMode = .scaleAspectFill
            case "contain":
                contentMode = .scaleAspectFit
            case "stretch":
                contentMode = .scaleToFill
            case "repeat":
                contentMode = .scaleToFill // iOS에서는 repeat이 없어서 scaleToFill로 대체
            case "center":
                contentMode = .center
            default:
                contentMode = .scaleAspectFill
            }
        }
        if let aspectRatio = style["aspectRatio"] as? CGFloat {
            contentMode = .scaleAspectFit
            removeConstraints(constraints.filter {
                $0.firstAttribute == .width && $0.secondAttribute == .height
            })
            let constraint = NSLayoutConstraint(
                item: self,
                attribute: .width,
                relatedBy: .equal,
                toItem: self,
                attribute: .height,
                multiplier: aspectRatio,
                constant: 0
            )
            addConstraint(constraint)
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
                contentHorizontalAlignment = .center
            case "right":
                contentHorizontalAlignment = .right
            case "left":
                contentHorizontalAlignment = .left
            default:
                contentHorizontalAlignment = .center
            }
        }
    }
}

extension UIView {
    func baseApplyStyle(_ style: NSDictionary?) {
        guard let style = style as? [String: Any] else { return }
        if let tintColorHex = style["tintColor"] as? String {
            tintColor = UIColor(hex: tintColorHex)
        }

        if let cornerRadius = style["borderRadius"] as? CGFloat {
            layer.cornerRadius = cornerRadius
            clipsToBounds = true
        }

        if let backgroundColorHex = style["backgroundColor"] as? String {
            backgroundColor = UIColor(hex: backgroundColorHex)
        }

        if let clipsToBounds = style["clipsToBounds"] as? Bool {
            self.clipsToBounds = clipsToBounds
        }

        if let borderWidth = style["borderWidth"] as? CGFloat {
            layer.borderWidth = borderWidth
        }

        if let borderColorHex = style["borderColor"] as? String {
            layer.borderColor = UIColor(hex: borderColorHex).cgColor
        }

        if let shadowColorHex = style["shadowColor"] as? String {
            layer.shadowColor = UIColor(hex: shadowColorHex).cgColor
        }

        if let shadowOffset = style["shadowOffset"] as? [String: CGFloat] {
            layer.shadowOffset = CGSize(
                width: shadowOffset["width"] ?? 0,
                height: shadowOffset["height"] ?? 0
            )
        }

        if let shadowOpacity = style["shadowOpacity"] as? Float {
            layer.shadowOpacity = shadowOpacity
        }

        if let shadowRadius = style["shadowRadius"] as? CGFloat {
            layer.shadowRadius = shadowRadius
        }
    }
}
