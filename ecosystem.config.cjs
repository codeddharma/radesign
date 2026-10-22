/**
 * PM2 process definition for the R.A. Design Studio website.
 *
 *   pm2 start ecosystem.config.cjs     # first run
 *   pm2 reload radesign                # after a rebuild
 *   pm2 logs radesign
 *
 * Normally invoked through scripts/deploy.sh, which rebuilds and reloads in the
 * right order. Use this file directly only to start an already-built checkout.
 *
 * `.cjs` because the package is not an ES module and PM2 requires CommonJS here.
 *
 * Pick ONE process manager. The systemd unit in DEPLOYMENT.md section 6 and
 * this file both bind the same port, so whichever starts second dies with
 * EADDRINUSE. Disable the unit before using PM2:
 *   sudo systemctl disable --now radesign
 */
// Default 3535 rather than Next's 3000, which is commonly already taken on a
// shared box. scripts/deploy.sh exports PORT before invoking pm2, so the port
// the app binds and the port the deploy health-checks cannot drift apart.
const PORT = process.env.PORT || "3535";

module.exports = {
  apps: [
    {
      name: process.env.APP_NAME || "radesign",
      // Run Next directly rather than through `npm run start`. An npm wrapper
      // would make PM2 signal the npm process, not the server, so reloads and
      // stops would not drain connections cleanly.
      script: "node_modules/next/dist/bin/next",
      interpreter: "node",
      args: `start -H 127.0.0.1 -p ${PORT}`,
      // This file sits in the application root, so __dirname is that root. It
      // therefore follows the checkout instead of assuming /srv/radesign.
      cwd: process.env.APP_DIR || __dirname,

      // One fork on a 1 vCPU box. Next reads .env.local itself from cwd, which
      // is why no secrets appear in this file. To scale on a larger instance,
      // switch to exec_mode "cluster" and raise instances; Next supports it.
      instances: 1,
      exec_mode: "fork",

      env: {
        NODE_ENV: "production",
        // Next honours PORT too; keeping it equal to the -p flag means the two
        // cannot disagree.
        PORT,
        // next.config.mjs reads `process.env.NEXT_DIST_DIR || ".next"`. PM2
        // inherits the invoking shell's environment, so an exported
        // NEXT_DIST_DIR left over from a dev preview would otherwise make
        // production serve the wrong build directory. Empty is falsy, so this
        // pins it back to .next without special-casing anything.
        NEXT_DIST_DIR: "",
      },

      autorestart: true,
      restart_delay: 5000,        // matches RestartSec=5 in the systemd unit
      max_restarts: 10,
      // Atlas or Cloudinary being briefly unreachable should not turn into a
      // restart loop that hammers them; back off instead.
      exp_backoff_restart_delay: 1000,

      // Next needs a moment to finish in-flight requests. The default 1.6s can
      // cut off a response mid-flight on reload.
      kill_timeout: 10000,
      listen_timeout: 10000,

      // The app idles near 200 MB; 1 GB means a genuine leak restarts it well
      // before the 4 GB box starts swapping.
      max_memory_restart: "1G",

      time: true,                 // timestamp every log line
      merge_logs: true,
    },
  ],
};
