import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import type { ProjectDocument } from '../src/types.ts';
import { normalizeProjectShaderSources } from '../src/lib/shaderProfile.ts';

interface HistoricalBackup {
  savedShaderCount: number;
  project: ProjectDocument;
}

test('the April v3 project backup migrates to GLSL 300 without losing shader history', () => {
  const backupUrl = new URL(
    '../docs/backups/mapshroom-v3-backup-902e74dc-028b-4136-8b55-d7c7d121b01f.json',
    import.meta.url,
  );
  const backup = JSON.parse(readFileSync(backupUrl, 'utf8')) as HistoricalBackup;
  const original = backup.project;
  const migrated = normalizeProjectShaderSources(original);

  const originalShaderIds = original.studio.savedShaders.map((shader) => shader.id);
  const migratedShaderIds = migrated.studio.savedShaders.map((shader) => shader.id);
  const migratedSources = [
    migrated.studio.activeShaderCode,
    ...migrated.studio.savedShaders.flatMap((shader) => [
      shader.code,
      ...(shader.versions ?? []).map((version) => version.code),
    ]),
  ];

  assert.equal(original.version, 3);
  assert.equal(migrated.version, 3);
  assert.equal(migrated.studio.savedShaders.length, backup.savedShaderCount);
  assert.deepEqual(migratedShaderIds, originalShaderIds);
  assert.equal(migrated.library.assets.length, original.library.assets.length);
  assert.ok(
    migrated.studio.savedShaders.reduce(
      (count, shader) => count + (shader.versions?.length ?? 0),
      0,
    ) >= 800,
  );
  assert.ok(migratedSources.every((source) => !source.includes('texture2D(')));
  assert.ok(
    migrated.studio.savedShaders.every(
      (shader) =>
        shader.sourceProfile === 'glsl300' &&
        (shader.versions ?? []).every((version) => version.sourceProfile === 'glsl300'),
    ),
  );
});
