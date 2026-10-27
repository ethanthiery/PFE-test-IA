# Mon projet de fin d’études

**Mainline : Focus Journey** — application iPhone (SwiftUI, sans serveur) qui
transforme chaque session de travail en voyage en train entre deux vraies gares.
La durée du trajet devient la durée de la session ; à l’arrivée, la gare rejoint
un réseau personnel et une carte postale partageable est créée.

Ne placez ici aucun secret ni donnée sensible. Ce fichier est envoyé au fournisseur
IA uniquement lorsque vous utilisez le chat Codex dans l’application.

## Problème

Comment aider des jeunes à travailler plus longtemps, sans s’ennuyer ni culpabiliser ?
Les minuteurs classiques sont ennuyeux, rigides ou culpabilisants. Focus Flight
(avions) a rendu l’exercice plaisant, mais n’offre ni pause, ni trajets longs
(≈ 5 h max), et se termine brutalement. Mainline corrige ces trois défauts.
Positionnement : les grandes lignes et l’évasion, jamais le trajet domicile-travail.

## Publics

- **Étudiant / jeune actif (18-24 ans)** : longues sessions, temps par matière.
- **Jeune actif stable (25-32 ans)** : travail profond, pauses cadrées, sensible au beau design.
- **Personne qui a du mal à s’y mettre (dont TDAH)** : un rituel pour démarrer, sans punition.
- **Passionné de train (secondaire)** : collectionner, partager.

## Parcours à soutenir

1. Choisir : gare de départ et destination, durée affichée.
2. Composter : place, activité (réviser, travailler, lire), validation du billet.
3. Travailler : carte qui avance, compte à rebours, sons d’ambiance.
4. Pause en gare de correspondance (temps non compté comme travail).
5. Arriver : fin progressive, réseau personnel, carte postale.

Écrans clés : accueil (6-8 écrans), billet, session en direct, gare de pause,
arrivée, réseau personnel, carte postale, offre payante (fermable, après le premier trajet).

## Contraintes

- iPhone, iOS 17+, SwiftUI natif ; français et anglais.
- Tout reste sur le téléphone ; mode carte simplifiée pour préserver la batterie.
- Freemium honnête : pas de compte à rebours artificiel, carte postale toujours gratuite.
- DS-Studio est un atelier web : il sert de source de vérité des tokens, que l’app
  SwiftUI devra reprendre. Cette conversion reste à concevoir.

## Hypothèses à tester

- Le rituel (billet, compostage) aide à démarrer plus qu’un minuteur nu.
- Un ton « évasion, grandes lignes » se distingue sans dépendre du seul décor.
- Les pauses et la fin progressive réduisent l’abandon et la culpabilité.

## À préciser

- Lien du fichier Figma autorisé (pas de jeton, pas de lien confidentiel dans un dépôt public).
- Ce que je souhaite apprendre ou prouver vendredi.
