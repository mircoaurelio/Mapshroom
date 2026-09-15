import { useId, useState } from 'react';
import { buildShaderOptimizationPrompt, inspectShaderCost, shaderLoadTitle, type ShaderLoadReport, type ShaderLoadSource } from '../lib/shaderLoadDiagnostics';
import './ShaderPerformanceSuggestion.css';

export function ShaderPerformanceSuggestion({ report, sources, disabled, onUsePrompt }: {
  report: ShaderLoadReport;
  sources: ShaderLoadSource[];
  disabled: boolean;
  onUsePrompt: (source: ShaderLoadSource, prompt: string) => void;
}) {
  // Prefer a source with actionable code clues; this is not a measured ranking.
  const [selectedId, setSelectedId] = useState(() => [...sources]
    .sort((a, b) => inspectShaderCost(b.code).length - inspectShaderCost(a.code).length)[0]?.id);
  const id = useId();
  const source = sources.find(item => item.id === selectedId) ?? sources[0];
  if (!source) return null;
  const prompt = buildShaderOptimizationPrompt(report, source);
  return <aside className="shader-performance-suggestion" aria-labelledby={id}>
    <strong id={id}><span aria-hidden="true">⚠</span> {shaderLoadTitle(report)}</strong>
    <p>{report.warning === 'gpu'
      ? 'Let’s make the shader lighter while preserving its appearance.'
      : 'The preview is slowing down. We can check the code, but the cause may be elsewhere.'}</p>
    {sources.length > 1 ? <label>Shader to optimize
      <select value={source.id} disabled={disabled} onChange={event => setSelectedId(event.target.value)}>
        {sources.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label> : <span className="shader-performance-target">{source.name}</span>}
    <div className="shader-performance-actions">
      <details><summary>Read prompt</summary><p>{prompt}</p></details>
      <button type="button" disabled={disabled} onClick={() => onUsePrompt(source, prompt)}>Use prompt</button>
    </div>
    <small>Adds to your draft. You can edit it before sending.</small>
  </aside>;
}
