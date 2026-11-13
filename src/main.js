// Point d'entrée sur Pinterest : charge les réglages et surveille la page.
(() => {
  'use strict';
  const Pinema = self.Pinema;
  const { cinema, thumbs } = Pinema;

  Pinema.loadSettings().then((s) => {
    Pinema.settings = s;
    thumbs.update();
    cinema.schedule();
  });

  Pinema.onSettingsChanged((changes) => {
    Object.assign(Pinema.settings, changes);
    thumbs.update();
    cinema.reset();
  });

  // Pinterest est une application d'une seule page : on surveille le DOM…
  new MutationObserver(cinema.schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'srcset']
  });

  // …l'adresse (navigation sans rechargement) et la fin des transitions
  let lastHref = location.href;
  setInterval(() => {
    thumbs.applyRootFlags();
    if (location.href !== lastHref) {
      lastHref = location.href;
      cinema.reset();
    } else {
      cinema.tick();
    }
  }, 500);

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(cinema.reset, 250);
  });
})();
