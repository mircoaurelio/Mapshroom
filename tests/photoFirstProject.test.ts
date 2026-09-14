import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('new projects wait for a photo, and reopening a library never adds demo assets', async () => {
  const server = await createServer({
    appType: 'custom', configFile: false,
    optimizeDeps: { noDiscovery: true }, root: process.cwd(),
    server: { middlewareMode: true, watch: null },
  });
  try {
    const config = await server.ssrLoadModule('/src/config.ts');
    const bundled = await server.ssrLoadModule('/src/lib/bundledAssets.ts');
    for (const isMobile of [false, true]) {
      const project = config.createDefaultProject(`photo-${isMobile}`, { isMobile });
      assert.deepEqual(project.library.assets, []);
      assert.equal(project.library.activeAssetId, null);
      assert.equal(project.playback.activeAssetId, null);
      assert.equal(project.playback.transport.isPlaying, false);
      assert.equal(project.mapping.stageTransform.offsetY, 0, 'a user photo must not inherit demo calibration');
      assert.deepEqual(bundled.mergeBundledAssets(project.library.assets), []);
      assert.equal(project.timeline.stub.shaderSequence.steps.length, 8, 'effects remain available after upload');
    }
    const procedural = config.createEmptyProject('procedural');
    assert.ok(procedural.library.assets.every((asset: { id: string }) => bundled.isInternalCanvasAssetId(asset.id)));

    const original = { id: 'my-photo', name: 'My surface.png', kind: 'image', sourceType: 'uploaded' };
    const version = { ...original, id: 'my-depth', sourceType: 'generated', derivation: { sourceAssetId: original.id, kind: 'depth' } };
    const restored = bundled.mergeBundledAssets([original, version]);
    assert.deepEqual(restored, [original, version], 'saved originals and generated versions must remain unchanged');
    assert.deepEqual(bundled.mergeBundledAssets(restored), restored);
    const savedDemo = bundled.DEFAULT_BUNDLED_ASSETS[0];
    assert.deepEqual(bundled.mergeBundledAssets([savedDemo, original]), [savedDemo, original], 'explicitly saved older demo media stays renderable');
  } finally {
    await server.close();
  }
});
