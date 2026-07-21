# PostHog EU setup for Mapshroom

Product analytics uses **PostHog Cloud EU** plus a **Cloudflare Worker** first-party proxy on `mapshroom.dev/a/*`. View KPIs in the PostHog dashboard — there is no in-app admin page.

Lean by design: no session replay, surveys, heatmaps, web-vitals, feature flags, pageleave, or heartbeats. Only consented product events.

## 1. Create the PostHog EU project

1. Sign up / log in at [eu.posthog.com](https://eu.posthog.com).
2. Create a project (region must be **EU**).
3. Open **Project settings → Project API key** (starts with `phc_`).
4. Set **Data retention** to 30–90 days.
5. Disable unused products: Session replay, Surveys, Heatmaps, Feature flags (if unused).

## 2. App environment variables

Set these for production (Cloudflare Pages / local `.env`):

```bash
VITE_POSTHOG_KEY=phc_your_project_api_key
VITE_ANALYTICS_HOST=https://mapshroom.dev/a
```

Leave empty locally unless you intentionally want to test (each reload burns events).

## 3. Deploy the Cloudflare Worker

```bash
cd workers/analytics
npx wrangler login
npx wrangler deploy
```

Route must be `mapshroom.dev/a/*` (not `a*`, which would steal `/assets`).

## 4. Dashboard (“Mapshroom product”)

**Dashboards → New dashboard**, add:

| Card | How |
|------|-----|
| Unique users (7d / 30d) | Trends → `app_open` → Unique users |
| Returning / retention | Insights → Retention → recurring `app_open` |
| Top feature clicks | Trends → `ui_click` → Breakdown `name` |
| LLM ask rate | Unique users with `llm_request` ÷ unique with `app_open` |
| API presence rate | `app_open` where `has_api_key` = true ÷ all `app_open` |
| Exports / shares | Trends → `export_mp4`, `share_project` |
| Location | `app_open` → Breakdown by Country |

### Events (lean set)

| Event | Meaning |
|-------|---------|
| `app_open` | Visit (+ person props `has_api_key`, `shader_provider`, `shader_runtime`) |
| `ui_click` | Feature use via `name` (projects, export, presets, LLM UI entry points, etc.) |
| `llm_request` | AI generate/fix (`provider`, `runtime`, `outcome`, `trigger`) — never prompt text |
| `api_settings_changed` | Provider / API presence changed |
| `export_mp4` | Timeline export completed |
| `share_project` | Share link generated |
| `onboarding_complete` / `onboarding_dismiss` | Guide finished or dismissed |

**Never** collected: prompts, shader source, API keys, project files.

## 5. Verify + credit hygiene

1. Open mapshroom.dev, Accept analytics.
2. Network: requests to `mapshroom.dev/a/...` return 200 (no surveys/web-vitals scripts).
3. PostHog Live events: only names from the table above.
4. Billing: confirm event volume stays low (no per-minute heartbeats).

If `VITE_POSTHOG_KEY` is empty, the app sends nothing.
