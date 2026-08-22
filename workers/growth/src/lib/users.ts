import type { GrowthEnv, PublicUser, SignupSource, TokenPurpose } from '../types';
import {
  CONSENT_COPY_VERSION,
  DOWNLOAD_GRANT_TTL_MS,
  TOKEN_TTL_MS,
} from '../types';
import { newId, randomToken, sha256Hex } from './crypto';
import { addMs, maskEmail, nowIso } from './validation';

export type UserRow = {
  id: string;
  email_normalized: string;
  email_hash: string;
  locale: string;
  source: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  verified_at: string | null;
  marketing_opt_in: number;
  marketing_confirmed_at: string | null;
  marketing_unsubscribed_at: string | null;
  consent_copy_version: string | null;
  created_at: string;
  updated_at: string;
  last_download_at: string | null;
  deleted_at: string | null;
};

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    emailMasked: maskEmail(row.email_normalized),
    verified: Boolean(row.verified_at),
    marketingOptIn: Boolean(row.marketing_opt_in),
    marketingConfirmed: Boolean(row.marketing_confirmed_at),
    locale: row.locale,
    source: row.source,
  };
}

export async function findUserByEmail(
  env: GrowthEnv,
  emailNormalized: string,
): Promise<UserRow | null> {
  return (
    (await env.DB.prepare(
      'SELECT * FROM users WHERE email_normalized = ? AND deleted_at IS NULL',
    )
      .bind(emailNormalized)
      .first<UserRow>()) ?? null
  );
}

export async function findUserById(env: GrowthEnv, id: string): Promise<UserRow | null> {
  return (
    (await env.DB.prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL')
      .bind(id)
      .first<UserRow>()) ?? null
  );
}

