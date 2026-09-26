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
| Teacher price $20–$50 per 50-min lesson; free 20-min trial (once per teacher) | `domain/pricing.ts`, `bookings.service.ts` |
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
1. Connect the web screens to the API; Clerk sign-in; Stripe Payment Element; Daily.co call frame in the classroom.
2. Messaging in real time, file uploads (S3), notification e-mails/SMS, scheduled jobs (lesson reminders, monthly payouts).
3. Remaining screens: student lessons/homework/progress/payments, teacher students & messages, admin students/bookings/payments/disputes/settings, corporate request form.
4. Legal pages (Terms, Privacy/GDPR/CCPA), production deployment (Vercel + AWS), monitoring (Sentry).

Design reference: the "Amerivo English – UI Design" canvas (18 screens).
