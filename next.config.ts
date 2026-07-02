import type { NextConfig } from "next";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Pin Turbopack's workspace root to this project. Without it, the orphan
// /Users/daviddolidze/package-lock.json makes Next infer the home directory
// as the root, which causes Turbopack to walk every sibling project's
// node_modules on cold compile (60s+ hangs on `Compiling /`).
// Doc: node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/turbopack.md
//
// We use `fileURLToPath(import.meta.url)` rather than `import.meta.dirname`
// because Next's TS-config loader was producing a 404 on every nested route
// (`/auth`, `/api/*`) when `dirname` was used directly — the explicit ESM
// pattern resolves consistently across Next's config-loader compilation modes.
const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url));

// Content hash of the app-runtime assets, produced by the npm `prebuild`
// step (scripts/build-runtime.mjs) into public/runtime-manifest.json. Empty
// string = dev, or a build where prebuild didn't run — pages then reference the
// raw must-revalidate sources instead of the hashed immutable artifacts
// (degrades gracefully, never 404s). Reading the manifest instead of recomputing
// keeps the ?v= URL and the __RUNTIME_V__ stamped inside the emitted core from
// ever diverging.
function runtimeV(): string {
  try {
    if (process.env.NODE_ENV !== "production") return "";
    const manifest = path.join(PROJECT_ROOT, "public", "runtime-manifest.json");
    const minCore = path.join(PROJECT_ROOT, "public", "app-runtime.min.js");
    if (!existsSync(manifest) || !existsSync(minCore)) return "";
    return String(JSON.parse(readFileSync(manifest, "utf8")).v ?? "");
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  turbopack: {
    root: PROJECT_ROOT,
  },
  env: {
    NEXT_PUBLIC_RUNTIME_V: runtimeV(),
  },
  // Runtime assets live in /public at fixed URLs, so caching must be explicit.
  //  - Raw sources: fallback for stale HTML from older deploys (and dev). A
  //    browser holding an old copy across deploys silently misses fixes (new
  //    hashed CSS + stale JS = jank), so force revalidation: 304 when
  //    unchanged, fresh bytes the moment we redeploy.
  //  - .min artifacts: only ever referenced with ?v=<content-hash> (headers()
  //    source matching ignores query strings), so they may be cached forever —
  //    a new deploy that changes them changes the URL.
  async headers() {
    const raw = [
      '/app-runtime.js',
      '/runtime-extras.js',
      '/runtime-loading.js',
      '/runtime-interp.json',
    ];
    const hashed = [
      '/app-runtime.min.js',
      '/runtime-extras.min.js',
      '/runtime-loading.min.js',
      '/runtime-interp.min.json',
    ];
    return [
      ...raw.map((source) => ({
        source,
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      })),
      ...hashed.map((source) => ({
        source,
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      })),
    ];
  },
};

export default nextConfig;
