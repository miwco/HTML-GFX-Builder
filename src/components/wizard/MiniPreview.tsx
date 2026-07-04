import { useMemo, useRef } from 'react';
import { composeDocument } from '../../preview/composeDocument';
import type { TemplateVariant } from '../../model/wizard';

/**
 * A small settled-state render of a variant for the template picker cards.
 * Loads the real template and jumps the entrance timeline to its end (no animation),
 * so every card shows the true on-air look without ten timelines running at once.
 */
export default function MiniPreview({ variant }: { variant: TemplateVariant }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const doc = useMemo(() => composeDocument(variant.create()), [variant]);

  const settle = () => {
    const w = ref.current?.contentWindow as
      | (Window & { buildInTimeline?: () => { progress: (n: number) => void } })
      | null;
    try {
      w?.buildInTimeline?.().progress(1); // jump straight to the settled on-air state
    } catch {
      /* preview is best-effort */
    }
  };

  return (
    <div className="wz-mini">
      <iframe
        ref={ref}
        title={`${variant.name} preview`}
        sandbox="allow-scripts allow-same-origin"
        srcDoc={doc}
        onLoad={() => setTimeout(settle, 40)}
        tabIndex={-1}
      />
    </div>
  );
}
