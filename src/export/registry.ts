// Export target registry. Each target transforms the template into a downloadable zip
// package: SPX (folder), HTML overlay (single autoplay html for OBS/vMix browser sources),
// CasparCG (single self-contained html), OGraf (manifest + Web Component), LiveOS (the
// OGraf package with NetOn.Live install steps — LiveOS's graphics engine is OGraf-compliant).

import type JSZip from 'jszip';
import type { SpxTemplate } from '../model/types';

export interface ExportContext {
  /** The Data panel's sample values (field id → value) at export time — targets with no
   *  playout server (the HTML overlay) bake these in as the on-load data. */
  sampleData?: Record<string, string>;
}

export interface ExportTarget {
  id: string;
  label: string;
  description: string;
  /** Success line shown after a download. Each target speaks for its own workflow — SPX says
   *  "drop the folder in", a browser-source target says "add the .html as a source", etc. */
  successMessage: string;
  build: (template: SpxTemplate, ctx?: ExportContext) => Promise<JSZip>;
}

// Imported AFTER the interfaces so targets can import types from here without a cycle.
import { spxTarget } from './targets/spxStarter';
import { htmlOverlayTarget } from './targets/htmlOverlay';
import { h2rTarget } from './targets/h2r';
import { casparTarget } from './targets/casparcg';
import { ografTarget } from './targets/ograf';
import { liveosTarget } from './targets/liveos';

export const EXPORT_TARGETS: ExportTarget[] = [spxTarget, htmlOverlayTarget, h2rTarget, casparTarget, ografTarget, liveosTarget];
