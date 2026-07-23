// The SPECIALIST lower-third pack — designs drawn for ONE production rather than for any
// show (see ./shared.ts for what that means and why it is a pack rather than more lt* files).
//
// They are ordinary lower thirds in every mechanical sense: same category, same assembler,
// same preset bank, same export path. What groups them is the `roleTag` each one carries,
// which is the facet the wizard's picker and the insert dialog filter on.
//
// Ordered by production, not by style — the order someone browsing for their own show reads
// the grid in. Within a production the designs are genuinely different graphics, not restyles
// of one: each file's header argues what its composition claims that its siblings' do not.

import type { TemplateVariant } from '../../../model/wizard';
import { ls01 } from './ls01';
import { ls02 } from './ls02';
import { ls03 } from './ls03';
import { ls04 } from './ls04';
import { ls05 } from './ls05';
import { ls06 } from './ls06';
import { ls07 } from './ls07';
import { ls08 } from './ls08';
import { ls09 } from './ls09';
import { ls10 } from './ls10';
import { ls11 } from './ls11';
import { ls12 } from './ls12';
import { ls13 } from './ls13';
import { ls14 } from './ls14';
import { ls15 } from './ls15';
import { ls16 } from './ls16';
import { ls17 } from './ls17';
import { ls18 } from './ls18';
import { ls19 } from './ls19';
import { ls20 } from './ls20';
import { ls21 } from './ls21';
import { ls22 } from './ls22';
import { ls23 } from './ls23';
import { ls24 } from './ls24';
import { ls25 } from './ls25';
import { ls26 } from './ls26';
import { ls27 } from './ls27';
import { ls28 } from './ls28';
import { ls29 } from './ls29';
import { ls30 } from './ls30';
import { ls31 } from './ls31';
import { ls32 } from './ls32';

export const SPECIALIST_LOWER_THIRDS: TemplateVariant[] = [
  // Interview — two people, equal billing
  ls01, // Split Interview — one rule across two content-sized columns (minimal)
  ls02, // Duo Frost — two separate frosted cards, one per person (glass)
  ls03, // Duo Void — the house strap widened for two (noacg)
  // Host & guest — deliberately unequal
  ls04, // Host & Guest — the guest large, the host beside them, role chips (glass)
  ls05, // Studio Pair — the guest on a row, the host in a sub-bar (noacg)
  // Commentary — the callers named as a unit
  ls06, // Commentary Booth — a header band spanning two callers (sport)
  ls07, // Booth Line — the same credit as one horizontal rail (minimal)
  // Sport — the athlete
  ls08, // Squad Number — the number set larger than the name (sport)
  ls09, // Player Stats — a name row over three equal stat cells (sport)
  ls10, // Club Crest — the badge at full height, player beside it (sport)
  // Esports — tags, handles and the desk
  ls11, // Team Tag — the org tag chip in front of the in-game name (sport)
  ls12, // Caster Deck — the caster handle led large (noacg)
  ls13, // Desk Duo — two casters on a shared accent floor (sport)
  // Worship — the register that must not interrupt
  ls14, // Pulpit — the role above the name, fade entrance (minimal)
  ls15, // Scripture Reading — the reference outranks the reader (minimal)
  ls16, // Service Speaker — the moment in the order of service (glass)
  // Academic — the person and the institution behind them
  ls17, // Lectern — post-nominals as their own field, ruled institution (minimal)
  ls18, // Faculty Card — the institution mark at the head (glass)
  ls19, // Session Speaker — the talk title leads, for people joining mid-session (noacg)
  // Politics — the party colour is the identity
  ls20, // Candidate Bar — party block, candidate, right-aligned share (minimal)
  ls21, // Debate Podium — symmetric, so it mirrors to either side of frame (minimal)
  ls22, // Party Strap — role and affiliation kept visibly separate (noacg)
  // Analysis — marking interpretation, and marking expertise
  ls23, // Analysis Kicker — the editorial mark leads the name (minimal)
  ls24, // Expert Panel — the field of expertise as a subject tag (glass)
  // Music — the track, the billing, and the programme
  ls25, // Now Playing — square cover artwork, track first (glass)
  ls26, // Stage Artist — the deliberate mirror: artist first (noacg)
  ls27, // Track Cue — a numbered programme item (minimal)
  // Live & location — where, and when
  ls28, // Live Remote — pulsing LIVE flag, place, ticking clock (minimal)
  ls29, // Field Report — dateline over the correspondent (noacg)
  ls30, // World Clock — another city's time, computed from a UTC offset (glass)
  // Creator — handles and stream identity
  ls31, // Creator Stack — a row of handle chips, one per platform (noacg)
  ls32, // Stream Identity — handle, live dot, and a goal figure (sport)
];
