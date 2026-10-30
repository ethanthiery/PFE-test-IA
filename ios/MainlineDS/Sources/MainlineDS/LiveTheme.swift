import Foundation
import Observation

/// Suit les tokens de DS-Studio en direct : chaque validation dans l'app web
/// se voit dans le simulateur en une seconde. Réservé au développement.
@MainActor @Observable
public final class LiveTheme {
    public private(set) var theme: MainlineTheme
    public private(set) var connected = false
    public private(set) var revision: Int?
    private var task: Task<Void, Never>?

    public init(theme: MainlineTheme = .standard) {
        self.theme = theme
    }

    /// Le simulateur joint le Mac sur 127.0.0.1 ; un vrai iPhone ne le peut pas.
    public func start(url: URL = URL(string: "http://127.0.0.1:4310/api/state")!) {
        task?.cancel()
        task = Task { [weak self] in
            while !Task.isCancelled {
                await self?.refresh(from: url)
                try? await Task.sleep(for: .seconds(1))
            }
        }
    }

    public func stop() {
        task?.cancel()
        task = nil
    }

    private func refresh(from url: URL) async {
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else {
                connected = false
                return
            }
            let next = try theme.updated(fromJSON: data)
            if next != theme { theme = next }
            revision = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["revision"] as? Int
            connected = true
        } catch {
            connected = false
        }
    }
}
