import { parseDefinition } from '../model/spxDefinition';
import { DEFAULT_SETTINGS, RESOLUTIONS, type Resolution, type SpxTemplate } from '../model/types';

export function createCountdownTemplate(res: Resolution = RESOLUTIONS[0], fps = 25): SpxTemplate {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Countdown timer</title>

  <script src="js/gsap.min.js"></script>
  <link rel="stylesheet" href="css/template.css" />
  <script src="js/template.js"></script>

  <script id="spx-template-definition" type="text/javascript">
  window.SPXGCTemplateDefinition = {
      "description": "Countdown timer",
      "playserver": "OVERLAY",
      "playchannel": "1",
      "playlayer": "1",
      "webplayout": "1",
      "out": "manual",
      "steps": "0",
      "dataformat": "json",
      "uicolor": "5",
      "DataFields": [
          { "field": "f0", "ftype": "textfield", "title": "Label",             "value": "STARTING IN" },
          { "field": "f1", "ftype": "number",    "title": "Duration (seconds)", "value": "300" }
      ]
  };
  </script>
</head>
<body>
  <!--
    Countdown timer. Set a label (f0) and duration in seconds (f1), then call play().
    The timer counts down from the duration and stops at 0:00.
  -->
  <div class="countdown" id="graphic">
    <div class="cd-label" id="f0_gfx">STARTING IN</div>
    <!-- countdown-display is updated by JS, not by the data-binding convention. -->
    <div class="cd-timer" id="countdown-display">5:00</div>
  </div>

  <!-- Hidden data holders for SPX field values. -->
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

/* Centered countdown block. */
.countdown {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  opacity: 0;
}

.cd-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 36px;
  font-weight: 400;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.cd-timer {
  color: #ffffff;
  font-size: 160px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 60px rgba(255, 200, 50, 0.4);
}
`;

  const js = `// Countdown timer logic.
// f0 = label text, f1 = duration in seconds.

var _cdTimer = null;
var _cdTotal = 300;

// Format seconds as M:SS (or just S if under a minute).
function formatTime(s) {
  var t = Math.max(0, Math.floor(s));
  var m = Math.floor(t / 60);
  var sec = t % 60;
  if (m > 0) return m + ':' + String(sec).padStart(2, '0');
  return String(sec);
}

function updateDisplay(seconds) {
  var el = document.getElementById('countdown-display');
  if (el) el.textContent = formatTime(seconds);
}

function runTemplateUpdate() {
  // Update label (f0) from hidden holder.
  var labelHolder = document.getElementById('f0');
  var labelEl     = document.getElementById('f0_gfx');
  if (labelHolder && labelEl) labelEl.innerHTML = labelHolder.innerHTML;

  // Read duration (f1) from hidden holder.
  var durHolder = document.getElementById('f1');
  if (durHolder && durHolder.innerHTML.trim()) {
    _cdTotal = parseInt(durHolder.innerHTML, 10) || 300;
  }
}

function update(data) {
  try {
    var fields = (typeof data === 'string') ? JSON.parse(data) : data;
    for (var key in fields) {
      var holder = document.getElementById(key);
      if (holder) holder.innerHTML = fields[key];
    }
    if (fields.f1 !== undefined) _cdTotal = parseInt(fields.f1, 10) || 300;
  } catch (e) {
    console.warn('update() could not parse data:', e);
  }
  runTemplateUpdate();
  updateDisplay(_cdTotal);
}

function play() {
  runTemplateUpdate();
  clearInterval(_cdTimer);
  var remaining = _cdTotal;
  updateDisplay(remaining);

  // Tick every second.
  _cdTimer = setInterval(function () {
    remaining--;
    updateDisplay(remaining);
    if (remaining <= 0) {
      clearInterval(_cdTimer);
      _cdTimer = null;
    }
  }, 1000);

  gsap.killTweensOf('#graphic');
  gsap.fromTo('#graphic',
    { opacity: 0, scale: 0.94 },
    { opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out' }
  );
}

function stop() {
  clearInterval(_cdTimer);
  _cdTimer = null;
  gsap.to('#graphic', { opacity: 0, scale: 0.94, duration: 0.4, ease: 'power2.in' });
}

function next() {}
`;

  const parsed = parseDefinition(html);
  return {
    name: 'Countdown Timer',
    type: 'countdown',
    resolution: res,
    fps,
    html,
    css,
    js,
    fields: parsed?.fields ?? [],
    settings: parsed?.settings ?? { ...DEFAULT_SETTINGS, description: 'Countdown timer' },
    assets: [],
    layers: [
      {
        id: 'f0_gfx',
        type: 'text',
        label: 'Label',
        fieldId: 'f0',
        text: 'STARTING IN',
        styles: { color: 'rgba(255,255,255,0.8)', fontSize: '36px', letterSpacing: '0.2em' },
        animIn: 'fade',
        animOut: 'fade',
      },
      {
        id: 'countdown-display',
        type: 'text',
        label: 'Timer display (JS-driven)',
        styles: { color: '#ffffff', fontSize: '160px', fontWeight: '800' },
        animIn: 'fade',
        animOut: 'fade',
      },
    ],
  };
}
