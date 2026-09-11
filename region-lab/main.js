import { METHODS, renderResult, exportRaster } from './algorithms.js';
import { renderLighting, exportLighting } from './lighting.js';

const $ = id => document.getElementById(id);
const cards = new Map(), results = new Map();
let source = null, worker = null, sourceVersion = 0, runId = 0, busy = false, view = 'gradient', activeId = null, selected = 0, runSettings = null, preparationMs = 0;
const baseUrl = new URL(import.meta.env.BASE_URL, location.href).href;
const imageCanvas = document.createElement('canvas');
const analysisCanvas = document.createElement('canvas');
let analysisPixels = null, previewBox = null;
const formatMs = ms => ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
const status = (message, error = false) => { $('status').textContent = message; $('status').classList.toggle('error', error); };
const surfaceIds = ['shape', 'graph', 'pidi'];
const visibleMethods = () => METHODS.filter(m => $('profile').value === 'surface' ? surfaceIds.includes(m.id) : m.id !== 'shape');
const lightingOptions = () => ({ style: $('gradientStyle').value, palette: $('palette').value, angle: Number($('angle').value), texture: Number($('texture').value), feather: Number($('feather').value), opacity: Number($('opacity').value) / 100, black: runSettings?.black ?? 8 });
const drawPixels = (result, mode = view, selection = 0) => mode === 'gradient' || mode === 'overlay' ? renderLighting(result, analysisPixels, lightingOptions(), mode === 'overlay', selection) : renderResult(result, analysisPixels, mode, 1, selection);

for (const method of METHODS) {
  const card = document.createElement('article'); card.className = 'method-card';
  card.innerHTML = `<div class="card-heading"><div><h2>${method.name}</h2><p>${method.description}</p></div><span class="method-tag ${method.kind === 'CNN' ? 'cnn' : ''}">${method.kind} · ${method.weight}</span></div><div class="card-preview"><canvas hidden aria-label="Risultato ${method.name}"></canvas><div class="preview-message"><span class="preview-symbol">${method.symbol}</span><span class="message-text">${method.kind === 'CNN' ? 'Attiva i modelli CNN per confrontarlo.' : 'In attesa di una foto'}</span></div></div><div class="card-footer"><div class="card-stats">${method.kind === 'CNN' ? 'Pesi caricati solo su richiesta' : 'Nessun peso da scaricare'}</div><button disabled>Ispeziona ↗</button></div>`;
  const entry = { card, canvas: card.querySelector('canvas'), message: card.querySelector('.preview-message'), text: card.querySelector('.message-text'), stats: card.querySelector('.card-stats'), inspect: card.querySelector('button') };
  entry.inspect.addEventListener('click', () => inspect(method.id));
  cards.set(method.id, entry); $('methodGrid').append(card);
}

function setBusy(value) {
  busy = value; $('runButton').disabled = value || !source; $('cancelButton').hidden = !value;
  for (const id of ['resolution', 'detail', 'black', 'includeCnn', 'profile', 'zones', 'smoothing']) $(id).disabled = value;
}
function stop(message) {
  worker?.terminate(); worker = null; runId++; setBusy(false);
  for (const card of cards.values()) if (card.card.classList.contains('running') || card.message.classList.contains('busy')) {
    card.card.classList.remove('running'); card.message.className = 'preview-message'; card.text.textContent = 'Elaborazione interrotta';
  }
  if (message) status(message);
}
function clearResults() {
  results.clear(); activeId = null; selected = 0; $('exportReport').disabled = true;
  for (const method of METHODS) {
    const card = cards.get(method.id); card.canvas.hidden = true; card.message.hidden = false; card.message.className = 'preview-message'; card.inspect.disabled = true;
    card.text.textContent = method.kind === 'CNN' ? 'Attiva i modelli CNN per confrontarlo.' : 'Pronto per l’analisi'; card.stats.textContent = method.kind === 'CNN' ? 'Pesi caricati solo su richiesta' : 'Nessun peso da scaricare';
  }
}

