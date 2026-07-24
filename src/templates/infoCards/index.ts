// The info-card catalog: designs per style family, each the visual sibling of a
// lower third (docs/DESIGN_LANGUAGE.md §8). Built on shared.ts + the shared presets.

import type { TemplateVariant } from '../../model/wizard';
import { card01 } from './card01';
import { card02 } from './card02';
import { card03 } from './card03';
import { card04 } from './card04';
import { card05 } from './card05';
import { card06 } from './card06';
import { card07 } from './card07';
import { card08 } from './card08';
import { card09 } from './card09';
import { card10 } from './card10';
import { card11 } from './card11';
import { card12 } from './card12';
import { card13 } from './card13';
import { card14 } from './card14';
import { card15 } from './card15';
import { card16 } from './card16';
import { card17 } from './card17';
import { card18 } from './card18';
import { card19 } from './card19';
import { card20 } from './card20';
import { card21 } from './card21';
import { card22 } from './card22';
import { card23 } from './card23';
import { card24 } from './card24';
import { card25 } from './card25';
import { card26 } from './card26';
import { card27 } from './card27';
import { card28 } from './card28';
import { card29 } from './card29';
import { card30 } from './card30';
import { card31 } from './card31';
import { card32 } from './card32';
import { card33 } from './card33';
import { card34 } from './card34';
import { card35 } from './card35';
import { card36 } from './card36';
import { card37 } from './card37';
import { card38 } from './card38';
import { card39 } from './card39';
import { card40 } from './card40';
import { card41 } from './card41';
import { card42 } from './card42';
import { card43 } from './card43';
import { card44 } from './card44';
import { card45 } from './card45';
import { card46 } from './card46';
import { card47 } from './card47';
import { card48 } from './card48';
import { card49 } from './card49';

export const INFO_CARDS: TemplateVariant[] = [
  card05, // House Title — noacg mono kicker + huge display title (sibling lt11)
  card01, // Hairline Card — minimal, sibling of lt01 Hairline
  card02, // Slab Card — sport, sibling of lt05 Angle Slab
  card03, // Frosted Panel — glass, sibling of lt08 Frosted Card
  card04, // bench-winner card variant
  card06, // House Topic — noacg topic card, amber bar + void panel (sibling lt11)
  card07, // Clean Title — minimal title card (sibling lt01 / lt02)
  card08, // Slab Title — sport title card, leaning slab (sibling lt05 / card02)
  card09, // Frost Title — glass title card, frosted panel (sibling lt08 / card03)
  // ── The title / topic / information pack ──
  card10, // Session Title — minimal session opener (title-card)
  card11, // Keynote Title — glass keynote opener (title-card)
  card12, // Segment Title — sport segment opener (title-card)
  card13, // Service Title — house ceremony opener (title-card)
  card14, // Chapter Card — minimal chapter marker (topic-card)
  card15, // Question Card — glass question card (topic-card)
  card16, // Topic Slab — sport talking point (topic-card)
  card17, // Key Term — house explainer card (topic-card)
  card18, // Now & Next — minimal now/next (now-next)
  card19, // Frost Now Next — glass now-playing (now-next)
  card20, // Volt Now Next — sport now/next slab (now-next)
  card21, // House Now Next — house now/next (now-next)
  card22, // News Headline — minimal headline + body (headline-card)
  card23, // Frost Headline — glass announcement (headline-card)
  card24, // Volt Headline — sport report (headline-card)
  card25, // House Headline — house release note (headline-card)
  card26, // Clean Steps — minimal numbered process (process-steps)
  card27, // Frost Checklist — glass checklist (process-steps)
  card28, // Volt Process — sport runsheet (process-steps)
  card29, // House Runbook — house process (process-steps)
  card30, // Public Notice — minimal public information (notice-card)
  card31, // Frost Advisory — glass venue advisory (notice-card)
  card32, // Alert Slab — sport safety notice (notice-card)
  card33, // House Notice — house service notice (notice-card)
  card34, // Statement Card — minimal long text (statement-card)
  card35, // Reading Card — glass reading (statement-card)
  card36, // Translation Slab — sport translation (statement-card)
  card37, // House Statement — house long text (statement-card)
  card38, // House Product — noacg live-shopping card, shot + price row (sibling lt11 / card06)
  card39, // Frost Product — glass live-shopping card, stacked shot + price row (sibling card03)
  card40, // Volt Offer — sport flash-offer slab, claim + promo code (sibling lt05 / card02)
  card41, // Clean Offer — minimal panel-free offer card (sibling lt01 / card07)
  card42, // Clean Listing — minimal property/lot/resource card (sibling lt03 / ig05)
  card43, // House Lot — noacg auction/listing card, live value block (sibling lt11 / card38)
  card44, // House Scan — noacg QR card, quiet-zone tile + address (sibling lt11 / card38)
  card45, // Clean Scan — minimal stacked QR card (sibling lt01 / card07)
  card46, // Frost Location — glass travel/location card, drawn pin (sibling card03 / card39)
  card47, // Volt Location — sport venue marker, drawn pin (sibling lt05 / card02)
  card48, // House Sponsors — noacg sponsor strip, four partner slots (sibling lt11 / bug02)
  card49, // Clean Partners — minimal partners board, 3 × 2 slot grid (sibling lt01 / card42)
];

export function infoCardById(id: string): TemplateVariant | undefined {
  return INFO_CARDS.find((v) => v.id === id);
}
