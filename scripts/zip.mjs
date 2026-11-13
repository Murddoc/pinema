// Crée l'archive à envoyer au Chrome Web Store : `npm run zip`
// → dist/pinema-<version>.zip, avec uniquement les fichiers de l'extension
//   (pas node_modules, scripts, configuration…).
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['manifest.json', '_locales', 'icons', 'popup', 'src'];

// Vérifie d'abord que tout est correct
execFileSync(process.execPath, [join(ROOT, 'scripts/check.mjs')], { stdio: 'inherit' });

const { version } = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
const out = join('dist', `pinema-${version}.zip`);
mkdirSync(join(ROOT, 'dist'), { recursive: true });
rmSync(join(ROOT, out), { force: true });

// Windows 10+ et macOS : `tar -a` choisit le format zip d'après l'extension.
// Linux (serveur GitHub) : le tar GNU ne sait pas faire de zip, on utilise `zip`.
if (process.platform === 'linux') {
  execFileSync('zip', ['-r', '-q', '-X', out, ...FILES], { cwd: ROOT, stdio: 'inherit' });
} else {
  execFileSync('tar', ['-a', '-c', '-f', out, ...FILES], { cwd: ROOT, stdio: 'inherit' });
}
console.log(`✔ Archive prête : ${out}`);
