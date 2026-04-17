# ASTROLO.GE — Developer Guide

> System architecture reference for building and maintaining the application.
> Last updated: 2026-03-26

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Directory Structure](#2-directory-structure)
3. [Database Schema](#3-database-schema)
4. [Authentication Flow](#4-authentication-flow)
5. [Account Tier System](#5-account-tier-system)
6. [Claude AI Pipeline](#6-claude-ai-pipeline)
7. [Synastry Pipeline](#7-synastry-pipeline)
8. [Invite System](#8-invite-system)
9. [Payment System](#9-payment-system)
10. [Content Gating](#10-content-gating)
11. [Bilingual System](#11-bilingual-system)
12. [Component Architecture](#12-component-architecture)
13. [API Routes Reference](#13-api-routes-reference)
14. [Environment Variables](#14-environment-variables)
15. [Generation Timing](#15-generation-timing)
16. [Dev Mode & Testing](#16-dev-mode--testing)

---

## 1. Architecture Overview

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Browser    │────▶│  Next.js 16.2.1  │────▶│   Supabase      │
│  React 19    │     │  API Routes      │     │  (PostgreSQL)   │
│  TypeScript  │     │  (BFF pattern)   │     │  Auth + RLS     │
└─────────────┘     └──────┬───────────┘     └─────────────────┘
                           │
                    ┌──────┴───────┐
                    │              │
              ┌─────▼──────┐ ┌────▼──────────┐
              │ Astrologer │ │ Claude API    │
              │ API        │ │ (Anthropic)   │
              │ (RapidAPI) │ │ sonnet-4      │
              └────────────┘ └───────────────┘
```

**Key principle:** All API keys are server-side only. Client never touches external services directly. Supabase anon key is public by design (RLS enforces access).

---

## 2. Directory Structure

```
ASTROLO.GE/
├── app/
│   ├── layout.tsx              # Root layout (fonts, metadata)
│   ├── page.tsx                # Home (renders PrototypeClient)
│   ├── globals.css             # Global styles (61 KB)
│   ├── inv/[code]/page.tsx     # Invite redirect → /auth?invite=CODE
│   └── api/
│       ├── auth/callback/      # OAuth exchange
│       ├── chart/generate/     # Full natal pipeline
│       ├── reading/
│       │   ├── natal/          # GET reading (respects tier gating)
│       │   └── section-pick/   # POST free section choice
│       ├── invite/
│       │   ├── create/         # POST new invite code
│       │   ├── validate/[code] # GET validate code
│       │   └── accept/         # POST mark used
│       ├── payment/
│       │   ├── create/         # POST init bank session
│       │   ├── callback/       # GET bank redirect
│       │   └── webhook/        # POST bank async notify
│       ├── synastry/
│       │   ├── reading/[id]    # GET synastry reading
│       │   └── connections/    # GET user's connections
│       └── user/
│           ├── profile/        # GET profile + tier
│           └── language/       # PATCH language pref
│
├── components/
│   ├── BodyContent.tsx         # Full UI prototype (163 KB, inline HTML)
│   ├── PrototypeClient.tsx     # Client wrapper + runtime script
│   ├── ReadingRenderer.tsx     # ★ Claude JSON → card UI bridge
│   ├── SynastryRenderer.tsx    # ★ Synastry JSON → card UI
│   ├── SectionPicker.tsx       # ★ Free section selection (loading screen)
│   └── svg/GlyphDefs.tsx       # SVG symbol definitions
│
├── hooks/
│   ├── useAuth.ts              # Auth state + user profile
│   ├── useReading.ts           # Fetch natal reading
│   └── useSynastry.ts          # Fetch synastry connections
│
├── lib/
│   ├── claude/
│   │   ├── client.ts           # Anthropic SDK wrapper
│   │   ├── pipeline.ts         # Two-call orchestration (natal + synastry)
│   │   ├── validator.ts        # JSON parsing + structure validation
│   │   └── prompts/
│   │       ├── natal.ts        # Loads from docs/SYSTEM-PROMPT-8SEC_i4.md
│   │       └── synastry.ts     # Loads from docs/SYSTEM-PROMPT-*_s3.md
│   ├── astrology/
│   │   ├── api.ts              # Astrologer API (RapidAPI)
│   │   └── chart-renderer.ts   # SVG coordinate math
│   ├── supabase/
│   │   ├── client.ts           # Browser client
│   │   ├── server.ts           # Server client (async cookies for Next.js 16)
│   │   └── middleware.ts       # Session refresh + auth redirect
│   ├── payment/                # TBC Pay + BOG iPay (TODO: full integration)
│   └── utils/
│       ├── translations.ts     # Bilingual UI label map
│       ├── constants.ts        # Icons, colors, zodiac/planet names
│       └── invite.ts           # Code generation (7-char alphanumeric)
│
├── types/
│   ├── user.ts                 # User, Payment, InviteCode, pricing, tier helpers
│   ├── reading.ts              # NatalReading, Card, PlanetRow, Aspect
│   ├── synastry.ts             # SynastryReading, SynastryCard, CategoryScore
│   ├── chart.ts                # BirthData, ChartData, PlanetPosition
│   └── api.ts                  # Request/response types for all routes
│
├── supabase/migrations/
│   ├── 001_users.sql           # User profiles + triggers
│   ├── 002_chart_data.sql      # Raw Astrologer API responses
│   ├── 003_natal_readings.sql  # Claude natal readings (KA + EN)
│   ├── 004_synastry.sql        # Connections + invite codes + readings
│   ├── 005_payments.sql        # Transaction history
│   └── 006_rls_policies.sql    # Row Level Security
│
├── docs/
│   ├── SYSTEM-ARCHITECTURE.md  # Original architecture spec
│   ├── SYSTEM-PROMPT-8SEC_i4.md    # Natal prompt (v4, iteration 4)
│   ├── SYSTEM-PROMPT-Couple_s3.md  # Couple synastry prompt (v3)
│   ├── SYSTEM-PROMPT-Friend_s3.md  # Friend synastry prompt (v3)
│   └── DEVELOPER-GUIDE.md     # ★ This file
│
├── middleware.ts               # Root middleware → Supabase session
├── .env.example                # Environment template
├── .gitignore
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## 3. Database Schema

7 tables in Supabase (PostgreSQL). RLS enabled on all.

### `users`
Primary user profile. Auto-created on Supabase Auth signup.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | FK → auth.users |
| `email` | text | From auth |
| `full_name` | text | Set during birth data |
| `avatar_letter` | text | Generated: first char of name |
| `birth_day` | smallint | 1-31 |
| `birth_month` | smallint | 1-12 |
| `birth_year` | smallint | 1930-2010 |
| `birth_hour` | smallint | null = unknown (noon chart) |
| `birth_minute` | smallint | |
| `birth_city` | text | Google Places |
| `birth_lat` / `birth_lng` | double | Coordinates |
| `birth_timezone` | text | IANA timezone |
| `gender` | text | female / male / non-binary |
| `account_type` | text | **free** / **premium** / **invited** |
| `natal_chart_unlocked` | boolean | For invited users (₾5 unlock) |
| `invite_slots_purchased` | integer | Additional paid slots |
| `free_section_pick` | text | One of 6 pickable sections |
| `language` | text | ka / en |

### `chart_data`
Raw Astrologer API response. One per user, immutable.

### `natal_readings`
Claude-generated readings. Bilingual (reading_ka + reading_en JSONB).

### `invite_codes`
Shareable 7-char codes. Single-use, tracks who used it.

### `synastry_connections`
Links two users. Status: pending → accepted → reading_generated.

### `synastry_readings`
Claude-generated synastry. Bilingual, stores compatibility scores.

### `payments`
Transaction log. TBC Pay or BOG iPay. Idempotency key prevents double-charge.

---

## 4. Authentication Flow

```
Google OAuth ──┐
               ├──▶ Supabase Auth ──▶ Auto-create users row ──▶ Birth Data Form
Email/Pass ────┘                                                       │
                                                                       ▼
                                                              Chart Generation
                                                              (45-65 seconds)
```

**Invite flow variant:** If signup URL has `?invite=CODE`, the code is validated and stored. After birth data submission, the user is set as `account_type='invited'` and synastry generation begins.

---

## 5. Account Tier System

| Tier | `account_type` | Natal Access | Synastry | Invite Slots |
|------|---------------|-------------|----------|--------------|
| **Free** | `free` | Overview + Mission + 1 pick | Locked | 0 |
| **Premium** | `premium` | All 8 sections | Unlocked | 1 free + ₾5 each |
| **Invited** | `invited` | Overview + Mission + 1 pick | Unlocked (auto) | 0 |
| **Invited+Unlocked** | `invited` + `natal_chart_unlocked=true` | All 8 sections | Unlocked | 0 |

### Pricing (GEL ₾)

| Product | Price | Trigger |
|---------|-------|---------|
| Premium upgrade | ₾15 | Locked section / synastry nav |
| Natal unlock (invited) | ₾5 | Locked section CTA |
| Invite slot (2nd+) | ₾5 | Invite modal |

---

## 6. Claude AI Pipeline — Natal

Two-call architecture. Both languages generated in parallel.

```
Astrologer API (2-5s) ──▶ Claude Call 1 (10-15s) ──┬──▶ Call 2 KA (30-50s)
                              English analysis       ├──▶ Call 2 EN (30-50s)
                              (internal doc)          │    (parallel)
                                                      ▼
                                                   Store both in
                                                   natal_readings
```

### Call 1 — Chart Analysis
- **Model:** claude-sonnet-4-20250514
- **Max tokens:** 3000
- **Output:** 13-section analytical document (English, internal)
- **Prompt source:** `docs/SYSTEM-PROMPT-8SEC_i4.md` Part A

### Call 2 — Full Reading (×2, parallel)
- **Model:** claude-sonnet-4-20250514
- **Max tokens:** 8192 each
- **Output:** JSON with 8 sections + meta
- **Prompt source:** `docs/SYSTEM-PROMPT-8SEC_i4.md` Parts B + C (language) + D (schema)

### 8 Sections

| # | Key | KA | EN | Min Cards | Free? |
|---|-----|----|----|-----------|-------|
| 1 | overview | მიმოხილვა | Overview | 3 | Always |
| 2 | mission | მისია | Mission | 4 | Always |
| 3 | characteristics | მახასიათებლები | Characteristics | 4 | Pickable |
| 4 | relationships | ურთიერთობები | Relationships | 4 | Pickable |
| 5 | work | საქმე | Work | 4 | Pickable |
| 6 | shadow | ჩრდილი | Shadow | 4 | Pickable |
| 7 | spiritual | სამშვინველი | Spiritual | 4 | Pickable |
| 8 | potential | სრულყოფილება | Potential | 2 | Pickable |

### Validation & Retries
- `lib/claude/validator.ts` checks: all 8 sections present, min card counts, word count estimate
- Max 2 retries on validation failure
- Warnings stored in DB but don't block saving

---

## 7. Synastry Pipeline

Two prompt variants: **Couple** (romantic) and **Friend** (platonic).

```
Both users' chart_data ──▶ Claude Call 1 (10-15s) ──┬──▶ Call 2 KA (30-50s)
                              Synastry analysis       ├──▶ Call 2 EN (30-50s)
                                                      ▼
                                                   synastry_readings
                                                   + update connection
                                                     status → reading_generated
```

**Trigger:** When invited user submits birth data, synastry generation starts automatically.

### Couple sections (8)
emotionalBond, passion, karmic, numerology, growth, shadow, dailyRitual, potential

### Friend sections (8)
emotionalBond, intellectualSynergy, karmic, numerology, growth, shadow, sharedAdventures, potential

**Key difference:** Friend variant frames Venus/Mars for values/drive, NOT romantic chemistry.

---

## 8. Invite System

```
Premium user → Choose couple/friend → Generate 7-char code
                                      → Create invite_codes row
                                      → Create synastry_connections (pending)
                                      → Copy link: astrolo.ge/inv/{code}

Invited user → Open link → /auth?invite=CODE → Signup → Birth data
                                                          → Chart generation
                                                          → Synastry generation
                                                          → Both can read
```

### Slot logic
```typescript
totalSlots = (premium ? 1 : 0) + invite_slots_purchased
availableSlots = totalSlots - usedCodes
canInvite = availableSlots > 0
```

---

## 9. Payment System

Two Georgian bank providers: **TBC Pay** and **BOG iPay**.

### Flow
1. User clicks payment CTA
2. `POST /api/payment/create` → creates pending `payments` row → returns bank redirect URL
3. User pays on bank-hosted page
4. Bank redirects to `/api/payment/callback?status=success&tx_id=...`
5. Server verifies with bank API
6. Updates `payments.status` → completed
7. Applies tier change (premium_upgrade / natal_unlock / invite_slot)

### Security
- PCI compliance: bank-hosted payment pages
- Webhook signatures verified server-side
- Idempotency keys prevent double-charging
- Payment verified via bank API before tier change

**⚠ TODO:** TBC Pay and BOG iPay SDK integration not yet implemented. Routes have placeholder flow.

---

## 10. Content Gating

Content gating is **server-side enforced**, not CSS-only.

### How it works
1. Full reading JSON exists in DB for all users
2. `GET /api/reading/natal` checks user's tier before responding
3. Locked sections are stripped from API response (only teaser data sent)
4. `ReadingRenderer.tsx` shows locked UI for inaccessible sections
5. `canAccessSection()` in `types/user.ts` is the single source of truth

### Free section picker
- Shown during loading screen (while Claude generates)
- `SectionPicker.tsx` renders 6 options with descriptions
- `POST /api/reading/section-pick` saves choice
- Can also be picked from locked section CTA in `ReadingRenderer`

---

## 11. Bilingual System

Both KA and EN readings are **generated upfront** and stored permanently.

```
Claude Call 2 KA → reading_ka (JSONB)   ┐
Claude Call 2 EN → reading_en (JSONB)   ├── Both in natal_readings
                                         │
Language toggle → GET /api/reading/natal?lang=ka/en → serves correct column
```

**UI labels:** Hardcoded in `lib/utils/translations.ts` (instant switch, no API call).

**Language preference:** Stored in `users.language`, updated via `PATCH /api/user/language`.

---

## 12. Component Architecture

### Current state (prototype)
- `BodyContent.tsx` (163 KB) = monolithic inline HTML prototype
- `prototype-runtime.js` (71 KB) = vanilla JS for view switching, auth forms, loading screen

### Production components (new)
- `ReadingRenderer.tsx` — Bridges Claude JSON → card-based UI
  - Handles section navigation, card expansion, locked section teasers
  - Uses `canAccessSection()` for tier gating
  - Renders planet table, aspects, cards, cross-references, hints
- `SynastryRenderer.tsx` — Same pattern for synastry readings
  - Compatibility score ring, category badges
  - Section nav, cards with aspect tags (harmony/tension/magnetic)
- `SectionPicker.tsx` — Free section selection during loading
  - 6 cards with icons and descriptions
  - Confirm button, confirmed state feedback
- `GlyphDefs.tsx` — SVG symbol library (planets, zodiac, UI icons)

### Data flow
```
useAuth() → User profile (tier, language, picks)
useReading(lang) → NatalReading JSON
useSynastry(lang) → SynastryConnection[] with readings

ReadingRenderer ← { reading, user, language, onUpgrade, onSectionPick }
SynastryRenderer ← { reading, language }
SectionPicker ← { language, onSelect }
```

---

## 13. API Routes Reference

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/auth/callback` | OAuth code exchange |
| POST | `/api/chart/generate` | Full natal pipeline |
| GET | `/api/reading/natal` | Get reading (tier-gated) |
| POST | `/api/reading/section-pick` | Free section choice |
| POST | `/api/invite/create` | Generate invite code |
| GET | `/api/invite/validate/[code]` | Validate code |
| POST | `/api/invite/accept` | Mark invite used |
| POST | `/api/payment/create` | Init bank session |
| GET | `/api/payment/callback` | Bank redirect handler |
| POST | `/api/payment/webhook` | Bank async webhook |
| GET | `/api/synastry/reading/[id]` | Get synastry reading |
| GET | `/api/synastry/connections` | List connections |
| GET | `/api/user/profile` | Profile + tier |
| PATCH | `/api/user/language` | Update language |

---

## 14. Environment Variables

See `.env.example` for full list. Key groups:

- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Astrologer:** `RAPIDAPI_KEY`
- **Claude:** `ANTHROPIC_API_KEY`
- **TBC Pay:** `TBC_MERCHANT_ID`, `TBC_SECRET_KEY`, `TBC_API_URL`, `TBC_CALLBACK_URL`
- **BOG iPay:** `BOG_MERCHANT_ID`, `BOG_SECRET_KEY`, `BOG_API_URL`, `BOG_CALLBACK_URL`
- **Google Places:** `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`
- **App:** `NEXT_PUBLIC_APP_URL`

---

## 15. Generation Timing

| Step | Duration | Blocking? |
|------|----------|-----------|
| Astrologer API | 2-5 sec | Yes (need chart data) |
| Claude Call 1 (analysis) | 10-15 sec | Yes (need for Call 2) |
| Claude Call 2 KA | 30-50 sec | Parallel with EN |
| Claude Call 2 EN | 30-50 sec | Parallel with KA |
| **Natal total** | **45-65 sec** | |
| Synastry Call 1 | 10-15 sec | Can start after Astrologer |
| Synastry Call 2 ×2 | 30-50 sec | Parallel KA+EN |
| **Natal + Synastry** | **90-120 sec** | |

**Loading screen:** Animated zodiac ring, cycling progress messages, pseudo-progress bar. Section picker shown during this time for free users.

---

## 16. Dev Mode & Testing

### Dev panel
`BodyContent.tsx` includes a development panel (bottom of page) with:
- View switching: natal / synastry / auth
- Mode switching: couple / friend
- Tier switching: free / invited / premium / premium+
- Language toggle

### Testing considerations
- **Mock Astrologer API** for dev (avoid rate limits)
- **Mock Claude responses** with saved JSON fixtures
- **Supabase local:** `supabase start` runs local PostgreSQL + auth
- **Payment sandbox:** Both TBC and BOG have test/sandbox environments

### Known TODOs
- [ ] TBC Pay / BOG iPay full SDK integration (routes are placeholder)
- [ ] `GET /api/reading/natal` — tier-gated response endpoint
- [ ] `POST /api/payment/webhook` — async bank notifications
- [ ] `GET /api/synastry/reading/[id]` and `/connections` endpoints
- [ ] `GET /api/user/profile` endpoint
- [ ] Background synastry generation (avoid 90s+ request timeout)
- [ ] Component decomposition of BodyContent.tsx into production components
- [ ] Integrate ReadingRenderer/SynastryRenderer into the main page flow
