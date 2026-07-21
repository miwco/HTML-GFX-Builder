// The shared OPTIONAL logo slot for standard-contract designs. A variant that declares
// `logo: 'optional'` and does not hand-author its own slot gets this one injected at
// create when the user turns the logo on: a real SPX image field ("filelist") bound to an
// <img id="fN"> leading the box — the same recipe card03 hand-authors — so new designs
// support logos with zero per-design code. Designs with a bespoke slot (a badge, a docked
// square) keep their own markup; `designHasLogoSlot` keeps this helper away from them.

import type { ResolvedOptions } from '../../model/wizard';
import type { StandardDesign } from './standard';

/** Whether the design already carries its own logo slot (a filelist field or a
 *  .{prefix}-logo element) — the shared slot must never double-inject. */
export function designHasLogoSlot(design: StandardDesign, prefix: string): boolean {
  return (
    (design.extraFields ?? []).some((f) => f.ftype === 'filelist') ||
    design.html.includes(`${prefix}-logo`)
  );
}

/**
 * Inject the shared logo slot into a design: the <img> as the first child of the
 * .{prefix}-box, its placeholder CSS, and the filelist field (id after every user field).
 * Returns the design untouched when the box wrapper can't be found — never a broken layout.
 */
export function applyLogoSlot(design: StandardDesign, prefix: string, o: ResolvedOptions): StandardDesign {
  const boxOpen = `<div class="${prefix}-box">`;
  const at = design.html.indexOf(boxOpen);
  if (at < 0) return design;

  const logoField = `f${o.lines.length + o.extraFields.length + (design.extraFields?.length ?? 0)}`;
  const logoPath = o.logoAssetPath ?? '';

  const imgHtml =
    `\n      <!-- Logo (image field ${logoField}) — leads the box as a rounded square. Empty = hidden. -->` +
    `\n      <img id="${logoField}" class="${prefix}-logo"${logoPath ? ` src="${logoPath}"` : ' style="display: none"'} alt="" />`;

  const insertAt = at + boxOpen.length;
  const html = design.html.slice(0, insertAt) + imgHtml + design.html.slice(insertAt);

  const css = `${design.css}

/* The logo: a rounded square leading the box, above the text (hidden while empty). */
.${prefix}-logo {
  display: block;                  /* its own row — the text starts below it */
  width: calc(56px * var(--scale));   /* logo square width */
  height: calc(56px * var(--scale));  /* logo square height */
  margin-bottom: calc(14px * var(--scale));  /* air between logo and the first line */
  border-radius: var(--panel-radius);  /* the chip follows the family's corner treatment */
  object-fit: contain;             /* show the whole logo, never crop a wide wordmark */
}`;

  return {
    ...design,
    html,
    css,
    extraFields: [
      ...(design.extraFields ?? []),
      {
        field: logoField,
        ftype: 'filelist',
        title: 'Logo',
        value: logoPath,
        assetfolder: './images/',
        extension: 'png',
      },
    ],
  };
}
