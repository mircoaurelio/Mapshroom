import assert from 'node:assert/strict';
import test from 'node:test';

import { createServer } from 'vite';

test('round-trips pinned composite modes and restores legacy shares', async () => {
  const server = await createServer({
    appType: 'custom',
    configFile: false,
    optimizeDeps: { noDiscovery: true },
    root: process.cwd(),
    server: { middlewareMode: true, watch: null },
  });

  try {
    const [{ createDefaultProject }, projectShare] = await Promise.all([
      server.ssrLoadModule('/src/config.ts'),
      server.ssrLoadModule('/src/lib/projectShare.ts'),
    ]);
    const { createCompactSharePayload, restoreProjectFromCompactPayload } = projectShare;
    const project = createDefaultProject('project-share-test');
    const sourceStep = project.timeline.stub.shaderSequence.steps[0];

    sourceStep.assetSettings.pinnedCompositeMode = 'blend';
    const blendPayload = JSON.parse(JSON.stringify(createCompactSharePayload(project)));
    assert.equal(blendPayload.t.s[0].apc, 2);
    assert.equal(
      restoreProjectFromCompactPayload(blendPayload).timeline.stub.shaderSequence.steps[0]
        .assetSettings.pinnedCompositeMode,
      'blend',
    );

    sourceStep.assetSettings.pinnedCompositeMode = 'stackOnTop';
    const stackPayload = JSON.parse(JSON.stringify(createCompactSharePayload(project)));
    assert.equal(stackPayload.t.s[0].apc, undefined);
    assert.equal(
      restoreProjectFromCompactPayload(stackPayload).timeline.stub.shaderSequence.steps[0]
        .assetSettings.pinnedCompositeMode,
      'stackOnTop',
    );

    const legacyStackPayload = structuredClone(stackPayload);
    legacyStackPayload.t.s[0].apc = 1;
    assert.equal(
      restoreProjectFromCompactPayload(legacyStackPayload).timeline.stub.shaderSequence.steps[0]
        .assetSettings.pinnedCompositeMode,
      'stackOnTop',
    );

    const legacyPayloadWithoutMode = structuredClone(stackPayload);
    delete legacyPayloadWithoutMode.t.s[0].apc;
    assert.equal(
      restoreProjectFromCompactPayload(legacyPayloadWithoutMode).timeline.stub.shaderSequence.steps[0]
        .assetSettings.pinnedCompositeMode,
      'stackOnTop',
    );
  } finally {
    await server.close();
  }
});
