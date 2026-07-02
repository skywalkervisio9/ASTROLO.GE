// Emits minified, version-stamped copies of the prototype-runtime assets into
// /public. Runs as npm "prebuild", so `npm run build` (locally and on Vercel)
// regenerates them before `next build` reads runtime-manifest.json.
//
// Invariants this script must uphold:
//  - Global identifiers are NEVER renamed (inline onclick="..." strings in
//    runtime-generated HTML and React's proto().fn?.() calls resolve runtime
//    functions by their global names) -> minifyWhitespace/minifySyntax only.
//  - No syntax downleveling (no `target`): the source must pass through as-is.
//  - The ?v= hash in page URLs (next.config.ts env) and the __RUNTIME_V__
//    stamped inside the emitted core must never diverge -> both come from the
//    single hash computed here and written to runtime-manifest.json.
//  - Chunk files must not declare top-level let/const: a name collision with a
//    core binding is a SyntaxError that kills the whole chunk script.
import { transform } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = (f) => path.join(ROOT, 'public', f);

// isChunk: evaluated lazily alongside an already-evaluated core script, so
// top-level let/const are forbidden (see invariant above).
const JS_SOURCES = [
  { file: 'prototype-runtime.js', isChunk: false },
  { file: 'runtime-extras.js', isChunk: true },
  { file: 'runtime-loading.js', isChunk: true },
];
const JSON_SOURCES = ['runtime-interp.json'];

// Spot checks of the global contract: these exact substrings must survive in
// the emitted files. A miss means something got renamed/dropped -> fail build.
const REQUIRED_SUBSTRINGS = {
  'prototype-runtime.js': [
    'function switchView',
    'function setLang',
    'function hydrateReading',
    'function renderMiniChart',
    'function go(',
    'function toggleExp',
    'function openAspInterp',
    'function _withInterp',
    'function _loadChunk',
    'function generateInviteLink',
    'astrolo:runtime-ready',
  ],
  'runtime-extras.js': [
    'function showPaymentPage',
    'function openInviteModal',
    'function shareReading',
    'function shareToSocial',
    'function unlockFullReading',
  ],
  'runtime-loading.js': [
    'function startLoading',
    'astrolo:runtime-ready',
  ],
};

const sources = new Map(
  [...JS_SOURCES.map((s) => s.file), ...JSON_SOURCES].map((f) => [f, readFileSync(pub(f), 'utf8')]),
);

const hash = createHash('sha256');
for (const [, text] of sources) hash.update(text);
const v = hash.digest('hex').slice(0, 10);

for (const { file, isChunk } of JS_SOURCES) {
  const src = sources.get(file);
  if (isChunk && /^(let|const)\s/m.test(src)) {
    throw new Error(`${file}: top-level let/const found in a chunk file — would collide with core bindings and kill the script`);
  }
  const stamped = src.replaceAll('__RUNTIME_V__', v);
  const { code } = await transform(stamped, {
    loader: 'js',
    minifyWhitespace: true,
    minifySyntax: true,
    charset: 'utf8',
  });
  if (code.includes('__RUNTIME_V__')) throw new Error(`${file}: unreplaced __RUNTIME_V__ in output`);
  for (const needle of REQUIRED_SUBSTRINGS[file] ?? []) {
    if (!code.includes(needle)) throw new Error(`${file}: required substring missing after minify: "${needle}"`);
  }
  const out = file.replace(/\.js$/, '.min.js');
  writeFileSync(pub(out), code);
  console.log(`${out}: ${src.length} -> ${code.length} bytes`);
}

for (const file of JSON_SOURCES) {
  const compact = JSON.stringify(JSON.parse(sources.get(file)));
  const out = file.replace(/\.json$/, '.min.json');
  writeFileSync(pub(out), compact);
  console.log(`${out}: ${sources.get(file).length} -> ${compact.length} bytes`);
}

writeFileSync(pub('runtime-manifest.json'), JSON.stringify({ v }) + '\n');
console.log(`runtime-manifest.json: v=${v}`);
