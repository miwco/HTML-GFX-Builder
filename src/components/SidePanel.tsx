import { useTemplateStore, type SidePanel as PanelId } from '../store/templateStore';
import Inspector from './Inspector';
import SampleDataPanel from './SampleDataPanel';
import ControlPanel from './ControlPanel';
import StylePanel from './StylePanel';
import AssetsPanel from './AssetsPanel';
import AIPromptPanel from './AIPromptPanel';
import ExportPanel from './ExportPanel';

// The MOBILE panel surface (desktop uses the dockable WorkspaceDock instead). Inspector
// leads, as it does in the desktop right dock: it is the only place a SELECTED layer is
// edited — its properties, its design (the placed-field Style tab), and its motion — so
// without it here a phone could add fields but never style or animate them. Then the tool
// panels: Data = sample values + add-field; Control = the operator view. Validation lives
// inside Export; explanations live on hover in the editor; step motion lives on the
// timeline strip under the preview, not in a tab.
// Labels match WorkspaceDock's PANEL_LABEL (Content = design values, Rehearse = the in-editor
// operator view). Keep the two in step.
const PANELS: { id: PanelId; label: string }[] = [
  { id: 'inspector', label: 'Inspector' },
  { id: 'data', label: 'Content' },
  { id: 'control', label: 'Rehearse' },
  { id: 'style', label: 'Style' },
  { id: 'assets', label: 'Assets' },
  { id: 'ai', label: 'AI' },
  { id: 'export', label: 'Export' },
];

/** The tool panels under the preview, one at a time. */
export default function SidePanel() {
  const activePanel = useTemplateStore((s) => s.activePanel);
  const setActivePanel = useTemplateStore((s) => s.setActivePanel);

  return (
    <>
      <div className="pane-header">
        <div className="panel-tabs">
          {PANELS.map((p) => (
            <button
              key={p.id}
              className={`tab ${activePanel === p.id ? 'active' : ''}`}
              onClick={() => setActivePanel(p.id)}
              data-testid={`panel-tab-${p.id}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {/* The Inspector brings its own padding and scrolling (the desktop dock renders it raw
          for the same reason); the tool panels want the shared padded body. */}
      {activePanel === 'inspector' ? (
        <Inspector />
      ) : (
        <div className="panel-body">
          {activePanel === 'data' && <SampleDataPanel />}
          {activePanel === 'control' && <ControlPanel />}
          {activePanel === 'style' && <StylePanel />}
          {activePanel === 'assets' && <AssetsPanel />}
          {activePanel === 'ai' && <AIPromptPanel />}
          {activePanel === 'export' && <ExportPanel />}
        </div>
      )}
    </>
  );
}
