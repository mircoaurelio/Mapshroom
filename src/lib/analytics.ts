import posthog from 'posthog-js';

export const ANALYTICS_CONSENT_STORAGE_KEY = 'mapshroom-v3:analytics-consent';
export type AnalyticsConsent = 'granted' | 'denied';

const HEARTBEAT_INTERVAL_MS = 60_000;

let initialized = false;
let heartbeatTimer: number | null = null;

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

export function getAnalyticsConsent(): AnalyticsConsent | null {
  return readConsent();
}

export function isAnalyticsActive() {
  return initialized && readConsent() === 'granted' && isAnalyticsConfigured();
}

function startHeartbeat() {
  stopHeartbeat();
  if (!isAnalyticsActive()) {
    return;
  }

  const sendHeartbeat = () => {
    if (!isAnalyticsActive() || document.visibilityState !== 'visible') {
      return;
    }
    track('app_heartbeat', { path: window.location.hash || '#/' });
  };

  heartbeatTimer = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat() {
  if (heartbeatTimer !== null) {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
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
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: true,
    disable_session_recording: true,
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

/** Call once on app boot. Does not send events until consent is granted. */
export function initAnalytics() {
  if (!isAnalyticsConfigured()) {
    return;
  }
  ensureInitialized();
  if (readConsent() === 'granted') {
    posthog.opt_in_capturing();
    startHeartbeat();
  }
}

export function grantAnalyticsConsent() {
  writeConsent('granted');
  if (!isAnalyticsConfigured()) {
    return;
  }
  ensureInitialized();
  posthog.opt_in_capturing();
  track('app_open', {
    path: window.location.hash || '#/',
    consent: 'granted',
  });
  startHeartbeat();
}

export function denyAnalyticsConsent() {
  writeConsent('denied');
  stopHeartbeat();
  if (initialized) {
    posthog.opt_out_capturing();
    posthog.reset();
  }
}

export function track(event: string, properties?: Record<string, string | number | boolean | null>) {
  if (!isAnalyticsActive()) {
    return;
  }
  posthog.capture(event, properties);
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
