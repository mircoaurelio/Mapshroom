import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeAiSettingsDraft,
  saveAiSettingsDraft,
} from '../src/lib/aiSettingsDraft.ts';
import { DESKTOP_KEYRING_SENTINEL } from '../src/lib/desktopSecrets.ts';
import type { AiSettings } from '../src/types.ts';

const settings: AiSettings = {
  openaiApiKey: DESKTOP_KEYRING_SENTINEL,
  anthropicApiKey: '',
  googleApiKey: '',
  runwayApiKey: '',
  openaiShaderModel: 'saved-model',
  anthropicShaderModel: 'saved-claude-model',
  googleShaderModel: 'saved-gemini-model',
  shaderProvider: 'openai',
  shaderRuntime: 'chat',
  localShaderModel: '',
  visionEnabled: false,
  videoGenProvider: 'runway',
};

test('saving a provider change preserves an existing desktop credential', async () => {
  const writes: unknown[] = [];
  const draft = normalizeAiSettingsDraft(
    { ...settings, shaderProvider: 'google' },
    'chatgpt',
  );
  await saveAiSettingsDraft(settings, draft, (field, value) => {
    writes.push([field, value]);
  });
  assert.deepEqual(writes, [['shaderProvider', 'google']]);
  assert.equal(draft.openaiApiKey, DESKTOP_KEYRING_SENTINEL);
});

test('keys and custom model IDs are trimmed without modifying the original draft', () => {
  const draft = {
    ...settings,
    googleApiKey: '  test-only-key  ',
    googleShaderModel: '  custom-model-id  ',
  };
  const normalized = normalizeAiSettingsDraft(draft, 'api');
  assert.equal(normalized.googleApiKey, 'test-only-key');
  assert.equal(normalized.googleShaderModel, 'custom-model-id');
  assert.equal(normalized.shaderRuntime, 'api');
  assert.equal(draft.googleApiKey, '  test-only-key  ');
  assert.equal(
    normalizeAiSettingsDraft(draft, 'perplexity').shaderRuntime,
    'chat',
  );
  assert.equal(normalizeAiSettingsDraft(draft, 'local').shaderRuntime, 'local');
});

test('a failed credential write stops before changing the generation route or provider', async () => {
  const writes: string[] = [];
  const draft = normalizeAiSettingsDraft(
    { ...settings, googleApiKey: 'test-only-key', shaderProvider: 'google' },
    'api',
  );
  await assert.rejects(
    saveAiSettingsDraft(settings, draft, async (field) => {
      writes.push(field);
      return false;
    }),
    /could not be saved/,
  );
  assert.deepEqual(writes, ['googleApiKey']);
});

test('saving awaits the desktop credential manager before proceeding', async () => {
  const writes: string[] = [];
  let finishCredentialSave: () => void = () => {
    throw new Error('Credential save not started');
  };
  const draft = normalizeAiSettingsDraft(
    { ...settings, googleApiKey: 'test-only-key', shaderProvider: 'google' },
    'api',
  );
  const pending = saveAiSettingsDraft(settings, draft, async (field) => {
    writes.push(field);
    if (field === 'googleApiKey')
      await new Promise<void>((resolve) => {
        finishCredentialSave = resolve;
      });
    return true;
  });
  assert.deepEqual(writes, ['googleApiKey']);
  finishCredentialSave();
  await pending;
  assert.deepEqual(writes, ['googleApiKey', 'shaderProvider', 'shaderRuntime']);
});

test('removing a key is explicit and writes the empty value', async () => {
  const writes: unknown[] = [];
  await saveAiSettingsDraft(
    settings,
    { ...settings, openaiApiKey: '' },
    (field, value) => {
      writes.push([field, value]);
    },
  );
  assert.deepEqual(writes, [['openaiApiKey', '']]);
});
