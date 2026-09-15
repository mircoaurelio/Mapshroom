import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SavedShader, ShaderTemplate } from '../types';
import { addShaderFolder, filterLibraryShaders, moveShaderToFolder, normalizeLibraryText, readLibraryOrganization, readShaderIds, SHADER_FAVORITES_KEY, type LibraryFilters, type LibraryOrganization } from '../lib/shaderLibrary';
import { ShaderThumbnail } from './ShaderThumbnail';
import './ShaderLibraryPage.css';

interface Props {
  sessionId: string;
  shaders: SavedShader[];
  bundledIds: ReadonlySet<string>;
  activeShaderId: string;
  chat: ReactNode;
  onSelect: (id: string) => void;
  onOpenWorkspace: (id: string) => void;
  onNewShader: () => void;
  onImport: (files: File[]) => Promise<void>;
}
type IconName = 'folder' | 'search' | 'star' | 'clock' | 'grid' | 'list' | 'open' | 'chat' | 'import' | 'plus' | 'chevron' | 'close' | 'audio';
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    folder: <path d="M3 7V5a2 2 0 0 1 2-2h5l3 3h6a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm0 1h18" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    grid: <><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="3" width="6" height="6" rx="1" /><rect x="3" y="15" width="6" height="6" rx="1" /><rect x="15" y="15" width="6" height="6" rx="1" /></>,
    list: <path d="M8 5h13M8 12h13M8 19h13M3 5h.1M3 12h.1M3 19h.1" />,
    open: <><path d="M14 3h7v7m0-7L10 14M10 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-5" /></>,
    chat: <path d="M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Zm-14-5h.1m4.9 0h.1m4.9 0h.1" />,
    import: <path d="M12 16V3m-5 5 5-5 5 5M3 15v5h18v-5" />,
    plus: <path d="M12 4v16M4 12h16" />,
    chevron: <path d="m9 5 7 7-7 7" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    audio: <path d="M4 9v6m5-11v16m6-13v10m5-6v2" />,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
const initialFilters: LibraryFilters = { query: '', source: 'all', template: 'all', audioOnly: false, favoritesOnly: false, view: 'all', sort: 'updated' };
const readLocal = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };

