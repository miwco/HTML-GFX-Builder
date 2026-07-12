---
name: spx-html-template-expert
description: >-
  Authoritative reference for the SPX Graphics "Basic HTML template structure" docs page: the
  SPXGCTemplateDefinition object, all playout/display settings, every DataField type (ftype), the
  spxData data-access object, the spxRenderer lifecycle events, folder/path conventions, and best
  practices. Use when writing, editing, reviewing, or explaining an SPX HTML template, its template
  definition, field types (textfield/dropdown/filelist/number/checkbox/color/button/…), data
  access, multi-step (steps/Continue) behaviour, or playout settings (playserver/playchannel/
  playlayer/webplayout/out).
---

# SPX HTML Template Expert

Everything from the SPX docs **Documentation → Graphic Templates → Formats → HTML** ("Basic HTML
template structure"). An SPX template is a normal HTML file whose **Template Definition** (a JSON
object in `<head>`) is the "brain": it tells SPX which operator controls to show and how/where to
play out. Templates consume data through the **`spxData`** object and use CSS for styling and JS for
animation logic.

Source: <https://docs.spxgraphics.com/Documentation/Graphic+Templates/Formats/HTML>

---

## 1. Basic template structure

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>My Template</title>

    <!-- CSS Styles -->
    <style>/* Your styles here */</style>

    <!-- JavaScript Libraries (optional) -->
    <script src="./js/library.js"></script>

    <!-- Template Definition (REQUIRED) — place LAST in <head> -->
    <script>
        window.SPXGCTemplateDefinition = {
            // Template definition object
        };
    </script>
</head>
<body>
    <!-- HTML Content -->
    <div id="content"><!-- Your template content --></div>

    <!-- Template Logic -->
    <script>
        // Access field values via the spxData object
    </script>
</body>
</html>
```

## 2. Required elements

### 2a. Template Definition (required)
`window.SPXGCTemplateDefinition` **must** be present in `<head>` (place it as the **last** item in
`<head>`). Minimum shape:

```html
<script>
    window.SPXGCTemplateDefinition = {
        "description": "My Template",
        "playserver": "OVERLAY",
        "playlayer": "7",
        "webplayout": "7",
        "DataFields": [ /* field definitions */ ]
    };
</script>
```

### 2b. Data access — the `spxData` object
Templates receive their field values through **`spxData`** (JSON, the default) or an XML document.

```js
// JSON dataformat (default)
var name  = spxData.f0;   // field f0
var title = spxData.f1;   // field f1

// XML dataformat
var name  = spxData.getElementsByTagName('f0')[0].textContent;
var title = spxData.getElementsByTagName('f1')[0].textContent;
```

Handle missing values defensively: `var name = spxData.f0 || 'Default Name';`

## 3. Folder organization & paths

Recommended layout under `ASSETS/templates/`:

```
ASSETS/templates/
└── myCompany/
    └── ProjectA/
        ├── css/styles.css
        ├── js/animations.js
        ├── images/logo.png
        └── Template1.html
