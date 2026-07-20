// Compare candidate COMPANION rules against the one that shipped, for free.
//
//   node scripts/reference-companion-sweep.mjs [briefs.json] [runs]
//
// Requires the dev server (this checkout's port); imports the real cards + distance through Vite.
//
// WHY THIS EXISTS. Measured on the bench bank, greedy max-min contrast concentrates: two cards
// that no brief ever matches - `data-terminal` and `dense-telop`, the two axis extremes - take
// 62% of all companion slots, and the spread of reference sets COLLAPSES (sd 0.052 against the
// keyword pick's 0.145). That is the rule's own shape rather than a bug: "furthest from the
// anchor among cards sharing any genre tag" is almost always the same handful of extremes,
// whatever the anchor is, and the recency ledger only rotates which extreme.
//
// It also produces guidance that is simply wrong: a warm Sunday-morning cooking title is handed
// the dense variety-telop card, and a channel ident is handed the financial trading terminal.
//
// So this sweeps alternative rules on the same bank and prints what each does to concentration,
// spread, collisions and genre plausibility. It optimises a PROXY - which references get handed
// over - and cannot say anything about the videos. Treat a winner here as a candidate worth
// paying to test, never as a result.

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

const sweep = await page.evaluate(
  async ({ briefs, runs }) => {
    const t = Date.now();
    const rc = await import(`/src/ai/video/referenceCards.ts?t=${t}`);
    const rs = await import(`/src/ai/referenceSelect.ts?t=${t}`);
    const KEY = 'spx-gfx-ai-reference-recency';
    const CARDS = rc.REFERENCE_CARDS;
    const byId = new Map(CARDS.map((c) => [c.id, c]));
    const d = (a, b) => rs.axisDistance(a.axes, b.axes);

    const matchesOf = (prompt) => CARDS.filter((c) => c.keywords.test(prompt));
    const overlap = (a, b) => a.genres.filter((g) => b.genres.includes(g)).length;

    // Every rule gets the SAME anchor so the sweep isolates the companion choice and nothing
    // else. `strongestMatch` is module-private, so the anchor is read back off the shipped
    // selector rather than reimplemented - a second copy of that rule here would drift from the
    // real one and quietly invalidate every row below. It consults the live ledger exactly as
    // the provider does, which is what we want.
    const anchorFor = (prompt) => {
      const picked = rc.selectReferenceCards(prompt);
      return picked.length ? picked[0] : null;
    };

    const eligible = (anchor, matched) => {
      const voted = new Set(matched.flatMap((c) => c.genres));
      return CARDS.filter((c) => c !== anchor && c.genres.some((g) => voted.has(g)));
    };

    const penaltyOf = (recent) => (c) => rs.recencyPenaltyFor(c.id, recent);

    // ── The candidate rules ────────────────────────────────────────────────────
    const RULES = {
      // What ships today: greedy max-min, recency as a continuous penalty.
      'argmax (shipped)': (anchor, cands, recent) => {
        const p = penaltyOf(recent);
        let best = null;
        let bestScore = -Infinity;
        for (const c of cands) {
          const s = d(c, anchor) - p(c);
          if (s > bestScore) {
            bestScore = s;
            best = c;
          }
        }
        return best;
      },

      // Aim for a BAND of contrast rather than the maximum. "Different design world" is the goal;
      // "maximally alien card in the library" is what argmax actually optimises, and because the
      // extremes are extreme relative to EVERY anchor, they win regardless of what anchored.
      // Targeting a distance makes the winner depend on the anchor, which is the whole point.
      'band 0.55': (anchor, cands, recent) => bandPick(anchor, cands, recent, 0.55),
      'band 0.65': (anchor, cands, recent) => bandPick(anchor, cands, recent, 0.65),
      'band 0.75': (anchor, cands, recent) => bandPick(anchor, cands, recent, 0.75),

      // Keep argmax but require the companion to be genuinely genre-adjacent (2+ shared genres
      // with the ANCHOR, not merely with the union of everything that matched). Falls back to the
      // full field when nothing qualifies, so it can never return empty.
      'argmax, 2+ shared genre': (anchor, cands, recent) => {
        const close = cands.filter((c) => overlap(c, anchor) >= 2);
        return RULES['argmax (shipped)'](anchor, close.length ? close : cands, recent);
      },

      // Argmax with a much heavier recency penalty - tests whether concentration is really just
      // an under-powered ledger rather than the rule's shape.
      'argmax, recency x3': (anchor, cands, recent) => {
        let best = null;
        let bestScore = -Infinity;
        for (const c of cands) {
          const s = d(c, anchor) - 3 * rs.recencyPenaltyFor(c.id, recent);
          if (s > bestScore) {
            bestScore = s;
            best = c;
          }
        }
        return best;
      },
    };

    function bandPick(anchor, cands, recent, target) {
      let best = null;
      let bestScore = Infinity;
      for (const c of cands) {
        const s = Math.abs(d(c, anchor) - target) + rs.recencyPenaltyFor(c.id, recent);
        if (s < bestScore) {
          bestScore = s;
          best = c;
        }
      }
      return best;
    }

    // ── Evaluation ─────────────────────────────────────────────────────────────
    const setDistance = (a, b) => {
      if (!a.length || !b.length) return null;
      let s = 0;
      for (const x of a) for (const y of b) s += rs.axisDistance(byId.get(x).axes, byId.get(y).axes);
      return s / (a.length * b.length);
    };

    const runRule = (rule) => {
      localStorage.removeItem(KEY);
      const seq = [];
      for (const b of briefs) {
        for (let run = 1; run <= runs; run++) {
          const recent = rs.recentReferenceIds();
          const matched = matchesOf(b.prompt);
          let ids = [];
          if (matched.length) {
            const anchor = anchorFor(b.prompt);
            const cands = eligible(anchor, matched);
            const comp = cands.length ? rule(anchor, cands, recent) : null;
            ids = comp ? [anchor.id, comp.id] : [anchor.id];
          }
          rs.noteReferenceUse(ids);
          seq.push({ label: b.label, run, ids, anchor: ids[0] ?? null, companion: ids[1] ?? null });
        }
      }
      return seq;
    };

    const evaluate = (seq) => {
      const withCards = seq.filter((g) => g.ids.length);
      const run1 = withCards.filter((g) => g.run === 1);

      const across = (gens) => {
        const ds = [];
        let coll = 0;
        for (let i = 0; i < gens.length; i++)
          for (let j = i + 1; j < gens.length; j++) {
            if (gens[i].label === gens[j].label) continue;
            const v = setDistance(gens[i].ids, gens[j].ids);
            if (v == null) continue;
            ds.push(v);
            if (gens[i].ids.join() === gens[j].ids.join()) coll++;
          }
        if (!ds.length) return { mean: null, sd: null, collisions: coll };
        const m = ds.reduce((a, b) => a + b, 0) / ds.length;
        const sd = Math.sqrt(ds.reduce((a, b) => a + (b - m) ** 2, 0) / ds.length);
        return { mean: +m.toFixed(3), sd: +sd.toFixed(3), collisions: coll };
      };

      // Concentration: what share of companion slots do the top two cards take?
      const comp = {};
      let total = 0;
      for (const g of seq) {
        if (!g.companion) continue;
        comp[g.companion] = (comp[g.companion] ?? 0) + 1;
        total++;
      }
      const ranked = Object.entries(comp).sort((a, b) => b[1] - a[1]);
      const top2 = ranked.slice(0, 2).reduce((a, [, n]) => a + n, 0);

      // Plausibility: does the companion actually belong near the anchor's genre?
      let plausible = 0;
      for (const g of seq) {
        if (!g.companion || !g.anchor) continue;
        if (overlap(byId.get(g.companion), byId.get(g.anchor)) >= 2) plausible++;
      }

      // How many DIFFERENT cards ever serve as a companion at all.
      return {
        run1: across(run1),
        full: across(withCards),
        top2Share: total ? +(top2 / total).toFixed(3) : null,
        distinctCompanions: ranked.length,
        plausibleShare: total ? +(plausible / total).toFixed(3) : null,
        companionHistogram: Object.fromEntries(ranked),
      };
    };

    // The keyword baseline, dosage-matched, so every rule is compared against the same control.
    const paddedLegacy = (prompt) => {
      const matched = matchesOf(prompt);
      if (!matched.length) return [];
      if (matched.length >= 2) return matched.slice(0, 2);
      const anchor = matched[0];
      const cands = eligible(anchor, matched);
      return cands.length ? [anchor, cands[0]] : [anchor];
    };
    localStorage.removeItem(KEY);
    const controlSeq = [];
    for (const b of briefs)
      for (let run = 1; run <= runs; run++) {
        const ids = paddedLegacy(b.prompt).map((c) => c.id);
        rs.noteReferenceUse(ids);
        controlSeq.push({ label: b.label, run, ids, anchor: ids[0] ?? null, companion: ids[1] ?? null });
      }

    const results = {};
    for (const [name, rule] of Object.entries(RULES)) results[name] = evaluate(runRule(rule));
    results['padded-legacy (control)'] = evaluate(controlSeq);

    // Per-brief picks under each rule, so a bad companion is visible and not just a number.
    const picks = {};
    for (const [name, rule] of Object.entries(RULES)) {
      localStorage.removeItem(KEY);
      picks[name] = briefs.map((b) => {
        const matched = matchesOf(b.prompt);
        if (!matched.length) return { label: b.label, ids: [] };
        const anchor = anchorFor(b.prompt);
        const cands = eligible(anchor, matched);
        const comp = cands.length ? rule(anchor, cands, []) : null;
        return { label: b.label, ids: comp ? [anchor.id, comp.id] : [anchor.id] };
      });
    }

    return { results, picks };
  },
  { briefs, runs: RUNS },
);

