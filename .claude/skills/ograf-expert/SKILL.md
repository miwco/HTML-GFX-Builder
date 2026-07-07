---
name: ograf-expert
description: >-
  Authoritative reference for the EBU OGraf (Open Graphics) v1 specification: the .ograf.json
  manifest schema (id/name/main/supportsRealTime/supportsNonRealTime, schema, stepCount,
  customActions, actionDurations, renderRequirements, thumbnails), the Graphic Web Component
  interface (load, dispose, playAction, stopAction, updateAction, customAction, and non-real-time
  goToTime/setActionsSchedule), the ReturnPayload contract, the step model, data flow, and the
  renderer/loader contract. Use when implementing, exporting, reviewing, or explaining OGraf
  graphics, an .ograf.json manifest, the Graphic custom element, or an "OGraf export" target.
---

# OGraf Expert (EBU Open Graphics, v1)

Reference for the EBU **OGraf** specification — an open standard for broadcast graphics built with
standard web tech (HTML, JS, CSS, Canvas, Web Components). Use it when building or reviewing OGraf
graphics or an OGraf export.

Spec: <https://ograf.ebu.io/v1/specification/docs/Specification.html> ·
JSON Schema: <https://ograf.ebu.io/v1/specification/json-schemas/graphics/schema.json> ·
TypeScript defs: <https://github.com/ebu/ograf/blob/main/v1/typescript-definitions/src/apis/graphicsAPI.ts>

---

## 1. What an OGraf Graphic is (package structure)

A Graphic is a web-based graphic. A package has **three mandatory parts**:

1. **Manifest** — a JSON file whose name ends in **`.ograf.json`** (e.g. `my-graphic.ograf.json`).
   It is the entry point/representation of the Graphic; everything else is referenced (directly or
   indirectly) from it. If a folder has multiple `.ograf.json` files, **each is an independent
   Graphic**.
2. **JavaScript entry point** — the file named by the manifest's **`main`** field; it **exports a
   default Web Component class** (extends `HTMLElement`).
3. **Resources** — images, video, fonts, etc., organised as needed.

## 2. Manifest schema (`.ograf.json`)

### Required fields
| Field | Type | Notes |
|---|---|---|
| `$schema` | string | **exactly** `"https://ograf.ebu.io/v1/specification/json-schemas/graphics/schema.json"` |
| `id` | string | unique; any unicode **except `/`** (forward slash) |
| `name` | string | display name |
| `main` | string | path to the JS file exporting the Web Component |
| `supportsRealTime` | boolean | supports real-time rendering |
| `supportsNonRealTime` | boolean | if `true`, the Graphic **MUST** implement `goToTime()` and `setActionsSchedule()` |

### Optional fields
| Field | Type | Notes |
|---|---|---|
| `version` | string | version descriptor (scheme is out of spec scope) |
| `description` | string | longer description |
| `author` | object | `{ name (required), email?, url? }` |
| `schema` | object (JSON Schema) | the **public state model** for the `data` parameter; properties MAY carry a `hidden: true` attribute (hidden from GUI labels) |
| `stepCount` | integer | `1` (or undefined) = single step; `0` = no steps; `>1` = multi-step; `-1` = dynamic/unknown |
| `customActions` | Action[] | custom action definitions |
| `actionDurations` | ActionDuration[] | static animation durations (ms) |
| `renderRequirements` | RenderRequirement[] | environment requirements (at least one must be met) |
| `thumbnails` | Thumbnail[] | `{ file (PNG/JPG/GIF/webp), resolution?: {width,height} }` |

### Sub-objects
- **Action**: `{ id (required, unique), name (required), description?, schema? }` — `schema` is a
  JSON Schema for that action's payload.
- **ActionDuration**: `{ type, duration, customActionId?, steps? }`. `type` ∈
  `playAction | updateAction | stopAction | customAction`. `duration` in ms (`0` = none, `-1` =
  dynamic). At most **one** ActionDuration per non-custom `type`; at most one per `customActionId`.
  `steps` (playAction only) gives per-step durations `{ step (0-based), duration }` with fallback:
  exact-step → fallback-step → action-level `duration`.
- **RenderRequirement**: `{ resolution?: {width,height as NumberConstraint}, frameRate?:
  NumberConstraint, accessToPublicInternet?: BooleanConstraint, engine?: EngineRequirement[] }`.
- **Constraints**: `NumberConstraint { min?, max?, exact?, ideal? }`;
  `BooleanConstraint { exact?, ideal? }`; `StringConstraint { exact?, ideal? (string | string[]) }`.
- **Vendor extensions**: any vendor-specific field **MUST** be prefixed **`v_`** (e.g. `v_editor`).

### Manifest example (lower third)
```json
{
  "$schema": "https://ograf.ebu.io/v1/specification/json-schemas/graphics/schema.json",
  "id": "l3rd-name",
  "version": "1.0.0",
  "name": "Lower 3rd - Name",
  "description": "Name lower third",
  "author": { "name": "John Doe", "email": "john.doe@foo.com" },
  "main": "lower-third.mjs",
  "schema": {
    "type": "object",
    "properties": {
      "name": { "type": "string", "title": "Name", "default": "John Doe" }
    }
  },
  "supportsRealTime": true,
  "supportsNonRealTime": false
}
```

## 3. The Graphic Web Component interface

The `main` file exports a default class extending `HTMLElement`:

```js
class Graphic extends HTMLElement {
  // required + optional methods below
}
export default Graphic;
```

### ReturnPayload
Every action method returns `Promise<ReturnPayload | undefined>`. Resolving to `undefined` is
treated as `{ statusCode: 200 }`.
```ts
interface ReturnPayload {
  statusCode: number;      // HTTP-style: 2xx success, 4xx/5xx error
  statusMessage?: string;
  result?: unknown;        // graphic-specific
  currentStep?: number;    // playAction: current step after execution; undefined = at end
}
```

