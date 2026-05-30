# Generation Fail Fix — deep analysis & proposed solutions

Branch: `generation-fail-fix`
Date: 2026-05-30
Scope: premium natal full-reading generation (`/api/reading/generate-full` → `runNatalCall2`)

---

## 1. The two reported failures

| | `besotest@gmail.com` | `bogpremium@gmail.com` |
|---|---|---|
| Reading row | `4c39941e…` slug `wjpd1nch` | `7f1cd902…` slug `bayl34hl` |
| Created | 2026-05-29 10:42 | 2026-05-29 12:56 |
| Call 1 (`analysis_en`) | ✅ 21,271 chars, gemini-2.5-flash | ✅ 23,324 chars, gemini-2.5-flash |
| Call 2 KA (`reading_ka`) | ❌ **never written** | ⚠️ **written but skeletal** |
| `model_call2` / `prompt_version` | null / null | gemini-2.5-flash / i13 |
| `tokens_call2_ka` | null | 15,814 (normal ≈ 36k) |
| KA cards / section (min) | — | overview 2(3), mission **1**(4), char 2(4), rel 2(4), work 2(4), shadow 2(4), spiritual 2(4), potential 2 |
| KA word estimate | — | ~2,276 (target 5,000–5,500) |
| EN reading | not generated | ✅ healthy (28 cards) |

Two **different symptoms, one root region**: the Georgian Call 2 on `gemini-2.5-flash` is the weak link, and the pipeline has **no enforced definition of "done"** and **no durable failure/recovery path**.

- **besotest = HARD fail.** Call 2 threw or hit the 300s Vercel limit *before* the upsert at [generate-full/route.ts:115](../app/api/reading/generate-full/route.ts). Nothing saved → row stuck at "Call-1-only". The user sat on `/loading` until the 15-min client poll cap, then saw "Generation timed out."
- **bogpremium = SILENT fail.** Gemini returned a *short but structurally valid* JSON: all 8 section keys present, but 1–2 cards each. It **passed validation** because thin sections are only *warnings*, and saved. The user was redirected to a hollow Georgian reading (English was fine).

## 2. Fleet-wide context (prod, 256 rows)

- Premium full-reading success: **144 complete / 167 attempts ≈ 86%**.
- **23 stuck premium rows** (Call-1-only, like besotest) — the hard-fail bucket, ~14%.
- Of the 144 saved KA readings: **102 healthy (27+ cards), 38 marginal (18–26), 4 broken (<18 or missing)**. Only **bogpremium is a recent** broken row; the other 3 are March test accounts. Silent-fail ≈ 2.8%.
- **Every** completed premium reading used `gemini-2.5-flash` (or `fake`) — `ANTHROPIC_API_KEY` is **not set on Vercel**, so [client.ts](../lib/AIgeneration/client.ts) always uses the Gemini fallback. The preferred Claude path never runs in prod.

## 3. Root-cause chains

### 3a. Hard fail (besotest)
1. `generate-full` fire-and-forgot by [LoadingRouteClient.tsx:224](../components/LoadingRouteClient.tsx); nobody reads its HTTP response.
2. `runNatalCall2` runs KA+EN in parallel ([pipeline.ts:98](../lib/AIgeneration/pipeline.ts)). KA `maxTokens=32000`, fed a 21k-char analysis → long, slow Georgian output.
3. Either (a) Gemini exceeds the **300s** function budget → Vercel kills the invocation, or (b) KA truncates → `parseOrRepairJSON` repair pass (extra Gemini call) → maybe `completeMissingNatalSections` (another call) → still invalid → throw → **one retry** (`MAX_RETRIES=1`) repeats the whole expensive chain → blows 300s.
4. Either way the **upsert never runs**. `reading_ka`/`model_call2`/`prompt_version` stay null. ✔ matches DB.

Contributing gaps:
- **No durable failure state.** `generate-full`'s catch only `console.error`s; the `generation_status`/`generation_finished_at` columns exist in prod but are **never written**. `onboarding/status` therefore can only ever report `generating`, so the client waits the full 15 min instead of failing fast.
- **No recovery.** The stuck row sits forever; nothing re-runs Call 2.

### 3b. Silent fail (bogpremium)
1. Gemini returns valid JSON with all 8 keys but ~half the content (15 cards, ~2,276 words, finishReason = STOP — the model just stopped short, not truncated).
2. `parseOrRepairJSON` succeeds (valid JSON, no repair).
3. `validateNatalReading` ([validator.ts:295](../lib/AIgeneration/validator.ts)): all keys present → **no errors**; thin cards + low word count → **warnings only** → `valid = true`.
4. No retry fires (retry only triggers on `!valid`; section-completion only on *missing* sections, not *thin* ones). The skeletal KA is upserted. ✔ matches DB (warnings stored, reading saved).
5. KA and EN are generated **independently with no cross-check**, so EN can be full while KA is hollow.

Contributing gaps:
- **Quality floor is advisory, not enforced.** "Section below min cards" and "word count far below target" never block a save.
- **No KA/EN parity check.**
- **`generate-full` is idempotent on `reading_ka` existence** ([generate-full/route.ts:62](../app/api/reading/generate-full/route.ts)). bogpremium *has* a `reading_ka`, so re-running returns `complete` without regenerating — **there is no supported way to fix a bad reading** short of nulling the column.

