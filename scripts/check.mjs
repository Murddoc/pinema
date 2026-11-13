// Vérifications avant publication : `npm run check`
//  1. ESLint sur tout le code
//  2. manifest.json : fichiers référencés présents, limites du Chrome Web Store
//  3. traductions : mêmes clés en anglais et en français, aucune clé manquante
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const fail = (msg) => errors.push(msg);
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

// 1. ESLint ------------------------------------------------------------------
try {
  execFileSync(process.execPath, [join(ROOT, 'node_modules/eslint/bin/eslint.js'), '.'], {
    cwd: ROOT,
    stdio: 'inherit'
  });
} catch {
  fail('ESLint a signalé des problèmes (voir ci-dessus)');
}

// 2. Manifest ------------------------------------------------------------------
const manifest = readJson('manifest.json');
const referenced = [
  ...Object.values(manifest.icons),
  ...Object.values(manifest.action.default_icon),
  manifest.action.default_popup,
  ...manifest.content_scripts.flatMap((cs) => [...cs.js, ...(cs.css || [])])
];
for (const file of referenced) {
  if (!existsSync(join(ROOT, file))) fail(`manifest : fichier introuvable ${file}`);
}
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) fail(`manifest : version invalide ${manifest.version}`);

// 3. Traductions ----------------------------------------------------------------
const locales = readdirSync(join(ROOT, '_locales'));
const messages = Object.fromEntries(locales.map((l) => [l, readJson(`_locales/${l}/messages.json`)]));
const reference = messages[manifest.default_locale];
if (!reference) fail(`_locales : langue par défaut ${manifest.default_locale} absente`);

for (const [locale, msgs] of Object.entries(messages)) {
  for (const key of Object.keys(reference)) if (!msgs[key]) fail(`_locales/${locale} : clé manquante ${key}`);
  for (const key of Object.keys(msgs)) if (!reference[key]) fail(`_locales/${locale} : clé en trop ${key}`);
  // Limites du Chrome Web Store
  if (msgs.extName?.message.length > 75) fail(`_locales/${locale} : nom > 75 caractères`);
  if (msgs.extShortName?.message.length > 12) fail(`_locales/${locale} : nom court > 12 caractères`);
  if (msgs.extDescription?.message.length > 132) fail(`_locales/${locale} : description > 132 caractères`);
}

// Clés utilisées dans le code et le popup
const used = new Set();
const sources = ['manifest.json', 'popup/popup.html', ...readdirSync(join(ROOT, 'src')).map((f) => `src/${f}`)];
for (const file of sources) {
  const text = read(file);
  for (const m of text.matchAll(/__MSG_(\w+)__|data-i18n="(\w+)"|\bt\('(\w+)'\)|title: '(\w+)'/g)) {
    used.add(m[1] || m[2] || m[3] || m[4]);
  }
}
for (const key of used) if (reference && !reference[key]) fail(`traduction manquante pour la clé ${key}`);

// Résultat ------------------------------------------------------------------------
if (errors.length) {
  console.error(`\n✖ ${errors.length} problème(s) :\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
console.log(`✔ Tout est bon : code, manifest (v${manifest.version}), traductions (${locales.join(', ')}).`);
