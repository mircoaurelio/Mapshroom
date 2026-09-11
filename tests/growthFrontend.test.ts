import assert from 'node:assert/strict';
import test from 'node:test';

test('production signup has its public Turnstile key even without build environment variables', async () => {
  const { getTurnstileSiteKey } = await import('../src/lib/growthApi.ts');
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  try {
    for (const hostname of ['mapshroom.dev', 'www.mapshroom.dev']) {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { hostname } } });
      assert.equal(getTurnstileSiteKey(), '0x4AAAAAAEXkG-2KML7X6LiW');
    }
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { hostname: 'localhost' } } });
    assert.equal(getTurnstileSiteKey(), '');
  } finally {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('growth API helpers export expected client surface', async () => {
  const api = await import('../src/lib/growthApi.ts');
  assert.equal(typeof api.growthSignup, 'function');
  assert.equal(typeof api.growthConfirmVerify, 'function');
  assert.equal(typeof api.growthSubmitFeedback, 'function');
  assert.equal(typeof api.growthIssueDownloadGrant, 'function');
  assert.equal(typeof api.readUtmFromLocation, 'function');
});

test('growth copy includes desktop beta and newsletter strings', async () => {
  const copy = await import('../src/lib/growthCopy.ts');
  assert.match(copy.GROWTH_COPY.en.desktopBetaTitle, /Windows/i);
  assert.match(copy.GROWTH_COPY.it.submitNewsletter, /newsletter/i);
});

test('privacy copy documents optional email profile and processors', async () => {
  const privacy = await import('../src/lib/privacyCopy.ts');
  assert.match(privacy.PRIVACY_PAGE_COPY.en.emailTitle, /email/i);
  assert.match(privacy.PRIVACY_PAGE_COPY.en.processorsBody, /Brevo/);
  assert.match(privacy.PRIVACY_PAGE_COPY.en.processorsBody, /Cloudflare/);
  assert.doesNotMatch(privacy.PRIVACY_PAGE_COPY.en.promises.join(' '), /No account, no registration, no password — ever/);
});

test('analytics helpers expose growth identity and activation tracking', async () => {
  const analytics = await import('../src/lib/analytics.ts');
  assert.equal(typeof analytics.identifyGrowthUser, 'function');
  assert.equal(typeof analytics.trackActivationMilestone, 'function');
});
