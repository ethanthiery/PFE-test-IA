// Généré par `npm run swift` depuis DS-Studio. Ne pas modifier à la main.
import SwiftUI

/// Retours haptiques du rituel Mainline.
public enum MainlineHaptic {
    /// Choisir une gare, une durée ou une activité.
    public static let choix: SensoryFeedback = .selection
    /// Le billet est composté : la session démarre.
    public static let compostage: SensoryFeedback = .impact(weight: .heavy)
    /// Le train quitte la gare.
    public static let depart: SensoryFeedback = .start
    /// Arrivée en gare de correspondance.
    public static let pause: SensoryFeedback = .impact(flexibility: .soft)
    /// Le train repart après la pause.
    public static let reprise: SensoryFeedback = .start
    /// Session arrêtée avant l’arrivée : neutre, jamais une erreur.
    public static let arret: SensoryFeedback = .stop
    /// Arrivée à destination.
    public static let arrivee: SensoryFeedback = .success
    /// Tous les retours, pour une page de démonstration.
    public static let all: [(name: String, description: String, feedback: SensoryFeedback)] = [
        ("choix", "Choisir une gare, une durée ou une activité.", choix),
        ("compostage", "Le billet est composté : la session démarre.", compostage),
        ("depart", "Le train quitte la gare.", depart),
        ("pause", "Arrivée en gare de correspondance.", pause),
        ("reprise", "Le train repart après la pause.", reprise),
        ("arret", "Session arrêtée avant l’arrivée : neutre, jamais une erreur.", arret),
        ("arrivee", "Arrivée à destination.", arrivee),
    ]
}

/// Textes clés de Mainline, au ton jamais culpabilisant.
public enum MainlineCopy {
    /// Bouton qui démarre la session.
    public static let composter = "Composter mon billet"
    /// Annonce au début de la session.
    public static let depart = "Votre train part."
    /// Écran de gare de correspondance.
    public static let pause = "Pause en gare. Ce temps ne compte pas comme du travail."
    /// Bouton de fin de pause.
    public static let reprise = "On repart"
    /// Arrêt avant l’arrivée : jamais culpabilisant.
    public static let arret = "Trajet interrompu. Vous reprendrez la ligne quand vous voudrez."
    /// Fin progressive du trajet.
    public static let arrivee = "Vous êtes arrivé à destination."
    /// Fermer l’offre payante, toujours visible.
    public static let offreFermer = "Plus tard"
    /// Tous les textes, pour une page de démonstration.
    public static let all: [(name: String, description: String, text: String)] = [
        ("composter", "Bouton qui démarre la session.", composter),
        ("depart", "Annonce au début de la session.", depart),
        ("pause", "Écran de gare de correspondance.", pause),
        ("reprise", "Bouton de fin de pause.", reprise),
        ("arret", "Arrêt avant l’arrivée : jamais culpabilisant.", arret),
        ("arrivee", "Fin progressive du trajet.", arrivee),
        ("offreFermer", "Fermer l’offre payante, toujours visible.", offreFermer),
    ]
}
