// Popup des réglages : textes traduits + cases reliées aux réglages.
(() => {
  'use strict';
  const Pinema = self.Pinema;

  document.documentElement.lang = chrome.i18n.getUILanguage();
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = chrome.i18n.getMessage(el.dataset.i18n);
  }

  const inputs = Object.fromEntries(
    Object.keys(Pinema.DEFAULTS).map((key) => [key, document.getElementById(key)])
  );

  // Grise les options qui dépendent d'une option désactivée
  function refresh() {
    for (const row of document.querySelectorAll('[data-requires]')) {
      row.classList.toggle('disabled', !inputs[row.dataset.requires].checked);
    }
  }

  Pinema.loadSettings().then((settings) => {
    for (const [key, input] of Object.entries(inputs)) input.checked = settings[key];
    refresh();
  });

  for (const [key, input] of Object.entries(inputs)) {
    input.addEventListener('change', () => {
      Pinema.saveSetting(key, input.checked);
      refresh();
    });
  }
})();
