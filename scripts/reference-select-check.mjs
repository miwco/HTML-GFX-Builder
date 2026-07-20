// Reference-card selection check - FREE, deterministic, spends nothing.
//
//   node scripts/reference-select-check.mjs [briefs.json]
//
// Prints what each arm of the reference selector picks for every brief in the bank, side by
// side, plus the axis separation of each pick. Defaults to scripts/video-bench-briefs.varied.json.
// Requires the dev server (this checkout's port - scripts/dev-port.mjs); Vite serves the source
// modules, so this imports the REAL selector rather than a copy of its logic.
//
// WHY THIS EXISTS. `video-bench.mjs --stub` cannot check any of this: --stub seeds an empty key,
// so the app falls back to `stubVideoProvider`, which never imports referenceCards at all.
// `selectReferenceCards` is called from exactly one place - claudeVideoProvider - on the PAID
// path. So before this script the only way to see the selector work was to spend money on a
// bench bank, or to import the module by hand in a browser console.
//
// Doing it by hand is how the selector's worst bug survived: checked against short
// keyword-shaped strings it looked fine, and only real brief prose revealed it was returning
// byte-identical results to the legacy path on six of seven briefs. Verbose real-world prose
// matches several cards by keyword, which is a different regime entirely. Hence: this reads the
// SAME brief bank the paid bench runs, never invented test strings.
//
// Three numbers are worth watching, and a regression in any of them means the paid A/B would be
// measuring nothing:
//   - arms differ on N/7      - if this collapses toward 0/7, contrast selection is inert.
//   - anchor kept N/N         - the brief-matched card must SURVIVE. Unanchored max-min returns
//                               the two most mutually-unlike cards in the pool and discards the
//                               match (an awards brief lost the celebration card outright).
//   - mean axis separation    - contrast should sit clearly above legacy; that spread is the
//                               entire mechanism being bought.
//
// The recency ledger is cleared before every brief, so this measures SELECTION alone. The bench
// deliberately does not do that (one page, one localStorage, so the ledger warms across a whole
// arm) - which is why a bench arm and this script are not expected to agree card for card.

import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { devPort } from './dev-port.mjs';

const BANK = process.argv[2] ?? 'scripts/video-bench-briefs.varied.json';
const BASE = `http://localhost:${devPort()}`;
const briefs = JSON.parse(readFileSync(BANK, 'utf8'));

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (m) => {
  if (m.type() === 'error') console.error('[page]', m.text());
});

try {
  await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
} catch {
  console.error(`No dev server on ${BASE}. Start it first (preview_start "dev-bench").`);
  await browser.close();
  process.exit(1);
}

const result = await page.evaluate(async (briefs) => {
  const t = Date.now();
  const rc = await import(`/src/ai/video/referenceCards.ts?t=${t}`);
  const rs = await import(`/src/ai/referenceSelect.ts?t=${t}`);
  const RECENCY_KEY = 'spx-gfx-ai-reference-recency';

  // Mean pairwise distance across a pick: how far apart the chosen cards actually are.
  const spread = (cards) => {
    if (cards.length < 2) return null;
    let sum = 0;
    let n = 0;
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        sum += rs.axisDistance(cards[i].axes, cards[j].axes);
        n++;
      }
    }
    return +(sum / n).toFixed(3);
  };

  const ids = (cards) => cards.map((c) => c.id);
  const rows = [];
  for (const b of briefs) {
    localStorage.removeItem(RECENCY_KEY); // cold every time - selection only, no anti-dominance
    const contrast = rc.selectReferenceCards(b.prompt);
    const legacy = rc.detectReferenceCards(b.prompt);
    const matchedIds = rc.REFERENCE_CARDS.filter((c) => c.keywords.test(b.prompt)).map((c) => c.id);
    rows.push({
      label: b.label,
      contrast: ids(contrast),
      legacy: ids(legacy),
      differs: ids(contrast).join() !== ids(legacy).join(),
      spreadContrast: spread(contrast),
      spreadLegacy: spread(legacy),
      // The invariant is that SOME card the brief actually matched survives into the pick - the
      // failure this guards is unanchored max-min discarding the match entirely and returning
      // two extremes. Deliberately not "legacy's first card": that is declaration order, not a
      // relevance signal, and pinning the check to it would forbid ever choosing a better anchor.
      anchorKept:
        matchedIds.length > 0 ? ids(contrast).some((id) => matchedIds.includes(id)) : null,
    });
  }

  const mean = (key) => {
    const vals = rows.map((r) => r[key]).filter((v) => v != null);
    return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(3) : null;
  };
  const anchored = rows.filter((r) => r.anchorKept !== null);

  return {
    poolSize: rc.REFERENCE_CARDS.length,
    flag: rs.USE_CONTRAST_SELECTION,
    rows,
    differs: rows.filter((r) => r.differs).length,
    total: rows.length,
    anchorKept: anchored.filter((r) => r.anchorKept).length,
    anchorTotal: anchored.length,
    meanContrast: mean('spreadContrast'),
    meanLegacy: mean('spreadLegacy'),
  };
}, briefs);

await browser.close();

const fmt = (list) => (list.length ? list.join(' + ') : '(none)');
console.log(`pool: ${result.poolSize} cards   USE_CONTRAST_SELECTION=${result.flag}   bank: ${BANK}\n`);
for (const r of result.rows) {
  console.log(`${r.differs ? '*' : ' '} ${r.label}`);
  console.log(`    contrast  ${fmt(r.contrast)}   spread ${r.spreadContrast ?? 'n/a'}`);
  console.log(`    legacy    ${fmt(r.legacy)}   spread ${r.spreadLegacy ?? 'n/a'}`);
}
console.log(`\narms differ on        ${result.differs}/${result.total}`);
console.log(`brief anchor kept     ${result.anchorKept}/${result.anchorTotal}`);
console.log(`mean axis separation  contrast ${result.meanContrast}  vs  legacy ${result.meanLegacy}`);

if (result.flag && result.anchorKept < result.anchorTotal) {
  console.error('\nFAIL: contrast selection dropped a brief-matched card. Fix before benching.');
  process.exit(1);
}
if (result.flag && result.differs === 0) {
  console.error('\nFAIL: contrast selection is inert on this bank - an A/B would measure nothing.');
  process.exit(1);
}
