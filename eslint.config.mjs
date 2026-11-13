// Configuration ESLint : vérifie le code de l'extension sans l'exécuter.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'dist/'] },
  js.configs.recommended,
  {
    // Code de l'extension (scripts classiques chargés par Chrome)
    files: ['src/**/*.js', 'popup/**/*.js'],
        languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, ...globals.webextensions, Pinema: 'writable' }
    },
    rules: {
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      'no-implicit-globals': 'error',
      'no-shadow': 'warn'
    }
  },
  {
    // Scripts d'outillage (Node)
    files: ['scripts/**/*.mjs', 'eslint.config.mjs'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: globals.node }
  }
];