```

- **Relative** paths (relative to the template file):
  `<link rel="stylesheet" href="./css/styles.css">`, `<script src="./js/animations.js">`,
  `<img src="./images/logo.png">`
- **Global ASSETS** paths (start with `/`): `<img src="/media/images/bg/background.png">`,
  `<video src="/media/video/intro.mp4">`

## 4. Template lifecycle

On load: HTML parsed → CSS applied → JS executes → data injected via `spxData` → template can
initialise animations/effects.

**Animation phases** (multi-step templates): Step 1 = initial in-animation; Step 2+ = further phases
triggered by the **Continue** button; **Out** = exit animation triggered by **Stop**. The number of
phases is declared by `steps` (Continue is enabled when `steps` ≥ 2).

**Lifecycle handler via the SPX renderer:**

```js
if (window.top && window.top.spxRenderer) {
    window.top.spxRenderer.on('play',     function () { startAnimation(); }); // started playing
    window.top.spxRenderer.on('stop',     function () { stopAnimation();  }); // stopped
    window.top.spxRenderer.on('continue', function () { nextStep();       }); // next step
}
```

## 5. Template Definition — full reference

Placement: last item in `<head>`. Theoretically every property is optional, but you should set
playout layers deliberately to prevent playout clashes. These values are the template's **defaults**
and can be overridden per project in **Project Settings**.

### Playout settings
| Property | Meaning | Values / notes |
|---|---|---|
| `playserver` | CasparCG server name (from config) | a configured name, or `"-"` for none. e.g. `"OVERLAY"` |
| `playchannel` | CasparCG playout channel number | e.g. `"1"` |
| `playlayer` | CasparCG playout layer | `1`–`20` (20 = frontmost / closest to camera; 1 = back) |
| `webplayout` | Web playout layer | `1`–`20`, or `"-"` for none |
| `out` | How the layer is taken out | `"manual"` (STOP animates out — default) · `"none"` (play-only; wipes/bumpers) · `"[ms]"` e.g. `"4000"` auto-stops after 4 s |
| `steps` | Number of animation phases | `"1"` for normal in/out; `≥ 2` enables the **Continue** button |
| `dataformat` | How the logic expects data | `"json"` (default, from 1.2.2) · `"xml"` (older CasparCG compatibility) |

### Display settings
| Property | Meaning |
|---|---|
| `description` | Template name shown in the SPX UI, e.g. `"Top left with icon"` |
| `uicolor` | UI colour theme, `"1"`–`"7"` |

### `DataFields`
Array defining the operator's input controls. Each data field has: `field` (unique id like `"f0"`),
`ftype` (control type), `title` (UI label), `value` (default). **The values of the first two fields
are used as the rundown content preview — order fields accordingly.**

## 6. Field types (ftypes)

| ftype | Description |
|---|---|
| `hidden` | Non-editable variable; `value` used by the template, `title` shown as static text. |
| `caption` | Static text shown to the operator (no input). |
| `textfield` | Single-line text input. |
| `dropdown` | Selector list; options in an `items` array. |
| `textarea` | Multi-line text (accepts newlines). *(1.0.2)* |
| `filelist` | Dropdown of files of a given `extension` in an `assetfolder`. *(1.0.3)* |
| `divider` | Visual divider line. *(1.0.3)* |
| `instruction` | Longer help text on the template. *(1.0.6)* |
| `number` | Numeric input. *(1.0.7)* |
| `checkbox` | `title` is the label; `value` is `"0"`/`"1"`. *(1.0.10)* |
| `color` | `title` is the label; `value` is a CSS colour string. *(1.1.1)* |
| `spacer` | Empty line to separate sections. *(1.1.2)* |
| `button` | Button that runs custom JS via `fcall`. |

### Examples

```jsonc
// textfield
{ "field": "f0", "ftype": "textfield", "title": "Name", "value": "John Doe" }

// textarea (\n = new line)
{ "field": "f1", "ftype": "textarea", "title": "Description", "value": "First line\nSecond line" }

// dropdown — `value` MUST equal one of the items' values
{ "field": "f2", "ftype": "dropdown", "title": "Select logo scaling", "value": "0.3",
  "items": [ { "text": "Tiny logo", "value": "0.3" }, { "text": "Huge logo", "value": "1.2" } ] }

// filelist — global assetfolder ("/…") or, v1.0.15+, relative ("./…")
{ "field": "f3", "ftype": "filelist", "title": "Choose background image",
  "assetfolder": "/media/images/bg/", "extension": "png", "value": "/media/images/bg/checker.png" }
{ "field": "f4", "ftype": "filelist", "title": "Choose CSS stylesheet",
  "assetfolder": "./styles/", "extension": "css", "value": "./styles/defaultStyle.css" }

// number
{ "field": "f5", "ftype": "number", "title": "Rotation degrees", "value": "45" }

