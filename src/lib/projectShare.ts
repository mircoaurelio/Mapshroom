import { APP_VERSION } from '../config';
import { snapshotTransport } from './clock';
import {
  getAssetBlob,
  persistActiveSessionId,
  putAssetBlob,
  saveProjectDocument,
} from './storage';
import type { AssetRecord, ProjectDocument } from '../types';

interface SharedAssetPayload {
  id: string;
  mimeType: string;
  data: string;
}

interface SharedProjectPayload {
  version: number;
  project: ProjectDocument;
  assets: SharedAssetPayload[];
  createdAt: string;
}

export interface ProjectShareLinkResult {
  url: string;
  sha256: string;
  payloadBytes: number;
  assetCount: number;
}

export interface ImportedSharedProjectResult {
  project: ProjectDocument;
}

function createProjectSnapshot(project: ProjectDocument): ProjectDocument {
  return {
    ...project,
    playback: {
      ...project.playback,
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

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return bytesToBase64(new Uint8Array(buffer));
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

function createSharedAssetBlob(payload: SharedAssetPayload): Blob {
  return new Blob([toArrayBuffer(base64ToBytes(payload.data))], {
    type: payload.mimeType || 'application/octet-stream',
  });
}

function remapImportedProjectAssetIds(
  project: ProjectDocument,
  assets: SharedAssetPayload[],
): {
  project: ProjectDocument;
  assets: SharedAssetPayload[];
} {
  const idMap = new Map<string, string>();
  const remappedAssets = assets.map((asset) => {
    const nextId = crypto.randomUUID();
    idMap.set(asset.id, nextId);
    return {
      ...asset,
      id: nextId,
    };
  });

  return {
    project: {
      ...project,
      library: {
        ...project.library,
        assets: project.library.assets.map((asset) => ({
          ...asset,
          id: idMap.get(asset.id) ?? asset.id,
        })),
        activeAssetId: project.library.activeAssetId
          ? idMap.get(project.library.activeAssetId) ?? project.library.activeAssetId
          : null,
      },
      playback: {
        ...project.playback,
        activeAssetId: project.playback.activeAssetId
          ? idMap.get(project.playback.activeAssetId) ?? project.playback.activeAssetId
          : null,
      },
    },
    assets: remappedAssets,
  };
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
  const missingAssets: string[] = [];
  const sharedAssets = await Promise.all(
    snapshot.library.assets.map(async (asset) => {
      const blob = await getAssetBlob(asset.id);
      if (!blob) {
        missingAssets.push(asset.name);
        return null;
      }

      return {
        id: asset.id,
        mimeType: blob.type || asset.mimeType,
        data: await blobToBase64(blob),
      } satisfies SharedAssetPayload;
    }),
  );

  if (missingAssets.length > 0) {
    throw new Error(
      `Unable to create a lossless share link because ${missingAssets.length} asset${
        missingAssets.length === 1 ? ' is' : 's are'
      } missing from local storage.`,
    );
  }

  const payload: SharedProjectPayload = {
    version: APP_VERSION,
    project: snapshot,
    assets: sharedAssets.filter((asset): asset is SharedAssetPayload => asset !== null),
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
    assetCount: sharedAssets.length,
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
  if (!payload?.project || !Array.isArray(payload.assets)) {
    throw new Error('Shared project link is invalid.');
  }

  const remapped = remapImportedProjectAssetIds(payload.project, payload.assets);
  const importedProject: ProjectDocument = {
    ...remapped.project,
    version: payload.project.version ?? APP_VERSION,
    sessionId: crypto.randomUUID(),
    name: payload.project.name?.trim() || 'Shared Project',
  };

  await Promise.all(
    remapped.assets.map((asset) => putAssetBlob(asset.id, createSharedAssetBlob(asset))),
  );

  saveProjectDocument(importedProject);
  persistActiveSessionId(importedProject.sessionId);
  stripShareParamsFromUrl();

  return {
    project: importedProject,
  };
}

export function estimateSharedProjectAssetCount(project: ProjectDocument): number {
  return project.library.assets.length;
}

export function getProjectShareAssetNames(project: ProjectDocument): string[] {
  return project.library.assets.map((asset: AssetRecord) => asset.name);
}
