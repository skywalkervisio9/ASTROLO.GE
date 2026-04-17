# ASTROLO.GE — Complete User Flow

> Last updated: 2026-04-11

---

## Table of Contents

1. [Account Types](#1-account-types)
2. [Entry Points](#2-entry-points)
3. [Authentication Flow](#3-authentication-flow)
4. [Reading Visibility & Guest Access](#4-reading-visibility--guest-access)
5. [Payment Flows](#5-payment-flows)
6. [Invite System](#6-invite-system)
7. [Synastry Flow](#7-synastry-flow)
8. [Reading Access & Sharing](#8-reading-access--sharing)
9. [Account Settings](#9-account-settings)
10. [Page Map](#10-page-map)
11. [Account State Transitions](#11-account-state-transitions)
12. [TODO / Known Issues](#12-todo--known-issues)

---

## 1. Account Types

| Tier | How to get | Cost | Natal Sections | Synastry Slots | Can Invite? |
|------|-----------|------|----------------|----------------|-------------|
| **Free** | Sign up from landing page | 0 | 3 (overview + mission + 1 pick) | 0 | No |
| **Invited** | Sign up via invite link | 0 | 3 (overview + mission + 1 pick) | 1 (from inviter) | No |
| **Invited+** | Invited user buys natal OR slot | 5₾ | see note | 1 or 2 (see note) | If slot available |
| **Premium** | Free user pays 15₾ OR Invited user buys both unlocks (5+5₾) | 15₾ / 10₾ | All 8 | 1 free + unlimited at 5₾ | Yes |

### Invited+ detail

Invited+ is a transitional tier — the user has made exactly one of two purchases:

| Purchase made | Natal access | Synastry slots | Next purchase becomes |
|---------------|-------------|----------------|----------------------|
| Natal unlock (5₾) | All 8 sections | 1 (from inviter) | Premium |
| Extra synastry slot (5₾) | 3 (unchanged) | 2 (inviter's + purchased) | Premium |

Once **both** purchases are made (total 10₾), the user is upgraded to **Premium**.

### Section access breakdown

**Always free:** `overview`, `mission`
**Pick 1 (free/invited/invited+ without natal unlock):** `characteristics`, `relationships`, `work`, `shadow`, `spiritual`, `potential`
**Premium / Invited+ with natal unlock:** all 8 sections unlocked

---

## 2. Entry Points

There are exactly **two ways** a user reaches the auth page:

### 2A. Landing Page (organic)

```
astrolo.ge  →  CTA "Create Your Reading"  →  /auth
```

- User has no invite code
- After completing auth + birth data → Free account
- Sees 3 natal sections + 1 pick

### 2B. Invite Link (referred)

```
Friend/partner shares link  →  /inv/{code}  →  /auth?invite={code}
```

- Invite code is validated on arrival
- If code is expired/used → error message, fallback to organic flow
- After completing auth + birth data → Invited account
- Inviter's synastry slot is occupied, synastry generation begins

---

## 3. Authentication Flow

### Step-by-step

```
/auth
  │
  ├─ Step 1: OAuth Provider Selection
  │    User picks Google / Apple / Facebook
  │    → Redirect to provider
  │    → Provider callback → /api/auth/callback
  │    → User profile row created (if new)
  │    → Redirect to /post-auth
  │
  ├─ /post-auth — Decision Router
  │    │
  │    ├─ Has birth data?
  │    │   ├─ YES → /natalreading/{id} (returning user)
  │    │   └─ NO  → /auth?step=birth
  │    │
  │    └─ Has invite code?
  │        → Store code in session for later processing
  │
  ├─ Step 2: Birth Data Entry (/auth?step=birth)
  │    Fields: full name, date (day/month/year),
  │            time (hour/minute), city (autocomplete),
  │            gender
  │    → Data saved to users table
  │    → "Create Reading" button
  │
  └─ Step 3: Reading Generation (/loading)
       → Astrology API call (chart data)
       → AI Call 1: analysis (English, internal)
       → AI Call 2: full reading (KA + EN, parallel)
       → If invite code: accept invite + trigger synastry
       → Redirect to /natalreading/{id}
```

### Returning users

```
/auth → OAuth → /post-auth → birth data exists → /natalreading/{id}
```

No birth data re-entry. Straight to their reading.

---

## 4. Reading Visibility & Guest Access

The natal reading page (`/natalreading/{id}`) serves **both** the owner and guest visitors using the same URL.

### Who sees what

| Viewer | Access | Sections visible | UI elements |
|--------|--------|-----------------|-------------|
| **Owner (signed in)** | Full control | Gated by account type | Language toggle, share button, synastry section, payment CTAs, settings |
| **Guest (not signed in)** | Read-only | Same sections the owner has unlocked | Language toggle only — no share, no synastry, no settings |

### How it works

- The page checks auth state on load
- **Signed in + owner:** full interactive reading page
- **Signed in + not owner:** read-only view (same as guest)
- **Not signed in:** read-only view — the reading is publicly accessible at the same `/natalreading/{id}` URL
- No separate `/r/{slug}` needed — the reading URL itself is the shareable link
- Owner controls visibility via sharing mode in account settings (Private / Public)

### Guest view behavior

- All unlocked sections render normally in read-only mode
- Locked sections show teaser (140 char preview) with no payment CTA
- No synastry section visible
- No account-related UI (settings, sign out, upgrade prompts)
- Language toggle works (KA/EN)

### Dev: "View as visitor" button

For development/testing purposes, a **sign-out dev button** should be available to quickly switch to guest view without fully signing out. This allows verifying the guest experience during development.

### Sharing flow

```
Owner enables "Public" sharing in /settings
  → /natalreading/{id} becomes accessible without auth
  → Owner copies URL → shares with anyone
  → Guest opens link → sees read-only unlocked sections
```

When sharing is set to **Private** (default), unauthenticated visitors get a 403 or redirect to landing page.

---

## 5. Payment Flows

### 5A. Premium Upgrade (Free → Premium)

```
/natalreading/{id}
  → "Unlock Full Reading" CTA (15₾)
  → /payment/premium
  → Bank selection (TBC Pay / BOG iPay)
  → Redirect to bank payment page
  → Bank processes payment
  → Callback to /api/payment/callback
  → Webhook confirms: /api/payment/webhook
  → account_type = 'premium'
  → Redirect to /natalreading/{id} (all sections unlocked)
```

**Price:** 15₾ (Georgian Lari)
**Result:** All 8 natal sections + 1 free synastry slot + ability to invite

### 5B. Natal Unlock (Invited → Invited+ or Premium)

```
/natalreading/{id}
  → "Unlock Full Reading" CTA (5₾)
  → /payment/natal-unlock
  → Bank payment flow (same as above)
  → If first purchase: account_type = 'invited+'
  → If second purchase (already has extra slot): account_type = 'premium'
  → Redirect to /natalreading/{id} (all sections unlocked)
```

**Price:** 5₾
**Result:** All 8 natal sections unlocked

### 5C. Extra Synastry Slot

```
/natalreading/{id} → synastry section
  → "Add Synastry Slot" CTA (5₾)
  → /payment/invite-slot
  → Bank payment flow
  → If first purchase (invited): account_type = 'invited+'
  → If already invited+: account_type = 'premium'
  → If already premium: slot count incremented
  → Redirect back, new empty slot visible
```

**Price:** 5₾ per slot (unlimited purchases for premium)
**Result:** +1 synastry slot available for invite generation

### Payment states

```
pending → completed | failed | refunded
```

- Idempotency keys prevent double-charging
- Payment records stored in `payments` table with provider tx ID

---

## 6. Invite System

### Who can invite?

| Account Type | Can Invite? | Available Slots |
|-------------|-------------|-----------------|
| Free | No | 0 |
| Invited | No | 0 (their 1 slot is occupied by inviter's connection) |
| Invited+ (extra slot purchased) | Yes | 1 available |
| Premium | Yes | 1 free + any purchased (unlimited at 5₾ each) |

### Invite creation flow

```
/natalreading/{id} → synastry section
  → Empty slot visible
  → "Create Invite" button
  → Choose relationship type: Couple or Friend
  → System generates 7-char alphanumeric code
  → Creates invite_codes row (status: active)
  → Creates synastry_connections row (status: pending)
  → Returns shareable link: astrolo.ge/inv/{code}
  → User copies link → shares via messenger/social
```

### Invite link lifecycle

```
active ──→ used (invitee completes auth + birth data)
```

Invite links do not expire — they remain active until used. Each link can only be used once.

### Invite acceptance flow (invitee side)

```
/inv/{code}
  → Validate code (exists, active, not expired)
  → Redirect to /auth?invite={code}
  → Normal auth flow (OAuth → birth data → "Create Reading")
  → On natal reading completion:
      1. invite_codes.status = 'used', used_by = invitee_id
      2. synastry_connections.invitee_id = invitee_id
      3. synastry_connections.status = 'accepted'
      4. invitee account_type = 'invited'
      5. Trigger synastry generation (see section 7)
```

### Chain invites

Invited users can purchase extra synastry slots (5₾) and generate their own invite links. This creates invite chains:

```
User A (premium) invites User B
  → User B is "invited", has 1 occupied slot (A↔B)
  → User B buys extra slot (5₾) → becomes "invited+"
  → User B invites User C
    → User C is "invited", has 1 occupied slot (B↔C)
    → User C buys natal (5₾) → becomes "premium"
    → User C buys slot (5₾) → invites User D
    → ... (no depth limit)
```

---

## 7. Synastry Flow

### Trigger

Synastry generation is triggered when the **invitee completes their natal reading** (both users now have natal data).

### What the inviter sees

```
Inviter's reading page → synastry section
  │
  ├─ Before invitee registers:
  │    Slot shows: "Invite sent — waiting for {friend/partner}"
  │    Link re-copy option available
  │
  ├─ Invitee registered, synastry generating:
  │    Slot shows: loading animation spinner
  │    Click → "Please wait while synastry is being generated"
  │    (generation takes 1-3 minutes)
  │
  └─ Synastry ready:
       Slot shows: partner name + compatibility score
       Click → /synastryreading/{connection_id}
```

### Generation pipeline

1. **Input:** Both users' `analysis_en` + `chart_context` from natal readings
2. **Prompt:** Relationship-specific system prompt (couple vs friend)
3. **AI Calls (parallel):**
   - Georgian reading (~64K tokens) → `reading_ka`
   - English reading (~36K tokens) → `reading_en`
4. **Storage:** `synastry_readings` table, linked to `synastry_connections.id`
5. **Status update:** `synastry_connections.status = 'reading_generated'`

### Connection status progression

```
pending → accepted → reading_generated
```

### Synastry reading page (`/synastryreading/{connection_id}`)

- Accessible by both users in the connection
- Language toggle (KA/EN), opens in user's default language
- Sections vary by relationship type:
  - **Couple:** emotionalBond, passion, karmic, numerology, growth, shadow, dailyRitual, potential
  - **Friend:** emotionalBond, intellectualSynergy, karmic, numerology, growth, shadow, sharedAdventures, potential
- Compatibility score displayed prominently
- Share button (if sharing enabled for either user)

---

## 8. Reading Access & Sharing

### Sharing modes (account setting)

| Mode | Behavior |
|------|----------|
| **Private** (default) | Reading only visible to authenticated owner |
| **Public** | Same URL (`/natalreading/{id}`, `/synastryreading/{id}`) becomes accessible without auth |

### How sharing works

- No separate share URLs needed — the reading page URL is the shareable link
- Owner toggles Public/Private in `/settings` (applies to all their readings)
- **Natal:** `/natalreading/{id}` — guest sees read-only view of unlocked sections
- **Synastry:** `/synastryreading/{id}` — guest sees full reading, no consent required from the other person
- When Private: unauthenticated visitors get redirected to landing page

---

## 9. Account Settings

> **Status: Not yet implemented**

### Page: `/settings`

#### Sections:

**Profile**
- Email (from OAuth, read-only or editable)
- Date of birth (read-only, set during onboarding — cannot be changed)
- Full name (editable)

**Preferences**
- Default language: Georgian / English
  - Controls which language loads first on all pages
  - Both languages always available via toggle
- Reading sharing mode: Private / Public
  - Applies to natal and synastry readings
  - Toggle affects all readings at once

**Purchases & Slots**
- Account type badge (Free / Invited / Invited+ / Premium)
- List of purchased synastry slots with status:
  - Empty (invite not sent)
  - Invite sent (waiting)
  - Generating (synastry in progress)
  - Complete (reading ready)
- Purchase history (payment records)

**Account Actions**
- Sign out
- Delete account (with confirmation)

---

## 10. Page Map

### Public pages (no auth)

| Route | Purpose |
|-------|---------|
| `/` | Landing page with CTA |
| `/inv/{code}` | Invite link handler → redirects to `/auth?invite={code}` |
| `/natalreading/{id}` | Also serves as public guest view when sharing is enabled |

### Auth pages

| Route | Purpose |
|-------|---------|
| `/auth` | OAuth provider selection |
| `/auth?step=birth` | Birth data entry form |
| `/auth?invite={code}` | Auth with invite code pre-loaded |
| `/post-auth` | Decision router after OAuth callback |

### Protected pages (auth required)

| Route | Purpose |
|-------|---------|
| `/loading` | Chart + reading generation progress |
| `/natalreading/{id}` | Natal reading display |
| `/synastryreading/{id}` | Synastry reading display |
| `/settings` | Account settings |

### Payment pages

| Route | Purpose |
|-------|---------|
| `/payment/premium` | Premium upgrade (15₾) |
| `/payment/natal-unlock` | Natal full unlock (5₾, invited users) |
| `/payment/invite-slot` | Extra synastry slot (5₾) |

---

## 11. Account State Transitions

```
                         ┌──────────────┐
                         │   Visitor     │
                         │  (no account) │
                         └──────┬───────┘
                                │
                 ┌──────────────┼──────────────┐
                 │ organic signup               │ invite link
                 ▼                              ▼
          ┌──────────┐                   ┌──────────┐
          │   FREE   │                   │ INVITED  │
          │ 3 sections│                   │ 3 sections│
          │ 0 slots  │                   │ 1 slot   │
          └────┬─────┘                   └────┬─────┘
               │                              │
               │ pay 15₾                      │ pay 5₾ (either purchase)
               │                              ▼
               │                       ┌───────────┐
               │                       │ INVITED+  │
               │                       │ partial   │
               │                       │ upgrade   │
               │                       └─────┬─────┘
               │                             │
               │ ◄───────────────────────────│ pay 5₾ (second purchase)
               ▼                             ▼
          ┌──────────────────────────────────────┐
          │              PREMIUM                  │
          │  All 8 sections, 1 free slot,         │
          │  unlimited slots at 5₾ each           │
          └──────────────────────────────────────┘
```

### Transition table

| From | Action | To | Cost |
|------|--------|-----|------|
| Visitor | Organic signup + birth data | Free | 0 |
| Visitor | Invite link + signup + birth data | Invited | 0 |
| Free | Pay premium upgrade | Premium | 15₾ |
| Invited | Pay natal unlock | Invited+ | 5₾ |
| Invited | Pay extra synastry slot | Invited+ | 5₾ |
| Invited+ | Pay remaining unlock (natal or slot) | Premium | 5₾ |
| Premium | Buy additional synastry slot | Premium (slot count +1) | 5₾ |

---

## 12. TODO / Known Issues

### Critical (blocks features)

- [ ] **Synastry trigger mechanism** — No automated trigger exists for synastry generation after invitee completes natal reading. Needs either a webhook/event from natal pipeline completion or a polling/queue system. Currently the inviter would see a loading state forever.

- [ ] **Payment bank integration** — TBC Pay and BOG iPay API calls are TODO placeholders. Payment creation, callback processing, and webhook verification are not wired to real bank APIs. Account type upgrades after payment are not functional end-to-end.

- [ ] **Synastry reading page** — No `/synastryreading/{id}` page exists. Only the API endpoint (`/api/synastry/reading/[id]`) is built. Need the full React page with section rendering, language toggle, and sharing.

- [ ] **Payment pages** — No `/payment/*` pages exist. Need bank selection UI, redirect handling, success/failure states.

### Important (UX / data integrity)

- [ ] **Account settings page** — `/settings` page not yet built. Language preference, sharing mode, profile editing, slot management all missing.

- [ ] **Used invite UX** — If someone clicks an already-used invite link, show: "This invite link has already been used. You can still create a free account." with fallback to organic signup flow. Same message for any duplicate attempt — no true race condition since the invite isn't consumed until birth data is completed in auth.

- [ ] **Invited+ account type in DB** — Current `account_type` enum is `free | premium | invited`. Need to add `invited+` or track upgrades via separate boolean flags (`natal_unlocked`, `extra_slot_purchased`).

- [ ] **Dev: "View as visitor" button** — Add a dev-only button on the reading page to quickly preview the guest/unsigned-in view without signing out.

### Scaling considerations

- [ ] **Synastry slot reuse** — If an invitee deletes their account, the slot is permanently consumed. No mechanism to reclaim or regenerate. Consider: mark connection as `orphaned`, free up the slot.

- [ ] **Chain invite depth** — No limit on invite chains (A invites B invites C invites D...). May need a cap or monitoring if abuse occurs (e.g. bot farms generating free invited accounts).

- [ ] **Concurrent synastry generation** — If a premium user sends 5 invite links and all 5 invitees register simultaneously, 5 synastry generations fire at once. Need queueing (e.g. BullMQ, Inngest) to avoid API rate limits and cost spikes.

- [ ] **Payment failure recovery** — If payment succeeds at bank but webhook fails, the user is charged but not upgraded. Can be resolved manually via direct database update (`account_type`, slot count). Consider adding an admin view later if this becomes frequent.
