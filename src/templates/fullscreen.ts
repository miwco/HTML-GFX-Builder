import { parseDefinition } from '../model/spxDefinition';
import { DEFAULT_SETTINGS, RESOLUTIONS, type Resolution, type SpxTemplate } from '../model/types';

export function createFullscreenTemplate(res: Resolution = RESOLUTIONS[0], fps = 25): SpxTemplate {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Fullscreen title</title>

  <script src="js/gsap.min.js"></script>
  <link rel="stylesheet" href="css/template.css" />
  <script src="js/template.js"></script>

  <script id="spx-template-definition" type="text/javascript">
  window.SPXGCTemplateDefinition = {
      "description": "Fullscreen title",
      "playserver": "OVERLAY",
      "playchannel": "1",
      "playlayer": "1",
      "webplayout": "1",
      "out": "manual",
      "steps": "0",
      "dataformat": "json",
      "uicolor": "2",
      "DataFields": [
          { "field": "f0", "ftype": "textfield", "title": "Headline",  "value": "Fullscreen Title" },
          { "field": "f1", "ftype": "textfield", "title": "Subtitle",  "value": "Supporting line" }
      ]
  };
  </script>
</head>
<body>
  <!-- Full-frame overlay. Starts invisible, fades in on play(). -->
  <div class="fullscreen" id="graphic">
    <div class="fs-content">
      <h1 class="fs-headline" id="f0_gfx">Fullscreen Title</h1>
      <p  class="fs-subtitle"  id="f1_gfx">Supporting line</p>
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

/* Dark semi-transparent overlay covering the full frame. */
.fullscreen {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
}

.fs-content {
  text-align: center;
  padding: 0 120px;
}

.fs-headline {
  color: #ffffff;
  font-size: 96px;
  font-weight: 800;
  line-height: 1.05;
  text-shadow: 0 4px 32px rgba(0, 0, 0, 0.6);
}

.fs-subtitle {
  color: #cccccc;
  font-size: 42px;
  font-weight: 300;
  margin-top: 24px;
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
    { opacity: 0 },
    { opacity: 1, duration: 0.8, ease: 'power2.out' }
  );
  gsap.fromTo('.fs-content',
    { y: 30, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', delay: 0.1 }
  );
}

function stop() {
  gsap.to('#graphic', { opacity: 0, duration: 0.5, ease: 'power2.in' });
}

function next() {}
`;

  const parsed = parseDefinition(html);
  return {
    name: 'Fullscreen Title',
    type: 'fullscreen',
    resolution: res,
    fps,
    html,
    css,
    js,
    fields: parsed?.fields ?? [],
    settings: parsed?.settings ?? { ...DEFAULT_SETTINGS, description: 'Fullscreen title' },
    assets: [],
    layers: [
      {
        id: 'f0_gfx',
        type: 'text',
        label: 'Headline',
        fieldId: 'f0',
        text: 'Fullscreen Title',
        styles: { color: '#ffffff', fontSize: '96px', fontWeight: '800', textAlign: 'center' },
        animIn: 'fade',
        animOut: 'fade',
      },
      {
        id: 'f1_gfx',
        type: 'text',
        label: 'Subtitle',
        fieldId: 'f1',
        text: 'Supporting line',
        styles: { color: '#cccccc', fontSize: '42px', fontWeight: '300', textAlign: 'center' },
        animIn: 'fade',
        animOut: 'fade',
      },
    ],
  };
}
