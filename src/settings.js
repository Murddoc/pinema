// Réglages de Pinema : valeurs par défaut et accès au stockage Chrome.
// Partagé entre les scripts de la page Pinterest et le popup.
(() => {
  'use strict';
  const Pinema = (self.Pinema = self.Pinema || {});

  Pinema.DEFAULTS = Object.freeze({
    cinema: true,       // mode cinéma sur les pages de pins
    allImages: true,    // toutes les images (verticales, basse résolution) en mode cinéma
    imageButtons: true, // boutons Agrandir / Recherche visuelle sur la grande image
    darkStage: true,    // fond sombre derrière l'image en mode cinéma
    thumbExpand: true,  // bouton « agrandir » sur les miniatures
    hideShare: false    // enlever le bouton « Send » de Pinterest sur les miniatures
  });

  Pinema.loadSettings = () =>
    new Promise((resolve) => {
      chrome.storage.sync.get(Pinema.DEFAULTS, (s) => resolve({ ...Pinema.DEFAULTS, ...s }));
    });

  Pinema.saveSetting = (key, value) => chrome.storage.sync.set({ [key]: value });

  // Appelle `callback(changements)` quand un réglage connu change
  Pinema.onSettingsChanged = (callback) => {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      const known = {};
      for (const [k, { newValue }] of Object.entries(changes)) {
        if (k in Pinema.DEFAULTS) known[k] = newValue ?? Pinema.DEFAULTS[k];
      }
      if (Object.keys(known).length) callback(known);
    });
  };
})();
