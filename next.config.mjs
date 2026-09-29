/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next", // lets a dev preview run beside the live build
  // Careers page removed; keep old links working.
  async redirects() {
    return [{ source: "/careers", destination: "/contact", permanent: false }];
  },
};

export default nextConfig;
