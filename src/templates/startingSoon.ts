import { parseDefinition } from '../model/spxDefinition';
import { DEFAULT_SETTINGS, RESOLUTIONS, type Resolution, type SpxTemplate } from '../model/types';

export function createStartingSoonTemplate(res: Resolution = RESOLUTIONS[0], fps = 25): SpxTemplate {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Starting soon</title>

  <script src="js/gsap.min.js"></script>
  <link rel="stylesheet" href="css/template.css" />
  <script src="js/template.js"></script>

  <script id="spx-template-definition" type="text/javascript">
  window.SPXGCTemplateDefinition = {
      "description": "Starting soon / pre-show",
      "playserver": "OVERLAY",
      "playchannel": "1",
      "playlayer": "1",
      "webplayout": "1",
      "out": "manual",
      "steps": "0",
      "dataformat": "json",
      "uicolor": "1",
      "DataFields": [
          { "field": "f0", "ftype": "textfield", "title": "Event name", "value": "Live Event" },
          { "field": "f1", "ftype": "textfield", "title": "Start time",  "value": "Starts at 20:00" }
      ]
  };
  </script>
</head>
<body>
  <!-- Full-frame pre-show holding graphic. -->
  <div class="starting-soon" id="graphic">
    <div class="ss-bg"></div>
    <div class="ss-content">
      <div class="ss-pre-label">STARTING SOON</div>
      <!-- SPX writes field f0 / f1 into the element whose id matches. -->
      <h1 class="ss-event-name" id="f0">Live Event</h1>
      <p  class="ss-start-time"  id="f1">Starts at 20:00</p>
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

.starting-soon {
  position: absolute;
  inset: 0;
  opacity: 0;
}

/* Gradient background panel. */
.ss-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #0d1b2a 0%, #1b2838 50%, #0a1628 100%);
}

/* Centered content block. */
.ss-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.ss-pre-label {
  color: #3aa0ff;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.35em;
  text-transform: uppercase;
}

.ss-event-name {
  color: #ffffff;
  font-size: 100px;
  font-weight: 800;
  text-align: center;
  line-height: 1.05;
  text-shadow: 0 4px 40px rgba(58, 160, 255, 0.3);
}

.ss-start-time {
  color: rgba(255, 255, 255, 0.65);
  font-size: 36px;
  font-weight: 300;
  text-align: center;
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

function play() {
  gsap.killTweensOf(['#graphic', '.ss-content']);
  // Background fades in.
  gsap.fromTo('#graphic',
    { opacity: 0 },
    { opacity: 1, duration: 1.0, ease: 'power2.out' }
  );
  // Content reveals slightly after.
  gsap.fromTo('.ss-content',
    { y: 30, opacity: 0 },
    { y: 0, opacity: 1, duration: 1.0, ease: 'power3.out', delay: 0.3 }
  );
}

function stop() {
  gsap.to('#graphic', { opacity: 0, duration: 0.7, ease: 'power2.in' });
}

function next() {}
`;

  const parsed = parseDefinition(html);
  return {
    name: 'Starting Soon',
    type: 'starting-soon',
    resolution: res,
    fps,
    html,
    css,
    js,
    fields: parsed?.fields ?? [],
    settings: parsed?.settings ?? { ...DEFAULT_SETTINGS, description: 'Starting soon' },
    assets: [],
    layers: [
      {
        id: 'f0',
        type: 'text',
        label: 'Event name',
        fieldId: 'f0',
        text: 'Live Event',
        styles: { color: '#ffffff', fontSize: '100px', fontWeight: '800', textAlign: 'center' },
        animIn: 'fade',
        animOut: 'fade',
      },
      {
        id: 'f1',
        type: 'text',
        label: 'Start time',
        fieldId: 'f1',
        text: 'Starts at 20:00',
        styles: { color: 'rgba(255,255,255,0.65)', fontSize: '36px', textAlign: 'center' },
        animIn: 'fade',
        animOut: 'fade',
      },
    ],
  };
}