await browser.close();

const R = sweep.results;
console.log(`bank ${BANK}   ${briefs.length} briefs x ${RUNS} runs\n`);
console.log(
  `  ${'rule'.padEnd(24)} ${'run1 mean'.padEnd(11)} ${'run1 sd'.padEnd(9)} ${'coll'.padEnd(6)} ${'top2%'.padEnd(7)} ${'#comp'.padEnd(6)} genre-fit`,
);
for (const [name, r] of Object.entries(R)) {
  console.log(
    `  ${name.padEnd(24)} ${String(r.run1.mean).padEnd(11)} ${String(r.run1.sd).padEnd(9)} ${String(r.run1.collisions).padEnd(6)} ${String(r.top2Share).padEnd(7)} ${String(r.distinctCompanions).padEnd(6)} ${r.plausibleShare}`,
  );
}

console.log('\n  companion histograms:');
for (const [name, r] of Object.entries(R)) {
  const h = Object.entries(r.companionHistogram)
    .map(([id, n]) => `${id}:${n}`)
    .join('  ');
  console.log(`    ${name.padEnd(24)} ${h}`);
}

console.log('\n  cold-ledger picks per brief:');
for (const [name, list] of Object.entries(sweep.picks)) {
  console.log(`\n    ${name}`);
  for (const p of list) console.log(`      ${p.label.padEnd(26)} ${p.ids.join(' + ') || '(none)'}`);
}

console.log(
  '\n  top2% = share of companion slots taken by the two most-used cards (lower is less concentrated).',
);
console.log('  genre-fit = share of companions sharing 2+ genres with their anchor (higher is more apt).');
console.log('  This optimises a PROXY. It says nothing about the videos - only a paid pass can.');
