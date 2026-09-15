import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssetRecord } from '../types';
import { getAssetBlob } from './storage';
import { getBundledAssetUrl } from './bundledAssets';
import { type AssetVariantKind, type SaveAssetVariant } from './assetVariants';
import { latestVariant, planVariantGeneration, readVariantPreferences } from './assetVariantGeneration';
import { normalizeGradientSettings, processingProfile, type GradientSettings, type SuggestedSurfaces } from './assetVariantRules.js';

export interface VariantJob { state: 'queued' | 'processing' | 'ready' | 'error' | 'cancelled'; message: string; loaded?: number; total?: number }
interface BackgroundDependency { state: 'pending' | 'ready' | 'error'; asset?: AssetRecord }
interface PendingBatch {
  source: AssetRecord; outputs: AssetVariantKind[]; ai: boolean; gradientSettings: GradientSettings;
  backgroundInput?: BackgroundDependency;
  backgroundResult?: BackgroundDependency;
}
const storageKey = 'mapshroom.asset-versions.v1';
const interruptedKey = 'mapshroom.asset-versions.running';
function readPreferences() {
  try {
    return readVariantPreferences(localStorage.getItem(storageKey));
  } catch { /* Private browsing may not provide storage. */ }
  return readVariantPreferences(null);
}
export const variantJobKey = (id: string, kind: string) => `${id}:${kind}`;