### 3c. The unifying defect
The system's "definition of done" is simply *"`reading_ka` is non-null"* (see `onboarding/status` and `generate-full` idempotency). That single check is:
- **too weak for besotest** — it's never true, so the user waits 15 min with no failure signal;
- **too weak for bogpremium** — it's true for a hollow reading, so a broken reading reports complete.

---

## 4. Proposed solutions (tiered)

### Tier 0 — Recover the two affected users (data, immediate)
- **besotest**: re-run Call 2 only (Call 1 analysis intact). Either user re-visits `/loading?mode=generate-full` (works today — `generate-full` skips Call 1) **or** a one-off admin script.
- **bogpremium**: blocked by the idempotency check — must **null `reading_ka`/`reading_en`/`model_call2`** first (or add a `?force=1`), then re-run Call 2.
- Needs a deliberate decision: real Gemini API spend + a prod write. See `scripts/diag-*.mjs` for read-only inspection.

### Tier 1 — Enforce a quality floor (kills the silent fail) ★ highest value / lowest risk
In `validateNatalReading`, promote gross shortfalls from *warning* → *error*:
- total cards `< N` (e.g. 18), **or** `> K` sections below their min (e.g. ≥4), **or** word estimate `< 3500` → `valid = false`.
- Keep minor shortfalls (the 38 "marginal" readings) as warnings so we don't over-trigger.

This makes the existing retry path fire. To avoid blowing the budget on full regens, add a **"thicken thin sections"** completion analogous to `completeMissingNatalSections` — ask the model to add cards only to under-filled sections, then re-validate. Cheaper than a full re-run.

Add a **KA/EN parity guard**: if one language's total card count is `< 60%` of the other's, treat the smaller as invalid → retry/thicken.

### Tier 2 — Durable failure state + fail-fast (kills the 15-min hang)
Re-activate the dormant `generation_*` columns:
- `generate-full`: set `generation_status='generating'` + `generation_started_at` at start; on success `='complete'` + `generation_finished_at`; in the catch, **`='failed'`** + persist the error message + `generation_finished_at` **before** rethrowing.
- `onboarding/status`: read `generation_status`; return `status:'failed'` (+ error) when failed. **The client already handles `status==='failed'`** ([LoadingRouteClient.tsx:90,332](../components/LoadingRouteClient.tsx)) — this alone converts a 15-min silent wait into an immediate, explainable failure with a Retry button.
- Note the stale comment at [onboarding/status/route.ts:50](../app/api/onboarding/status/route.ts) ("columns were removed") — they exist in prod; just unused.

### Tier 3 — Detect Gemini truncation explicitly
`client.ts` ignores Gemini's `finishReason`. If `finishReason === 'MAX_TOKENS'`, the output was truncated → throw a typed error so the pipeline retries instead of feeding a guaranteed-broken string into the repair cascade. (Catches besotest-style truncation; does **not** catch bogpremium's early STOP — Tier 1 covers that.)

### Tier 4 — Provider / config robustness
- **Set `ANTHROPIC_API_KEY` on Vercel.** The code already prefers Claude; Sonnet is materially more reliable for long structured Georgian JSON. Weigh cost/latency, but this likely removes most of both failure modes. Consider Claude-for-KA / Gemini-for-EN as a hybrid.
- Make `MAX_RETRIES` and token caps env-tunable so we can react without a deploy.

### Tier 5 — Recovery sweep + regenerate affordance (durability)
- A small admin/cron route that finds rows where `analysis_en` present but `reading_ka` null/skeletal (or `generation_status='generating'` older than ~10 min) and re-runs Call 2. Turns "stuck forever" into "self-heals."
- An owner-facing **"regenerate reading"** button hitting `generate-full?force=1` (which clears the old body first) — the supported fix for a bad reading.

### Tier 6 — Reduce Call 2 input pressure (larger refactor, optional)
The 21–23k-char Call 1 analysis inflates Call 2 input → longer/slower KA output, closer to the timeout. Options: trim/summarize the analysis before Call 2, or generate Call 2 **per section** with per-section retry so no single request risks the whole reading.

---

## 5. Recommended sequencing
1. **Tier 2** (fail-fast) + **Tier 1** (quality floor) — together they convert both silent and hard fails into a visible, retryable state and stop hollow readings from saving. Low risk, high value.
2. **Tier 0** — recover besotest & bogpremium once Tier 1/2 are in (so the re-run is gated by the new floor).
3. **Tier 4** (Anthropic key) — biggest reliability lever; config-only.
4. **Tier 3 / 5 / 6** as follow-ups.

## Appendix — read-only diagnostics (in `scripts/`)
- `analyze-generations.mjs` — fleet outcome breakdown + token distribution.
- `diag-user.mjs <email>` — one user's row: sections, card counts, tokens, warnings.
- `diag-stuck.mjs` — 40 most recent readings with owner + complete/stuck/empty state.
- `diag-thin.mjs` — health buckets (healthy / marginal / broken) across all saved KA readings.
