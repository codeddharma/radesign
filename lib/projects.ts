/**
 * Project catalog. The 10 projects are backed by the client's real photo sets
 * in lib/media.ts (public/media/projects/N). Titles are placeholders
 * ("Project 1" … "Project 10") and most metadata is generic for now — to be
 * filled in later. Images are real.
 */

import { PROJECT_MEDIA, HERO_CAROUSEL, COVER_PHOTOS, type Img } from "./media";

export type { Img };
export { HERO_CAROUSEL, COVER_PHOTOS };

export type ProjectStatus = "Built" | "In progress";
export type ProjectCategory = "Architecture" | "Interior" | "Landscape" | "Planning";

export interface ProjectCredits {
  lead: string;
  team?: string;
  landscape?: string;
  photo?: string;
}

export interface Project {
  slug: string;
  title: string;
  type: ProjectCategory;
  year: number;
  location: string;
  area: string;
  status: ProjectStatus;
  lede: string;
  /** Full write-up paragraphs shown on the detail page. */
  body: string[];
  materials: string[];
  credits: ProjectCredits;
  /** Card / hero cover image. */
  cover: Img;
  /** Full detail-page gallery. */
  gallery: Img[];
}

export interface JournalEntry {
  title: string;
  date: string;
  cat: string;
  read: string;
  swatch: string;
}

export interface PressItem {
  title: string;
  piece: string;
  year: number;
  url: string;
  thumb: string;
}

export interface Service {
  n: string;
  t: string;
  d: string;
  projects: number;
}

export interface ProcessStep {
  n: string;
  t: string;
  d: string;
}

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

// Real project names from the client. Type/location are inferred from the
// names; year is a placeholder until confirmed. Order matches PROJECT_MEDIA.
const PROJECT_META: ReadonlyArray<{ title: string; type: ProjectCategory; year: number; location: string; status: ProjectStatus }> = [
  { title: "Habitat 0", type: "Architecture", year: 2024, location: "India", status: "Built" },
  { title: "Saanvi Nirman Marketing Office", type: "Interior", year: 2023, location: "India", status: "Built" },
  { title: "The Villa", type: "Architecture", year: 2024, location: "Bhuj", status: "Built" },
  { title: "Farmhouse at Shilpgram", type: "Landscape", year: 2023, location: "Shilpgram", status: "Built" },
  { title: "Seasons Apartment", type: "Landscape", year: 2022, location: "India", status: "Built" },
  { title: "Swati Parkside Apartment", type: "Landscape", year: 2023, location: "India", status: "Built" },
  { title: "Corporate Office Landscape", type: "Landscape", year: 2024, location: "India", status: "Built" },
  { title: "Roseate Roots", type: "Architecture", year: 2024, location: "India", status: "Built" },
  { title: "Shades of Nature", type: "Architecture", year: 2022, location: "India", status: "Built" },
  { title: "Karnav Patel Farmhouse", type: "Landscape", year: 2023, location: "India", status: "Built" },
];

