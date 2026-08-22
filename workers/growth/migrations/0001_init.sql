-- Mapshroom growth foundation: email profiles, consents, feedback, outbox.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email_normalized TEXT NOT NULL UNIQUE,
  email_hash TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  source TEXT NOT NULL DEFAULT 'desktop_download',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  verified_at TEXT,
  marketing_opt_in INTEGER NOT NULL DEFAULT 0,
  marketing_confirmed_at TEXT,
  marketing_unsubscribed_at TEXT,
  consent_copy_version TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_download_at TEXT,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_verified_at ON users (verified_at);
CREATE INDEX IF NOT EXISTS idx_users_marketing ON users (marketing_opt_in, marketing_confirmed_at);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at);

CREATE TABLE IF NOT EXISTS verification_tokens (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_tokens_user_purpose ON verification_tokens (user_id, purpose);
CREATE INDEX IF NOT EXISTS idx_tokens_expires ON verification_tokens (expires_at);

CREATE TABLE IF NOT EXISTS consent_events (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  purpose TEXT NOT NULL,
  copy_version TEXT NOT NULL,
  source TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_consent_user ON consent_events (user_id, created_at);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  email_normalized TEXT,
  category TEXT NOT NULL,
  rating INTEGER,
  message TEXT NOT NULL,
  app_version TEXT,
  surface TEXT,
  route TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback (created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback (category);

CREATE TABLE IF NOT EXISTS email_outbox (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  to_email TEXT NOT NULL,
  template_key TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  scheduled_at TEXT NOT NULL,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_sched ON email_outbox (status, scheduled_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key TEXT PRIMARY KEY NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS download_grants (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_download_grants_user ON download_grants (user_id);
