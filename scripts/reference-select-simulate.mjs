// Dry-run the reference selection of a WHOLE paid bench pass, for free.
//
//   node scripts/reference-select-simulate.mjs [briefs.json] [runs]
//
// Requires the dev server (this checkout's port); imports the real selector through Vite.
//
// WHY THIS EXISTS. The paid A/B (contrast selection vs the legacy keyword pick) costs real
// money per pass, and most of what separates the two arms is decided BEFORE any model call:
// which reference cards each generation is handed. That part is fully deterministic, so it can
// be replayed exactly, for nothing.
//
// The replay is faithful only if it copies the bench's real shape, which is easy to get wrong:
//   - `video-bench.mjs` iterates BRIEF-outer, RUN-inner, over ONE page. localStorage therefore
//     survives every generation in a pass, so the anti-dominance ledger WARMS as the pass runs.
//     Generation 21 does not see what generation 1 saw.
//   - `claudeVideoProvider.directMotion` calls `noteReferenceUse` exactly once per generation,
//     right after selecting - so one generation is one ledger write of the whole chosen set.
//   - Recency filters COMPANIONS only. The anchor is picked before the ledger is consulted, so
//     a brief's anchor repeats across its runs by construction; only the companion rotates.
//   - The legacy arm writes the ledger too (the provider always does) but never reads it, so
//     those writes are inert. Simulated anyway rather than special-cased.
//
// WHAT THIS CAN AND CANNOT DECIDE. It reports the reference sets, not the videos made from
// them, so it is a VETO and not a green light. If the two arms hand over near-identical sets,
// the paid pass cannot measure anything and should not be bought. If they differ sharply, the
// pass is worth running - but only real generations can say whether different references
// actually produce better or more distinct DESIGNS.

import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { devPort } from './dev-port.mjs';

const POS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const BANK = POS[0] ?? 'scripts/video-bench-briefs.varied.json';
const RUNS = Math.max(1, Number(POS[1]) || 3);
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

const sim = await page.evaluate(
  async ({ briefs, runs }) => {
    const t = Date.now();
    const rc = await import(`/src/ai/video/referenceCards.ts?t=${t}`);
    const rs = await import(`/src/ai/referenceSelect.ts?t=${t}`);
    const RECENCY_KEY = 'spx-gfx-ai-reference-recency';
    const byId = new Map(rc.REFERENCE_CARDS.map((c) => [c.id, c]));

    // Distance between two PICKS: mean cross distance over every card pair. Two picks sharing
    // a card score low, which is what we want - a shared card is shared design DNA.
    const setDistance = (a, b) => {
      if (!a.length || !b.length) return null;
      let sum = 0;
      for (const x of a) for (const y of b) sum += rs.axisDistance(byId.get(x).axes, byId.get(y).axes);
      return sum / (a.length * b.length);
    };

    // One arm = one pass over the bench's exact order, on one continuously-warming ledger.
    const runArm = (useContrast) => {
      localStorage.removeItem(RECENCY_KEY);
      const seq = [];
      for (const b of briefs) {
        for (let run = 1; run <= runs; run++) {
          const picked = useContrast ? rc.selectReferenceCards(b.prompt) : rc.detectReferenceCards(b.prompt);
          rs.noteReferenceUse(picked.map((c) => c.id)); // exactly what the provider does
          seq.push({ label: b.label, run, ids: picked.map((c) => c.id) });
        }
      }
      return seq;
    };

    const analyse = (seq) => {
      const withCards = seq.filter((g) => g.ids.length > 0);
      const histogram = {};
      for (const g of seq) for (const id of g.ids) histogram[id] = (histogram[id] ?? 0) + 1;

      // The PRIMARY metric's proxy: how far apart are the references handed to DIFFERENT briefs?
      const across = (gens) => {
        let sum = 0;
        let n = 0;
        let collisions = 0;
        for (let i = 0; i < gens.length; i++) {
          for (let j = i + 1; j < gens.length; j++) {
            if (gens[i].label === gens[j].label) continue;
            const d = setDistance(gens[i].ids, gens[j].ids);
            if (d == null) continue;
            sum += d;
            n++;
            if (gens[i].ids.join() === gens[j].ids.join()) collisions++;
          }
        }
        return { mean: n ? +(sum / n).toFixed(3) : null, pairs: n, collisions };
      };
      const all = across(withCards);
      // Run 1 only: every brief on the SAME ledger state it would have had first time round,
      // so this compares selection alone, with the anti-dominance rotation taken out. It is the
      // honest read of axis (3), since rotation is scored by axis (4) instead.
      const run1 = across(withCards.filter((g) => g.run === 1));

      // Within a brief: do its runs vary at all? (The ledger is the only thing that can do this.)
      const perBrief = {};
      for (const g of seq) (perBrief[g.label] ??= new Set()).add(g.ids.join('+') || '(none)');

      return {
        generations: seq.length,
        withCards: withCards.length,
        distinctPicks: new Set(seq.map((g) => g.ids.join('+'))).size,
        acrossBriefMean: all.mean,
        acrossBriefMeanRun1: run1.mean,
        run1Collisions: run1.collisions,
        run1Pairs: run1.pairs,
        crossBriefCollisions: all.collisions,
        crossBriefPairs: all.pairs,
        histogram,
        perBriefVariants: Object.fromEntries(Object.entries(perBrief).map(([k, v]) => [k, v.size])),
      };
    };

    const seqA = runArm(true);
    const seqB = runArm(false);

    // Why a brief lands where it does: how many cards its prose matches at all, and which one
    // ends up anchoring. The anchor is exempt from anti-dominance by design, so an anchor that
    // recurs across many briefs puts a ceiling on how far apart their picks can ever be.
    // Report the DECLARATION-ORDER anchor beside the one actually chosen. They differ only when
    // a brief matches several cards and strength picks a different winner, so this is the one
    // place the anchor rule's effect (or lack of it) is visible.
    const matchProfile = briefs.map((b) => {
      const matched = rc.REFERENCE_CARDS.filter((c) => c.keywords.test(b.prompt));
      localStorage.removeItem(RECENCY_KEY); // cold, so this is the anchor and not a rotation
      const chosen = rc.selectReferenceCards(b.prompt);
      return {
        label: b.label,
        matched: matched.length,
        byArrayOrder: matched[0]?.id ?? '(none)',
        anchor: chosen[0]?.id ?? '(none)',
      };
    });

    return {
      poolSize: rc.REFERENCE_CARDS.length,
      A: analyse(seqA),
      B: analyse(seqB),
      matchProfile,
      seqA,
      seqB,
    };
  },
  { briefs, runs: RUNS },
);

