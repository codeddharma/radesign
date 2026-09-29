# Handoff: R.A. Design Studio — Marketing Website → Next.js

## Overview
This is the complete marketing website for **R.A. Design Studio**, an architecture / interiors / planning practice based in Ahmedabad, India. It is a 7-page brochure site: Home, Work (project index), Project (case-study detail), Studio (about), Press, Careers, and Contact.

The goal of this handoff is to **rebuild this design as a Next.js application** — same look, same content, same behaviors — using Next.js conventions (App Router, React components, `next/image`, `next/font`) instead of the static HTML + vanilla-JS implementation in this bundle.

---

## About the Design Files
The files in `source/` are **design references created in HTML/CSS/vanilla-JS** — a working prototype that shows the intended look and behavior. **They are not meant to be shipped as-is.** Your task is to recreate these designs faithfully in a Next.js codebase using its idioms and an established component structure.

The prototype uses **CSS-drawn placeholder graphics** (`.ph` divs with material-tinted gradient "layers") in place of real photography, because no final photos were available. In the Next.js build these should become real `<Image>` components — see **Imagery** below. Keep the placeholder system available as a fallback so the layout never collapses when an image is missing.

## Fidelity
**High-fidelity (hifi).** Colors, typography, spacing, and interactions are final. Recreate the UI pixel-perfectly. All design tokens are enumerated below and also live in `source/assets/site.css` (the single source of truth). When in doubt, match `site.css`.

---

## Recommended Next.js Structure
No existing codebase was provided, so choose Next.js (App Router) with TypeScript. Suggested layout:

```
app/
  layout.tsx            # <Nav/> + <Footer/>, fonts, global CSS, Lenis provider
  page.tsx              # Home
  work/page.tsx         # Work index (filterable grid)
  work/[slug]/page.tsx  # Project detail (replaces project.html?p=slug)
  studio/page.tsx
  press/page.tsx
  careers/page.tsx
  contact/page.tsx
components/
  Nav.tsx  Footer.tsx
  MasonryGrid.tsx  ProjectCard.tsx
  ServicesGrid.tsx  ProcessGrid.tsx  TestimonialCarousel.tsx  PressLogos.tsx
  ProjectHeroCollage.tsx  ProjectGallery.tsx  Lightbox.tsx
  Reveal.tsx            # IntersectionObserver wrapper for scroll-in animations
  Placeholder.tsx       # the .ph material placeholder, as a fallback for missing images
lib/
  projects.ts          # port of assets/data.js (typed)
  gallery.ts           # port of RA_PROJECT_GALLERY()
styles/
  globals.css          # port of site.css (or convert to CSS Modules / Tailwind)
```

**Routing note:** the prototype uses `project.html?p=<slug>` query strings. In Next.js convert these to dynamic routes `/work/[slug]`. Generate static params from the project list (`generateStaticParams`).

**Data:** `assets/data.js` attaches everything to `window.*`. Port it to a typed module (`lib/projects.ts`) exporting `PROJECTS`, `SERVICES`, `PROCESS`, `TESTIMONIALS`, `PRESS`, `PRESS_LOGOS`, `JOURNAL`, and the `projectGallery(project)` function. Types are described under **Data Model**.

