# PostHog EU setup for Mapshroom

Product analytics uses **PostHog Cloud EU** plus a **Cloudflare Worker** first-party proxy on `mapshroom.dev/a/*`. View KPIs in the PostHog dashboard — there is no in-app admin page.

## 1. Create the PostHog EU project

1. Sign up / log in at [eu.posthog.com](https://eu.posthog.com).
2. Create a project (region must be **EU**).
3. Open **Project settings → Project API key** (starts with `phc_`).
4. Optional: set **Data retention** to ~90 days.

## 2. App environment variables

Set these for production (Cloudflare Pages / local `.env`):

```bash
VITE_POSTHOG_KEY=phc_your_project_api_key
VITE_ANALYTICS_HOST=https://mapshroom.dev/a
```

Local development leaves these empty so no events are sent (unless you point at a test project).

## 3. Deploy the Cloudflare Worker

```bash
cd workers/analytics
npx wrangler login
npx wrangler deploy
```

Ensure the Worker route covers `mapshroom.dev/a*` (see `wrangler.toml`). The Worker:

- Proxies ingest/assets to `eu.i.posthog.com` / `eu-assets.i.posthog.com`
- Forwards `CF-Connecting-IP` as `X-Forwarded-For` so PostHog can resolve **country**
- Strips cookies before forwarding

## 4. Dashboard insights to create (one-time)

In PostHog → **Dashboards → New dashboard** (“Mapshroom product”):

| Card | How |
|------|-----|
| Unique users (7d / 30d) | Trends → `app_open` → Unique users |
| Returning / retention | Insights → Retention → recurring `app_open` |
| Top feature clicks | Trends → `ui_click` → Breakdown `name` |
| LLM ask rate | Trends: unique users with `llm_request` ÷ unique users with `app_open` |
| API presence rate | Trends: `app_open` where `has_api_key` = true ÷ all `app_open` (or person property) |
| Presence / DAU | Trends → `app_heartbeat` or `app_open` → Unique users / day |
| Location | Trends → `app_open` → Breakdown by Country (geoIP) |

Named events shipped by the app:

- `app_open`, `app_heartbeat`
- `llm_request` (`provider`, `runtime`, `outcome`, `trigger`)
- `api_settings_changed`, person props `has_api_key`, `shader_provider`, `shader_runtime`
- `ui_click` (`name`) and specific events: `export_mp4`, `share_project`, `open_projects`, `open_presets`, `open_assets`, `open_output`, `new_shader`, `install_offline`, `onboarding_dismiss`, `onboarding_complete`, `create_project`, `save_project`, `save_project_as`, `open_saved_project`

**Never** collected: prompts, shader source, API keys, project files.

## 5. Verify

1. Open mapshroom.dev, Accept analytics.
2. Click a few features (Export, Settings, Generate shader if configured).
3. In browser Network tab, confirm requests to `mapshroom.dev/a/...` return 200.
4. In PostHog → Activity / Live events, confirm `app_open`, `ui_click`, etc.
5. Build the dashboard cards listed above.

If `VITE_POSTHOG_KEY` is empty, the app sends nothing (safe for local/dev).
