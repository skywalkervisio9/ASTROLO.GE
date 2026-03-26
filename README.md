# ASTROLO.GE

AI-powered astrology reading platform. Bilingual (Georgian + English) natal chart and synastry analysis.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **Supabase** (PostgreSQL + Auth + RLS)
- **Claude AI** (Anthropic) — two-call pipeline for bilingual readings
- **Astrologer API** (RapidAPI) — birth chart calculation
- **TBC Pay + BOG iPay** — Georgian bank payment integration

## Getting Started

```bash
cp .env.example .env.local   # fill in your keys
npm install
npm run dev
```

The app runs in **prototype mode** without Supabase — all UI states are testable via the dev panel (bottom-right corner).

## Architecture

See `docs/SYSTEM-ARCHITECTURE.md` and `docs/DEVELOPER-GUIDE.md` for full details.

### Reading Types
- **Natal** — 8-section personal birth chart reading
- **Synastry Couple** — 8-section romantic compatibility
- **Synastry Friend** — 8-section friendship compatibility

### Account Tiers
| Tier | Natal | Synastry | Price |
|------|-------|----------|-------|
| FREE | 3 sections (overview + mission + 1 pick) | Locked | Free |
| PREMIUM | Full 8 sections | 1 free invite slot | 15 GEL |
| PREMIUM+ | Full 8 sections | 2 slots (1 free + 1 paid) | 15 + 5 GEL |
| INVITED | 3 sections (like free) | 1 slot (inviter's synastry) | Free |
| INVITED+ | Full 8 sections + 2nd synastry slot | Both unlocked | 5 + 5 GEL |

### Database
Migrations in `supabase/migrations/` — 6 files covering users, chart data, readings, synastry, payments, and RLS policies.

## License

Private. All rights reserved.
