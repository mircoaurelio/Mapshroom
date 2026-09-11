import type { GrowthEnv, SignupSource } from '../types';
import { SESSION_COOKIE } from '../types';
import { errorJson, getClientIp, okJson, readJsonBody } from '../http';
import { createSessionToken, readSessionToken, sha256Hex } from '../lib/crypto';
import { enqueueEmail, processOutbox, syncBrevoMarketingContact } from '../lib/brevo';
import { templateForSource } from '../lib/emailTemplates';
import { consumeRateLimit } from '../lib/rateLimit';
import { verifyTurnstile } from '../lib/turnstile';
import { desktopDownload } from '../lib/desktopDownload';
import {
  asBool,
  clampText,
  isDisposableEmail,
  isExpired,
  normalizeEmail,
  parseUtm,
} from '../lib/validation';
import {
  readDownloadGrant,
  recordDownload,
  consumeToken,
  findUserByEmail,
  findUserById,
  issueDownloadGrant,
  issueToken,
  peekToken,
  recordConsentEvent,
  softDeleteUser,
  toPublicUser,
  unsubscribeMarketing,
  upsertSignupUser,
  type UserRow,
} from '../lib/users';
import { newId } from '../lib/crypto';
import { nowIso } from '../lib/validation';

function publicBaseUrl(env: GrowthEnv, request: Request): string {
  return (env.PUBLIC_BASE_URL || new URL(request.url).origin).replace(/\/$/, '');
}

function parseCookie(header: string | null, name: string): string | null {
  if (!header) {
    return null;
  }
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

function sessionCookieHeader(token: string, maxAgeSeconds = 60 * 60 * 24 * 30): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

async function currentUser(env: GrowthEnv, request: Request): Promise<UserRow | null> {
  const token = parseCookie(request.headers.get('cookie'), SESSION_COOKIE);
  const session = await readSessionToken(env.SESSION_SECRET, token);
  if (!session) {
    return null;
  }
  return findUserById(env, session.uid);
}

function isAdmin(request: Request, env: GrowthEnv): boolean {
  const accessEmail = request.headers.get('cf-access-authenticated-user-email');
  if (accessEmail) {
    return true;
  }
  if (env.ADMIN_TOKEN && request.headers.get('x-admin-token') === env.ADMIN_TOKEN) {
    return true;
  }
  return false;
}

const VALID_SOURCES = new Set<SignupSource>([
  'desktop_download',
  'newsletter',
  'pro_beta',
  'profile_register',
  'feedback',
]);

async function genericSignupResponse(): Promise<Response> {
  return okJson({
    queued: true,
    message:
      'If this email can receive mail, you will get a verification link shortly. Check your inbox and spam folder.',
  });
}

async function handleSignup(request: Request, env: GrowthEnv): Promise<Response> {
  const body = await readJsonBody<{
    email?: string;
    marketingOptIn?: boolean;
    source?: string;
    locale?: string;
    turnstileToken?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  }>(request);
  if (!body) {
    return errorJson(400, 'invalid_json', 'Invalid request body.');
  }

  const email = normalizeEmail(body.email || '');
  if (!email || isDisposableEmail(email)) {
    return errorJson(400, 'invalid_email', 'Enter a valid email address.');
  }

  const turnstileOk = await verifyTurnstile(env, request, body.turnstileToken);
  if (!turnstileOk) {
    return errorJson(400, 'turnstile_failed', 'Human verification failed. Please try again.');
  }

  const ipHash = await sha256Hex(getClientIp(request));
  const emailHash = await sha256Hex(email);
  const ipLimit = await consumeRateLimit(env, `signup:ip:${ipHash}`, 8, 60 * 60 * 1000);
  const emailLimit = await consumeRateLimit(env, `signup:email:${emailHash}`, 3, 60 * 60 * 1000);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    return genericSignupResponse();
  }

  const source = VALID_SOURCES.has(body.source as SignupSource)
    ? (body.source as SignupSource)
    : 'desktop_download';
  const locale = body.locale === 'it' ? 'it' : 'en';
  const marketingOptIn = asBool(body.marketingOptIn);
  const utm = parseUtm(body);

  const user = await upsertSignupUser(env, {
    emailNormalized: email,
    locale,
    source,
    marketingOptIn,
    utm,
  });

  await recordConsentEvent(env, {
    userId: user.id,
    eventType: marketingOptIn ? 'signup_marketing_requested' : 'signup_email_only',
    purpose: marketingOptIn ? 'marketing' : 'identity',
    source,
  });

  const rawToken = await issueToken(env, user.id, 'verify_email');
  const verifyUrl = `${publicBaseUrl(env, request)}/#/verify?token=${encodeURIComponent(rawToken)}`;
  await enqueueEmail(env, {
    userId: user.id,
    toEmail: email,
    templateKey: templateForSource(source),
    payload: { verifyUrl, locale },
  });
  await processOutbox(env, 5);

  return genericSignupResponse();
}

