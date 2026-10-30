import SwiftUI

/// Les tokens de Mainline. `MainlineTheme.standard` est généré depuis DS-Studio ;
/// `LiveTheme` le remplace en direct pendant le développement.
public struct MainlineTheme: Equatable, Sendable {
    public var brand: Color
    public var brandHover: Color
    public var onBrand: Color
    public var surface: Color
    public var canvas: Color
    public var text: Color
    public var muted: Color
    public var border: Color
    public var danger: Color
    public var success: Color
    public var focus: Color
    public var fontFamily: String
    public var fontBody: CGFloat
    public var fontHeading: CGFloat
    public var spaceSm: CGFloat
    public var spaceMd: CGFloat
    public var spaceLg: CGFloat
    public var radiusControl: CGFloat

    /// Police du DS : `system-ui` devient la police système d'iOS.
    public func font(size: CGFloat, weight: Font.Weight = .regular) -> Font {
        fontFamily == "system-ui"
            ? .system(size: size, weight: weight)
            : .custom(fontFamily, size: size).weight(weight)
    }
    public var body: Font { font(size: fontBody) }
    public var heading: Font { font(size: fontHeading, weight: .bold) }
}

extension MainlineTheme {
    /// Lit les tokens au format DS-Studio (`{"color.brand": {"$value": "#181818"}}`),
    /// seuls ou dans la réponse de `/api/state`. Un token absent ou invalide garde sa valeur actuelle.
    public func updated(fromJSON data: Data) throws -> MainlineTheme {
        let root = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
        let tokens = root["tokens"] as? [String: Any] ?? root
        func value(_ key: String) -> Any? { (tokens[key] as? [String: Any])?["$value"] }
        func color(_ key: String, _ current: Color) -> Color {
            guard let hex = value(key) as? String, hex.count == 7, hex.hasPrefix("#"),
                  let n = UInt32(hex.dropFirst(), radix: 16) else { return current }
            return Color(hex: n)
        }
        func number(_ key: String, _ current: CGFloat) -> CGFloat {
            (value(key) as? NSNumber).map { CGFloat(truncating: $0) } ?? current
        }
        var t = self
        t.brand = color("color.brand", brand)
        t.brandHover = color("color.brandHover", brandHover)
        t.onBrand = color("color.onBrand", onBrand)
        t.surface = color("color.surface", surface)
        t.canvas = color("color.canvas", canvas)
        t.text = color("color.text", text)
        t.muted = color("color.muted", muted)
        t.border = color("color.border", border)
        t.danger = color("color.danger", danger)
        t.success = color("color.success", success)
        t.focus = color("color.focus", focus)
        t.fontFamily = value("font.family") as? String ?? fontFamily
        t.fontBody = number("font.body", fontBody)
        t.fontHeading = number("font.heading", fontHeading)
        t.spaceSm = number("space.sm", spaceSm)
        t.spaceMd = number("space.md", spaceMd)
        t.spaceLg = number("space.lg", spaceLg)
        t.radiusControl = number("radius.control", radiusControl)
        return t
    }
}

extension Color {
    /// `Color(hex: 0x181818)`
    public init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }
}

private struct MainlineThemeKey: EnvironmentKey {
    static let defaultValue = MainlineTheme.standard
}

extension EnvironmentValues {
    /// `@Environment(\.mainlineTheme) var theme`
    public var mainlineTheme: MainlineTheme {
        get { self[MainlineThemeKey.self] }
        set { self[MainlineThemeKey.self] = newValue }
    }
}
