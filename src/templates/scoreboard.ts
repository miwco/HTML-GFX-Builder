import { parseDefinition } from '../model/spxDefinition';
import { DEFAULT_SETTINGS, RESOLUTIONS, type Resolution, type SpxTemplate } from '../model/types';

export function createScoreboardTemplate(res: Resolution = RESOLUTIONS[0], fps = 25): SpxTemplate {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Scoreboard</title>

  <script src="js/gsap.min.js"></script>
  <link rel="stylesheet" href="css/template.css" />
  <script src="js/template.js"></script>

  <script id="spx-template-definition" type="text/javascript">
  window.SPXGCTemplateDefinition = {
      "description": "Scoreboard",
      "playserver": "OVERLAY",
      "playchannel": "1",
      "playlayer": "1",
      "webplayout": "1",
      "out": "manual",
      "steps": "0",
      "dataformat": "json",
      "uicolor": "3",
      "DataFields": [
          { "field": "f0", "ftype": "textfield", "title": "Team A name",  "value": "TEAM A" },
          { "field": "f1", "ftype": "number",    "title": "Team A score", "value": "0" },
          { "field": "f2", "ftype": "textfield", "title": "Team B name",  "value": "TEAM B" },
          { "field": "f3", "ftype": "number",    "title": "Team B score", "value": "0" }
      ]
  };
  </script>
</head>
<body>
  <!-- Scoreboard bar — slide in from top. -->
  <div class="scoreboard" id="graphic">
    <div class="sb-team sb-left">
      <span class="sb-name" id="f0_gfx">TEAM A</span>
      <span class="sb-score" id="f1_gfx">0</span>
    </div>
    <div class="sb-divider">—</div>
    <div class="sb-team sb-right">
      <span class="sb-score" id="f3_gfx">0</span>
      <span class="sb-name" id="f2_gfx">TEAM B</span>
    </div>
  </div>

  <div class="spx-data" id="f0"></div>
  <div class="spx-data" id="f1"></div>
  <div class="spx-data" id="f2"></div>
  <div class="spx-data" id="f3"></div>
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

/* Scoreboard bar — top-center, slides down from above. */
.scoreboard {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: stretch;
  background: #111827;
  opacity: 0;
  min-width: 800px;
}

.sb-team {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 18px 36px;
}

.sb-left  { border-right: none; }
.sb-right { border-left: none; }

.sb-name {
  color: rgba(255, 255, 255, 0.85);
  font-size: 30px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  min-width: 160px;
}

.sb-left .sb-name  { text-align: right; }
.sb-right .sb-name { text-align: left; }

.sb-score {
  color: #ffffff;
  font-size: 48px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  min-width: 56px;
  text-align: center;
}

.sb-divider {
  display: flex;
  align-items: center;
  padding: 0 16px;
  color: rgba(255, 255, 255, 0.3);
  font-size: 32px;
  background: rgba(255, 255, 255, 0.04);
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

// play(): slide the scoreboard down from the top edge.
function play() {
  runTemplateUpdate();
  gsap.killTweensOf('#graphic');
  gsap.fromTo('#graphic',
    { y: -120, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
  );
}

// stop(): slide up and out.
function stop() {
  gsap.to('#graphic', { y: -120, opacity: 0, duration: 0.4, ease: 'power2.in' });
}

function next() {}
`;

  const parsed = parseDefinition(html);
  return {
    name: 'Scoreboard',
    type: 'scoreboard',
    resolution: res,
    fps,
    html,
    css,
    js,
    fields: parsed?.fields ?? [],
    settings: parsed?.settings ?? { ...DEFAULT_SETTINGS, description: 'Scoreboard' },
    assets: [],
    layers: [
      { id: 'f0_gfx', type: 'text', label: 'Team A name',  fieldId: 'f0', text: 'TEAM A', styles: { color: 'rgba(255,255,255,0.85)', fontSize: '30px' } },
      { id: 'f1_gfx', type: 'text', label: 'Team A score', fieldId: 'f1', text: '0',       styles: { color: '#ffffff', fontSize: '48px', fontWeight: '800' } },
      { id: 'f2_gfx', type: 'text', label: 'Team B name',  fieldId: 'f2', text: 'TEAM B', styles: { color: 'rgba(255,255,255,0.85)', fontSize: '30px' } },
      { id: 'f3_gfx', type: 'text', label: 'Team B score', fieldId: 'f3', text: '0',       styles: { color: '#ffffff', fontSize: '48px', fontWeight: '800' } },
    ],
  };
}
