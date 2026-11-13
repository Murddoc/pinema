// Miniatures : bouton « agrandir » au survol (tout à droite, les boutons de
// Pinterest comme Edit ou Send se décalent à sa gauche), visionneuse plein
// écran avec navigation ← / → entre les pins de la grille, et option pour
// enlever le bouton « Send ».
(() => {
  'use strict';
  const Pinema = self.Pinema;
  const { t } = Pinema;

  const THUMB_BTN = 'pinema-thumb-btn';
  const WRAPPER_SEL = '[data-test-id="pinWrapper"]';
  const A_SHIFT = 'data-pinema-shift';
  const BTN_SIZE = 36;
  const BTN_GAP = 8;
  const SHIFT = BTN_SIZE + BTN_GAP; // décalage des boutons Pinterest (px)
  const CORNER = 40; // zone « coin bas-droit » de la miniature (px)

  const root = document.documentElement;

  // Marqueurs posés sur <html> (lus par content.css). Pinterest peut reconstruire
  // la page et les effacer (erreur d'hydratation React) : main.js les repose
  // régulièrement via cette fonction, qui ne fait rien s'ils sont déjà en place.
  function applyRootFlags() {
    const s = Pinema.settings;
    root.toggleAttribute('data-pinema-thumbs', !!s.thumbExpand);
    root.toggleAttribute('data-pinema-hide-share', !!s.hideShare);
    if (!root.style.getPropertyValue('--pinema-shift')) {
      root.style.setProperty('--pinema-thumb-size', `${BTN_SIZE}px`);
      root.style.setProperty('--pinema-shift', `${SHIFT}px`);
    }
  }

  const imgOf = (wrapper) => wrapper.querySelector('img');

  // --- Bouton sur les miniatures ---------------------------------------------

  // Décale vers la gauche les boutons Pinterest du coin bas-droit
  function shiftPinterestButtons(wrapper, ownButton) {
    const W = wrapper.getBoundingClientRect();
    for (const b of wrapper.querySelectorAll('button, [role="button"]')) {
      if (b === ownButton) continue;
      if (b.querySelector('button, [role="button"]')) continue; // le plus interne seulement
      const r = b.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const right = W.right - r.right - (b.hasAttribute(A_SHIFT) ? SHIFT : 0); // position d'origine
      if (W.bottom - r.bottom < CORNER && right < W.width / 2) b.setAttribute(A_SHIFT, '');
    }
  }

  function addThumbButton(wrapper) {
    const btn = Pinema.iconButton(THUMB_BTN, t('btnEnlarge'), Pinema.ICONS.expand, (e) => {
      e.preventDefault();
      e.stopPropagation();
      openLightbox(wrapper);
    });
    wrapper.appendChild(btn);
    // Pinterest ajoute ses boutons au survol, parfois en retard : on suit ses changements
    let raf = 0;
    new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => shiftPinterestButtons(wrapper, btn));
    }).observe(wrapper, { childList: true, subtree: true });
    return btn;
  }

  // Bouton ajouté au premier survol (pas de parcours de toute la page)
  document.addEventListener(
    'mouseover',
    (e) => {
      if (!Pinema.settings.thumbExpand) return;
      const wrapper = e.target.closest?.(WRAPPER_SEL);
      if (!wrapper || !imgOf(wrapper)) return;
      const btn = wrapper.querySelector(`:scope > .${THUMB_BTN}`) || addThumbButton(wrapper);
      requestAnimationFrame(() => shiftPinterestButtons(wrapper, btn));
    },
    true
  );

  // --- Visionneuse -----------------------------------------------------------

  let lightbox = null; // { el, img, wrapper, base }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.el.remove();
    lightbox = null;
    root.style.removeProperty('overflow');
    document.removeEventListener('keydown', onKey, true);
  }

  function onKey(e) {
    const actions = { Escape: closeLightbox, ArrowRight: () => step(1), ArrowLeft: () => step(-1) };
    const action = actions[e.key];
    if (!action) return;
    e.preventDefault();
    e.stopPropagation();
    action();
  }

  // Pin suivant / précédent dans l'ordre de la grille de Pinterest
  function step(dir) {
    if (!lightbox) return;
    const list = [...document.querySelectorAll(WRAPPER_SEL)].filter(imgOf);
    let i = list.indexOf(lightbox.wrapper);
    if (i < 0) {
      // Miniature recréée par Pinterest : on la retrouve par son image
      i = list.findIndex((w) => Pinema.baseOf(imgOf(w).currentSrc || imgOf(w).src) === lightbox.base);
    }
    const next = list[i + dir];
    if (i < 0 || !next) return;
    // La grille ne garde que les pins proches de l'écran : on suit le pin s'il en sort
    const r = next.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) next.scrollIntoView({ block: 'center' });
    show(next);
  }

  // Image en grand dans l'écran ; basse résolution agrandie jusqu'à 2×
  const MAX_UPSCALE = 2;
  function sizeLightboxImage(img) {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return;
    const fit = Math.min((window.innerWidth * 0.94) / w, (window.innerHeight * 0.92) / h);
    const scale = Math.min(fit, MAX_UPSCALE);
    img.style.width = `${Math.round(w * scale)}px`;
    img.style.height = `${Math.round(h * scale)}px`;
  }

  // Affiche la miniature tout de suite, puis l'original dès qu'il est chargé
  function show(wrapper) {
    const thumb = imgOf(wrapper);
    if (!thumb || !lightbox) return;
    const low = Pinema.biggestSrc(thumb);
    const base = Pinema.baseOf(low);
    Object.assign(lightbox, { wrapper, base });
    lightbox.img.alt = thumb.alt || '';
    lightbox.img.src = low;
    Pinema.loadFirst(Pinema.originalCandidates(low)).then((info) => {
      if (info && lightbox?.base === base) lightbox.img.src = info.src;
    });
  }

  function openLightbox(wrapper) {
    closeLightbox();
    const el = document.createElement('div');
    el.id = 'pinema-lightbox';
    const img = document.createElement('img');
    img.className = 'pinema-lb-img';
    img.title = t('openOriginal');
    img.addEventListener('load', () => sizeLightboxImage(img));
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      Pinema.openInTab(img.src);
    });
    const stop = (fn) => (e) => {
      e.stopPropagation();
      fn();
    };
    el.append(
      img,
      Pinema.iconButton('pinema-lb-close', t('lbClose'), Pinema.ICONS.close, stop(closeLightbox)),
      Pinema.iconButton('pinema-lb-nav pinema-lb-prev', t('lbPrev'), Pinema.ICONS.prev, stop(() => step(-1))),
      Pinema.iconButton('pinema-lb-nav pinema-lb-next', t('lbNext'), Pinema.ICONS.next, stop(() => step(1)))
    );
    el.addEventListener('click', closeLightbox); // clic sur le fond
    lightbox = { el, img, wrapper: null, base: '' };
    show(wrapper);
    document.addEventListener('keydown', onKey, true);
    root.style.overflow = 'hidden';
    document.body.appendChild(el);
  }

  // --- Réglages ----------------------------------------------------------------

  function update() {
    applyRootFlags();
    if (!Pinema.settings.thumbExpand) {
      document.querySelectorAll('.' + THUMB_BTN).forEach((b) => b.remove());
      document.querySelectorAll(`[${A_SHIFT}]`).forEach((b) => b.removeAttribute(A_SHIFT));
      closeLightbox();
    }
  }

  Pinema.thumbs = { update, applyRootFlags };
})();
