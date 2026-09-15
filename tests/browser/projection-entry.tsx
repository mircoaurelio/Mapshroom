import { createRoot } from 'react-dom/client';
import { StageRenderer, type StageFrameInfo } from '../../src/components/StageRenderer';
import { TimelineStageRenderer } from '../../src/components/TimelineStageRenderer';
import { ProjectionPage } from '../../src/components/ProjectionPage';
import { createDefaultProject } from '../../src/config';
import { putAssetBlob, deleteAssetBlob } from '../../src/lib/storage';
import { createTimelineShaderStep } from '../../src/lib/timeline';
import { parseUniforms } from '../../src/lib/shader';
import type { AssetRecord } from '../../src/types';
import '../../src/index.css';

const host = document.getElementById('fixture')!;
const report = document.getElementById('results')!;
const lines: string[] = [];
const code = 'vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) { return texture(tex, uv); }';
let failed = false;

// Inspect EVERY painted frame from a cold mount, with no settling grace period.
// A late correction cannot hide the one-frame distortion this regression covers.
for (const section of ['move', 'output'] as const) for (const ratio of [0.5, 1, 2]) {
  const id = `entry-${crypto.randomUUID()}`;
  const photo = document.createElement('canvas');
  photo.width = 200 * ratio; photo.height = 200;
  const ctx = photo.getContext('2d')!;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, photo.width, photo.height);
  ctx.fillStyle = '#fff'; ctx.beginPath();
  ctx.arc(photo.width / 2, photo.height / 2, Math.min(photo.width, photo.height) / 4, 0, Math.PI * 2); ctx.fill();
  const blob = await new Promise<Blob>(resolve => photo.toBlob(value => resolve(value!), 'image/png'));
  await putAssetBlob(id, blob);
  const url = URL.createObjectURL(blob);
  const asset: AssetRecord = { id, name: id, kind: 'image', mimeType: 'image/png', size: blob.size, lastModified: 1, createdAt: new Date().toISOString(), sourceType: 'uploaded' };
  const project = createDefaultProject(id);
  const shader = { ...project.studio.savedShaders[0], id, code, uniformValues: {}, lastValidCode: code, lastValidUniformValues: {}, inputAssetId: null };
  const timeline = { ...project.timeline.stub, shaderSequence: { ...project.timeline.stub.shaderSequence, mode: 'sequence' as const, stagePreviewMode: 'timeline' as const, steps: [createTimelineShaderStep(id)] } };
  const root = createRoot(host);
  let canvas: HTMLCanvasElement | null = null;
  let frames = 0;
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('No visible frames')), 15000);
      const onFrameRendered = (_frame: StageFrameInfo) => {
        if (!canvas) return;
        const gl = canvas.getContext('webgl2')!;
        const pixels = new Uint8Array(canvas.width * canvas.height * 4);
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let left = canvas.width, right = -1, top = canvas.height, bottom = -1;
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
          if (pixels[(y * canvas.width + x) * 4] < 180) continue;
          left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
        if (right < left) return;
        const marker = (right - left + 1) / (bottom - top + 1);
        const frameRatio = parseFloat(canvas.style.width) / parseFloat(canvas.style.height);
        if (Math.abs(marker - 1) > .04 || Math.abs(frameRatio / ratio - 1) > .01) {
          clearTimeout(timeout); reject(new Error(`frame ${frames}: marker=${marker.toFixed(3)}, canvas=${frameRatio.toFixed(3)}, expected=${ratio}`));
        } else if (++frames >= 8) { clearTimeout(timeout); resolve(); }
      };
      const common = { asset, assetUrl: url, assetUrlStatus: 'ready' as const, transport: project.playback.transport, adaptiveQuality: false, onCanvasReady: (value: HTMLCanvasElement | null) => { canvas = value; }, onFrameRendered };
      root.render(<ProjectionPage section={section} sessionId={id} transform={project.mapping.stageTransform} assetName={id} assetAspectRatio={16 / 9} assetUrl={url} assetKind="image" assetReady shaderError={null} outputOpen={false} outputMessage="" isPlaying={false}
        onChange={() => {}} onOpenOutput={() => {}} onPlayToggle={() => {}} onSelectSection={() => {}} onExport={() => {}} getPositionJson={() => ''}
        renderPreview={transform => section === 'move'
          ? <StageRenderer {...common} stageTransform={transform} shaderCode={code} uniformDefinitions={{}} uniformValues={{}} mappingPreview />
          : <TimelineStageRenderer {...common} stageTransform={transform} assets={[asset]} activeShaderId={id} activeShaderName={id} activeShaderCode={code} activeUniformValues={{}} savedShaders={[shader]} timeline={timeline} isOutputOnly />}
      />);
    });
    lines.push(`PASS ${section} ratio ${ratio}: first ${frames} visible frames keep their proportions`);
  } catch (error) { failed = true; lines.push(`FAIL ${section} ratio ${ratio}: ${error}`); }
  finally { root.unmount(); URL.revokeObjectURL(url); await deleteAssetBlob(id); }
  report.textContent = lines.join('\n');
}

// Equal layer weights must preserve brightness and both shader contributions.
const project = createDefaultProject('double-layer-test');
const source = 'vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) { return vec4(u_color, 1.0); }';
const shaderCode = 'uniform vec3 u_color;\n' + source;
for (const sameColor of [true, false]) {
  const root = createRoot(host);
  let canvas: HTMLCanvasElement | null = null;
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Double did not render')), 15000);
      root.render(<StageRenderer asset={null} assetUrl={null} shaderCode={shaderCode} uniformDefinitions={parseUniforms(shaderCode)} uniformValues={{}}
        stageTransform={project.mapping.stageTransform} transport={project.playback.transport}
        onCanvasReady={value => { canvas = value; }}
        onCompilerError={error => { if (error) { clearTimeout(timeout); reject(new Error(error)); } }}
        renderLayers={[false, true].map(secondary => ({ shaderCode, uniformDefinitions: parseUniforms(shaderCode), opacity: .5, uniformValues: { u_color: sameColor ? [1, 1, 1] : secondary ? [0, 0, 1] : [1, 0, 0] } }))}
        onFrameRendered={frame => {
          if (!frame.allProgramsReady || !frame.layersInSync || !canvas) return;
          const gl = canvas.getContext('webgl2')!, pixels = new Uint8Array(canvas.width * canvas.height * 4);
          gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          for (let i = 0; i < pixels.length; i += 4) {
            const brightness = sameColor ? pixels[i] : pixels[i] + pixels[i + 2];
            if (brightness < 252 || brightness > 258) { clearTimeout(timeout); reject(new Error(`Seam or dim pixel: ${brightness}`)); return; }
            if (!sameColor && (Math.abs(pixels[i] - 128) > 1 || Math.abs(pixels[i + 2] - 128) > 1)) {
              clearTimeout(timeout); reject(new Error('Layers do not contribute equally')); return;
            }
          }
          clearTimeout(timeout);
          resolve();
        }} />);
    });
    lines.push(`PASS Double ${sameColor ? 'equal weights preserve brightness' : 'both colored layers contribute equally'}`);
  } catch (error) { failed = true; lines.push(`FAIL Double: ${error}`); }
  finally { root.unmount(); }
  report.textContent = lines.join('\n');
}
document.body.dataset.status = failed ? 'fail' : 'ok';
report.textContent += failed ? '\nFAILED' : '\n8 checks passed';
