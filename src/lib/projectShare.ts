import { APP_VERSION, createDefaultProject } from '../config';
import { persistActiveSessionId, saveProjectDocument } from './storage';
import { parseShaderName, parseUniforms, syncUniformValues } from './shader';
import type {
  ProjectDocument,
  SavedShader,
  ShaderUniformValueMap,
  TimelineEditorViewMode,
  TimelineSequenceMode,
  TimelineStagePreviewMode,
  TimelineTransitionEffect,
} from '../types';

interface CompactSharedShaderPayload {
  i: string;
  c: string;
  u?: ShaderUniformValueMap;
}

interface CompactSharedTimelineStepPayload {
  i: string;
  s: string;
  d: number;
  x: number;
  e: TimelineTransitionEffect;
}

interface CompactSharedTimelinePayload {
  d?: number;
  e?: 1;
  m?: TimelineSequenceMode;
  ev?: TimelineEditorViewMode;
  pv?: TimelineStagePreviewMode;
  f?: string | null;
  l?: 1;
  r?: 1;
  z?: 1;
  se?: TimelineTransitionEffect;
  sd?: number;
  s: CompactSharedTimelineStepPayload[];
}

interface CompactSharedProjectPayload {
  v: number;
  n?: string;
  a?: string;
  m?: {
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    p?: number;
    mm?: 1;
    rl?: 1;
  };
  t: CompactSharedTimelinePayload;
  h: CompactSharedShaderPayload[];
}

export interface ProjectShareLinkResult {
  url: string;
  sha256: string;
  payloadBytes: number;
  shaderCount: number;
}

export interface ImportedSharedProjectResult {
  project: ProjectDocument;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function createSha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', toArrayBuffer(bytes));
  return bytesToHex(new Uint8Array(digest));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';

  for (let index = 0; index < bytes.length; index += 0x8000) {
    const chunk = bytes.subarray(index, index + 0x8000);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/');
  const paddingLength = (4 - (padded.length % 4 || 4)) % 4;
  return base64ToBytes(`${padded}${'='.repeat(paddingLength)}`);
}

async function compressBytes(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') {
    return bytes;
  }

  try {
    const compressedStream = new Blob([toArrayBuffer(bytes)])
      .stream()
      .pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(compressedStream).arrayBuffer());
  } catch {
    return bytes;
  }
}

async function decompressBytes(bytes: Uint8Array, compressed: boolean): Promise<Uint8Array> {
  if (!compressed) {
    return bytes;
  }

  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot open compressed share links.');
  }

  const decompressedStream = new Blob([toArrayBuffer(bytes)])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(decompressedStream).arrayBuffer());
}

function stripShareParamsFromUrl(): void {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.delete('share');
  nextUrl.searchParams.delete('sha');
  nextUrl.searchParams.delete('cmp');
  const nextHash = nextUrl.hash || '#/';
  window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}${nextHash}`);
}

function getSharedProjectShaderIds(project: ProjectDocument): string[] {
  const uniqueIds = new Set(
    project.timeline.stub.shaderSequence.steps.map((step) => step.shaderId),
  );

  if (uniqueIds.size === 0) {
    uniqueIds.add(project.studio.activeShaderId);
  }

  return [...uniqueIds];
}

function compactShaderCode(code: string): string {
  return code
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .flatMap((line) => {
      if (!line) {
        return [];
      }

      if (/^\/\/\s*NAME:/i.test(line)) {
        return [line.replace(/^\/\/\s*NAME:\s*/i, '// NAME: ')];
      }

      if (/^uniform\s+(float|int|vec3|bool)\s+/.test(line)) {
        const commentIndex = line.indexOf('//');
        const declaration = (commentIndex >= 0 ? line.slice(0, commentIndex) : line)
          .replace(/\s+/g, ' ')
          .replace(/\s*;\s*$/, ';')
          .trim();
        const meta = commentIndex >= 0 ? line.slice(commentIndex + 2).trim().replace(/\s+/g, ' ') : '';
        return [meta ? `${declaration} // ${meta}` : declaration];
      }

      const withoutComment = line.replace(/\s*\/\/.*$/, '').trim();
      if (!withoutComment) {
        return [];
      }

      return [withoutComment.replace(/\s+/g, ' ')];
    })
    .join('\n');
}

function createBaseShaderVersion(name: string, code: string) {
  return [
    {
      id: crypto.randomUUID(),
      prompt: 'Base Node Source',
      name,
      code,
      createdAt: new Date().toISOString(),
    },
  ];
}

