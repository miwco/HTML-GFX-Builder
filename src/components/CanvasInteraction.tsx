import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useTemplateStore } from '../store/templateStore';
import { zoneDecls } from '../templates/shared/base';
import { setCssDeclaration, setFieldDefault } from '../blocks/edit';
import { getCssVariable, setCssVariable } from '../blocks/cssVars';
import type { Zone9 } from '../model/wizard';
import { detectPrefix, getTemplateParts, type TemplatePart } from '../model/structure';
import { parseTimeline } from '../blocks/timelineModel';
import { parseAnimData, spliceAnimData } from '../blocks/animData';
import { setKeyframe } from '../blocks/animEdit';
import { activationStep, animatedProps } from '../blocks/animEval';
import { changePartPress } from '../blocks/stepAssign';
import CanvasSelection, { type CanvasRect } from './CanvasSelection';
import { phaseIdOf } from './StepTimeline';
import type { SpxWindow } from './PlayoutSimulator';

interface Props {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  /** On-screen size of the canvas (template resolution × current scale), in CSS pixels. */
  width: number;
  height: number;
}

interface DragState {
  /** Pointer start, in screen px. */
  startX: number;
  startY: number;
  /** Current pointer delta, in screen px. */
  dx: number;
  dy: number;
  /** Past the threshold — the ghost + zone grid show and release commits. */
  active: boolean;
  /** The graphic root's rect at drag start, in CANVAS px (the iframe's internal space). */
  root: { left: number; top: number; width: number; height: number };
}

interface EditState {
  field: string;
  multiline: boolean;
  value: string;
  /** The text element's rect in CANVAS px (scaled to screen px at render time). */
  rect: { left: number; top: number; width: number; height: number };
}

/** A position-keyframe drag on the SELECTED layer (data-block templates, X/Y armed):
 *  live GSAP x/y preview while dragging, one x+y keyframe pair at the playhead on release. */
interface LayerDrag {
  selector: string;
  /** Pointer start, in screen px. */
  startX: number;
  startY: number;
  /** The layer's GSAP x/y at drag start (canvas px — the value the keyframes build on). */
  baseX: number;
  baseY: number;
  /** Current pointer delta, in canvas px. */
  dx: number;
  dy: number;
  /** Past the threshold — the layer follows live and release commits keyframes. */
  active: boolean;
}

/** W2 — a corner scale-handle drag: live --scale preview, one patch on release. */
interface ScaleDrag {
  startX: number;
  startY: number;
  origScale: number;
  /** The root's size at drag start, in screen px (the drag's scaling reference). */
  rootWidth: number;
  rootHeight: number;
  value: number;
}

// A real drag, not a shaky click (screen px).
const DRAG_THRESHOLD = 4;
// Sanity bounds for the drag, not a design limit — the Style panel accepts any typed
// value. Generous on purpose: the graphic's own max-width keeps huge scales inside the
// safe area, and 0.25 stops a wild drag from collapsing the graphic to nothing.
const SCALE_MIN = 0.25;
const SCALE_MAX = 4;

/**
 * The direct-manipulation layer over the preview (Era 6 — no modes): hover shows what's
 * grabbable (hand cursor on the graphic, text cursor on editable text), dragging the graphic
 * re-anchors it (nearest 9-zone + residual nudge — the SAME zoneDecls patch the Style panel
 * writes), and double-clicking a text line edits it in place (live sample value + the field's
 * SPX-definition default). Every gesture commits as ONE undoable applyTemplate and then jumps
 * the code editor to the changed tab, where the patched lines are highlighted — canvas editing
 * always shows the code it wrote. Broadcast templates take no pointer input of their own, so
 * this layer never competes with the graphic.
 *
 * On top of the gestures sits the SELECTION model: a click (below the drag threshold)
 * selects the innermost TemplatePart under the point — outline + a chip speaking the
 * registry's `part.label` — clicking the selected part again climbs to its container
 * (panel → whole graphic), and empty canvas or Escape deselects. Selection is editor UI
 * state ONLY: it never writes a byte into the template.
 */
