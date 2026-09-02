import posthog from 'posthog-js';
import {
  canCollectAnalytics,
  type AnalyticsSurface,
} from './analyticsScope.ts';

export {
  ANALYTICS_CONSENT_LATER_KEY,
  canCollectAnalytics,
  isOfficialAnalyticsHost,
  isPublicContentPath,
  shouldOfferAnalyticsConsent,
} from './analyticsScope.ts';

export const ANALYTICS_CONSENT_STORAGE_KEY = 'mapshroom-v3:analytics-consent';
export type AnalyticsConsent = 'granted' | 'denied';

/** Fired when projection-mapping onboarding is done or skipped, so consent can appear. */
export const ONBOARDING_COMPLETE_EVENT = 'mapshroom:onboarding-complete';

export function signalOnboardingComplete() {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(ONBOARDING_COMPLETE_EVENT));
}

let initialized = false;

function readConsent(): AnalyticsConsent | null {
  try {
    const value = localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    if (value === 'granted' || value === 'denied') {
      return value;
    }
  } catch {
    // Ignore storage failures (private mode, etc.).
  }
  return null;
}

function writeConsent(consent: AnalyticsConsent) {
  try {
    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent);
  } catch {
    // Ignore storage failures.
  }
}

function getConfig() {
  const key = (import.meta.env.VITE_POSTHOG_KEY as string | undefined)?.trim() ?? '';
  const apiHost =
    (import.meta.env.VITE_ANALYTICS_HOST as string | undefined)?.trim() ||
    'https://mapshroom.dev/a';
  return { key, apiHost };
}

function isAnalyticsConfigured() {
  return Boolean(getConfig().key);
}

function detectSurface(): AnalyticsSurface {
  if (typeof window === 'undefined') {
    return 'web';
  }
  if ('__TAURI_INTERNALS__' in window || '__TAURI__' in window) {
    return 'desktop';
  }
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  return standalone ? 'pwa' : 'web';
}

function readStoredUtm(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem('mapshroom-v3:utm');
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function captureUtmFromLocation() {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm = {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
    };
    if (utm.utm_source || utm.utm_medium || utm.utm_campaign) {
      sessionStorage.setItem('mapshroom-v3:utm', JSON.stringify(utm));
    }
  } catch {
    // Ignore storage failures.
  }
}

function baseEventProperties(): Record<string, string | number | boolean | null> {
  const utm = readStoredUtm();
  return {
    surface: detectSurface(),
    app_version: '3.0.1',
    locale: typeof navigator !== 'undefined' ? navigator.language || 'en' : 'en',
    utm_source: utm.utm_source ?? null,
    utm_medium: utm.utm_medium ?? null,
    utm_campaign: utm.utm_campaign ?? null,
  };
}

export function getAnalyticsConsent(): AnalyticsConsent | null {
  return readConsent();
}

function currentCollectionAllowed() {
  if (typeof window === 'undefined') {
    return false;
  }

  return canCollectAnalytics({
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    hash: window.location.hash,
    surface: detectSurface(),
  });
}

export function isAnalyticsActive() {
  return (
    initialized &&
    readConsent() === 'granted' &&
    isAnalyticsConfigured() &&
    currentCollectionAllowed()
  );
}

function ensureInitialized() {
  if (initialized || !isAnalyticsConfigured()) {
    return false;
  }

  const { key, apiHost } = getConfig();
  posthog.init(key, {
    api_host: apiHost,
    ui_host: 'https://eu.posthog.com',
    persistence: 'localStorage',
    // Lean product analytics only — no extras that burn event quota.
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    disable_surveys: true,
    enable_heatmaps: false,
    capture_performance: false,
    advanced_disable_feature_flags: true,
    advanced_disable_feature_flags_on_first_load: true,
    opt_out_capturing_by_default: true,
    loaded: (client) => {
      if (readConsent() === 'granted') {
        client.opt_in_capturing();
      } else {
        client.opt_out_capturing();
      }
    },
  });

  initialized = true;
  return true;
}

/** Call on app boot and when the route changes. Does not send events until consent is granted. */
export function initAnalytics() {
  captureUtmFromLocation();
  if (!isAnalyticsConfigured() || !currentCollectionAllowed()) {
    return;
  }
  ensureInitialized();
  if (readConsent() === 'granted') {
    posthog.opt_in_capturing();
  }
}

export function grantAnalyticsConsent() {
  writeConsent('granted');
  if (!isAnalyticsConfigured() || !currentCollectionAllowed()) {
    return;
  }
  ensureInitialized();
  posthog.opt_in_capturing();
  track('app_open', {
    path: window.location.hash || '#/',
    consent: 'granted',
  });
}

export function denyAnalyticsConsent() {
  writeConsent('denied');
  if (initialized) {
    posthog.opt_out_capturing();
    posthog.reset();
  }
}

export function track(event: string, properties?: Record<string, string | number | boolean | null>) {
  if (!isAnalyticsActive()) {
    return;
  }
  posthog.capture(event, {
    ...baseEventProperties(),
    ...properties,
  });
}

export function trackUiClick(name: string, properties?: Record<string, string | number | boolean | null>) {
  track('ui_click', { name, ...properties });
}

export type AnalyticsAiPresence = {
  has_api_key: boolean;
  shader_provider: string;
  shader_runtime: string;
};

export function setAnalyticsAiPresence(presence: AnalyticsAiPresence) {
  if (!isAnalyticsActive()) {
    return;
  }
  posthog.setPersonProperties({
    has_api_key: presence.has_api_key,
    shader_provider: presence.shader_provider,
    shader_runtime: presence.shader_runtime,
  });
}

export function trackApiPresence(presence: AnalyticsAiPresence) {
  setAnalyticsAiPresence(presence);
  track('api_settings_changed', presence);
}

export function trackLlmRequest(properties: {
  provider: string;
  runtime: string;
  outcome: 'success' | 'error';
  trigger: 'generate' | 'fix' | 'quick_add';
}) {
  track('llm_request', properties);
}

export function trackAppOpen(extra?: Record<string, string | number | boolean | null>) {
  track('app_open', {
    path: window.location.hash || '#/',
    ...extra,
  });
}

/** Identify a verified growth profile by opaque ID only — never email. */
export function identifyGrowthUser(userId: string) {
  if (!isAnalyticsActive() || !userId) {
    return;
  }
  posthog.identify(userId, {
    has_verified_email_profile: true,
  });
}

export function trackActivationMilestone(name: string) {
  track('activation_milestone', { name });
}
