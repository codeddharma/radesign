/**
 * Central site constants. Single source of truth for SEO metadata, structured
 * data and absolute-URL construction. Import everywhere instead of hardcoding
 * the studio's facts.
 */

export const SITE_URL = "https://radesign.info";

export const SITE_NAME = "R.A. Design Studio";

/** Keyword-rich, ≤160 chars, includes "Ahmedabad". */
export const DEFAULT_DESCRIPTION =
  "R.A. Design Studio is an architecture, interiors, landscape & planning practice in Ahmedabad, founded 2014 by Radhika & Arpit Dutt.";

export const KEYWORDS: string[] = [
  "architecture studio Ahmedabad",
  "architects in Ahmedabad",
  "interior designers Ahmedabad",
  "landscape design Ahmedabad",
  "R.A. Design Studio",
  "RA Design Studio",
  "residential architecture",
  "commercial architecture Gujarat",
];

export interface StudioFounder {
  name: string;
}

export interface StudioInfo {
  name: string;
  legalName: string;
  street: string;
  locality: string;
  region: string;
  postalCode: string;
  country: string;
  phones: string[];
  email: string;
  instagram: string;
  latitude: number;
  longitude: number;
  foundingDate: string;
  founders: StudioFounder[];
}

export const STUDIO: StudioInfo = {
  name: SITE_NAME,
  legalName: "RA Design Studio",
  street: "B-1103, Swati Trinity, Near Shanti Pura Circle, Sardar Patel Ring Road",
  locality: "Ahmedabad",
  region: "Gujarat",
  postalCode: "380051",
  country: "IN",
  phones: ["+91 97268 85545", "+91 96870 18866"],
  email: "contact@radesign.info",
  instagram: "https://www.instagram.com/radesign_ahmedabad/",
  latitude: 23.0476,
  longitude: 72.4585,
  foundingDate: "2014",
  founders: [{ name: "Radhika Dutt" }, { name: "Arpit Dutt" }],
};

/** Resolve a site-relative path to an absolute URL on the production origin. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}