async function handleVerifyGet(request: Request, env: GrowthEnv): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  if (!token) {
    return errorJson(400, 'missing_token', 'Missing verification token.');
  }
  const peeked = await peekToken(env, token, 'verify_email');
  if (!peeked) {
    return okJson({ status: 'invalid' });
  }
  if (peeked.consumedAt) {
    return okJson({ status: 'consumed' });
  }
  if (isExpired(peeked.expiresAt)) {
    return okJson({ status: 'expired' });
  }
  return okJson({ status: 'ready' });
}

async function handleVerifyPost(request: Request, env: GrowthEnv): Promise<Response> {
  const body = await readJsonBody<{ token?: string }>(request);
  const token = body?.token || '';
  if (!token) {
    return errorJson(400, 'missing_token', 'Missing verification token.');
  }

  const user = await consumeToken(env, token, 'verify_email');
  if (!user) {
    return errorJson(400, 'invalid_token', 'This verification link is invalid or expired.');
  }

  if (user.marketing_opt_in && user.marketing_confirmed_at) {
    await syncBrevoMarketingContact(env, user.email_normalized, {
      locale: user.locale,
      source: user.source,
    });
  }

  const session = await createSessionToken(env.SESSION_SECRET, user.id);
  const downloadGrant =
    user.source === 'desktop_download' || user.source === 'pro_beta'
      ? await issueDownloadGrant(env, user.id)
      : null;

  const response = okJson({
    user: toPublicUser(user),
    downloadGrant,
    downloadReady: Boolean(downloadGrant),
  });
  response.headers.set('set-cookie', sessionCookieHeader(session));
  return response;
}

async function handleResend(request: Request, env: GrowthEnv): Promise<Response> {
  const body = await readJsonBody<{ email?: string; turnstileToken?: string; locale?: string }>(
    request,
  );
  const email = normalizeEmail(body?.email || '');
  if (!email) {
    return genericSignupResponse();
  }
  const turnstileOk = await verifyTurnstile(env, request, body?.turnstileToken);
  if (!turnstileOk) {
    return errorJson(400, 'turnstile_failed', 'Human verification failed. Please try again.');
  }

  const emailHash = await sha256Hex(email);
  const limited = await consumeRateLimit(env, `resend:${emailHash}`, 3, 60 * 60 * 1000);
  if (!limited.allowed) {
    return genericSignupResponse();
  }

  const user = await findUserByEmail(env, email);
  if (user && !user.verified_at) {
    const rawToken = await issueToken(env, user.id, 'verify_email');
    const verifyUrl = `${publicBaseUrl(env, request)}/#/verify?token=${encodeURIComponent(rawToken)}`;
    await enqueueEmail(env, {
      userId: user.id,
      toEmail: email,
      templateKey: templateForSource(user.source),
      payload: { verifyUrl, locale: body?.locale === 'it' ? 'it' : user.locale },
    });
    await processOutbox(env, 5);
  }

  return genericSignupResponse();
}

