import type { Img } from "@/lib/media";
import { HERO_CAROUSEL, PRESS, PRESS_LOGOS, PROCESS_STEPS, SERVICES, TESTIMONIALS } from "@/lib/projects";
import { cache } from "react";
import { getDb } from "@/lib/admin/mongo";

export interface ServiceContent { title: string; description: string }
export interface ProcessContent { title: string; description: string }
export interface StatContent { value: string; suffix: string; label: string }
export interface TestimonialContent { quote: string; name: string; role: string }
export interface FounderContent { name: string; bio: string; image: Img | null }
export interface TeamContent { name: string; role: string; image: Img | null }
export interface PressContent { publication: string; title: string; year: number; url: string }
export interface CareerRoleContent { title: string; description: string; location: string; experience: string; subject: string; active: boolean }

export interface HomepageContent {
  servicesEyebrow: string; servicesTitle: string; servicesDescription: string; services: ServiceContent[];
  processEyebrow: string; processTitle: string; processDescription: string; process: ProcessContent[];
  stats: StatContent[]; testimonialsEyebrow: string; testimonials: TestimonialContent[];
  pressEyebrow: string; pressTitle: string; ctaEyebrow: string; ctaTitle: string;
}

export interface StudioPageContent {
  seoDescription: string; eyebrow: string; title: string; emphasis: string; intro: string[];
  founders: FounderContent[]; teamTitle: string; team: TeamContent[];
}

export interface PressPageContent {
  seoDescription: string; emphasis: string; titleAfter: string; intro: string;
  logos: string[]; archiveEyebrow: string; archiveTitle: string; entries: PressContent[];
}

export interface CareersPageContent {
  seoDescription: string; emphasis: string; titleAfter: string; intro: string; heroImage: Img | null;
  rolesEyebrow: string; rolesTitle: string; roles: CareerRoleContent[];
  whyEyebrow: string; whyTitle: string; whyDescription: string;
}

export interface ContactPageContent { emphasis: string; titleAfter: string; intro: string }

export interface AdminSettings {
  siteName: string; legalName: string; description: string; foundingYear: string; email: string;
  phones: string[]; whatsappNumber: string; addressLines: string[]; city: string; region: string;
  postalCode: string; country: string; instagram: string; officeHours: string[]; mapQuery: string;
  latitude: number; longitude: number; heroTitle: string; heroEmphasis: string; heroBasedIn: string;
  heroImages: Img[]; footerHeadline: string; homepage: HomepageContent; studioPage: StudioPageContent;
  pressPage: PressPageContent; careersPage: CareersPageContent; contactPage: ContactPageContent;
}

/** The whole settings blob lives in one document keyed "site". */
type SettingsDoc = { _id: string; value?: Partial<AdminSettings>; updatedAt?: string };

