import type { CSSProperties } from "react";

interface PlaceholderProps {
  /** Material mood + layout modifiers, e.g. "basalt", "teak interior", "ivory plan". */
  variant?: string;
  className?: string;
  caption?: string;
  style?: CSSProperties;
}

/**
 * CSS-only architectural placeholder graphic — the layered
 * sky / ground / volume / opening composition from the original `.ph` element.
 *
 * Kept as a fallback until real project photos arrive; when they do, swap this
 * for an <Image>/<img> while keeping the same wrapper classes and aspect ratios.
 */
export function Placeholder({ variant = "", className = "", caption, style }: PlaceholderProps) {
  const classes = ["ph", variant, className].filter(Boolean).join(" ");
  return (
    <div className={classes} style={style}>
      <div className="layer sky" />
      <div className="layer ground" />
      <div className="layer vol" />
      <div className="layer opening" />
      <div className="layer opening o2" />
      {caption ? <div className="caption">{caption}</div> : null}
    </div>
  );
}
