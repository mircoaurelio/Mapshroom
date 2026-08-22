import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isDisposableEmail,
  maskEmail,
  normalizeEmail,
  parseUtm,
} from '../workers/growth/src/lib/validation.ts';
import { createSessionToken, readSessionToken, sha256Hex } from '../workers/growth/src/lib/crypto.ts';
import { buildEmail, templateForSource } from '../workers/growth/src/lib/emailTemplates.ts';

test('normalizeEmail accepts valid addresses and rejects junk', () => {
  assert.equal(normalizeEmail('  Alex@Example.com '), 'alex@example.com');
  assert.equal(normalizeEmail('not-an-email'), null);
  assert.equal(normalizeEmail(''), null);
});

test('disposable domains are blocked', () => {
  assert.equal(isDisposableEmail('user@mailinator.com'), true);
  assert.equal(isDisposableEmail('user@gmail.com'), false);
});

test('maskEmail hides most of the local part', () => {
  assert.equal(maskEmail('hello@mapshroom.dev'), 'he***@mapshroom.dev');
});

test('parseUtm clamps campaign fields', () => {
  const utm = parseUtm({
    utm_source: 'ig',
    utm_medium: 'social',
    utm_campaign: 'creator-challenge',
  });
  assert.equal(utm.utm_source, 'ig');
  assert.equal(utm.utm_campaign, 'creator-challenge');
});

test('sha256Hex is stable', async () => {
  const hash = await sha256Hex('mapshroom');
  assert.equal(hash.length, 64);
  assert.equal(hash, await sha256Hex('mapshroom'));
});

test('session tokens round-trip and reject tampering', async () => {
  const secret = 'test-session-secret';
  const token = await createSessionToken(secret, 'usr_123', 60);
  const payload = await readSessionToken(secret, token);
  assert.equal(payload?.uid, 'usr_123');
  assert.equal(await readSessionToken(secret, `${token}x`), null);
});

test('email templates cover download and newsletter', () => {
  assert.equal(templateForSource('desktop_download'), 'verify_download');
  assert.equal(templateForSource('newsletter'), 'verify_newsletter');
  const email = buildEmail('verify_download', {
    verifyUrl: 'https://mapshroom.dev/#/verify?token=abc',
    locale: 'en',
  });
  assert.match(email.subject, /Windows beta/i);
  assert.match(email.html, /#34d399/);
  assert.match(email.html, /Verify email/);
  assert.match(email.text, /mapshroom.dev/);
});