const slugify = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Per-project copy. The Villa and Farmhouse at Shilpgram use the client's
// real write-ups; the rest are placeholder demo copy until real text arrives.
const PROJECT_COPY: ReadonlyArray<{ lede: string; body: string[] }> = [
  {
    // Habitat 0 — demo
    lede: "A cluster of weekend homes planned around shared greens, where each house opens to its own private garden and an unhurried pace.",
    body: [
      "Conceived as a small community of weekend homes, Habitat 0 balances privacy with a generous shared landscape. Each unit is oriented to its own pocket of garden, while planted courts and shaded walks stitch the houses together.",
      "A restrained palette of local materials lets the architecture recede into the site, so that planting and the changing light do the work of giving each home its character.",
    ],
  },
  {
    // Saanvi Nirman Marketing Office — demo
    lede: "A compact marketing office designed to feel calm and considered, shaping a buyer's first impression of the development.",
    body: [
      "The brief was to translate a developer's ambition into a small but memorable space. Daylight, a quiet material palette and a clear circulation spine give the office an unhurried, gallery-like quality.",
      "Built-in seating and a central display anchor the room, while a softened threshold eases the move in from the busy street outside.",
    ],
  },
  {
    // The Villa, Bhuj — real write-up
    lede: "A 3-star resort of 12,000 sq.m in Bhuj, drawn from the slope of the site as a sequence of stepped terraces.",
    body: [
      "The Villa spreads across 12,000 sq.m. The arrival is accentuated by three landscape elements: a boulevard, a stepped garden, and an arrival plaza with sand-finished walls and a central water feature.",
      "The concept grew from the sloping terrain of the site, read as a series of stepped terraces. An amphitheatre anchors the central space and opens generous outdoor space to the rooms. Each setback becomes an altered terrace with semi-covered seating and lush lawns, connecting guests with one another and making the centre a place of congregation.",
    ],
  },
  {
    // Farmhouse at Shilpgram — real write-up
    lede: "A 5,000 sq.m landscape beside a farmhouse, where a flat plot is reworked into raised gardens on shifting levels.",
    body: [
      "An outdoor landscape for recreation and active leisure, spanning 5,000 sq.m, sits alongside a farmhouse on a flat plot. Because the terrain is level, raised gardens on different levels were introduced to give the site depth and variety.",
      "A swimming pool, visible from the building, anchors the space, with a sunken seating area beside it. A zig-zag flooring pattern carried throughout lends the design a unity and character entirely its own.",
    ],
  },
  {
    // Seasons Apartment — demo
    lede: "A shared landscape for an apartment community, shaped around everyday movement, pause and gathering.",
    body: [
      "Built from a compact footprint, the landscape unfolds as a varied ground plane. Shaded seating sits beneath a hardy, year-round canopy, while clear paths connect the towers and bring the garden into daily life.",
      "Layered planting keeps the commons green through the seasons with a considered, low-maintenance palette.",
    ],
  },
  {
    // Swati Parkside Apartment — demo
    lede: "A parkside residential landscape that draws the green edge of the site into the daily life of its residents.",
    body: [
      "Walkways, seating courts and play areas are woven between the blocks, so every household is a short walk from something green.",
      "Level changes and planted buffers screen the parking and services, making the garden, not the car park, the first thing residents meet on arrival.",
    ],
  },
  {
    // Corporate Office Landscape — demo
    lede: "A working landscape for a corporate campus, designed to make both the arrival and the breaks between work feel restorative.",
    body: [
      "The scheme frames the approach with a generous forecourt and shaded seating, turning leftover setbacks into usable outdoor rooms for informal meetings and quiet breaks.",
      "A simple, durable material palette and structured planting keep the campus legible and easy to maintain through the year.",
    ],
  },
  {
    // Roseate Roots — demo
    lede: "Weekend homes set into their landscape, where the garden is treated as the first room of the house.",
    body: [
      "Each home is planned around its outdoor space, with covered thresholds and filtered light easing the move from built form to garden.",
      "Native, low-care planting and local stone root the houses in their setting and let them weather gracefully.",
    ],
  },
  {
    // Shades of Nature — demo
    lede: "A private residence where architecture and garden share one geometry, softening the line between inside and out.",
    body: [
      "The lines of the house are extended into the landscape, with niches, water and planting picking up the rhythm of the built form.",
      "A lily pond, semi-open seating and a trellised verandah create a gentle sequence of thresholds from the rooms to the open garden.",
    ],
  },
  {
    // Karnav Patel Farmhouse — demo
    lede: "A farmhouse landscape made for slow weekends, organised around water, shade and long open views.",
    body: [
      "Raised lawns, a pool court and shaded decks give the flat plot a layered, unhurried character.",
      "A restrained palette of local stone and timber ties the outdoor rooms to the house and to the land around it.",
    ],
  },
];

export const PROJECTS: Project[] = PROJECT_META.map((meta, i) => {
  const gallery = PROJECT_MEDIA[i] ?? [];
  // prefer a landscape frame as the cover, else the first image
  const cover = gallery.find((img) => img.w / img.h >= 1.2) ?? gallery[0];
  return {
    slug: slugify(meta.title),
    title: meta.title,
    type: meta.type,
    year: meta.year,
    location: meta.location,
    area: "—",
    status: meta.status,
    lede: PROJECT_COPY[i].lede,
    body: PROJECT_COPY[i].body,
    materials: [],
    credits: { lead: "R.A. Design Studio" },
    cover,
    gallery,
  };
});

/** Look up a single project by slug. */
export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}