export function ShaderLibraryPage({ sessionId, shaders, bundledIds, activeShaderId, chat, onSelect, onOpenWorkspace, onNewShader, onImport }: Props) {
  const organizationKey = `mapshroom-v3:shader-library:${sessionId}`;
  const [organization, setOrganization] = useState<LibraryOrganization>(() => readLibraryOrganization(readLocal(organizationKey)));
  const [favorites, setFavorites] = useState(() => new Set(readShaderIds(readLocal(SHADER_FAVORITES_KEY))));
  const [filters, setFilters] = useState(initialFilters);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [limit, setLimit] = useState(24);
  const [chatOpen, setChatOpen] = useState(true);
  const [foldersOpen, setFoldersOpen] = useState(false);
  const [directoryQuery, setDirectoryQuery] = useState('');
  const [expanded, setExpanded] = useState({ mine: true, library: true });
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const catalog = useMemo(() => shaders.filter(shader => !shader.isTemporary), [shaders]);
  const selected = shaders.find(shader => shader.id === activeShaderId);
  const groups = useMemo(() => [...new Set(catalog.filter(shader => bundledIds.has(shader.id)).map(shader => shader.group?.trim() || 'Saved'))].sort(), [catalog, bundledIds]);
  const results = useMemo(() => filterLibraryShaders(shaders, bundledIds, favorites, organization, filters), [shaders, bundledIds, favorites, organization, filters]);
  const visible = results.slice(0, limit);
  const updateFilters = (patch: Partial<LibraryFilters>) => { setFilters(current => ({ ...current, ...patch })); setLimit(24); };
  const navigateFolder = (patch: Partial<LibraryFilters>) => { updateFilters({ view: 'all', group: undefined, folderId: undefined, ...patch }); setFoldersOpen(false); };

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === SHADER_FAVORITES_KEY) setFavorites(new Set(readShaderIds(event.newValue)));
      if (event.key === organizationKey) setOrganization(readLibraryOrganization(event.newValue));
    };
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchInput.current?.focus(); }
    };
    window.addEventListener('storage', sync);
    window.addEventListener('keydown', shortcut);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('keydown', shortcut); };
  }, [organizationKey]);

  const saveOrganization = (next: LibraryOrganization) => {
    setOrganization(next);
    try { localStorage.setItem(organizationKey, JSON.stringify(next)); }
    catch { setError('Storage is full or unavailable. Folder changes will last for this session only.'); }
  };
  const chooseShader = (id: string) => {
    saveOrganization({ ...organization, recentIds: [id, ...organization.recentIds.filter(value => value !== id)].slice(0, 50) });
    onSelect(id);
  };
  const openShader = (id: string) => {
    saveOrganization({ ...organization, recentIds: [id, ...organization.recentIds.filter(value => value !== id)].slice(0, 50) });
    onOpenWorkspace(id);
  };
  const toggleFavorite = (id: string) => {
    const next = new Set(favorites);
    if (next.has(id)) next.delete(id); else next.add(id);
    setFavorites(next);
    try { localStorage.setItem(SHADER_FAVORITES_KEY, JSON.stringify([...next])); }
    catch { setError('Storage is unavailable. Favorites will last for this session only.'); }
  };
  const createFolder = () => {
    try {
      setError('');
      const id = crypto.randomUUID();
      const next = addShaderFolder(organization, id, newFolder ?? '');
      saveOrganization(next); setNewFolder(null);
      setNotice('Folder created. Select a shader and use Move to folder to organize it.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to create folder.'); }
  };
  const runImport = async (files: File[]) => {
    if (!files.length || importing) return;
    setImporting(true); setError(''); setNotice('');
    try { await onImport(files); updateFilters({ ...initialFilters, view: 'mine' }); setNotice(`Imported ${files.length} shader${files.length === 1 ? '' : 's'}.`); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to import shader.'); }
    finally { setImporting(false); if (fileInput.current) fileInput.current.value = ''; }
  };
  const directoryMatches = (name: string) => normalizeLibraryText(name).includes(normalizeLibraryText(directoryQuery));
  const folderButton = (label: string, icon: IconName, count: number, active: boolean, action: () => void, nested = false) => (
    <button type="button" className={`shader-library-folder${nested ? ' is-nested' : ''}`} aria-current={active ? 'location' : undefined} onClick={action}>
      <Icon name={icon} /><span>{label}</span><small>{count}</small>
    </button>
  );
  const activeLocation = filters.view === 'folder' ? organization.folders.find(folder => folder.id === filters.folderId)?.name : filters.view === 'group' ? filters.group : ({ all: 'All shaders', favorites: 'Favorites', recent: 'Recent', mine: 'My shaders', library: 'Library' } as Record<string, string>)[filters.view];

  return <section className={`shader-library-page${chatOpen ? ' with-chat' : ''}${foldersOpen ? ' with-directory' : ''}`} aria-label="Shader library">
    {foldersOpen && <button type="button" className="shader-library-directory-backdrop" aria-label="Close folders" onClick={() => setFoldersOpen(false)} />}
    <aside className="shader-library-directory" aria-label="Shader folders">
      <header><strong>LIBRARY</strong><span className="shader-library-directory-actions"><button type="button" className="shader-library-icon-button" aria-label="New folder" onClick={() => setNewFolder('')}><Icon name="plus" /></button><button type="button" className="shader-library-icon-button shader-library-directory-close" aria-label="Close folder panel" onClick={() => setFoldersOpen(false)}><Icon name="close" /></button></span></header>
      <label className="shader-library-search directory-search"><Icon name="search" /><input aria-label="Find a folder" placeholder="Find a folder…" value={directoryQuery} onChange={event => setDirectoryQuery(event.target.value)} /></label>
      <div className="shader-library-directory-scroll">
        {folderButton('All shaders', 'grid', catalog.length, filters.view === 'all', () => navigateFolder({ view: 'all' }))}
        {folderButton('Favorites', 'star', catalog.filter(shader => favorites.has(shader.id)).length, filters.view === 'favorites', () => navigateFolder({ view: 'favorites' }))}
        {folderButton('Recent', 'clock', catalog.filter(shader => organization.recentIds.includes(shader.id)).length, filters.view === 'recent', () => navigateFolder({ view: 'recent' }))}
        <h3>FOLDERS</h3>
        <div className="shader-library-root-row"><button type="button" className="shader-library-expander" aria-label="Expand My shaders" aria-expanded={expanded.mine} onClick={() => setExpanded(value => ({ ...value, mine: !value.mine }))}><Icon name="chevron" /></button>
          {folderButton('My shaders', 'folder', catalog.filter(shader => !bundledIds.has(shader.id)).length, filters.view === 'mine', () => navigateFolder({ view: 'mine' }))}</div>
        {(expanded.mine || directoryQuery) && organization.folders.filter(folder => directoryMatches(folder.name)).map(folder => <div key={folder.id}>{folderButton(folder.name, 'folder', catalog.filter(shader => folder.shaderIds.includes(shader.id)).length, filters.view === 'folder' && filters.folderId === folder.id, () => navigateFolder({ view: 'folder', folderId: folder.id }), true)}</div>)}
        {expanded.mine && organization.folders.length === 0 && <p className="shader-library-directory-hint">Create folders to organize your collection.</p>}
        <div className="shader-library-root-row"><button type="button" className="shader-library-expander" aria-label="Expand Library" aria-expanded={expanded.library} onClick={() => setExpanded(value => ({ ...value, library: !value.library }))}><Icon name="chevron" /></button>
          {folderButton('Library', 'folder', catalog.filter(shader => bundledIds.has(shader.id)).length, filters.view === 'library', () => navigateFolder({ view: 'library' }))}</div>
        {(expanded.library || directoryQuery) && groups.filter(directoryMatches).map(group => <div key={group}>{folderButton(group, 'folder', catalog.filter(shader => bundledIds.has(shader.id) && (shader.group?.trim() || 'Saved') === group).length, filters.view === 'group' && filters.group === group, () => navigateFolder({ view: 'group', group }), true)}</div>)}
      </div>
      {newFolder !== null ? <form className="shader-library-folder-form" onSubmit={event => { event.preventDefault(); createFolder(); }}>
        <label>Folder name<input autoFocus maxLength={60} value={newFolder} onChange={event => setNewFolder(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') setNewFolder(null); }} /></label>
        <div><button type="submit" className="primary-button" disabled={!newFolder.trim()}>Create</button><button type="button" className="secondary-button" onClick={() => setNewFolder(null)}>Cancel</button></div>
      </form> : <button type="button" className="secondary-button shader-library-new-folder" onClick={() => setNewFolder('')}><Icon name="plus" />New folder</button>}
    </aside>

    <div className="shader-library-main">
      <header className="shader-library-heading"><div><h1>Shader library</h1><p>Browse, organize and create your visuals.</p></div><div className="shader-library-heading-actions">
        <input ref={fileInput} type="file" className="hidden-input" accept=".glsl,.frag,.fs,.txt,.json" multiple onChange={event => void runImport(Array.from(event.target.files ?? []))} />
        <button type="button" className="secondary-button" disabled={importing} onClick={() => fileInput.current?.click()}><Icon name="import" />{importing ? 'Importing…' : 'Import'}</button>
        <button type="button" className="primary-button" onClick={() => { updateFilters({ ...initialFilters, view: 'mine' }); setChatOpen(true); onNewShader(); }}><Icon name="plus" />New shader</button>
      </div></header>
      <div className="shader-library-toolbar">
        <button type="button" className="secondary-button shader-library-directory-toggle" aria-expanded={foldersOpen} onClick={() => setFoldersOpen(value => !value)}><Icon name="folder" />Folders</button>
        <label className="shader-library-search"><Icon name="search" /><input ref={searchInput} type="search" aria-label="Search shaders" placeholder="Search shaders, tags or descriptions…" value={filters.query} onChange={event => updateFilters({ query: event.target.value })} /><kbd>Ctrl K</kbd></label>
        <button type="button" className="secondary-button shader-library-chat-toggle" aria-pressed={chatOpen} onClick={() => setChatOpen(value => !value)}><Icon name="chat" />AI chat</button>
      </div>
      <div className="shader-library-filters">
        <label>Category<select aria-label="Shader category" value={filters.template} onChange={event => updateFilters({ template: event.target.value as ShaderTemplate | 'all' })}><option value="all">All</option><option value="sculpture">Sculpture</option><option value="stage">Stage</option><option value="drawing">Drawing</option></select></label>
        <label>Source<select aria-label="Shader source" value={filters.source} onChange={event => updateFilters({ source: event.target.value as LibraryFilters['source'] })}><option value="all">All</option><option value="mine">My shaders</option><option value="library">Library</option></select></label>
        <button type="button" className="secondary-button" aria-pressed={filters.audioOnly} onClick={() => updateFilters({ audioOnly: !filters.audioOnly })}><Icon name="audio" />Audio reactive</button>
        <button type="button" className="secondary-button" aria-pressed={filters.favoritesOnly} onClick={() => updateFilters({ favoritesOnly: !filters.favoritesOnly })}><Icon name="star" />Favorites</button>
        {(filters.query || filters.template !== 'all' || filters.source !== 'all' || filters.audioOnly || filters.favoritesOnly || filters.view !== 'all') && <button type="button" className="shader-library-reset" onClick={() => updateFilters(initialFilters)}>Clear filters</button>}
      </div>
      {error && <div className="shader-library-notice is-error" role="alert">{error}<button type="button" aria-label="Dismiss error" onClick={() => setError('')}>×</button></div>}
      {notice && <div className="shader-library-notice" role="status">{notice}<button type="button" aria-label="Dismiss notice" onClick={() => setNotice('')}>×</button></div>}
      <div className="shader-library-results-header"><span aria-live="polite">{activeLocation} <span className="shader-library-count">{results.length} shaders</span></span><div>
        <select aria-label="Sort shaders" value={filters.sort} onChange={event => updateFilters({ sort: event.target.value as LibraryFilters['sort'] })}><option value="updated">Recently updated</option><option value="name">Name A–Z</option></select>
        <div className="shader-library-view-toggle" role="group" aria-label="Shader view"><button type="button" aria-label="Grid view" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}><Icon name="grid" /></button><button type="button" aria-label="List view" aria-pressed={layout === 'list'} onClick={() => setLayout('list')}><Icon name="list" /></button></div>
      </div></div>
      <div className="shader-library-results-scroll">
        {results.length === 0 ? <div className="shader-library-empty"><Icon name="search" /><h2>No shaders here yet</h2><p>{filters.view === 'folder' ? 'Select a shader in All shaders, then use Move to folder.' : 'Try another search or clear your filters.'}</p><button type="button" className="secondary-button" onClick={() => updateFilters(initialFilters)}>Show all shaders</button></div> : <div className={`shader-library-results is-${layout}`}>
          {visible.map(shader => <article key={shader.id} className={`shader-library-card${shader.id === activeShaderId ? ' is-selected' : ''}`}>
            <button type="button" className="shader-library-card-select" aria-label={`Select ${shader.name}`} aria-pressed={shader.id === activeShaderId} onClick={() => chooseShader(shader.id)}>
              <span className="shader-library-preview"><ShaderThumbnail shader={shader} />{shader.id === activeShaderId && <span className="shader-library-check" aria-hidden="true">✓</span>}</span>
              <span className="shader-library-card-meta"><strong title={shader.name}>{shader.name}</strong><span className="shader-library-tags"><span>{shader.group?.trim() || 'Saved'}</span><span>{bundledIds.has(shader.id) ? shader.template ?? 'sculpture' : 'My shader'}</span></span></span>
            </button>
            <div className="shader-library-card-actions"><button type="button" className="shader-library-card-open" onClick={() => openShader(shader.id)}><Icon name="open" />Open in Workspace</button><button type="button" className="shader-library-icon-button" aria-label={`${favorites.has(shader.id) ? 'Remove' : 'Add'} ${shader.name} ${favorites.has(shader.id) ? 'from' : 'to'} favorites`} aria-pressed={favorites.has(shader.id)} onClick={() => toggleFavorite(shader.id)}><Icon name="star" /></button></div>
          </article>)}
        </div>}
        {results.length > 0 && <div className="shader-library-load-more"><span>Showing {visible.length} of {results.length}</span>{limit < results.length && <button type="button" className="secondary-button" onClick={() => setLimit(value => value + 24)}>Load more</button>}</div>}
      </div>
      <footer className="shader-library-selection"><div><small>SELECTED SHADER</small><strong>{selected?.name ?? 'Choose a shader'}</strong></div><div>
        <select aria-label="Move selected shader to folder" value={organization.folders.find(folder => folder.shaderIds.includes(activeShaderId))?.id ?? ''} disabled={!selected || selected.isTemporary} onChange={event => { saveOrganization(moveShaderToFolder(organization, activeShaderId, event.target.value)); setNotice(event.target.value ? 'Shader moved to folder.' : 'Shader removed from folder.'); }}><option value="">Move to folder…</option>{organization.folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select>
        <button type="button" className="primary-button" disabled={!selected} onClick={() => selected && openShader(selected.id)}><Icon name="open" />Open in Workspace</button>
      </div></footer>
    </div>
    {chatOpen && <aside className="shader-library-chat" aria-label="Shader assistant"><header><strong>Shader assistant</strong><button type="button" className="shader-library-icon-button" aria-label="Close AI chat" onClick={() => setChatOpen(false)}><Icon name="close" /></button></header>
      {selected && <div className="shader-library-chat-context"><ShaderThumbnail shader={selected} /><div><small>Selected shader</small><strong>{selected.name}</strong><button type="button" onClick={() => openShader(selected.id)}><Icon name="open" />Open in Workspace</button></div></div>}
      <div className="shader-library-chat-content">{chat}</div>
    </aside>}
  </section>;
}
