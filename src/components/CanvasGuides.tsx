interface Props {
  /** On-screen size of the canvas (template resolution × current scale), in CSS pixels. */
  width: number;
  height: number;
  /** Show the broadcast safe-area rectangles (title-safe / action-safe). */
  safeAreas: boolean;
  /** Show the rule-of-thirds grid + centre cross. */
  grid: boolean;
}

// Broadcast safe-area insets (fraction of each edge).
const ACTION_SAFE = 0.035; // ~3.5%
const TITLE_SAFE = 0.05; // ~5%

/**
 * Overlay drawn exactly over the preview iframe's on-screen rect. Always shows the canvas
 * outline so the 16:9 (or chosen aspect) bounds are visible; optionally shows broadcast
 * safe-area rectangles and a rule-of-thirds grid. Sized in screen pixels (not scaled) so the
 * lines stay crisp at any zoom. Purely visual — never part of the exported template. Shared
 * by the SPX preview and the video (Remotion) preview so both canvases read identically.
 */
export default function CanvasGuides({ width, height, safeAreas, grid }: Props) {
  if (width <= 0 || height <= 0) return null;

  const ax = width * ACTION_SAFE;
  const ay = height * ACTION_SAFE;
  const tx = width * TITLE_SAFE;
  const ty = height * TITLE_SAFE;

  return (
    <svg
      className="canvas-guides"
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 4,
      }}
    >
      {/* Canvas outline — always visible. */}
      <rect x={0.5} y={0.5} width={width - 1} height={height - 1} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1} />

      {grid && (
        <g stroke="rgba(255,255,255,0.22)" strokeWidth={1}>
          {/* Rule of thirds */}
          <line x1={width / 3} y1={0} x2={width / 3} y2={height} />
          <line x1={(width * 2) / 3} y1={0} x2={(width * 2) / 3} y2={height} />
          <line x1={0} y1={height / 3} x2={width} y2={height / 3} />
          <line x1={0} y1={(height * 2) / 3} x2={width} y2={(height * 2) / 3} />
          {/* Center cross */}
          <line x1={width / 2} y1={0} x2={width / 2} y2={height} stroke="rgba(255,255,255,0.32)" />
          <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="rgba(255,255,255,0.32)" />
        </g>
      )}

      {safeAreas && (
        <g fill="none" strokeWidth={1} strokeDasharray="6 5">
          {/* Action-safe (~93%) */}
          <rect x={ax} y={ay} width={width - ax * 2} height={height - ay * 2} stroke="rgba(120,200,255,0.85)" />
          {/* Title-safe (~90%) */}
          <rect x={tx} y={ty} width={width - tx * 2} height={height - ty * 2} stroke="rgba(255,210,70,0.9)" />
        </g>
      )}
    </svg>
  );
}
