import type { HomepageContent } from "@/lib/admin/settings";
import { Testimonial } from "@/components/home/Testimonial";

export function HowWeWork({ content }: { content: HomepageContent }) {
  return (
    <section className="section-luxe dark">
      <div className="container">
        <div className="eyebrow reveal">{content.processEyebrow}</div>
        <div className="luxe-head">
          <h2 className="h-luxe reveal">
            {content.processTitle}
          </h2>
          <p className="lede reveal" style={{ maxWidth: "40ch", color: "rgba(255,255,255,.65)" }}>
            {content.processDescription}
          </p>
        </div>
        <div className="process-grid stagger">
          {content.process.map((step, index) => (
            <div className="step reveal" key={`${step.title}-${index}`}>
              <div className="n">STEP {String(index + 1).padStart(2, "0")}</div>
              <div className="t">{step.title}</div>
              <div className="d">{step.description}</div>
            </div>
          ))}
        </div>

        <div className="stats-inline reveal">
          {content.stats.map((stat, index) => <div className="s" key={`${stat.label}-${index}`}><div className="n">{stat.value}{stat.suffix && <span className="sup">{stat.suffix}</span>}</div><div className="k">{stat.label}</div></div>)}
        </div>

        <div className="testimonial-wrap">
          <div className="eyebrow reveal" style={{ color: "var(--red)" }}>
            {content.testimonialsEyebrow}
          </div>
          <Testimonial testimonials={content.testimonials} />
        </div>
      </div>
    </section>
  );
}
