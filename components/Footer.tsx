"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { InstagramIcon } from "@/components/Icons";
import type { AdminSettings } from "@/lib/admin/settings";

/**
 * Shared dark footer. Studio address, contact details and social links are the
 * real R.A. Design Studio details.
 */
export function Footer({ settings }: { settings: AdminSettings }) {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/admin")) return null;
  return (
    <footer className={`footer${pathname === "/" ? " footer-home" : ""}`}>
      <div className="container">
        <div className="top">
          <div>
            <h5>Studio</h5>
            <div className="addr">
              {settings.addressLines.map((line) => <span key={line}>{line}<br /></span>)}
            </div>
          </div>
          <div>
            <h5>Contact</h5>
            <ul>
              <li>
                <a href={`mailto:${settings.email}`}>{settings.email}</a>
              </li>
            </ul>
          </div>
          <div>
            <h5>Navigate</h5>
            <ul>
              <li><Link href="/work">Work</Link></li>
              <li><Link href="/studio">Studio</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h5>Follow</h5>
            <ul>
              <li>
                <a
                  href={settings.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  <InstagramIcon size={15} /> Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="bottom">
          <span>Est. {settings.foundingYear} · © {new Date().getFullYear()} {settings.siteName}</span>
          <span>{settings.city}, {settings.country}</span>
        </div>
      </div>
    </footer>
  );
}
