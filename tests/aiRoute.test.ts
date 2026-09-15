import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCloudAiConfiguration,
  hasConfiguredCloudAi,
  resolveAiGenerationRoute,
  routeAfterAiSettingsEdit,
} from '../src/lib/aiRoute.ts';
import { DESKTOP_KEYRING_SENTINEL } from '../src/lib/desktopSecrets.ts';
import type { AiSettings } from '../src/types.ts';

const empty: AiSettings = {
  openaiApiKey: '',
  anthropicApiKey: '',
  googleApiKey: '',
  runwayApiKey: '',
  openaiShaderModel: 'test-model',
  anthropicShaderModel: 'test-model',
  googleShaderModel: 'test-model',
  shaderProvider: 'openai',
  shaderRuntime: 'chat',
  localShaderModel: '',
  visionEnabled: false,
  videoGenProvider: 'runway',
};

for (const provider of ['openai', 'anthropic', 'google'] as const) {
  test(`${provider}: a configured API replaces stale ChatGPT and Perplexity routes`, () => {
    const draft = { ...empty, shaderProvider: provider };
    const { keyField, modelField } = getCloudAiConfiguration(draft);
    const configured = { ...draft, [keyField]: 'test-only-key' };
    for (const previous of ['chatgpt', 'perplexity', 'api', null] as const) {
      assert.equal(resolveAiGenerationRoute(configured, previous), 'api');
    }
    assert.equal(
      hasConfiguredCloudAi({ ...configured, [modelField]: '  ' }),
      false,
    );
    assert.equal(
      hasConfiguredCloudAi({ ...configured, [keyField]: '  ' }),
      false,
    );
    assert.equal(
      routeAfterAiSettingsEdit(configured, keyField, 'chatgpt'),
      'api',
    );
    assert.equal(
      routeAfterAiSettingsEdit(configured, keyField, 'local'),
      'api',
    );
    assert.equal(
      routeAfterAiSettingsEdit(configured, modelField, 'perplexity'),
      'api',
    );
    assert.equal(
      routeAfterAiSettingsEdit(configured, 'shaderProvider', 'chatgpt'),
      'api',
    );
  });
}

test('keyless users retain their external route; an incomplete API stays in API setup', () => {
  assert.equal(resolveAiGenerationRoute(empty, 'chatgpt'), 'chatgpt');
  assert.equal(resolveAiGenerationRoute(empty, 'perplexity'), 'perplexity');
  assert.equal(resolveAiGenerationRoute(empty, 'api'), 'api');
  assert.equal(
    resolveAiGenerationRoute({ ...empty, shaderRuntime: 'api' }, null),
    'api',
  );
  assert.equal(
    hasConfiguredCloudAi({ ...empty, googleApiKey: 'other-provider-key' }),
    false,
  );
});

test('choosing local inference explicitly remains possible with a saved API', () => {
  const configured = { ...empty, openaiApiKey: 'test-only-key' };
  assert.equal(resolveAiGenerationRoute(configured, 'local'), 'local');
  assert.equal(
    routeAfterAiSettingsEdit(configured, 'visionEnabled', 'local'),
    'local',
  );
});

test('desktop keys arriving after hydration activate API; typed drafts activate it before saving', () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { __TAURI_INTERNALS__: {} },
  });
  try {
    assert.equal(resolveAiGenerationRoute(empty, 'chatgpt'), 'chatgpt');
    const loaded = { ...empty, openaiApiKey: DESKTOP_KEYRING_SENTINEL };
    assert.equal(resolveAiGenerationRoute(loaded, 'chatgpt'), 'api');
    assert.equal(
      routeAfterAiSettingsEdit(
        { ...empty, openaiApiKey: 'draft-only-key' },
        'openaiApiKey',
        'chatgpt',
      ),
      'api',
    );
  } finally {
    if (previousWindow)
      Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
