import { HeroCarousel } from "@/components/home/HeroCarousel";
import type { AdminSettings } from "@/lib/admin/settings";

export function Hero({ settings }: { settings: AdminSettings }) {
  return (
    <section className="hero">
      <div className="hero-media">
        <HeroCarousel images={settings.heroImages} />
      </div>
      <h1 className="sr-only">{settings.siteName}</h1>
    </section>
  );
}