async function loadPhoto(file, name = file.name) {
  const version = ++sourceVersion; stop();
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { status('Scegli una foto PNG, JPG o WebP.', true); return; }
  if (file.size > 32 * 1024 * 1024) { status('Il file supera 32 MB. Usa una foto più piccola.', true); return; }
  status('Apertura della foto…');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    if (version !== sourceVersion) { bitmap.close(); return; }
    if (bitmap.width * bitmap.height > 24e6) throw new Error('La foto supera 24 megapixel. Riducila prima di caricarla.');
    if (bitmap.width < 16 || bitmap.height < 16) throw new Error('La foto deve essere almeno 16 × 16 pixel.');
    const previousUrl = source?.url;
    source = { name: name || 'foto', width: bitmap.width, height: bitmap.height, url: URL.createObjectURL(file) };
    imageCanvas.width = bitmap.width; imageCanvas.height = bitmap.height;
    imageCanvas.getContext('2d').drawImage(bitmap, 0, 0); bitmap.close(); bitmap = null;
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    $('sourceThumb').src = source.url; $('sourceName').textContent = source.name; $('sourceName').title = source.name;
    $('sourceSize').textContent = `${source.width} × ${source.height} px`; $('sourcePreview').hidden = false;
    $('inspectDialog').close(); clearResults(); run();
  } catch (error) { bitmap?.close(); if (version === sourceVersion) { setBusy(false); status(error.message || 'Impossibile aprire la foto.', true); } }
}

function run() {
  if (!source || busy) return;
  clearResults();
  const longest = Number($('resolution').value), scale = Math.min(1, longest / Math.max(source.width, source.height));
  analysisCanvas.width = Math.max(1, Math.round(source.width * scale)); analysisCanvas.height = Math.max(1, Math.round(source.height * scale));
  const context = analysisCanvas.getContext('2d', { willReadFrequently: true }); context.clearRect(0, 0, analysisCanvas.width, analysisCanvas.height); context.drawImage(imageCanvas, 0, 0, analysisCanvas.width, analysisCanvas.height);
  analysisPixels = context.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height).data;
  let x0 = analysisCanvas.width, y0 = analysisCanvas.height, x1 = 0, y1 = 0;
  const threshold = Number($('black').value);
  for (let i = 0; i < analysisPixels.length / 4; i++) if (analysisPixels[i * 4 + 3] > 127 && (threshold === 0 || Math.max(analysisPixels[i * 4], analysisPixels[i * 4 + 1], analysisPixels[i * 4 + 2]) > threshold)) {
    const x = i % analysisCanvas.width, y = Math.floor(i / analysisCanvas.width); x0 = Math.min(x0,x); y0 = Math.min(y0,y); x1 = Math.max(x1,x); y1 = Math.max(y1,y);
  }
  const padding = Math.round(Math.max(analysisCanvas.width, analysisCanvas.height) * .025);
  previewBox = x1 >= x0 && y1 >= y0 ? { x: Math.max(0,x0-padding), y: Math.max(0,y0-padding), right: Math.min(analysisCanvas.width,x1+padding+1), bottom: Math.min(analysisCanvas.height,y1+padding+1) } : { x:0,y:0,right:analysisCanvas.width,bottom:analysisCanvas.height };
  runSettings = { profile: $('profile').value, zones: Number($('zones').value), smoothing: Number($('smoothing').value), detail: Number($('detail').value), black: Number($('black').value), longest, cnn: $('includeCnn').checked, width: analysisCanvas.width, height: analysisCanvas.height, sourceWidth: source.width, sourceHeight: source.height, timestamp: new Date().toISOString() };
  const methods = visibleMethods().filter(m => m.kind !== 'CNN' || runSettings.cnn).map(m => m.id);
  for (const id of methods) { cards.get(id).text.textContent = 'In coda'; cards.get(id).message.classList.add('busy'); }
  $('dirtyNote').hidden = true; $('runMeta').textContent = `${runSettings.width} × ${runSettings.height} px · ${methods.length} metodi`; setBusy(true);
  status('Preparazione dell’immagine…'); const currentId = ++runId;
  worker ||= new Worker(new URL('./analysis.worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    if (data.runId !== runId) return;
    if (data.type === 'prepared') { preparationMs = data.preparationMs; if (!data.active) status('Nessun pixel incluso: riduci “Escludi quasi nero”.'); }
    else if (data.type === 'start') { cards.get(data.id).card.classList.add('running'); cards.get(data.id).text.textContent = 'Elaborazione…'; status(`Analisi: ${METHODS.find(m => m.id === data.id).name}…`); }
    else if (data.type === 'progress') { cards.get(data.id).text.textContent = data.message; status(data.message); }
    else if (data.type === 'result') {
      const result = { ...data.result, metrics: data.metrics }; results.set(data.id, result);
      const card = cards.get(data.id); card.card.classList.remove('running'); card.message.hidden = true; card.message.className = 'preview-message'; card.canvas.hidden = false; card.inspect.disabled = false;
      const time = result.metrics.analysisMs + result.metrics.inferenceMs;
      card.stats.innerHTML = `<strong>${result.count.toLocaleString('it-IT')} regioni</strong> · ${formatMs(time)}<br />${result.metrics.loadMs ? `Caricamento: ${formatMs(result.metrics.loadMs)}` : 'Nessun caricamento modello'}`;
      renderCard(data.id); $('exportReport').disabled = false;
    } else if (data.type === 'method-error') {
      const card = cards.get(data.id); card.card.classList.remove('running'); card.message.className = 'preview-message error'; card.text.textContent = data.message; card.stats.textContent = 'Metodo non completato';
    } else if (data.type === 'done') {
      setBusy(false);
      status(`${results.size}/${methods.length} metodi completati. Preparazione comune: ${formatMs(preparationMs)}.${!results.size ? ' Controlla gli errori nelle schede.' : ' Apri Ispeziona per confrontare i dettagli.'}`, results.size !== methods.length);
    } else if (data.type === 'error') { stop(); status(data.message, true); }
  };
  worker.onerror = event => { if (currentId === runId) { stop(); status(event.message || 'Errore del motore di analisi.', true); } };
  const pixels = analysisPixels.slice(); worker.postMessage({ runId: currentId, rgba: pixels.buffer, width: analysisCanvas.width, height: analysisCanvas.height, methods, settings: runSettings, baseUrl }, [pixels.buffer]);
}

