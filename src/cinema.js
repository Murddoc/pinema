// Mode cinéma : sur la page d'un pin, l'image s'affiche en grand au-dessus de
// la page, la carte d'infos est centrée dessous, les recommandations prennent
// toute la largeur.
//
// Principe (aucun nœud de Pinterest n'est déplacé dans le DOM) :
//   - un bloc #pinema-stage (grande image + emplacement des infos) est inséré
//     AVANT le conteneur de la grille Masonry de Pinterest ;
//   - la partie image de la carte du pin est masquée ;
//   - la case de la carte dans la grille est réduite à 1px (à 0 la grille ne se
//     réorganise pas) et la carte est affichée en position absolue dans
//     l'emplacement réservé.
(() => {
  'use strict';
  const Pinema = self.Pinema;
  const { log, t } = Pinema;

  const STAGE_ID = 'pinema-stage';
  const ATTR = {
    source: 'data-pinema-source', // image d'origine du pin
    hidden: 'data-pinema-hidden', // partie image de la carte, masquée
    row: 'data-pinema-row', // rangée image + infos, recentrée
    wrap: 'data-pinema-wrap', // case de la carte dans la grille (1px)
    card: 'data-pinema-card', // carte d'infos repositionnée
    dark: 'data-pinema-dark' // fond sombre
  };

  const CARD_MAX_WIDTH = 760; // largeur max de la carte d'infos sous l'image
  const MIN_GAIN = 1.3; // gain de largeur minimal (option « toutes les images » coupée)
  const MAX_UPSCALE = 2; // agrandissement max d'une image de trop basse résolution
  const FRAME_PADDING = 18; // marge autour de l'image (px)
  const V_OFFSET = 150; // hauteur d'écran réservée hors image (barre de recherche…)
  const SCAN_DEPTH = 1400; // zone du haut de page où chercher l'image du pin (px)
  const CACHE_MAX = 200;

  // Sélecteurs connus de l'image principale d'un pin. Pinterest peut les changer :
  // une heuristique de secours prend alors la plus grande image en haut de page.
  const SELECTORS = [
    '[data-test-id="pin-closeup-image"] img',
    '[data-test-id="closeup-image"] img',
    '[data-test-id="closeup-image-main"] img',
    '[data-test-id="visual-content-container"] img',
    '[data-test-id*="closeup"] img[src*="pinimg.com"]'
  ];

  // Boutons de Pinterest sur l'image d'origine, recopiés sur la grande image.
  // Recherche par libellé anglais, sinon par position (autres langues).
  const IMAGE_BUTTONS = [
    { index: 0, label: 'View larger', title: 'btnEnlarge', icon: 'expand' },
    { index: 1, label: 'Search image', title: 'btnVisualSearch', icon: 'visualSearch' }
  ];

  let state = null; // { path, base, stage, slot, grid, ro }
  let skipped = ''; // pin écarté définitivement : "chemin|image"
  let timer = null;
  const sizeCache = new Map(); // image -> 'loading' | { src, w, h }

  const isPinPage = () => /^\/pin\/[^/]+\/?$/.test(location.pathname);
  const srcOf = (img) => img.currentSrc || img.src;
  const keyOf = (img) => `${location.pathname}|${Pinema.baseOf(srcOf(img))}`;

  // Écarte ce pin jusqu'au prochain changement de page ou de réglage
  function skip(img, reason) {
    skipped = keyOf(img);
    log(reason);
  }

  // --- Détection -------------------------------------------------------------

  function isCandidate(img, minWidth) {
    if (img.closest('#' + STAGE_ID)) return false;
    const r = img.getBoundingClientRect();
    return r.width >= minWidth && r.height >= 80;
  }

  function findPinImage() {
    const marked = document.querySelector(`img[${ATTR.source}]`);
    if (marked) return marked;
    for (const sel of SELECTORS) {
      for (const img of document.querySelectorAll(sel)) {
        if (isCandidate(img, 200)) return img;
      }
    }
    let best = null;
    let bestArea = 0;
    for (const img of document.querySelectorAll('img[src*="pinimg.com"]')) {
      if (!isCandidate(img, 300)) continue;
      const r = img.getBoundingClientRect();
      if (r.top + window.scrollY > SCAN_DEPTH) continue;
      const area = r.width * r.height;
      if (area > bestArea) {
        bestArea = area;
        best = img;
      }
    }
    return best;
  }

  function hasLargeVideo() {
    for (const v of document.querySelectorAll('video')) {
      const r = v.getBoundingClientRect();
      if (r.width >= 300 && r.top + window.scrollY < SCAN_DEPTH) return true;
    }
    return false;
  }

  // Pin à plusieurs images : on n'en montrerait qu'une et la navigation serait masquée
  function isCarousel(img) {
    const scroller =
      img.closest('[data-test-id="css-carousel-scroller"]') ||
      document.querySelector('[data-test-id="closeup-image"] [data-test-id="css-carousel-scroller"]');
    return !!scroller && scroller.children.length > 1;
  }

  // Une animation en cours (transition entre pins) fausse les mesures
  function isAnimating(el) {
    for (let i = 0; el && el !== document.body && i < 20; i++, el = el.parentElement) {
      if (el.getAnimations?.().some((a) => a.playState === 'running')) return true;
    }
    return false;
  }

  // Thème de Pinterest, d'après la luminosité du fond (ou du texte si fond transparent)
  function isPageDark() {
    const luminance = (rgb) => {
      const [r, g, b] = rgb.map(Number);
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };
    for (const el of [document.body, document.documentElement]) {
      const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
      if (!m || (m.length === 4 && +m[3] === 0)) continue;
      return luminance(m) < 128;
    }
    const text = getComputedStyle(document.body).color.match(/[\d.]+/g) || [0, 0, 0];
    return luminance(text) > 160;
  }

  // --- Structure de la page --------------------------------------------------

  // Colonne image de la carte (secours si l'identifiant Pinterest change)
  function findColumn(img) {
    let el = img;
    for (let i = 0; i < 40 && el.parentElement && el.parentElement !== document.body; i++) {
      const p = el.parentElement;
      if (p.getBoundingClientRect().width > el.getBoundingClientRect().width * 1.4) return el;
      el = p;
    }
    return null;
  }

  const findMedia = (img) => img.closest('[data-test-id="closeup-media-container"]') || findColumn(img);

  // Point d'insertion : AVANT le conteneur de la grille (parent de [role=list]).
  // La grille mesure sa position sur ce conteneur pour savoir quelles vignettes
  // afficher ; insérer dedans ferait disparaître des vignettes au défilement.
  function findAnchor(column) {
    const list = column.closest('[role="list"]');
    if (list?.parentElement && list.parentElement !== document.body) return list.parentElement;
    // Mise en page sans grille : premier ancêtre « pleine largeur »
    const minW = window.innerWidth * 0.75;
    for (let el = column.parentElement; el && el !== document.body; el = el.parentElement) {
      const pos = getComputedStyle(el).position;
      if (el.getBoundingClientRect().width >= minW && pos !== 'absolute' && pos !== 'fixed') return el;
    }
    return null;
  }

  // Carte du pin dans la grille : case mesurée par la grille + carte elle-même
  function findGridCard(img) {
    const tile = img.closest('[role="listitem"]');
    if (!tile || !tile.parentElement?.matches('[role="list"]')) return null;
    const wrap = tile.querySelector(':scope > [data-grid-item-idx]') || tile.firstElementChild;
    const card = wrap?.firstElementChild;
    if (!card || !card.contains(img)) return null;
    return { wrap, card };
  }

  function findPinterestImageButton({ index, label }) {
    const media = document.querySelector('[data-test-id="closeup-media-container"]');
    if (!media) return null;
    return (
      media.querySelector(`[aria-label="${label}"]`) ||
      media.querySelectorAll('[data-test-id="pointer-events-wrapper"] [aria-label]')[index] ||
      null
    );
  }

  // --- Résolution réelle de l'image ------------------------------------------

  // Renvoie { src, w, h } de la meilleure version, ou null pendant le chargement
  function probe(img) {
    const base = Pinema.baseOf(srcOf(img));
    const cached = sizeCache.get(base);
    if (cached) return cached === 'loading' ? null : cached;
    if (sizeCache.size >= CACHE_MAX) sizeCache.delete(sizeCache.keys().next().value);
    sizeCache.set(base, 'loading');
    const fallback = Pinema.biggestSrc(img);
    Pinema.loadFirst([...Pinema.originalCandidates(fallback), fallback]).then((info) => {
      sizeCache.set(base, info || { src: fallback, w: img.naturalWidth, h: img.naturalHeight });
      schedule();
    });
    return null;
  }

  // --- Construction ----------------------------------------------------------

  function placeCard() {
    if (!state?.grid) return;
    const { slot } = state;
    const { wrap, card } = state.grid;
    if (!slot.isConnected || !card.isConnected) return;
    const slotW = slot.getBoundingClientRect().width;
    const w = Math.min(CARD_MAX_WIDTH, slotW);
    card.style.setProperty('width', `${w}px`, 'important');
    const h = card.getBoundingClientRect().height;
    if (Math.abs(slot.offsetHeight - h) > 1) slot.style.height = `${h}px`;
    const s = slot.getBoundingClientRect();
    const r = wrap.getBoundingClientRect();
    card.style.setProperty('top', `${Math.round(s.top - r.top)}px`, 'important');
    card.style.setProperty('left', `${Math.round(s.left - r.left + (s.width - w) / 2)}px`, 'important');
  }

  function addImageButtons(holder) {
    const bar = document.createElement('div');
    bar.className = 'pinema-buttons';
    for (const def of IMAGE_BUTTONS) {
      bar.appendChild(
        Pinema.iconButton('pinema-btn', t(def.title), Pinema.ICONS[def.icon], (e) => {
          e.stopPropagation();
          const original = findPinterestImageButton(def);
          if (original) original.click();
          else log(`bouton Pinterest « ${def.label} » introuvable`);
        })
      );
    }
    holder.appendChild(bar);
  }

  function createStage(img, info) {
    const stage = document.createElement('div');
    stage.id = STAGE_ID;
    stage.style.setProperty('--pinema-frame-padding', `${FRAME_PADDING}px`);
    stage.style.setProperty('--pinema-v-offset', `${V_OFFSET}px`);
    if (Pinema.settings.darkStage || isPageDark()) stage.setAttribute(ATTR.dark, '');

    const big = document.createElement('img');
    big.className = 'pinema-img';
    big.alt = img.alt || '';
    big.decoding = 'async';
    big.title = t('openOriginal');
    big.src = info.src;
    big.addEventListener('click', () => Pinema.openInTab(big.src));

    const holder = document.createElement('div'); // à la taille de l'image (support des boutons)
    holder.className = 'pinema-holder';
    holder.appendChild(big);
    if (Pinema.settings.imageButtons) addImageButtons(holder);

    const frame = document.createElement('div');
    frame.className = 'pinema-frame';
    frame.appendChild(holder);
    const slot = document.createElement('div'); // emplacement de la carte d'infos
    slot.className = 'pinema-slot';
    stage.append(frame, slot);
    return { stage, frame, slot };
  }

  // Vérifie le résultat ; sinon retour à l'affichage normal (Pinterest a changé ?)
  function layoutLooksRight() {
    if (!state) return false;
    if (state.stage.querySelector('.pinema-frame').getBoundingClientRect().height < 50) return false;
    if (!state.grid) return true;
    const card = state.grid.card.getBoundingClientRect();
    const slot = state.slot.getBoundingClientRect();
    return (
      card.height >= 40 &&
      Math.abs(card.top - slot.top) <= 4 &&
      state.grid.wrap.getBoundingClientRect().height <= 2
    );
  }

  // Taille d'affichage de la grande image : elle tient dans l'écran ; une image de
  // basse résolution est agrandie (jusqu'à 2×) et jamais plus petite que dans
  // l'affichage normal de Pinterest (qui agrandit lui aussi les petites images).
  function sizeBigImage(big, frame, info, pinterestWidth) {
    const availW = frame.clientWidth - 2 * FRAME_PADDING;
    const availH = window.innerHeight - V_OFFSET;
    const fit = Math.min(availW / info.w, availH / info.h);
    const scale = Math.min(fit, Math.max(MAX_UPSCALE, pinterestWidth / info.w));
    big.style.width = `${Math.round(info.w * scale)}px`;
    big.style.height = `${Math.round(info.h * scale)}px`;
  }

  function build(img, info) {
    const column = findMedia(img);
    if (!column) return log('colonne image introuvable');
    const anchor = findAnchor(column);
    if (!anchor?.parentNode) return log('point d’insertion introuvable');

    if (!Pinema.settings.allImages) {
      const currentW = img.getBoundingClientRect().width;
      const availW = anchor.getBoundingClientRect().width - 2 * FRAME_PADDING;
      const availH = window.innerHeight - V_OFFSET;
      const cinemaW = Math.min(info.w, availW, (availH * info.w) / info.h);
      if (cinemaW < currentW * MIN_GAIN) {
        return skip(img, `gain trop faible (${info.w}×${info.h}) → affichage normal`);
      }
    }

    const pinterestWidth = img.getBoundingClientRect().width; // avant de masquer l'image
    const { stage, frame, slot } = createStage(img, info);
    anchor.parentNode.insertBefore(stage, anchor);
    sizeBigImage(stage.querySelector('.pinema-img'), frame, info, pinterestWidth);
    img.setAttribute(ATTR.source, '');
    column.setAttribute(ATTR.hidden, '');
    column.parentElement.setAttribute(ATTR.row, '');
    state = { path: location.pathname, base: Pinema.baseOf(srcOf(img)), stage, slot, grid: null, ro: null };

    const grid = findGridCard(img);
    if (grid) {
      grid.wrap.setAttribute(ATTR.wrap, '');
      grid.card.setAttribute(ATTR.card, '');
      state.grid = grid;
      state.ro = new ResizeObserver(placeCard);
      state.ro.observe(grid.card);
      state.ro.observe(frame);
      placeCard();
    } else {
      slot.remove();
    }

    const built = state;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (state !== built || layoutLooksRight()) return;
        restore();
        skip(img, 'mise en page non reconnue → affichage normal');
      })
    );
    log('mode cinéma appliqué' + (grid ? '' : ' (sans réorganisation de la grille)'));
  }

  function restore() {
    state?.ro?.disconnect();
    const card = state?.grid?.card;
    if (card) for (const p of ['width', 'top', 'left']) card.style.removeProperty(p);
    document.getElementById(STAGE_ID)?.remove();
    for (const a of [ATTR.source, ATTR.hidden, ATTR.row, ATTR.wrap, ATTR.card]) {
      document.querySelectorAll(`[${a}]`).forEach((el) => el.removeAttribute(a));
    }
    state = null;
  }

  function isStillValid(img) {
    return (
      state.stage.isConnected &&
      img.hasAttribute(ATTR.source) &&
      Pinema.baseOf(srcOf(img)) === state.base &&
      (!state.grid || (state.grid.card.isConnected && state.grid.card.hasAttribute(ATTR.card)))
    );
  }

  function apply() {
    timer = null;
    if (!Pinema.settings.cinema || !isPinPage()) {
      if (state || document.getElementById(STAGE_ID)) restore();
      if (isPinPage()) log('mode cinéma désactivé dans les réglages');
      return;
    }
    if (state && state.path !== location.pathname) restore();

    const img = findPinImage();
    if (!img) return log('image du pin introuvable');
    if (state) {
      if (isStillValid(img)) return;
      restore();
    }
    if (skipped === keyOf(img)) return;

    if (hasLargeVideo()) return log('pin vidéo → ignoré');
    if (isCarousel(img)) return log('carrousel → ignoré');
    if (!img.complete || !img.naturalWidth) {
      img.addEventListener('load', schedule, { once: true });
      return log('image en cours de chargement');
    }
    if (isAnimating(img)) return log('animation en cours');
    if (!Pinema.settings.allImages && img.naturalWidth < img.naturalHeight * 1.05) {
      return skip(img, 'image verticale/carrée → affichage normal');
    }

    const info = probe(img);
    if (!info) return log('mesure de la résolution…');
    build(img, info);
  }

  function schedule() {
    if (!timer) timer = setTimeout(apply, 120);
  }

  // Tout réévaluer (changement de page, de réglage ou de taille de fenêtre)
  function reset() {
    restore();
    skipped = '';
    schedule();
  }

  // Vérification périodique : la page peut finir de se mettre en place sans
  // modification du DOM (fin d'animation entre deux pins)
  function tick() {
    if (!Pinema.settings.cinema || !isPinPage()) return;
    if (state?.stage.isConnected) return;
    if (skipped.startsWith(location.pathname + '|')) return;
    schedule();
  }

  Pinema.cinema = { schedule, reset, tick };
})();