export const JOURNAL: JournalEntry[] = [
  { title: "Why we build around courtyards", date: "Mar 2026", cat: "Essay", read: "8 min", swatch: "basalt" },
  { title: "Reclaimed teak: notes from a scrapyard in Surat", date: "Feb 2026", cat: "Field note", read: "5 min", swatch: "teak" },
  { title: "On the Dezeen cover: Oasis, one year later", date: "Jan 2026", cat: "Press", read: "3 min", swatch: "shadow" },
  { title: "A quiet architecture", date: "Nov 2025", cat: "Essay", read: "12 min", swatch: "ivory" },
  { title: "The Quiet Clinic wins AIA India Prize", date: "Oct 2025", cat: "Press", read: "2 min", swatch: "limewash" },
  { title: "Kadappa, close up", date: "Sep 2025", cat: "Material", read: "4 min", swatch: "slate" },
  { title: "Studio Saransh injects VS House in India with subtlety, warm wood and grey tiles", date: "Aug 2025", cat: "Press", read: "6 min", swatch: "teak" },
  { title: "Lime wash: a recipe and an argument", date: "Jun 2025", cat: "Material", read: "7 min", swatch: "limewash" },
];

export const PRESS: PressItem[] = [
  { title: "Dezeen", piece: "Studio escapes chaos of the city with self-designed Ahmedabad studio", year: 2025, url: "https://www.dezeen.com/", thumb: "basalt" },
  { title: "Architectural Digest", piece: "The 50 best architecture firms in India", year: 2025, url: "https://www.architecturaldigest.in/", thumb: "ivory" },
  { title: "STIRworld", piece: "VS House injects subtlety, warm wood and grey tiles", year: 2020, url: "https://www.stirworld.com/", thumb: "teak" },
  { title: "Architizer", piece: "A+ Firm of the Year, Finalist", year: 2024, url: "https://architizer.com/", thumb: "concrete" },
  { title: "Domus India", piece: "Ten Courtyards: a retrospective", year: 2023, url: "https://www.domusweb.it/", thumb: "stone" },
  { title: "Home Review", piece: "Cover feature: The Quiet Clinic", year: 2023, url: "https://www.homereview.in/", thumb: "lime" },
];

/** Services for builders, developers & private clients. */
export const SERVICES: Service[] = [
  { n: "01", t: "Architecture", d: "Residential, commercial and hospitality projects shaped from concept through handover.", projects: 48 },
  { n: "02", t: "Interior", d: "Material-led interiors, FF&E and turnkey delivery for considered finished spaces.", projects: 18 },
  { n: "03", t: "Landscape", d: "Courtyards, gardens and site-specific landscapes integrated from the first drawing.", projects: 11 },
  { n: "04", t: "Planning", d: "Townships, campuses and masterplans developed with a long regard for context.", projects: 6 },
];

/** How we work — a four-step rhythm. */
export const PROCESS_STEPS: ProcessStep[] = [
  { n: "01", t: "Brief & site", d: "We begin on the site, with the people who will live or work in it. Three weeks of listening, measuring, and shadow-mapping." },
  { n: "02", t: "Concept", d: "A single design idea, defended in drawings, references and a 1:100 working model. Reviewed weekly with you." },
  { n: "03", t: "Design & detail", d: "Full architectural set, interior detail, FF&E, landscape. One partner owns the project, never a sub-team you've never met." },
  { n: "04", t: "Build & handover", d: "Weekly site visits, monthly client walks. We hand you a building that aged into the rendering, not away from it." },
];

/** Builder / client testimonials. */
export const TESTIMONIALS: Testimonial[] = [
  {
    quote: "We've worked with R.A. on three towers. They are the rare studio that designs as if they're paying for the steel themselves.",
    name: "Karan Mehta",
    role: "Director, Sankalp Developers · Bengaluru",
  },
  {
    quote: "Drawings landed on time, every milestone. On site, they meet our PM weekly. The finished building is materially what was promised.",
    name: "Aanchal Shroff",
    role: "Head of Projects, Vastra Realty · Mumbai",
  },
  {
    quote: "Honest about timelines, honest about budget, honest about what the building wants to be. Easy to recommend.",
    name: "Sanjay Patel",
    role: "MD, Skyline Builders · Surat",
  },
];

/** Press logos for a quiet "as featured in" row. */
export const PRESS_LOGOS: string[] = [
  "Dezeen",
  "Architectural Digest",
  "STIRworld",
  "Architizer",
  "Domus",
  "Home Review",
  "Inside Outside",
  "Wallpaper*",
];