await browser.close();

const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(0)}%` : 'n/a');
const line = (label, a, b) => console.log(`  ${label.padEnd(28)} ${String(a).padEnd(18)} ${b}`);

console.log(`bank ${BANK}   ${briefs.length} briefs x ${RUNS} runs = ${sim.A.generations} generations/arm`);
console.log(`pool ${sim.poolSize} cards\n`);
console.log(`  ${''.padEnd(28)} ${'CONTRAST'.padEnd(18)} LEGACY`);
line('generations with cards', `${sim.A.withCards}`, `${sim.B.withCards}`);
line('distinct picks', sim.A.distinctPicks, sim.B.distinctPicks);
line('across-brief mean distance', sim.A.acrossBriefMean, sim.B.acrossBriefMean);
line('  same, run 1 only', sim.A.acrossBriefMeanRun1, sim.B.acrossBriefMeanRun1);
line(
  'across-brief collisions',
  `${sim.A.crossBriefCollisions} (${pct(sim.A.crossBriefCollisions, sim.A.crossBriefPairs)})`,
  `${sim.B.crossBriefCollisions} (${pct(sim.B.crossBriefCollisions, sim.B.crossBriefPairs)})`,
);
line(
  '  same, run 1 only',
  `${sim.A.run1Collisions} (${pct(sim.A.run1Collisions, sim.A.run1Pairs)})`,
  `${sim.B.run1Collisions} (${pct(sim.B.run1Collisions, sim.B.run1Pairs)})`,
);

const topOf = (h) =>
  Object.entries(h)
    .sort((x, y) => y[1] - x[1])
    .map(([id, n]) => `${id}:${n}`)
    .join('  ');
console.log(`\n  card usage, contrast:  ${topOf(sim.A.histogram)}`);
console.log(`  card usage, legacy:    ${topOf(sim.B.histogram)}`);

console.log('\n  keyword matches per brief -> anchor (anchor never rotates, never ages out):');
const anchorCount = {};
for (const m of sim.matchProfile) {
  if (m.matched > 0) anchorCount[m.anchor] = (anchorCount[m.anchor] ?? 0) + 1;
  const moved = m.anchor !== m.byArrayOrder ? `   (array order would pick ${m.byArrayOrder})` : '';
  console.log(
    `    ${m.label.padEnd(26)} ${String(m.matched).padStart(2)} match  ->  ${m.anchor}${moved}`,
  );
}
const anchorShare = Object.entries(anchorCount).sort((a, b) => b[1] - a[1]);
console.log(`  anchor share: ${anchorShare.map(([id, n]) => `${id}:${n}`).join('  ')}`);

console.log('\n  distinct picks per brief (contrast / legacy):');
for (const label of Object.keys(sim.A.perBriefVariants)) {
  console.log(`    ${label.padEnd(26)} ${sim.A.perBriefVariants[label]} / ${sim.B.perBriefVariants[label]}`);
}

const dead = briefs.length - new Set(sim.seqA.filter((g) => g.ids.length).map((g) => g.label)).size;
if (dead > 0) {
  console.log(
    `\n  NOTE: ${dead} of ${briefs.length} briefs match no card, so both arms generate identically ` +
      `for them - ${pct(dead * RUNS * 2, briefs.length * RUNS * 2)} of a paid pass buys no signal on selection.`,
  );
}

// Judge on the RUN 1 figure. The full-pass number folds in ledger rotation, which the review
// rubric scores separately as within-brief variation - charging it against distinctiveness
// across briefs would be marking the same mechanism twice, once as a virtue and once as a fault.
const gain =
  sim.A.acrossBriefMeanRun1 != null && sim.B.acrossBriefMeanRun1 != null
    ? +(sim.A.acrossBriefMeanRun1 - sim.B.acrossBriefMeanRun1).toFixed(3)
    : null;
const fullGain =
  sim.A.acrossBriefMean != null && sim.B.acrossBriefMean != null
    ? +(sim.A.acrossBriefMean - sim.B.acrossBriefMean).toFixed(3)
    : null;
console.log(`\n  across-brief gain: ${gain ?? 'n/a'} on run 1  (${fullGain ?? 'n/a'} over the full pass)`);
if (gain != null && gain <= 0) {
  console.log('  VETO: contrast is no better than the keyword pick on the primary metric.');
  console.log('  A paid pass would be buying a null result.');
} else if (gain != null && gain < 0.05) {
  console.log('  MARGINAL: contrast is ahead, but not by much. A paid pass is a gamble on the');
  console.log('  references mattering more to the model than their measured spread suggests.');
} else {
  console.log('  Clear separation: a paid pass can measure something.');
}
console.log('  (None of this predicts output quality - only real generations can.)');
