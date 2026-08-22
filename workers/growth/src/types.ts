export type GrowthEnv = {
  DB: D1Database;
  DESKTOP_BUCKET?: R2Bucket;
  SESSION_SECRET: string;
  BREVO_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  /** Fallback public URL if R2 object is not configured. Prefer DESKTOP_BUCKET. */
  DESKTOP_DOWNLOAD_URL?: string;
  DESKTOP_OBJECT_KEY?: string;
  PUBLIC_BASE_URL?: string;
  ADMIN_TOKEN?: string;
  BREVO_SENDER_EMAIL?: string;
  BREVO_SENDER_NAME?: string;
  BREVO_REPLY_TO?: string;
  BREVO_MARKETING_LIST_ID?: string;
  TURNSTILE_ENABLED?: string;
  DAILY_EMAIL_BUDGET?: string;
};

export type SignupSource =
  | 'desktop_download'
  | 'newsletter'
  | 'pro_beta'
  | 'profile_register'
  | 'feedback';

export type TokenPurpose = 'verify_email' | 'unsubscribe' | 'delete_account';

export type EmailTemplateKey =
  | 'verify_download'
  | 'verify_newsletter'
  | 'verify_profile'
  | 'verify_pro_beta';

export type FeedbackCategory = 'bug' | 'feature' | 'praise' | 'other';

export type AppSurface = 'web' | 'pwa' | 'desktop';

export const CONSENT_COPY_VERSION = '2026-08-21';
export const SESSION_COOKIE = 'mapshroom_session';
export const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const DOWNLOAD_GRANT_TTL_MS = 10 * 60 * 1000;
export const DEFAULT_DAILY_EMAIL_BUDGET = 300;

export type PublicUser = {
  id: string;
  emailMasked: string;
  verified: boolean;
  marketingOptIn: boolean;
  marketingConfirmed: boolean;
  locale: string;
  source: string;
};
