import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import type { ProjectDocument, SavedShader } from '../src/types.ts';
import {
  detectMinimumShaderTarget,
  isShaderTargetSupported,
  normalizeOfficialShaderBody,
  OFFICIAL_SHADER_PROFILE,
  OFFICIAL_SHADER_TARGET,
} from '../src/lib/shaderCompiler.ts';
import {
  normalizeOfficialSavedShader,
  normalizeProjectShaderSources,
} from '../src/lib/shaderProfile.ts';
import { validateGeneratedShader } from '../src/lib/shader.ts';
import { webgl2DepthLabPresetList } from '../src/shaders/presets/depthLab/index.ts';

const legacyBody = `// NAME: Legacy profile
uniform float active; // @min 0 @max 1 @default 0.5
vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
  return texture2D(tex, uv) * active;
}`;

test('official shader profile is GLSL ES 3.00 on WebGL2', () => {
  assert.equal(OFFICIAL_SHADER_PROFILE, 'glsl300');
  assert.equal(OFFICIAL_SHADER_TARGET, 'webgl2');
});

test('legacy shader records migrate code, versions, uniforms and audio bindings together', () => {
  const legacyShader: SavedShader = {
    id: 'legacy',
    name: 'Legacy profile',
    code: legacyBody,
    versions: [{ id: 'v1', prompt: 'old', name: 'old', code: legacyBody, createdAt: 'now' }],
    lastValidCode: legacyBody,
    uniformValues: { active: 0.75 },
    lastValidUniformValues: { active: 0.5 },
    audioReactiveBindings: {
      active: { enabled: true, signal: 'beat', min: 0.1, max: 1 },
    },
  };

  const migrated = normalizeOfficialSavedShader(legacyShader);
  assert.equal(migrated.sourceProfile, 'glsl300');
  assert.equal(migrated.minimumTarget, 'webgl1');
  assert.match(migrated.code, /texture\(tex, uv\)/);
  assert.match(migrated.code, /mapshroom_legacy_active/);
  assert.equal(migrated.uniformValues?.mapshroom_legacy_active, 0.75);
  assert.equal(migrated.lastValidUniformValues?.mapshroom_legacy_active, 0.5);
  assert.equal(migrated.audioReactiveBindings?.mapshroom_legacy_active?.signal, 'beat');
  assert.equal(migrated.versions?.[0]?.sourceProfile, 'glsl300');
});

test('project ingress migration marks active and historical sources as official', () => {
  const project = {
    studio: {
      activeShaderCode: legacyBody,
      shaderVersions: [
        { id: 'v1', prompt: 'old', name: 'old', code: legacyBody, createdAt: 'now' },
      ],
      savedShaders: [{ id: 'legacy', name: 'Legacy', code: legacyBody }],
      uniformValues: { active: 0.25 },
    },
  } as ProjectDocument;

  const migrated = normalizeProjectShaderSources(project);
  assert.equal(migrated.studio.activeShaderSourceProfile, 'glsl300');
  assert.equal(migrated.studio.shaderVersions[0]?.sourceProfile, 'glsl300');
  assert.equal(migrated.studio.savedShaders[0]?.sourceProfile, 'glsl300');
  assert.equal(migrated.studio.uniformValues.mapshroom_legacy_active, 0.25);
});