async function handleSession(request: Request, env: GrowthEnv): Promise<Response> {
  const user = await currentUser(env, request);
  if (!user) {
    return okJson({ user: null });
  }
  return okJson({ user: toPublicUser(user) });
}

async function handlePreferences(request: Request, env: GrowthEnv): Promise<Response> {
  const user = await currentUser(env, request);
  if (!user) {
    return errorJson(401, 'unauthorized', 'Sign in with a verified email link first.');
  }
  const body = await readJsonBody<{ marketingOptIn?: boolean }>(request);
  const marketingOptIn = asBool(body?.marketingOptIn);
  if (!marketingOptIn) {
    await unsubscribeMarketing(env, user.id);
  } else {
    await env.DB.prepare(
      `UPDATE users SET marketing_opt_in = 1, marketing_unsubscribed_at = NULL, updated_at = ? WHERE id = ?`,
    )
      .bind(nowIso(), user.id)
      .run();
    await recordConsentEvent(env, {
      userId: user.id,
      eventType: 'marketing_requested',
      purpose: 'marketing',
      source: 'profile',
    });
    if (user.verified_at) {
      await env.DB.prepare(
        `UPDATE users SET marketing_confirmed_at = COALESCE(marketing_confirmed_at, ?) WHERE id = ?`,
      )
        .bind(nowIso(), user.id)
        .run();
      await syncBrevoMarketingContact(env, user.email_normalized, {
        locale: user.locale,
        source: user.source,
      });
    }
  }
  const refreshed = await findUserById(env, user.id);
  return okJson({ user: refreshed ? toPublicUser(refreshed) : null });
}

async function handleUnsubscribe(request: Request, env: GrowthEnv): Promise<Response> {
  const body = await readJsonBody<{ token?: string }>(request);
  if (body?.token) {
    const peeked = await peekToken(env, body.token, 'unsubscribe');
    if (!peeked || isExpired(peeked.expiresAt)) {
      return errorJson(400, 'invalid_token', 'Invalid unsubscribe link.');
    }
    await unsubscribeMarketing(env, peeked.userId);
    return okJson({ unsubscribed: true });
  }
  const user = await currentUser(env, request);
  if (!user) {
    return errorJson(401, 'unauthorized', 'Missing session or unsubscribe token.');
  }
  await unsubscribeMarketing(env, user.id);
  return okJson({ unsubscribed: true });
}

async function handleDelete(request: Request, env: GrowthEnv): Promise<Response> {
  const body = await readJsonBody<{ token?: string }>(request);
  let userId: string | null = null;
  if (body?.token) {
    const peeked = await peekToken(env, body.token, 'delete_account');
    if (!peeked || isExpired(peeked.expiresAt)) {
      return errorJson(400, 'invalid_token', 'Invalid delete link.');
    }
    userId = peeked.userId;
  } else {
    const user = await currentUser(env, request);
    userId = user?.id ?? null;
  }
  if (!userId) {
    return errorJson(401, 'unauthorized', 'Missing session or delete token.');
  }
  await softDeleteUser(env, userId);
  const response = okJson({ deleted: true });
  response.headers.set('set-cookie', clearSessionCookie());
  return response;
}

