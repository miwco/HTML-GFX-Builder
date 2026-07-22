/**
 * Stage B of the architecture enforcement roadmap (docs/ARCHITECTURE.md §7): the dependency
 * ratchet. The `allowed` array below IS the §3 edge table - anything not matching an entry
 * fails `npm run build`. Adding a cross-domain edge therefore means editing BOTH the doc's §3
 * table and this file in the same PR. The entries marked "§6 debt" mirror the grandfathered
 * rows in docs/ARCHITECTURE.md §6 - delete the allowance together with its row when the debt
 * is paid.
 *
 * Scope is src/ only: api/, render-worker/ and player-host/ are separate programs with their
 * own tsconfigs; their sanctioned imports into src/render are outside this graph on purpose.
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'The runtime module graph stays a DAG (docs/ARCHITECTURE.md §3) - break the cycle, do ' +
        'not extend it. Cycles containing an `import type` edge are tolerated: they are erased ' +
        'at compile time (the registry/type-hub patterns in export/, ai/ and templates/shared ' +
        'rely on this), so only cycles made entirely of value imports - the kind that can bite ' +
        'at module-init time - are banned.',
      from: {},
      to: { circular: true, viaOnly: { dependencyTypesNot: ['type-only'] } },
    },
  ],

  allowed: [
    // ---- generic allowances ---------------------------------------------------------------
    {
      comment: 'Everything may import the layer-0 kernel (model/, assets/) - §3 preamble',
      from: { path: '^src/' },
      to: { path: '^src/(model|assets)/' },
    },
    {
      comment: 'A domain may import itself freely',
      from: { path: '^src/([^/]+)/' },
      to: { path: '^src/$1/' },
    },
    {
      comment: 'The entry files at the src root (App.tsx, main.tsx, styles.css) wire the app',
      from: { path: '^src/[^/]+$' },
      to: { path: '^src/' },
    },
    {
      comment:
        'Vite asset-suffix imports (?raw / ?url / ?inline) do not resolve under enhanced-resolve; the eslint layer and the build cover them',
      from: { path: '^src/' },
      to: { path: '[?](raw|url|inline)$', couldNotResolve: true },
    },

    // ---- the §3 edge table ----------------------------------------------------------------
    {
      comment: '§3: templates -> blocks (animData, animMachine, shared runtime)',
      from: { path: '^src/templates/' },
      to: { path: '^src/blocks/' },
    },
    {
      comment: '§3: blocks -> templates (preset data tables, shared/animRuntime, shared/textFit)',
      from: { path: '^src/blocks/' },
      to: { path: '^src/templates/' },
    },
    {
      comment: '§3: validation -> blocks, templates, preview',
      from: { path: '^src/validation/' },
      to: { path: '^src/(blocks|templates|preview)/' },
    },
    {
      comment: '§3: store -> blocks, validation',
      from: { path: '^src/store/' },
      to: { path: '^src/(blocks|validation)/' },
    },
    {
      comment: '§3: ai -> templates, blocks, validation, video',
      from: { path: '^src/ai/' },
      to: { path: '^src/(templates|blocks|validation|video)/' },
    },
    {
      comment: '§3: ai -> backend, getAccessToken only (proxy metering)',
      from: { path: '^src/ai/' },
      to: { path: '^src/backend/auth' },
    },
    {
      comment: '§3: video -> validation, render',
      from: { path: '^src/video/' },
      to: { path: '^src/(validation|render)/' },
    },
    {
      comment: '§3: render -> control, preview, showchat',
      from: { path: '^src/render/' },
      to: { path: '^src/(control|preview|showchat)/' },
    },
    {
      comment: '§3: render -> backend, getAccessToken only',
      from: { path: '^src/render/' },
      to: { path: '^src/backend/auth' },
    },
    {
      comment: '§3: export -> blocks, control (panel/receiver generators are the packaging seam)',
      from: { path: '^src/export/' },
      to: { path: '^src/(blocks|control)/' },
    },
    {
      comment: '§3: control -> blocks, backend',
      from: { path: '^src/control/' },
      to: { path: '^src/(blocks|backend)/' },
    },
    {
      comment: '§3: community -> backend, validation',
      from: { path: '^src/community/' },
      to: { path: '^src/(backend|validation)/' },
    },
    {
      comment: '§3: showchat -> backend, control',
      from: { path: '^src/showchat/' },
      to: { path: '^src/(backend|control)/' },
    },
    {
      comment: '§3: components may import any lower domain (through its seam - review-time)',
      from: { path: '^src/components/' },
      to: { path: '^src/' },
    },

    // ---- §6 grandfathered debts (delete together with the doc row) ------------------------
    {
      comment: '§6 debt: model -> templates (defaultTemplate imports lt01)',
      from: { path: '^src/model/defaultTemplate\\.ts$' },
      to: { path: '^src/templates/lowerThirds/lt01' },
    },
    {
      comment: '§6 debt: model -> export (importTemplate imports ensureExternalRefs)',
      from: { path: '^src/model/importTemplate\\.ts$' },
      to: { path: '^src/export/common' },
    },
    {
      comment: '§6 debt: model -> blocks (packets imports cssVars)',
      from: { path: '^src/model/packets\\.ts$' },
      to: { path: '^src/blocks/cssVars' },
    },
    {
      comment: '§6 debt: model -> editor (prefs type-imports CommentVisibility)',
      from: { path: '^src/model/prefs\\.ts$' },
      to: { path: '^src/editor/commentVisibility' },
    },
    {
      comment: '§6 debt: blocks -> store (registry type-imports EditorTab)',
      from: { path: '^src/blocks/registry\\.ts$' },
      to: { path: '^src/store/templateStore' },
    },
    {
      comment: '§6 debt: control -> export (slug is a generic util misplaced in export/)',
      from: { path: '^src/control/(controlModel|realtimeControl)\\.ts$' },
      to: { path: '^src/export/slug' },
    },
  ],
  allowedSeverity: 'error',

  options: {
    doNotFollow: { path: 'node_modules' },
    includeOnly: '^src/',
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
