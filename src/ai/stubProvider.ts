// Deterministic stub AI provider. It produces safe, validated results by composing the same
// building blocks and presets the rest of the app uses — never fragile free-form code. A real
// Claude-backed provider implementing AIProvider can replace this later.

import { BUILDING_BLOCKS } from '../blocks/registry';
import { addFieldToDefinition, insertGraphicHtml, nextFieldId } from '../blocks/edit';
import { createDefaultTemplate } from '../model/defaultTemplate';
import { parseDefinition, replaceDefinitionInHtml } from '../model/spxDefinition';
import type { SpxTemplate, TemplateChange } from '../model/types';
import type { AIProvider } from './provider';
import { blankTemplate } from './presets';

const block = (id: string) => BUILDING_BLOCKS.find((b) => b.id === id)!;

function comingUpTemplate(): SpxTemplate {
  let t = blankTemplate('Coming up', 'Coming up');
  const idH = nextFieldId(t.fields);
  t = addFieldToDefinition(t, { field: idH, ftype: 'textfield', title: 'Heading', value: 'Coming up' });
  const id1 = nextFieldId(t.fields);
  t = addFieldToDefinition(t, { field: id1, ftype: 'textfield', title: 'Item 1', value: 'First item' });
  const id2 = nextFieldId(t.fields);
  t = addFieldToDefinition(t, { field: id2, ftype: 'textfield', title: 'Item 2', value: 'Second item' });
  const html = `  <!-- Coming up (SPX writes each field into the matching id) -->
  <div class="coming-up" id="cu">
    <div class="cu-heading" id="${idH}">Coming up</div>
    <ul class="cu-list">
      <li id="${id1}">First item</li>
      <li id="${id2}">Second item</li>
    </ul>
  </div>`;
  t = {
    ...t,
    html: insertGraphicHtml(t.html, html),
    css:
      t.css +
      `\n/* Coming up */\n.coming-up { position: absolute; left: 140px; bottom: 160px; }
.cu-heading { color: #ffd32a; font-size: 30px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
.cu-list { list-style: none; margin-top: 10px; }
.cu-list li { color: #fff; font-size: 40px; font-weight: 600; padding: 6px 0; }\n`,
  };
  return t;
}

/** Convert absolute (/...) asset paths to relative, and report whether anything changed. */
function relativizePaths(html: string): { html: string; changed: boolean } {
  let changed = false;
  const out = html.replace(/\b(src|href)=["']\/(?!\/)([^"']*)["']/gi, (_m, attr, path) => {
    changed = true;
    return `${attr}="${path}"`;
  });
  return { html: out, changed };
}