function renderCard(id) {
  const result = results.get(id), canvas = cards.get(id).canvas;
  canvas.width = previewBox.right - previewBox.x; canvas.height = previewBox.bottom - previewBox.y;
  canvas.getContext('2d').putImageData(new ImageData(drawPixels(result), result.width, result.height), -previewBox.x, -previewBox.y);
}
function redraw() { for (const id of results.keys()) renderCard(id); if ($('inspectDialog').open) renderInspect(); }

function inspect(id) {
  activeId = id; selected = 0; $('zoom').value = '1'; $('compare').value = '50'; $('downloadMask').disabled = true;
  $('regionInfo').textContent = 'Clicca sul risultato per ispezionare una regione.';
  $('inspectTitle').textContent = cards.get(id).card.querySelector('h2').textContent;
  $('inspectSize').textContent = `Analisi ${results.get(id).width} × ${results.get(id).height} · export ${source.width} × ${source.height}. Le maschere vengono ingrandite senza inventare dettaglio.`;
  $('inspectDialog').showModal(); renderInspect();
}
function renderInspect() {
  const result = results.get(activeId); if (!result) return;
  const sourceCanvas = $('inspectOriginal'), canvas = $('inspectResult');
  sourceCanvas.width = source.width; sourceCanvas.height = source.height; sourceCanvas.getContext('2d').drawImage(imageCanvas, 0, 0);
  const temp = document.createElement('canvas'); temp.width = result.width; temp.height = result.height;
  const pixels = drawPixels(result, view === 'overlay' ? 'gradient' : view, selected);
  if (view === 'overlay') for (let i = 0; i < result.labels.length; i++) if (!result.labels[i]) pixels[i * 4 + 3] = 0;
  temp.getContext('2d').putImageData(new ImageData(pixels, result.width, result.height), 0, 0);
  canvas.width = source.width; canvas.height = source.height;
  const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = view === 'gradient' || view === 'overlay';
  if (view === 'overlay') {
    ctx.drawImage(imageCanvas, 0, 0); ctx.globalAlpha = Number($('opacity').value) / 100;
  }
  ctx.drawImage(temp, 0, 0, source.width, source.height); ctx.globalAlpha = 1;
  const viewport = $('inspectViewport'), scale = Math.min(viewport.clientWidth / source.width, viewport.clientHeight / source.height) * Number($('zoom').value);
  const width = Math.max(1, Math.floor(source.width * scale)), height = Math.max(1, Math.floor(source.height * scale));
  $('inspectImages').style.width = `${width}px`; $('inspectImages').style.height = `${height}px`; sourceCanvas.style.width = `${width}px`;
  updateCompare();
}
function updateCompare() { $('inspectOriginalClip').style.width = `${$('compare').value}%`; $('splitLine').style.left = `${$('compare').value}%`; }

