import { createRoot } from 'react-dom/client';
import { TimelineStageRenderer } from '../../src/components/TimelineStageRenderer';
import { StageRenderer, type StageFrameInfo } from '../../src/components/StageRenderer';
import { createDefaultProject } from '../../src/config';
import { createTimelineShaderStep, getTimelineTransitionSeed, resolveShaderTimelineState } from '../../src/lib/timeline';
import { buildTimelineDoubleLayerShaderCode, buildTimelineTransitionShaderCode } from '../../src/lib/timelineShader';
import { parseUniforms } from '../../src/lib/shader';
import '../../src/index.css';

const project = createDefaultProject('double-live-test');
const shaders = ['1.,0.,0.', '0.,1.,0.', '0.,0.,1.', '1.,1.,1.'].map((color, index) => {
  const code = `vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) { return vec4(${color},1.); }`;
  return { ...project.studio.savedShaders[0], id: `color-${index}`, name: `Color ${index}`, code, lastValidCode: code, inputAssetId: null, uniformValues: {}, lastValidUniformValues: {} };
});
const steps = shaders.map(shader => ({ ...createTimelineShaderStep(shader.id), id: `step-${shader.id}`, durationSeconds: 4 }));
const resolve = (timeSeconds: number, salt: string) => resolveShaderTimelineState({
  shaders, steps, mode: 'randomMix', focusedStepId: null, singleStepLoopEnabled: false, randomChoiceEnabled: false,
  sharedTransitionEnabled: true, sharedTransitionEffect: 'mix', sharedTransitionDurationSeconds: 2, sharedSectionDurationSeconds: 4,
  timeSeconds, loop: true, randomSeedSalt: salt,
})!;
// A deterministic seed with four distinct shaders across the first two pairs.
const token = Array.from({ length: 100 }, (_, i) => `live-${i}`).find(value => {
  const a = resolve(0, `double-primary:${value}`), b = resolve(0, `double-secondary:${value}:secondary`);
  return new Set([a.currentShader.id, a.nextShader?.id, b.currentShader.id, b.nextShader?.id]).size === 4;
})!;
if (!token) throw new Error('Test needs four distinct contributors');
const timeline = { ...project.timeline.stub, shaderSequence: {
  ...project.timeline.stub.shaderSequence, enabled: true, mode: 'double' as const,
  stagePreviewMode: 'timeline' as const, singleStepLoopEnabled: false, randomSeedToken: token,
  sharedTransitionEnabled: true, sharedTransitionEffect: 'mix' as const, sharedSectionDurationSeconds: 4, sharedTransitionDurationSeconds: 2, steps,
} };
const maskSeed = getTimelineTransitionSeed('double-primary', 'double-secondary', `double-primary:${token}`);
const root = createRoot(document.getElementById('fixture')!);
const results = document.getElementById('results')!;
const lines: string[] = [];
const samples = [0, 2, 2.25, 2.5, 3, 3.5, 3.9, 4, 6, 6.5, 7, 7.5, 8, 14, 14.5, 15, 15.9, 16, 18, 19];
const canvases: Record<string, HTMLCanvasElement | null> = { live: null, expected: null };
let failed = false;
let previousLive: Uint8Array | null = null;
let previousTime = -1;
let mixFrames = 0;

try {
  for (const time of samples) {
    const streams = [resolve(time, `double-primary:${token}`), resolve(time, `double-secondary:${token}:secondary`)];
    const expectedLayers = streams.map((state, index) => {
      const code = buildTimelineDoubleLayerShaderCode(buildTimelineTransitionShaderCode({ fromCode: state.currentShader.code, toCode: state.nextShader!.code, effect: 'mix' }));
      const p = state.transitionProgress;
      return { shaderCode: code, uniformDefinitions: parseUniforms(code), opacity: 1, uniformValues: {
        u_transition_progress: p * p * (3 - 2 * p), u_transition_duration: 2, u_double_time: time, u_double_seed: maskSeed, u_double_secondary: index === 1,
      } };
    });
    const captured: Record<string, Uint8Array> = {};
    let livePixels: Uint8Array | null = null;
    await new Promise<void>((done, reject) => {
      const timer = window.setTimeout(() => reject(new Error(`No compiled frame at ${time}s`)), 15000);
      const counts = { live: 0, expected: 0 };
      const capture = (key: 'live' | 'expected', frame: StageFrameInfo) => {
        const canvas = canvases[key];
        if (!canvas || !frame.layersInSync || !frame.allProgramsReady || Math.abs(frame.timeSeconds - time) > .001 || ++counts[key] < 3) return;
        const gl = canvas.getContext('webgl2')!;
        const pixels = new Uint8Array(canvas.width * canvas.height * 4);
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        captured[key] = pixels;
        if (!captured.live || !captured.expected) return;
        clearTimeout(timer);
        let error = 0;
        for (let i = 0; i < pixels.length; i++) error += Math.abs(captured.live[i] - captured.expected[i]);
        const meanError = error / pixels.length;
        livePixels = captured.live;
        if (meanError > 1.5) reject(new Error(`${time}s: live differs from the simultaneous four-shader mix by ${meanError.toFixed(2)}/255`));
        else done();
      };
      const common = { asset: null, assetUrl: null, stageTransform: project.mapping.stageTransform, adaptiveQuality: false,
        transport: { ...project.playback.transport, currentTimeSeconds: time, anchorTimestampMs: null, isPlaying: true } };
      root.render(<>
        <div style={{ width: 320, height: 180 }}><TimelineStageRenderer {...common} assets={[]} activeShaderId={shaders[0].id} activeShaderName={shaders[0].name} activeShaderCode={shaders[0].code} activeUniformValues={{}} savedShaders={shaders} timeline={timeline} isOutputOnly
          onCanvasReady={value => { canvases.live = value; }} onFrameRendered={frame => capture('live', frame)} /></div>
        <div style={{ width: 320, height: 180 }}><StageRenderer {...common} isOutputOnly shaderCode={shaders[0].code} uniformDefinitions={{}} uniformValues={{}} renderLayers={expectedLayers}
          onCanvasReady={value => { canvases.expected = value; }} onFrameRendered={frame => capture('expected', frame)} /></div>
      </>);
    });
    if (previousLive && livePixels && time > 2 && time < 4) {
      let changed = 0;
      for (let i = 0; i < previousLive.length; i++) changed += Math.abs(previousLive[i] - livePixels[i]);
      if (changed / previousLive.length < 1) throw new Error(`Frozen mix at ${time}s`);
      mixFrames++;
    }
    // At a loop boundary the new pair must be the one that just faded in.
    if (time === 16) {
      for (const salt of [`double-primary:${token}`, `double-secondary:${token}:secondary`]) {
        if (resolve(15.999, salt).nextShader?.id !== resolve(16, salt).currentShader.id) throw new Error('Random loop jumps to a shader that was not mixed in');
      }
    }
    lines.push(`PASS ${time}s: both live layers match the expected gradual mix${previousTime >= 0 ? ` after ${previousTime}s` : ''}`);
    previousLive = livePixels; previousTime = time;
    results.textContent = lines.join('\n');
  }
  if (mixFrames < 4) throw new Error('Insufficient intermediate mix frames');
} catch (error) { failed = true; lines.push(`FAIL ${error}`); }
finally { root.unmount(); }
document.body.dataset.status = failed ? 'fail' : 'ok';
results.textContent = lines.join('\n') + (failed ? '\nFAILED' : '\n20 live checks passed');
