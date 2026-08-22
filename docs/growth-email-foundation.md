# Growth email foundation (free-tier launch)

Mapshroom collects optional verified emails for:

- Windows desktop beta download
- Newsletter (separate opt-in + double opt-in)
- Pro waitlist
- Feedback follow-up

Cloudflare stays on free Workers/D1/assets. Transactional email uses **Brevo free** (300/day, no card). D1 is the source of truth.

## Architecture

- Growth Worker: [`workers/growth/`](../workers/growth/)
- Routes: `mapshroom.dev/api/*`
- D1 schema: [`workers/growth/migrations/0001_init.sql`](../workers/growth/migrations/0001_init.sql)
- Frontend: `EmailCaptureForm`, `VerifyRoute`, `ProfileRoute`, `AdminRoute`, updated `DownloadRoute`

Flow:

1. User submits email (+ optional marketing) with Turnstile
2. Worker stores lead in D1 and queues Brevo verification email
3. User opens `/#/verify?token=...`, confirms with a button (scanner-safe)
4. Session cookie is set; download grant streams the installer from private R2 (`DESKTOP_BUCKET`) or falls back to `DESKTOP_DOWNLOAD_URL`

## Local development

```bash
# Terminal 1 — growth API
cd workers/growth
cp .dev.vars.example .dev.vars
npx wrangler d1 migrations apply mapshroom-growth --local
npx wrangler dev --port 8788

# Terminal 2 — web app (proxies /api → 8788)
npm run dev
```

## Production setup (you)

1. Create D1 and set `database_id` in [`workers/growth/wrangler.toml`](../workers/growth/wrangler.toml):

```bash
cd workers/growth
npx wrangler d1 create mapshroom-growth
npx wrangler d1 migrations apply mapshroom-growth --remote
```

2. Enable **R2** once in the Cloudflare dashboard (Storage → R2 → Purchase / Enable — free tier is enough), then:

```bash
npx wrangler r2 bucket create mapshroom-desktop-beta
npx wrangler r2 object put mapshroom-desktop-beta/Mapshroom_3.0.0_x64-setup.exe --file ../../release-artifacts/Mapshroom_3.0.0_x64-setup.exe --content-type application/octet-stream
```

The growth Worker streams this private object after a valid download grant (no public R2 URL required).

3. Create a free Brevo account, verify `mapshroom.dev` (SPF/DKIM), create API key and optional marketing list id.
4. Create Cloudflare Turnstile site/secret keys for `mapshroom.dev`.
5. Set Worker secrets:

```bash
cd workers/growth
npx wrangler secret put SESSION_SECRET
npx wrangler secret put BREVO_API_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put ADMIN_TOKEN
# Optional fallback only:
# npx wrangler secret put DESKTOP_DOWNLOAD_URL
```

6. Deploy:

```bash
cd workers/growth
npx wrangler deploy
```

7. Frontend production env:

```bash
VITE_TURNSTILE_SITE_KEY=...
VITE_POSTHOG_KEY=...
VITE_ANALYTICS_HOST=https://mapshroom.dev/a
```

8. Protect `/#/admin` with Cloudflare Access (or use `ADMIN_TOKEN` for bootstrap).

## Daily email budget

`DAILY_EMAIL_BUDGET` defaults to `300`. When reached, messages stay in `email_outbox` as `retry` and the hourly cron drains them later.

## Legal / product pages

- Privacy: `/#/privacy`
- Desktop beta terms: `/#/beta-terms`
- Profile / unsubscribe / delete: `/#/profile`
- Admin: `/#/admin`
