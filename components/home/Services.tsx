import type { HomepageContent } from "@/lib/admin/settings";

export function Services({ content }: { content: HomepageContent }) {
  return (
    <section className="section-luxe">
      <div className="container">
        <div className="eyebrow reveal">{content.servicesEyebrow}</div>
        <div className="luxe-head">
          <h2 className="h-luxe reveal">
            {content.servicesTitle}
          </h2>
          <p className="lede reveal" style={{ maxWidth: "40ch" }}>
            {content.servicesDescription}
          </p>
        </div>
        <div className="services-grid stagger" id="services">
          {content.services.map((service, index) => (
            <div className="srv reveal" key={`${service.title}-${index}`}>
              <div className="n">{String(index + 1).padStart(2, "0")}</div>
              <div className="t">{service.title}</div>
              <div className="d">{service.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
