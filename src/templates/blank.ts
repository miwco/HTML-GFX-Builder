import { parseDefinition } from '../model/spxDefinition';
import { DEFAULT_SETTINGS, RESOLUTIONS, type Resolution, type SpxTemplate } from '../model/types';

export function createBlankTemplate(res: Resolution = RESOLUTIONS[0], fps = 25): SpxTemplate {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Blank template</title>

  <!-- GSAP animation library (optional — remove if not using animations). -->
  <script src="js/gsap.min.js"></script>

  <link rel="stylesheet" href="css/template.css" />
  <script src="js/template.js"></script>

  <!-- SPX template definition: add your DataFields here. -->
  <script id="spx-template-definition" type="text/javascript">
  window.SPXGCTemplateDefinition = {
      "description": "My template",
      "playserver": "OVERLAY",
      "playchannel": "1",
      "playlayer": "1",
      "webplayout": "1",
      "out": "manual",
      "steps": "0",
      "dataformat": "json",
      "uicolor": "7",
      "DataFields": []
  };
  </script>
</head>
<body>
  <!--
    Add your graphic elements here.
    Convention: visible elements use id="fN_gfx", hidden data holders use id="fN".
    Example:
      <div id="f0_gfx">Sample text</div>
      <div class="spx-data" id="f0"></div>
  -->

</body>
</html>
`;

  const css = `/* Reset: transparent 1920×1080 stage (broadcast graphics render over video). */
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

/* Add your styles below. */
`;

  const js = `// SPX calls play(), stop(), and update(data) to control the graphic.
// Add your HTML elements above, style them in the CSS tab, and animate them here.

// update(data): SPX sends field values as JSON, e.g. {"f0":"Hello"}.
// Update your DOM elements here, then call runTemplateUpdate() to sync the display.
function runTemplateUpdate() {
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

// play(): show / animate in your graphic.
function play() {
  runTemplateUpdate();
  // Example: gsap.fromTo('#graphic', { opacity: 0 }, { opacity: 1, duration: 0.5 });
}

// stop(): hide / animate out your graphic.
function stop() {
  // Example: gsap.to('#graphic', { opacity: 0, duration: 0.5 });
}

// next(): advance to the next step (for multi-step templates). Usually not needed.
function next() {}
`;

  const parsed = parseDefinition(html);
  return {
    name: 'Blank',
    type: 'blank',
    resolution: res,
    fps,
    html,
    css,
    js,
    fields: parsed?.fields ?? [],
    settings: parsed?.settings ?? { ...DEFAULT_SETTINGS, description: 'My template' },
    assets: [],
    layers: [],
  };
}