**Smooth scroll:** the prototype uses [Lenis](https://github.com/darkroomengineering/lenis) (`lenis@1.1.14`). Use `lenis/react` (`<ReactLenis root>`) in a client provider in `layout.tsx` with `{ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1.0, touchMultiplier: 1.5 }`.

---

## Design Tokens
All from `:root` in `source/assets/site.css`.

### Colors
| Token | Value | Use |
|---|---|---|
| `--ink` | `#111111` | primary text |
| `--ink-2` | `#2a2a2a` | body text |
| `--mute` | `#888888` | secondary text, labels |
| `--mute-2` | `#bbbbbb` | tertiary |
| `--line` | `#ececec` | borders / dividers |
| `--line-2` | `#f3f3f3` | image placeholder bg |
| `--paper` | `#ffffff` | page background |
| `--paper-2` | `#fafafa` | alt section background |
| `--red` | `#c8102e` | **primary accent** (deep architectural red) |
| `--red-2` | `#a40d24` | accent hover/darker |
| `--red-soft` | `#fbecee` | accent tint |
| dark section bg | `#0c0c0c` | "How we work" section, hover states |
| bone section bg | `#f6f3ec` | "As featured in" section |

Accent red is user-tweakable in the prototype (Deep red `#c8102e`, Bright red `#e63946`, Oxblood `#8b0000`, Cardinal `#b31b1b`) — this is a nice-to-have, not required. If kept, drive it off a CSS variable on `:root`.

### Typography
- **Sans (everything):** `Inter`, weights 300/400/500/600. Load via `next/font/google`.
- **Serif-italic accent:** there is no separate serif — the design uses **Inter italic** for emphasis spans (the `em`/`.em-serif`/`.init` elements rendered in red italic). `--serif` is aliased to Inter in the CSS. Keep emphasis = Inter italic, color `--red`.
- **Mono:** `JetBrains Mono` 400 — used for small metadata (years, indices, captions, counts).
- Base body: 14px / line-height 1.5 / letter-spacing 0. Antialiased.

Type scale (all clamp-based, fluid):
| Class | Size | Weight | Letter-spacing | Line-height |
|---|---|---|---|---|
| `.h-display` | `clamp(44px,5.5vw,88px)` | 400 | -0.035em | 1.02 |
| `.h1` | `clamp(32px,3.8vw,56px)` | 400 | -0.03em | 1.05 |
| `.h2` | `clamp(22px,2.4vw,34px)` | 400 | -0.02em | 1.15 |
| `.h-luxe` (section headers) | `clamp(36px,4.2vw,64px)` | 400 | -0.035em | 1.04 |
| `.h3` | 16px | 500 | -0.005em | 1.35 |
| `.lede` | 16px | 400 | 0 | 1.55, color `--ink-2` |
| `.lede-lg` | 20px | 400 | -0.005em | 1.5 |
| `.label` | 11px | 500 | .14em, UPPERCASE | — color `--mute` |
| `.mono` | 11px | 400 | 0 | mono family |
| `.eyebrow` | 11px | 500 | .18em, UPPERCASE | has a 28px red rule before it |

### Spacing / layout
- `--page-pad: clamp(20px, 3vw, 40px)` — horizontal page padding everywhere.
- `.container`: max-width **1640px**, centered, padded by `--page-pad`.
- `.section`: 96px vertical padding; `.section.tight`: 56px.
- `.section-luxe`: 96px vertical; `.dark` variant = `#0c0c0c` bg + white text; `.bone` variant = `#f6f3ec` bg.
- Easing curve used for **all** transitions: `--ease: cubic-bezier(0.22, 1, 0.36, 1)`.

### Borders / radius / shadow
- Radius: the design is almost entirely **square-cornered**. Only exceptions: `.pill` and nav dot use `border-radius: 999px` / `50%`.
- Borders: 1px solid `--line` (light) or `rgba(255,255,255,.12–.14)` (on dark).
- Shadow: minimal. Tweaks panel uses `0 20px 60px rgba(0,0,0,.08)`. Otherwise none.
- Selection: `::selection { background: var(--red); color: #fff }`.

---

## Shared Chrome (Nav + Footer)
Ported from `source/assets/partials.js`. Render as `<Nav active="..."/>` and `<Footer/>` in `app/layout.tsx`.

### Nav
- Fixed top, `z-index: 50`, full width. 3-column grid: brand (left) | links (center) | spacer (right).
- Background `rgba(255,255,255,0.88)` + `backdrop-filter: blur(10px)`, bottom border 1px `--line`, 20px vertical padding.
- Brand = logo image (`assets/logo-full.png`), height 46px (34px under 720px), links to `/`.
- Links: **Work, Studio, Press, Careers, Contact** — 15px, weight 500, gap 38px. Hover → red. Active link is red with a 1px red underline (`::after`).
- **Auto-hide behavior** (from `site.js` `initNavHide`): on scroll past 120px, scrolling **down** hides the nav (`translateY(-102%)`, transition .7s), scrolling **up** reveals it. Implement with a scroll listener + `requestAnimationFrame` throttle.

### Footer
- Background `--ink` (#111), white text, padding `100px var(--page-pad) 40px`, `margin-top: 120px`.
- Big line: "Let's build *something* lasting." (`something` is red italic), `clamp(32px,3.6vw,52px)`.
- 4-column grid (`1.5fr 1fr 1fr 1fr`): **Studio** (address), **Contact** (email + phone), **Navigate** (page links), **Follow** (Instagram, LinkedIn).
- Bottom row: `© 1994 — 2026 R.A. Design Studio` (left) · `Ahmedabad · Mumbai · Bengaluru` (right), 11px, `rgba(255,255,255,.5)`.
- Address: Behind Aagman Party Plot, Shilaj Ranchharda Road, Ahmedabad 380059, IN.
- Email `hello@radesignstudio.in` · Phone `+91 76006 02008`.

---

## Screens / Views

### 1. Home — `app/page.tsx` (`source/index.html`)
Sections top to bottom:
1. **Hero** — full-viewport (`height:100vh`, min 640px). Background = full-bleed material placeholder (`basalt` by default; tweakable). Bottom-anchored text: H1 "Quiet architecture. / *Measured* in light." (`Measured` red italic), `clamp(40px,5vw,72px)`, white. Right side: meta row — Est. *1994* · Built *48 projects* · Based *Ahmedabad* (values in italic). A subtle dark gradient overlay sits over the media for legibility.
2. **Featured work** — section head "Selected work, 2021 — 2026" + "06 / 20 featured · View all →". Below: a **CSS-columns masonry** (`column-count: 3`, gap 32px; 2 cols ≤1100px, 1 col ≤640px) of 6 featured projects (slugs: `oasis, vs-house, folio-tower, the-quiet-clinic, house-of-eight, stone-stepwell`), aspect ratios `[4/5,3/4,4/3,3/4,4/5,3/4]`. Each card = image + meta row (title / `location · type`, year in mono). Hover: image scales 1.05, title turns red.
3. **Big featured project** (bg `--paper-2`) — 2-col split (`1.5fr 1fr`): large 4/3 image (Folio Tower, `concrete`) + info: pill "In progress · Bengaluru", h3 "Folio Tower", lede, red CTA button "Enter project →" → `/work/folio-tower`.
4. **Services** (`.section-luxe`) — eyebrow "For builders, developers & private clients", h-luxe "A practice built for the full *arc* of a project — from brief to handover." + intro paragraph. Below: **3-col services grid** (from `RA_SERVICES`), each cell = mono number, title + red "N built" count, description. Cells separated by 1px lines; hover tints red and adds horizontal padding. 2-col ≤900px, 1-col ≤560px.
5. **How we work** (`.section-luxe.dark`, #0c0c0c) — eyebrow + h-luxe "A *four-step* rhythm…". **4-col process grid** (from `RA_PROCESS`): each step has a left red tick (top 36px of a left border), mono "STEP 0N", title, description. Then a **stats row** (4-up): 32 yrs in practice · 48 built projects · 11 international awards · ₹1,200 cr delivered value (superscript units in red). Then a **testimonial carousel** (from `RA_TESTIMONIALS`): giant red italic quote mark, rotating quote (`clamp(22px,2.4vw,36px)`), attribution, prev/next buttons, auto-rotates every 8s with a .5s opacity crossfade.
6. **Press logos** (`.section-luxe.bone`, #f6f3ec) — eyebrow + h-luxe "As featured *in*." + "All coverage →". A 4-col logo grid (`RA_PRESS_LOGOS`), serif-italic names, hover → red. 2-col ≤720px.
7. **Closing studio line + CTA** — 2-col (`1fr 1.8fr`): label "— The studio" + h1 "We design in stone, lime, teak and *shadow*…" with buttons "About the studio →" (outline) and "Start a project →" (red).

### 2. Work — `app/work/page.tsx` (`source/work.html`)
- Page header (`.page-head`, 140px top pad): H1 "Selected *work*." + lede paragraph.
- **Filter bar** — buttons: All (with live count), Residence, Workplace, Studio, Commercial, Cultural, Hospitality, Adaptive re-use. Active = red + red underline. Filter matches against `project.type` (case-insensitive substring). In Next.js use client state (`useState`) for the active filter.
- **Masonry grid** of all 20 projects (same card as home; ratios cycle through a 20-entry array — see `work.html`). Cards link to `/work/[slug]`.

### 3. Project detail — `app/work/[slug]/page.tsx` (`source/project.html`)
Reads project by slug. Sections:
1. **Hero collage** — a Pinterest-style packed grid (`.proj-hero-collage`, 8×6 cells desktop, 6×7 ≤900px, 4×8 ≤560px) of small tiles drawn from the project's gallery photos, with randomized tile spans (1–2 cols × 1–2 rows) and staggered `tileIn` scale animation. Tiles are clickable → open lightbox. **This is randomized per load in the prototype**; in Next.js you may seed it deterministically per slug to keep SSR stable (recommended), or build it client-side after mount.
2. **Title & meta** (`.proj-caption`) — category label, H1 (last word red italic), and a 4-col meta grid: Location, Year, Area, Status.
3. **Lede + body** (`.proj-body`, max-width 800px centered) — `lede-lg` lede, then a body paragraph: "Built with {materials}. Project lead: {lead}. Team: {team}."
4. **Flexible gallery** (`#gallery-host`) — photos grouped into sections (Exterior / Approach / Interior / Detail / Plan). Each section: a `.proj-section-head` (name · N photographs, NN / total in mono) + a 12-col `.flex-grid` whose cells get varying col-spans per a count→span layout function (1→[12], 2→[6,6], 3→[4,4,4], 4→[6,6,4,8], 5+→cycle `[8,4,4,4,4,6,6,12,7,5]`). Cells are clickable → lightbox; mono caption fades in on hover.
5. **Related** — 3 projects of the same `type` (fallback: next projects), 3-col grid of 4/5 cards.
6. **Next project** (`.next-proj-luxe`) — full-width 2-col band linking to the next project in the list; **hover turns the whole band dark** (#0c0c0c, white text), title (last word red italic), preview image scales, arrow nudges.

### 4. Studio — `app/studio/page.tsx` (`source/studio.html`)
- **About intro** (max-width 880px, centered): 3 paragraphs. Page-specific copy is inline in `studio.html` — note it names founders **Ar. Arpit Dutt and Ar. Radhika Dutt, firm set up 2014** (this differs from the marketing "Est. 1994 / 32 yrs" figures used elsewhere on the site — keep each page's copy as written unless the client reconciles them).
- **Founders** — 2-col, each: grayscale 4/5 portrait placeholder, name (first initial red italic), bio paragraph. Radhika Dutt + Arpit Dutt (full bios inline in source).
- **Team** — centered "Our Team" header (uppercase, .14em) + a 4-col grid (1/1 grayscale portraits) of 8 team members (names/roles inline in `studio.html` script).
- This page has page-scoped `<style>` for `.about-intro / .founders / .founder / .team-head / .team-grid-lg` — port these into the component/module.

### 5. Press — `app/press/page.tsx` (`source/press.html`)
- Page header: H1 "*Press* & recognition." + lede.
- "As featured in" eyebrow + the 4-col press-logo strip (`RA_PRESS_LOGOS`).
- "Full archive" — a list (`.press-list`) of `RA_PRESS` sorted by year desc. Each row: index (mono), publication (with small thumbnail) , piece title, year, "Read →" external link. Grid columns `60px 1.2fr 2fr 120px 100px`; collapses on mobile.

### 6. Careers — `app/careers/page.tsx` (`source/careers.html`)
- Page header: H1 "*Join* the studio." + lede.
- Full-width 21:9 "studio-life" cover placeholder (`teak interior`).
- "Open positions · 4" eyebrow + h-luxe. **4 job rows** (`.career-list .job`) — content is hard-coded inline in `careers.html`: Senior Architect (Ahmedabad), Interior Designer (Mumbai), Architectural Assistant (Ahmedabad), Internship · 6 months. Each row: title + description + two tag columns + red arrow; links to a `mailto:` with a prefilled subject. Hover indents the row (`padding-left:16px`) and reddens the title.
- "Why work here" closing block — 2-col h-luxe + paragraph.

### 7. Contact — `app/contact/page.tsx` (`source/contact.html`)
- Page header: H1 "*Write* to us." + lede.
- **2-col grid** (`.contact-grid`):
  - **Left (info):** eyebrow, large mailto `hello@radesignstudio.in` (clamp 32–56px), a 2-col **channels grid** (4 cards: new-project email, WhatsApp `wa.me/917600602008`, phone `tel:`, press email), then address blocks: Studio hours, Studio · Oasis (Ahmedabad), Mumbai, Bengaluru.
  - **Right (form):** card on `--paper-2`, "Start an enquiry" — fields: Name, Email, Project type (select), Site location, message textarea, red submit button. **On submit:** `preventDefault`, disable all fields, swap button text to "Enquiry sent ✓", reveal a thank-you line. (No backend — replicate as client-side; wire to a real endpoint/Server Action if desired.)
- **Map section** — head "Find the *studio*." + address + "Get directions →" (Google Maps dir link), then a 16:7 Google Maps `<iframe>` embed (Shilaj Ranchharda Road, Ahmedabad 380059), grayscaled, de-saturates to color on hover. Page-scoped `<style>` for `.map-*` — port it.

---

## Interactions & Behavior (global)
From `source/assets/site.js`:
- **Lenis smooth scroll** — see config above.
- **Scroll reveals** — elements with `.reveal` start at `opacity:0; translateY(28px)` and transition in (1.2s) when they enter the viewport (IntersectionObserver, threshold 0.08, rootMargin `0px 0px -4% 0px`). `.img-mask` elements wipe a paper-colored cover off (`scaleX` from 1→0, 1.4s) on reveal. `.stagger > *` children get incremental 80ms delays. Build a `<Reveal>` client component (or a small hook) to replicate. **Respect `prefers-reduced-motion`** — show end-state immediately.
- **Nav auto-hide** — see Nav.
- **Parallax** — elements with `data-parallax` get a gentle translateY based on viewport position (factor in the attribute). Minor; optional.
- **Lightbox** (project page) — clicking any gallery tile/cell opens a fullscreen lightbox (`rgba(8,8,8,.96)`) showing that image; prev/next buttons + Arrow keys cycle, Esc / backdrop-click / Close button dismiss. While open, `body` overflow is hidden and Lenis is stopped. Counter (NN / NN) bottom-left, caption bottom-center.
- **Testimonial carousel** — prev/next + 8s auto-rotate, .5s opacity crossfade.
- **Work filter** — client-side filter of the project list by type.
- **Contact form** — client-side fake submit (see above).
- **All transitions use the `--ease` cubic-bezier and durations noted in `site.css`.**

---

## Imagery (IMPORTANT)
The prototype has **no real photos**. Every image is a CSS-drawn placeholder: a `<div class="ph {material}">` that `site.js` hydrates with gradient "layers" (sky / ground / volume / openings). Materials/moods are CSS classes: `basalt, teak, stone, concrete, clay, shadow, lime, ochre, ivory, slate, marsh, terrazzo, brass, linen`, plus modifiers `interior` and `plan`.

For the Next.js build:
- Replace placeholders with `next/image`. Each project in the data model should gain an `images: string[]` (or a structured gallery) field; the gallery generator currently fabricates a photo list per project (`RA_PROJECT_GALLERY`) using these material swatches — port it so it can map to **real image URLs** when supplied, falling back to the swatch placeholder when not.
- Keep a `<Placeholder material="basalt" variant="interior|plan" />` component as the graceful fallback so layouts hold before photos are delivered.
- Logos in `source/assets/`: `logo-full.png` (nav), `logo-mark.png`, `logo-ra.png` (favicon), `logo-ra.jpg`. Use `logo-full.png` in the nav, `logo-ra.png` as the favicon.
- The client also uploaded some real images in `source/uploads/` (a studio photo + pasted reference images) — these are references, not yet wired into the layout. Confirm with the client which are production-ready.

---

## Data Model (port of `assets/data.js`)
Type these in `lib/projects.ts`.

```ts
type Project = {
  slug: string; title: string; type: string; year: number;
  location: string; area: string; status: "Built" | "In progress";
  swatch: string;            // material placeholder key (until real photos)
  overlay: string;
  lede: string;
  materials: string[];
  credits: { lead: string; team?: string; landscape?: string; photo?: string };
};
type Service = { n: string; t: string; d: string; projects: number };
type ProcessStep = { n: string; t: string; d: string };
type Testimonial = { quote: string; name: string; role: string };
type Press = { title: string; piece: string; year: number; url: string; thumb: string };
```
- `PROJECTS` — 20 entries (full content in `source/assets/data.js`).
- `SERVICES` — 6 (Residential, Commercial, Hospitality, Interiors, Landscape, Planning).
- `PROCESS` — 4 steps.
- `TESTIMONIALS` — 3.
- `PRESS` — 6 entries; `PRESS_LOGOS` — 8 names.
- `JOURNAL` — 8 entries (not currently rendered on any page; keep for a future blog).
- `projectGallery(project)` — deterministic-per-slug generator returning `{section, swatch, ratio, caption}[]`; used by the project hero collage + flexible gallery. Port verbatim, then extend to accept real images.

---

## Files (in `source/`)
- `index.html` — Home
- `work.html` — Work index
- `project.html` — Project detail (query-string `?p=slug` → convert to `/work/[slug]`)
- `studio.html` — Studio / About (has page-scoped `<style>`)
- `press.html` — Press
- `careers.html` — Careers (job content hard-coded inline)
- `contact.html` — Contact (has page-scoped `<style>`)
- `assets/site.css` — **the canonical design system / all styles** (912 lines)
- `assets/site.js` — runtime: Lenis, reveals, nav-hide, parallax, placeholder hydration
- `assets/data.js` — all content/data + gallery generator
- `assets/partials.js` — shared nav + footer markup
- `assets/logo-full.png`, `logo-mark.png`, `logo-ra.png`, `logo-ra.jpg` — brand assets
- `uploads/` — client-supplied reference images (not yet wired in)

A developer who wasn't in this conversation should be able to build the full site from this README + the `source/` files. When a detail isn't spelled out here, **`site.css` and the page HTML are authoritative.**
