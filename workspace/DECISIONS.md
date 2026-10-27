# Journal de décisions du projet

## V1 — Starter

React permet d’employer exactement les mêmes composants dans le catalogue et
le viewport isolé. Le backend HTTP Node utilise la bibliothèque standard ; Zod
valide les entrées et les fichiers. Vite compile le frontend. Pas d’Electron,
base distante, Figma ou LLM obligatoire.

Codex propose du JSON sans outils ; le contrôleur est l’unique auteur des changements
locaux validés. Claude et Gemini ne sont pas activés sans qualification.

## 2026-10-27 — `color.brand` : #3154C4 → #181818

- **Problème** : le bleu de l’exemple Lisière ne correspond pas à Mainline. Le rituel
  d’onboarding repose sur un bouton principal unique, répété à chaque étape.
- **Source** : onboarding de Focus Flight (enregistrement d’écran). Le bouton
  « Continue » est une pilule noire, mesurée à #181818 (pas un noir pur).
- **Option écartée** : garder le bleu, couleur d’action générique sans lien avec le rituel.
- **Décision** : `color.brand` = #181818, validé dans DS-Studio (révision 1, source manuelle).
- **Preuve** : contraste texte blanc / marque 17,76:1 (AA texte courant), affiché par l’app ;
  valeur relue dans l’état local après validation.
- **Limites** : couleur mesurée sur une vidéo compressée. Dans Mainline, ce sera la teinte
  d’un bouton Liquid Glass, pas un aplat. `color.brandHover` (#243F99) reste bleu et
  `radius.control` (10) n’est pas encore une capsule : à traiter ensuite.
- **Annulation** : Historique → annuler la révision 1.

## 2026-10-27 — `color.brandHover` : #243F99 → #2E2E2E

- **Problème** : après le passage de la marque au noir, l’état survol/appui restait bleu.
- **Décision** : un noir légèrement plus clair, comme l’état appuyé d’un bouton Liquid Glass
  teinté (révision 2, source manuelle).
- **Preuve** : valeur relue dans l’état local ; contraste texte blanc ≈ 13,6:1 (calcul, non affiché par l’app).
- **Annulation** : Historique → annuler la révision 2.

## 2026-10-27 — Adaptateur Claude Code (expérimental)

- **Problème** : seul Codex pouvait proposer des tokens depuis le chat ; Claude Code
  était installé mais marqué « non implémenté ».
- **Décision** : `connectors/agents/claude.ts`, sur le modèle de Codex. Appel
  `claude -p` dans un dossier vide, sans outils (`--tools ""`), sans MCP
  (`--strict-mcp-config`), sans réglages utilisateur/projet donc sans hooks ni plugins
  personnels (`--setting-sources ""`), sans session conservée. Modèle Sonnet 5.5, effort bas.
  Les réponses passent par le même diff et la même validation humaine ; source `claude`.
- **Piste écartée** : `--bare`, qui coupe tout mais refuse la connexion par abonnement.
- **Preuve** : `npm run check`, `npm test` (31/31), `npm run build`, `npm run scan` (0 alerte).
  Appel isolé : outils `[]`, MCP `[]`, aucun plugin personnel chargé. Appel réel depuis
  l'app (macOS, Claude Code 2.1.311) : proposition `color.success` reçue et affichée en diff,
  non appliquée.
- **Limites** : qualifié sur macOS et 2.1.311 seulement ; toute 2.1.x est acceptée car le CLI
  se met à jour seul. Les plugins intégrés de Claude Code restent chargés (sans outils, ils
  n'ont rien à exécuter). Le contexte PFE et le brief privé partent chez Anthropic.