function createCompactSharePayload(project: ProjectDocument): CompactSharedProjectPayload {
  const sharedShaderIds = getSharedProjectShaderIds(project);
  const timelineShaders = project.studio.savedShaders.filter((shader) => sharedShaderIds.includes(shader.id));
  const focusedStepShaderId =
    project.timeline.stub.shaderSequence.steps.find(
      (step) => step.id === project.timeline.stub.shaderSequence.focusedStepId,
    )?.shaderId ?? null;
  const sharedActiveShader =
    timelineShaders.find((shader) => shader.id === project.studio.activeShaderId) ??
    (focusedStepShaderId
      ? timelineShaders.find((shader) => shader.id === focusedStepShaderId) ?? null
      : null) ??
    timelineShaders[0] ??
    null;

  return {
    v: APP_VERSION,
    n: project.name?.trim() || undefined,
    a: sharedActiveShader?.id ?? undefined,
    m: {
      x: project.mapping.stageTransform.offsetX,
      y: project.mapping.stageTransform.offsetY,
      w: project.mapping.stageTransform.widthAdjust,
      h: project.mapping.stageTransform.heightAdjust,
      p: project.mapping.stageTransform.precision,
      mm: project.mapping.stageTransform.moveMode ? 1 : undefined,
      rl: project.mapping.stageTransform.rotationLocked ? 1 : undefined,
    },
    t: {
      d: project.timeline.stub.durationSeconds,
      e: project.timeline.stub.enabled ? 1 : undefined,
      m: project.timeline.stub.shaderSequence.mode,
      ev: project.timeline.stub.shaderSequence.editorView,
      pv: project.timeline.stub.shaderSequence.stagePreviewMode,
      f: project.timeline.stub.shaderSequence.focusedStepId,
      l: project.timeline.stub.shaderSequence.singleStepLoopEnabled ? 1 : undefined,
      r: project.timeline.stub.shaderSequence.randomChoiceEnabled ? 1 : undefined,
      z: project.timeline.stub.shaderSequence.sharedTransitionEnabled ? 1 : undefined,
      se: project.timeline.stub.shaderSequence.sharedTransitionEffect,
      sd: project.timeline.stub.shaderSequence.sharedTransitionDurationSeconds,
      s: project.timeline.stub.shaderSequence.steps
        .filter((step) => sharedShaderIds.includes(step.shaderId))
        .map((step) => ({
          i: step.id,
          s: step.shaderId,
          d: step.durationSeconds,
          x: step.transitionDurationSeconds,
          e: step.transitionEffect,
        })),
    },
    h: timelineShaders.map((shader) => {
      const baseUniformValues =
        shader.id === project.studio.activeShaderId
          ? project.studio.uniformValues
          : shader.uniformValues ?? {};
      const compactCode = compactShaderCode(shader.code);
      const compactUniformValues = syncUniformValues(baseUniformValues, parseUniforms(compactCode));

      return {
        i: shader.id,
        c: compactCode,
        u: Object.keys(compactUniformValues).length ? compactUniformValues : undefined,
      };
    }),
  };
}

function restoreSavedShader(payload: CompactSharedShaderPayload): SavedShader {
  const name = parseShaderName(payload.c);
  const uniformValues = syncUniformValues(payload.u ?? {}, parseUniforms(payload.c));

  return {
    id: payload.i,
    name,
    code: payload.c,
    versions: createBaseShaderVersion(name, payload.c),
    uniformValues,
    lastValidCode: payload.c,
    lastValidUniformValues: uniformValues,
    pendingAiJobCount: 0,
    hasUnreadAiResult: false,
  };
}

