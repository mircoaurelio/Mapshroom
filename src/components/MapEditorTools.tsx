import { memo, type CSSProperties } from 'react';

export function MapEditorIcon({ name }: { name: 'mask' | 'draw' | 'depth' | 'wand' | 'close' | 'undo' | 'redo' | 'check' }) {
  const paths = {
    mask: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 8h8v8H8z',
    draw: 'm4 16-1 5 5-1L20 8l-4-4L4 16Zm10-10 4 4',
    depth: 'm3 7 9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4',
    wand: 'm4 20 13-13 3 3L7 23M16 2v3m5-2-2 2M9 4v3m-4 5H2',
    close: 'm6 6 12 12M6 18 18 6',
    undo: 'm8 4-5 5 5 5M3 9h10a6 6 0 0 1 0 12',
    redo: 'm16 4 5 5-5 5m5-5H11a6 6 0 0 0 0 12',
    check: 'm5 12 4 4L19 6',
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

function Slider({ id, output, label, min = 0, max, value, unit = '%' }: { id: string; output: string; label: string; min?: number; max: number; value: number; unit?: string }) {
  // The image controller owns these uncontrolled inputs, including history restoration.
  return <div className="map-editor-field"><label className="field-inline-label" htmlFor={id}>{label}<output id={output}>{value}{unit}</output></label>
    <input id={id} type="range" min={min} max={max} defaultValue={value} style={{ '--range-fill-position': `${(value - min) / (max - min) * 100}%` } as CSSProperties} />
  </div>;
}

export const MapEditorTools = memo(function MapEditorTools() {
  return <>
    <div className="map-editor-preview">
      <div className="map-editor-preview-toolbar"><div role="group" aria-label="Image preview" className="map-editor-segmented">
        <button className="toggle-chip" type="button" data-preview-mode="100" aria-pressed="false">Original</button>
        <button className="toggle-chip" type="button" data-preview-mode="50" aria-pressed="false">Compare</button>
        <button className="toggle-chip" type="button" data-preview-mode="0" aria-pressed="true">Result</button>
      </div><span id="fileName" className="map-editor-filename" /></div>
      <div className="map-editor-stage" aria-label="Image editing preview">
        <div id="emptyState" className="map-editor-placeholder">Loading image…</div>
        <div id="canvasArea" className="canvas-area hidden">
          <div id="checkerboard" className="checkerboard" />
          <canvas id="resultCanvas" aria-label="Image editing canvas" />
          <div id="originalLayer" className="original-layer"><img id="originalImage" alt="Original image" /></div>
          <div id="compareHandle" className="compare-handle" aria-hidden="true"><span>↔</span></div>
          <div id="brushCursor" className="brush-cursor" aria-hidden="true" />
          <div id="cropOverlay" className="crop-overlay"><div id="cropBox" className="crop-box">
            <span className="crop-grid crop-grid-v one" /><span className="crop-grid crop-grid-v two" /><span className="crop-grid crop-grid-h one" /><span className="crop-grid crop-grid-h two" />
            {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const).map((corner, index) => <button key={corner} type="button" className={`crop-handle ${corner}`} data-crop-handle={corner} aria-label={`Resize crop from ${['top left', 'top', 'top right', 'right', 'bottom right', 'bottom', 'bottom left', 'left'][index]}`} />)}
          </div></div>
          <canvas id="wandCanvas" className="wand-canvas" aria-label="AI selection canvas" />
          <input id="compareRange" className="compare-range" type="range" min="0" max="100" defaultValue="0" aria-label="Compare original and result" />
        </div>
        <div id="dropOverlay" className="map-editor-drop-overlay">Drop image here</div>
        <div id="busyOverlay" className="map-editor-busy hidden" role="status"><div className="map-editor-spinner" /><strong id="busyTitle">Processing image…</strong><div className="map-editor-progress"><div id="progressBar" /></div><span id="busyDetail" /></div>
      </div>
      <div className="map-editor-preview-footer"><div className="map-editor-history" role="group" aria-label="Edit history">
        <button className="ghost-button" type="button" id="undoButton" disabled aria-label="Undo edit"><MapEditorIcon name="undo" /><span>Undo</span><kbd>Ctrl Z</kbd></button>
        <button className="ghost-button" type="button" id="redoButton" disabled aria-label="Redo edit"><MapEditorIcon name="redo" /><span>Redo</span><kbd>Ctrl Shift Z</kbd></button>
      </div><span id="fileMeta" /></div>
    </div>
    <aside className="map-editor-inspector" aria-label="Image adjustment controls">
      <div className="map-editor-tool-tabs" role="tablist" aria-label="Image tools">
        {([{ panel: 'refine', label: 'Mask', icon: 'mask' }, { panel: 'draw', label: 'Draw', icon: 'draw' }, { panel: 'depth', label: 'Depth', icon: 'depth' }, { panel: 'wand', label: 'AI Wand', icon: 'wand' }] as const).map(tool => <button className="toggle-chip" key={tool.panel} type="button" role="tab" id={`map-tab-${tool.panel}`} data-editor-panel={tool.panel} aria-controls={`${tool.panel}Panel`} aria-selected={false}><MapEditorIcon name={tool.icon} /><span>{tool.label}</span></button>)}
      </div>
      <div className="map-editor-controls">
        <section id="depthPanel" className="map-editor-tool disabled-panel" role="tabpanel" aria-labelledby="map-tab-depth">
          <h3 className="panel-title">Depth map</h3>
          <button id="generateDepth" className="secondary-button map-editor-generate" type="button" disabled><strong>Generate depth map</strong></button>
          <div className="map-editor-segmented" role="group" aria-label="Depth map color mode"><button id="depthModeBw" className="toggle-chip active" type="button">Black &amp; white</button><button className="toggle-chip" id="depthModeRgb" type="button">Color depth</button></div>
          <Slider id="depthStrengthRange" output="depthStrengthValue" label="Depth amount" max={300} value={100} />
          <Slider id="depthDefinitionRange" output="depthDefinitionValue" label="Definition" max={100} value={70} />
          <Slider id="depthContrastRange" output="depthContrastValue" label="Contrast" min={50} max={200} value={120} />
          <Slider id="depthGammaRange" output="depthGammaValue" label="Gamma" min={40} max={180} value={100} />
          <label className="map-editor-toggle" htmlFor="depthInvert"><span>Invert depth<small>Swap near and far values</small></span><input id="depthInvert" type="checkbox" /></label>
          <p id="depthStatus" className="map-editor-note">Load an image or a saved depth map to begin.</p>
        </section>
        <section id="refinePanel" className="map-editor-tool disabled-panel" role="tabpanel" aria-labelledby="map-tab-refine">
          <h3 className="panel-title">Mask</h3><p className="map-editor-note">Remove background areas or restore image details.</p>
          <button id="brushToggle" className="secondary-button map-editor-generate" type="button">Enable brush</button>
          <div className="map-editor-segmented" role="group" aria-label="Brush action"><button id="eraseBrush" className="toggle-chip active" type="button">Erase</button><button className="toggle-chip" id="restoreBrush" type="button">Restore</button></div>
          <Slider id="brushSizeRange" output="brushSizeValue" label="Brush size" min={8} max={400} value={80} unit=" px" />
          <button className="ghost-button" id="resetBrush" type="button">Reset brush edits</button>
          <div className="map-editor-divider" /><button id="magicErase" className="secondary-button map-editor-generate" type="button"><strong>Smart erase</strong></button>
          <Slider id="magicToleranceRange" output="magicToleranceValue" label="Tolerance" min={2} max={80} value={24} unit="" />
          <Slider id="magicSoftnessRange" output="magicSoftnessValue" label="Selection softness" max={30} value={8} unit="" />
          <div className="map-editor-divider" /><h4 className="panel-title">Edges</h4><div className="map-editor-toggle"><span>Hard mask</span><button className="toggle-chip" id="hardMaskToggle" type="button" aria-pressed="false">Off</button></div>
          <Slider id="thresholdRange" output="thresholdValue" label="Threshold" max={80} value={8} />
          <Slider id="featherRange" output="featherValue" label="Feather" max={20} value={4} unit=" px" />
          <Slider id="spillRange" output="spillValue" label="Color cleanup" max={100} value={20} />
        </section>
        <section id="drawPanel" className="map-editor-tool disabled-panel" role="tabpanel" aria-labelledby="map-tab-draw">
          <h3 className="panel-title">Draw</h3><p className="map-editor-note">Paint directly onto the image.</p><button id="drawToggle" className="secondary-button map-editor-generate" type="button"><strong>Paint surface</strong></button>
          <label className="map-editor-toggle" htmlFor="drawColor">Paint color<input id="drawColor" type="color" defaultValue="#ffffff" aria-label="Drawing color" /></label>
          <Slider id="drawSizeRange" output="drawSizeValue" label="Brush size" min={8} max={400} value={80} unit=" px" /><button className="ghost-button" id="resetDraw" type="button">Reset drawing</button>
          <section id="cropPanel" className="map-editor-crop disabled-panel"><div className="map-editor-divider" /><h4 className="panel-title">Crop</h4><button className="ghost-button" id="cropToggle" type="button">Enable crop</button><label className="map-editor-select">Aspect ratio<select id="cropAspect"><option value="free">Free</option><option value="1">1 : 1</option><option value="1.333333">4 : 3</option><option value="1.777778">16 : 9</option><option value="0.8">4 : 5</option></select></label>
            <div className="map-editor-toggle"><span>Output size</span><output id="cropSizeValue">—</output></div><div className="map-editor-actions"><button className="ghost-button" id="cropReset" type="button">Reset frame</button><button className="ghost-button" id="cropCancel" type="button" disabled>Cancel</button><button id="cropApply" className="primary-button map-editor-primary" type="button" disabled>Apply crop</button></div>
          </section>
        </section>
        <section id="wandPanel" className="map-editor-tool disabled-panel" role="tabpanel" aria-labelledby="map-tab-wand">
          <h3 className="panel-title">AI Wand</h3><p className="map-editor-note">Select an area, then remove it or restore it.</p>
          <button id="wandToggle" className="secondary-button map-editor-generate" type="button"><strong>Draw AI selection</strong></button>
          <div className="map-editor-segmented" role="group" aria-label="AI selection mode"><button id="wandModeMinus" className="toggle-chip active" type="button">Remove</button><button className="toggle-chip" id="wandModePlus" type="button">Restore</button></div>
          <Slider id="wandSizeRange" output="wandSizeValue" label="Selection brush" min={12} max={320} value={64} unit=" px" />
          <div className="map-editor-actions"><button className="ghost-button" id="wandCancel" type="button" disabled>Cancel</button><button id="wandConfirm" className="primary-button map-editor-primary" type="button" disabled>Apply selection</button></div>
          <details className="map-editor-model"><summary>Background removal</summary><label className="map-editor-select" htmlFor="modelSelect">Model<select id="modelSelect" defaultValue="onnx-community/ormbg-ONNX"><option value="onnx-community/ormbg-ONNX">Objects</option><option value="Xenova/modnet">Portraits</option><option value="manual">Manual</option></select></label><span id="modelBadge" className="map-editor-model-badge" /><p id="modelDescription" className="map-editor-note" /><label className="map-editor-toggle" htmlFor="autoSegment"><span>Run on image change</span><input id="autoSegment" type="checkbox" defaultChecked={false} /></label><button id="segmentButton" className="secondary-button map-editor-generate" type="button" disabled>Remove background</button></details>
        </section>
      </div>
      <div className="map-editor-background" role="group" aria-label="Preview background"><span>Background</span><button type="button" className="swatch active" data-background="checker" aria-label="Transparency grid" /><button type="button" className="swatch white" data-background="white" aria-label="White background" /><button type="button" className="swatch black" data-background="black" aria-label="Black background" /></div>
    </aside>
    <div id="toast" className="map-editor-toast" role="status" />
  </>;
});
