# HOMME — Tash the Barber

Booking site and owner dashboard for **Homme LLC** (Signature Salon Suites, Camp Springs, MD). Replaces theCut.

**Stack:** Next.js 15 (App Router) · Tailwind v4 · Supabase (Postgres, Auth, Storage) · Resend (email) · Stripe (later) · Vercel
**Live:** https://homme-5es8.vercel.app · Owner dashboard: `/admin`

## Clients

- **Home page:** logo, bio, services & add-ons, photo gallery, reviews, live open/closed hours, map, Instagram/TikTok,
  "LIVE NOW" banner + player while Tash streams, optional gold announcement bar, "Get the app" card
- **`/book`:** service (+ add-ons) → date & live open slots → details → pay at shop (card once Stripe is on).
  Fully booked day → **join the waitlist**
- **`/appointment/<token>`:** private link — details, add to calendar (.ics), cancel (up to 2 hrs before), pay, leave a review
- **`/live`:** Kick / Twitch / YouTube stream, offline page with follow links
- **`/unsubscribe/<token>`:** stop announcement and reminder emails

## Owner dashboard (`/admin`)

| Tab | What it does |
|---|---|
| Appointments | Earnings (week/month), new clients, no-show rate; upcoming/past; mark completed / paid / no-show / cancel; **+ Book** a client who called (any time, overlaps blocked); text review link; **waitlist** with Text buttons |
| Clients | Built automatically from bookings + **import contacts** (Android contact picker, .vcf from iPhone/Android, Google/Outlook CSV; duplicates merged); profiles with visits, total spent, no-shows, private notes, tags, opt-outs |
| Announce | Audience (everyone, regulars, due for a cut, lapsed 60+ days, new, never booked, by tag) → **text from her own phone** (one private text each) or **email** (with unsubscribe link); history |
| QR & Marketing | QR codes (book / site / live / Android app), downloadable branded flyer, share link, **automations** (review requests, waitlist, rebooking reminders), website announcement bar |
| Gallery | Upload photos of her work (auto-resized) → shown on the home page |
| Services / Hours / Live / Reviews | Prices & durations, weekly hours + time off, booking-alert email, stream channel + "I'm live" switch, approve reviews |

## Automatic emails (Resend)

Owner alert on every booking/cancellation · client confirmation & cancellation · day-before reminder ·
review request when a cut is marked completed · waitlist alert when a slot opens · "time for a fresh cut?" 2 weeks after a visit (adjustable).
Every email event is claimed once in the database (`claim_*` functions), so nothing is sent twice.
The daily job runs from Vercel Cron (`vercel.json` → `/api/cron/reminders`, 10 AM ET).

## How booking stays safe

All scheduling lives in Postgres (`supabase/migrations/`): `get_available_slots` computes free slots from hours, bookings
and time off (America/New_York, 15-min steps, 1-hr lead, 60 days ahead); `book_appointment` re-checks the slot under a lock,
so double-booking is impossible. RLS: the public reads services/hours/published reviews/gallery only; clients, appointments,
waitlist and broadcasts are owner-only (`public.admins`).

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Public Supabase URL/key are built in as fallbacks (`src/lib/supabase.ts`), so the site works without env vars.

| Env var (Vercel) | Needed for |
|---|---|
| `RESEND_API_KEY`, `CRON_SECRET` | All emails. `CRON_SECRET` must equal the `notify` row in `public.app_secrets` |
| `EMAIL_FROM` | Sending from her own domain (required to email clients — Resend's test sender only reaches the account owner) |
| `KICK_CLIENT_ID/SECRET`, `TWITCH_CLIENT_ID/SECRET`, `YOUTUBE_API_KEY` | Optional live-stream auto-detect |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` | Card payments (webhook: `/api/stripe/webhook`, `checkout.session.completed`) |

**Owner access:** sign up at `/admin`, then `insert into public.admins (email) values ('…');`

## Apps

- **Installable web app:** `src/app/manifest.ts` (client) and `public/admin.webmanifest` (HOMME Admin, gold icon, opens `/admin`).
- **Android APKs:** `android/` is a Trusted Web Activity with two flavors — `client` (`llc.homme.app`) and `admin` (`llc.homme.admin`).
  `.github/workflows/android-apk.yml` builds, verifies and publishes both to GitHub Releases:
  `…/releases/latest/download/homme.apk` and `…/releases/latest/download/homme-admin.apk`.
  Needs repo secrets `ANDROID_KEYSTORE_BASE64` + `ANDROID_KEYSTORE_PASSWORD`; the key fingerprint is in
  `public/.well-known/assetlinks.json`. **Keep the keystore safe — updates must be signed with the same key.**
  If the site moves to a custom domain, update `hommeHost` in `android/gradle.properties` and rebuild.
