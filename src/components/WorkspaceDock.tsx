import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { DockId, DockState, PanelId } from '../model/layout';

// The three field-value surfaces read as one word before this: the Data tab, the Control tab,
// and the routed Control panel page all edited "the fields", and nothing said which set AIRS.
// Named by ROLE now: Content = the design-time values (a preview, never aired), Rehearse = the
// in-editor operator view that drives THIS preview, and the routed page keeps "Control panel" —
// it is the one an operator actually runs on air.
const PANEL_LABEL: Record<PanelId, string> = {
  code: 'Code',
  inspector: 'Inspector',
  data: 'Content',
  control: 'Rehearse',
  style: 'Style',
  assets: 'Assets',
  ai: 'AI',
  export: 'Export',
};
const DOCK_LABEL: Record<DockId, string> = { left: 'left', right: 'right', bottom: 'bottom' };

export interface WorkspaceDockProps {
  dockId: DockId;
  state: DockState;
  /** Panels not currently in any dock — offered by the “+” menu to add here. */
  hidden: PanelId[];
  render: (id: PanelId) => ReactNode;
  onActivate: (id: PanelId) => void;
  onClose: (id: PanelId) => void;
  onMove: (id: PanelId, to: DockId) => void;
  onAdd: (id: PanelId) => void;
}

/** One dock: a tab strip over the active panel's body. Each tab can be moved to another dock
 *  or closed; the “+” adds a hidden panel here. A thin, self-contained control surface — the
 *  layout state and its persistence live in AppShell / model/layout.ts. */
export default function WorkspaceDock({ dockId, state, hidden, render, onActivate, onClose, onMove, onAdd }: WorkspaceDockProps) {
  const [menuFor, setMenuFor] = useState<PanelId | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  // Any pointer outside the header closes the popovers.
  useEffect(() => {
    if (!menuFor && !addOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) {
        setMenuFor(null);
        setAddOpen(false);
      }
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, [menuFor, addOpen]);

  const others: DockId[] = (['left', 'right', 'bottom'] as DockId[]).filter((d) => d !== dockId);

  return (
    <div className={`dock dock-${dockId}`} data-testid={`dock-${dockId}`}>
      <div className="dock-tabs" ref={headerRef}>
        {state.panels.map((id) => (
          <div key={id} className={`dock-tab${state.active === id ? ' active' : ''}`}>
            <button className="dock-tab-label" data-testid={`dock-tab-${id}`} onClick={() => onActivate(id)}>
              {PANEL_LABEL[id]}
            </button>
            <button
              className="dock-tab-caret"
              title="Move or close this panel"
              data-testid={`dock-tab-menu-${id}`}
              onClick={() => { setMenuFor((m) => (m === id ? null : id)); setAddOpen(false); }}
            >
              ▾
            </button>
            {menuFor === id && (
              <div className="dock-menu" role="menu">
                {others.map((d) => (
                  <button key={d} role="menuitem" onClick={() => { onMove(id, d); setMenuFor(null); }}>
                    Move to {DOCK_LABEL[d]}
                  </button>
                ))}
                <button role="menuitem" className="dock-menu-close" onClick={() => { onClose(id); setMenuFor(null); }}>
                  Close panel
                </button>
              </div>
            )}
          </div>
        ))}
        {hidden.length > 0 && (
          <div className="dock-add-wrap">
            <button
              className="dock-add"
              title="Add a panel to this dock"
              data-testid={`dock-add-${dockId}`}
              onClick={() => { setAddOpen((o) => !o); setMenuFor(null); }}
            >
              +
            </button>
            {addOpen && (
              <div className="dock-menu" role="menu">
                {hidden.map((id) => (
                  <button key={id} role="menuitem" onClick={() => { onAdd(id); setAddOpen(false); }}>
                    {PANEL_LABEL[id]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="dock-body" data-testid={`dock-body-${dockId}`}>
        {state.active ? render(state.active) : null}
      </div>
    </div>
  );
}
