# Jira Project Tracker

Standalone Next.js + MongoDB project-governance platform: work tracking, RAG health, deliverable assessments, KRA/KPI scorecards, and executive reporting. Jira sync is optional and deferred.

Design and operations notes: [docs/DESIGN.md](docs/DESIGN.md), [docs/OPERATIONS.md](docs/OPERATIONS.md). User manual (by role, capability, and workflow): [docs/USER-MANUAL.md](docs/USER-MANUAL.md) and [docs/user-manual.pdf](docs/user-manual.pdf).

## Local setup

1. Copy `.env.example` to `.env.local` and set `MONGODB_URI` and `AUTH_SECRET`.
2. Install and run:

```bash
npm install
docker compose up -d   # optional local MongoDB on :27017
npm run seed
npm run dev
```

3. Sign in at [http://localhost:3000](http://localhost:3000) (use another port if 3000 is already taken, and set `AUTH_URL` / `APP_URL` to match). All demo users use password `Password123!`:

| Email | Role |
|---|---|
| `developer@tracker.local` | System administrator (developer access) |
| `pm@tracker.local` | Project manager |
| `pmo@tracker.local` | PMO administrator |
| `exec@tracker.local` | Executive |
| `admin@tracker.local` | System administrator |
| `lead@tracker.local` | Team lead |
| `member@tracker.local` | Team member |
| `hr@tracker.local` | HR reviewer |
| `fm@tracker.local` | Functional manager |

`npm run seed` resets MongoDB collections and loads templates, two projects (CPR, BNU), work items, assessments, KRA/KPI catalog, draft scorecards, and an audit trail.

## Vercel + Atlas production

1. Create a MongoDB Atlas cluster and a database user. Put the connection string in `MONGODB_URI`.
2. Create the Vercel project from this repo (Node runtime). Set:

| Variable | Notes |
|---|---|
| `MONGODB_URI` | Atlas URI |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` / `APP_URL` | `https://your-domain.vercel.app` |
| `CRON_SECRET` | Long random string; Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store |
| `RESEND_API_KEY` / `RESEND_FROM` | Optional email |
| `JIRA_SYNC_ENABLED` | Leave `false` for v1 |

3. Cron jobs are declared in `vercel.json`. After deploy, confirm they appear in the Vercel project Cron tab.
4. Run seed once against Atlas (`MONGODB_URI=... npm run seed`) before inviting real users.

Performance CSV/PDF routes require a signed-in session. Do not expose them as public URLs.

Health: `GET /api/health/live` (process) and `GET /api/health/ready` (MongoDB). CI runs lint, `tsc`, and unit tests on each pull request. Accounts live under **Account** in the sidebar (password change and deactivation).

## Role matrix (summary)

| Capability | Admin | PMO | Exec | PM | Lead | Member | FM | HR |
|---|---|---|---|---|---|---|---|---|
| Portfolio / reports | ✓ | ✓ | ✓ | ✓ | | | ✓ | ✓ |
| Manage users/templates | ✓ | ✓ | | | | | | |
| KRA/KPI catalog | ✓ | ✓ | | | | | | ✓ |
| Create/manage projects | ✓ | ✓ | | ✓ | | | | |
| Assess / accept deliverables | ✓ | ✓ | | ✓ | ✓ | | | |
| Scorecards (own) | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ | ✓ |
| Lock / check-ins | ✓ | ✓ | | ✓ | ✓ | | ✓ | |
| Calibration | ✓ | ✓ | | | | | | ✓ |
| Jira stub | ✓ | | | | | | | |

## Phases

**Phase 1 — Foundation.** Users/RBAC, templates, projects, work items, workflows, Blob evidence, RAG health, status reports, PM + portfolio dashboards, audit. Cron: `/api/cron/flags`.

**Phase 2 — Assessment and KPI.** Deliverable scorecards (accept/rework/reject), approved KRA/KPI catalog with 100% weights, calculated results, insufficient-data labeling, quality guardrails, audited overrides, role scorecards. Ticket count / story points are operational only.

**Phase 3 — Cycle and reporting.** Monthly check-ins, quarterly lock + authorized correction, calibration, annual review records (never auto-final), notifications, CSV/PDF export, scheduled distribution.

**Phase 4 — Rollout.** PMO catalog/templates, data-quality report + reminder SLAs, retention/archival cron, Jira adapter stub (`JIRA_SYNC_ENABLED`).

## Cron (Bearer `CRON_SECRET`)

| Path | Schedule |
|---|---|
| `/api/cron/flags` | Hourly overdue/stale + health |
| `/api/cron/notifications` | Hourly operational alerts |
| `/api/cron/kpi-refresh` | Nightly KPI calc |
| `/api/cron/reports` | Weekday scheduled distribution |
| `/api/cron/retention` | Weekly archival |

Vercel Blob is used when `BLOB_READ_WRITE_TOKEN` is set; otherwise uploads fall back to a small data URL for local demos.
