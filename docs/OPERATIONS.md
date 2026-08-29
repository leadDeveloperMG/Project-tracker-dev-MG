# Operations

## Health

| Endpoint | Use |
|---|---|
| `GET /api/health/live` | Process is up (no database) |
| `GET /api/health/ready` | Database ping; `503` if MongoDB is unreachable |

Cron routes stay on `Authorization: Bearer $CRON_SECRET`.

## Logs

Server actions and auth emit JSON lines with `ts`, `level`, `event`, `referenceId` when present. Passwords, tokens, and cookies are redacted. Failed sign-in and denied permissions use `logger.security`.

Unexpected UI errors never include stack traces. Share the on-screen reference ID (when shown) or the approximate time with support.

## Secrets

Keep `MONGODB_URI`, `AUTH_SECRET`, `CRON_SECRET`, Blob, Resend, and Jira tokens in the host environment (`.env.local` locally, Vercel/Atlas elsewhere). Never commit them.

On Vercel, do not set `AUTH_URL` / `APP_URL` to `http://localhost:3000`. The app rewrites those to the real deployment host (`VERCEL_PROJECT_PRODUCTION_URL` in production, `VERCEL_URL` on preview). To use a custom domain, set both to `https://your-domain.com` in the Vercel project environment.

## Backups

Use MongoDB Atlas automated backups for the cluster. Restore into a scratch database and run `npm run seed` only on non-production data—seed **wipes** collections.

## Feature flags

`FEATURE_<NAME>=true|false` via `src/lib/flags.ts`. Jira sync remains gated by `JIRA_SYNC_ENABLED`.

## Incident notes

1. Check `/api/health/ready`.
2. Search logs for `action.failed` or `auth.failed` and the reference ID.
3. Confirm Atlas IP allow-list and database user privileges.
4. Roll back the last Vercel deployment if a release is at fault; mongoose schema changes are additive (no down-migration files).

## Support path

PMO administrators own catalog/templates/users. System administrators own Jira stub and auth incidents. Product bugs: open a GitHub issue with role, URL, and reference ID.
