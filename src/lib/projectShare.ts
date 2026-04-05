import { APP_VERSION } from '../config';
import { snapshotTransport } from './clock';
import { persistActiveSessionId, saveProjectDocument } from './storage';
import type { ProjectDocument } from '../types';

interface SharedProjectPayload {
  version: number;
  project: ProjectDocument;
  createdAt: string;
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

function getSharedProjectShaderIds(project: ProjectDocument): string[] {
  const uniqueIds = new Set(
    project.timeline.stub.shaderSequence.steps.map((step) => step.shaderId),
  );

  if (uniqueIds.size === 0) {
    uniqueIds.add(project.studio.activeShaderId);
  }

  return [...uniqueIds];
}

function createProjectSnapshot(project: ProjectDocument): ProjectDocument {
  const sharedShaderIds = getSharedProjectShaderIds(project);
  const sharedSavedShaders = project.studio.savedShaders.filter((shader) =>
    sharedShaderIds.includes(shader.id),
  );
  const focusedStepShaderId =
    project.timeline.stub.shaderSequence.steps.find(
      (step) => step.id === project.timeline.stub.shaderSequence.focusedStepId,
    )?.shaderId ?? null;
  const sharedActiveShader =
    sharedSavedShaders.find((shader) => shader.id === project.studio.activeShaderId) ??
    (focusedStepShaderId
      ? sharedSavedShaders.find((shader) => shader.id === focusedStepShaderId) ?? null
      : null) ??
    sharedSavedShaders[0] ??
    null;

  return {
    ...project,
    studio: {
      ...project.studio,
      activeShaderId: sharedActiveShader?.id ?? project.studio.activeShaderId,
      activeShaderName: sharedActiveShader?.name ?? project.studio.activeShaderName,
      activeShaderCode: sharedActiveShader?.code ?? project.studio.activeShaderCode,
      shaderVersions: sharedActiveShader?.versions ?? project.studio.shaderVersions,
      shaderChatHistory:
        sharedActiveShader?.id === project.studio.activeShaderId
          ? project.studio.shaderChatHistory
          : [],
      uniformValues: sharedActiveShader?.uniformValues ?? project.studio.uniformValues,
      savedShaders: sharedSavedShaders,
    },
    library: {
      ...project.library,
      assets: [],
      activeAssetId: null,
    },
    playback: {
      ...project.playback,
      activeAssetId: null,
      transport: snapshotTransport(project.playback.transport),
    },
  };
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

  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  await writer.write(toArrayBuffer(bytes));
  await writer.close();
  const response = new Response(stream.readable);
  return new Uint8Array(await response.arrayBuffer());
}

async function decompressBytes(bytes: Uint8Array, compressed: boolean): Promise<Uint8Array> {
  if (!compressed || typeof DecompressionStream === 'undefined') {
    return bytes;
  }

  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  await writer.write(toArrayBuffer(bytes));
  await writer.close();
  const response = new Response(stream.readable);
  return new Uint8Array(await response.arrayBuffer());
}

function stripShareParamsFromUrl(): void {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.delete('share');
  nextUrl.searchParams.delete('sha');
  nextUrl.searchParams.delete('cmp');
  const nextHash = nextUrl.hash || '#/';
  window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}${nextHash}`);
}

export async function createProjectShareLink(
  project: ProjectDocument,
): Promise<ProjectShareLinkResult> {
  const snapshot = createProjectSnapshot(project);

  const payload: SharedProjectPayload = {
    version: APP_VERSION,
    project: snapshot,
    createdAt: new Date().toISOString(),
  };
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
    shaderCount: snapshot.studio.savedShaders.length,
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

  const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as SharedProjectPayload;
  if (!payload?.project) {
    throw new Error('Shared project link is invalid.');
  }
  const importedProject: ProjectDocument = {
    ...payload.project,
    version: payload.project.version ?? APP_VERSION,
    sessionId: crypto.randomUUID(),
    name: payload.project.name?.trim() || 'Shared Project',
    library: {
      ...payload.project.library,
      assets: [],
      activeAssetId: null,
    },
    playback: {
      ...payload.project.playback,
      activeAssetId: null,
      transport: payload.project.playback.transport,
    },
  };

  saveProjectDocument(importedProject);
  persistActiveSessionId(importedProject.sessionId);
  stripShareParamsFromUrl();

  return {
    project: importedProject,
  };
}

export function estimateSharedProjectAssetCount(): number {
  return 0;
}

export function getProjectShareAssetNames(): string[] {
  return [];
}