const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export class StubAIProvider implements AIProvider {
  async generate(prompt: string): Promise<TemplateChange> {
    await wait();
    const p = prompt.toLowerCase();
    if (/full ?screen|title card|headline/.test(p)) {
      const t = block('fullscreen').apply(blankTemplate('Fullscreen title', 'Fullscreen title'));
      return { summary: 'Generated a fullscreen title template.', template: t };
    }
    if (/coming ?up|line ?up|next up|schedule/.test(p)) {
      return { summary: 'Generated a "coming up" template with a heading and two items.', template: comingUpTemplate() };
    }
    if (/\bbug\b|corner|watermark/.test(p)) {
      const t = block('bug').apply(blankTemplate('Corner bug', 'Corner bug'));
      return { summary: 'Generated a corner-bug template.', template: t };
    }
    if (/\blogo\b/.test(p)) {
      const t = block('logo').apply(blankTemplate('Logo', 'Logo'));
      return { summary: 'Generated a logo template.', template: t };
    }
    // Default: a lower third.
    return { summary: 'Generated a lower-third template.', template: createDefaultTemplate() };
  }

  async modify(prompt: string, template: SpxTemplate): Promise<TemplateChange> {
    await wait();
    const p = prompt.toLowerCase();
    const rules: { test: RegExp; blockId: string; summary: string }[] = [
      { test: /fade/, blockId: 'css-fade', summary: 'Added a reusable CSS fade-in class.' },
      { test: /slide/, blockId: 'css-slide', summary: 'Added a reusable CSS slide-in class.' },
      { test: /pulse/, blockId: 'gsap-pulse', summary: 'Added a GSAP pulse() helper.' },
      { test: /field|text data|new text/, blockId: 'text-field', summary: 'Added a new text data field.' },
      { test: /lower ?third/, blockId: 'lower-third', summary: 'Added a lower-third block.' },
      { test: /full ?screen/, blockId: 'fullscreen', summary: 'Added a fullscreen layout block.' },
      { test: /\bbug\b|corner|watermark/, blockId: 'bug', summary: 'Added a corner bug.' },
      { test: /\blogo\b/, blockId: 'logo', summary: 'Added a logo image.' },
    ];
    for (const r of rules) {
      if (r.test.test(p)) {
        return { summary: r.summary, template: block(r.blockId).apply(template) };
      }
    }
    return {
      summary:
        'No deterministic change matched this prompt. Try keywords like "fade", "slide", "add field", "logo", "bug", or "fullscreen". (A real AI provider will handle free-form requests.)',
      template,
    };
  }

  async explain(code: string): Promise<string> {
    await wait();
    const lines: string[] = [];
    if (/function\s+update\s*\(/.test(code))
      lines.push('• update(data): receives field values as JSON and writes them into the matching DOM elements.');
    if (/function\s+play\s*\(/.test(code)) lines.push('• play(): reveals and animates the graphic in.');
    if (/function\s+stop\s*\(/.test(code)) lines.push('• stop(): animates the graphic out.');
    if (/function\s+next\s*\(/.test(code)) lines.push('• next(): advances multi-step templates.');
    if (/runTemplateUpdate/.test(code)) lines.push('• runTemplateUpdate(): copies hidden data holders into separate display elements (older split style).');
    if (/gsap\./.test(code)) lines.push('• Uses GSAP for animation (gsap.to / gsap.fromTo timelines).');
    if (/SPXGCTemplateDefinition/.test(code))
      lines.push('• SPXGCTemplateDefinition: declares the data fields SPX shows the operator and the playout settings.');
    if (/@keyframes/.test(code)) lines.push('• Defines CSS @keyframes animations.');
    if (lines.length === 0) lines.push('This looks like markup/styling without SPX runtime functions or a template definition.');
    return 'Explanation:\n' + lines.join('\n');
  }

  async fix(template: SpxTemplate): Promise<TemplateChange> {
    await wait();
    const notes: string[] = [];
    let next = template;

    // Ensure a definition exists.
    if (!parseDefinition(next.html)) {
      next = { ...next, html: replaceDefinitionInHtml(next.html, next.settings, next.fields) };
      notes.push('inserted a missing SPXGCTemplateDefinition');
    }
    // Relativize absolute asset paths.
    const rel = relativizePaths(next.html);
    if (rel.changed) {
      next = { ...next, html: rel.html };
      notes.push('converted absolute asset paths to relative');
    }
    // Ensure runtime functions exist (append minimal stubs only if entirely missing).
    if (!/function\s+(play|stop|update)\s*\(/.test(next.js)) {
      next = {
        ...next,
        js:
          next.js +
          `\n\n// Added by fix(): minimal SPX runtime functions.\nfunction update(data){try{var f=JSON.parse(data);for(var k in f){var h=document.getElementById(k);if(h)h.innerHTML=f[k];}}catch(e){}}\nfunction play(){}\nfunction stop(){}\nfunction next(){}\n`,
      };
      notes.push('added minimal play/stop/update/next functions');
    }

    return {
      summary: notes.length ? 'Applied fixes: ' + notes.join('; ') + '.' : 'No automatic fixes were needed.',
      template: next,
    };
  }

  async makeSpxReady(template: SpxTemplate): Promise<TemplateChange> {
    await wait();
    const notes: string[] = [];
    let next = template;

    if (!parseDefinition(next.html)) {
      next = { ...next, html: replaceDefinitionInHtml(next.html, next.settings, next.fields) };
      notes.push('added the SPXGCTemplateDefinition');
    } else {
      // Re-serialize to normalize the definition block.
      next = { ...next, html: replaceDefinitionInHtml(next.html, next.settings, next.fields) };
      notes.push('normalized the template definition');
    }

    const rel = relativizePaths(next.html);
    if (rel.changed) {
      next = { ...next, html: rel.html };
      notes.push('made asset paths relative');
    }

    if (next.settings.dataformat !== 'json') {
      const settings = { ...next.settings, dataformat: 'json' };
      next = { ...next, settings, html: replaceDefinitionInHtml(next.html, settings, next.fields) };
      notes.push('set dataformat to json');
    }

    return { summary: 'Made the template more SPX-ready: ' + notes.join('; ') + '.', template: next };
  }
}

export const aiProvider: AIProvider = new StubAIProvider();
