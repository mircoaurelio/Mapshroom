import type { GrowthEnv } from '../types';
import { DEFAULT_DAILY_EMAIL_BUDGET } from '../types';
import { buildEmail, type EmailContent } from './emailTemplates';
import { addMs, nowIso } from './validation';
import { newId } from './crypto';

type OutboxRow = {
  id: string;
  user_id: string | null;
  to_email: string;
  template_key: string;
  payload_json: string;
  attempts: number;
};

function dailyBudget(env: GrowthEnv): number {
  const parsed = Number(env.DAILY_EMAIL_BUDGET || DEFAULT_DAILY_EMAIL_BUDGET);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_DAILY_EMAIL_BUDGET;
}

async function sentTodayCount(env: GrowthEnv): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM email_outbox WHERE status = 'sent' AND sent_at >= ?`,
  )
    .bind(start.toISOString())
    .first<{ count: number }>();
  return row?.count ?? 0;
}

async function sendViaBrevo(
  env: GrowthEnv,
  toEmail: string,
  content: EmailContent,
): Promise<{ ok: true } | { ok: false; error: string; quota?: boolean }> {
  if (!env.BREVO_API_KEY) {
    return { ok: false, error: 'BREVO_API_KEY missing' };
  }

  const senderEmail = env.BREVO_SENDER_EMAIL || 'download@mapshroom.dev';
  const senderName = env.BREVO_SENDER_NAME || 'Mapshroom';
  const replyTo = env.BREVO_REPLY_TO || senderEmail;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      replyTo: { email: replyTo, name: senderName },
      to: [{ email: toEmail }],
      subject: content.subject,
      htmlContent: content.html,
      textContent: content.text,
    }),
  });

  if (response.ok) {
    return { ok: true };
  }

  const text = await response.text();
  const quota =
    response.status === 402 ||
    response.status === 429 ||
    /quota|limit|credits/i.test(text);
  return { ok: false, error: `Brevo ${response.status}: ${text.slice(0, 400)}`, quota };
}

export async function enqueueEmail(
  env: GrowthEnv,
  input: {
    userId?: string | null;
    toEmail: string;
    templateKey: string;
    payload: Record<string, unknown>;
  },
): Promise<string> {
  const id = newId('mail');
  await env.DB.prepare(
    `INSERT INTO email_outbox
      (id, user_id, to_email, template_key, payload_json, status, attempts, scheduled_at, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
  )
    .bind(
      id,
      input.userId ?? null,
      input.toEmail,
      input.templateKey,
      JSON.stringify(input.payload),
      nowIso(),
      nowIso(),
    )
    .run();
  return id;
}

export async function processOutbox(env: GrowthEnv, limit = 20): Promise<{ sent: number; queued: number }> {
  const budget = dailyBudget(env);
  const alreadySent = await sentTodayCount(env);
  let remaining = Math.max(0, budget - alreadySent);
  let sent = 0;
  let queued = 0;

  const rows = await env.DB.prepare(
    `SELECT id, user_id, to_email, template_key, payload_json, attempts
     FROM email_outbox
     WHERE status IN ('pending', 'retry') AND scheduled_at <= ?
     ORDER BY scheduled_at ASC
     LIMIT ?`,
  )
    .bind(nowIso(), limit)
    .all<OutboxRow>();

  for (const row of rows.results ?? []) {
    if (remaining <= 0) {
      queued += 1;
      await env.DB.prepare(
        `UPDATE email_outbox SET status = 'retry', scheduled_at = ?, last_error = ? WHERE id = ?`,
      )
        .bind(addMs(60 * 60 * 1000), 'Daily email budget reached', row.id)
        .run();
      continue;
    }

    const payload = JSON.parse(row.payload_json) as {
      verifyUrl?: string;
      locale?: string;
    };
    const content = buildEmail(row.template_key as never, {
      verifyUrl: payload.verifyUrl || '',
      locale: payload.locale,
    });

    const result = await sendViaBrevo(env, row.to_email, content);
    if (result.ok) {
      remaining -= 1;
      sent += 1;
      await env.DB.prepare(
        `UPDATE email_outbox SET status = 'sent', sent_at = ?, attempts = attempts + 1, last_error = NULL WHERE id = ?`,
      )
        .bind(nowIso(), row.id)
        .run();
      continue;
    }

    const nextStatus = result.quota || row.attempts >= 4 ? 'retry' : 'retry';
    const delayMs = result.quota ? 60 * 60 * 1000 : Math.min(60 * 60 * 1000, 5 * 60 * 1000 * (row.attempts + 1));
    await env.DB.prepare(
      `UPDATE email_outbox
       SET status = ?, attempts = attempts + 1, last_error = ?, scheduled_at = ?
       WHERE id = ?`,
    )
      .bind(nextStatus, result.error, addMs(delayMs), row.id)
      .run();
    if (result.quota) {
      remaining = 0;
    }
    queued += 1;
  }

  return { sent, queued };
}

export async function syncBrevoMarketingContact(
  env: GrowthEnv,
  email: string,
  attrs: { locale?: string; source?: string },
): Promise<void> {
  if (!env.BREVO_API_KEY || !env.BREVO_MARKETING_LIST_ID) {
    return;
  }
  const listId = Number(env.BREVO_MARKETING_LIST_ID);
  if (!Number.isFinite(listId)) {
    return;
  }

  await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      email,
      updateEnabled: true,
      listIds: [listId],
      attributes: {
        LOCALE: attrs.locale || 'en',
        SOURCE: attrs.source || 'mapshroom',
      },
    }),
  });
}
