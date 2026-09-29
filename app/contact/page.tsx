import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import { InstagramIcon } from "@/components/Icons";
import { absoluteUrl } from "@/lib/site";
import { getPublicSettings as getAdminSettings } from "@/lib/admin/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAdminSettings();
  const description = `Contact ${settings.siteName} in ${settings.city} by email or Instagram.`;
  return { title: "Contact", description, alternates: { canonical: "/contact" }, openGraph: { title: "Contact", description, url: absoluteUrl("/contact"), type: "website" } };
}

export default async function ContactPage() {
  const settings = await getAdminSettings();
  return (
    <>
      <h1 className="sr-only">Contact {settings.siteName}</h1>
      <section className="section contact-top"><div className="container"><div className="contact-grid">
        <div className="contact-info reveal">
          <div className="eyebrow" style={{ marginBottom: "24px" }}>Reach the studio</div>
          <dl className="contact-lines">
            <div><dt>Project enquiries</dt><dd><a href={`mailto:${settings.email}`}>{settings.email}</a></dd></div>
            <div><dt>Job enquiries</dt><dd><a href={`mailto:${settings.email}?subject=${encodeURIComponent("Job application")}`}>{settings.email}</a><span className="note">Send your CV and portfolio (PDF or link).</span></dd></div>
            {settings.instagram && <div><dt>Instagram</dt><dd><a href={settings.instagram} target="_blank" rel="noopener noreferrer" className="ig"><InstagramIcon size={16} />{settings.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\/?/, "@").replace(/\/$/, "")}</a></dd></div>}
            <div><dt>Studio</dt><dd>{settings.addressLines.map((line) => <span key={line}>{line}<br /></span>)}</dd></div>
          </dl>
        </div>
        <div className="contact-form reveal"><h2>For project-related enquiries</h2><ContactForm /></div>
      </div></div></section>

    </>
  );
}
