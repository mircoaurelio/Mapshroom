import assert from 'node:assert/strict';
import test from 'node:test';

test('desktop secret helpers scrub and detect keyring markers', async () => {
  const secrets = await import('../src/lib/desktopSecrets.ts');
  assert.equal(secrets.isDesktopKeyringSentinel(secrets.DESKTOP_KEYRING_SENTINEL), true);
  assert.equal(secrets.isDesktopKeyringSentinel('sk-test'), false);
  assert.equal(secrets.hasStoredCloudApiKey('sk-test'), true);
  assert.equal(secrets.hasStoredCloudApiKey(''), false);

  const scrubbed = secrets.scrubApiKeysFromSettings({
    openaiApiKey: 'sk-leak',
    anthropicApiKey: 'sk-ant-leak',
    googleApiKey: 'AIza-leak',
    runwayApiKey: 'rw-leak',
  });
  assert.equal(scrubbed.openaiApiKey, '');
  assert.equal(scrubbed.anthropicApiKey, '');
  assert.equal(scrubbed.googleApiKey, '');
  assert.equal(scrubbed.runwayApiKey, '');

  const stripped = secrets.stripSecretHeaders({
    Authorization: 'Bearer sk-leak',
    'x-api-key': 'secret',
    'Content-Type': 'application/json',
  });
  assert.deepEqual(stripped, { 'Content-Type': 'application/json' });
});