function downloadBlob(blob, filename) {
  const output = $($('inspectDialog').open ? 'imageDownload' : 'reportDownload');
  if (output.dataset.url) URL.revokeObjectURL(output.dataset.url);
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = filename;
  a.textContent = `Scarica ${filename} · ${(blob.size / 1024).toFixed(0)} KB`;
  output.replaceChildren(document.createTextNode('File pronto. '), a); output.hidden = false; output.dataset.url = url;
  // Keep a real, persistent download link for browsers that do not honor a programmatic click.
  a.click();
}
async function downloadRaster(type) {
  const result = results.get(activeId); if (!result || (type === 'mask' && !selected)) return;
  const methodId = activeId, regionId = selected;
  $('imageDownload').hidden = false; $('imageDownload').textContent = 'Preparazione PNG…';
  try {
    const canvas = document.createElement('canvas'); canvas.width = source.width; canvas.height = source.height;
    const pixels = type === 'gradient' || type === 'field' ? exportLighting(result, analysisPixels, source.width, source.height, imageCanvas.getContext('2d').getImageData(0, 0, source.width, source.height).data, lightingOptions(), type === 'field') : exportRaster(result, source.width, source.height, type, selected);
    canvas.getContext('2d').putImageData(new ImageData(pixels, source.width, source.height), 0, 0);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png')); if (!blob) throw new Error('Esportazione PNG non riuscita.');
    downloadBlob(blob, `mapshroom-${methodId}-${type}${type === 'mask' ? `-${regionId}` : ''}.png`);
  } catch (error) { $('imageDownload').textContent = error.message; status(error.message, true); }
}

