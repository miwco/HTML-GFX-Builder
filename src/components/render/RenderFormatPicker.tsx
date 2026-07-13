// The render format cards (MP4/WebM/PNG/sequence/ProRes) with the sign-in gating on
// account formats - shared by the SPX RenderPanel and the video editor's VideoRenderPanel.

import { useAuthState } from '../auth/useAuthState';
import { useAuthUi } from '../auth/authUi';
import { formatNeedsSignIn } from '../../render/limits';
import { RENDER_FORMATS, type RenderFormatId } from '../../render/manifest';

export const FORMAT_ORDER: RenderFormatId[] = ['mp4', 'webm', 'png-still', 'png-sequence', 'prores4444'];

interface Props {
  format: RenderFormatId;
  onChange: (format: RenderFormatId) => void;
}

export default function RenderFormatPicker({ format, onChange }: Props) {
  const { needsSignIn } = useAuthState();
  const openSignIn = useAuthUi((s) => s.openSignIn);
  const locked = (f: RenderFormatId) => formatNeedsSignIn(f) && needsSignIn;

  return (
    <div className="stack">
      {FORMAT_ORDER.map((f) => {
        const fi = RENDER_FORMATS[f];
        const isLocked = locked(f);
        return (
          <label
            key={f}
            className="issue"
            data-testid={`render-format-${f}`}
            style={{ display: 'block', cursor: 'pointer', opacity: isLocked ? 0.66 : 1, borderColor: format === f ? 'var(--accent)' : undefined }}
            onClick={(e) => {
              if (isLocked) {
                e.preventDefault();
                openSignIn(`Sign in to export ${fi.label}.`);
              }
            }}
          >
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <input
                type="radio"
                name="render-format"
                style={{ width: 'auto', marginTop: 3 }}
                checked={format === f}
                disabled={isLocked}
                onChange={() => onChange(f)}
              />
              <div>
                <div style={{ fontWeight: 600 }}>
                  {fi.label}
                  {isLocked && <span className="hint" style={{ marginLeft: 8 }}>🔒 sign in</span>}
                </div>
                <div className="hint">{fi.note}</div>
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}
