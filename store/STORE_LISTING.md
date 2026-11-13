# Fiche Chrome Web Store – Pinema

Textes à copier dans le tableau de bord développeur
(https://chrome.google.com/webstore/devconsole). Le nom et la description courte
viennent automatiquement de `_locales/` ; le reste est à coller à la main.

---

## Onglet « Fiche Play Store » / Store listing

**Catégorie :** Outils (Tools) — ou « Photos »
**Langue :** English (principale) + Français

### Description détaillée — English

```
Pinema gives Pinterest a cinema mode: open a pin and its image fills the screen, in the best resolution available, with the pin details neatly centered below and recommendations across the full width.

FEATURES
• Cinema mode – the pin image is shown large and centered, loaded in its original resolution.
• Clean layout – title, description and comments sit below the image; related pins use the full page width.
• Enlarge from thumbnails (optional) – hover any pin in a grid and click the enlarge button for a full-screen preview. Browse pins with ← / → , close with Esc.
• Pinterest buttons on the big image (optional) – enlarge and visual search.
• Dark background (optional), follows Pinterest's dark theme automatically.
• Remove Pinterest's “Send” button from thumbnails (optional).

PRIVACY
Pinema collects no data, has no account, no tracking and no external server. It only runs on Pinterest pages and stores your settings in your browser.

Pinema is an independent extension and is not affiliated with, endorsed or sponsored by Pinterest.
```

### Description détaillée — Français

```
Pinema ajoute un mode cinéma à Pinterest : ouvrez un pin et son image s'affiche en grand, dans la meilleure résolution disponible, avec les informations du pin centrées dessous et les recommandations sur toute la largeur.

FONCTIONNALITÉS
• Mode cinéma – l'image du pin s'affiche en grand et centrée, chargée en résolution originale.
• Mise en page épurée – titre, description et commentaires sous l'image ; les pins similaires occupent toute la largeur.
• Agrandir depuis les miniatures (optionnel) – survolez un pin dans une grille et cliquez sur le bouton agrandir pour un aperçu plein écran. Naviguez avec ← / →, fermez avec Échap.
• Boutons Pinterest sur la grande image (optionnel) – agrandir et recherche visuelle.
• Fond sombre (optionnel), suit automatiquement le thème sombre de Pinterest.
• Enlever le bouton « Send » des miniatures (optionnel).

CONFIDENTIALITÉ
Pinema ne collecte aucune donnée : pas de compte, pas de pistage, pas de serveur externe. L'extension ne fonctionne que sur Pinterest et garde vos réglages dans votre navigateur.

Pinema est une extension indépendante, sans lien avec Pinterest, qui ne l'approuve ni ne la sponsorise.
```

### Visuels (dossier `store/`)
| Fichier | Taille | Usage |
|---|---|---|
| `icons/icon128.png` | 128×128 | Icône de la fiche |
| `store/screenshot-1-cinema.png` | 1280×800 | Capture : mode cinéma |
| `store/screenshot-2-layout.png` | 1280×800 | Capture : mise en page (infos sous l'image) |
| `store/screenshot-3-preview.png` | 1280×800 | Capture : aperçu depuis une miniature |
| `store/screenshot-4-thumbnail.png` | 1280×800 | Illustration : le bouton agrandir sur une miniature (gros plan reconstitué) |
| `store/promo-small.png` | 440×280 | Petite vignette promotionnelle |

**Crédit photo des captures :** « Kitchen with dark green cabinets » par Clay Banks,
sous licence Unsplash (gratuite, usage commercial autorisé) :
https://unsplash.com/photos/kitchen-with-dark-green-cabinets-8OvuBRDLN4U
La capture 2 montre aussi, en petit, des pins recommandés et des produits « Shop the Pin »
choisis par Pinterest : si tu préfères zéro contenu tiers, n'utilise que les captures 1 et 3.

---

## Onglet « Pratiques de confidentialité » / Privacy practices

**Objectif unique (Single purpose) :**
```
Improve how images are displayed on Pinterest: show pin images large and in high resolution (cinema mode) and offer a full-screen preview from thumbnails.
```

**Justification de la permission `storage` :**
```
Used only to save the user's display preferences (the on/off switches in the extension popup) with chrome.storage.sync. No other data is stored.
```

**Justification des accès aux sites (content scripts sur les domaines Pinterest) :**
```
The extension only works on Pinterest: its content scripts change how pin images are laid out on Pinterest pages. It does not run on any other website and does not read or send any personal data.
```

**Code distant (Remote code) :** Non — tout le code est inclus dans l'extension.

**Utilisation des données :** cocher qu'aucune catégorie de données n'est collectée,
et certifier les trois déclarations (pas de vente, pas d'usage hors objectif unique,
pas d'usage pour la solvabilité/prêts).

**Politique de confidentialité (URL) :** facultative quand aucune donnée n'est collectée.
Si demandée : publier `store/PRIVACY.md` (par ex. GitHub Pages ou un Gist) et coller l'URL.
