import type { NextConfig } from "next";
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

const nextConfig: NextConfig = {
  turbopack: {
    root: PROJECT_ROOT,
  },
};

export default nextConfig;
