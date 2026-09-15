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
  if (loops) clues.push(`${loops === 1 ? 'One loop repeats' : `${loops} loops repeat`} calculations in the pixel code; iterations and repeated work may increase GPU load.`);
  if (textureReads >= 4) clues.push(`The code contains ${textureReads} image sampling calls: repeated texture reads may increase the cost.`);
  if (/\b\w*(?:noise|fbm)\w*\s*\(/i.test(code)) clues.push('The code uses noise functions: multiple layers or repeated evaluations may be expensive.');
  if (expensiveMath >= 8) clues.push('The code uses many math functions such as sin, cos or pow: some results could be reused.');
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
  return report.warning === 'frame' ? 'Slow preview'
    : report.sources.length > 1 || report.layerCount > 1 ? 'High mix load' : 'High shader load';
}

export function shaderLoadSummary(report: ShaderLoadReport): string {
  const fps = Math.max(1, Math.round(1000 / report.frameMs));
  const size = `${report.width} × ${report.height}`;
  return report.warning === 'gpu' && report.gpuMs !== null
    ? `The GPU takes about ${report.gpuMs.toFixed(1)} ms to render the preview at ${size}, above the 16.7 ms budget for 60 fps. Observed frame rate: about ${fps} fps.`
    : `The preview at ${size} is running at about ${fps} fps. The shader has not been confirmed as the cause: videos, other apps or the device may also contribute.`;
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
    `Make the shader “${target.name}” more efficient while preserving its appearance and features as closely as possible.`,
    `Local preview measurements: ${shaderLoadSummary(report)}`,
    mixed ? 'The measurement covers the entire mix, not the individual shader: do not attribute the full cost to this component.' : '',
    clues.length ? `Possible code issues to investigate, not proven causes: ${clues.join(' ')}` : 'Identify redundant calculations and texture reads that can be reused.',
    'Prioritize reusing results and samples, moving loop-invariant calculations outside loops, and equivalent mathematical simplifications. Use early exits only when they preserve the visual result.',
    'Preserve composition, colors, detail, depth, transparency, masks, motion and animation speed. Keep the names, ranges and behavior of existing controls, and maintain compatibility with audio, mixes and the timeline.',
    'Keep the resolution and frame rate unchanged. Do not convert the shader into a video or a precomputed loop. Before reducing iterations, layers or visible detail, explain the tradeoff and propose it as a separate option.',
    'Return the complete shader compatible with the project and summarize the optimizations in English. Do not promise a performance improvement without measuring it again on the device.',
  ].filter(Boolean).join('\n\n');
}
