// ESLint flat config. Runs as part of `npm run build` (the CI gate), so the tree must stay
// lint-clean. Scope: app source, e2e specs, and the node scripts — not generated output or
// the vendored GSAP bundle.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      'dist/',
      '**/node_modules/',
      '.claude/',
      '.render-dev/',
      'src/assets/gsap.min.js',
      'example_projects/', // vendored SPX reference packs, not ours to lint
      'playwright-report/',
      'test-results/',
    ],
  },

  // TypeScript + React (the app) and the Playwright specs.
  {
    files: ['src/**/*.{ts,tsx}', 'e2e/**/*.ts', 'vite.config.ts', 'playwright*.config.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      // Template runtimes and control-panel scripts are emitted as strings and often name
      // their parameters for readability even when unused; keep the underscore escape hatch.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // The React-Compiler-era rules flag two deliberate house patterns: state mirrored into a
      // ref during render (the drag/phase machinery in the timeline components reads it from
      // window-level event handlers) and reset-state-on-open effects (dialogs/wizard). Both
      // remain legal on React 19; re-enable these rules only as part of a dedicated refactor
      // (or React Compiler adoption). The classic rules-of-hooks and exhaustive-deps stay on.
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },

  // Node scripts (dev tooling). Browser globals too: the Playwright sweeps run code inside
  // page.evaluate callbacks, which execute in the page.
  {
    files: ['scripts/**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },

  // The render API functions (Vercel serverless; fetch-style handlers under Node).
  {
    files: ['api/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // The Remotion render worker (its own package; the composition runs in a browser bundle,
  // the .mjs entrypoints under Node).
  {
    files: ['render-worker/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    files: ['render-worker/**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);
