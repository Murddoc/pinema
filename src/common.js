// Outils communs aux modules de la page Pinterest.
(() => {
  'use strict';
  const Pinema = (self.Pinema = self.Pinema || {});

  // Réglages courants (remplis par main.js)
  Pinema.settings = { ...Pinema.DEFAULTS };

  // Texte traduit (_locales/*/messages.json)
  Pinema.t = (key) => chrome.i18n.getMessage(key) || key;

  // Journal de diagnostic : dans la console de Pinterest, taper
  //   localStorage.pinemaDebug = 1
  let lastLog = '';
  Pinema.log = (msg) => {
    let on = false;
    try {
      on = !!localStorage.getItem('pinemaDebug');
    } catch {
      // stockage inaccessible : pas de journal
    }
    if (!on) return;
    const line = `${location.pathname} → ${msg}`;
    if (line !== lastLog) {
      lastLog = line;
      console.log('[Pinema]', line);
    }
  };

  // --- Images Pinterest (i.pinimg.com/<taille>/aa/bb/cc/<id>.<ext>) -----------

  // Identifiant d'image indépendant de la taille (236x, 736x, originals…) et du
  // format (l'original peut être en .png quand les miniatures sont en .jpg)
  Pinema.baseOf = (src) =>
    (src || '').replace(/\/(originals|\d+x\d*)\//, '/_/').replace(/\.(jpe?g|png|webp|gif)$/i, '');

  // Plus grande version annoncée par l'image (srcset), sinon sa source actuelle
  Pinema.biggestSrc = (img) => {
    let src = img.currentSrc || img.src;
    const set = img.getAttribute('srcset');
    if (set) {
      let best = 0;
      for (const part of set.split(',')) {
        const [url, desc] = part.trim().split(/\s+/);
        const v = parseFloat(desc) || 1;
        if (url && v >= best) {
          best = v;
          src = url;
        }
      }
    }
    return src;
  };

  // URLs à essayer pour l'original : .jpg/.webp tel quel, puis .png
  Pinema.originalCandidates = (src) => {
    const orig = src.replace(/\/\d+x\d*\//, '/originals/');
    const png = orig.replace(/\.(jpe?g|webp)$/i, '.png');
    return [orig, png].filter((s, i, a) => s !== src && a.indexOf(s) === i);
  };

  // Charge la première URL qui existe. Résout { src, w, h } ou null.
  Pinema.loadFirst = (urls) =>
    new Promise((resolve) => {
      const list = [...urls];
      const next = () => {
        const src = list.shift();
        if (!src) return resolve(null);
        const probe = new Image();
        probe.onload = () => resolve({ src, w: probe.naturalWidth, h: probe.naturalHeight });
        probe.onerror = next;
        probe.src = src;
      };
      next();
    });

  // --- Éléments d'interface ----------------------------------------------------

  // Icône SVG (tracés au trait), construite sans innerHTML
  const SVG_NS = 'http://www.w3.org/2000/svg';
  Pinema.svgIcon = (d) => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
    return svg;
  };

  Pinema.ICONS = {
    expand: 'M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7',
    visualSearch:
      'M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3' +
      'M15 11.5a3.5 3.5 0 1 1-7 0a3.5 3.5 0 0 1 7 0M14 14l3 3',
    close: 'M6 6l12 12M18 6L6 18',
    prev: 'M15 5l-7 7 7 7',
    next: 'M9 5l7 7-7 7'
  };

  // Bouton avec icône et libellé accessible
  Pinema.iconButton = (className, label, icon, onClick) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = className;
    b.title = label;
    b.setAttribute('aria-label', label);
    b.appendChild(Pinema.svgIcon(icon));
    b.addEventListener('click', onClick);
    return b;
  };

  // Ouvre une image dans un nouvel onglet
  Pinema.openInTab = (src) => window.open(src, '_blank', 'noopener');
})();
