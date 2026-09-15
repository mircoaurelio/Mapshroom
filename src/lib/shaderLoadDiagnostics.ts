import type { ShaderLoadMeasurement, ShaderLoadWarning } from './shaderLoadMonitor.ts';

/** Original sources travel with the rendered layers, including cached transitions. */
export interface ShaderLoadSource { id: string; name: string; code: string }
export interface ShaderLoadReport extends ShaderLoadMeasurement {
  key: string;
  warning: NonNullable<ShaderLoadWarning>;
  width: number;
  height: number;
  sources: ShaderLoadSource[];
  layerCount: number;
}

/** Code clues, not a profiler: comments are excluded and no runtime cost is inferred. */
export function inspectShaderCost(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const loops = [...code.matchAll(/\b(?:for|while)\s*\(/g)].length;
  const textureReads = [...code.matchAll(/\b(?:texture|texture2D|textureLod|textureGrad|texelFetch)\s*\(/g)].length;
  const expensiveMath = [...code.matchAll(/\b(?:sin|cos|tan|pow|exp|log)\s*\(/g)].length;
  const clues: string[] = [];
  if (loops) clues.push(`${loops === 1 ? 'Un ciclo ripete' : `${loops} cicli ripetono`} calcoli nel codice del pixel; iterazioni e lavoro ripetuto possono pesare sulla GPU.`);
  if (textureReads >= 4) clues.push(`Il codice contiene ${textureReads} punti di lettura dell’immagine: campionamenti ripetuti possono aumentare il costo.`);
  if (/\b\w*(?:noise|fbm)\w*\s*\(/i.test(code)) clues.push('Il codice usa funzioni di rumore: più livelli o valutazioni ripetute possono essere costosi.');
  if (expensiveMath >= 8) clues.push('Sono presenti molte funzioni matematiche come sin, cos o pow: alcune espressioni potrebbero essere riutilizzate.');
  return clues.slice(0, 3);
}

export function uniqueShaderLoadSources(sources: readonly ShaderLoadSource[]): ShaderLoadSource[] {
  return [...new Map(sources.map(source => [JSON.stringify([source.id, source.code]), source])).values()];
}

/** An old measurement must never prepare an edit for a newer shader revision. */
export function currentShaderLoadSources(report: ShaderLoadReport | null, activeId: string, activeCode: string,
  saved: readonly { id: string; code: string }[]): ShaderLoadSource[] {
  return report?.sources.filter(source => source.code === (source.id === activeId
    ? activeCode : saved.find(shader => shader.id === source.id)?.code)) ?? [];
}

export function shaderLoadTitle(report: ShaderLoadReport): string {
  return report.warning === 'frame' ? 'Anteprima poco fluida'
    : report.sources.length > 1 || report.layerCount > 1 ? 'Mix impegnativo' : 'Shader impegnativo';
}

export function shaderLoadSummary(report: ShaderLoadReport): string {
  const fps = Math.max(1, Math.round(1000 / report.frameMs));
  const size = `${report.width} × ${report.height}`;
  return report.warning === 'gpu' && report.gpuMs !== null
    ? `La GPU impiega circa ${report.gpuMs.toFixed(1)} ms per l’anteprima a ${size}, oltre i 16,7 ms disponibili per 60 fps. Fluidità osservata: circa ${fps} fps.`
    : `L’anteprima a ${size} procede a circa ${fps} fps. Non c’è conferma che il rallentamento dipenda dallo shader: anche video, altre app o il dispositivo possono contribuire.`;
}

export function shaderLoadReasons(report: ShaderLoadReport): string[] {
  if (report.warning === 'frame') return [];
  return report.sources.flatMap(source => inspectShaderCost(source.code).map(clue =>
    report.sources.length > 1 ? `${source.name}: ${clue}` : clue)).slice(0, 3);
}

export function buildShaderOptimizationPrompt(report: ShaderLoadReport, target: ShaderLoadSource): string {
  const clues = inspectShaderCost(target.code);
  const mixed = report.sources.length > 1 || report.layerCount > 1;
  return [
    `Rendi più efficiente lo shader «${target.name}» mantenendone il più possibile l’aspetto e le caratteristiche.`,
    `Misure locali della preview: ${shaderLoadSummary(report)}`,
    mixed ? 'La misura riguarda l’intero mix, non il singolo shader: non attribuire tutto il costo a questo componente.' : '',
    clues.length ? `Possibili punti da verificare nel codice, non cause dimostrate: ${clues.join(' ')}` : 'Individua nel codice i calcoli ridondanti e le letture di texture che si possono riutilizzare.',
    'Dai priorità a riutilizzo di risultati e campionamenti, spostamento dei calcoli invarianti fuori dai cicli e semplificazioni matematiche equivalenti. Usa uscite anticipate solo se non cambiano il risultato visivo.',
    'Preserva composizione, colori, dettaglio, profondità, trasparenza, maschere, movimento e velocità dell’animazione. Mantieni nomi, intervalli e comportamento dei controlli esistenti e la compatibilità con audio, mix e timeline.',
    'Mantieni la risoluzione e il frame rate. Non convertire lo shader in un video o in un loop precalcolato. Prima di ridurre iterazioni, livelli o dettagli visibili, spiega il compromesso e proponilo come opzione separata.',
    'Restituisci lo shader completo compatibile con il progetto e riassumi le ottimizzazioni. Non promettere un guadagno di prestazioni senza una nuova misura sul dispositivo.',
  ].filter(Boolean).join('\n\n');
}
