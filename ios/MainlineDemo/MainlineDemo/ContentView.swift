import MainlineDS
import SwiftUI

/// Vitrine du package MainlineDS : couleurs, billet, retours haptiques et textes.
struct ContentView: View {
    let live: LiveTheme
    @Environment(\.mainlineTheme) private var theme
    @State private var played = ""
    @State private var trigger = 0

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.spaceLg) {
                header
                ticket
                section("Couleurs") { palette }
                section("Retours haptiques") { haptics }
                section("Textes") { copy }
            }
            .padding(theme.spaceLg)
        }
        .background(theme.canvas)
        .foregroundStyle(theme.text)
        .sensoryFeedback(
            MainlineHaptic.all.first { $0.name == played }?.feedback ?? .selection,
            trigger: trigger
        )
        .animation(.spring(duration: 0.25), value: theme)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: theme.spaceSm) {
            Text("Mainline").font(theme.heading)
            Label(
                live.connected
                    ? "En direct avec DS-Studio · révision \(live.revision ?? 0)"
                    : "Valeurs du package (DS-Studio fermé)",
                systemImage: live.connected ? "dot.radiowaves.left.and.right" : "shippingbox"
            )
            .font(theme.font(size: 13))
            .foregroundStyle(theme.muted)
        }
    }

    private var ticket: some View {
        VStack(alignment: .leading, spacing: theme.spaceMd) {
            Text("PARIS → LYON · 45 MIN")
                .font(theme.font(size: 12, weight: .semibold))
                .foregroundStyle(theme.muted)
            Text(MainlineCopy.depart).font(theme.font(size: theme.fontBody + 4, weight: .semibold))
            Button {
                play("compostage")
            } label: {
                Text(MainlineCopy.composter)
                    .font(theme.font(size: theme.fontBody, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, theme.spaceMd)
                    .foregroundStyle(theme.onBrand)
                    .background(theme.brand, in: .rect(cornerRadius: theme.radiusControl))
            }
        }
        .padding(theme.spaceLg)
        .background(theme.surface, in: .rect(cornerRadius: theme.radiusControl + 8))
        .overlay {
            RoundedRectangle(cornerRadius: theme.radiusControl + 8).stroke(theme.border)
        }
    }

    private var palette: some View {
        let colors: [(String, Color)] = [
            ("brand", theme.brand), ("brandHover", theme.brandHover), ("onBrand", theme.onBrand),
            ("surface", theme.surface), ("canvas", theme.canvas), ("text", theme.text),
            ("muted", theme.muted), ("border", theme.border), ("danger", theme.danger),
            ("success", theme.success), ("focus", theme.focus),
        ]
        return LazyVGrid(columns: [.init(.adaptive(minimum: 92))], spacing: theme.spaceMd) {
            ForEach(colors, id: \.0) { name, color in
                VStack(spacing: 6) {
                    RoundedRectangle(cornerRadius: theme.radiusControl)
                        .fill(color)
                        .frame(height: 48)
                        .overlay {
                            RoundedRectangle(cornerRadius: theme.radiusControl).stroke(theme.border)
                        }
                    Text(name).font(theme.font(size: 12)).foregroundStyle(theme.muted)
                }
            }
        }
    }

    private var haptics: some View {
        VStack(spacing: theme.spaceSm) {
            ForEach(MainlineHaptic.all, id: \.name) { haptic in
                Button {
                    play(haptic.name)
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(haptic.name).font(theme.font(size: theme.fontBody, weight: .medium))
                            Text(haptic.description).font(theme.font(size: 13)).foregroundStyle(theme.muted)
                        }
                        Spacer()
                        Image(systemName: played == haptic.name ? "waveform" : "hand.tap")
                    }
                    .padding(theme.spaceMd)
                    .background(theme.surface, in: .rect(cornerRadius: theme.radiusControl))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var copy: some View {
        VStack(alignment: .leading, spacing: theme.spaceMd) {
            ForEach(MainlineCopy.all, id: \.name) { item in
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.text).font(theme.body)
                    Text("\(item.name) · \(item.description)")
                        .font(theme.font(size: 12))
                        .foregroundStyle(theme.muted)
                }
            }
        }
    }

    private func section(_ title: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: theme.spaceMd) {
            Text(title).font(theme.font(size: theme.fontBody + 2, weight: .bold))
            content()
        }
    }

    private func play(_ name: String) {
        played = name
        trigger += 1
    }
}
