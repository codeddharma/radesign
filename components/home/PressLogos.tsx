import Link from "next/link";
import type { HomepageContent } from "@/lib/admin/settings";

export function PressLogos({ content, logos }: { content: HomepageContent; logos: string[] }) {
  return (
    <section className="section-luxe bone">
      <div className="container">
        <div className="eyebrow reveal">{content.pressEyebrow}</div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "24px",
            flexWrap: "wrap",
            marginBottom: "50px",
          }}
        >
          <h2 className="h-luxe reveal">
            {content.pressTitle}
          </h2>
          <Link
            href="/press"
            style={{
              fontSize: "12px",
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "var(--red)",
              borderBottom: "1px solid var(--red)",
              paddingBottom: "2px",
            }}
          >
            All coverage →
          </Link>
        </div>
        <div className="press-logos reveal" id="press-logos">
          {logos.map((name) => (
            <div className="lg" key={name}>
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