### Required methods (all Graphics)
```ts
// Called when the Graphic is loaded into the DOM. MUST apply `data`; resolve when ready for actions.
load(params: { data: unknown; renderType: "realtime" | "non-realtime"; renderCharacteristics: RenderCharacteristics }): Promise<ReturnPayload | undefined>

// Terminate/clear loaded resources. Resolve when cleanup is complete.
dispose(params: {}): Promise<ReturnPayload>

// Play a step. If `goto` >= 0, target = goto; else target = currentStep + (delta ?? 1). If target
// >= stepCount, go to end and return currentStep = undefined. MUST skip animation if skipAnimation.
// SHOULD resolve when ready for the next action (finished animating in); SHOULD NOT wait for long
// animations (e.g. scrollers) to finish.
playAction(params: { goto?: number; delta?: number; skipAnimation?: boolean }): Promise<ReturnPayload & { currentStep?: number }>

// Stop/animate out. MUST skip animation if skipAnimation. SHOULD resolve when finished animating out.
stopAction(params: { skipAnimation?: boolean }): Promise<ReturnPayload | undefined>

// Update one or more fields of internal state (per manifest `schema`). MUST skip animation if
// skipAnimation. SHOULD resolve when ready for the next action.
updateAction(params: { data: unknown; skipAnimation?: boolean }): Promise<ReturnPayload | undefined>

// Invoke a custom action by id (must match manifest customActions[].id). `payload` follows that
// Action's schema. MUST skip animation if skipAnimation. SHOULD resolve when the action completes.
customAction(params: { id: string; payload: unknown; skipAnimation?: boolean }): Promise<ReturnPayload | undefined>
```

### Required only when `supportsNonRealTime === true`
```ts
// Jump to a timestamp (ms). MUST resolve once the frame at that position is rendered.
goToTime(params: { timestamp: number }): Promise<ReturnPayload | undefined>

// Replace the schedule of timed actions. Store and fire them when their time arrives.
// Resolve when the schedule is received; SHOULD NOT wait for it to execute.
setActionsSchedule(params: { schedule: Array<{ timestamp: number; action: { type: "playAction"|"stopAction"|"updateAction"|"customAction"; params: unknown } }> }): Promise<ReturnPayload | undefined>
```

### Concurrency contract
The Graphic **MUST** handle action-method calls at any time, even if a previous method's Promise
hasn't resolved. Acceptable strategies: queue, abort the previous animation, or skip ahead. It
**SHOULD NOT** ignore subsequent calls.

## 4. Data flow & step model

- **Data**: the `data` object passed to `load()` and `updateAction()` conforms to the manifest's
  `schema` (the public state model). Properties flagged `hidden: true` shouldn't show as GUI labels.
- **Steps** (`stepCount`): `0` → `playAction()` animates in **and** out automatically; `1`/undefined
  → animate in and hold at step 0, `stopAction()` goes to end; `>1` → transition between steps (can
  jump to any step or straight to end); `-1` → dynamic/unknown.
- **Action durations**: predicted ms (`0` none, `-1` dynamic); `playAction.steps` may give per-step
  values with the fallback order above.

## 5. Renderer / loader contract
- **Add**: Renderer MUST call `load()` and MUST wait for the Promise before calling any action.
- **Remove**: Renderer MUST call `dispose()` and SHOULD wait for its Promise.
- `load()` receives `renderCharacteristics` describing the renderer's capabilities.

## 6. Requirements summary
- **Mandatory manifest fields**: `$schema`, `id` (no `/`), `name`, `main`, `supportsRealTime`,
  `supportsNonRealTime`.
- **Conditional**: `supportsNonRealTime: true` ⇒ implement `goToTime()` + `setActionsSchedule()`.
- **Vendor fields**: prefix with `v_`.

---

## Implementing an OGraf export (e.g. from a NoaCG Studio template)

OGraf is a natural second export target next to SPX. A deterministic mapping from a template that
uses global `play()/stop()/update(data)` + `id="fN"` elements:

- **Manifest `<slug>.ograf.json`**: `$schema` (the exact URL), `id` = template slug (no `/`),
  `name` = template name/description, `main` = `"graphic.mjs"`, `supportsRealTime: true`,
  `supportsNonRealTime: false`. Build `schema.properties` from the `DataFields`: one property per
  `fN`, `title` from the field's `title`, `default` from its `value`, and `type` from the ftype
  (textfield/textarea/dropdown/filelist/color → `string`, number → `number`, checkbox → `boolean`;
  dropdown → add `enum`). Optionally add `thumbnails`.
- **`graphic.mjs`** (default-exported class extends `HTMLElement`): render the template's HTML/CSS
  into the element (shadow DOM or innerHTML), bundle/inline GSAP. Map the runtime:
  - `load({ data })` → inject the template markup, then apply `data` (write each `data.fN` into the
    element with `id="fN"`), resolve when ready.
  - `updateAction({ data })` → apply the changed fields the same way.
  - `playAction()` → run the template's in-animation (its `play()` / GSAP timeline); return
    `currentStep` per the step model.
  - `stopAction()` → run the out-animation (`stop()`); resolve when done.
  - `dispose()` → kill tweens/timers and clear the element.
- **Package**: the `.ograf.json`, `graphic.mjs`, any bundled JS (GSAP), and an `assets/` folder,
  with relative references — mirroring the plug-and-play rule used for SPX exports.

Keep the generated `.mjs` readable and the manifest schema faithful to the template's fields, the
same way the SPX exporters stay 1:1 with the editor code.
