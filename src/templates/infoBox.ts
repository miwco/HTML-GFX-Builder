import { parseDefinition } from '../model/spxDefinition';
import { DEFAULT_SETTINGS, RESOLUTIONS, type Resolution, type SpxTemplate } from '../model/types';

export function createInfoBoxTemplate(res: Resolution = RESOLUTIONS[0], fps = 25): SpxTemplate {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Info box</title>

  <script src="js/gsap.min.js"></script>
  <link rel="stylesheet" href="css/template.css" />
  <script src="js/template.js"></script>

  <script id="spx-template-definition" type="text/javascript">
  window.SPXGCTemplateDefinition = {
      "description": "Info / text box",
      "playserver": "OVERLAY",
      "playchannel": "1",
      "playlayer": "1",
      "webplayout": "1",
      "out": "manual",
      "steps": "0",
      "dataformat": "json",
      "uicolor": "6",
      "DataFields": [
          { "field": "f0", "ftype": "textfield", "title": "Headline", "value": "Headline text" },
          { "field": "f1", "ftype": "textarea",  "title": "Body",     "value": "Supporting details go here." }
      ]
  };
  </script>
</head>
<body>
  <!-- Info box — lower-right, slides in on play(). -->
  <div class="info-box" id="graphic">
    <div class="ib-accent"></div>
    <div class="ib-content">
      <h2 class="ib-headline" id="f0_gfx">Headline text</h2>
      <p  class="ib-body"     id="f1_gfx">Supporting details go here.</p>
    </div>
  </div>

  <div class="spx-data" id="f0"></div>
  <div class="spx-data" id="f1"></div>
</body>
</html>
`;

  const css = `* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  width: ${res.width}px;
  height: ${res.height}px;
  overflow: hidden;
  background: transparent;
  font-family: "Open Sans", Arial, sans-serif;
}

.spx-data { display: none; }

/* Info box — lower-right area. */
.info-box {
  position: absolute;
  right: 100px;
  bottom: 120px;
  max-width: 640px;
  display: flex;
  align-items: stretch;
  background: rgba(10, 10, 20, 0.88);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
  opacity: 0;
}

/* Colored left accent strip. */
.ib-accent {
  width: 8px;
  background: linear-gradient(180deg, #3aa0ff, #1e6fb8);
  flex-shrink: 0;
}

.ib-content {
  padding: 24px 28px;
}

.ib-headline {
  color: #ffffff;
  font-size: 34px;
  font-weight: 700;
  line-height: 1.2;
}

.ib-body {
  color: rgba(255, 255, 255, 0.75);
  font-size: 22px;
  font-weight: 400;
  line-height: 1.5;
  margin-top: 10px;
}
`;

  const js = `function runTemplateUpdate() {
  document.querySelectorAll('.spx-data').forEach(function (holder) {
    var target = document.getElementById(holder.id + '_gfx');
    if (target) target.innerHTML = holder.innerHTML;
  });
}

function update(data) {
  try {
    var fields = (typeof data === 'string') ? JSON.parse(data) : data;
    for (var key in fields) {
      var holder = document.getElementById(key);
      if (holder) holder.innerHTML = fields[key];
    }
  } catch (e) {
    console.warn('update() could not parse data:', e);
  }
  runTemplateUpdate();
}

function play() {
  runTemplateUpdate();
  gsap.killTweensOf('#graphic');
  gsap.fromTo('#graphic',
    { x: 60, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.55, ease: 'power3.out' }
  );
}

function stop() {
  gsap.to('#graphic', { x: 60, opacity: 0, duration: 0.4, ease: 'power2.in' });
}

function next() {}
`;

  const parsed = parseDefinition(html);
  return {
    name: 'Info Box',
    type: 'info-box',
    resolution: res,
    fps,
    html,
    css,
    js,
    fields: parsed?.fields ?? [],
    settings: parsed?.settings ?? { ...DEFAULT_SETTINGS, description: 'Info / text box' },
    assets: [],
    layers: [
      {
        id: 'f0_gfx',
        type: 'text',
        label: 'Headline',
        fieldId: 'f0',
        text: 'Headline text',
        styles: { color: '#ffffff', fontSize: '34px', fontWeight: '700' },
        animIn: 'slide',
        animOut: 'slide',
      },
      {
        id: 'f1_gfx',
        type: 'text',
        label: 'Body',
        fieldId: 'f1',
        text: 'Supporting details go here.',
        styles: { color: 'rgba(255,255,255,0.75)', fontSize: '22px' },
        animIn: 'slide',
        animOut: 'slide',
      },
    ],
  };
}
