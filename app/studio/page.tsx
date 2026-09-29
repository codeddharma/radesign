import type { Metadata } from "next";
import { Media } from "@/components/Media";
import { StudioTeam } from "@/components/studio/StudioTeam";
import { absoluteUrl } from "@/lib/site";
import { getAdminSettings } from "@/lib/admin/settings";
import styles from "./studio.module.css";

export const dynamic = "force-dynamic";
const SHOW_TEAM_PHOTOS = false;
const FOUNDERS_PHOTO = { src: "/media/studio/radhika-arpit-dutt-bw.jpg", alt: "Radhika Dutt and Arpit Dutt, founding partners of R.A. Design Studio" };

export async function generateMetadata(): Promise<Metadata> {
  const { studioPage } = await getAdminSettings();
  return { title: "Studio", description: studioPage.seoDescription, alternates: { canonical: "/studio" }, openGraph: { title: "Studio", description: studioPage.seoDescription, url: absoluteUrl("/studio"), type: "website" } };
}

export default async function StudioPage() {
  const { studioPage } = await getAdminSettings();
  return <>
    <h1 className="sr-only">Studio · R.A. Design Studio</h1>
    <section className={styles.foundersSection} aria-labelledby="founding-partners">
      <div className={styles.sectionLabel} id="founding-partners">Founding partners</div>
      <div className={`${styles.founders} reveal`}>
        <div className={styles.foundersPhoto}><Media src={FOUNDERS_PHOTO.src} alt={FOUNDERS_PHOTO.alt} fill sizes="(max-width:860px) 100vw, 45vw" style={{ height: "100%" }} /></div>
        <div className={styles.foundersText}>
          {/* Red initial on each name spells R.A., echoing the logo. */}
          <h2 className={styles.names}>{studioPage.founders.map((founder, index) => <span key={`${founder.name}-${index}`}>{index > 0 && <span className={styles.amp}> &amp; </span>}<b>{founder.name.charAt(0)}</b>{founder.name.slice(1)}</span>)}</h2>
          {studioPage.intro.map((paragraph, index) => <p className={styles.bio} key={index}>{paragraph}</p>)}
        </div>
      </div>
    </section>
    <section className={styles.teamHead}><div className={styles.sectionLabel}>The people behind the practice</div><h2 className="reveal">{studioPage.teamTitle}</h2></section><StudioTeam gridClassName={styles.teamGrid} team={studioPage.team} showImages={SHOW_TEAM_PHOTOS} />
  </>;
}
