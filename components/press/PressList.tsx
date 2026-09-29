import { Placeholder } from "@/components/Placeholder";
import type { PressContent } from "@/lib/admin/settings";

/**
 * Full press archive — one `.row` per coverage item, sorted descending by year.
 * Mirrors the `#press-list` markup from press.html: index, publication name
 * (with a small thumb Placeholder), the piece title, the year, and an external
 * "Read →" link. Falls back to an em dash when no URL is present.
 */
export function PressList({ entries }: { entries: PressContent[] }) {
  const sorted = [...entries].sort((a, b) => b.year - a.year);

  return (
    <div className="press-list" id="press-list">
      {sorted.map((item, i) => (
        <div className="row reveal" key={`${item.publication}-${item.title}-${item.year}`}>
          <div className="n">{String(i + 1).padStart(2, "0")}</div>
          <div className="pub">
            <div className="thumb">
              <Placeholder variant="stone" />
            </div>
            <span>{item.publication}</span>
          </div>
          <div className="ttl">{item.title}</div>
          <div className="yr">{item.year}</div>
          {item.url ? (
            <a
              className="lk"
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read →
            </a>
          ) : (
            <div className="lk" style={{ color: "var(--mute)", border: 0 }}>
              —
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
