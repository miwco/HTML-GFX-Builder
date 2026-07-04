import { CATEGORIES, type TemplateCategory } from '../../../model/wizard';

interface Props {
  selected: TemplateCategory | null;
  onSelect: (category: TemplateCategory) => void;
}

/** Step 1 — what kind of graphic are you making? */
export default function CategoryStep({ selected, onSelect }: Props) {
  return (
    <div className="wz-cat-grid">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          className={`wz-cat ${selected === cat.id ? 'selected' : ''}`}
          disabled={!cat.available}
          onClick={() => onSelect(cat.id)}
          title={cat.description}
        >
          <div className="wz-cat-head">
            <strong>{cat.name}</strong>
            {cat.available ? (
              <span className="wz-count">{cat.plannedCount}</span>
            ) : (
              <span className="wz-soon">coming soon</span>
            )}
          </div>
          <span className="hint">{cat.description}</span>
        </button>
      ))}
    </div>
  );
}
