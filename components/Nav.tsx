"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/work", label: "Work" },
  { href: "/studio", label: "Studio" },
  { href: "/contact", label: "Contact" },
] as const;

/**
 * Fixed translucent header. Active link is derived from the current route
 * (replaces the original `window.__page.active` flag). The auto-hide-on-scroll
 * behaviour lives in RevealController, which toggles `.nav-hidden`.
 *
 * Under 600px the inline links collapse into a full-screen menu (audit #6). The
 * overlay is a SIBLING of <nav> — not a child — because the nav's transform /
 * backdrop-filter would otherwise trap a position:fixed descendant inside the
 * nav's box instead of the viewport.
 */
export function Nav() {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  // Close the mobile menu whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  // While open: lock body scroll and close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (pathname.startsWith("/admin")) return null;

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <nav className={`nav${open ? " nav-open" : ""}`}>
        <Link href="/" className="brand" aria-label="R.A. Design Studio, home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full.png" alt="R.A. Design Studio" className="brand-logo" />
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="nav-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className="nav-links">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={isActive(link.href) ? "active" : ""}>
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Full-screen mobile overlay — sibling of <nav>, shown only under 600px. */}
      <div id="nav-menu" className={`nav-mobile${open ? " open" : ""}`}>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={isActive(link.href) ? "active" : ""}
            onClick={() => setOpen(false)}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </>
  );
}
