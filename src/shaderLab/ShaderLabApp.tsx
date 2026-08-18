import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ACTIVE_SESSION_KEY } from '../config';
import { getBundledAssetUrl } from '../lib/bundledAssets';
import { savePendingShaderApplyRequest } from '../lib/shaderApplyLink';
import { getAssetBlob, loadProjectDocument } from '../lib/storage';
import { ShaderGridCanvas } from './ShaderGridCanvas';
import {
  buildMapshroomShader,
  createInitialColony,
  evolveGenome,
  FIELD_LABELS,
  getGenomeName,
  MIX_LABELS,
  PALETTE_LABELS,
  type ShaderGenome,
} from './shaderEvolution';
import './ShaderLab.css';

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

function readCurrentMapshroomProject() {
  const sessionId = window.localStorage.getItem(ACTIVE_SESSION_KEY);
  return sessionId ? loadProjectDocument(sessionId) : null;
}

export function ShaderLabApp() {
  const [colony, setColony] = useState(() => createInitialColony());
  const [history, setHistory] = useState<ShaderGenome[]>([]);
  const [pastColonies, setPastColonies] = useState<ShaderGenome[][]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const gridRef = useRef<HTMLElement>(null);
  const [mapshroomProject, setMapshroomProject] = useState(readCurrentMapshroomProject);
  const [selectedAssetId, setSelectedAssetId] = useState(
    () => mapshroomProject?.library.activeAssetId ?? '',
  );
  const [uploadedAssetPreview, setUploadedAssetPreview] = useState<{
    assetId: string;
    url: string;
  } | null>(null);
  const generation = colony[0]?.generation ?? 0;

  useEffect(() => {
    document.body.classList.add('spore-page-active');
    document.title = 'Spore — Shader evolution by Mapshroom';
    return () => document.body.classList.remove('spore-page-active');
  }, []);

  useEffect(() => {
    const refreshProject = () => setMapshroomProject(readCurrentMapshroomProject());
    window.addEventListener('focus', refreshProject);
    window.addEventListener('storage', refreshProject);
    return () => {
      window.removeEventListener('focus', refreshProject);
      window.removeEventListener('storage', refreshProject);
    };
  }, []);

  const dominantParent = history.at(-1);
  const effectiveAssetId = mapshroomProject?.library.assets.some(
    (asset) => asset.id === selectedAssetId,
  )
    ? selectedAssetId
    : mapshroomProject?.library.activeAssetId ?? '';
  const selectedAsset = mapshroomProject?.library.assets.find(
    (asset) => asset.id === effectiveAssetId,
  ) ?? null;
  const bundledAssetUrl = selectedAsset ? getBundledAssetUrl(selectedAsset.id) : null;
  const selectedAssetUrl = bundledAssetUrl ?? (
    selectedAsset && uploadedAssetPreview?.assetId === selectedAsset.id
      ? uploadedAssetPreview.url
      : null
  );

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | null = null;
    if (!selectedAsset || bundledAssetUrl) {
      return;
    }
    void getAssetBlob(selectedAsset.id).then((blob) => {
      if (!blob || disposed) return;
      objectUrl = URL.createObjectURL(blob);
      setUploadedAssetPreview({ assetId: selectedAsset.id, url: objectUrl });
    });
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [bundledAssetUrl, selectedAsset]);
  const subtitle = useMemo(() => {
    if (!dominantParent) return 'Nine live starting points. Pick the one with the right energy.';
    return `One close mutation and eight new directions grown from ${getGenomeName(dominantParent)}.`;
  }, [dominantParent]);

  const choose = (genome: ShaderGenome) => {
    setHistory((current) => [...current, genome]);
    setPastColonies((current) => [...current, colony]);
    setColony(evolveGenome(genome));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const newColony = () => {
    setHistory([]);
    setPastColonies([]);
    setColony(createInitialColony(Date.now() % 100000));
  };

  const goBack = () => {
    if (history.length === 0) return;
    const previousColony = pastColonies.at(-1);
    if (!previousColony) return;
    setHistory((current) => current.slice(0, -1));
    setPastColonies((current) => current.slice(0, -1));
    setColony(previousColony);
  };

  const copyShader = async (genome: ShaderGenome) => {
    await navigator.clipboard.writeText(buildMapshroomShader(genome));
    setCopiedId(genome.id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const importInMapshroom = (genome: ShaderGenome) => {
    if (!mapshroomProject) return;
    const requestId = crypto.randomUUID();
    const code = buildMapshroomShader(genome);
    savePendingShaderApplyRequest({
      version: 1,
      requestId,
      sessionId: mapshroomProject.sessionId,
      targetShaderId: mapshroomProject.studio.activeShaderId,
      prompt: `Import ${getGenomeName(genome)} from Mapshroom Spore.`,
      historyPrompt: `Spore generation ${genome.generation}`,
      currentCode: mapshroomProject.studio.activeShaderCode,
      trigger: 'quick_add',
      createdAt: new Date().toISOString(),
    });
    const url = new URL('/', window.location.origin);
    url.searchParams.set('applyShader', '1');
    url.searchParams.set('session', mapshroomProject.sessionId);
    url.searchParams.set('shader', mapshroomProject.studio.activeShaderId);
    url.searchParams.set('request', requestId);
    if (effectiveAssetId) url.searchParams.set('asset', effectiveAssetId);
    url.searchParams.set('code', code);
    url.hash = '/';
    window.open(url.toString(), '_blank', 'noopener');
  };

  return (
    <main className="spore-app">
      <nav className="spore-nav">
        <a className="spore-brand" href="/" aria-label="Back to Mapshroom">
          <img src="/assets/icons/mapshroom-icon-transparent-512.png" alt="" />
          <span>Mapshroom</span>
          <i />
          <strong>Spore</strong>
          <em>LABS</em>
        </a>
        <div className="spore-nav-meta">
          <label className="spore-asset-select">
            <span>Depth map</span>
            <select
              value={effectiveAssetId}
              onChange={(event) => setSelectedAssetId(event.target.value)}
              aria-label="Choose a depth map from Mapshroom"
            >
              <option value="">Select depth map</option>
              {mapshroomProject?.library.assets.map((asset) => (
                <option key={asset.id} value={asset.id}>{asset.name}</option>
              ))}
            </select>
          </label>
          <span><i className="spore-status-dot" /> GLSL ES 3.00</span>
          <a href="/">Open studio <ArrowIcon /></a>
        </div>
      </nav>

      <header className="spore-header">
        <div>
          <p className="spore-kicker">SHADER EVOLUTION / GENERATION {String(generation).padStart(2, '0')}</p>
          <h1>Choose what<br /><em>survives.</em></h1>
        </div>
        <div className="spore-intro">
          <p>{subtitle}</p>
          <div className="spore-header-actions">
            <button type="button" onClick={goBack} disabled={history.length === 0}>← Back</button>
            <button type="button" onClick={newColony}>New colony <span aria-hidden="true">✦</span></button>
          </div>
        </div>
      </header>

      <section className="spore-legend" aria-label="Variation legend">
        <span><i className="spore-dot mutation" /> Mutation <small>close to your pick</small></span>
        <span><i className="spore-dot crossover" /> Crossover <small>new feature added</small></span>
        <b>{colony.length} shaders alive</b>
      </section>

      <section ref={gridRef} className="spore-grid" aria-label="Shader choices">
        <ShaderGridCanvas
          genomes={colony}
          gridRef={gridRef}
          assetUrl={selectedAssetUrl}
          assetKind={selectedAsset?.kind ?? null}
        />
        {colony.map((genome, index) => (
          <article className="spore-card" key={genome.id} style={{ '--spore-index': index } as CSSProperties}>
            <button data-spore-preview className="spore-preview" type="button" onClick={() => choose(genome)} aria-label={`Evolve ${getGenomeName(genome)}`}>
              <span className="spore-card-index">{String(index + 1).padStart(2, '0')}</span>
              <span className={`spore-lineage ${genome.lineage}`}>{genome.lineage === 'origin' ? 'seed' : genome.lineage}</span>
              <span className="spore-pick">Choose <ArrowIcon /></span>
            </button>
            <div className="spore-card-info">
              <div>
                <h2>{getGenomeName(genome)}</h2>
                <p>{FIELD_LABELS[genome.field]} · {MIX_LABELS[genome.mix]}</p>
              </div>
              <div className="spore-card-actions">
                <button type="button" onClick={() => copyShader(genome)} aria-label={`Copy ${getGenomeName(genome)} GLSL`}>
                  {copiedId === genome.id ? 'Copied' : 'GLSL'}
                </button>
                <button
                  type="button"
                  className="spore-import-button"
                  onClick={() => importInMapshroom(genome)}
                  disabled={!mapshroomProject}
                  title={mapshroomProject ? 'Open this shader and asset in Mapshroom' : 'Open Mapshroom once to create a project'}
                >
                  Import ↗
                </button>
              </div>
            </div>
            <div className="spore-traits" aria-label="Shader traits">
              <span>{PALETTE_LABELS[genome.palette]}</span>
              <span>warp {genome.warp.toFixed(2)}</span>
              <span>{genome.symmetry} fold</span>
            </div>
          </article>
        ))}
      </section>

      <footer className="spore-footer">
        <p>Pick. Mutate. Repeat.</p>
        <span>{history.length === 0 ? 'Your lineage starts here.' : `${history.length} selection${history.length === 1 ? '' : 's'} in this lineage.`}</span>
        <button type="button" onClick={() => copyShader(colony[0])}>Copy first shader</button>
      </footer>
    </main>
  );
}
