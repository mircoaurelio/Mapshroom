import type { SavedShader, ShaderTemplate, ShaderUniformValueMap } from '../types';

export const SHADER_FAVORITES_KEY = 'mapshroom-v3:favorite-shaders';
export type LibrarySource = 'all' | 'mine' | 'library';
export type LibrarySort = 'updated' | 'name';
export interface ShaderFolder { id: string; name: string; shaderIds: string[] }
export interface LibraryOrganization { folders: ShaderFolder[]; recentIds: string[] }
export interface LibraryFilters {
  query: string;
  source: LibrarySource;
  template: ShaderTemplate | 'all';
  audioOnly: boolean;
  favoritesOnly: boolean;
  view: 'all' | 'favorites' | 'recent' | 'mine' | 'library' | 'group' | 'folder';
  group?: string;
  folderId?: string;
  sort: LibrarySort;
}

export function normalizeLibraryText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function readShaderIds(value: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(value ?? '[]');
    return Array.isArray(parsed) ? [...new Set(parsed.filter((id): id is string => typeof id === 'string'))] : [];
  } catch { return []; }
}

export function readLibraryOrganization(value: string | null): LibraryOrganization {
  try {
    const parsed = JSON.parse(value ?? '{}');
    if (!parsed || typeof parsed !== 'object') return { folders: [], recentIds: [] };
    const seen = new Set<string>();
    const folders: ShaderFolder[] = [];
    for (const item of Array.isArray(parsed.folders) ? parsed.folders : []) {
      if (!item || typeof item.id !== 'string' || typeof item.name !== 'string' || !item.name.trim() || seen.has(item.id)) continue;
      seen.add(item.id);
      folders.push({ id: item.id, name: item.name.trim().slice(0, 60), shaderIds: readShaderIds(JSON.stringify(item.shaderIds)) });
    }
    return { folders, recentIds: readShaderIds(JSON.stringify(parsed.recentIds)).slice(0, 50) };
  } catch { return { folders: [], recentIds: [] }; }
}

export function addShaderFolder(organization: LibraryOrganization, id: string, name: string): LibraryOrganization {
  const cleaned = name.trim().replace(/\s+/g, ' ');
  if (!cleaned || cleaned.length > 60) throw new Error('Use a folder name between 1 and 60 characters.');
  if (organization.folders.some(folder => normalizeLibraryText(folder.name) === normalizeLibraryText(cleaned))) {
    throw new Error('A folder with this name already exists.');
  }
  return { ...organization, folders: [...organization.folders, { id, name: cleaned, shaderIds: [] }] };
}

export function moveShaderToFolder(organization: LibraryOrganization, shaderId: string, folderId: string): LibraryOrganization {
  if (folderId && !organization.folders.some(folder => folder.id === folderId)) return organization;
  return { ...organization, folders: organization.folders.map(folder => ({
    ...folder,
    shaderIds: [...folder.shaderIds.filter(id => id !== shaderId), ...(folder.id === folderId ? [shaderId] : [])],
  })) };
}

export function filterLibraryShaders(shaders: SavedShader[], bundledIds: ReadonlySet<string>, favorites: ReadonlySet<string>, organization: LibraryOrganization, filters: LibraryFilters) {
  const tokens = normalizeLibraryText(filters.query).split(/\s+/).filter(Boolean);
  const folderIds = new Set(organization.folders.find(folder => folder.id === filters.folderId)?.shaderIds ?? []);
  const recent = new Map(organization.recentIds.map((id, index) => [id, index]));
  const updated = (shader: SavedShader) => Math.max(0, ...(shader.versions ?? []).map(version => Date.parse(version.createdAt) || 0));
  return shaders.filter(shader => {
    if (shader.isTemporary) return false;
    const source = bundledIds.has(shader.id) ? 'library' : 'mine';
    if (filters.source !== 'all' && filters.source !== source) return false;
    if ((filters.view === 'mine' || filters.view === 'library') && filters.view !== source) return false;
    if ((filters.favoritesOnly || filters.view === 'favorites') && !favorites.has(shader.id)) return false;
    if (filters.view === 'recent' && !recent.has(shader.id)) return false;
    if (filters.view === 'folder' && !folderIds.has(shader.id)) return false;
    if (filters.view === 'group' && (source !== 'library' || (shader.group?.trim() || 'Saved') !== filters.group)) return false;
    const templates = shader.templates?.length ? shader.templates : [shader.template ?? 'sculpture'];
    if (filters.template !== 'all' && !templates.includes(filters.template)) return false;
    const audio = Object.values(shader.audioReactiveBindings ?? {}).some(binding => binding.enabled) || shader.group === 'Audio Reactive';
    if (filters.audioOnly && !audio) return false;
    const text = normalizeLibraryText([shader.name, shader.description, shader.group, ...templates, audio ? 'audio reactive' : '', source === 'mine' ? 'my shaders' : 'library'].join(' '));
    return tokens.every(token => text.includes(token));
  }).sort((a, b) => {
    if (filters.view === 'recent') return recent.get(a.id)! - recent.get(b.id)!;
    if (filters.sort === 'updated') {
      const delta = updated(b) - updated(a);
      if (delta) return delta;
    }
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
}

export function parseShaderImport(text: string, filename: string): { name: string; code: string; uniformValues: ShaderUniformValueMap } {
  let code = text.replace(/^\uFEFF/, '').trim();
  let name = filename.replace(/\.[^.]+$/, '');
  const uniformValues: ShaderUniformValueMap = {};
  if (/\.json$/i.test(filename)) {
    let parsed;
    try { parsed = JSON.parse(code); } catch { throw new Error(`${filename}: invalid JSON.`); }
    if (!parsed || typeof parsed.code !== 'string') throw new Error(`${filename}: the JSON must contain a shader code field.`);
    code = parsed.code.trim();
    if (typeof parsed.name === 'string' && parsed.name.trim()) name = parsed.name.trim();
    if (parsed.uniformValues && typeof parsed.uniformValues === 'object') {
      for (const [key, value] of Object.entries(parsed.uniformValues)) {
        if (!/^[a-zA-Z_]\w*$/.test(key)) continue;
        if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) uniformValues[key] = value;
        else if (Array.isArray(value) && value.length === 3 && value.every(item => typeof item === 'number' && Number.isFinite(item))) uniformValues[key] = value as [number, number, number];
      }
    }
  }
  if (!code || !/(?:vec4\s+processColor|void\s+main)\s*\(/.test(code)) throw new Error(`${filename}: expected GLSL shader code with processColor() or main().`);
  return { name: name.slice(0, 120) || 'Imported shader', code, uniformValues };
}
