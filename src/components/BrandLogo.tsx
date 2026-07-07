/**
 * NoaCG Studio logo — built to the Brand Manual (§2).
 *
 * The mark is three descending bars: the shape of a lower-third graphic, which also reads
 * as the "N" of NoaCG. The tool is the logo. Bar widths 100 / 66 / 40 %, height 1x, gap
 * 0.5x, corner radius 0.2x (unit = one bar height). The top bar is the amber "on-air" bar
 * and carries the signature glow; the lower two are paper at descending opacity.
 *
 * Rendered as inline SVG so it stays crisp at any size and picks up the app's CSS variables
 * (amber / paper), rather than shipping a raster at every density.
 */

interface MarkProps {
  /** Mark height in px (width follows the 1:1 art box). */
  size?: number;
  className?: string;
  /** Turn off the amber glow (e.g. tiny placements, light backgrounds). */
  glow?: boolean;
}

/** The bar mark on its own — favicon, corner bug, avatar, tight spaces. */
export function BrandMark({ size = 26, className, glow = true }: MarkProps) {
  return (
    <svg
      className={`brand-mark${glow ? ' brand-mark--glow' : ''}${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* top = 100% width, the amber on-air bar */}
      <rect className="brand-mark__on" x="0" y="0" width="40" height="10" rx="2" />
      {/* middle = 66% */}
      <rect className="brand-mark__mid" x="0" y="15" width="26.4" height="10" rx="2" />
      {/* bottom = 40% */}
      <rect className="brand-mark__lo" x="0" y="30" width="16" height="10" rx="2" />
    </svg>
  );
}

interface LogoProps {
  /** Mark height in px; the wordmark scales with it. */
  size?: number;
  /** Stack the mark above the wordmark (square / centered spaces like the login hero). */
  stacked?: boolean;
  className?: string;
}

/** Full primary lockup: bar mark + `NoaCG` wordmark with `STUDIO` in mono beneath. */
export default function BrandLogo({ size = 26, stacked = false, className }: LogoProps) {
  return (
    <span
      className={`brand-lockup${stacked ? ' brand-lockup--stacked' : ''}${className ? ` ${className}` : ''}`}
      style={{ ['--mark-size' as string]: `${size}px` }}
    >
      <BrandMark size={size} className="brand-lockup__mark" />
      <span className="brand-lockup__type">
        <span className="brand-wordmark">
          <b>Noa</b>
          <span className="brand-wordmark__cg">CG</span>
        </span>
        <span className="brand-studio">Studio</span>
      </span>
    </span>
  );
}
