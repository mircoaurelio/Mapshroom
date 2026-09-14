import { createRoot } from 'react-dom/client';
import { TimelineStageRenderer } from '../../src/components/TimelineStageRenderer';
import { createDefaultProject } from '../../src/config';
import { createTimelineShaderStep } from '../../src/lib/timeline';
import { BUNDLED_STATUE_ASSET_ID } from '../../src/lib/bundledAssets';
import { putAssetBlob, deleteAssetBlob } from '../../src/lib/storage';
import type { AssetRecord, SavedShader, TimelineAssetFitMode } from '../../src/types';
import '../../src/index.css';

// Browser integration coverage: the circles must remain round inside a calibrated
// frame, including the shared image path with no shader.inputAssetId assignment.
const cases: { name: string; width: number; height: number; frame: number; output?: boolean; assigned?: TimelineAssetFitMode; generated?: boolean; transition?: boolean; swap?: boolean }[] = [
  { name: 'Portrait photo in landscape frame', width: 240, height: 480, frame: 16 / 9 },
  { name: 'Landscape photo in portrait frame', width: 480, height: 240, frame: 9 / 16 },
  { name: 'Square photo in landscape frame', width: 320, height: 320, frame: 16 / 9 },
  { name: 'Generated portrait in output window', width: 240, height: 480, frame: 16 / 9, output: true, generated: true },
  { name: 'Live photo through a timeline transition', width: 240, height: 480, frame: 16 / 9, transition: true },
  { name: 'Explicit per-step contain', width: 240, height: 480, frame: 16 / 9, assigned: 'contain' },
  { name: 'Explicit stretch remains intentional', width: 240, height: 480, frame: 16 / 9, assigned: 'stretch' },
  { name: 'Replace landscape with portrait in the same renderer', width: 240, height: 480, frame: 16 / 9, swap: true },
];
const code = 'vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) { return texture2D(tex, uv); }';
const host = document.getElementById('fixture')!;
const report = document.getElementById('results')!;
const lines: string[] = [];
let failed = false;

async function check(spec: typeof cases[number]) {
  const id = `aspect-test-${crypto.randomUUID()}`;
  const photo = document.createElement('canvas');
  photo.width = spec.width; photo.height = spec.height;
  const context = photo.getContext('2d')!;
  context.fillStyle = '#000'; context.fillRect(0, 0, photo.width, photo.height);
  context.fillStyle = '#fff'; context.beginPath();
  context.arc(photo.width / 2, photo.height / 2, Math.min(photo.width, photo.height) / 4, 0, Math.PI * 2); context.fill();
  const blob = await new Promise<Blob>(resolve => photo.toBlob(value => resolve(value!), 'image/png'));
  await putAssetBlob(id, blob);
  const url = URL.createObjectURL(blob);
  const asset: AssetRecord = { id, name: spec.name, mimeType: 'image/png', size: blob.size, lastModified: 1, createdAt: new Date().toISOString(), kind: 'image', sourceType: spec.generated ? 'generated' : 'uploaded', ...(spec.generated ? { derivation: { sourceAssetId: 'photo', kind: 'gradient' as const } } : {}) };
  const project = createDefaultProject(id);
  const shader = { ...project.studio.savedShaders[0], id: 'aspect-shader', name: 'Passthrough', code, lastValidCode: code, uniformValues: {}, lastValidUniformValues: {}, inputAssetId: spec.assigned ? id : undefined } as SavedShader;
  const second = { ...shader, id: 'aspect-second' };
  const firstStep = createTimelineShaderStep(shader.id), secondStep = createTimelineShaderStep(second.id);
  firstStep.durationSeconds = 8; firstStep.transitionDurationSeconds = 2; firstStep.transitionEffect = 'mix';
  if (spec.assigned) firstStep.assetSettings.fitMode = spec.assigned;
  const timeline = { ...project.timeline.stub, shaderSequence: { ...project.timeline.stub.shaderSequence, mode: 'sequence' as const, sharedTransitionEnabled: false, focusedStepId: firstStep.id, steps: spec.transition ? [firstStep, secondStep] : [firstStep] } };
  const mapping = { ...project.mapping.stageTransform, referenceAspectRatio: spec.frame };
  const root = createRoot(host);
  let canvas: HTMLCanvasElement | null = null;
  let lastMeasurement = 'no rendered pixels';
  const started = performance.now();
  let swapping = !!spec.swap;
  const original = project.mapping.stageTransform;
  try {
    const result = await new Promise<string>((resolve, reject) => {
      const deadline = window.setTimeout(() => reject(new Error(lastMeasurement)), 12000);
      const draw = (nextAsset = asset, nextUrl = url) => root.render(<TimelineStageRenderer
        asset={nextAsset} assets={[nextAsset]} assetUrl={nextUrl} assetUrlStatus="ready"
        activeShaderId={shader.id} activeShaderName={shader.name} activeShaderCode={code} activeUniformValues={{}}
        savedShaders={[shader, second]} timeline={timeline} stageTransform={mapping}
        transport={{ ...project.playback.transport, currentTimeSeconds: spec.transition ? 7 : 0 }}
        forceActiveShaderPreview={!spec.transition} isOutputOnly={spec.output} adaptiveQuality={false}
        onCanvasReady={value => { canvas = value; }}
        onCompilerError={message => { if (message) { clearTimeout(deadline); reject(new Error(message)); } }}
        onFrameRendered={frame => {
          if (!canvas || !frame.layersInSync || !frame.allProgramsReady || performance.now() - started < 600) return;
          if (swapping) { swapping = false; draw(); return; }
          const gl = canvas.getContext('webgl2')!;
          const pixels = new Uint8Array(canvas.width * canvas.height * 4);
          gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          let left = canvas.width, right = -1, top = canvas.height, bottom = -1;
          for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) if (pixels[(y * canvas.width + x) * 4] > 180) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
          if (right < left) return;
          const ratio = (right - left + 1) / (bottom - top + 1);
          const expected = spec.assigned === 'stretch' ? spec.frame / (spec.width / spec.height) : 1;
          const frameRatio = parseFloat(canvas.style.width) / parseFloat(canvas.style.height);
          lastMeasurement = `marker ${ratio.toFixed(3)}, expected ${expected.toFixed(3)}; frame ${frameRatio.toFixed(3)}`;
          if (Math.abs(ratio / expected - 1) < .035 && Math.abs(frameRatio / spec.frame - 1) < .01) { clearTimeout(deadline); resolve(lastMeasurement); }
        }} />);
      if (spec.swap) draw({ ...asset, id: BUNDLED_STATUE_ASSET_ID, sourceType: 'bundled' }, '/assets/defaults-basestatue.png');
      else draw();
    });
    if (project.mapping.stageTransform !== original) throw new Error('Mapping mutated');
    lines.push(`PASS ${spec.name}: ${result}`);
  } catch (error) { failed = true; lines.push(`FAIL ${spec.name}: ${error instanceof Error ? error.message : error}`); }
  finally { root.unmount(); URL.revokeObjectURL(url); await deleteAssetBlob(id); }
  report.textContent = lines.join('\n');
}
for (const spec of cases) await check(spec);
document.body.dataset.status = failed ? 'fail' : 'ok';
report.textContent += failed ? '\nFAILED' : `\n${cases.length} checks passed`;
