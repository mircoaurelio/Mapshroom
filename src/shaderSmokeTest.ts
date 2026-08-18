import {
  buildShaderProgramSources,
  detectMinimumShaderTarget,
  isShaderTargetSupported,
  normalizeOfficialShaderBody,
  OFFICIAL_SHADER_PROFILE,
  OFFICIAL_SHADER_TARGET,
  SHADER_ABI_VERSION,
  type ShaderCompileTarget,
} from './lib/shaderCompiler';
import { normalizeProjectShaderSources } from './lib/shaderProfile';
import { buildTimelineTransitionShaderCode } from './lib/timelineShader';
import { shaderPresetList } from './shaders/presets';
import type { ProjectDocument, ShaderMinimumTarget } from './types';

type ShaderContext = WebGLRenderingContext | WebGL2RenderingContext;

interface ShaderFailure {
  id: string;
  name: string;
  phase: 'context' | 'vertex' | 'fragment' | 'link';
  message: string;
}

interface ShaderSmokeEntry {
  id: string;
  name: string;
  code: string;
  minimumTarget?: ShaderMinimumTarget;
}

interface HistoricalProjectBackup {
  project: ProjectDocument;
}

interface TargetSmokeResult {
  target: ShaderCompileTarget;
  label: string;
  supported: boolean;
  passed: number;
  total: number;
  skipped: number;
  durationMs: number;
  failures: ShaderFailure[];
}

interface ShaderSmokeReport {
  abiVersion: number;
  officialTarget: ShaderCompileTarget;
  status: 'ok' | 'fail';
  generatedAt: string;
  nonOfficialPresetIds: string[];
  targets: TargetSmokeResult[];
}

class ShaderProgramError extends Error {
  readonly phase: ShaderFailure['phase'];

  constructor(phase: ShaderFailure['phase'], message: string) {
    super(message);
    this.phase = phase;
  }
}

declare global {
  interface Window {
    __MAPSHROOM_SHADER_SMOKE__?: ShaderSmokeReport;
  }
}

function compileShader(gl: ShaderContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Unable to allocate shader.');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Shader compilation failed.';
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
}

function linkProgram(
  gl: ShaderContext,
  vertexShader: WebGLShader,
  fragmentSource: string,
): void {
  let fragmentShader: WebGLShader;
  try {
    fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  } catch (error) {
    throw new ShaderProgramError(
      'fragment',
      error instanceof Error ? error.message : 'Unknown fragment shader error.',
    );
  }
  const program = gl.createProgram();

  if (!program) {
    gl.deleteShader(fragmentShader);
    throw new ShaderProgramError('link', 'Unable to allocate WebGL program.');
  }

  try {
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new ShaderProgramError('link', gl.getProgramInfoLog(program) || 'Program link failed.');
    }
  } finally {
    gl.deleteProgram(program);
    gl.deleteShader(fragmentShader);
  }
}

function getContext(target: ShaderCompileTarget): ShaderContext | null {
  const canvas = document.createElement('canvas');
  return target === 'webgl2' ? canvas.getContext('webgl2') : canvas.getContext('webgl');
}

