// ESLint flat config. Runs as part of `npm run build` (the CI gate), so the tree must stay
// lint-clean. Scope: app source, e2e specs, and the node scripts — not generated output or
// the vendored GSAP bundle.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

// Shared restriction entries for the Architecture Stage A blocks below (docs/ARCHITECTURE.md §3).
const supabaseRestriction = {
  name: '@supabase/supabase-js',
  message:
    'Only src/backend/ talks to Supabase directly — get the client via getSupabase() and feature-detect via isBackendConfigured() (docs/ARCHITECTURE.md §3, invariant 1).',
  allowTypeImports: true,
};
const storeRestriction = {
  group: ['**/store', '**/store/**'],
  message:
    'src/store/ is editor-UI state; processing domains take and return plain documents (docs/ARCHITECTURE.md §3, invariant 3).',
};
const componentsRestriction = {
  group: ['**/components', '**/components/**'],
  message:
    'Nothing imports src/components/ — the UI is the top of the graph (docs/ARCHITECTURE.md §3, invariant 4).',
};

export default tseslint.config(
  {
    ignores: [
      'dist/',
      '**/node_modules/',
      '.claude/',
      '.render-dev/',
      'render-worker/bundle/', // webpack output (render-worker/bundle.mjs), not source
      'render-worker/remotion/*.generated.ts', // data-URL font CSS (scripts/gen-video-font-css.mjs)
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

  // ---- Architecture Stage A (docs/ARCHITECTURE.md §3, §7) --------------------------------
  // Machine-pins invariants 1, 3 and 4 of the architecture doc, which were verified clean when
  // introduced — these blocks stop regressions; the full edge table stays review-time until
  // Stage B (dependency-cruiser). Flat-config gotcha: when several blocks match one file, the
  // LAST rule config replaces the earlier ones (options never merge), so src/ is split into
  // disjoint regions below, each carrying the full restriction set for its region. Imports are
  // relative (no path aliases), hence the `**/store`-style gitignore patterns.
  //
  //  - invariant 1: @supabase/supabase-js is value-imported only inside src/backend/ — every
  //    other module gets the client via getSupabase() and feature-detects via
  //    isBackendConfigured(). Type-only imports (SupabaseClient) are fine anywhere. api/ and
  //    e2e/configured/ run server/test-side and sit outside this scope on purpose.
  //  - invariant 3: src/store/ is the editor-UI state; only components/ and the entry files
  //    import it. Processing domains take and return plain documents.
  //  - invariant 4: nothing imports src/components/ — UI is the top of the graph.
  {
    // The default region: every src/ module that is subject to all three restrictions.
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/backend/**',
      'src/components/**',
      'src/store/**',
      'src/App.tsx',
      'src/main.tsx',
      'src/blocks/registry.ts',
    ],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', {
        paths: [supabaseRestriction],
        patterns: [storeRestriction, componentsRestriction],
      }],
    },
  },
  {
    // The UI region may import store/ and components/ freely; Supabase stays behind backend/.
    files: ['src/components/**/*.{ts,tsx}', 'src/App.tsx', 'src/main.tsx'],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', { paths: [supabaseRestriction] }],
    },
  },
  {
    // backend/ owns the Supabase client but is still below store/ and components/.
    files: ['src/backend/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', {
        patterns: [storeRestriction, componentsRestriction],
      }],
    },
  },
  {
    // store/ imports itself freely; everything else still applies.
    files: ['src/store/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', {
        paths: [supabaseRestriction],
        patterns: [componentsRestriction],
      }],
    },
  },
  {
    // Grandfathered (ARCHITECTURE.md §6): blocks/registry.ts type-imports EditorTab from the
    // store. Store restriction lifted for this one file; delete this block when that row falls.
    files: ['src/blocks/registry.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', {
        paths: [supabaseRestriction],
        patterns: [componentsRestriction],
      }],
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
