# ASTROLO.GE — System Architecture
### Version 1.0 | 2026-03-25

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Tech Stack](#2-tech-stack)
3. [Authentication System](#3-authentication-system)
4. [Database Schema (Supabase)](#4-database-schema-supabase)
5. [Astrologer API Integration](#5-astrologer-api-integration)
6. [Claude AI Pipeline — Natal Chart](#6-claude-ai-pipeline--natal-chart)
7. [Claude AI Pipeline — Synastry](#7-claude-ai-pipeline--synastry)
8. [Account Types & Tier System](#8-account-types--tier-system)
9. [Payment System](#9-payment-system)
10. [Invite System](#10-invite-system)
11. [API Routes](#11-api-routes)
12. [User Journeys (Detailed)](#12-user-journeys-detailed)
13. [Data Flow Diagrams](#13-data-flow-diagrams)
14. [Free Tier Content Gating](#14-free-tier-content-gating)
15. [Loading Screen & Generation Timing](#15-loading-screen--generation-timing)
16. [Bilingual System](#16-bilingual-system)
17. [Error Handling & Retry Logic](#17-error-handling--retry-logic)
18. [Environment Variables](#18-environment-variables)
19. [Security Considerations](#19-security-considerations)
20. [File Structure](#20-file-structure)

---

## 1. System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Next.js)                            │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │ Auth View │  │Natal View │  │Synastry   │  │ Payment Modals   │  │
│  │           │  │ 8 sections│  │View       │  │ TBC/BOG checkout │  │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └────────┬─────────┘  │
│        │              │              │                  │            │
└────────┼──────────────┼──────────────┼──────────────────┼────────────┘
         │              │              │                  │
         ▼              ▼              ▼                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS API ROUTES (/api)                        │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │ /auth/*  │ │ /chart/*     │ │ /synastry/*  │ │ /payment/*     │  │
│  │          │ │ /reading/*   │ │              │ │ /invite/*      │  │
│  └────┬─────┘ └──────┬───────┘ └──────┬───────┘ └───────┬────────┘  │
└───────┼──────────────┼───────────────┼──────────────────┼────────────┘
        │              │               │                  │
        ▼              ▼               ▼                  ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐
│  Supabase   │ │ Astrologer  │ │ Claude API  │ │ TBC Pay /       │
│  Auth + DB  │ │ RapidAPI    │ │ (Anthropic) │ │ BOG iPay        │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘
```

**Core architecture:** Next.js app with API routes acting as BFF (Backend-for-Frontend). All external API calls (Astrologer, Claude, Payment) happen server-side. Client never sees API keys.

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 16.2.1 | App router, API routes, SSR |
| Frontend | React 19, TypeScript | SPA with view switching |
| Auth | Supabase Auth | Google OAuth + email/password |
| Database | Supabase (PostgreSQL) | Users, charts, readings, payments, invites |
| Astrology Data | Astrologer API (RapidAPI) | Birth chart calculation (planets, houses, aspects) |
| AI Interpretation | Claude API (Anthropic) | Two-call pipeline: analysis → reading generation |
| AI Model | claude-sonnet-4-20250514 | Both Call 1 and Call 2 |
| Payments | TBC Pay + BOG iPay | Georgian bank payment processing (₾ GEL) |
| Hosting | TBD (Vercel / self-hosted) | — |
| Language | Georgian (ka) + English (en) | Both generated upfront, stored in DB |

---

## 3. Authentication System

### 3.1 Provider: Supabase Auth

- **Google OAuth** (primary — one-click signup/login)
- **Email + Password** (secondary)
- **Forgot Password** flow (Supabase magic link / reset email)

### 3.2 Auth Flow

```
User lands on app
  │
  ├─ Has account? → LOGIN
  │    ├─ Google OAuth → Supabase handles → redirect to app
  │    └─ Email + Password → Supabase signInWithPassword
  │
  └─ No account? → SIGNUP
       ├─ Google OAuth → Supabase handles → redirect to BIRTH DATA form
       ├─ Email + Password → Supabase signUp → redirect to BIRTH DATA form
       └─ Via invite link (?invite=CODE)
            → Signup (Google or email)
            → Invite code stored in session/localStorage
            → After birth data → triggers synastry generation
```

### 3.3 Auth State

```typescript
// Supabase session provides:
interface AuthState {
  user: {
    id: string;          // Supabase UUID
    email: string;
    provider: 'google' | 'email';
  };
  session: {
    access_token: string;
    refresh_token: string;
  };
}
```

### 3.4 Birth Data Entry (Post-Auth)

Required after every new signup (Google or email). Not skippable.

| Field | Type | Details |
|-------|------|---------|
| birth_date | date | Day/month/year dropdowns (1930–2010) |
| birth_time | time \| null | Hour (0-23) / Minute (0-59, 5-min steps). Null = "unknown" → noon chart |
| birth_city | string | Google Places Autocomplete → city name |
| birth_lat | float | From Google Places |
| birth_lng | float | From Google Places |
| birth_timezone | string | From Google Places (e.g., "Asia/Tbilisi") |
| gender | enum | 'female' \| 'male' \| 'non-binary' — used for AI tone, not calculations |
| full_name | string | From signup form — used for numerology |

---

## 4. Database Schema (Supabase)

### 4.1 `users` table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('female', 'male', 'non-binary')),
  birth_date DATE NOT NULL,
  birth_time TIME,                    -- NULL if unknown (noon chart)
  birth_city TEXT NOT NULL,
  birth_lat FLOAT NOT NULL,
  birth_lng FLOAT NOT NULL,
  birth_timezone TEXT NOT NULL,
  account_type TEXT DEFAULT 'free' CHECK (account_type IN ('free', 'premium', 'invited')),
  natal_chart_unlocked BOOLEAN DEFAULT FALSE,  -- for invited users who pay ₾5
  invite_slots_purchased INT DEFAULT 0,         -- how many paid invite slots
  free_section_pick TEXT,                        -- which optional section the free user chose (e.g., 'shadow')
  language TEXT DEFAULT 'ka' CHECK (language IN ('ka', 'en')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Account type logic:**
- `free` — default on signup
- `premium` — after ₾15 payment
- `invited` — signed up via invite link

**Note:** There is no `premium+` type in the database. Premium+ is a *derived state*: a premium user with 2+ active synastry connections. The UI shows "PREMIUM+" badge, but the DB just tracks `account_type = 'premium'` + synastry slot count.

### 4.2 `chart_data` table

Stores raw Astrologer API response per user. Generated once, never changes.

```sql
CREATE TABLE chart_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  api_response JSONB NOT NULL,          -- full Astrologer API response
  chart_context TEXT NOT NULL,           -- extracted context string for Claude
  planets JSONB NOT NULL,               -- parsed planet positions
  houses JSONB NOT NULL,                -- parsed house cusps
  aspects JSONB NOT NULL,               -- parsed aspects
  points JSONB NOT NULL,                -- ASC, MC, Nodes, Lilith
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### 4.3 `natal_readings` table

Stores Claude-generated natal readings. **Both languages generated and stored.**

```sql
CREATE TABLE natal_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  analysis_en TEXT NOT NULL,             -- Call 1 output (always English)
  reading_ka JSONB NOT NULL,             -- Call 2 output (Georgian)
  reading_en JSONB NOT NULL,             -- Call 2 output (English)
  prompt_version TEXT NOT NULL,          -- e.g., "8SEC_i4" — tracks which prompt version generated this
  call1_model TEXT NOT NULL,             -- e.g., "claude-sonnet-4-20250514"
  call2_model TEXT NOT NULL,
  call1_tokens_used INT,
  call2_ka_tokens_used INT,
  call2_en_tokens_used INT,
  validation_warnings JSONB,            -- any warnings from validateReading()
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### 4.4 `synastry_connections` table

Links two users in a synastry relationship. Created when invited user completes birth data.

```sql
CREATE TABLE synastry_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  invitee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('couple', 'friend')),
  invite_code TEXT NOT NULL,
  slot_number INT NOT NULL,             -- 1 = free with premium, 2+ = paid
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'reading_generated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inviter_id, invitee_id),
  UNIQUE(invite_code)
);
```

### 4.5 `synastry_readings` table

Stores Claude-generated synastry readings. **Both languages stored.**

```sql
CREATE TABLE synastry_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES synastry_connections(id) ON DELETE CASCADE,
  inviter_id UUID REFERENCES users(id),
  invitee_id UUID REFERENCES users(id),
  relationship_type TEXT NOT NULL,       -- 'couple' | 'friend'
  analysis_en TEXT NOT NULL,             -- Synastry Call 1 output
  reading_ka JSONB NOT NULL,             -- Synastry Call 2 output (Georgian)
  reading_en JSONB NOT NULL,             -- Synastry Call 2 output (English)
  prompt_version TEXT NOT NULL,          -- e.g., "Couple_s2" or "Friend_s2"
  call1_model TEXT NOT NULL,
  call2_model TEXT NOT NULL,
  call1_tokens_used INT,
  call2_ka_tokens_used INT,
  call2_en_tokens_used INT,
  validation_warnings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(connection_id)
);
```

### 4.6 `payments` table

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,         -- in GEL (₾)
  currency TEXT DEFAULT 'GEL',
  payment_type TEXT NOT NULL CHECK (payment_type IN (
    'premium_upgrade',                   -- ₾15 — free → premium
    'natal_unlock',                      -- ₾5  — invited user unlocks full natal chart
    'invite_slot'                        -- ₾5  — purchase additional invite slot
  )),
  payment_provider TEXT NOT NULL CHECK (payment_provider IN ('tbc', 'bog')),
  provider_transaction_id TEXT,          -- transaction ID from TBC/BOG
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata JSONB,                        -- any extra data (slot number, invite code, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.7 `invite_codes` table

```sql
CREATE TABLE invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,             -- random code (e.g., "x7k9m2p")
  inviter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('couple', 'friend')),
  slot_number INT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  used_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);
```

### 4.8 Entity Relationship Diagram

```
┌──────────┐       ┌──────────────┐       ┌──────────────────┐
│  users   │──1:1──│  chart_data   │       │  payments        │
│          │──1:1──│natal_readings │       │  (user_id → user)│
│          │──1:N──│  payments     │       └──────────────────┘
│          │──1:N──│ invite_codes  │
└────┬─────┘       └──────────────┘
     │
     │ 1:N (as inviter)
     │ 1:N (as invitee)
     ▼
┌────────────────────┐       ┌─────────────────────┐
│synastry_connections│──1:1──│  synastry_readings   │
│ inviter_id → user  │       │  connection_id → conn│
│ invitee_id → user  │       └─────────────────────┘
└────────────────────┘
```

---

## 5. Astrologer API Integration

### 5.1 API Details

| Property | Value |
|----------|-------|
| Provider | RapidAPI |
| Host | `astrologer.p.rapidapi.com` |
| Endpoint | `POST /api/v5/context/birth-chart` |
| Auth | `X-RapidAPI-Key` header |
| Used for | Natal chart calculation only |
| NOT used for | Synastry (Claude handles synastry from two individual charts) |

### 5.2 Request Format

```typescript
interface AstrologerRequest {
  subject: {
    name: string;
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    latitude: number;
    longitude: number;
    city: string;
    timezone: string;
  };
}
```

### 5.3 Response (What We Store)

The API returns:
- `context` — text string describing the full chart (fed to Claude)
- `chart_data` — structured JSON with:
  - Planet positions (sign, degree, house, retrograde status)
  - House cusps (degree for each of 12 houses)
  - Aspects between planets (type, orb, exactness)
  - Points (ASC, MC, North Node, South Node, Lilith, Chiron)

### 5.4 When Called

- **Once per user**, immediately after birth data submission
- Result stored in `chart_data` table permanently
- Never re-called unless user corrects birth data (future feature)

---

## 6. Claude AI Pipeline — Natal Chart

### 6.1 Two-Call Architecture

```
┌─────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│ chart_data   │     │   CALL 1             │     │   CALL 2 (×2)        │
│ .context     │────→│   Chart Analysis     │────→│   Full Reading       │
│ (from        │     │   English, internal  │     │   Run TWICE:         │
│  Astrologer) │     │   max_tokens: 3000   │     │   1× Georgian (ka)   │
│              │     │   ~10-15 sec         │     │   1× English (en)    │
│              │     │                      │     │   max_tokens: 8192   │
│              │     │                      │     │   ~30-50 sec each    │
└─────────────┘     └──────────────────────┘     └──────────────────────┘
                                                          │
                                                          ▼
                                                   ┌──────────────┐
                                                   │ natal_readings│
                                                   │ analysis_en   │
                                                   │ reading_ka    │
                                                   │ reading_en    │
                                                   └──────────────┘
```

### 6.2 Call 1 — Chart Analysis

| Property | Value |
|----------|-------|
| Model | claude-sonnet-4-20250514 |
| Max tokens | 3000 |
| Language | Always English |
| Purpose | Internal analytical document |
| System prompt | See `SYSTEM-PROMPT-8SEC_i4.md` Part A |
| Input | Chart context string from Astrologer API |
| Output | Structured text with 13 sections (narrative arc, nodal axis, big three, aspects, stelliums, dignities, retrogrades, cross-reference map, shadows, spiritual gifts, career signatures, relationship signatures, special degrees) |

### 6.3 Call 2 — Full Reading (run twice: ka + en)

| Property | Value |
|----------|-------|
| Model | claude-sonnet-4-20250514 |
| Max tokens | 8192 |
| Language | Georgian OR English (run separately for each) |
| Purpose | Client-facing reading |
| System prompt | See `SYSTEM-PROMPT-8SEC_i4.md` Part B + Language Block (Part C) |
| Input | Chart context + Call 1 analysis (combined in user message) |
| Output | Single JSON object matching `Reading` TypeScript interface |

### 6.4 Output: 8 Sections

| # | Key | Name (KA/EN) | Min Cards | Always Free? |
|---|-----|-------------|-----------|-------------|
| 1 | `overview` | მიმოხილვა / Overview | 3 | YES |
| 2 | `mission` | მისია / Mission & Karmic Path | 4 | YES |
| 3 | `characteristics` | მახასიათებლები / Characteristics | 4 | NO — pickable |
| 4 | `relationships` | ურთიერთობები / Relationships | 4 | NO — pickable |
| 5 | `work` | საქმე / Work & Creation | 4 | NO — pickable |
| 6 | `shadow` | ჩრდილი / Shadow Self | 4 | NO — pickable |
| 7 | `spiritual` | სულიერი / Spiritual Path | 4 | NO — pickable |
| 8 | `potential` | სრულყოფილება / Maximum Potential | 2 | NO — pickable |

**Free users:** Sections 1-2 always visible + pick 1 from sections 3-8.
**Premium / Invited+unlocked:** All 8 sections visible.

### 6.5 Word Count Target

Total: 7,500–9,500 words per language.

### 6.6 Validation

After each Call 2 response:
1. Parse JSON (strip code fences if present)
2. Run `validateReading(json)` — checks all 8 sections present, card minimums met, crossReferences exist, word count in range
3. If `errors.length > 0` — retry (max 2 retries)
4. `warnings` stored in DB but don't block saving

### 6.7 Prompt Version Tracking

Every reading stores `prompt_version` (e.g., `"8SEC_i4"`). When prompts are updated, new readings use the new version. Old readings are not regenerated unless explicitly requested.

---

## 7. Claude AI Pipeline — Synastry

### 7.1 Key Difference from Natal

**No Astrologer API call for synastry.** Both users' `chart_data` already exists in the database. We pull both chart contexts and feed them directly to Claude.

### 7.2 Two-Call Architecture (same pattern as natal)

```
┌──────────────────┐
│ chart_data (A)    │──┐
│ .chart_context    │  │     ┌──────────────────────┐     ┌──────────────────────┐
│                   │  ├────→│   CALL 1             │────→│   CALL 2 (×2)        │
│ chart_data (B)    │──┘     │   Synastry Analysis  │     │   Full Synastry      │
│ .chart_context    │        │   English, internal  │     │   1× Georgian (ka)   │
│                   │        │   max_tokens: 4000   │     │   1× English (en)    │
│ + full_name_A     │        │   ~10-15 sec         │     │   max_tokens: 8192   │
│ + full_name_B     │        │                      │     │   ~30-50 sec each    │
│ + birth_date_A    │        └──────────────────────┘     └──────────────────────┘
│ + birth_date_B    │
└──────────────────┘
```

### 7.3 Two Prompt Variants

| Variant | Prompt File | Type | Sections | Words |
|---------|------------|------|----------|-------|
| **Couple** | `SYSTEM-PROMPT-Couple_s2.md` | `synastry_couple` | 8 (Emotional Bond, Passion, Karmic, Numerology, Growth, Shadow, Daily Ritual, Potential) | 5,500–7,500 |
| **Friend** | `SYSTEM-PROMPT-Friend_s2.md` | `synastry_friend` | 9 (Emotional Bond, Intellectual Synergy, Karmic, Numerology, Growth, Adventures, Shadow, Potential, Ritual) | 4,500–6,500 |

**Key differences:**
- Couple has "Passion & Attraction" section; Friend replaces it with "Intellectual Synergy & Values"
- Friend has "Shared Adventures" section (unique to friend)
- Friend: Venus/Mars analyzed for values/drive, NOT romantic chemistry
- Tone: Couple = intimate counsel; Friend = celebrates friendship as profound bond

### 7.4 Call 1 — Synastry Analysis

| Property | Couple | Friend |
|----------|--------|--------|
| Model | claude-sonnet-4-20250514 | claude-sonnet-4-20250514 |
| Max tokens | 4000 | 4000 |
| Language | English | English |
| Sections | 11 (narrative, aspects, nodes, emotional, passion, power, growth, shadow, composite, numerology, potential) | 11 (narrative, aspects, nodes, emotional, intellectual, drive, power, growth, shadow, numerology, potential) |

### 7.5 Call 2 — Full Synastry Reading (run twice: ka + en)

| Property | Value |
|----------|-------|
| Model | claude-sonnet-4-20250514 |
| Max tokens | 8192 |
| Output | Single JSON matching `SynastryCouplReading` or `SynastryFriendReading` interface |
| Includes | Compatibility scores (0-100 overall + category scores) |

### 7.6 When Synastry is Generated

Triggered **immediately** when the invited user completes birth data entry:

1. Invited user finishes birth data → Astrologer API called for their natal chart
2. System detects pending `synastry_connections` record for this user
3. Pulls both users' `chart_data.chart_context` from DB
4. Runs synastry Claude pipeline (Call 1 + Call 2 ×2)
5. Stores result in `synastry_readings`
6. Updates connection `status` → `'reading_generated'`
7. Both users can now access the synastry reading

---

## 8. Account Types & Tier System

### 8.1 Tier Definitions

| Tier | DB Value | How Achieved | Natal Access | Synastry Access | Can Invite? |
|------|----------|-------------|-------------|----------------|-------------|
| **Free** | `account_type='free'` | Default on signup | Overview + Mission + pick 1 | None (locked) | No |
| **Premium** | `account_type='premium'` | Pay ₾15 | All 8 sections | Yes (after invite accepted) | Yes — 1 free slot |
| **Invited** | `account_type='invited'` | Signup via invite link | Overview + Mission + pick 1 (same as free) | Yes (synastry unlocked) | No |
| **Invited + Unlocked** | `account_type='invited'` + `natal_chart_unlocked=true` | Pay ₾5 | All 8 sections | Yes | No |
| **Invited + Unlocked + Invite Slot** | `account_type='invited'` + `natal_chart_unlocked=true` + `invite_slots_purchased>=1` | Pay ₾5 + ₾5 | All 8 sections | Yes | Yes — paid slots |
| **Premium+** (UI only) | `account_type='premium'` + 2+ active synastry connections | Premium + 2nd invite accepted | All 8 sections | Yes (multiple) | Yes — paid slots |

### 8.2 UI Badge Display

| State | Badge Text | Badge Color |
|-------|-----------|-------------|
| Free | FREE | Gray |
| Premium (1 synastry) | PREMIUM | Gold |
| Premium (2+ synastry) | PREMIUM+ | Rose gradient |
| Invited | INVITED | Dual gradient |

### 8.3 Invite Slot Pricing

| Slot # | Cost | Who |
|--------|------|-----|
| Slot 1 | FREE | Included with Premium (₾15 purchase) |
| Slot 2 | ₾5 | Premium user buys additional slot |
| Slot 3 | ₾5 | Premium user buys additional slot |
| Slot N | ₾5 | No hard cap — unlimited slots at ₾5 each |

For **invited** users who unlocked invite capability:
| Action | Cost |
|--------|------|
| Unlock full natal chart | ₾5 |
| Purchase invite slot | ₾5 (per slot) |

---

## 9. Payment System

### 9.1 Payment Providers

| Provider | Integration Type | Notes |
|----------|-----------------|-------|
| **TBC Pay** | Bank redirect / API | TBC Bank payment gateway |
| **BOG iPay** | Bank redirect / API | Bank of Georgia payment gateway |

User chooses provider at checkout. Both support GEL (₾) currency.

### 9.2 Payment Products

| Product | Code | Amount | One-time? | Description |
|---------|------|--------|-----------|-------------|
| Premium Upgrade | `premium_upgrade` | ₾15 | Yes | Free → Premium. Unlocks all 8 natal sections + 1 free invite slot |
| Natal Chart Unlock | `natal_unlock` | ₾5 | Yes | Invited user unlocks full natal chart (all 8 sections) |
| Invite Slot | `invite_slot` | ₾5 | Yes (per slot) | Purchase additional synastry invite slot |

**No subscriptions.** All payments are one-time.

### 9.3 Payment Flow

```
User triggers payment (CTA click)
  │
  ▼
Frontend shows payment modal
  → Displays: product name, price, provider choice (TBC / BOG)
  │
  ▼
POST /api/payment/create
  → Creates `payments` record (status: 'pending')
  → Initiates payment session with chosen provider
  → Returns redirect URL
  │
  ▼
User redirected to bank payment page
  → Enters card details on bank's hosted page
  │
  ▼
Bank processes payment
  │
  ├─ SUCCESS → Bank redirects to /api/payment/callback?status=success&tx=...
  │    → Verify transaction with bank API
  │    → Update `payments` record (status: 'completed')
  │    → Apply tier change:
  │         premium_upgrade → users.account_type = 'premium'
  │         natal_unlock → users.natal_chart_unlocked = true
  │         invite_slot → users.invite_slots_purchased += 1
  │    → Redirect to app with success state
  │    → Frontend updates UI instantly (no reload needed)
  │
  └─ FAILURE → Bank redirects to /api/payment/callback?status=failed
       → Update `payments` record (status: 'failed')
       → Redirect to app with error message
```

### 9.4 Payment Triggers in UI

| Context | What User Clicks | Payment Product |
|---------|-----------------|----------------|
| Locked natal section CTA | "სრული წაკითხვის განბლოკვა" | `premium_upgrade` (₾15) or `natal_unlock` (₾5 for invited) |
| Dimmed synastry nav item | Synastry option in dropdown | `premium_upgrade` (₾15) |
| Invite modal — 2nd+ invite | "ბმულის შექმნა" | `invite_slot` (₾5) |
| Upgrade prompt banner | Any upgrade CTA | `premium_upgrade` (₾15) |

---

## 10. Invite System

### 10.1 Invite Flow (Complete)

```
INVITER (Premium user)                    INVITEE (new user)
─────────────────────                     ────────────────────

1. Click "მოწვევა +"
   in sidebar dropdown
        │
2. Modal opens:
   Choose type:
   [მეწყვილე] [მეგობარი]
        │
3. If slot 1 → FREE
   If slot 2+ → pay ₾5 first
        │
4. POST /api/invite/create
   → Generate unique code
   → Create invite_codes record
   → Create synastry_connections
     record (status: 'pending')
        │
5. Link generated:
   astrolo.ge/inv/{CODE}
   Auto-copied to clipboard
        │                                 6. Invitee opens link
        │                                    → ?invite=CODE in URL
        │                                    → Redirect to signup
        │
        │                                 7. Signup (Google or email)
        │                                    → invite code stored
        │
        │                                 8. Birth data entry
        │                                    → Submit
        │
        │                                 9. BACKEND TRIGGERS:
        │                                    a. Astrologer API → natal chart
        │                                    b. Claude natal pipeline
        │                                       (Call 1 + Call 2 ×2)
        │                                    c. Detect invite code →
        │                                       pull inviter's chart_data
        │                                    d. Claude synastry pipeline
        │                                       (Call 1 + Call 2 ×2)
        │                                    e. Update connection status
        │                                       → 'reading_generated'
        │
        │                                 10. Invitee lands on natal chart
        │                                     (free tier: Overview +
        │                                      Mission + pick 1)
        │                                     Synastry is UNLOCKED
        │
11. Inviter gets notification
    (or sees synastry populated
     in sidebar on next visit)
```

### 10.2 Invite Code Format

- **Pattern:** 7 alphanumeric characters (lowercase + digits)
- **URL:** `astrolo.ge/inv/{code}`
- **Example:** `astrolo.ge/inv/x7k9m2p`
- **Expiry:** No expiry (stays active until used)
- **Single-use:** Each code can only be used once

### 10.3 Invite Slot Availability

```typescript
function getAvailableInviteSlots(user: User): number {
  const totalSlots = user.account_type === 'premium'
    ? 1 + user.invite_slots_purchased  // 1 free + purchased
    : user.invite_slots_purchased;      // invited users: only purchased

  const usedSlots = countUsedInviteCodes(user.id); // includes pending + used
  return totalSlots - usedSlots;
}

function canInvite(user: User): boolean {
  // Premium users can always invite (pay for new slot if needed)
  if (user.account_type === 'premium') return true;
  // Invited users: only if they've purchased invite slots AND have unused ones
  if (user.account_type === 'invited' && user.invite_slots_purchased > 0) {
    return getAvailableInviteSlots(user) > 0;
  }
  return false;
}

function requiresPaymentForInvite(user: User): boolean {
  return getAvailableInviteSlots(user) <= 0;
}
```

---

## 11. API Routes

### 11.1 Auth Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/callback` | GET | Supabase OAuth callback handler |
| `/api/auth/birth-data` | POST | Submit birth data after signup |

### 11.2 Chart & Reading Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/chart/generate` | POST | Calls Astrologer API + Claude pipeline. Returns reading ID. Called once after birth data. |
| `/api/chart/status/:id` | GET | Poll generation status (for loading screen) |
| `/api/reading/natal` | GET | Get user's natal reading (respects tier gating) |
| `/api/reading/section-pick` | POST | Free user picks their 1 optional section |

### 11.3 Synastry Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/synastry/reading/:connectionId` | GET | Get synastry reading for a connection |
| `/api/synastry/connections` | GET | List all synastry connections for user |

### 11.4 Invite Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/invite/create` | POST | Generate invite code (checks slot availability, may require payment first) |
| `/api/invite/validate/:code` | GET | Validate invite code (used on signup page to show invite badge) |
| `/api/invite/accept` | POST | Mark invite as used (called during invited user's signup) |

### 11.5 Payment Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/payment/create` | POST | Create payment session (returns bank redirect URL) |
| `/api/payment/callback` | GET | Bank redirect callback (success/failure handling) |
| `/api/payment/webhook` | POST | Bank webhook for async payment confirmation |
| `/api/payment/status/:id` | GET | Check payment status |

### 11.6 User Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/user/profile` | GET | Get current user profile + tier info |
| `/api/user/language` | PATCH | Update preferred language |

---

## 12. User Journeys (Detailed)

### 12.1 Journey A: New Free User

```
1. Land on astrolo.ge
2. Auth page → signup (Google or email)
3. Birth data form → fill all fields → submit
4. LOADING SCREEN (45-65 sec):
   ├─ Backend: Astrologer API call (~2-5 sec)
   ├─ Backend: Claude Call 1 (~10-15 sec)
   ├─ Backend: Claude Call 2 — Georgian (~30-50 sec) ─┐
   └─ Backend: Claude Call 2 — English (~30-50 sec)  ─┘ (parallel)
5. Natal chart reading page loads
6. Section picker modal: "აირჩიე 1 სექცია" — pick 1 of 6
7. User reads: Overview + Mission + chosen section
8. Locked sections show: header + first card title + teaser line + blur
9. CTA buttons on locked sections → payment modal (₾15 premium)
10. Synastry nav item → dimmed → click opens premium upgrade modal
```

### 12.2 Journey B: Free → Premium Upgrade

```
1. Free user clicks locked section CTA or synastry nav
2. Payment modal appears: ₾15, choose TBC/BOG
3. Redirect to bank → pay → redirect back
4. Account upgraded to Premium
5. All 8 sections unlock instantly (CSS class change, no reload)
6. Synastry nav item becomes active
7. Invite button appears in sidebar
```

### 12.3 Journey C: Premium User Sends Invite

```
1. Premium user clicks "მოწვევა +" in sidebar
2. Modal: choose [მეწყვილე] or [მეგობარი]
3. Slot 1 → free. Slot 2+ → pay ₾5 first.
4. Invite link generated → auto-copied to clipboard
5. User shares link via any messaging app
6. Waiting state: synastry nav shows partner placeholder
```

### 12.4 Journey D: Invited User Signup

```
1. Receive link: astrolo.ge/inv/x7k9m2p
2. Open → redirect to signup with invite badge visible
3. Signup (Google or email)
4. Birth data form → submit
5. LOADING SCREEN (longer — natal + synastry):
   ├─ Astrologer API for invitee's chart (~2-5 sec)
   ├─ Claude natal pipeline for invitee (Call 1 + Call 2 ×2) (~60 sec)
   ├─ Claude synastry pipeline (Call 1 + Call 2 ×2) (~60 sec)
   └─ Total: ~90-120 sec (some calls parallelized)
6. Land on natal chart page (free tier access: Overview + Mission + pick 1)
7. Synastry is UNLOCKED in sidebar — can read immediately
8. Natal sections 3-8 locked with ₾5 unlock CTA
```

### 12.5 Journey E: Invited User Upgrades

```
1. Invited user clicks locked natal section CTA
2. Payment modal: ₾5 "ნატალური რუკის განბლოკვა"
3. Pay → all 8 natal sections unlock
4. To get invite capability: separate ₾5 payment for invite slot
```

---

## 13. Data Flow Diagrams

### 13.1 Natal Chart Generation Pipeline

```
BIRTH DATA (from form)
     │
     ▼
┌──────────────────────────────┐
│  POST /api/chart/generate    │
│                              │
│  1. Validate birth data      │
│  2. Save to users table      │
│                              │
│  3. ┌────────────────────┐   │
│     │ Astrologer API     │   │
│     │ /birth-chart       │   │
│     │ → chart_data JSON  │   │
│     └────────┬───────────┘   │
│              │               │
│  4. Save to chart_data table │
│              │               │
│  5. ┌────────────────────┐   │
│     │ Claude Call 1      │   │
│     │ Analysis (EN)      │   │
│     │ → structured text  │   │
│     └────────┬───────────┘   │
│              │               │
│  6. ┌────────────────────────┤──── PARALLEL ────┐
│     │ Claude Call 2 (KA)     │                  │ Claude Call 2 (EN)  │
│     │ Reading → JSON         │                  │ Reading → JSON      │
│     └────────┬───────────────┤                  └────────┬────────────┘
│              │               │                           │
│  7. Validate both JSONs      │◄──────────────────────────┘
│     (retry if errors)        │
│                              │
│  8. Save to natal_readings   │
│     table (ka + en)          │
│                              │
│  9. If invite code present:  │
│     → trigger synastry       │
│       pipeline (async)       │
│                              │
│  10. Return: { status: ok }  │
└──────────────────────────────┘
```

### 13.2 Synastry Generation Pipeline

```
TRIGGER: Invited user's chart_data saved
     │
     ▼
┌───────────────────────────────────┐
│  Synastry Generation (async)      │
│                                   │
│  1. Look up synastry_connections  │
│     where invitee_id = user       │
│     and status = 'pending'        │
│                                   │
│  2. Pull chart_data for BOTH      │
│     inviter + invitee             │
│                                   │
│  3. Pull full_name + birth_date   │
│     for both (numerology)         │
│                                   │
│  4. Select prompt variant:        │
│     couple → Couple_s2 prompt     │
│     friend → Friend_s2 prompt     │
│                                   │
│  5. ┌─────────────────────────┐   │
│     │ Claude Synastry Call 1  │   │
│     │ Analysis (EN)           │   │
│     │ max_tokens: 4000        │   │
│     └────────┬────────────────┘   │
│              │                    │
│  6. ┌────────┴────── PARALLEL ──┐ │
│     │ Call 2 (KA)    Call 2 (EN)│ │
│     │ max_tokens: 8192 each     │ │
│     └────────┬──────────────────┘ │
│              │                    │
│  7. Validate both JSONs           │
│                                   │
│  8. Save to synastry_readings     │
│                                   │
│  9. Update synastry_connections   │
│     status → 'reading_generated'  │
└───────────────────────────────────┘
```

---

## 14. Free Tier Content Gating

### 14.1 What Free Users See

| Content | Visible? |
|---------|---------|
| Hero + mini natal chart wheel (interactive SVG) | YES |
| Section 1: Overview — planet table, aspects, 3 core cards | YES (always free) |
| Section 2: Mission — North Node, Jupiter, Saturn, ancestral wound | YES (always free) |
| Sections 3-8: User picks 1, rest locked | 1 picked = YES, 5 locked |

### 14.2 What Locked Sections Show (Teaser)

```
┌─────────────────────────────────────┐
│ ✦ Section Header + Icon              │  ← visible
│                                      │
│ ┌─────────────────────────────────┐  │
│ │ First Card Badge                │  │  ← visible
│ │ First Card Title                │  │  ← visible
│ │                                 │  │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░   │  │  ← blurred placeholder
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░   │  │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░   │  │
│ │                                 │  │
│ │  One hint line (teaser)         │  │  ← visible
│ │                                 │  │
│ └─────────────────────────────────┘  │
│                                      │
│  ┌─────────────────────────────────┐ │
│  │  სრული წაკითხვის განბლოკვა    │ │  ← unlock CTA
│  │           ₾15 / ₾5             │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 14.3 Section Picker Modal (Free Users)

After reading loads, show modal: "აირჩიე 1 სექცია"

- 6 cards displayed (sections 3-8)
- Each shows: icon, title, one-line description
- User taps to select → confirm → that section unlocks
- Choice stored in `users.free_section_pick`
- Irreversible (no changing mind without paying)

### 14.4 Gating Implementation

Content gating is **server-side**. The API route `/api/reading/natal` returns:
- Full data for unlocked sections
- Teaser data only for locked sections (first card badge + title + one hint line)
- The full reading JSON exists in DB, but the API strips locked content before sending to client

This prevents users from accessing locked content through browser devtools.

---

## 15. Loading Screen & Generation Timing

### 15.1 Timing Breakdown

| Step | Duration | Notes |
|------|----------|-------|
| Astrologer API | 2-5 sec | Single HTTP call |
| Claude Call 1 (analysis) | 10-15 sec | 3000 tokens |
| Claude Call 2 — KA | 30-50 sec | 8192 tokens |
| Claude Call 2 — EN | 30-50 sec | 8192 tokens |
| **Total (natal only)** | **45-65 sec** | Call 2 KA + EN run in parallel |
| **Total (natal + synastry)** | **90-120 sec** | Natal then synastry (some parallel) |

### 15.2 Loading Screen UX

- Zodiac ring animation with rotating signs
- Progress messages cycling (fun facts, astrology tidbits)
- No real progress bar (can't predict exact timing)
- Pseudo-progress: animate to ~90% over expected time, hold, complete on actual finish

### 15.3 Polling

Frontend polls `GET /api/chart/status/:id` every 3 seconds:
```typescript
interface GenerationStatus {
  step: 'astrologer_api' | 'call1_analysis' | 'call2_reading' | 'call2_synastry' | 'complete' | 'error';
  progress: number;       // 0-100 (approximate)
  message?: string;        // user-facing status message
  error?: string;
}
```

---

## 16. Bilingual System

### 16.1 Architecture

**Both KA and EN readings are generated upfront** during chart creation and stored in the database. Language switching is instant — just serves the other stored JSON.

```
User toggles language (KA ↔ EN)
  │
  ▼
GET /api/reading/natal?lang=en
  │
  ▼
Server returns reading_en from natal_readings table
(no Claude call needed — already stored)
```

### 16.2 What's Bilingual

| Content | Bilingual? | How |
|---------|-----------|-----|
| Natal reading (all 8 sections) | YES | Two Claude Call 2 runs stored |
| Synastry reading | YES | Two Claude Call 2 runs stored |
| UI labels (nav, buttons, headers) | YES | Hardcoded label map in frontend (Part G of prompt spec) |
| Planet/zodiac names | YES | Included in Claude output + hardcoded in UI |
| Auth forms | YES | Hardcoded in frontend |
| Payment modals | YES | Hardcoded in frontend |
| Error messages | YES | Hardcoded in frontend |

### 16.3 Language Preference

- Stored in `users.language` (default: `'ka'`)
- Toggle in top bar switches language
- `PATCH /api/user/language` updates preference
- All subsequent API responses use preferred language

---

## 17. Error Handling & Retry Logic

### 17.1 Astrologer API Errors

| Error | Action |
|-------|--------|
| Timeout | Retry once after 3 sec |
| Invalid response | Retry once with same data |
| Rate limit (429) | Wait + retry (exponential backoff, max 2 retries) |
| 2 retries failed | Show error to user, allow manual retry |

### 17.2 Claude API Errors

| Error | Action |
|-------|--------|
| Invalid JSON output | Strip code fences, re-parse. If still invalid, retry Call 2 (max 2 retries) |
| Validation errors (missing sections) | Retry Call 2 with same Call 1 output |
| Validation warnings (low word count, missing crossRefs) | Accept but store warnings in DB |
| Rate limit (429) | Queue and retry with backoff |
| Overloaded (529) | Queue and retry with backoff |
| 2 retries failed | Store partial result if any. Flag for manual review. Show error to user. |

### 17.3 Payment Errors

| Error | Action |
|-------|--------|
| Bank redirect fails | Show error, allow retry with same or different provider |
| Webhook confirms failure | Update payment status, notify user |
| Webhook timeout (no callback) | After 10 min, check status via bank API. If unclear, flag for manual review. |
| Double-charge | Detect via idempotency key. Auto-refund duplicate. |

---

## 18. Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # server-side only

# Astrologer API (RapidAPI)
RAPIDAPI_KEY=xxx
RAPIDAPI_HOST=astrologer.p.rapidapi.com

# Claude API (Anthropic)
ANTHROPIC_API_KEY=sk-ant-xxx

# Payment — TBC Pay
TBC_MERCHANT_ID=xxx
TBC_SECRET_KEY=xxx
TBC_API_URL=https://api.tbcbank.ge/...
TBC_CALLBACK_URL=https://astrolo.ge/api/payment/callback

# Payment — BOG iPay
BOG_MERCHANT_ID=xxx
BOG_SECRET_KEY=xxx
BOG_API_URL=https://ipay.ge/...
BOG_CALLBACK_URL=https://astrolo.ge/api/payment/callback

# Google Places (for birth city autocomplete)
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=xxx

# App
NEXT_PUBLIC_APP_URL=https://astrolo.ge
NODE_ENV=production
```

---

## 19. Security Considerations

### 19.1 API Key Protection

- All external API calls (Astrologer, Claude, Payment) happen **server-side only** via Next.js API routes
- No API keys exposed to client
- Supabase anon key is public (by design) — Row Level Security (RLS) enforces access

### 19.2 Supabase RLS Policies

```sql
-- Users can only read/update their own profile
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Users can only read their own chart data
ALTER TABLE chart_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own chart" ON chart_data FOR SELECT USING (auth.uid() = user_id);

-- Users can only read their own natal reading
ALTER TABLE natal_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own reading" ON natal_readings FOR SELECT USING (auth.uid() = user_id);

-- Users can read synastry readings where they are inviter OR invitee
ALTER TABLE synastry_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own synastry" ON synastry_readings FOR SELECT
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- Payments: users see only their own
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
```

### 19.3 Content Gating Security

- Free tier content gating is **server-side enforced**
- API returns only unlocked content — locked sections return teaser data only
- Full reading JSON is never sent to free-tier clients
- No client-side-only gating (CSS blur is cosmetic, not security)

### 19.4 Invite Code Security

- Codes are cryptographically random (7 chars alphanumeric = ~78 billion combinations)
- Single-use enforcement at DB level (unique constraint)
- Validated server-side before account creation

### 19.5 Payment Security

- All payment processing via bank-hosted pages (PCI compliance handled by bank)
- Webhook signatures verified server-side
- Idempotency keys prevent double-charging
- Payment status verified via bank API before applying tier changes

---

## 20. File Structure

```
ASTROLO.GE/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── inv/
│   │   └── [code]/
│   │       └── page.tsx                 # Invite link landing → redirect to signup
│   └── api/
│       ├── auth/
│       │   ├── callback/route.ts        # Supabase OAuth callback
│       │   └── birth-data/route.ts      # Submit birth data
│       ├── chart/
│       │   ├── generate/route.ts        # Full generation pipeline
│       │   └── status/[id]/route.ts     # Poll generation progress
│       ├── reading/
│       │   ├── natal/route.ts           # Get natal reading (gated)
│       │   └── section-pick/route.ts    # Free user picks optional section
│       ├── synastry/
│       │   ├── reading/[id]/route.ts    # Get synastry reading
│       │   └── connections/route.ts     # List user's synastry connections
│       ├── invite/
│       │   ├── create/route.ts          # Generate invite code
│       │   ├── validate/[code]/route.ts # Validate invite code
│       │   └── accept/route.ts          # Mark invite as used
│       ├── payment/
│       │   ├── create/route.ts          # Create payment session
│       │   ├── callback/route.ts        # Bank redirect callback
│       │   ├── webhook/route.ts         # Bank async webhook
│       │   └── status/[id]/route.ts     # Check payment status
│       └── user/
│           ├── profile/route.ts         # Get user profile + tier
│           └── language/route.ts        # Update language preference
├── components/
│   ├── BodyContent.tsx                  # Main UI markup
│   └── PrototypeClient.tsx              # Client wrapper
├── lib/
│   ├── supabase/
│   │   ├── client.ts                    # Browser Supabase client
│   │   ├── server.ts                    # Server Supabase client
│   │   └── types.ts                     # Database types (generated)
│   ├── astrologer/
│   │   └── api.ts                       # Astrologer RapidAPI wrapper
│   ├── claude/
│   │   ├── client.ts                    # Anthropic SDK client
│   │   ├── natal-pipeline.ts            # Natal two-call pipeline
│   │   ├── synastry-pipeline.ts         # Synastry two-call pipeline
│   │   ├── prompts/
│   │   │   ├── natal-call1.ts           # Call 1 system prompt (8SEC_i4)
│   │   │   ├── natal-call2.ts           # Call 2 system prompt + language blocks
│   │   │   ├── synastry-couple-call1.ts # Couple Call 1 prompt
│   │   │   ├── synastry-couple-call2.ts # Couple Call 2 prompt
│   │   │   ├── synastry-friend-call1.ts # Friend Call 1 prompt
│   │   │   └── synastry-friend-call2.ts # Friend Call 2 prompt
│   │   └── validation.ts               # validateReading(), validateSynastry*()
│   ├── payment/
│   │   ├── tbc.ts                       # TBC Pay integration
│   │   └── bog.ts                       # BOG iPay integration
│   └── utils/
│       ├── invite-codes.ts              # Generate/validate invite codes
│       └── content-gating.ts            # Strip locked sections from reading JSON
├── types/
│   ├── reading.ts                       # Reading, Card, PlanetRow, Aspect interfaces
│   ├── synastry.ts                      # SynastryCouplReading, SynastryFriendReading
│   ├── user.ts                          # User, AccountType, PaymentType
│   └── api.ts                           # API request/response types
├── public/
│   └── prototype-runtime.js             # Frontend runtime
├── prompts/                             # Raw prompt source files (reference)
│   ├── SYSTEM-PROMPT-8SEC_i4.md
│   ├── SYSTEM-PROMPT-Couple_s2.md
│   └── SYSTEM-PROMPT-Friend_s2.md
├── SYSTEM-ARCHITECTURE.md               # ← this file
├── CLAUDE.md
├── AGENTS.md
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## Appendix A: Cost Estimation Per User

| Action | Astrologer API | Claude Tokens (approx) | Bank Fees |
|--------|---------------|----------------------|-----------|
| New user (natal, both langs) | 1 call | ~3K (Call 1) + ~16K (Call 2 ×2) = ~19K output tokens | — |
| Synastry generation (both langs) | 0 calls | ~4K (Call 1) + ~16K (Call 2 ×2) = ~20K output tokens | — |
| Invited user (natal + synastry) | 1 call | ~39K output tokens total | — |
| Premium upgrade payment | — | — | TBC/BOG fee on ₾15 |
| Invite slot payment | — | — | TBC/BOG fee on ₾5 |

## Appendix B: Generation Parallelization Strategy

```
NATAL ONLY (free/premium signup):
  Sequential: Astrologer API → Claude Call 1
  Parallel:   Claude Call 2 KA ║ Claude Call 2 EN
  Total: ~45-65 sec

INVITED USER (natal + synastry):
  Sequential: Astrologer API → Claude Natal Call 1
  Parallel:   Claude Natal Call 2 KA ║ Claude Natal Call 2 EN
  Then:       Claude Synastry Call 1
  Parallel:   Claude Synastry Call 2 KA ║ Claude Synastry Call 2 EN
  Total: ~90-120 sec

  OPTIMIZATION: Start Synastry Call 1 as soon as Astrologer API completes
  (don't wait for Natal Call 2 to finish):

  Astrologer API ──→ Natal Call 1 ──→ Natal Call 2 KA ║ EN
                 └──→ Synastry Call 1 ──→ Synastry Call 2 KA ║ EN

  With this optimization: ~70-90 sec total
```
