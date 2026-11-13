# Pinema – consignes pour Claude

Extension Chrome (Manifest V3) qui ajoute un « mode cinéma » à Pinterest : grande
image en haute résolution, infos du pin centrées dessous, bouton « agrandir » sur
les miniatures avec visionneuse ← →. Publiée sur le Chrome Web Store.
L'utilisateur parle français : réponses, commentaires de code et commits en français.

## Quand on te demande « mets à jour le plugin »

Sans autre précision, ça veut dire : vérifier qu'il marche toujours sur Pinterest,
corriger ce qui est cassé, puis publier. Suis ces étapes dans l'ordre :

1. `git pull` puis `git status` (partir d'une copie propre et à jour).
2. `npm ci` si `node_modules` manque, puis `npm run check`.
3. **Test réel dans Chrome** (Claude in Chrome, voir « Tester » plus bas) : la liste
   de vérification ci-dessous. Demande à l'utilisateur de recharger l'extension
   (`chrome://extensions` → ↻) après chaque modification du code.
4. Corrige, relance `npm run check`, reteste ce qui a changé.
5. Commite les corrections (message en français, clair).
6. Choisis le niveau : `patch` pour une correction, `minor` pour une nouvelle
   option ou fonction, `major` pour un changement profond. Lance
   `npm run release -- patch` (ou minor/major). Le script vérifie, change la version,
   commite, étiquette et pousse.
7. Suis la publication : `gh run watch` (ou `gh run list --limit 3`). En cas d'échec,
   lis `gh run view --log-failed`, corrige et refais une release.
8. Résume à l'utilisateur : ce qui a été corrigé, la version publiée, et que Google
   doit encore relire la mise à jour (quelques heures à quelques jours).

S'il n'y a rien à corriger et aucune demande nouvelle, ne publie pas : dis-le.
Si une fonction est ajoutée ou retirée, mets à jour `store/STORE_LISTING.md` et
préviens l'utilisateur que la fiche du Web Store se modifie à la main.

## Environnement (Windows)

- Node n'est pas toujours dans le PATH de PowerShell :
  `$env:Path = "C:\Program Files\nodejs;C:\Program Files\GitHub CLI;" + $env:Path`
- `gh` est connecté au compte GitHub de l'utilisateur.
- En PowerShell 5.1, ne lis/écris jamais un fichier texte sans `-Encoding UTF8`
  (sinon les accents sont abîmés) : préfère les outils Read/Edit/Write ou Node.
- Ne commite jamais de clé ou de secret. Les accès au Web Store sont dans les
  secrets GitHub (`CWS_SERVICE_ACCOUNT_KEY`) et variables (`CWS_PUBLISHER_ID`,
  `CWS_EXTENSION_ID`) ; tu n'en as pas besoin.

## Commandes

```
npm run check                 ESLint + manifest + traductions (obligatoire avant tout commit)
npm run zip                   check puis dist/pinema-<version>.zip
npm run release -- patch      nouvelle version publiée (voir plus haut)
npm run release -- patch --no-push   idem sans envoyer sur GitHub
```

## Structure

```
manifest.json      version, domaines Pinterest, scripts chargés dans l'ordre
_locales/en|fr/    TOUS les textes visibles (mêmes clés dans les deux langues)
src/settings.js    réglages par défaut (Pinema.DEFAULTS) + stockage, partagé avec le popup
src/common.js      outils : URLs d'images pinimg, icônes SVG, traductions t(), journal
src/cinema.js      mode cinéma sur une page /pin/<id>/
src/thumbs.js      bouton agrandir des miniatures + visionneuse
src/main.js        point d'entrée : réglages, MutationObserver, minuterie 500 ms
src/content.css    styles injectés (attributs data-pinema-*)
popup/             fenêtre des réglages
store/             textes, captures, politique de confidentialité du Web Store
design/            sources des logos (non publiés)
.github/workflows/release.yml   publication automatique sur étiquette vX.Y.Z
```

Conventions : chaque fichier de `src/` est une IIFE qui partage `self.Pinema` ;
pas de `innerHTML` (DOM et SVG créés à la main) ; tout texte visible passe par
`_locales` (ajouter la clé en **en** et **fr**) ; pas de coins arrondis sur
l'image en mode cinéma ni dans la visionneuse (choix de l'utilisateur) ; aucune
donnée envoyée nulle part (promis dans la politique de confidentialité).

## Pinterest : ce qui casse et pourquoi

L'extension dépend de la structure interne de Pinterest (application React).

- Sélecteurs `data-test-id` utilisés : `closeup-media-container`, `closeup-image`,
  `closeup-body`, `description-content-container`, `pinWrapper`,
  `share-icon-button`, `css-carousel-scroller`, `pointer-events-wrapper`.
  Premier réflexe si quelque chose ne marche plus : vérifier qu'ils existent encore
  (`document.querySelectorAll('[data-test-id="…"]')` dans la page).
- Grille Masonry virtualisée : elle mesure sa position sur le parent de
  `[role="list"]`. La scène cinéma doit être insérée **avant** ce parent, jamais
  dedans, sinon des miniatures disparaissent au défilement.
- Une tuile de la grille réduite à 0 px ne déclenche pas de recalcul ; 1 px oui
  (d'où `height: 1px` dans content.css).
- `description-content-container` a un `min-height` et `container-type: size` qui
  bloquent la hauteur de la carte : neutralisés dans content.css.
- Erreur d'hydratation React possible : elle efface les attributs posés sur
  `<html>`, d'où `applyRootFlags()` rappelé toutes les 500 ms.
- Images : `i.pinimg.com/<236x|736x|1200x|originals>/…` ; les originaux peuvent
  être en .png (voir `originalCandidates`).
- Le garde-fou `layoutLooksRight` (cinema.js) remet l'affichage normal si la mise
  en page n'est pas celle attendue : si le mode cinéma « ne s'active plus », c'est
  souvent lui. Journal : `localStorage.pinemaDebug = 1` puis recharger la page.

## Tester (Claude in Chrome)

Travaille dans un nouvel onglet, sur Pinterest connecté (session de l'utilisateur).
Après chaque modification : l'utilisateur recharge l'extension, puis toi l'onglet.

Liste de vérification :
1. Pin horizontal (ex. un pin de l'accueil) : grande image centrée, carte d'infos
   centrée dessous (760 px max), recommandations sur toute la largeur.
2. Pin vertical : https://fr.pinterest.com/pin/822892163169504862/
3. Pin basse résolution (agrandi jusqu'à 2×) : https://fr.pinterest.com/pin/4605352908103389568/
4. Défiler les recommandations : aucune miniature ne disparaît.
5. Passer d'un pin à l'autre sans recharger (navigation interne) : le mode cinéma suit.
6. Boutons « View larger » / « Search image » sur la grande image : ouvrent ceux de Pinterest.
7. Survol d'une miniature : bouton agrandir tout à droite, boutons Pinterest
   (Edit, Send) décalés à sa gauche ; la visionneuse s'ouvre, ← → changent de pin
   sans faire bouger la page, Échap ferme.
8. Popup : chaque option s'active/se désactive et la page suit.

Vidéos et carrousels sont volontairement ignorés par le mode cinéma.
Coordonnées des captures : l'image fait 1568 px de large pour 1920 px CSS.