export async function upsertSignupUser(
  env: GrowthEnv,
  input: {
    emailNormalized: string;
    locale: string;
    source: SignupSource;
    marketingOptIn: boolean;
    utm: { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null };
  },
): Promise<UserRow> {
  const existing = await findUserByEmail(env, input.emailNormalized);
  const stamp = nowIso();
  if (existing) {
    await env.DB.prepare(
      `UPDATE users
       SET locale = ?, source = COALESCE(?, source),
           utm_source = COALESCE(?, utm_source),
           utm_medium = COALESCE(?, utm_medium),
           utm_campaign = COALESCE(?, utm_campaign),
           marketing_opt_in = CASE WHEN ? = 1 THEN 1 ELSE marketing_opt_in END,
           consent_copy_version = ?,
           updated_at = ?
       WHERE id = ?`,
    )
      .bind(
        input.locale,
        input.source,
        input.utm.utm_source,
        input.utm.utm_medium,
        input.utm.utm_campaign,
        input.marketingOptIn ? 1 : 0,
        CONSENT_COPY_VERSION,
        stamp,
        existing.id,
      )
      .run();
    return (await findUserById(env, existing.id))!;
  }

  const id = newId('usr');
  const emailHash = await sha256Hex(input.emailNormalized);
  await env.DB.prepare(
    `INSERT INTO users (
      id, email_normalized, email_hash, locale, source,
      utm_source, utm_medium, utm_campaign,
      marketing_opt_in, consent_copy_version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      input.emailNormalized,
      emailHash,
      input.locale,
      input.source,
      input.utm.utm_source,
      input.utm.utm_medium,
      input.utm.utm_campaign,
      input.marketingOptIn ? 1 : 0,
      CONSENT_COPY_VERSION,
      stamp,
      stamp,
    )
    .run();

  return (await findUserById(env, id))!;
}

export async function recordConsentEvent(
  env: GrowthEnv,
  input: {
    userId: string;
    eventType: string;
    purpose: string;
    source?: string;
  },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO consent_events (id, user_id, event_type, purpose, copy_version, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      newId('cns'),
      input.userId,
      input.eventType,
      input.purpose,
      CONSENT_COPY_VERSION,
      input.source ?? null,
      nowIso(),
    )
    .run();
}

export async function issueToken(
  env: GrowthEnv,
  userId: string,
  purpose: TokenPurpose,
): Promise<string> {
  const raw = await randomToken(32);
  const tokenHash = await sha256Hex(raw);
  await env.DB.prepare(
    `INSERT INTO verification_tokens (id, user_id, token_hash, purpose, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(newId('tok'), userId, tokenHash, purpose, addMs(TOKEN_TTL_MS), nowIso())
    .run();
  return raw;
}

export async function peekToken(
  env: GrowthEnv,
  rawToken: string,
  purpose?: TokenPurpose,
): Promise<{ userId: string; purpose: string; expiresAt: string; consumedAt: string | null } | null> {
  const tokenHash = await sha256Hex(rawToken);
  const row = await env.DB.prepare(
    `SELECT user_id, purpose, expires_at, consumed_at
     FROM verification_tokens WHERE token_hash = ?`,
  )
    .bind(tokenHash)
    .first<{
      user_id: string;
      purpose: string;
      expires_at: string;
      consumed_at: string | null;
    }>();
  if (!row) {
    return null;
  }
  if (purpose && row.purpose !== purpose) {
    return null;
  }
  return {
    userId: row.user_id,
    purpose: row.purpose,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at,
  };
}

export async function consumeToken(
  env: GrowthEnv,
  rawToken: string,
  purpose: TokenPurpose,
): Promise<UserRow | null> {
  const peeked = await peekToken(env, rawToken, purpose);
  if (!peeked || peeked.consumedAt || new Date(peeked.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  const tokenHash = await sha256Hex(rawToken);
  const stamp = nowIso();
  await env.DB.prepare(
    `UPDATE verification_tokens SET consumed_at = ? WHERE token_hash = ? AND consumed_at IS NULL`,
  )
    .bind(stamp, tokenHash)
    .run();

  const user = await findUserById(env, peeked.userId);
  if (!user) {
    return null;
  }

  if (purpose === 'verify_email') {
    await env.DB.prepare(
      `UPDATE users
       SET verified_at = COALESCE(verified_at, ?),
           marketing_confirmed_at = CASE
             WHEN marketing_opt_in = 1 THEN COALESCE(marketing_confirmed_at, ?)
             ELSE marketing_confirmed_at
           END,
           updated_at = ?
       WHERE id = ?`,
    )
      .bind(stamp, stamp, stamp, user.id)
      .run();
    await recordConsentEvent(env, {
      userId: user.id,
      eventType: 'email_verified',
      purpose: 'identity',
      source: user.source,
    });
    if (user.marketing_opt_in) {
      await recordConsentEvent(env, {
        userId: user.id,
        eventType: 'marketing_confirmed',
        purpose: 'marketing',
        source: user.source,
      });
    }
  }

  return findUserById(env, user.id);
}

export async function issueDownloadGrant(env: GrowthEnv, userId: string): Promise<string> {
  const raw = await randomToken(24);
  const tokenHash = await sha256Hex(raw);
  await env.DB.prepare(
    `INSERT INTO download_grants (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(newId('dlg'), userId, tokenHash, addMs(DOWNLOAD_GRANT_TTL_MS), nowIso())
    .run();
  return raw;
}

export async function consumeDownloadGrant(
  env: GrowthEnv,
  rawToken: string,
): Promise<UserRow | null> {
  const tokenHash = await sha256Hex(rawToken);
  const row = await env.DB.prepare(
    `SELECT user_id, expires_at, consumed_at FROM download_grants WHERE token_hash = ?`,
  )
    .bind(tokenHash)
    .first<{ user_id: string; expires_at: string; consumed_at: string | null }>();
  if (!row || row.consumed_at || new Date(row.expires_at).getTime() <= Date.now()) {
    return null;
  }
  const stamp = nowIso();
  await env.DB.prepare(
    `UPDATE download_grants SET consumed_at = ? WHERE token_hash = ? AND consumed_at IS NULL`,
  )
    .bind(stamp, tokenHash)
    .run();
  await env.DB.prepare(`UPDATE users SET last_download_at = ?, updated_at = ? WHERE id = ?`)
    .bind(stamp, stamp, row.user_id)
    .run();
  return findUserById(env, row.user_id);
}

export async function softDeleteUser(env: GrowthEnv, userId: string): Promise<void> {
  const stamp = nowIso();
  await env.DB.prepare(
    `UPDATE users
     SET deleted_at = ?, email_normalized = ?, email_hash = ?, updated_at = ?,
         marketing_opt_in = 0, marketing_unsubscribed_at = ?
     WHERE id = ?`,
  )
    .bind(stamp, `deleted+${userId}@invalid.local`, await sha256Hex(`deleted:${userId}`), stamp, stamp, userId)
    .run();
  await recordConsentEvent(env, {
    userId,
    eventType: 'account_deleted',
    purpose: 'erasure',
  });
}

export async function unsubscribeMarketing(env: GrowthEnv, userId: string): Promise<void> {
  const stamp = nowIso();
  await env.DB.prepare(
    `UPDATE users
     SET marketing_opt_in = 0, marketing_unsubscribed_at = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(stamp, stamp, userId)
    .run();
  await recordConsentEvent(env, {
    userId,
    eventType: 'marketing_unsubscribed',
    purpose: 'marketing',
  });
}
