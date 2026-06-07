// Building-block registry. Each block is a pure, deterministic transform that edits the
// visible HTML/CSS/JS so the user learns from the result. Blocks also append structured
// layer metadata to the template model (see edit.ts#addLayer). Blocks are grouped by category.

import {
  addFieldToDefinition,
  addLayer,
  appendCss,
  appendJs,
  insertGraphicHtml,
  insertHiddenHolder,
  nextFieldId,
} from './edit';
import type { SpxField, SpxTemplate } from '../model/types';

export interface BuildingBlock {
  id: string;
  label: string;
  category: 'Structure' | 'Elements' | 'Fields' | 'Animation';
  description: string;
  apply: (template: SpxTemplate) => SpxTemplate;
}

/** Add a text data field: definition entry + hidden holder + visible element + layer. */
function addTextField(template: SpxTemplate): SpxTemplate {
  const id = nextFieldId(template.fields);
  let next = addFieldToDefinition(template, {
    field: id,
    ftype: 'textfield',
    title: `Text ${id}`,
    value: `Sample ${id}`,
  });
  const visible = `  <!-- Text field ${id} -->
  <div class="text-block" id="${id}_gfx">Sample ${id}</div>`;
  next = { ...next, html: insertHiddenHolder(insertGraphicHtml(next.html, visible), id) };
  next = { ...next, css: appendCss(next.css, `Text field ${id}`, `#${id}_gfx {\n  color: #ffffff;\n  font-size: 32px;\n}`) };
  next = addLayer(next, {
    id: `${id}_gfx`,
    type: 'text',
    label: `Text ${id}`,
    fieldId: id,
    text: `Sample ${id}`,
    styles: { color: '#ffffff', fontSize: '32px' },
  });
  return next;
}

/** Add a numeric data field: definition entry + hidden holder + visible element + layer. */
function addNumberField(template: SpxTemplate): SpxTemplate {
  const id = nextFieldId(template.fields);
  let next = addFieldToDefinition(template, {
    field: id,
    ftype: 'number',
    title: `Number ${id}`,
    value: '0',
  });
  const visible = `  <!-- Number field ${id} -->
  <div class="number-block" id="${id}_gfx">0</div>`;
  next = { ...next, html: insertHiddenHolder(insertGraphicHtml(next.html, visible), id) };
  next = { ...next, css: appendCss(next.css, `Number field ${id}`, `#${id}_gfx {\n  color: #ffffff;\n  font-size: 40px;\n  font-weight: 700;\n  font-variant-numeric: tabular-nums;\n}`) };
  next = addLayer(next, {
    id: `${id}_gfx`,
    type: 'text',
    label: `Number ${id}`,
    fieldId: id,
    text: '0',
    styles: { color: '#ffffff', fontSize: '40px', fontWeight: '700' },
  });
  return next;
}

/** Add a dropdown data field with a few starter options. */
function addDropdownField(template: SpxTemplate): SpxTemplate {
  const id = nextFieldId(template.fields);
  const field: SpxField = {
    field: id,
    ftype: 'dropdown',
    title: `Choice ${id}`,
    value: 'one',
    items: [
      { text: 'Option one', value: 'one' },
      { text: 'Option two', value: 'two' },
      { text: 'Option three', value: 'three' },
    ],
  };
  let next = addFieldToDefinition(template, field);
  const visible = `  <!-- Dropdown field ${id} (operator picks from a list) -->
  <div class="choice-block" id="${id}_gfx">one</div>`;
  next = { ...next, html: insertHiddenHolder(insertGraphicHtml(next.html, visible), id) };
  next = { ...next, css: appendCss(next.css, `Dropdown field ${id}`, `#${id}_gfx {\n  color: #ffffff;\n  font-size: 28px;\n}`) };
  next = addLayer(next, {
    id: `${id}_gfx`,
    type: 'text',
    label: `Choice ${id}`,
    fieldId: id,
    text: 'one',
    styles: { color: '#ffffff', fontSize: '28px' },
  });
  return next;
}