export function useAssetVariants(assets: AssetRecord[], onSave: SaveAssetVariant, suspended: boolean) {
  const [profile] = useState(() => processingProfile({
    mobile: /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    memory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    supported: typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof WebAssembly !== 'undefined',
  }));
  const [preferences, setPreferences] = useState(readPreferences);
  const [ai, setAI] = useState(profile.ai);
  const [jobs, setJobs] = useState<Record<string, VariantJob>>({});
  const [suggestions, setSuggestions] = useState<Record<string, SuggestedSurfaces>>({});
  const [busy, setBusy] = useState(false);
  const [interrupted, setInterrupted] = useState(() => {
    try { return localStorage.getItem(interruptedKey) !== null; } catch { return false; }
  });
  const assetsRef = useRef(assets), saveRef = useRef(onSave), suspendedRef = useRef(suspended);
  assetsRef.current = assets; saveRef.current = onSave; suspendedRef.current = suspended;
  const workerRef = useRef<Worker | null>(null);
  const pending = useRef<PendingBatch[]>([]);
  const running = useRef<PendingBatch | null>(null);
  const backgroundRuns = useRef(new Map<string, BackgroundDependency>());
  const occupied = useRef(new Set<string>());
  const seen = useRef(new Set(assets.map(asset => asset.id)));
  const alive = useRef(true), generation = useRef(0);
  const pumpRef = useRef<() => void>(() => {});
  const publish = useCallback((id: string, kind: AssetVariantKind, value: VariantJob) => {
    if (alive.current) setJobs(previous => ({ ...previous, [variantJobKey(id, kind)]: value }));
  }, []);
  const clearMarker = () => { try { localStorage.removeItem(interruptedKey); } catch { /* optional */ } };
  const finish = () => {
    workerRef.current?.terminate(); workerRef.current = null;
    if (running.current) for (const kind of running.current.outputs) occupied.current.delete(variantJobKey(running.current.source.id, kind));
    running.current = null; clearMarker();
    if (alive.current) { setBusy(pending.current.length > 0); pumpRef.current(); }
  };
  pumpRef.current = () => {
    if (running.current || suspendedRef.current || !alive.current) return;
    const next = pending.current.shift();
    if (!next) { setBusy(false); return; }
    if (!assetsRef.current.some(asset => asset.id === next.source.id)) {
      for (const kind of next.outputs) occupied.current.delete(variantJobKey(next.source.id, kind));
      pumpRef.current(); return;
    }
    running.current = next; setBusy(true);
    const token = ++generation.current;
    const fail = (message: string) => {
      if (next.backgroundResult?.state === 'pending') next.backgroundResult.state = 'error';
      for (const kind of next.outputs) if (occupied.current.has(variantJobKey(next.source.id, kind))) publish(next.source.id, kind, { state: 'error', message });
      finish();
    };
    void (async () => {
      try {
        // A missing/failed cutout is an error, never permission to use the original.
        if (next.backgroundInput && (next.backgroundInput.state !== 'ready' || !next.backgroundInput.asset)) {
          throw new Error('Create or adjust the background-free image, then retry.');
        }
        const input = next.backgroundInput?.asset ?? next.source;
        const bundled = getBundledAssetUrl(input.id);
        const response = bundled ? await fetch(bundled) : null;
        if (response && !response.ok) throw new Error('This image could not be opened.');
        const source = response ? await response.blob() : await getAssetBlob(input.id);
        if (token !== generation.current || !alive.current) return;
        if (!source) throw new Error('This image is missing. Import it again.');
        const worker = new Worker(new URL('./assetVariants.worker.js', import.meta.url), { type: 'module' });
        workerRef.current = worker;
        try { localStorage.setItem(interruptedKey, JSON.stringify({ name: next.source.name })); } catch { /* optional */ }
        worker.onerror = event => { event.preventDefault(); if (token === generation.current) fail('Processing stopped. Try a smaller image or turn off AI tools.'); };
        worker.onmessage = async ({ data }) => {
          if (token !== generation.current || !alive.current) return;
          const kind = data.kind as AssetVariantKind;
          if (data.type === 'suggestion') setSuggestions(previous => ({ ...previous, [next.source.id]: data.settings }));
          else if (data.type === 'phase') publish(next.source.id, kind, { state: 'processing', message: data.message });
          else if (data.type === 'download') publish(next.source.id, kind, { state: 'processing', message: 'Downloading model…', loaded: data.loaded, total: data.total });
          else if (data.type === 'error') {
            if (kind === 'background' && next.backgroundResult) next.backgroundResult.state = 'error';
            occupied.current.delete(variantJobKey(next.source.id, kind)); publish(next.source.id, kind, { state: 'error', message: data.message });
          } else if (data.type === 'result') {
            try {
              if (!assetsRef.current.some(asset => asset.id === next.source.id)) throw new Error('The original was removed.');
              const asset = await saveRef.current(next.source, { kind, blob: data.blob, width: data.width, height: data.height, method: data.method, surfaceSettings: data.surfaceSettings, inputAssetId: input.id });
              if (token !== generation.current || !alive.current) return;
              if (!asset) throw new Error('Could not save this version. Free browser storage and retry.');
              if (kind === 'background' && next.backgroundResult) {
                next.backgroundResult.asset = asset;
                next.backgroundResult.state = 'ready';
              }
              publish(next.source.id, kind, { state: 'ready', message: data.method });
            } catch (error) {
              if (kind === 'background' && next.backgroundResult) next.backgroundResult.state = 'error';
              if (token === generation.current) publish(next.source.id, kind, { state: 'error', message: error instanceof Error ? error.message : 'Could not save the result.' });
            }
            occupied.current.delete(variantJobKey(next.source.id, kind));
            if (token === generation.current) worker.postMessage({ type: 'ack' });
          } else if (data.type === 'fatal') fail(data.message);
          else if (data.type === 'done') finish();
        };
        worker.postMessage({ type: 'run', source, outputs: next.outputs, profile, ai: next.ai, gradientSettings: next.gradientSettings });
      } catch (error) { if (token === generation.current) fail(error instanceof Error ? error.message : 'Could not start processing.'); }
    })();
  };
  const generate = (source: AssetRecord, kinds = preferences.outputs, automatic = false, options: { regenerate?: boolean; gradientSettings?: GradientSettings } = {}) => {
    if (source.kind !== 'image') return;
    // Automatic imports never start AI jobs on an unvalidated phone.
    const allowedAI = ai && (!automatic || !profile.mobile);
    const occupiedKinds = new Set<AssetVariantKind>();
    for (const kind of ['background', 'depth', 'segmentation', 'gradient', 'field', 'edges'] as const) {
      if (occupied.current.has(variantJobKey(source.id, kind))) occupiedKinds.add(kind);
    }
    const plan = planVariantGeneration(source.id, assetsRef.current, kinds, {
      useBackgroundSource: preferences.useBackgroundSource, allowDepth: allowedAI, regenerate: options.regenerate, occupied: occupiedKinds,
    });
    if (!plan.length) return;
    const previousGradient = latestVariant(assetsRef.current, source.id, 'gradient');
    const gradientSettings = normalizeGradientSettings(options.gradientSettings ?? previousGradient?.derivation?.surfaceSettings);
    for (const batch of plan) {
      let backgroundResult: BackgroundDependency | undefined;
      if (batch.outputs.includes('background')) {
        backgroundResult = { state: 'pending' };
        backgroundRuns.current.set(source.id, backgroundResult);
      }
      const latestBackground = latestVariant(assetsRef.current, source.id, 'background');
      const backgroundInput = batch.input === 'background'
        ? backgroundRuns.current.get(source.id)?.state === 'pending' ? backgroundRuns.current.get(source.id)
          : latestBackground ? { state: 'ready' as const, asset: latestBackground } : { state: 'error' as const }
        : undefined;
      for (const kind of batch.outputs) {
        occupied.current.add(variantJobKey(source.id, kind));
        publish(source.id, kind, { state: 'queued', message: backgroundInput?.state === 'pending' ? 'Waiting for background removal…' : 'Queued' });
      }
      pending.current.push({ source, outputs: batch.outputs, ai: allowedAI, gradientSettings, backgroundInput, backgroundResult });
    }
    setInterrupted(false); setBusy(true); pumpRef.current();
  };
  const generateRef = useRef(generate); generateRef.current = generate;
  const cancel = useCallback(() => {
    generation.current++; workerRef.current?.terminate(); workerRef.current = null;
    const keys = new Set(occupied.current); occupied.current.clear(); pending.current = []; running.current = null; clearMarker();
    backgroundRuns.current.clear();
    setJobs(previous => Object.fromEntries(Object.entries(previous).map(([key, value]) => [key, keys.has(key) ? { state: 'cancelled', message: 'Cancelled' } : value])));
    setBusy(false);
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; generation.current++; workerRef.current?.terminate(); clearMarker(); };
  }, []);
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch { /* Preferences remain usable for this visit. */ }
  }, [preferences]);
  useEffect(() => {
    const added = assets.filter(asset => !seen.current.has(asset.id));
    seen.current = new Set(assets.map(asset => asset.id));
    if (preferences.automatic && !interrupted) for (const asset of added) if (asset.sourceType === 'uploaded' && !asset.derivation) generateRef.current(asset, undefined, true);
    if (running.current && !assets.some(asset => asset.id === running.current?.source.id)) cancel();
  }, [assets, preferences.automatic, interrupted, cancel]);
  useEffect(() => { if (suspended && running.current) cancel(); else if (!suspended) pumpRef.current(); }, [suspended, cancel]);
  return { profile, ai, setAI, preferences, setPreferences, jobs, suggestions, busy, generate, cancel, interrupted, dismissInterrupted: () => { setInterrupted(false); clearMarker(); } };
}
