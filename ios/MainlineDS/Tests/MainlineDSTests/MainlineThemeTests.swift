import SwiftUI
import XCTest
@testable import MainlineDS

final class MainlineThemeTests: XCTestCase {
    func testReadsDSStudioState() throws {
        let json = ##"{"revision": 4, "tokens": {"color.brand": {"$type": "color", "$value": "#8A3B20"}, "radius.control": {"$type": "dimension", "$value": 22}}}"##
        let theme = try MainlineTheme.standard.updated(fromJSON: Data(json.utf8))
        XCTAssertEqual(theme.brand, Color(hex: 0x8A3B20))
        XCTAssertEqual(theme.radiusControl, 22)
        XCTAssertEqual(theme.spaceMd, MainlineTheme.standard.spaceMd)
    }

    func testKeepsCurrentValueWhenInvalid() throws {
        let json = ##"{"color.brand": {"$value": "rouge"}, "space.md": {"$value": "22"}}"##
        let theme = try MainlineTheme.standard.updated(fromJSON: Data(json.utf8))
        XCTAssertEqual(theme, MainlineTheme.standard)
    }
}
