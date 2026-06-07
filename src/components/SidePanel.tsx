import { useTemplateStore, type SidePanel as PanelId } from '../store/templateStore';
import SampleDataPanel from './SampleDataPanel';
import BuildingBlockMenu from './BuildingBlockMenu';
import BrandPanel from './BrandPanel';
import LearnPanel from './LearnPanel';
import AIPromptPanel from './AIPromptPanel';
import TemplateValidator from './TemplateValidator';
import ExportPanel from './ExportPanel';

const PANELS: { id: PanelId; label: string }[] = [
  { id: 'data', label: 'Data' },
  { id: 'blocks', label: 'Blocks' },
  { id: 'brand', label: 'Brand' },
  { id: 'learn', label: 'Learn' },
  { id: 'ai', label: 'AI' },
  { id: 'validate', label: 'Validate' },
  { id: 'export', label: 'Export' },
];

/** Right-hand pane that hosts the supporting tools, one at a time. */
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
        {activePanel === 'blocks' && <BuildingBlockMenu />}
        {activePanel === 'brand' && <BrandPanel />}
        {activePanel === 'learn' && <LearnPanel />}
        {activePanel === 'ai' && <AIPromptPanel />}
        {activePanel === 'validate' && <TemplateValidator />}
        {activePanel === 'export' && <ExportPanel />}
      </div>
    </>
  );
}
