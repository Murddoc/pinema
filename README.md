# Pinema

Extension Chrome (Manifest V3) : mode cinéma pour Pinterest.

## Structure

```
manifest.json        Déclaration de l'extension
_locales/en|fr/      Textes traduits (anglais par défaut, français)
icons/               Icônes 16/32/48/128
popup/               Fenêtre des réglages (clic sur l'icône)
src/
  settings.js        Réglages par défaut + stockage (partagé avec le popup)
  common.js          Outils communs (images Pinterest, icônes, traductions, journal)
  cinema.js          Mode cinéma sur la page d'un pin
  thumbs.js          Bouton agrandir des miniatures + visionneuse ← →
  main.js            Point d'entrée : réglages, surveillance de la page
  content.css        Styles injectés dans Pinterest
store/               Textes, captures et politique de confidentialité pour le Web Store
scripts/             Outils de développement (non publiés)
```

## Développement

Prérequis : Node.js (https://nodejs.org, version LTS).

```
npm install        # une seule fois : installe ESLint
npm run check      # vérifie le code, le manifest et les traductions
npm run zip        # vérifie puis crée dist/pinema-<version>.zip pour le Web Store
```

Tester : `chrome://extensions` → Mode développeur → « Charger l'extension non
empaquetée » → ce dossier. Après une modification : bouton ↻ de l'extension,
**puis recharger les onglets Pinterest** (sinon l'ancienne version y tourne encore).

Journal de diagnostic : dans la console d'un onglet Pinterest,
`localStorage.pinemaDebug = 1` puis recharger la page.

## Quand Pinterest change son site

L'extension repose sur la structure interne de Pinterest. Points à vérifier en
cas de casse (tous dans `src/cinema.js` et `src/thumbs.js`) :

- identifiants `data-test-id` : `closeup-media-container`, `closeup-image`,
  `pinWrapper`, `share-icon-button`, `description-content-container` ;
- la grille Masonry : `[role="list"]` / `[role="listitem"]` / `[data-grid-item-idx]` ;
- le garde-fou de `cinema.js` (`layoutLooksRight`) remet l'affichage normal si
  la mise en page obtenue n'est pas celle attendue.

## Publier une mise à jour

```
npm run release -- patch     # ou minor / major
```

Le script vérifie, augmente la version, commite, crée l'étiquette `vX.Y.Z` et
pousse sur GitHub. La publication automatique (`.github/workflows/release.yml`)
construit l'archive, crée la release GitHub et l'envoie au Chrome Web Store, qui
la publie après relecture par Google. Consignes complètes pour Claude : `CLAUDE.md`.
