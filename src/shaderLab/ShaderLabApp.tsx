import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ShaderCanvas } from './ShaderCanvas';
import {
  buildFragmentShader,
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

export function ShaderLabApp() {
  const [colony, setColony] = useState(() => createInitialColony());
  const [history, setHistory] = useState<ShaderGenome[]>([]);
  const [pastColonies, setPastColonies] = useState<ShaderGenome[][]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const generation = colony[0]?.generation ?? 0;

  useEffect(() => {
    document.body.classList.add('spore-page-active');
    document.title = 'Spore — Shader evolution by Mapshroom';
    return () => document.body.classList.remove('spore-page-active');
  }, []);

  const dominantParent = history.at(-1);
  const subtitle = useMemo(() => {
    if (!dominantParent) return 'Nine live starting points. Pick the one with the right energy.';
    return `Five close mutations and four new crossovers grown from ${getGenomeName(dominantParent)}.`;
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
    await navigator.clipboard.writeText(buildFragmentShader(genome));
    setCopiedId(genome.id);
    window.setTimeout(() => setCopiedId(null), 1600);
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

      <section className="spore-grid" aria-label="Shader choices">
        {colony.map((genome, index) => (
          <article className="spore-card" key={genome.id} style={{ '--spore-index': index } as CSSProperties}>
            <button className="spore-preview" type="button" onClick={() => choose(genome)} aria-label={`Evolve ${getGenomeName(genome)}`}>
              <ShaderCanvas genome={genome} />
              <span className="spore-card-index">{String(index + 1).padStart(2, '0')}</span>
              <span className={`spore-lineage ${genome.lineage}`}>{genome.lineage === 'origin' ? 'seed' : genome.lineage}</span>
              <span className="spore-pick">Choose <ArrowIcon /></span>
            </button>
            <div className="spore-card-info">
              <div>
                <h2>{getGenomeName(genome)}</h2>
                <p>{FIELD_LABELS[genome.field]} · {MIX_LABELS[genome.mix]}</p>
              </div>
              <button type="button" onClick={() => copyShader(genome)} aria-label={`Copy ${getGenomeName(genome)} GLSL`}>
                {copiedId === genome.id ? 'Copied' : 'GLSL'}
              </button>
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
