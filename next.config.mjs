/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next", // lets a dev preview run beside the live build
  images: {
    // Hostname-only on purpose. remotePatterns is baked in at build time, but it
    // matches by pattern rather than by file, so this one entry covers every
    // image uploaded through /admin afterwards — that is what lets new uploads
    // appear on the public site with no rebuild. Narrowing it to a per-folder
    // pathname would 400 any upload outside that folder.
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  // Careers page removed; keep old links working.
  async redirects() {
    return [{ source: "/careers", destination: "/contact", permanent: false }];
  },
};

export default nextConfig;
