// URLs for the app-runtime scripts. In production builds the npm
// `prebuild` step (scripts/build-runtime.mjs) emits minified artifacts and
// next.config.ts inlines their content hash as NEXT_PUBLIC_RUNTIME_V; the
// ?v= query makes the immutable-cached URL change exactly when the content
// does. An empty hash (dev, or a build without prebuild) falls back to the
// raw sources, which are served with must-revalidate.
const V = process.env.NEXT_PUBLIC_RUNTIME_V || '';

export const RUNTIME_CORE_SRC = V
  ? `/app-runtime.min.js?v=${V}`
  : '/app-runtime.js';

// /loading gets its own slim chunk (~21 KB instead of the full core) — the
// loading screen is the most latency-sensitive moment. The chunk signals
// runtime-readiness itself (see public/runtime-loading.js).
export const RUNTIME_LOADING_SRC = V
  ? `/runtime-loading.min.js?v=${V}`
  : '/runtime-loading.js';
