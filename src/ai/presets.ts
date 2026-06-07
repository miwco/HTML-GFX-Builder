// Deterministic starting points used by the stub AI provider's generate().
// A "blank" SPX-valid template (clean runtime + empty definition) that blocks build upon.

import { replaceDefinitionInHtml } from '../model/spxDefinition';
import { DEFAULT_SETTINGS, RESOLUTIONS, type SpxField, type SpxSettings, type SpxTemplate } from '../model/types';

const BLANK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>SPX graphic</title>

  <!-- GSAP animation library (bundled locally). -->
  <script src="js/gsap.min.js"></script>

  <!-- Template styles and logic. -->
  <link rel="stylesheet" href="css/template.css" />
  <script src="js/template.js"></script>

  <!-- SPX template definition (data fields shown to the operator). -->
  <script id="spx-template-definition" type="text/javascript">
  window.SPXGCTemplateDefinition = {
      "description": "SPX graphic",
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

  <!-- Hidden data holders. SPX writes incoming field values here. -->
</body>
</html>
`;

const BLANK_CSS = `/* Reset and a transparent stage (broadcast graphics render over video). */
* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  background: transparent;
  font-family: "Open Sans", Arial, sans-serif;
}

.spx-data { display: none; }
`;

const BLANK_JS = `// SPX calls these functions to control the graphic.

// Copy each hidden data value into its matching visible element ("f0" -> "f0_gfx").
function runTemplateUpdate() {
  document.querySelectorAll('.spx-data').forEach(function (holder) {
    var target = document.getElementById(holder.id + '_gfx');
    if (target) target.innerHTML = holder.innerHTML;
  });
}

// update(data): SPX sends field values as a JSON string.
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

// play(): reveal/animate the graphic in.
function play() {
  runTemplateUpdate();
  gsap.fromTo('body', { opacity: 0 }, { opacity: 1, duration: 0.4 });
}

// stop(): animate the graphic out.
function stop() {
  gsap.to('body', { opacity: 0, duration: 0.4 });
}

// next(): used by multi-step templates.
function next() {}
`;

export function blankTemplate(name = 'SPX graphic', description = 'SPX graphic'): SpxTemplate {
  const settings: SpxSettings = { ...DEFAULT_SETTINGS, description };
  const fields: SpxField[] = [];
  const html = replaceDefinitionInHtml(BLANK_HTML, settings, fields);
  return {
    name,
    type: 'blank',
    resolution: RESOLUTIONS[0],
    fps: 25,
    html,
    css: BLANK_CSS,
    js: BLANK_JS,
    fields,
    settings,
    assets: [],
    layers: [],
  };
}
