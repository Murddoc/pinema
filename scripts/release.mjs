// Publie une nouvelle version : `npm run release -- patch|minor|major`
//   1. vérifie que tout est commité, sur la branche main ;
//   2. augmente la version dans manifest.json et package.json ;
//   3. vérifie le code et construit dist/pinema-<version>.zip ;
//   4. commit « Version x.y.z », étiquette vx.y.z, push.
// GitHub (.github/workflows/release.yml) prend le relais : il refait les
// vérifications, crée la release GitHub et envoie l'archive au Chrome Web Store.
// Option --no-push : tout faire sauf l'envoi sur GitHub.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const level = args.find((a) => !a.startsWith('--')) || 'patch';
const push = !args.includes('--no-push');

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
const fail = (msg) => {
  console.error(`✘ ${msg}`);
  process.exit(1);
};

if (!['patch', 'minor', 'major'].includes(level)) fail(`niveau inconnu « ${level} » (patch, minor ou major)`);
if (git('status', '--porcelain')) fail('des modifications ne sont pas commitées : commite-les avant la release');
const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
if (branch !== 'main') fail(`la release se fait depuis main (branche actuelle : ${branch})`);

// Nouvelle version
const manifestPath = join(ROOT, 'manifest.json');
const manifestText = readFileSync(manifestPath, 'utf8');
const current = JSON.parse(manifestText).version;
const [maj, min, pat] = current.split('.').map(Number);
const next = { major: `${maj + 1}.0.0`, minor: `${maj}.${min + 1}.0`, patch: `${maj}.${min}.${pat + 1}` }[level];
if (git('tag', '--list', `v${next}`)) fail(`l'étiquette v${next} existe déjà`);

// Remplacement ciblé pour garder la mise en forme des fichiers
const bump = (file) => {
  const p = join(ROOT, file);
  const text = readFileSync(p, 'utf8');
  const out = text.replace(/("version"\s*:\s*")[^"]+(")/, `$1${next}$2`);
  if (out === text && !text.includes(`"version": "${next}"`)) fail(`version introuvable dans ${file}`);
  writeFileSync(p, out);
};
bump('manifest.json');
bump('package.json');
console.log(`Version ${current} → ${next}`);

try {
  execFileSync(process.execPath, [join(ROOT, 'scripts/zip.mjs')], { cwd: ROOT, stdio: 'inherit' });
} catch {
  writeFileSync(manifestPath, manifestText);
  git('checkout', '--', 'package.json');
  fail('vérifications échouées : version remise à ' + current);
}

git('add', 'manifest.json', 'package.json');
git('commit', '-m', `Version ${next}`);
git('tag', '-a', `v${next}`, '-m', `Version ${next}`);
console.log(`✔ Commit et étiquette v${next} créés`);

if (push) {
  execFileSync('git', ['push', 'origin', 'main', `v${next}`], { cwd: ROOT, stdio: 'inherit' });
  console.log('✔ Envoyé sur GitHub : la publication automatique démarre (gh run watch pour suivre)');
} else {
  console.log(`Pas d'envoi (--no-push). Pour envoyer : git push origin main v${next}`);
}