const defaults: AdminSettings = {
  siteName: "R.A. Design Studio", legalName: "RA Design Studio",
  description: "R.A. Design Studio is an architecture, interiors, landscape & planning practice in Ahmedabad.",
  foundingYear: "2014", email: "contact@radesign.info", phones: ["+91 97268 85545", "+91 96870 18866"],
  whatsappNumber: "919726885545", addressLines: ["B-1103, Swati Trinity, Near Shanti Pura Circle, Sardar Patel Ring Road", "Ahmedabad, Gujarat 380051."],
  city: "Ahmedabad", region: "Gujarat", postalCode: "380051", country: "IN",
  instagram: "https://www.instagram.com/radesign_ahmedabad/", officeHours: ["Mon to Fri, 10:00 to 19:00 IST", "Saturday by appointment."],
  mapQuery: "Swati Trinity, Sardar Patel Ring Road, Ahmedabad, Gujarat 380051", latitude: 23.0476, longitude: 72.4585,
  heroTitle: "Quiet architecture.", heroEmphasis: "Measured in light.", heroBasedIn: "Ahmedabad", heroImages: HERO_CAROUSEL,
  footerHeadline: "Let’s build something lasting.",
  homepage: {
    servicesEyebrow: "For builders, developers & private clients",
    servicesTitle: "A practice built for the full arc of a project, from brief to handover.",
    servicesDescription: "We work across four disciplines, under one studio, with one partner accountable per project. No outsourcing, no white-labelling, no surprises.",
    services: SERVICES.map((item) => ({ title: item.t, description: item.d })),
    processEyebrow: "How we work", processTitle: "A four-step rhythm: disciplined, transparent, on schedule.",
    processDescription: "Designed so a builder, developer or private client always knows what’s next, what’s due, and what’s defendable.",
    process: PROCESS_STEPS.map((item) => ({ title: item.t, description: item.d })),
    stats: [{ value: "12", suffix: "yrs", label: "In practice" }, { value: "10", suffix: "", label: "Built projects" }, { value: "6", suffix: "", label: "Disciplines" }, { value: "2", suffix: "", label: "Founding partners" }],
    testimonialsEyebrow: "What our clients say", testimonials: TESTIMONIALS,
    pressEyebrow: "Press & recognition", pressTitle: "As featured in.", ctaEyebrow: "The studio",
    ctaTitle: "We design in stone, lime, teak and shadow, for clients who value restraint.",
  },
  studioPage: {
    seoDescription: "About R.A. Design Studio — an architecture, interiors, landscape & planning practice in Ahmedabad, founded in 2014 by Radhika Dutt and Arpit Dutt.",
    eyebrow: "Est. 2014 — Ahmedabad", title: "A practice of", emphasis: "two",
    intro: ["R.A. Design Studio is an architecture practice based in Ahmedabad, India, working in the fields of architecture, interiors, landscape and planning. The studio was founded in 2014 by Radhika Dutt and Arpit Dutt. It began as a modest practice focused on landscape and architecture, and gradually grew into a full interior design studio as well."],
    founders: [
      { name: "Radhika Dutt", bio: "Radhika leads architecture, interiors and planning, with work in Delhi, Ahmedabad and Surat across homes, offices, institutions and hospitals.", image: null },
      { name: "Arpit Dutt", bio: "Arpit leads architecture, interiors and landscape. Trained in landscape architecture at SPA, Delhi, his work spans homes, offices, institutions and urban design.", image: null },
    ],
    teamTitle: "Team", team: ["Rakshanda Moog|Architect", "Anuj Somani|Architect", "Foram Jani|Architect", "Hussain Irawala|Architect", "Kaveesha Shah|Interior Lead", "Mansi Mistry|Planning Lead", "Purvi Tank|Sr. Architect", "Rahi Jain|Architect"].map((item) => { const [name, role] = item.split("|"); return { name, role, image: null }; }),
  },
  pressPage: {
    seoDescription: "Press, features and recognition for R.A. Design Studio, the architecture and design practice in Ahmedabad.",
    emphasis: "Press", titleAfter: "& recognition.", intro: "Selected features, awards and mentions in print and online.",
    logos: PRESS_LOGOS, archiveEyebrow: "Full archive", archiveTitle: "Every piece, in chronological order.",
    entries: PRESS.map((item) => ({ publication: item.title, title: item.piece, year: item.year, url: item.url })),
  },
  careersPage: {
    seoDescription: "Open roles at R.A. Design Studio in Ahmedabad — architects, interior designers and planners. Join the studio.",
    emphasis: "Join", titleAfter: "the studio.", intro: "We hire slowly, for the long view. Send a portfolio and one paragraph about why you want to work here.", heroImage: null,
    rolesEyebrow: "Open positions", rolesTitle: "Roles open this season.",
    roles: [
      { title: "Senior Architect", description: "Lead residential and commercial projects from brief to handover.", location: "Ahmedabad · Full-time", experience: "6+ years", subject: "Senior Architect", active: true },
      { title: "Interior Designer", description: "Design and detail interiors for hospitality and residential briefs.", location: "Ahmedabad · Full-time", experience: "3+ years", subject: "Interior Designer", active: true },
      { title: "Architectural Assistant", description: "Support concept development, drawings and site documentation.", location: "Ahmedabad · Full-time", experience: "0–2 years", subject: "Architectural Assistant", active: true },
      { title: "Internship · 6 months", description: "A paid six-month internship across architecture, interiors and research.", location: "Ahmedabad · Paid", experience: "Currently studying", subject: "Internship", active: true },
    ],
    whyEyebrow: "Why work here", whyTitle: "A small studio where every project stays close to its designers.",
    whyDescription: "Every project is led by a partner. Hours are sensible, site visits are paid, and learning is part of the work.",
  },
  contactPage: { emphasis: "Write", titleAfter: "to us.", intro: "If your brief interests us, we’ll respond within a few working days." },
};

