import { useTemplateStore, type SidePanel as PanelId } from '../store/templateStore';
import SampleDataPanel from './SampleDataPanel';
import ControlPanel from './ControlPanel';
import StylePanel from './StylePanel';
import AssetsPanel from './AssetsPanel';
import AIPromptPanel from './AIPromptPanel';
import ExportPanel from './ExportPanel';

// Focused tools. Data = developer sample values + add-field; Control = the operator view.
// Validation lives inside Export; explanations live on hover in the editor. Motion lives
// on the timeline strip under the preview (its moment cards), not in a tab.
const PANELS: { id: PanelId; label: string }[] = [
  { id: 'data', label: 'Data' },
  { id: 'control', label: 'Control' },
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
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="panel-body">
        {activePanel === 'data' && <SampleDataPanel />}
        {activePanel === 'control' && <ControlPanel />}
        {activePanel === 'style' && <StylePanel />}
        {activePanel === 'assets' && <AssetsPanel />}
        {activePanel === 'ai' && <AIPromptPanel />}
        {activePanel === 'export' && <ExportPanel />}
      </div>
    </>
  );
}
