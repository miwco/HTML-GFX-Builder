// The modular control-panel engine. ONE generator turns any template's SPX DataFields into
// field descriptors (model/fieldModel.ts) — there is no per-template code. A number field
// becomes a stepper, a textarea a line list, an image field a picker, and so on. The same
// descriptors drive every surface that edits a field: the in-app Data and Control panels
// (through the shared components/fields control), and the standalone controlpanel.html export.

import type { SpxField } from '../model/types';
import type { FieldDescriptor, FieldKind } from '../model/fieldModel';
import { parseAnimData } from '../blocks/animData';
import { machineControls, type ControlButton } from '../blocks/animMachine';
import { slug } from '../export/slug';

/** Map an SPX ftype to a control kind. The non-data ftypes carry no control at all. */
function kindForField(f: SpxField): FieldKind | null {
  switch (f.ftype) {
    case 'textfield':
      return 'text';
    case 'textarea':
      return 'lines'; // our data-driven fields are line lists (ticker items, credits, schedule…)
    case 'number':
      return 'number';
    case 'filelist':
      return 'image';
    case 'dropdown':
      return 'select';
    case 'checkbox':
      return 'toggle';
    case 'color':
      return 'color';
    // An input-only value (a countdown's duration). SPX hides it from the operator, but the
    // Data panel still edits it — see includeHidden below.
    case 'hidden':
      return 'text';
    default:
      return null; // instruction, caption, button, divider, spacer
  }
}

/**
 * The descriptors for a template's editable fields.
 *
 * `includeHidden` is what separates the two SPX surfaces: the operator panels (the Control tab
 * and the exported controlpanel.html) show what SPX shows and so skip `hidden` fields, while
 * the Data panel edits them too — a hidden field carries a real input value (a countdown's
 * duration) that has to be testable in the editor.
 */
export function fieldDescriptors(
  fields: SpxField[],
  { includeHidden = false }: { includeHidden?: boolean } = {},
): FieldDescriptor[] {
  const out: FieldDescriptor[] = [];
  for (const f of fields) {
    if (f.ftype === 'hidden' && !includeHidden) continue;
    const kind = kindForField(f);
    if (!kind) continue;
    out.push({
      key: f.field,
      label: f.title || f.field,
      kind,
      defaultValue: f.value, // the definition default — the per-field Reset target
      options: f.items?.map((it) => ({ label: it.text, value: it.value })),
    });
  }
  return out;
}

// ── Event buttons (Phase 5) ─────────────────────────────────────────────────
// The state machine's side of the panel: every authored operator event renders as a button
// (blocks/animMachine.ts machineControls — labels/sections/payloads come from the machine's
// own `controls` metadata, so the list travels inside the template). Only an EXPLICIT
// machine offers buttons: the derived linear machine's one event is `next`, which the
// lifecycle row already carries.

export type { ControlButton } from '../blocks/animMachine';

/** The event buttons a template's control surfaces render (empty without an explicit machine). */
export function eventButtons(js: string): ControlButton[] {
  const machine = parseAnimData(js)?.machine;
  return machine ? machineControls(machine) : [];
}

// ── The control ⇄ graphic message protocol ──────────────────────────────────
// A control panel and the graphic it drives talk over a BroadcastChannel (same browser,
// same origin — local, Era 4). Era 5.3 added a Supabase Realtime transport with the SAME
// message shape, so nothing above the transport changes. Phase 5 adds the machine cues:
// `event` rides the serial queue (noacgDispatch — the payload lands only if the machine
// accepts the event), `snap` enters states instantly (noacgSnap — recovery, emergency
// jumps), and `hello` asks the graphic to answer with its current machine state.

export type ControlMessage =
  | { t: 'update'; data: Record<string, string> }
  | { t: 'play' }
  | { t: 'stop' }
  | { t: 'next' }
  | { t: 'event'; event: string; payload?: Record<string, string> }
  | { t: 'snap'; snap: Record<string, string> | null }
  | { t: 'hello' };

/** What the graphic answers on the same channel: its machine state after every handled
 *  message (and on `hello`), so a panel can show the current state and grey illegal buttons. */
export type ControlReply = { t: 'state'; state: { groups: Record<string, string> } };

/** The channel name a template's control panel and graphic share (derived from its name). */
export function controlChannelName(templateName: string): string {
  return `spx-control-${slug(templateName)}`;
}