export default function CanvasInteraction({ iframeRef, width, height }: Props) {
  const template = useTemplateStore((s) => s.template);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);
  const setSampleValue = useTemplateStore((s) => s.setSampleValue);
  const sampleData = useTemplateStore((s) => s.sampleData);
  const requestReplay = useTemplateStore((s) => s.requestReplay);
  const playhead = useTemplateStore((s) => s.playhead);
  const sendScrub = useTemplateStore((s) => s.sendScrub);
  const setCanvasGestureActive = useTemplateStore((s) => s.setCanvasGestureActive);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [layerDrag, setLayerDrag] = useState<LayerDrag | null>(null);
  const layerDragRef = useRef<LayerDrag | null>(null);
  layerDragRef.current = layerDrag;
  /** A lasso in flight: start + current corner, in canvas px. */
  const [lasso, setLasso] = useState<{ x0: number; y0: number; x1: number; y1: number; active: boolean; additive: boolean } | null>(null);
  const lassoRef = useRef<typeof lasso>(null);
  lassoRef.current = lasso;
  const [editing, setEditing] = useState<EditState | null>(null);
  const [cursor, setCursor] = useState<'default' | 'grab' | 'text'>('default');
  // The root's rect (canvas px) while the pointer is over it — anchors the scale handle.
  const [hoverRect, setHoverRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [scaleDrag, setScaleDrag] = useState<ScaleDrag | null>(null);
  const scaleDragRef = useRef<ScaleDrag | null>(null);
  scaleDragRef.current = scaleDrag;
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;
  // Mirror of `editing` so blur-after-Escape can't commit a cancelled edit (the blur handler
  // would otherwise close over the pre-Escape state).
  const editingRef = useRef<EditState | null>(null);
  editingRef.current = editing;
  const editInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Publish "a gesture is live" to the store: the Inspector's deferred auto-open (AppShell)
  // must never resize the workspace while the pointer is mid-gesture or the inline editor is
  // open — the canvas (and the edit overlay anchored to it) would shift under the user.
  useEffect(() => {
    setCanvasGestureActive(Boolean(drag || layerDrag || scaleDrag || editing || lasso));
  }, [drag, layerDrag, scaleDrag, editing, lasso, setCanvasGestureActive]);

  // ── Selection model (editor UI state only — never written into the template).
  // The selectors live in the STORE so the timeline highlights the same elements
  // (shared selection); everything derived from them stays local to this layer.
  // Multi-selection follows the interaction model (docs/TIMELINE_INTERACTION_MODEL.md):
  // plain click replaces, shift-click toggles, a drag on EMPTY canvas lassos. ──
  const selected = useTemplateStore((s) => s.selectedPart);
  const selectedParts = useTemplateStore((s) => s.selectedParts);
  const setSelected = useTemplateStore((s) => s.setSelectedPart);
  const setSelectedParts = useTemplateStore((s) => s.setSelectedParts);
  const toggleSelectedPart = useTemplateStore((s) => s.toggleSelectedPart);
  /** The selected elements' live rects in CANVAS px (rAF-tracked below); the PRIMARY
   *  (first selected) carries the chip, the rest get plain outlines. */
  const [selRect, setSelRect] = useState<CanvasRect | null>(null);
  const [extraRects, setExtraRects] = useState<CanvasRect[]>([]);
  /** The innermost part under the pointer — the "what would a click select" preview. */
  const [hoverPart, setHoverPart] = useState<{ selector: string; label: string; rect: CanvasRect } | null>(null);

  const res = template.resolution;
  const scale = width / res.width; // screen px per canvas px
  // The structure contract: every generated template has one root `.{prefix}` holding a
  // `.{prefix}-box` — the same detection every live panel uses (model/structure.ts).
  const prefix = detectPrefix(template.html) ?? 'lower-third';
  const rootSelector = `.${prefix}`;

  // The template's addressable parts — THE shared element-identity contract
  // (model/structure.ts). Selection and hover only ever name elements through it.
  const parts = useMemo(() => getTemplateParts(template.html, template.fields), [template.html, template.fields]);
  const selectedPart = selected ? parts.find((p) => p.selector === selected) ?? null : null;

  // ── "Appears on press" from the chip — the SAME control the timeline gutter offers,
  //    under the same conditions (steps on, chain groupable, part eligible), writing the
  //    same patch (blocks/stepAssign.ts changePartPress). The code stays the one truth. ──
  const timelineModel = useMemo(() => parseTimeline(template.js), [template.js]);
  // Timeline v2: on a data-block template the press chain is the steps' reveals lists.
  const dataModel = useMemo(() => parseAnimData(template.js), [template.js]);
  const presses = useMemo(
    () =>
      dataModel
        ? dataModel.steps.slice(1, -1).map((s) => s.reveals ?? [])
        : timelineModel?.steps.map((s) => s.targets) ?? null,
    [dataModel, timelineModel],
  );
  const stepsOn = dataModel ? dataModel.steps.length > 2 : template.js.includes('function revealNextStep');
  const chainGroupable = dataModel
    ? (presses?.length ?? 0) > 0
    : !!timelineModel && timelineModel.steps.length > 0 && timelineModel.steps.every((s) => s.groupable);
  const firstLine = parts.find((p) => p.kind === 'line')?.selector;
  const pressEligible =
    stepsOn &&
    chainGroupable &&
    !!selectedPart &&
    (selectedPart.kind === 'line' ||
      selectedPart.kind === 'image' ||
      selectedPart.kind === 'accent' ||
      selectedPart.kind === 'block') &&
    selectedPart.selector !== firstLine;
  /** Which press the selected part is on (-1 = appears with ▶ Play). */
  const selectedPress = pressEligible
    ? presses!.findIndex((targets) => targets.includes(selectedPart!.selector))
    : -1;

  // ── Canvas position keyframing (Timeline v2): dragging the SELECTED layer writes its
  //    x/y keyframes at the parked playhead — but ONLY when the user armed BOTH position
  //    properties in the Inspector (◆ on Position X and Y). Everything else keeps the
  //    classic gestures exactly: the root drags to a zone patch, unarmed layers don't
  //    drag on their own, and legacy-region templates never reach this path (no data
  //    block to key into). ──
  const kfDraggable = useMemo(() => {
    if (!dataModel || !selectedPart || selectedPart.kind === 'root') return false;
    const armed = animatedProps(dataModel, selectedPart.selector);
    return armed.includes('x') && armed.includes('y');
  }, [dataModel, selectedPart]);

  /** Where the drag's keyframes land: the parked playhead, else the layer's settled
   *  state (the end of its activation step) — the same target the Inspector stamps. */
  const keyframePlace = (selector: string): { step: number; tRel: number } | null => {
    if (!dataModel) return null;
    const speed = dataModel.speed || 1;
    if (playhead) return { step: playhead.step, tRel: Math.round(playhead.t * speed * 1000) / 1000 };
    const step = activationStep(dataModel, selector);
    return { step, tRel: dataModel.steps[step].duration };
  };

  const gsapOf = () => (iframeRef.current?.contentWindow as SpxWindow | null)?.gsap ?? null;

  /** Put the dragged layer back where the drag found it (Escape / cancelled gesture). */
  const resetLayerDrag = (ld: LayerDrag) => {
    const el = doc()?.querySelector<HTMLElement>(ld.selector);
    if (el) gsapOf()?.set(el, { x: ld.baseX, y: ld.baseY });
  };

  /** Commit a layer drag: ONE undoable apply writing the x and y keyframes at the
   *  playhead (the same animEdit + spliceAnimData path the Inspector and the step
   *  timeline edit through), then re-park the preview there after the rebuild. */
  const commitLayerDrag = (ld: LayerDrag) => {
    if (!dataModel) return;
    const at = keyframePlace(ld.selector);
    if (!at) return;
    const x = Math.round((ld.baseX + ld.dx) * 100) / 100;
    const y = Math.round((ld.baseY + ld.dy) * 100) / 100;
    const next = setKeyframe(
      setKeyframe(dataModel, at.step, ld.selector, 'x', at.tRel, x),
      at.step, ld.selector, 'y', at.tRel, y,
    );
    const js = spliceAnimData(template.js, next);
    if (!js || js === template.js) return;
    applyTemplate({ ...template, js });
    const place = playhead;
    if (place) setTimeout(() => sendScrub(phaseIdOf(dataModel, place.step), place.t), 650);
  };

  const changePress = (toPress: number) => {
    if (!selectedPart || (!timelineModel && !dataModel)) return;
    const change = changePartPress(template, parts, timelineModel, selectedPart.selector, selectedPress, toPress);
    if (!change) return;
    applyTemplate({ ...template, ...change.patch }); // one undoable apply — same as the gutter
    requestReplay();
  };
  // The corner scale handle anchors to the hovered root — or to the selection while the
  // WHOLE GRAPHIC is selected, so the chip's one existing root action stays reachable.
  const handleRect = hoverRect ?? (selectedPart?.kind === 'root' ? selRect : null);

  const doc = () => iframeRef.current?.contentDocument ?? null;
  const rootEl = () => doc()?.querySelector<HTMLElement>(rootSelector) ?? null;

  /** Pointer event → canvas px (the iframe renders at native resolution). */
  const toCanvas = (e: React.PointerEvent | React.MouseEvent) => {
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: (e.clientX - box.left) / scale, y: (e.clientY - box.top) / scale };
  };

  const inRect = (p: { x: number; y: number }, r: DOMRect) =>
    p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;

  /** The VISIBLE editable text element under the point (hidden #fN source divs excluded). */
  const textFieldAt = (p: { x: number; y: number }) => {
    const d = doc();
    if (!d) return null;
    for (const f of template.fields) {
      const el = d.getElementById(f.field);
      // Editable = a rendered text element. Images have their own field UX (Data panel);
      // hidden source divs (credits/tickers/timers/quiz) are consumed by the template JS.
      if (!el || el.tagName === 'IMG' || el.offsetParent === null) continue;
      if (inRect(p, el.getBoundingClientRect())) return { field: f.field, ftype: f.ftype, el };
    }
    return null;
  };

  /** Registered parts under a canvas point, innermost first (closest-ancestor order). */
  const partChainAt = (p: { x: number; y: number }): { part: TemplatePart; el: HTMLElement }[] => {
    const d = doc();
    if (!d) return [];
    const resolved: { part: TemplatePart; el: HTMLElement }[] = [];
    for (const part of parts) {
      const el = d.querySelector<HTMLElement>(part.selector);
      if (el && el.getClientRects().length > 0) resolved.push({ part, el }); // rendered only
    }
    // Walk up from the element the point actually hits, collecting its ancestor parts.
    const chain: { part: TemplatePart; el: HTMLElement }[] = [];
    for (let el = d.elementFromPoint(p.x, p.y); el && el !== d.body && el !== d.documentElement; el = el.parentElement) {
      const hit = resolved.find((r) => r.el === el);
      if (hit) chain.push(hit);
    }
    if (chain.length > 0) return chain;
    // Fallback for templates that opt out of pointer hit-testing (pointer-events: none is
    // a legitimate overlay style in imported code): rect containment, innermost first.
    const depth = (el: Element) => {
      let n = 0;
      for (let q = el.parentElement; q; q = q.parentElement) n++;
      return n;
    };
    return resolved
      .filter((r) => inRect(p, r.el.getBoundingClientRect()))
      .sort((a, b) => {
        const byDepth = depth(b.el) - depth(a.el);
        if (byDepth !== 0) return byDepth;
        const ra = a.el.getBoundingClientRect();
        const rb = b.el.getBoundingClientRect();
        return ra.width * ra.height - rb.width * rb.height; // ties: the smaller wins
      });
  };

  /** A click selects the innermost part under the point; clicking the SELECTED part again
   *  climbs to its container (panel → whole graphic); empty canvas deselects. Shift-click
   *  (additive) toggles the innermost part's membership instead — no climbing. */
  const selectAt = (p: { x: number; y: number }, additive = false) => {
    const chain = partChainAt(p);
    if (chain.length === 0) {
      if (!additive) setSelected(null);
      return;
    }
    if (additive) {
      toggleSelectedPart(chain[0].part.selector);
      return;
    }
    const climb = chain[0].part.selector === selected && selectedParts.length === 1 && chain.length > 1;
    setSelected(chain[climb ? 1 : 0].part.selector);
  };

  // Focus the inline editor as soon as it opens.
  useEffect(() => {
    if (editing) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editing?.field]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape cancels an active drag (standard direct-manipulation behavior). A layer drag
  // also puts the layer back where the drag found it (the live GSAP preview moved it).
  useEffect(() => {
    if (!drag && !layerDrag && !lasso) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setDrag(null);
      setLasso(null);
      const ld = layerDragRef.current;
      if (ld) {
        resetLayerDrag(ld);
        setLayerDrag(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drag, layerDrag, lasso]); // eslint-disable-line react-hooks/exhaustive-deps

  // A code edit can remove selected elements — the selection follows the registry.
  useEffect(() => {
    if (selectedParts.length === 0) return;
    const alive = selectedParts.filter((sel) => parts.some((p) => p.selector === sel));
    if (alive.length !== selectedParts.length) setSelectedParts(alive);
  }, [parts, selectedParts, setSelectedParts]);

  // Track every selected element's on-screen rect (primary + extras). rAF on purpose:
  // animations, preview rebuilds, and the scale handle all move the elements, and the
  // loop re-resolves the selectors against whatever document the iframe currently holds.
  useEffect(() => {
    if (selectedParts.length === 0) {
      setSelRect(null);
      setExtraRects((prev) => (prev.length ? [] : prev));
      return;
    }
    const near = (a: CanvasRect | null, b: CanvasRect | null) =>
      !!a && !!b &&
      Math.abs(a.left - b.left) < 0.5 &&
      Math.abs(a.top - b.top) < 0.5 &&
      Math.abs(a.width - b.width) < 0.5 &&
      Math.abs(a.height - b.height) < 0.5;
    let raf = requestAnimationFrame(function track() {
      const d = doc();
      const rects = selectedParts.map((sel) => {
        const el = d?.querySelector<HTMLElement>(sel);
        const r = el && el.getClientRects().length > 0 ? el.getBoundingClientRect() : null;
        return r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null;
      });
      setSelRect((prev) => (near(prev, rects[0]) ? prev : rects[0]));
      const extras = rects.slice(1).filter((r): r is CanvasRect => r !== null);
      setExtraRects((prev) =>
        prev.length === extras.length && prev.every((p, i) => near(p, extras[i])) ? prev : extras,
      );
      raf = requestAnimationFrame(track);
    });
    return () => cancelAnimationFrame(raf);
  }, [selectedParts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape deselects — but never steals the key from a drag, the inline editor (both own
  // their Escape), or a focused form field / Monaco.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (dragRef.current || editingRef.current || scaleDragRef.current || layerDragRef.current || lassoRef.current) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('input, textarea, select, .monaco-editor')) return;
      setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, setSelected]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (editing) return; // the editor overlay handles its own events
    const p = toCanvas(e);
    // The keyframe drag has first claim: pointer down ON the selected, position-armed
    // layer starts it (works outside the root too — block parts live there).
    if (kfDraggable && selected) {
      const sel = doc()?.querySelector<HTMLElement>(selected);
      if (sel && sel.getClientRects().length > 0 && inRect(p, sel.getBoundingClientRect())) {
        e.currentTarget.setPointerCapture(e.pointerId);
        const g = gsapOf();
        setLayerDrag({
          selector: selected,
          startX: e.clientX,
          startY: e.clientY,
          baseX: Number(g?.getProperty?.(sel, 'x') ?? 0),
          baseY: Number(g?.getProperty?.(sel, 'y') ?? 0),
          dx: 0,
          dy: 0,
          active: false,
        });
        return;
      }
    }
    const el = rootEl();
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!inRect(p, r)) {
      // EMPTY canvas: a drag lassos (shift keeps the existing selection); a plain
      // click still selects/deselects on release (below the threshold → selectAt).
      e.currentTarget.setPointerCapture(e.pointerId);
      setLasso({ x0: p.x, y0: p.y, x1: p.x, y1: p.y, active: false, additive: e.shiftKey });
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({
      startX: e.clientX,
      startY: e.clientY,
      dx: 0,
      dy: 0,
      active: false,
      root: { left: r.left, top: r.top, width: r.width, height: r.height },
    });
  };

  /** Lasso release: select every rendered non-root part whose rect intersects the
   *  marquee (the root spans the whole graphic — including it would make any marquee a
   *  whole-graphic selection). Shift adds the hits to the existing selection. */
  const commitLasso = (ls: { x0: number; y0: number; x1: number; y1: number; additive: boolean }) => {
    const d = doc();
    if (!d) return;
    const left = Math.min(ls.x0, ls.x1);
    const top = Math.min(ls.y0, ls.y1);
    const right = Math.max(ls.x0, ls.x1);
    const bottom = Math.max(ls.y0, ls.y1);
    const hits: string[] = [];
    for (const part of parts) {
      if (part.kind === 'root') continue;
      const pel = d.querySelector<HTMLElement>(part.selector);
      if (!pel || pel.getClientRects().length === 0) continue;
      const pr = pel.getBoundingClientRect();
      if (pr.left < right && pr.right > left && pr.top < bottom && pr.bottom > top) {
        hits.push(part.selector);
      }
    }
    setSelectedParts(ls.additive ? [...selectedParts, ...hits.filter((h) => !selectedParts.includes(h))] : hits);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const ls = lassoRef.current;
    if (ls) {
      const p = toCanvas(e);
      const active =
        ls.active || Math.hypot((p.x - ls.x0) * scale, (p.y - ls.y0) * scale) > DRAG_THRESHOLD;
      setLasso({ ...ls, x1: p.x, y1: p.y, active });
      return;
    }
    const ld = layerDragRef.current;
    if (ld) {
      // The selected layer follows the pointer live (a GSAP x/y set on the preview —
      // the same channels the keyframes will drive; the commit lands on release).
      const dx = (e.clientX - ld.startX) / scale;
      const dy = (e.clientY - ld.startY) / scale;
      const active = ld.active || Math.hypot(e.clientX - ld.startX, e.clientY - ld.startY) > DRAG_THRESHOLD;
      setLayerDrag({ ...ld, dx, dy, active });
      if (active) {
        const el = doc()?.querySelector<HTMLElement>(ld.selector);
        if (el) gsapOf()?.set(el, { x: ld.baseX + dx, y: ld.baseY + dy });
      }
      return;
    }
    const d = dragRef.current;
    if (d) {
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      setDrag({ ...d, dx, dy, active: d.active || Math.hypot(dx, dy) > DRAG_THRESHOLD });
      return;
    }
    if (editing || scaleDragRef.current) return;
    // Hover affordances: hand on the graphic, text cursor on an editable line, and the
    // corner scale handle anchored to the root while the pointer is over it. A selected,
    // position-armed layer reads as grabbable everywhere (its drag keys x/y).
    const p = toCanvas(e);
    const overKfLayer =
      kfDraggable && selected
        ? (() => {
            const el = doc()?.querySelector<HTMLElement>(selected);
            return !!el && el.getClientRects().length > 0 && inRect(p, el.getBoundingClientRect());
          })()
        : false;
    const r = rootEl()?.getBoundingClientRect();
    if (overKfLayer) setCursor('grab');
    if (r && inRect(p, r)) {
      if (!overKfLayer) setCursor(textFieldAt(p) ? 'text' : 'grab');
      setHoverRect({ left: r.left, top: r.top, width: r.width, height: r.height });
    } else {
      if (!overKfLayer) setCursor('default');
      // Keep the handle reachable: it sits just OUTSIDE the root's corner, so don't clear
      // the rect while the pointer is within its small halo.
      if (hoverRect) {
        const halo = 18 / scale; // handle size in canvas px
        const nearHandle =
          p.x >= hoverRect.left + hoverRect.width - halo && p.x <= hoverRect.left + hoverRect.width + halo &&
          p.y >= hoverRect.top + hoverRect.height - halo && p.y <= hoverRect.top + hoverRect.height + halo;
        if (!nearHandle) setHoverRect(null);
      }
    }
    // Hover naming: the innermost registered part under the pointer — a preview of what a
    // click would select. Runs outside the root rect too (block parts can live there).
    const top = partChainAt(p)[0] ?? null;
    setHoverPart((prev) => {
      if (!top) return prev === null ? prev : null;
      const tr = top.el.getBoundingClientRect();
      if (
        prev &&
        prev.selector === top.part.selector &&
        Math.abs(prev.rect.left - tr.left) < 0.5 &&
        Math.abs(prev.rect.top - tr.top) < 0.5 &&
        Math.abs(prev.rect.width - tr.width) < 0.5 &&
        Math.abs(prev.rect.height - tr.height) < 0.5
      ) {
        return prev;
      }
      return {
        selector: top.part.selector,
        label: top.part.label,
        rect: { left: tr.left, top: tr.top, width: tr.width, height: tr.height },
      };
    });
  };

  // ── W2: the corner scale handle → one --scale patch (the Style panel's size knob) ──
  const currentScale = () => {
    const v = parseFloat(getCssVariable(template.css, 'scale') ?? '');
    return Number.isFinite(v) ? v : 1;
  };

  const startScaleDrag = (e: React.PointerEvent) => {
    if (!handleRect) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const orig = currentScale();
    setScaleDrag({
      startX: e.clientX,
      startY: e.clientY,
      origScale: orig,
      rootWidth: handleRect.width * scale,
      rootHeight: handleRect.height * scale,
      value: orig,
    });
  };

  const moveScaleDrag = (e: React.PointerEvent) => {
    const d = scaleDragRef.current;
    if (!d) return;
    e.stopPropagation();
    // Corner-drag growth: horizontal AND vertical movement count, proportionally to the
    // root's size at drag start — dragging along the box's diagonal tracks the pointer.
    const gesture = e.clientX - d.startX + (e.clientY - d.startY);
    const factor = 1 + gesture / Math.max(80, d.rootWidth + d.rootHeight);
    const value = Math.round(Math.min(SCALE_MAX, Math.max(SCALE_MIN, d.origScale * factor)) * 100) / 100;
    setScaleDrag({ ...d, value });
    // Live preview: an inline :root override on the preview document (the rebuild clears it).
    doc()?.documentElement.style.setProperty('--scale', String(value));
    // The handle follows the graphic's REAL corner while it grows/shrinks.
    const r = rootEl()?.getBoundingClientRect();
    if (r) setHoverRect({ left: r.left, top: r.top, width: r.width, height: r.height });
  };

  const endScaleDrag = (e: React.PointerEvent) => {
    const d = scaleDragRef.current;
    setScaleDrag(null);
    if (!d) return;
    e.stopPropagation();
    doc()?.documentElement.style.removeProperty('--scale');
    if (d.value === d.origScale) return;
    // The SAME write the Style panel's size control makes (the :root --scale variable),
    // committed as one undoable apply; the editor highlights it and jumps to it.
    applyTemplate({ ...template, css: setCssVariable(template.css, 'scale', String(d.value)) });
    setActiveTab('css');
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const ls = lassoRef.current;
    if (ls) {
      setLasso(null);
      if (!ls.active) {
        // A click on empty canvas (below the threshold) deselects — or shift-toggles
        // an outside-the-root part under the point.
        if (!editingRef.current) selectAt(toCanvas(e), e.shiftKey);
        return;
      }
      commitLasso(ls);
      return;
    }
    const ld = layerDragRef.current;
    if (ld) {
      setLayerDrag(null);
      if (!ld.active) {
        // A click stays a click — the selection still climbs through containers.
        if (!editingRef.current) selectAt(toCanvas(e), e.shiftKey);
        return;
      }
      commitLayerDrag(ld);
      return;
    }
    const d = dragRef.current;
    setDrag(null);
    if (!d || !d.active) {
      // A click (below the drag threshold) is not a move — it updates the SELECTION.
      if (!editingRef.current) selectAt(toCanvas(e), e.shiftKey);
      return;
    }

    // The dragged root rect in canvas px.
    const left = d.root.left + d.dx / scale;
    const top = d.root.top + d.dy / scale;
    const centerX = left + d.root.width / 2;
    const centerY = top + d.root.height / 2;

    // Nearest anchor: which third of the frame the root's center landed in.
    const h = centerX < res.width / 3 ? 'left' : centerX > (res.width * 2) / 3 ? 'right' : 'center';
    const v = centerY < res.height / 3 ? 'top' : centerY > (res.height * 2) / 3 ? 'bottom' : 'mid';
    const zone = `${v}-${h}` as Zone9;

    // Residual nudge: solve zoneDecls' equations backwards for the dragged position.
    const hInset = Math.round(res.width * 0.0625);
    const topInset = Math.round(res.height * 0.08);
    const bottomInset = Math.round(res.height * 0.11);
    const nudge = {
      x: Math.round(
        h === 'left' ? left - hInset
        : h === 'right' ? hInset - (res.width - (left + d.root.width))
        : centerX - res.width / 2,
      ),
      y: Math.round(
        v === 'top' ? top - topInset
        : v === 'bottom' ? bottomInset - (res.height - (top + d.root.height))
        : centerY - res.height / 2,
      ),
    };

    // The SAME patch the Style panel writes: every zone declaration onto the root rule
    // (including the explicit auto/none resets, so the previous anchor is fully overridden).
    let css = template.css;
    for (const decl of zoneDecls(zone, nudge, res)) {
      css = setCssDeclaration(css, rootSelector, decl.prop, decl.value);
    }
    // One undoable apply — the editor highlights the patched root rule and jumps to it.
    applyTemplate({ ...template, css });
    setActiveTab('css');
  };

  const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editing) return;
    const p = toCanvas(e);
    const hit = textFieldAt(p);
    if (!hit) return;
    const r = hit.el.getBoundingClientRect();
    setEditing({
      field: hit.field,
      multiline: hit.ftype === 'textarea',
      value: sampleData[hit.field] ?? hit.el.textContent ?? '',
      rect: { left: r.left, top: r.top, width: r.width, height: r.height },
    });
    // Selection follows the edited field when it's a registered part (the second click
    // that got us here may have climbed to the panel meanwhile).
    const part = parts.find((pt) => pt.selector === `#${hit.field}`);
    if (part) setSelected(part.selector);
  };

  /** Commit the inline edit: live sample value + the field's definition default (undoable). */
  const commitEdit = () => {
    const ed = editingRef.current;
    editingRef.current = null;
    setEditing(null);
    if (!ed) return;
    if ((sampleData[ed.field] ?? '') === ed.value) return; // nothing changed
    applyTemplate(setFieldDefault(template, ed.field, ed.value)); // definition + static text
    setSampleValue(ed.field, ed.value); // the live operator value follows the edit
    setActiveTab('html'); // the edit lives in the markup — show it highlighted
  };

  const cancelEdit = () => {
    editingRef.current = null;
    setEditing(null);
  };

  // Ghost rect (screen px) while an ACTIVE drag is under way.
  const ghost = drag?.active
    ? {
        left: drag.root.left * scale + drag.dx,
        top: drag.root.top * scale + drag.dy,
        width: drag.root.width * scale,
        height: drag.root.height * scale,
      }
    : null;
  // Which zone cell the ghost's center is over (for the highlight).
  const cell = ghost
    ? {
        col: Math.min(2, Math.max(0, Math.floor(((ghost.left + ghost.width / 2) / width) * 3))),
        row: Math.min(2, Math.max(0, Math.floor(((ghost.top + ghost.height / 2) / height) * 3))),
      }
    : null;

  return (
    <div
      className={`canvas-layer${ghost ? ' dragging' : ''} cursor-${cursor}`}
      style={{ width, height }}
      data-testid="canvas-layer"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        setDrag(null);
        setLasso(null);
        const ld = layerDragRef.current;
        if (ld) {
          resetLayerDrag(ld);
          setLayerDrag(null);
        }
      }}
      onPointerLeave={() => setHoverPart(null)}
      onDoubleClick={onDoubleClick}
    >
      {/* Selection outline + naming chip, and the hover preview — editor UI state only
          (the chip's press control is the one action that writes code, via the same
          patch the timeline gutter writes). */}
      {!ghost && !editing && (
        <CanvasSelection
          scale={scale}
          width={width}
          selection={
            selectedPart && selRect
              ? {
                  rect: selRect,
                  label: selectedPart.label,
                  // The chip surfaces only actions that ALREADY exist where they apply
                  // (the press control replaces the passive hint when both would show).
                  hint: pressEligible
                    ? undefined
                    : kfDraggable
                      ? 'Drag to key its position'
                      : selectedPart.kind === 'line'
                        ? 'Double-click to edit'
                        : selectedPart.kind === 'root'
                          ? 'Corner handle resizes'
                          : undefined,
                  action: pressEligible ? (
                    <select
                      className="canvas-appears"
                      value={selectedPress}
                      onChange={(e) => changePress(Number(e.target.value))}
                      title="When this part appears — with ▶ Play, or revealed by a press of » Next (the timeline gutter's control, from the canvas)"
                      data-testid="canvas-appears"
                    >
                      <option value={-1}>appears with ▶ Play</option>
                      {presses!.map((_, k) => (
                        <option key={k} value={k}>{`appears on press ${k + 1}`}</option>
                      ))}
                      {/* The last press's only part moving to "a new press" would re-create
                          the same press — the gutter hides the option; so does the chip. */}
                      {!(
                        selectedPress === presses!.length - 1 &&
                        selectedPress >= 0 &&
                        presses![selectedPress].length === 1
                      ) && <option value={presses!.length}>appears on a new press</option>}
                    </select>
                  ) : undefined,
                }
              : null
          }
          hover={
            !scaleDrag && !layerDrag?.active && !lasso?.active && hoverPart && hoverPart.selector !== selected
              ? { rect: hoverPart.rect, label: hoverPart.label }
              : null
          }
        />
      )}

      {/* Secondary selection outlines (multi-selection) — plain outlines, no chips;
          the primary (first selected) carries the chip above. */}
      {!ghost &&
        !editing &&
        extraRects.map((r, i) => (
          <div
            key={i}
            className="canvas-selection-outline secondary"
            data-testid="canvas-selection-extra"
            style={{ left: r.left * scale, top: r.top * scale, width: r.width * scale, height: r.height * scale }}
          />
        ))}

      {/* The lasso marquee — a drag on empty canvas selecting what it touches. */}
      {lasso?.active && (
        <div
          className="canvas-lasso"
          data-testid="canvas-lasso"
          style={{
            left: Math.min(lasso.x0, lasso.x1) * scale,
            top: Math.min(lasso.y0, lasso.y1) * scale,
            width: Math.abs(lasso.x1 - lasso.x0) * scale,
            height: Math.abs(lasso.y1 - lasso.y0) * scale,
          }}
        />
      )}

      {/* W2 — the corner scale handle: shows while hovering the graphic (and stays while
          the whole graphic is selected); drag = --scale. */}
      {handleRect && !ghost && !editing && (
        <div
          className={`scale-handle${scaleDrag ? ' dragging' : ''}`}
          data-testid="scale-handle"
          style={{
            left: (handleRect.left + handleRect.width) * scale - 5,
            top: (handleRect.top + handleRect.height) * scale - 5,
          }}
          title="Drag to resize (writes the --scale variable, like the Style panel's size)"
          onPointerDown={startScaleDrag}
          onPointerMove={moveScaleDrag}
          onPointerUp={endScaleDrag}
          onPointerCancel={() => { setScaleDrag(null); doc()?.documentElement.style.removeProperty('--scale'); }}
        />
      )}
      {scaleDrag && (
        <div className="move-hint">×{scaleDrag.value.toFixed(2)} — release to apply</div>
      )}

      {/* The position-keyframe drag's hint: live x/y, committed at the playhead. */}
      {layerDrag?.active && (
        <div className="move-hint">
          x {Math.round(layerDrag.baseX + layerDrag.dx)} · y {Math.round(layerDrag.baseY + layerDrag.dy)} — release
          to key position at the playhead · Esc cancels
        </div>
      )}

      {/* The 9-zone grid + ghost — only while a real drag is under way. */}
      {ghost && (
        <>
          <div className="move-grid" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className={`move-cell${cell && cell.row * 3 + cell.col === i ? ' target' : ''}`} />
            ))}
          </div>
          <div className="move-ghost" style={ghost} />
          <div className="move-hint">Release to place · Esc cancels</div>
        </>
      )}

      {/* The inline text editor — positioned over the text element it edits. */}
      {editing && (
        <div className="inline-edit" style={{
          left: editing.rect.left * scale - 6,
          top: editing.rect.top * scale - 6,
          minWidth: Math.max(160, editing.rect.width * scale + 12),
        }}>
          {editing.multiline ? (
            <textarea
              ref={(el) => { editInputRef.current = el; }}
              data-testid="inline-editor"
              rows={4}
              value={editing.value}
              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Escape') cancelEdit();
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commitEdit();
              }}
            />
          ) : (
            <input
              ref={(el) => { editInputRef.current = el; }}
              data-testid="inline-editor"
              value={editing.value}
              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Escape') cancelEdit();
                if (e.key === 'Enter') commitEdit();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
