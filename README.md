# Amerivo English

Premium online marketplace connecting students worldwide with vetted **American English teachers** for live 1-on-1 video lessons.

> Real People. Real Conversations. A Brighter You.

| | |
|---|---|
| **Web** (`apps/web`) | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 |
| **API** (`apps/api`) | NestJS 11 · Drizzle ORM · PostgreSQL |
| **Auth** | Clerk (Google / Apple login, 2FA for admins) |
| **Payments** | Stripe Connect (separate charges & transfers, 20 % commission) · PayPal fallback |
| **Video** | Daily.co (private room per lesson, meeting tokens) |
| **Email / SMS** | Resend · Twilio |
| **Hosting** | Vercel (web) · AWS (API + RDS PostgreSQL + S3) |

---

## Getting started

```bash
nvm use                  # Node 22
npm install              # installs both apps (npm workspaces)

# Database
docker compose up -d db
cp apps/api/.env.example apps/api/.env
npm run db:migrate
npm run db:seed          # 1 admin, 1 student, 5 approved teachers

# Run
npm run dev:api          # http://localhost:4000/api
npm run dev:web          # http://localhost:3000
```

**Web auth modes** (chosen at build time, see `apps/web/src/lib/auth-config.ts`):
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` set → real sign-up / sign-in with Clerk (`CLERK_SECRET_KEY` needed too).
- `NEXT_PUBLIC_DEV_USER=dev_maria` (with an API running `DEV_AUTH=1`) → the site acts as that user, no Clerk.
- neither → demo mode on sample data. `NEXT_PUBLIC_API_URL` connects teachers, slots and bookings to the API.

In development (`DEV_AUTH=1`) you can call the API without Clerk by sending `x-dev-user: <clerkId>`
(`dev_admin`, `dev_maria`, `dev_sarah-mitchell`, …):

```bash
curl localhost:4000/api/teachers
curl "localhost:4000/api/teachers/sarah-mitchell/slots?from=2026-10-12T00:00:00Z&to=2026-10-18T23:59:59Z&tz=Europe/Zurich"
curl -H "x-dev-user: dev_admin" localhost:4000/api/admin/analytics
```

## Tests

```bash
npm test -w api          # business rules + end-to-end API tests on an in-memory PostgreSQL (PGlite)
npm run lint -w web && npm run build -w web
```

CI (`.github/workflows/ci.yml`) runs the same on every push and pull request.

---

## Project structure

```
apps/
  web/                      Next.js front-end
    src/app/
      (marketing)/          Home, Find a teacher, Teacher profile + booking
      (auth)/               Sign up, Log in, Verify email
      onboarding/           Goals questionnaire, level result & recommended teachers
      checkout/             Payment
      student/              Student dashboard, messages, lesson summary & review
      classroom/[lessonId]/ Live video classroom
      teach/apply/          Teacher application wizard (6 steps)
      teacher/              Teacher dashboard, availability, earnings, lesson report
      admin/                Analytics, teacher applications
    src/components/ui/      Design system (Button, Badge, Avatar, form fields, icons, logo)
    src/components/layout/  Site header/footer, dashboard sidebars
    src/app/globals.css     Brand tokens (colors, fonts) — single source of truth
  api/
    src/domain/             Pure business rules (pricing, cancellation, availability, earnings, matching)
    src/db/schema.ts        Database schema  ·  drizzle/ = SQL migrations
    src/modules/            Services + HTTP controllers
    src/integrations/       Stripe, Daily.co, notifications
    test/                   Unit + end-to-end tests
```

## Business rules implemented (from the PRD)

| Rule | Where |
|---|---|
| Teacher price $20–$50 per 50-min lesson; free 20-min trial **opt-in per teacher** (off by default, once per student/teacher) | `domain/pricing.ts`, `bookings.service.ts` |
| Students must be **13 or older** (date of birth checked at sign-up and by the API); teachers teach adults and teens only | `domain/age.ts`, `accounts.service.ts` |
| Packages: 5 lessons −5 %, 10 lessons −10 % (teacher opt-in) | `domain/pricing.ts` |
| Availability in teacher's time zone → slots shown in the student's time zone (DST-safe); blocked dates, vacation mode, no double booking | `domain/availability.ts`, unique DB index |
| Booking: *Pending payment* → Stripe webhook → *Confirmed* (idempotent), notifications to both | `bookings.service.ts` |
| Cancellation: student > 24 h full refund, < 24 h none; teacher cancel = full refund + admin notified; 3 teacher cancellations / 30 days → warning | `domain/cancellation.ts` |
| Admin refund only within 24 h after the lesson | `admin.service.ts` |
| 20 % commission; earnings available after the 24 h refund window; withdraw on demand or automatic payout on the 28th (admin can run it) | `domain/earnings.ts`, `earnings.service.ts` |
| Classroom opens 10 min before; Daily.co room + token; teacher report (private student rating hidden from student); homework | `lessons.service.ts` |
| Reviews 1–5★ update the teacher's average | `lessons.service.ts` |
| Teacher application: draft → pending (needs video + ID) → approved / rejected / suspended, with evaluation scores and audit log | `applications.service.ts`, `admin.service.ts` |
| Placement → CEFR level (A1–C2) → teacher recommendations | `students.service.ts`, `domain/matching.ts` |
| Security: Clerk JWT, roles, rate limiting, Helmet headers, audit logs, webhook signature check | `auth/`, `main.ts` |

## Status

**Milestone 1 (this version)**
- All validated screens built in the web app (with sample data).
- API with the core business rules, database schema and migrations, fully tested.

**Next milestones**
1. Real-time messaging (WebSocket) and message attachments; e-mail/SMS notifications (Resend, Twilio) and lesson reminders (scheduled jobs).
2. Uploaded files to object storage (S3/R2) instead of the database; teacher intro videos uploaded directly.
3. Legal pages (Terms, Privacy/GDPR/CCPA), production deployment (live Stripe, Clerk production instance, domain), monitoring (Sentry).

## Languages (i18n)

The interface is available in **English, Spanish, French, Arabic (right-to-left), Chinese (Simplified / Mandarin) and Russian**
([next-intl](https://next-intl.dev), no URL prefixes: the language comes from the visitor's choice — cookie
`NEXT_LOCALE`, set by the language switcher — or from the browser's language, else English).

- Texts live in `apps/web/messages/<locale>/<area>.json` (areas: common, marketing, auth, onboarding, checkout,
  student, teacher, apply, admin, classroom). English is the reference; keys are type-checked against it.
- To change a wording: edit the JSON of that language. To add a text: add the key in `en/…json` first, then in
  the 4 other languages.
- `node apps/web/scripts/check-i18n.mjs` checks that every language has the same keys and placeholders.
- Content written by users (teacher bios, messages, reviews…) is shown as written; prices stay in US dollars.
- To add a language: add it to `apps/web/src/i18n/config.ts`, copy `messages/en` to `messages/<code>`, translate,
  and add its Clerk localization in `apps/web/src/app/layout.tsx`.
- The translations were produced carefully but by machine: have a native speaker review fr/ar/zh/ru before launch.

Deployment (staging on Vercel + Render + Neon): see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Design reference: the "Amerivo English – UI Design" canvas (18 screens).