async function handleFeedback(request: Request, env: GrowthEnv): Promise<Response> {
  const body = await readJsonBody<{
    category?: string;
    rating?: number;
    message?: string;
    email?: string;
    appVersion?: string;
    surface?: string;
    route?: string;
    turnstileToken?: string;
  }>(request);
  if (!body) {
    return errorJson(400, 'invalid_json', 'Invalid request body.');
  }

  const turnstileOk = await verifyTurnstile(env, request, body.turnstileToken);
  if (!turnstileOk) {
    return errorJson(400, 'turnstile_failed', 'Human verification failed. Please try again.');
  }

  const message = clampText(body.message, 4000);
  if (message.length < 3) {
    return errorJson(400, 'invalid_message', 'Please share a short message.');
  }

  const category =
    body.category === 'bug' ||
    body.category === 'feature' ||
    body.category === 'praise' ||
    body.category === 'other'
      ? body.category
      : 'other';
  const rating =
    typeof body.rating === 'number' && body.rating >= 1 && body.rating <= 5
      ? Math.round(body.rating)
      : null;
  const email = normalizeEmail(body.email || '') || null;
  const user = await currentUser(env, request);
  const ipHash = await sha256Hex(getClientIp(request));
  const limited = await consumeRateLimit(env, `feedback:ip:${ipHash}`, 10, 60 * 60 * 1000);
  if (!limited.allowed) {
    return errorJson(429, 'rate_limited', 'Too many feedback submissions. Try again later.');
  }

  await env.DB.prepare(
    `INSERT INTO feedback
      (id, user_id, email_normalized, category, rating, message, app_version, surface, route, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      newId('fbk'),
      user?.id ?? null,
      email || user?.email_normalized || null,
      category,
      rating,
      message,
      clampText(body.appVersion, 40) || null,
      clampText(body.surface, 20) || null,
      clampText(body.route, 120) || null,
      nowIso(),
    )
    .run();

  return okJson({ received: true });
}

async function handleDownloadGrant(request: Request, env: GrowthEnv): Promise<Response> {
  const url = new URL(request.url);
  const grant = url.searchParams.get('grant');
  if (url.pathname === '/api/download-grant') {
    const user = await currentUser(env, request);
    if (!user?.verified_at) {
      return errorJson(401, 'unauthorized', 'Verify your email before downloading.');
    }
    const freshGrant = await issueDownloadGrant(env, user.id);
    return okJson({
      grant: freshGrant,
      downloadUrl: `/api/download?grant=${encodeURIComponent(freshGrant)}`,
    });
  }

  const user = (grant ? await readDownloadGrant(env, grant) : null) ?? await currentUser(env, request);
  if (!user?.verified_at) {
    return errorJson(400, 'invalid_grant', 'This download link expired. Request a new one.');
  }

  const objectKey = (env.DESKTOP_OBJECT_KEY || 'Mapshroom_3.0.2_x64-setup.exe').trim();
  if (env.DESKTOP_BUCKET) {
    const response = await desktopDownload(request, env.DESKTOP_BUCKET, objectKey);
    if (response.ok && request.method === 'GET') {
      await recordDownload(env, user.id, grant);
    }
    return response;
  }

  if (env.DESKTOP_DOWNLOAD_URL) {
    return Response.redirect(env.DESKTOP_DOWNLOAD_URL, 302);
  }
  return errorJson(503, 'download_unavailable', 'Desktop installer is not configured yet.');
}

async function handleAdminUsers(request: Request, env: GrowthEnv): Promise<Response> {
  if (!isAdmin(request, env)) {
    return errorJson(401, 'unauthorized', 'Admin authentication required.');
  }
  const rows = await env.DB.prepare(
    `SELECT id, email_normalized, locale, source, verified_at, marketing_opt_in,
            marketing_confirmed_at, created_at, last_download_at, utm_source, utm_campaign
     FROM users
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT 500`,
  ).all();
  return okJson({ users: rows.results ?? [] });
}

async function handleAdminFeedback(request: Request, env: GrowthEnv): Promise<Response> {
  if (!isAdmin(request, env)) {
    return errorJson(401, 'unauthorized', 'Admin authentication required.');
  }
  const rows = await env.DB.prepare(
    `SELECT id, email_normalized, category, rating, message, app_version, surface, route, created_at
     FROM feedback
     ORDER BY created_at DESC
     LIMIT 500`,
  ).all();
  return okJson({ feedback: rows.results ?? [] });
}

async function handleAdminExport(request: Request, env: GrowthEnv): Promise<Response> {
  if (!isAdmin(request, env)) {
    return errorJson(401, 'unauthorized', 'Admin authentication required.');
  }
  const rows = await env.DB.prepare(
    `SELECT email_normalized, locale, source, verified_at, marketing_opt_in,
            marketing_confirmed_at, created_at, last_download_at, utm_source, utm_medium, utm_campaign
     FROM users
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`,
  ).all<{
    email_normalized: string;
    locale: string;
    source: string;
    verified_at: string | null;
    marketing_opt_in: number;
    marketing_confirmed_at: string | null;
    created_at: string;
    last_download_at: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
  }>();

  const header = [
    'email',
    'locale',
    'source',
    'verified_at',
    'marketing_opt_in',
    'marketing_confirmed_at',
    'created_at',
    'last_download_at',
    'utm_source',
    'utm_medium',
    'utm_campaign',
  ];
  const lines = [header.join(',')];
  for (const row of rows.results ?? []) {
    lines.push(
      [
        row.email_normalized,
        row.locale,
        row.source,
        row.verified_at ?? '',
        String(row.marketing_opt_in),
        row.marketing_confirmed_at ?? '',
        row.created_at,
        row.last_download_at ?? '',
        row.utm_source ?? '',
        row.utm_medium ?? '',
        row.utm_campaign ?? '',
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    );
  }

  return new Response(lines.join('\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="mapshroom-leads.csv"',
      'cache-control': 'no-store',
    },
  });
}

export async function handleApiRequest(request: Request, env: GrowthEnv): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';

  if (request.method === 'OPTIONS') {
    return okJson({});
  }

  if (path === '/api/health' && request.method === 'GET') {
    return okJson({ service: 'mapshroom-growth', ts: nowIso() });
  }
  if (path === '/api/signup' && request.method === 'POST') {
    return handleSignup(request, env);
  }
  if (path === '/api/verify' && request.method === 'GET') {
    return handleVerifyGet(request, env);
  }
  if (path === '/api/verify' && request.method === 'POST') {
    return handleVerifyPost(request, env);
  }
  if (path === '/api/resend' && request.method === 'POST') {
    return handleResend(request, env);
  }
  if (path === '/api/session' && request.method === 'GET') {
    return handleSession(request, env);
  }
  if (path === '/api/preferences' && request.method === 'POST') {
    return handlePreferences(request, env);
  }
  if (path === '/api/unsubscribe' && request.method === 'POST') {
    return handleUnsubscribe(request, env);
  }
  if (path === '/api/delete' && request.method === 'POST') {
    return handleDelete(request, env);
  }
  if (path === '/api/feedback' && request.method === 'POST') {
    return handleFeedback(request, env);
  }
  if ((path === '/api/download' && (request.method === 'GET' || request.method === 'HEAD')) ||
      (path === '/api/download-grant' && request.method === 'GET')) {
    return handleDownloadGrant(request, env);
  }
  if (path === '/api/admin/users' && request.method === 'GET') {
    return handleAdminUsers(request, env);
  }
  if (path === '/api/admin/feedback' && request.method === 'GET') {
    return handleAdminFeedback(request, env);
  }
  if (path === '/api/admin/export.csv' && request.method === 'GET') {
    return handleAdminExport(request, env);
  }
  if (path === '/api/admin/drain-outbox' && (request.method === 'POST' || request.method === 'GET')) {
    if (!isAdmin(request, env)) {
      return errorJson(401, 'unauthorized', 'Admin authentication required.');
    }
    const result = await processOutbox(env, 40);
    return okJson(result);
  }

  return errorJson(404, 'not_found', 'Unknown API route.');
}

export async function handleScheduled(env: GrowthEnv): Promise<void> {
  await processOutbox(env, 40);
}