$('photoInput').addEventListener('change', event => { const file = event.target.files[0]; if (file) loadPhoto(file); event.target.value = ''; });
$('dropzone').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); $('photoInput').click(); } });
for (const [id, file, name] of [['sampleButton', 'plant.png', 'Pianta · foto originale'], ['stageButton', 'stage.png', 'Default Stage · foto originale']]) $(id).addEventListener('click', async () => {
  $('sampleButton').disabled = $('stageButton').disabled = true;
  try { const response = await fetch(new URL(file, baseUrl)); if (!response.ok) throw new Error('Foto di esempio non disponibile.'); await loadPhoto(await response.blob(), name); }
  catch (error) { status(error.message, true); } finally { $('sampleButton').disabled = $('stageButton').disabled = false; }
});
window.addEventListener('dragover', event => { if (event.dataTransfer?.types.includes('Files')) { event.preventDefault(); $('dropzone').classList.add('drag-over'); } });
window.addEventListener('dragleave', event => { if (!event.relatedTarget) $('dropzone').classList.remove('drag-over'); });
window.addEventListener('drop', event => { event.preventDefault(); $('dropzone').classList.remove('drag-over'); const file = event.dataTransfer?.files[0]; if (file) loadPhoto(file); });
$('runButton').addEventListener('click', run); $('cancelButton').addEventListener('click', () => stop('Analisi interrotta. Puoi conservare i risultati già completati.'));
for (const id of ['resolution', 'detail', 'black', 'includeCnn', 'zones', 'smoothing']) $(id).addEventListener('input', () => {
  $('detailValue').value = $('detail').value; $('zonesValue').value = $('zones').value; $('smoothingValue').value = $('smoothing').value; $('blackValue').value = `${$('black').value} / 255`; if (results.size) $('dirtyNote').hidden = false;
});
for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click', () => {
  view = button.dataset.view; for (const b of document.querySelectorAll('[data-view]')) { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); } $('lightingControls').hidden = view !== 'gradient' && view !== 'overlay'; redraw();
});
for (const id of ['gradientStyle', 'palette', 'angle', 'texture', 'feather']) $(id).addEventListener('input', () => {
  $('angleValue').value = `${$('angle').value}°`; $('textureValue').value = `${$('texture').value}%`; $('featherValue').value = `${$('feather').value} px`; $('angle').disabled = $('gradientStyle').value === 'radial'; redraw();
});
function setProfile() {
  const surface = $('profile').value === 'surface';
  $('surfaceControls').hidden = !surface; $('detailControl').hidden = surface;
  $('cnnLabel').textContent = surface ? 'Includi PiDiNet' : 'Includi 2 modelli CNN';
  $('cnnSize').textContent = `Pesi ${surface ? '3' : '3,4'} MB + motore condiviso 11,2 MB, in cache.`;
  for (const method of METHODS) {
    const card = cards.get(method.id); card.card.hidden = !visibleMethods().some(m => m.id === method.id);
    card.card.querySelector('h2').textContent = surface && method.id === 'graph' ? 'Colore · Superfici' : surface && method.id === 'pidi' ? 'PiDiNet · Superfici' : method.name;
    card.card.querySelector('.card-heading p').textContent = surface && method.id === 'graph' ? 'Riduce la texture e unisce le aree confinanti.' : surface && method.id === 'pidi' ? 'Usa i bordi della CNN per separare zone più ampie.' : method.description;
  }
}
$('profile').addEventListener('change', () => { setProfile(); run(); });
setProfile(); $('angle').disabled = true;
$('opacity').addEventListener('input', redraw); $('closeDialog').addEventListener('click', () => $('inspectDialog').close());
$('compare').addEventListener('input', updateCompare); $('zoom').addEventListener('change', renderInspect);
window.addEventListener('resize', () => { if ($('inspectDialog').open) renderInspect(); });
$('inspectResult').addEventListener('click', event => {
  const result = results.get(activeId), bounds = event.currentTarget.getBoundingClientRect();
  const x = Math.min(result.width - 1, Math.max(0, Math.floor((event.clientX - bounds.left) / bounds.width * result.width))), y = Math.min(result.height - 1, Math.max(0, Math.floor((event.clientY - bounds.top) / bounds.height * result.height)));
  const id = result.labels[y * result.width + x]; selected = selected === id ? 0 : id;
  let size = 0; if (selected) for (const label of result.labels) if (label === selected) size++;
  $('regionInfo').textContent = selected ? `Regione ${selected} · ${size.toLocaleString('it-IT')} pixel di analisi · clicca ancora per deselezionare` : 'Nessuna regione selezionata.';
  $('downloadMask').disabled = !selected; renderInspect();
});
$('downloadGradient').addEventListener('click', () => downloadRaster('gradient')); $('downloadField').addEventListener('click', () => downloadRaster('field')); $('downloadPalette').addEventListener('click', () => downloadRaster('palette')); $('downloadRegions').addEventListener('click', () => downloadRaster('ids')); $('downloadEdges').addEventListener('click', () => downloadRaster('edges')); $('downloadMask').addEventListener('click', () => downloadRaster('mask'));
$('exportReport').addEventListener('click', () => {
  const report = { source: source.name, settings: runSettings, lighting: lightingOptions(), preparationMs, runtime: 'Browser · CPU / WASM', regionIdEncoding: 'ID = R + 256*G + 65536*B. 0 = excluded background. IDs use nearest-neighbor; gradient fields interpolate only within the same ID and clip to the native foreground.', accuracy: 'Not measured: no ground truth masks. A gradient is a synthetic lighting field, not estimated depth.', results: [...results].map(([id, result]) => ({ id, regions: result.count, ...result.metrics })) };
  downloadBlob(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }), 'mapshroom-region-report.json');
});
