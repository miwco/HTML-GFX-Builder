import { parseDefinition } from '../model/spxDefinition';
import { DEFAULT_SETTINGS, RESOLUTIONS, type Resolution, type SpxTemplate } from '../model/types';

export function createLowerThirdTemplate(res: Resolution = RESOLUTIONS[0], fps = 25): SpxTemplate {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Lower third</title>

  <!-- GSAP animation library (bundled locally, no internet connection needed). -->
  <script src="js/gsap.min.js"></script>

  <!-- Template styles and logic. -->
  <link rel="stylesheet" href="css/template.css" />
  <script src="js/template.js"></script>

  <!-- SPX template definition: describes the data fields shown to the operator in SPX. -->
  <script id="spx-template-definition" type="text/javascript">
  window.SPXGCTemplateDefinition = {
      "description": "Lower third",
      "playserver": "OVERLAY",
      "playchannel": "1",
      "playlayer": "1",
      "webplayout": "1",
      "out": "manual",
      "steps": "0",
      "dataformat": "json",
      "uicolor": "7",
      "DataFields": [
          { "field": "f0", "ftype": "textfield", "title": "Name",  "value": "Firstname Lastname" },
          { "field": "f1", "ftype": "textfield", "title": "Title", "value": "Title / role" }
      ]
  };
  </script>
</head>
<body>
  <!-- The visible graphic. It starts hidden and is revealed by play(). -->
  <div class="lower-third" id="graphic">
    <div class="lt-bar">
      <div class="lt-name" id="f0_gfx">Firstname Lastname</div>
      <div class="lt-title" id="f1_gfx">Title / role</div>
    </div>
  </div>

  <!-- Hidden data holders. SPX writes incoming field values into these (ids match f0, f1...). -->
  <div class="spx-data" id="f0"></div>
  <div class="spx-data" id="f1"></div>
</body>
</html>
`;

  const css = `/* Reset and a transparent stage (broadcast graphics render over video). */
* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  width: ${res.width}px;
  height: ${res.height}px;
  overflow: hidden;
  background: transparent;
  font-family: "Open Sans", Arial, sans-serif;
}

/* Hidden data holders never show on screen. */
.spx-data { display: none; }

/* The graphic block — starts invisible, animated in by play(). */
.lower-third {
  position: absolute;
  left: 120px;
  bottom: 140px;
  opacity: 0;
}

.lt-bar {
  display: inline-block;
  padding: 14px 28px;
  background: linear-gradient(90deg, #0a3d62, #1e6fb8);
  border-left: 8px solid #ffd32a;
}

.lt-name {
  color: #ffffff;
  font-size: 46px;
  font-weight: 700;
  line-height: 1.1;
}

.lt-title {
  color: #cfe3ff;
  font-size: 26px;
  font-weight: 400;
  margin-top: 4px;
}
`;

  const js = `// SPX calls these functions to control the graphic. Keep them simple and readable.

// Copy each hidden data value into its matching visible element.
// Convention: hidden holder id "f0" -> visible element id "f0_gfx".
function runTemplateUpdate() {
  document.querySelectorAll('.spx-data').forEach(function (holder) {
    var target = document.getElementById(holder.id + '_gfx');
    if (target) target.innerHTML = holder.innerHTML;
  });
}

// update(data): SPX sends field values as JSON, e.g. {"f0":"Ada","f1":"Engineer"}.
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

// play(): reveal and animate the graphic in.
function play() {
  runTemplateUpdate();
  gsap.killTweensOf('#graphic');
  gsap.fromTo('#graphic',
    { y: 60, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
  );
}

// stop(): animate the graphic out.
function stop() {
  gsap.to('#graphic', { y: 60, opacity: 0, duration: 0.4, ease: 'power2.in' });
}

// next(): used by multi-step templates. A simple lower third does not need it.
function next() {}
`;

  const parsed = parseDefinition(html);
  return {
    name: 'Lower Third',
    type: 'lower-third',
    resolution: res,
    fps,
    html,
    css,
    js,
    fields: parsed?.fields ?? [],
    settings: parsed?.settings ?? { ...DEFAULT_SETTINGS, description: 'Lower third' },
    assets: [],
    layers: [
      {
        id: 'f0_gfx',
        type: 'text',
        label: 'Name',
        fieldId: 'f0',
        text: 'Firstname Lastname',
        styles: { color: '#ffffff', fontSize: '46px', fontWeight: '700' },
        animIn: 'slide',
        animOut: 'slide',
      },
      {
        id: 'f1_gfx',
        type: 'text',
        label: 'Title / role',
        fieldId: 'f1',
        text: 'Title / role',
        styles: { color: '#cfe3ff', fontSize: '26px' },
        animIn: 'slide',
        animOut: 'slide',
      },
    ],
  };
}
