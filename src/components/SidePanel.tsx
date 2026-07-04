import { useTemplateStore, type SidePanel as PanelId } from '../store/templateStore';
import SampleDataPanel from './SampleDataPanel';
import StylePanel from './StylePanel';
import AnimationPanel from './AnimationPanel';
import AIPromptPanel from './AIPromptPanel';
import ExportPanel from './ExportPanel';

// Five focused tools. Validation lives inside Export; explanations live on hover in the
// editor (and in the AI panel's Explain); element/animation inserts go through AI + Motion.
const PANELS: { id: PanelId; label: string }[] = [
  { id: 'data', label: 'Data' },
  { id: 'style', label: 'Style' },
  { id: 'animation', label: 'Motion' },
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
        {activePanel === 'style' && <StylePanel />}
        {activePanel === 'animation' && <AnimationPanel />}
        {activePanel === 'ai' && <AIPromptPanel />}
        {activePanel === 'export' && <ExportPanel />}
      </div>
    </>
  );
}