function yieldToPage(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

async function runTarget(
  target: ShaderCompileTarget,
  shaderEntries: readonly ShaderSmokeEntry[],
  onProgress: (completed: number) => void,
): Promise<TargetSmokeResult> {
  const label = target === 'webgl2' ? 'WebGL 2 · GLSL ES 3.00' : 'WebGL 1 · GLSL ES 1.00';
  const eligibleEntries = shaderEntries.filter((entry) =>
    isShaderTargetSupported(entry.minimumTarget, target),
  );
  const gl = getContext(target);
  const startedAt = performance.now();

  if (!gl) {
    return {
      target,
      label,
      supported: false,
      passed: 0,
      total: eligibleEntries.length,
      skipped: shaderEntries.length - eligibleEntries.length,
      durationMs: performance.now() - startedAt,
      failures: [{
        id: target,
        name: label,
        phase: 'context',
        message: 'Context is not available in this browser.',
      }],
    };
  }

  const failures: ShaderFailure[] = [];
  let passed = 0;
  const firstSources = buildShaderProgramSources(eligibleEntries[0]?.code ?? '', target);
  let vertexShader: WebGLShader | null = null;

  try {
    vertexShader = compileShader(gl, gl.VERTEX_SHADER, firstSources.vertexSource);

    for (let index = 0; index < eligibleEntries.length; index += 1) {
      const entry = eligibleEntries[index];
      try {
        const sources = buildShaderProgramSources(entry.code, target);
        linkProgram(gl, vertexShader, sources.fragmentSource);
        passed += 1;
      } catch (error) {
        failures.push({
          id: entry.id,
          name: entry.name,
          phase: error instanceof ShaderProgramError ? error.phase : 'fragment',
          message: error instanceof Error ? error.message : 'Unknown shader error.',
        });
      }

      const completed = index + 1;
      if (completed % 40 === 0 || completed === eligibleEntries.length) {
        onProgress(completed);
        await yieldToPage();
      }
    }
  } catch (error) {
    failures.push({
      id: `${target}-vertex`,
      name: `${label} vertex shader`,
      phase: 'vertex',
      message: error instanceof Error ? error.message : 'Unknown vertex shader error.',
    });
  } finally {
    if (vertexShader) {
      gl.deleteShader(vertexShader);
    }
  }

  return {
    target,
    label,
    supported: true,
    passed,
    total: eligibleEntries.length,
    skipped: shaderEntries.length - eligibleEntries.length,
    durationMs: performance.now() - startedAt,
    failures,
  };
}

async function loadHistoricalShaderEntries(): Promise<ShaderSmokeEntry[]> {
  const response = await fetch(
    '/docs/backups/mapshroom-v3-backup-902e74dc-028b-4136-8b55-d7c7d121b01f.json',
  );
  if (!response.ok) {
    throw new Error(`Unable to load historical project fixture (${response.status}).`);
  }

  const backup = (await response.json()) as HistoricalProjectBackup;
  const migratedProject = normalizeProjectShaderSources(backup.project);
  return [
    {
      id: 'history-active',
      name: 'Historical active shader',
      code: migratedProject.studio.activeShaderCode,
      minimumTarget: detectMinimumShaderTarget(migratedProject.studio.activeShaderCode),
    },
    ...migratedProject.studio.savedShaders
      .filter((shader) => !shader.isDirty)
      .map((shader) => ({
        id: `history-${shader.id}`,
        name: `Historical · ${shader.name}`,
        code: shader.code,
        minimumTarget: shader.minimumTarget,
      })),
  ];
}

function buildNestedTransitionSmokeEntry(): ShaderSmokeEntry {
  const shaderBody = (red: number, green: number, blue: number) => `
vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
  return texture(tex, uv) * vec4(${red}.0, ${green}.0, ${blue}.0, 1.0);
}`;
  const primaryTransition = buildTimelineTransitionShaderCode({
    fromCode: shaderBody(1, 0, 0),
    toCode: shaderBody(0, 1, 0),
    effect: 'mix',
  });
  const secondaryTransition = buildTimelineTransitionShaderCode({
    fromCode: shaderBody(0, 0, 1),
    toCode: shaderBody(1, 1, 0),
    effect: 'wipe',
  });

  return {
    id: 'generated-nested-double-transition',
    name: 'Generated nested Double transition',
    code: buildTimelineTransitionShaderCode({
      fromCode: primaryTransition,
      toCode: secondaryTransition,
      effect: 'noise',
    }),
    minimumTarget: 'webgl2',
  };
}

function renderTargetCard(result: TargetSmokeResult): HTMLElement {
  const card = document.createElement('article');
  card.className = `target-card ${result.failures.length === 0 ? 'target-card--ok' : 'target-card--fail'}`;

  const heading = document.createElement('div');
  heading.className = 'target-card__heading';

  const title = document.createElement('h2');
  title.textContent = result.label;

  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = result.failures.length === 0 ? 'PASS' : 'FAIL';

  const metric = document.createElement('strong');
  metric.textContent = `${result.passed} / ${result.total}`;

  const detail = document.createElement('p');
  detail.textContent = result.supported
    ? `Programmi compilati e collegati · ${Math.round(result.durationMs)} ms${
        result.skipped ? ` · ${result.skipped} WebGL2-only esclusi` : ''
      }`
    : 'Contesto non disponibile nel browser';

  heading.append(title, badge);
  card.append(heading, metric, detail);
  return card;
}

function renderReport(report: ShaderSmokeReport): void {
  const status = document.getElementById('status');
  const results = document.getElementById('results');
  const failures = document.getElementById('failures');
  if (!status || !results || !failures) {
    return;
  }

  results.replaceChildren(...report.targets.map(renderTargetCard));
  const allFailures = report.targets.flatMap((target) =>
    target.failures.map(
      (failure) =>
        `${target.label} · ${failure.phase.toUpperCase()} · ${failure.name} [${failure.id}]\n${failure.message}`,
    ),
  );
  allFailures.push(
    ...report.nonOfficialPresetIds.map(
      (id) => `CATALOG · ${id}\nPreset body is not canonical GLSL ES 3.00.`,
    ),
  );

  status.className = report.status === 'ok' ? 'status status--ok' : 'status status--fail';
  status.textContent =
    report.status === 'ok'
      ? `Catalogo compatibile: ${shaderPresetList.length} shader ufficiali verificati su WebGL 2; fallback WebGL 1 verificato dove dichiarato.`
      : `${allFailures.length} errori rilevati. Consulta i dettagli qui sotto.`;

  if (allFailures.length === 0) {
    failures.replaceChildren();
    failures.hidden = true;
  } else {
    const heading = document.createElement('h2');
    heading.textContent = 'Dettagli errori';
    const output = document.createElement('pre');
    output.textContent = allFailures.join('\n\n');
    failures.replaceChildren(heading, output);
    failures.hidden = false;
  }
}

async function runShaderSmokeTest(): Promise<void> {
  const progress = document.getElementById('progress');
  const targets: TargetSmokeResult[] = [];
  const historicalShaderEntries = await loadHistoricalShaderEntries();
  const shaderEntries: ShaderSmokeEntry[] = [
    ...shaderPresetList,
    ...historicalShaderEntries,
    buildNestedTransitionSmokeEntry(),
  ];
  const nonOfficialPresetIds = shaderPresetList
    .filter(
      (preset) =>
        normalizeOfficialShaderBody(preset.code) !== preset.code ||
        preset.sourceProfile !== OFFICIAL_SHADER_PROFILE,
    )
    .map((preset) => preset.id);

  for (const target of ['webgl1', 'webgl2'] as const) {
    if (progress) {
      progress.textContent = `Verifica ${target === 'webgl2' ? 'WebGL 2' : 'WebGL 1'}…`;
    }
    const result = await runTarget(target, shaderEntries, (completed) => {
      if (progress) {
        const total = shaderEntries.filter((entry) =>
          isShaderTargetSupported(entry.minimumTarget, target),
        ).length;
        progress.textContent = `${resultLabel(target)}: ${completed} / ${total}`;
      }
    });
    targets.push(result);
  }

  const report: ShaderSmokeReport = {
    abiVersion: SHADER_ABI_VERSION,
    officialTarget: OFFICIAL_SHADER_TARGET,
    status:
      nonOfficialPresetIds.length === 0 &&
      targets.every((target) => target.supported && target.failures.length === 0)
        ? 'ok'
        : 'fail',
    generatedAt: new Date().toISOString(),
    nonOfficialPresetIds,
    targets,
  };

  window.__MAPSHROOM_SHADER_SMOKE__ = report;
  document.body.dataset.status = report.status;
  document.body.dataset.shaderAbi = String(report.abiVersion);
  document.body.dataset.officialTarget = report.officialTarget;
  if (progress) {
    progress.remove();
  }
  renderReport(report);
}

function resultLabel(target: ShaderCompileTarget): string {
  return target === 'webgl2' ? 'WebGL 2' : 'WebGL 1';
}

void runShaderSmokeTest();