export const BUILDING_BLOCKS: BuildingBlock[] = [
  // ----- Structure -----
  {
    id: 'lower-third',
    label: 'Lower third',
    category: 'Structure',
    description: 'Name + title bar in the lower-left, with two text fields.',
    apply: (t) => {
      const id0 = nextFieldId(t.fields);
      let next = addFieldToDefinition(t, { field: id0, ftype: 'textfield', title: 'Name', value: 'Firstname Lastname' });
      const id1 = nextFieldId(next.fields);
      next = addFieldToDefinition(next, { field: id1, ftype: 'textfield', title: 'Title', value: 'Title / role' });
      const html = `  <!-- Lower third -->
  <div class="lower-third-2" id="lt2">
    <div class="lt2-bar">
      <div class="lt2-name" id="${id0}_gfx">Firstname Lastname</div>
      <div class="lt2-title" id="${id1}_gfx">Title / role</div>
    </div>
  </div>`;
      next = { ...next, html: insertHiddenHolder(insertHiddenHolder(insertGraphicHtml(next.html, html), id0), id1) };
      next = {
        ...next,
        css: appendCss(
          next.css,
          'Lower third (block)',
          `.lower-third-2 { position: absolute; left: 120px; bottom: 260px; }
.lt2-bar { display: inline-block; padding: 12px 24px; background: #11151c; border-left: 6px solid #3aa0ff; }
.lt2-name { color: #fff; font-size: 40px; font-weight: 700; }
.lt2-title { color: #9fc6ff; font-size: 22px; }`,
        ),
      };
      next = addLayer(next, { id: 'lt2', type: 'container', label: 'Lower third', styles: { position: 'absolute', left: '120px', bottom: '260px' } });
      next = addLayer(next, { id: `${id0}_gfx`, type: 'text', label: 'Name', fieldId: id0, text: 'Firstname Lastname', styles: { color: '#fff', fontSize: '40px', fontWeight: '700' } });
      next = addLayer(next, { id: `${id1}_gfx`, type: 'text', label: 'Title', fieldId: id1, text: 'Title / role', styles: { color: '#9fc6ff', fontSize: '22px' } });
      return next;
    },
  },
  {
    id: 'fullscreen',
    label: 'Fullscreen layout',
    category: 'Structure',
    description: 'Centered full-frame container for titles or fullscreen graphics.',
    apply: (t) => {
      const id = nextFieldId(t.fields);
      let next = addFieldToDefinition(t, { field: id, ftype: 'textfield', title: 'Headline', value: 'Fullscreen title' });
      const html = `  <!-- Fullscreen layout -->
  <div class="fullscreen" id="fs">
    <h1 class="fs-headline" id="${id}_gfx">Fullscreen title</h1>
  </div>`;
      next = { ...next, html: insertHiddenHolder(insertGraphicHtml(next.html, html), id) };
      next = {
        ...next,
        css: appendCss(
          next.css,
          'Fullscreen layout (block)',
          `.fullscreen { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.fs-headline { color: #fff; font-size: 96px; font-weight: 800; text-align: center; text-shadow: 0 4px 24px rgba(0,0,0,0.5); }`,
        ),
      };
      next = addLayer(next, { id: 'fs', type: 'container', label: 'Fullscreen', styles: { position: 'absolute', inset: '0' } });
      next = addLayer(next, { id: `${id}_gfx`, type: 'text', label: 'Headline', fieldId: id, text: 'Fullscreen title', styles: { color: '#fff', fontSize: '96px', fontWeight: '800' } });
      return next;
    },
  },
  {
    id: 'countdown',
    label: 'Countdown timer',
    category: 'Structure',
    description: 'A timer display + a startCountdown() helper. Call it from play().',
    apply: (t) => {
      const id = nextFieldId(t.fields);
      let next = addFieldToDefinition(t, { field: id, ftype: 'number', title: 'Duration (seconds)', value: '300' });
      const html = `  <!-- Countdown display (updated by startCountdown). -->
  <div class="countdown-block" id="countdown-display">5:00</div>`;
      next = { ...next, html: insertHiddenHolder(insertGraphicHtml(next.html, html), id) };
      next = {
        ...next,
        css: appendCss(
          next.css,
          'Countdown timer (block)',
          `.countdown-block {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 120px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}`,
        ),
      };
      next = {
        ...next,
        js: appendJs(
          next.js,
          `Countdown helper. Reads duration from field ${id}, counts down in #countdown-display.\n// To use: call startCountdown() inside play(), and clearInterval(_cdInterval) in stop().`,
          `var _cdInterval = null;
function startCountdown() {
  var holder = document.getElementById('${id}');
  var total = holder ? (parseInt(holder.innerHTML, 10) || 300) : 300;
  var el = document.getElementById('countdown-display');
  function fmt(s) {
    s = Math.max(0, Math.floor(s));
    var m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? m + ':' + String(sec).padStart(2, '0') : String(sec);
  }
  var remaining = total;
  if (el) el.textContent = fmt(remaining);
  clearInterval(_cdInterval);
  _cdInterval = setInterval(function () {
    remaining--;
    if (el) el.textContent = fmt(remaining);
    if (remaining <= 0) { clearInterval(_cdInterval); _cdInterval = null; }
  }, 1000);
}`,
        ),
      };
      next = addLayer(next, { id: 'countdown-display', type: 'text', label: 'Countdown display', text: '5:00', styles: { color: '#fff', fontSize: '120px', fontWeight: '800' } });
      return next;
    },
  },

  // ----- Elements -----
  {
    id: 'logo',
    label: 'Logo image',
    category: 'Elements',
    description: 'An <img> logo (set the src to a file in assets/).',
    apply: (t) => {
      const html = `  <!-- Logo (replace src with your file in assets/) -->
  <img class="logo" id="logo" src="assets/logo.png" alt="logo" />`;
      let next = { ...t, html: insertGraphicHtml(t.html, html) };
      next = { ...next, css: appendCss(next.css, 'Logo (block)', `.logo { position: absolute; top: 80px; left: 120px; height: 120px; }`) };
      next = addLayer(next, { id: 'logo', type: 'image', label: 'Logo', styles: { position: 'absolute', top: '80px', left: '120px', height: '120px' } });
      return next;
    },
  },
  {
    id: 'bug',
    label: 'Corner bug',
    category: 'Elements',
    description: 'A small persistent logo/bug in the top-right corner.',
    apply: (t) => {
      const html = `  <!-- Corner bug -->
  <img class="bug" id="bug" src="assets/bug.png" alt="bug" />`;
      let next = { ...t, html: insertGraphicHtml(t.html, html) };
      next = { ...next, css: appendCss(next.css, 'Corner bug (block)', `.bug { position: absolute; top: 48px; right: 48px; height: 90px; opacity: 0.95; }`) };
      next = addLayer(next, { id: 'bug', type: 'image', label: 'Corner bug', styles: { position: 'absolute', top: '48px', right: '48px', height: '90px' } });
      return next;
    },
  },
  {
    id: 'text-element',
    label: 'Text element',
    category: 'Elements',
    description: 'A standalone styled text element (no data field).',
    apply: (t) => {
      const html = `  <!-- Static text element -->
  <div class="static-text" id="static-text">Static text</div>`;
      let next = { ...t, html: insertGraphicHtml(t.html, html) };
      next = { ...next, css: appendCss(next.css, 'Static text (block)', `.static-text { position: absolute; left: 120px; top: 220px; color: #fff; font-size: 28px; }`) };
      next = addLayer(next, { id: 'static-text', type: 'text', label: 'Static text', text: 'Static text', styles: { position: 'absolute', left: '120px', top: '220px', color: '#fff', fontSize: '28px' } });
      return next;
    },
  },
  {
    id: 'score-row',
    label: 'Score row',
    category: 'Elements',
    description: 'Two-team inline score strip with four fields (names + scores).',
    apply: (t) => {
      const idA = nextFieldId(t.fields);
      let next = addFieldToDefinition(t, { field: idA, ftype: 'textfield', title: 'Team A name', value: 'TEAM A' });
      const idAS = nextFieldId(next.fields);
      next = addFieldToDefinition(next, { field: idAS, ftype: 'number', title: 'Team A score', value: '0' });
      const idB = nextFieldId(next.fields);
      next = addFieldToDefinition(next, { field: idB, ftype: 'textfield', title: 'Team B name', value: 'TEAM B' });
      const idBS = nextFieldId(next.fields);
      next = addFieldToDefinition(next, { field: idBS, ftype: 'number', title: 'Team B score', value: '0' });
      const html = `  <!-- Score row -->
  <div class="score-row" id="score-row">
    <span class="sr-name" id="${idA}_gfx">TEAM A</span>
    <span class="sr-score" id="${idAS}_gfx">0</span>
    <span class="sr-sep">:</span>
    <span class="sr-score" id="${idBS}_gfx">0</span>
    <span class="sr-name" id="${idB}_gfx">TEAM B</span>
  </div>`;
      next = {
        ...next,
        html: [idA, idAS, idB, idBS].reduce((h, id) => insertHiddenHolder(h, id), insertGraphicHtml(next.html, html)),
      };
      next = {
        ...next,
        css: appendCss(
          next.css,
          'Score row (block)',
          `.score-row {
  position: absolute;
  left: 50%;
  top: 60px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 12px 28px;
  background: #111827;
}
.sr-name  { color: #fff; font-size: 28px; font-weight: 600; letter-spacing: 0.08em; }
.sr-score { color: #fff; font-size: 40px; font-weight: 800; font-variant-numeric: tabular-nums; }
.sr-sep   { color: rgba(255,255,255,0.4); font-size: 32px; }`,
        ),
      };
      next = addLayer(next, { id: 'score-row', type: 'container', label: 'Score row', styles: { position: 'absolute', left: '50%', top: '60px' } });
      next = addLayer(next, { id: `${idA}_gfx`, type: 'text', label: 'Team A name', fieldId: idA, text: 'TEAM A', styles: { color: '#fff', fontSize: '28px' } });
      next = addLayer(next, { id: `${idAS}_gfx`, type: 'text', label: 'Team A score', fieldId: idAS, text: '0', styles: { color: '#fff', fontSize: '40px', fontWeight: '800' } });
      next = addLayer(next, { id: `${idBS}_gfx`, type: 'text', label: 'Team B score', fieldId: idBS, text: '0', styles: { color: '#fff', fontSize: '40px', fontWeight: '800' } });
      next = addLayer(next, { id: `${idB}_gfx`, type: 'text', label: 'Team B name', fieldId: idB, text: 'TEAM B', styles: { color: '#fff', fontSize: '28px' } });
      return next;
    },
  },

  // ----- Fields -----
  {
    id: 'text-field',
    label: 'Text data field',
    category: 'Fields',
    description: 'Add a new f# text field: definition entry, hidden holder, visible element.',
    apply: addTextField,
  },
  {
    id: 'number-field',
    label: 'Number data field',
    category: 'Fields',
    description: 'Add a new f# number field (e.g. a score or counter).',
    apply: addNumberField,
  },
  {
    id: 'dropdown-field',
    label: 'Dropdown data field',
    category: 'Fields',
    description: 'Add a new f# dropdown field with selectable options.',
    apply: addDropdownField,
  },

  // ----- Animation -----
  {
    id: 'css-fade',
    label: 'CSS fade-in',
    category: 'Animation',
    description: 'A reusable .fade-in keyframe class you can add to any element.',
    apply: (t) => ({
      ...t,
      css: appendCss(
        t.css,
        'Fade-in animation (add class="fade-in" to an element)',
        `@keyframes spxFadeIn { from { opacity: 0; } to { opacity: 1; } }
.fade-in { animation: spxFadeIn 0.6s ease both; }`,
      ),
    }),
  },
  {
    id: 'css-slide',
    label: 'CSS slide-in',
    category: 'Animation',
    description: 'A reusable .slide-in keyframe class (slides up into place).',
    apply: (t) => ({
      ...t,
      css: appendCss(
        t.css,
        'Slide-in animation (add class="slide-in" to an element)',
        `@keyframes spxSlideIn { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.slide-in { animation: spxSlideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }`,
      ),
    }),
  },
  {
    id: 'css-scale',
    label: 'CSS scale-in',
    category: 'Animation',
    description: 'A reusable .scale-in keyframe class (pops in from 92%).',
    apply: (t) => ({
      ...t,
      css: appendCss(
        t.css,
        'Scale-in animation (add class="scale-in" to an element)',
        `@keyframes spxScaleIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.scale-in { animation: spxScaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }`,
      ),
    }),
  },
  {
    id: 'gsap-pulse',
    label: 'GSAP pulse helper',
    category: 'Animation',
    description: 'Adds a pulse(selector) JS helper using GSAP.',
    apply: (t) => ({
      ...t,
      js: appendJs(
        t.js,
        'pulse(selector): a quick attention pulse using GSAP',
        `function pulse(selector) {
  gsap.fromTo(selector, { scale: 1 }, { scale: 1.08, duration: 0.18, yoyo: true, repeat: 1, ease: 'power1.inOut' });
}`,
      ),
    }),
  },
];

export const BLOCK_CATEGORIES: BuildingBlock['category'][] = ['Structure', 'Elements', 'Fields', 'Animation'];
