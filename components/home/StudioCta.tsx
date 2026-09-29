import Link from "next/link";
import type { HomepageContent } from "@/lib/admin/settings";

export function StudioCta({ content }: { content: HomepageContent }) {
  return (
    <section className="section">
      <div className="container">
        <div className="cta-grid">
          <div className="label reveal">{content.ctaEyebrow}</div>
          <div className="reveal">
            <h2 className="h1" style={{ maxWidth: "22ch" }}>
              {content.ctaTitle}
            </h2>
            <div style={{ marginTop: "48px", display: "flex", gap: "14px", flexWrap: "wrap" }}>
              <Link href="/studio" className="btn-link">
                About the studio <span className="arr">→</span>
              </Link>
              <Link href="/contact" className="btn-red">
                Start a project <span className="arr">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
