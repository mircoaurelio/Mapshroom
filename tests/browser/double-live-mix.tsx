import { createRoot } from 'react-dom/client';
import { TimelineStageRenderer } from '../../src/components/TimelineStageRenderer';
import { StageRenderer, type StageFrameInfo } from '../../src/components/StageRenderer';
import { createDefaultProject } from '../../src/config';
import { createTimelineShaderStep, getTimelineTransitionSeed, resolveShaderTimelineState } from '../../src/lib/timeline';
import { buildTimelineTransitionShaderCode } from '../../src/lib/timelineShader';
import { parseUniforms } from '../../src/lib/shader';
import type { TimelineTransitionEffect } from '../../src/types';
import '../../src/index.css';

const project = createDefaultProject('double-live-test');
const colors = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1]];
const shaders = colors.map((color, index) => {
  const code = `vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) { return vec4(${color.map(value => `${value}.`).join(',')},1.); }`;
  return { ...project.studio.savedShaders[0], id: `color-${index}`, name: `Color ${index}`, code, lastValidCode: code, inputAssetId: null, uniformValues: {}, lastValidUniformValues: {} };
});
// Per-clip transitions are off: enabling shared Mix T must override them.
const steps = shaders.map(shader => ({ ...createTimelineShaderStep(shader.id), id: `step-${shader.id}`, durationSeconds: 4, transitionDurationSeconds: 0 }));
const resolve = (timeSeconds: number, salt: string, effect: TimelineTransitionEffect = 'mix', duration = 2) => resolveShaderTimelineState({
  shaders, steps, mode: 'randomMix', focusedStepId: null, singleStepLoopEnabled: false, randomChoiceEnabled: false,
  sharedTransitionEnabled: true, sharedTransitionEffect: effect, sharedTransitionDurationSeconds: duration, sharedSectionDurationSeconds: 4,
  timeSeconds, loop: true, randomSeedSalt: salt,
})!;
// A deterministic seed with four distinct shaders across the first two pairs.
const token = Array.from({ length: 100 }, (_, i) => `live-${i}`).find(value => {
  const a = resolve(0, `double-primary:${value}`), b = resolve(0, `double-secondary:${value}:secondary`);
  return new Set([a.currentShader.id, a.nextShader?.id, b.currentShader.id, b.nextShader?.id]).size === 4;
})!;
if (!token) throw new Error('Test needs four distinct contributors');
const baseTimeline = { ...project.timeline.stub, shaderSequence: {
  ...project.timeline.stub.shaderSequence, enabled: true, mode: 'double' as const,
  stagePreviewMode: 'timeline' as const, singleStepLoopEnabled: false, randomSeedToken: token,
  sharedTransitionEnabled: true, sharedTransitionEffect: 'mix' as const, sharedSectionDurationSeconds: 4, sharedTransitionDurationSeconds: 2, steps,
} };
const results = document.getElementById('results')!;
const lines: string[] = [];
const longSamples = [0, 1, 2, 2.25, 2.5, 3, 3.5, 3.9, 4, 6, 6.5, 7, 7.5, 8, 14, 14.5, 15, 15.9, 16, 18, 19];
const scenarios = [
  ...(['mix', 'wipe', 'radial', 'noise', 'random'] as const).map(effect => ({ effect, duration: 2 })),
  ...[0, 1, 4].map(duration => ({ effect: 'mix' as const, duration })),
];
const canvases: Record<string, HTMLCanvasElement | null> = { live: null, expected: null };
let failed = false;
let checks = 0;

for (const scenario of scenarios) {
  const { effect, duration } = scenario;
  const start = 4 - duration;
  const samples = effect === 'mix' && duration === 2 ? longSamples : [...new Set([
    0, start / 2, start,
    ...(duration === 0 ? [3.99] : [.125, .25, .5, .75, .95].map(p => start + duration * p)),
    4,
  ])].sort((a, b) => a - b);
  const label = `${effect}, Mix T=${duration}`;
  const timeline = { ...baseTimeline, shaderSequence: { ...baseTimeline.shaderSequence,
    sharedTransitionEffect: effect, sharedTransitionDurationSeconds: duration,
  } };
  const root = createRoot(document.getElementById('fixture')!);
  let previousLive: Uint8Array | null = null;
  let previousTime = -1;
  let mixFrames = 0;

  try {
    for (const time of samples) {
      const streams = [`double-primary:${token}`, `double-secondary:${token}:secondary`].map(salt => resolve(time, salt, effect, duration));
      const expectedLayers = streams.map(state => {
        const code = buildTimelineTransitionShaderCode({ fromCode: state.currentShader.code, toCode: state.nextShader!.code, effect });
        const p = state.transitionProgress;
        return { shaderCode: code, uniformDefinitions: parseUniforms(code), opacity: .5, uniformValues: {
          u_transition_progress: p * p * (3 - 2 * p), u_transition_duration: Math.max(duration, .001),
          u_transition_seed: getTimelineTransitionSeed(state.currentStep.id, state.nextStep!.id, `${state.cycleIndex}:${token}:double-primary:${token}`),
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
      if (previousLive && livePixels && time < 4) {
        let changed = 0;
        for (let i = 0; i < previousLive.length; i++) changed += Math.abs(previousLive[i] - livePixels[i]);
        if (time <= start && changed / previousLive.length > 1) throw new Error(`Automatic effect outside mix at ${time}s`);
        if (effect === 'mix' && time > start) {
          if (changed / previousLive.length < 1) throw new Error(`Frozen mix at ${time}s`);
          mixFrames++;
        }
      }
      // Independent numerical oracle for a Mix: every pixel must equal the
      // weighted sum of two outgoing and two incoming constant shader colors.
      if (effect === 'mix' && livePixels) {
        const expectedRgb = [0, 1, 2].map(channel => streams.reduce((sum, state) => {
          const p = state.transitionProgress, eased = p * p * (3 - 2 * p);
          const from = colors[shaders.indexOf(state.currentShader)][channel];
          const to = colors[shaders.indexOf(state.nextShader!)][channel];
          return sum + .5 * ((1 - eased) * from + eased * to) * 255;
        }, 0));
        for (let i = 0; i < livePixels.length; i += 4) for (let channel = 0; channel < 3; channel++) {
          if (Math.abs(livePixels[i + channel] - expectedRgb[channel]) > 2) throw new Error(`Incorrect four-shader weights at ${time}s`);
        }
      }
      // At a loop boundary the new pair must be the one that just faded in.
      if (time === 16) {
        for (const salt of [`double-primary:${token}`, `double-secondary:${token}:secondary`]) {
          if (resolve(15.999, salt).nextShader?.id !== resolve(16, salt).currentShader.id) throw new Error('Random loop jumps to a shader that was not mixed in');
        }
      }
      lines.push(`PASS ${label}, ${time}s${previousTime >= 0 ? ` after ${previousTime}s` : ''}`);
      checks++;
      previousLive = livePixels; previousTime = time;
      results.textContent = lines.join('\n');
    }
    if (effect === 'mix' && duration > 0 && mixFrames < 4) throw new Error('Insufficient intermediate mix frames');
  } catch (error) { failed = true; lines.push(`FAIL ${label}: ${error}`); }
  finally { root.unmount(); }
  if (failed) break;
}
document.body.dataset.status = failed ? 'fail' : 'ok';
results.textContent = lines.join('\n') + (failed ? '\nFAILED' : `\n${checks} live checks passed`);