// checkbox — "0" unchecked, "1" checked
{ "field": "f6", "ftype": "checkbox", "title": "Show logo", "value": "1" }

// color — any valid CSS colour: rgb()/rgba()/#hex
{ "field": "f8", "ftype": "color", "title": "Text color", "value": "rgba(255, 255, 255, 1.0)" }

// button — fcall runs when clicked
{ "field": "f7", "ftype": "button", "title": "Click me", "descr": "What it does",
  "fcall": "myCustomHello('world')" }

// instruction / divider / spacer / hidden / caption
{ "ftype": "instruction", "value": "A demo template definition." }
{ "ftype": "divider" }
{ "ftype": "spacer" }
{ "field": "f9", "ftype": "hidden", "title": "Template version", "value": "1.0.0" }
{ "ftype": "caption", "value": "This template does not have editable values" }
```

> Colour-picker caveat: the UI can feel flaky — a colour may need selecting two or more times to
> register.

## 7. Project variables (`prvar`)

A field can become a **project variable** shared across templates by adding `prvar`:

```jsonc
{ "field": "f0", "ftype": "textfield", "title": "Name of the event",
  "value": "Fakemusic Fest 2022", "prvar": "eventName" }
```

## 8. Best practices

- **Field order:** most-important first (first two fields are the rundown preview); group with
  `divider`/`spacer`; add `instruction` fields for complex templates; provide sensible defaults;
  use descriptive `title`s.
- **Layers:** set `playlayer`/`webplayout` deliberately to avoid clashes.
- **Responsive:** design for the output resolution (e.g. `1920×1080`), or responsive units
  (`100vw`/`100vh`).
- **Performance:** minimise DOM nodes; animate with CSS transforms (GPU); optimise media; avoid
  blocking JS.
- **Error handling:** guard missing data — `spxData.f0 || 'Default'`.
- **Compatibility & a11y:** test in Chromium/Firefox/Safari; ensure contrast, readable sizes, clear
  hierarchy.

## 9. Complete example (simple lower third)

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        .lower-third { position: absolute; bottom: 100px; left: 50px;
            background: rgba(0,0,0,0.8); padding: 20px; color: white; }
    </style>
    <script>
        window.SPXGCTemplateDefinition = {
            "description": "Simple Lower Third",
            "playserver": "OVERLAY", "playlayer": "7", "webplayout": "7",
            "DataFields": [
                { "field": "f0", "ftype": "textfield", "title": "Name",  "value": "" },
                { "field": "f1", "ftype": "textfield", "title": "Title", "value": "" }
            ]
        };
    </script>
</head>
<body>
    <div class="lower-third">
        <h2 id="name"></h2>
        <p id="title"></p>
    </div>
    <script>
        document.getElementById('name').textContent  = spxData.f0 || '';
        document.getElementById('title').textContent = spxData.f1 || '';
    </script>
</body>
</html>
```

---

## Two runtime styles (`spxData` vs classic globals)

The docs page above describes the **`spxData` + `spxRenderer.on(...)`** style. SPX also accepts the
**classic globals** style — global `play()`, `stop()`, `update(data)` (where `data` is a JSON
string), and `next()` — used by CasparCG-style templates and by some builders (e.g. the *NoaCG
Studio* project). Both are valid; SPX validators typically accept **either**. Everything else
(`SPXGCTemplateDefinition`, playout/display settings, ftypes, `prvar`, folder/path rules) is
identical in both styles. Pick the one the user/project wants:

- **`spxData` / `spxRenderer`** (this page): read `spxData.fN`; hook
  `spxRenderer.on('play' | 'stop' | 'continue')`.
- **Classic globals**: implement `update(data)` (JSON string), `play()`, `stop()`, `next()`. A
  common project convention is one element `id="fN"` per field that `update()` writes into (no
  `spxData`, no hidden holders, no `_gfx` split).