function list<T>(value: unknown, fallback: T[]): T[] { return Array.isArray(value) ? value as T[] : fallback; }

/** Deeply merge legacy settings so schema upgrades never blank a public page. */
export function normalizeAdminSettings(value: Partial<AdminSettings> | null | undefined): AdminSettings {
  const candidate = value ?? {};
  const homepage = { ...defaults.homepage, ...(candidate.homepage ?? {}) };
  const studioPage = { ...defaults.studioPage, ...(candidate.studioPage ?? {}) };
  const pressPage = { ...defaults.pressPage, ...(candidate.pressPage ?? {}) };
  const careersPage = { ...defaults.careersPage, ...(candidate.careersPage ?? {}) };
  return {
    ...defaults, ...candidate,
    phones: list(candidate.phones, defaults.phones), addressLines: list(candidate.addressLines, defaults.addressLines),
    officeHours: list(candidate.officeHours, defaults.officeHours), heroImages: list(candidate.heroImages, defaults.heroImages).length ? list(candidate.heroImages, defaults.heroImages) : defaults.heroImages,
    homepage: { ...homepage, services: list(homepage.services, defaults.homepage.services), process: list(homepage.process, defaults.homepage.process), stats: list(homepage.stats, defaults.homepage.stats), testimonials: list(homepage.testimonials, defaults.homepage.testimonials) },
    studioPage: { ...studioPage, intro: list(studioPage.intro, defaults.studioPage.intro), founders: list(studioPage.founders, defaults.studioPage.founders), team: list(studioPage.team, defaults.studioPage.team) },
    pressPage: { ...pressPage, logos: list(pressPage.logos, defaults.pressPage.logos), entries: list(pressPage.entries, defaults.pressPage.entries) },
    careersPage: { ...careersPage, roles: list(careersPage.roles, defaults.careersPage.roles) },
    contactPage: { ...defaults.contactPage, ...(candidate.contactPage ?? {}) },
  };
}

/**
 * The whole settings blob is one document (`_id: "site"`), exactly as it was
 * one SQLite row. `cache()` collapses the several calls made while rendering a
 * single page — layout and page each ask for it — into one round-trip.
 */
export const getAdminSettings = cache(async (): Promise<AdminSettings> => {
  const db = await getDb();
  const doc = await db.collection<SettingsDoc>("settings").findOne({ _id: "site" });
  return normalizeAdminSettings(doc?.value);
});

// Strip private location and phone details before public rendering or
// client-component serialization.
export async function getPublicSettings() {
  const settings = await getAdminSettings();
  return {
    ...settings,
    phones: [],
    whatsappNumber: "",
    heroTitle: "",
    heroEmphasis: "",
    addressLines: ["Ahmedabad, Gujarat, India", "380058"],
    city: "Ahmedabad",
    country: "India",
    region: "Gujarat",
    postalCode: "380058",
    mapQuery: "",
    latitude: 0,
    longitude: 0,
  };
}

export async function updateAdminSettings(input: Partial<AdminSettings>) {
  const db = await getDb();
  const settings = normalizeAdminSettings({ ...(await getAdminSettings()), ...input });
  await db.collection<SettingsDoc>("settings").updateOne(
    { _id: "site" },
    { $set: { value: settings, updatedAt: new Date().toISOString() } },
    { upsert: true },
  );
  return settings;
}
