// "Add template graphic" — browse the existing catalog and INSERT a graphic into the
// current project, instead of starting a new one. The heavy lifting is the pure merge in
// blocks/templateInsert.ts (namespaced classes, renumbered fields, :root re-scoped onto
// the inserted root, In/Out choreography merged, donor machine dropped); this dialog is a
// thin picker over it. One applyTemplate = the whole insertion is one undo step.

import { useMemo, useState } from 'react';
import { create } from 'zustand';
import { useTemplateStore } from '../store/templateStore';
import { CATEGORIES, type TemplateVariant } from '../model/wizard';
import { variantsFor } from '../templates/catalog';
import { parseAnimData } from '../blocks/animData';
import { insertBlocker, insertTemplateGraphic, type InsertPlacement } from '../blocks/templateInsert';
import MiniPreview from './wizard/MiniPreview';
import { useModalGate } from './spaceKey';

/** The dialog's open flag, shared so every entry point (the Assets panel's button, the
 *  canvas context menu) drives the ONE instance mounted in AppShell. */
export const useInsertTemplateUi = create<{ open: boolean; openDialog: () => void; close: () => void }>((set) => ({
  open: false,
  openDialog: () => set({ open: true }),
  close: () => set({ open: false }),
}));

export default function InsertTemplateDialog() {
  const open = useInsertTemplateUi((s) => s.open);
  const onClose = useInsertTemplateUi((s) => s.close);
  useModalGate(open);
  const template = useTemplateStore((s) => s.template);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const setSelectedPart = useTemplateStore((s) => s.setSelectedPart);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);
  const requestReplay = useTemplateStore((s) => s.requestReplay);

  const cats = useMemo(() => CATEGORIES.filter((c) => c.available && c.group !== 'imported'), []);
  const [catId, setCatId] = useState(cats[0]?.id ?? 'lower-third');
  const [placement, setPlacement] = useState<InsertPlacement>('start');
  const [error, setError] = useState<string | null>(null);

  const variants = useMemo(() => (open ? variantsFor(catId) : []), [open, catId]);
  // Which cards CAN insert — code-derived from the donor each would produce (a template
  // whose motion needs its own runtime is greyed with the reason, never hidden).
  const blockers = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const v of variants) {
      try {
        const donor = v.create();
        map.set(v.id, insertBlocker(donor, parseAnimData(donor.js)));
      } catch {
        map.set(v.id, 'this template failed to assemble');
      }
    }
    return map;
  }, [variants]);

  if (!open) return null;

  const pick = (v: TemplateVariant) => {
    const res = insertTemplateGraphic(template, v, { placement });
    if ('error' in res) {
      setError(`${v.name}: ${res.error}.`);
      return;
    }
    applyTemplate(res.template);
    setSelectedPart(res.selector);
    setActiveTab('html');
    requestReplay();
    onClose();
  };

  return (
    <div className="gallery-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wz-modal insert-tpl-dialog" role="dialog" aria-modal="true" aria-label="Add template graphic" data-testid="insert-tpl-dialog">
        <div className="wz-header">
          <h2>Add a template graphic to this project</h2>
          <button className="gallery-close" onClick={onClose} title="Close" data-testid="insert-tpl-close">✕</button>
        </div>
        <div className="insert-tpl-body">
          <div className="insert-tpl-toolbar">
            <div className="insert-tpl-cats" role="tablist" aria-label="Category">
              {cats.map((c) => (
                <button
                  key={c.id}
                  role="tab"
                  aria-selected={c.id === catId}
                  className={`tab ${c.id === catId ? 'active' : ''}`}
                  onClick={() => { setCatId(c.id); setError(null); }}
                  title={c.description}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <label className="insert-tpl-placement" title="When the inserted graphic shows — you can change this afterwards from its canvas chip or the Inspector's Appears row">
              <span>It appears</span>
              <select
                value={placement}
                onChange={(e) => setPlacement(e.target.value as InsertPlacement)}
                data-testid="insert-tpl-placement"
              >
                <option value="start">from the start (with ▶ Play)</option>
                <option value="new-step">as a new next step »</option>
              </select>
            </label>
          </div>
          {error && <p className="status-bad insert-tpl-error" data-testid="insert-tpl-error">✗ {error}</p>}
          <div className="insert-tpl-grid">
            {variants.map((v) => {
              const blocked = blockers.get(v.id) ?? null;
              return (
                <button
                  key={v.id}
                  className={`insert-tpl-card${blocked ? ' blocked' : ''}`}
                  onClick={() => (blocked ? setError(`${v.name}: ${blocked}.`) : pick(v))}
                  title={blocked ? `Can't insert — ${blocked}` : `Insert "${v.name}" into the current graphic`}
                  data-testid={`insert-tpl-card-${v.id}`}
                >
                  <MiniPreview variant={v} />
                  <span className="insert-tpl-card-name">
                    {v.name}
                    {blocked && <span className="insert-tpl-card-blocked" title={blocked}>own runtime — opens as its own project</span>}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="hint">
            The graphic arrives with its fields (renumbered, marked with its name in the Data
            panel), its look scoped to itself, and its In/Out motion merged into this
            project's timeline. The whole insertion is one undo step.
          </p>
        </div>
      </div>
    </div>
  );
}
