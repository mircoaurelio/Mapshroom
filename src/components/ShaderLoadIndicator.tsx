import { useId, useState } from 'react';
import { shaderLoadReasons, shaderLoadSummary, shaderLoadTitle, type ShaderLoadReport } from '../lib/shaderLoadDiagnostics';
import './ShaderLoadIndicator.css';

export function ShaderLoadIndicator({ report }: { report: ShaderLoadReport }) {
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  const title = shaderLoadTitle(report);
  const reasons = shaderLoadReasons(report);
  return (
    <div className="shader-load-indicator" data-shader-load={report.warning} data-open={open}
      onPointerEnter={() => setOpen(true)} onPointerLeave={() => setOpen(false)}
      onPointerDown={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}>
      <button type="button" aria-label={title} aria-describedby={descriptionId}
        aria-expanded={open} aria-controls={descriptionId}
        onClick={event => { event.stopPropagation(); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}>
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M8.7 3.3a1.5 1.5 0 0 1 2.6 0l7 12.2a1.5 1.5 0 0 1-1.3 2.2H3a1.5 1.5 0 0 1-1.3-2.2L8.7 3.3Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 7v4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="10" cy="14.3" r="1" fill="currentColor" />
        </svg>
      </button>
      <div className="shader-load-tooltip" role="tooltip" id={descriptionId} hidden={!open}>
        <strong>{title}</strong>
        <span>{report.sources.map(source => source.name).join(' + ')}</span>
        <span>{shaderLoadSummary(report)}</span>
        {report.sources.length > 1 || report.layerCount > 1 ? <span>This measures the complete mix; it does not identify the most expensive component on its own.</span> : null}
        {reasons.length ? <><span>Possible costs in the code to investigate:</span><ul>{reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></> : null}
        <span>The chat has a suggested prompt to optimize the shader while preserving the effect.</span>
      </div>
    </div>
  );
}
