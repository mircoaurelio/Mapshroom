import { createRoot } from 'react-dom/client';
import { TimelineStageRenderer } from '../../src/components/TimelineStageRenderer';
import { createDefaultProject } from '../../src/config';
import { createTimelineShaderStep } from '../../src/lib/timeline';
import { BUNDLED_STATUE_ASSET_ID } from '../../src/lib/bundledAssets';
import { putAssetBlob, deleteAssetBlob } from '../../src/lib/storage';
import { preserveStageFrame, readStageFrameAspectRatio } from '../../src/lib/assetReplacement';
import type { AssetRecord, SavedShader, TimelineAssetFitMode } from '../../src/types';
import '../../src/index.css';

// Browser integration coverage: the circles must remain round inside a calibrated
// frame, including the shared image path with no shader.inputAssetId assignment.
const cases: { name: string; width: number; height: number; frame: number; staleFrame?: boolean; captureFrame?: boolean; output?: boolean; assigned?: TimelineAssetFitMode; generated?: boolean; transition?: boolean; swap?: boolean; transparent?: boolean; resize?: boolean; secondAssigned?: boolean; overlay?: boolean; pin?: boolean; double?: boolean }[] = [
  { name: 'Upload portrait after an uncalibrated landscape preview', width: 240, height: 480, frame: 0, swap: true, captureFrame: true },
  { name: 'Upload landscape after an uncalibrated preview', width: 480, height: 240, frame: 0, swap: true, captureFrame: true },
  { name: 'Reopen portrait with accidentally saved landscape frame', width: 240, height: 480, frame: 16 / 9, staleFrame: true },
  { name: 'Reopen portrait output with accidentally saved landscape frame', width: 240, height: 480, frame: 16 / 9, staleFrame: true, output: true },
  { name: 'Portrait photo in landscape frame', width: 240, height: 480, frame: 16 / 9 },
  { name: 'Landscape photo in portrait frame', width: 480, height: 240, frame: 9 / 16 },
  { name: 'Square photo in landscape frame', width: 320, height: 320, frame: 16 / 9 },
  { name: 'Generated portrait in output window', width: 240, height: 480, frame: 16 / 9, output: true, generated: true },
  { name: 'Live photo through a timeline transition', width: 240, height: 480, frame: 16 / 9, transition: true },
  { name: 'Explicit per-step contain', width: 240, height: 480, frame: 16 / 9, assigned: 'contain' },
  { name: 'Explicit stretch remains intentional', width: 240, height: 480, frame: 16 / 9, assigned: 'stretch' },
  { name: 'Replace landscape with portrait in the same renderer', width: 240, height: 480, frame: 16 / 9, swap: true },
  { name: 'Transparent PNG in calibrated frame', width: 240, height: 480, frame: 16 / 9, transparent: true },
  { name: 'Panoramic photo in portrait output', width: 1200, height: 200, frame: 9 / 16, output: true },
  { name: 'Tall photo in landscape output', width: 160, height: 960, frame: 16 / 9, output: true },
  { name: 'Uncalibrated canvas follows the first photo', width: 240, height: 480, frame: 0 },
  { name: 'Resize the workspace after the image loads', width: 240, height: 480, frame: 16 / 9, resize: true },
  { name: 'Resize the output after the image loads', width: 480, height: 240, frame: 9 / 16, resize: true, output: true },
  { name: 'Explicit cover keeps the marker round', width: 240, height: 480, frame: 16 / 9, assigned: 'cover' },
  { name: 'Explicit fit width keeps the marker round', width: 240, height: 480, frame: 16 / 9, assigned: 'fitWidth' },
  { name: 'Explicit fit height keeps the marker round', width: 480, height: 240, frame: 9 / 16, assigned: 'fitHeight' },
  { name: 'Transition between live portrait and assigned landscape', width: 240, height: 480, frame: 16 / 9, transition: true, secondAssigned: true },
  { name: 'Live portrait with a landscape overlay', width: 240, height: 480, frame: 16 / 9, overlay: true, secondAssigned: true },
  { name: 'Masked photo overlay during a transition', width: 240, height: 480, frame: 16 / 9, overlay: true, secondAssigned: true, transition: true },
  { name: 'Masked photo overlay in double playback output', width: 240, height: 480, frame: 16 / 9, overlay: true, secondAssigned: true, double: true, output: true },
  { name: 'Live portrait with a pinned landscape shader', width: 240, height: 480, frame: 16 / 9, pin: true, secondAssigned: true },
  { name: 'Double shader playback preserves the live photo', width: 240, height: 480, frame: 16 / 9, double: true },
  { name: 'Double transitions preserve the live portrait and assigned landscape', width: 240, height: 480, frame: 16 / 9, double: true, transition: true, secondAssigned: true },
  { name: 'Double transitions preserve a masked overlay in output', width: 240, height: 480, frame: 16 / 9, double: true, transition: true, secondAssigned: true, overlay: true, output: true },
];
const code = 'vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) { return texture2D(tex, uv); }';
const host = document.getElementById('fixture')!;
const report = document.getElementById('results')!;
const lines: string[] = [];
let failed = false;

