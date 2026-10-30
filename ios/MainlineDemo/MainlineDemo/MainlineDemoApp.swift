import MainlineDS
import SwiftUI

@main
struct MainlineDemoApp: App {
    @State private var live = LiveTheme()

    var body: some Scene {
        WindowGroup {
            ContentView(live: live)
                .environment(\.mainlineTheme, live.theme)
                .task { live.start() }
        }
    }
}