test('paste and AI validation upgrades legacy texture calls to the official body', () => {
  const validated = validateGeneratedShader(legacyBody);
  assert.equal(validated, normalizeOfficialShaderBody(legacyBody));
  assert.doesNotMatch(validated, /\btexture2D\s*\(/);
});

test('AI shader validation requires metadata that creates automatic slider controls', () => {
  const noControls = `// NAME: No controls
vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
  return texture(tex, uv);
}`;
  const missingRange = `// NAME: Missing range
uniform float intensity; // @default 1.0
vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
  return texture(tex, uv) * intensity;
}`;

  assert.throws(() => validateGeneratedShader(noControls), /at least 1 annotated UI uniform/);
  assert.throws(() => validateGeneratedShader(missingRange), /slider metadata/);
  assert.throws(
    () => validateGeneratedShader(legacyBody, { minimumUiUniformCount: 3 }),
    /at least 3 annotated UI uniforms/,
  );
});

test('Depth Lab contains exactly ten WebGL2-only, parametrized, audio-reactive presets', () => {
  assert.equal(webgl2DepthLabPresetList.length, 10);
  assert.equal(new Set(webgl2DepthLabPresetList.map((preset) => preset.id)).size, 10);

  for (const preset of webgl2DepthLabPresetList) {
    assert.equal(preset.minimumTarget, 'webgl2', preset.id);
    assert.equal(normalizeOfficialShaderBody(preset.code), preset.code, preset.id);
    assert.match(preset.code, /vec4\s+processColor\s*\(/, preset.id);
    assert.doesNotMatch(preset.code, /\btexture2D\s*\(/, preset.id);
    assert.ok(Object.keys(preset.uniformValues ?? {}).length >= 4, preset.id);
    assert.ok(Object.keys(preset.audioReactiveBindings ?? {}).length >= 1, preset.id);
    assert.equal(isShaderTargetSupported(preset.minimumTarget, 'webgl2'), true, preset.id);
    assert.equal(isShaderTargetSupported(preset.minimumTarget, 'webgl1'), false, preset.id);
  }
});

test('Depth Lab demonstrates WebGL2 features rather than syntax-only conversion', () => {
  const catalog = webgl2DepthLabPresetList.map((preset) => preset.code).join('\n');
  assert.match(catalog, /\btextureSize\s*\(/);
  assert.match(catalog, /\btexelFetch\s*\(/);
  assert.match(catalog, /\bivec2\b/);
  assert.match(catalog, /\buint\b/);
  assert.match(catalog, /[&^]|>>/);
  assert.match(catalog, /\b(?:dFdx|dFdy|fwidth)\s*\(/);
});

test('WebGL2-only capability metadata is recovered from pasted or imported source', () => {
  assert.equal(detectMinimumShaderTarget(legacyBody), 'webgl1');
  assert.equal(
    detectMinimumShaderTarget(`// textureSize in a comment is ignored\n${legacyBody}`),
    'webgl1',
  );
  assert.equal(
    detectMinimumShaderTarget(
      legacyBody.replace('return texture2D(tex, uv) * active;', 'return texelFetch(tex, ivec2(0), 0);'),
    ),
    'webgl2',
  );
});

test('save, share, export, clipboard and AI boundaries declare the official profile', () => {
  const root = new URL('..', import.meta.url);
  const sources = {
    storage: readFileSync(new URL('src/lib/storage.ts', root), 'utf8'),
    share: readFileSync(new URL('src/lib/projectShare.ts', root), 'utf8'),
    exportDialog: readFileSync(new URL('src/components/TimelineExportDialog.tsx', root), 'utf8'),
    studio: readFileSync(new URL('src/components/StudioPanel.tsx', root), 'utf8'),
    request: readFileSync(new URL('src/shaders/requestContract.ts', root), 'utf8'),
    system: readFileSync(new URL('src/shaders/systemPrompt.ts', root), 'utf8'),
    presets: readFileSync(new URL('src/shaders/presets/index.ts', root), 'utf8'),
  };

  assert.match(sources.storage, /normalizeProjectShaderSources/);
  assert.match(sources.share, /OFFICIAL_SHADER_PROFILE/);
  assert.match(sources.exportDialog, /sourceProfile: OFFICIAL_SHADER_PROFILE/);
  assert.match(sources.exportDialog, /runtime: 'webgl2'/);
  assert.match(sources.studio, /writeText\(normalizeOfficialShaderBody\(shaderCode\)\)/);
  assert.match(sources.request, /GLSL ES 3\.00/);
  assert.match(sources.request, /texture\(\)/);
  assert.match(sources.request, /Expose 3 to 6 meaningful effect controls/);
  assert.match(sources.request, /@min <number> @max <number> @default <number>/);
  assert.match(sources.system, /GLSL ES 3\.00/);
  assert.match(sources.system, /build the slider panel automatically/);
  assert.match(sources.presets, /sourceProfile: OFFICIAL_SHADER_PROFILE/);
});

test('autosave and WebGL previews keep background work out of the interaction path', () => {
  const root = new URL('..', import.meta.url);
  const storage = readFileSync(new URL('src/lib/storage.ts', root), 'utf8');
  const timelinePreview = readFileSync(
    new URL('src/components/ShaderTimelineEditor.tsx', root),
    'utf8',
  );
  const presetPreview = readFileSync(
    new URL('src/components/PresetBrowserDialog.tsx', root),
    'utf8',
  );
  const previewRenderer = readFileSync(new URL('src/lib/shaderPreview.ts', root), 'utf8');
  const stageRenderer = readFileSync(new URL('src/components/StageRenderer.tsx', root), 'utf8');
  const sessionSync = readFileSync(new URL('src/lib/sessionSync.ts', root), 'utf8');
  const workspace = readFileSync(new URL('src/routes/WorkspaceRoute.tsx', root), 'utf8');
  const snapshotBody = storage.slice(
    storage.indexOf('function createProjectSnapshot'),
    storage.indexOf('function createEmergencyProjectSnapshot'),
  );

  assert.ok(
    snapshotBody.indexOf('savedShaders: project.studio.savedShaders.filter') <
      snapshotBody.indexOf('normalizeProjectShaderSources(compactProject)'),
    'autosave must discard unchanged built-ins before canonicalizing persisted shaders',
  );
  assert.doesNotMatch(snapshotBody, /normalizeProjectShaderSources\(project\)/);
  assert.match(snapshotBody, /project\.studio\.activeShaderId/);
  assert.match(snapshotBody, /shaderSequence\.steps\.map/);
  assert.match(timelinePreview, /requestIdleCallback/);
  assert.match(timelinePreview, /data-preview-shader-id/);
  assert.match(timelinePreview, /IntersectionObserver/);
  assert.match(stageRenderer, /requestAnimationFrame/);
  assert.match(stageRenderer, /COMPILE_AFTER_INTERACTION_QUIET_MS/);
  assert.match(stageRenderer, /hasVisibleProgramWork/);
  assert.match(
    stageRenderer,
    /allowPreloadCompile\s*&&\s*!hasVisibleProgramWork\(\)/,
    'the interaction quiet period must apply only to preload work',
  );
  assert.ok(
    stageRenderer.indexOf('if (hasVisibleProgramWork())') <
      stageRenderer.indexOf('if (idleWindow.requestIdleCallback)'),
    'visible missing or pending programs must be scheduled before idle preload work',
  );
  assert.match(stageRenderer, /processShaderQueue\(true\)/);
  assert.match(stageRenderer, /processShaderQueue\(false\)/);
  assert.match(sessionSync, /createProjectSnapshot\(project, liveShaderIds\)/);
  assert.match(workspace, /syncedProjectAutosaveRef\.current === project/);
  assert.match(storage, /Unable to persist shader slider cache/);
  assert.doesNotMatch(workspace, /saveShaderSliderCache\(/);
  assert.match(storage, /getRecoverableSessionStorageKeys\(project\.sessionId\)/);
  assert.doesNotMatch(previewRenderer, /gl\.finish\(\)/);
  assert.doesNotMatch(presetPreview, /gl\.finish\(\)/);
  assert.match(previewRenderer, /programCache/);
  assert.match(presetPreview, /programCache/);
});

test('live uniform controls avoid catalog churn and background GPU work', () => {
  const root = new URL('..', import.meta.url);
  const workspace = readFileSync(new URL('src/routes/WorkspaceRoute.tsx', root), 'utf8');
  const randomization = readFileSync(
    new URL('src/hooks/useUniformRandomization.ts', root),
    'utf8',
  );
  const timelineStage = readFileSync(
    new URL('src/components/TimelineStageRenderer.tsx', root),
    'utf8',
  );
  const stageRenderer = readFileSync(new URL('src/components/StageRenderer.tsx', root), 'utf8');
  const styles = readFileSync(new URL('src/index.css', root), 'utf8');
  const depthEval = readFileSync(new URL('src/depthLabEval.ts', root), 'utf8');

  assert.match(workspace, /flushPendingUniformValues\(false\)/);
  assert.match(workspace, /uniformUpdateFrameRef\.current = window\.requestAnimationFrame/);
  assert.match(workspace, /commitActiveUniformValues/);
  assert.match(workspace, /onUniformValuesChange=\{handleUniformValuesChange\}/);
  assert.match(randomization, /onUniformValuesChange\(randomizedValues\)/);
  assert.match(randomization, /Unable to persist uniform randomization locks/);
  assert.doesNotMatch(
    timelineStage,
    /activeShaderName, activeUniformValues, savedShaders/,
    'live uniform changes must not rebuild the complete available shader catalog',
  );
  assert.match(
    timelineStage,
    /activeSavedShader && hasShaderCompileError\(activeSavedShader\)[\s\S]*?: activeUniformValues/,
    'valid shaders must render transient slider values before the saved-shader commit',
  );
  assert.match(stageRenderer, /canvas\.width !== nextCanvasWidth \|\| canvas\.height !== nextCanvasHeight/);
  assert.match(stageRenderer, /MAX_WORKSPACE_PREVIEW_DPR/);
  assert.match(stageRenderer, /OUTPUT_START_RENDER_PIXELS/);
  assert.match(stageRenderer, /outputPixelBudgetRef/);
  assert.match(styles, /input\[type='range'\]:active::-[\s\S]*?transition: none/);
  assert.match(depthEval, /if \(document\.hidden\)/);
});

test('clipboard paste always writes onto the active shader by id', () => {
  const root = new URL('..', import.meta.url);
  const workspace = readFileSync(new URL('src/routes/WorkspaceRoute.tsx', root), 'utf8');
  const pasteStart = workspace.indexOf('const handlePasteShaderFromClipboard');
  const pasteEnd = workspace.indexOf('const handlePastePositionFromClipboard');
  assert.notEqual(pasteStart, -1);
  assert.notEqual(pasteEnd, -1);
  const pasteHandler = workspace.slice(pasteStart, pasteEnd);

  assert.match(workspace, /function applyPastedShaderCodeToProject/);
  assert.match(workspace, /group: 'Saved'/);
  assert.match(pasteHandler, /applyPastedShaderCodeToProject\(currentProject, \{/);
  assert.match(pasteHandler, /timelineStepId/);
  assert.doesNotMatch(
    pasteHandler,
    /handleApplyExternalChatResponse/,
    'the code editor paste button must not apply onto a previous ChatGPT target shader',
  );
  assert.doesNotMatch(
    pasteHandler,
    /shader\.name ===/,
    'pasted code must not be matched onto another shader by NAME header',
  );
  assert.match(
    workspace,
    /targetShaderId: currentProject\.studio\.activeShaderId/,
    'external chat apply must follow the currently visible shader',
  );
});

test('output receives migrated audio state and low-latency uniform updates', () => {
  const root = new URL('..', import.meta.url);
  const audioHook = readFileSync(new URL('src/hooks/useAudioReactivity.ts', root), 'utf8');
  const audioRuntime = readFileSync(new URL('src/lib/audioReactivity.ts', root), 'utf8');
  const output = readFileSync(new URL('src/routes/OutputRoute.tsx', root), 'utf8');
  const workspace = readFileSync(new URL('src/routes/WorkspaceRoute.tsx', root), 'utf8');
  const timelineStage = readFileSync(
    new URL('src/components/TimelineStageRenderer.tsx', root),
    'utf8',
  );
  const liveUniformSync = readFileSync(
    new URL('src/lib/liveUniformSync.ts', root),
    'utf8',
  );
  const storage = readFileSync(new URL('src/lib/storage.ts', root), 'utf8');
  const midiOutputSync = readFileSync(
    new URL('src/lib/midi/outputSync.ts', root),
    'utf8',
  );

  assert.match(audioRuntime, /normalizeOfficialShaderIdentifier\(uniformName\)/);
  assert.match(audioHook, /type: 'request-state'/);
  assert.match(audioHook, /message\.type === 'state'/);
  assert.match(audioRuntime, /surfaceSwitching:\s*['"]exclude['"]/);
  assert.match(audioHook, /startAudioAnalysisClock/);
  assert.match(audioHook, /audioWorklet/);
  assert.doesNotMatch(audioHook, /requestAnimationFrame\(analyze\)/);
  assert.match(
    timelineStage,
    /audioBindingsByShaderId\[[^\]]+\]\s*\?\?\s*targetShader\?\.audioReactiveBindings/,
  );
  assert.match(output, /createLiveUniformSync\(sessionId/);
  assert.match(output, /applyLiveUniformUpdates\(baseProject, updates\)/);
  assert.match(workspace, /liveUniformSyncRef\.current\?\.publish/);
  assert.match(liveUniformSync, /window\.requestAnimationFrame\(flush\)/);
  assert.match(
    midiOutputSync,
    /try\s*\{\s*localStorage\.setItem\(storageKey, payload\);[\s\S]*?\}\s*catch/,
  );
  assert.match(midiOutputSync, /if \(!broadcastChannel\)/);
  assert.match(midiOutputSync, /broadcastChannel\?\.postMessage\(stateSnapshot\)/);
  assert.match(storage, /putIndexedProjectDocument\(snapshot\)/);
  assert.match(storage, /isDestructiveProjectOverwrite/);
  assert.match(workspace, /hasPersistedProject\(sessionId\)/);
  assert.match(workspace, /downloadProjectBackup\(project\)/);
});

test('bundled project and visual eval are wired to the statue depth map', () => {
  const root = new URL('..', import.meta.url);
  const bundled = readFileSync(new URL('src/lib/bundledProjects.ts', root), 'utf8');
  const evaluation = readFileSync(new URL('src/depthLabEval.ts', root), 'utf8');
  const evaluationPage = readFileSync(new URL('depth-lab-eval.html', root), 'utf8');
  const productionViteConfig = readFileSync(new URL('vite.config.ts', root), 'utf8');

  assert.match(bundled, /BUNDLED_WEBGL2_DEPTH_LAB_PROJECT_SESSION_ID/);
  assert.match(bundled, /presets\.length !== 10/);
  assert.match(bundled, /activeAssetId: BUNDLED_STATUE_ASSET_ID/);
  assert.match(bundled, /inputAssetId: BUNDLED_STATUE_ASSET_ID/);
  assert.match(evaluation, /__MAPSHROOM_DEPTH_LAB_EVAL__/);
  assert.match(evaluation, /BUNDLED_STATUE_DEPTH_ASSET_ID/);
  assert.match(evaluationPage, /project=bundled-webgl2-depth-lab-statue/);
  assert.match(
    productionViteConfig,
    /depthLabEval:\s*resolve\(__dirname, ['"]depth-lab-eval\.html['"]\)/,
    'the production build must emit depth-lab-eval.html instead of relying on an SPA fallback',
  );
});