function restoreProjectFromCompactPayload(payload: CompactSharedProjectPayload): ProjectDocument {
  const baseProject = createDefaultProject(crypto.randomUUID());
  const savedShaders = payload.h.length ? payload.h.map(restoreSavedShader) : baseProject.studio.savedShaders;
  const activeShader =
    savedShaders.find((shader) => shader.id === payload.a) ??
    savedShaders[0] ??
    baseProject.studio.savedShaders[0];
  const timelineSteps = payload.t.s.length
    ? payload.t.s
        .filter((step) => savedShaders.some((shader) => shader.id === step.s))
        .map((step) => ({
          id: step.i,
          shaderId: step.s,
          durationSeconds: step.d,
          transitionDurationSeconds: step.x,
          transitionEffect: step.e,
        }))
    : [
        {
          ...baseProject.timeline.stub.shaderSequence.steps[0],
          shaderId: activeShader.id,
        },
      ];
  const focusedStepId =
    payload.t.f && timelineSteps.some((step) => step.id === payload.t.f)
      ? payload.t.f
      : timelineSteps[0]?.id ?? null;

  return {
    ...baseProject,
    name: payload.n?.trim() || 'Shared Project',
    studio: {
      ...baseProject.studio,
      activeShaderId: activeShader.id,
      activeShaderName: activeShader.name,
      activeShaderCode: activeShader.code,
      shaderVersions: activeShader.versions ?? createBaseShaderVersion(activeShader.name, activeShader.code),
      savedShaders,
      shaderChatHistory: [],
      uniformValues: activeShader.uniformValues ?? {},
    },
    mapping: {
      stageTransform: {
        ...baseProject.mapping.stageTransform,
        offsetX: payload.m?.x ?? baseProject.mapping.stageTransform.offsetX,
        offsetY: payload.m?.y ?? baseProject.mapping.stageTransform.offsetY,
        widthAdjust: payload.m?.w ?? baseProject.mapping.stageTransform.widthAdjust,
        heightAdjust: payload.m?.h ?? baseProject.mapping.stageTransform.heightAdjust,
        precision: payload.m?.p ?? baseProject.mapping.stageTransform.precision,
        moveMode: Boolean(payload.m?.mm),
        rotationLocked: Boolean(payload.m?.rl),
      },
    },
    library: {
      ...baseProject.library,
      assets: [],
      activeAssetId: null,
    },
    playback: {
      ...baseProject.playback,
      activeAssetId: null,
      transport: {
        ...baseProject.playback.transport,
        loop: true,
      },
    },
    timeline: {
      stub: {
        ...baseProject.timeline.stub,
        enabled: Boolean(payload.t.e ?? timelineSteps.length > 0),
        durationSeconds: payload.t.d ?? baseProject.timeline.stub.durationSeconds,
        shaderSequence: {
          ...baseProject.timeline.stub.shaderSequence,
          enabled: Boolean(payload.t.e ?? timelineSteps.length > 0),
          mode: payload.t.m ?? baseProject.timeline.stub.shaderSequence.mode,
          editorView: payload.t.ev ?? baseProject.timeline.stub.shaderSequence.editorView,
          stagePreviewMode: payload.t.pv ?? baseProject.timeline.stub.shaderSequence.stagePreviewMode,
          focusedStepId,
          singleStepLoopEnabled: Boolean(payload.t.l),
          randomChoiceEnabled: Boolean(payload.t.r),
          sharedTransitionEnabled: Boolean(payload.t.z),
          sharedTransitionEffect:
            payload.t.se ?? baseProject.timeline.stub.shaderSequence.sharedTransitionEffect,
          sharedTransitionDurationSeconds:
            payload.t.sd ?? baseProject.timeline.stub.shaderSequence.sharedTransitionDurationSeconds,
          steps: timelineSteps,
        },
      },
    },
  };
}

export async function createProjectShareLink(
  project: ProjectDocument,
): Promise<ProjectShareLinkResult> {
  const payload = createCompactSharePayload(project);
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const sha256 = await createSha256Hex(payloadBytes);
  const compressedBytes = await compressBytes(payloadBytes);
  const isCompressed = compressedBytes.length < payloadBytes.length;
  const encodedPayload = bytesToBase64Url(isCompressed ? compressedBytes : payloadBytes);
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('share', encodedPayload);
  url.searchParams.set('sha', sha256);
  url.searchParams.set('cmp', isCompressed ? 'gzip' : 'raw');
  url.hash = '#/';

  return {
    url: url.toString(),
    sha256,
    payloadBytes: payloadBytes.byteLength,
    shaderCount: payload.h.length,
  };
}

export async function importProjectFromSharedUrl(): Promise<ImportedSharedProjectResult | null> {
  const url = new URL(window.location.href);
  const sharedPayload = url.searchParams.get('share');

  if (!sharedPayload) {
    return null;
  }

  const compressionMode = url.searchParams.get('cmp') === 'gzip';
  const expectedSha256 = url.searchParams.get('sha');
  const encodedBytes = base64UrlToBytes(sharedPayload);
  const payloadBytes = await decompressBytes(encodedBytes, compressionMode);
  const actualSha256 = await createSha256Hex(payloadBytes);

  if (expectedSha256 && expectedSha256 !== actualSha256) {
    throw new Error('Shared project link failed integrity verification.');
  }

  const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as CompactSharedProjectPayload;
  if (!payload?.h || !Array.isArray(payload.h) || !payload?.t || !Array.isArray(payload.t.s)) {
    throw new Error('Shared project link is invalid.');
  }

  const importedProject = restoreProjectFromCompactPayload(payload);
  saveProjectDocument(importedProject);
  persistActiveSessionId(importedProject.sessionId);
  stripShareParamsFromUrl();

  return {
    project: importedProject,
  };
}
