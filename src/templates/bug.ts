import { parseDefinition } from '../model/spxDefinition';
import { DEFAULT_SETTINGS, RESOLUTIONS, type Resolution, type SpxTemplate } from '../model/types';

export function createBugTemplate(res: Resolution = RESOLUTIONS[0], fps = 25): SpxTemplate {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Corner bug</title>

  <script src="js/gsap.min.js"></script>
  <link rel="stylesheet" href="css/template.css" />
  <script src="js/template.js"></script>

  <script id="spx-template-definition" type="text/javascript">
  window.SPXGCTemplateDefinition = {
      "description": "Corner bug / persistent logo",
      "playserver": "OVERLAY",
      "playchannel": "1",
      "playlayer": "10",
      "webplayout": "1",
      "out": "manual",
      "steps": "0",
      "dataformat": "json",
      "uicolor": "4",
      "DataFields": [
          { "field": "f0", "ftype": "textfield", "title": "Channel name", "value": "CHANNEL" }
      ]
  };
  </script>
</head>
<body>
  <!--
    Corner bug: a persistent on-air logo/badge.
    Replace assets/bug-logo.png with your own image,
    or remove the <img> and keep only the text badge.
  -->
  <div class="bug" id="graphic">
    <div class="bug-badge">
      <!-- SPX writes field f0 straight into this element (id matches the field). -->
      <span class="bug-channel" id="f0">CHANNEL</span>
    </div>
  </div>
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

/* Bug positioned top-right. Starts invisible; fades in on play(). */
.bug {
  position: absolute;
  top: 48px;
  right: 60px;
  opacity: 0;
}

.bug-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 22px;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.bug-channel {
  color: #ffffff;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
`;

  const js = `// update(data): SPX sends field values as JSON. Each value is written into the
// element whose id matches the field name (f0 -> id="f0").
function update(data) {
  var fields = (typeof data === 'string') ? JSON.parse(data) : data;
  for (var key in fields) {
    var el = document.getElementById(key);
    if (el) el.innerHTML = fields[key];
  }
}

// play(): fade in the corner bug.
function play() {
  gsap.killTweensOf('#graphic');
  gsap.fromTo('#graphic',
    { opacity: 0 },
    { opacity: 1, duration: 0.5, ease: 'power2.out' }
  );
}

// stop(): fade out.
function stop() {
  gsap.to('#graphic', { opacity: 0, duration: 0.5, ease: 'power2.in' });
}

function next() {}
`;

  const parsed = parseDefinition(html);
  return {
    name: 'Corner Bug',
    type: 'bug',
    resolution: res,
    fps,
    html,
    css,
    js,
    fields: parsed?.fields ?? [],
    settings: parsed?.settings ?? { ...DEFAULT_SETTINGS, description: 'Corner bug' },
    assets: [],
    layers: [
      {
        id: 'f0',
        type: 'text',
        label: 'Channel name',
        fieldId: 'f0',
        text: 'CHANNEL',
        styles: { color: '#ffffff', fontSize: '28px', fontWeight: '700', letterSpacing: '0.12em' },
        animIn: 'fade',
        animOut: 'fade',
      },
    ],
  };
}