async function check(spec: typeof cases[number]) {
  host.style.width = '640px'; host.style.height = '360px';
  const id = `aspect-test-${crypto.randomUUID()}`;
  const photo = document.createElement('canvas');
  photo.width = spec.width; photo.height = spec.height;
  const context = photo.getContext('2d')!;
  if (!spec.transparent) { context.fillStyle = '#000'; context.fillRect(0, 0, photo.width, photo.height); }
  context.fillStyle = '#fff'; context.beginPath();
  context.arc(photo.width / 2, photo.height / 2, Math.min(photo.width, photo.height) / 4, 0, Math.PI * 2); context.fill();
  const blob = await new Promise<Blob>(resolve => photo.toBlob(value => resolve(value!), 'image/png'));
  if (!await putAssetBlob(id, blob)) throw new Error('Could not store the test photo');
  const url = URL.createObjectURL(blob);
  const asset: AssetRecord = { id, name: spec.name, mimeType: 'image/png', size: blob.size, lastModified: 1, createdAt: new Date().toISOString(), kind: 'image', sourceType: spec.generated ? 'generated' : 'uploaded', ...(spec.generated ? { derivation: { sourceAssetId: 'photo', kind: 'gradient' as const } } : {}) };
  let companion: AssetRecord | undefined;
  if (spec.secondAssigned) {
    photo.width = spec.height; photo.height = spec.width;
    context.fillStyle = '#000'; context.fillRect(0, 0, photo.width, photo.height);
    context.fillStyle = '#fff'; context.beginPath();
    context.arc(photo.width / 2, photo.height / 2, Math.min(photo.width, photo.height) / 4, 0, Math.PI * 2); context.fill();
    const otherBlob = await new Promise<Blob>(resolve => photo.toBlob(value => resolve(value!), 'image/png'));
    companion = { ...asset, id: `${id}-companion`, name: `${spec.name} companion`, size: otherBlob.size };
    if (!await putAssetBlob(companion.id, otherBlob)) throw new Error('Could not store the companion photo');
  }
  const project = createDefaultProject(id);
  const shader = { ...project.studio.savedShaders[0], id: 'aspect-shader', name: 'Passthrough', code, lastValidCode: code, uniformValues: {}, lastValidUniformValues: {}, inputAssetId: spec.overlay ? companion?.id : spec.assigned ? id : undefined } as SavedShader;
  const second = { ...shader, id: 'aspect-second', inputAssetId: companion?.id ?? shader.inputAssetId };
  const firstStep = createTimelineShaderStep(shader.id), secondStep = createTimelineShaderStep(second.id);
  firstStep.durationSeconds = 8; firstStep.transitionDurationSeconds = 2; firstStep.transitionEffect = 'mix';
  if (spec.assigned) firstStep.assetSettings.fitMode = spec.assigned;
  if (spec.overlay) firstStep.assetSettings.useStepAssetAsShaderBase = false;
  const timeline = { ...project.timeline.stub, shaderSequence: { ...project.timeline.stub.shaderSequence, mode: spec.double ? 'double' as const : 'sequence' as const, sharedTransitionEnabled: false, focusedStepId: firstStep.id, steps: spec.transition || spec.pin || spec.double ? [firstStep, secondStep] : [firstStep] } };
  let mapping = { ...project.mapping.stageTransform, ...(spec.frame ? { referenceAspectRatio: spec.frame, offsetX: spec.staleFrame ? 0 : 1 } : {}) };
  const mappingBefore = JSON.stringify(mapping);
  const root = createRoot(host);
  let canvas: HTMLCanvasElement | null = null;
  let lastMeasurement = 'no rendered pixels';
  const started = performance.now();
  let swapping = !!spec.swap;
  let resizing = !!spec.resize;
  let settleAfter = started + 600;
  let stableFrames = 0;
  try {
    const result = await new Promise<string>((resolve, reject) => {
      const deadline = window.setTimeout(() => reject(new Error(lastMeasurement)), 12000);
      const draw = (nextAsset = asset, nextUrl = url) => root.render(<TimelineStageRenderer
        asset={nextAsset} assets={companion ? [nextAsset, companion] : [nextAsset]} assetUrl={nextUrl} assetUrlStatus="ready"
        activeShaderId={shader.id} activeShaderName={shader.name} activeShaderCode={code} activeUniformValues={{}}
        savedShaders={[shader, second]} timeline={timeline} stageTransform={mapping} pinnedStepId={spec.pin ? secondStep.id : undefined}
        transport={{ ...project.playback.transport, currentTimeSeconds: spec.transition ? 7 : 0 }}
        forceActiveShaderPreview={!spec.transition && !spec.double} isOutputOnly={spec.output} adaptiveQuality={false}
        onCanvasReady={value => { canvas = value; }}
        onCompilerError={message => { if (message) { clearTimeout(deadline); reject(new Error(message)); } }}
        onFrameRendered={frame => {
          if (!canvas || !frame.layersInSync || !frame.allProgramsReady || performance.now() < settleAfter) return;
          if (swapping) {
            swapping = false;
            if (spec.captureFrame) mapping = preserveStageFrame(mapping, readStageFrameAspectRatio(canvas));
            settleAfter = performance.now() + 600; draw(); return;
          }
          if (resizing) { resizing = false; host.style.width = '370px'; host.style.height = '600px'; settleAfter = performance.now() + 600; return; }
          const gl = canvas.getContext('webgl2')!;
          const pixels = new Uint8Array(canvas.width * canvas.height * 4);
          gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          let left = canvas.width, right = -1, top = canvas.height, bottom = -1;
          for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) if (pixels[(y * canvas.width + x) * 4] > 180) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
          if (right < left) { stableFrames = 0; return; }
          const ratio = (right - left + 1) / (bottom - top + 1);
          const expectedFrame = spec.staleFrame ? spec.width / spec.height : spec.frame || spec.width / spec.height;
          const expected = spec.assigned === 'stretch' ? expectedFrame / (spec.width / spec.height) : 1;
          const frameRatio = parseFloat(canvas.style.width) / parseFloat(canvas.style.height);
          lastMeasurement = `marker ${ratio.toFixed(3)}, expected ${expected.toFixed(3)}; frame ${frameRatio.toFixed(3)}`;
          const passed = Math.abs(ratio / expected - 1) < .035 && Math.abs(frameRatio / expectedFrame - 1) < .01;
          stableFrames = passed ? stableFrames + 1 : 0;
          if (stableFrames >= 5) { clearTimeout(deadline); resolve(lastMeasurement); }
        }} />);
      if (spec.swap) draw({ ...asset, id: BUNDLED_STATUE_ASSET_ID, sourceType: 'bundled' }, '/assets/defaults-basestatue.png');
      else draw();
    });
    if (JSON.stringify(mapping) !== mappingBefore) throw new Error('Mapping mutated');
    lines.push(`PASS ${spec.name}: ${result}`);
  } catch (error) { failed = true; lines.push(`FAIL ${spec.name}: ${error instanceof Error ? error.message : error}`); }
  finally { root.unmount(); URL.revokeObjectURL(url); await deleteAssetBlob(id); if (companion) await deleteAssetBlob(companion.id); }
  report.textContent = lines.join('\n');
}
for (const spec of cases) await check(spec);
document.body.dataset.status = failed ? 'fail' : 'ok';
report.textContent += failed ? '\nFAILED' : `\n${cases.length} checks passed`;
