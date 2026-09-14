import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssetRecord } from '../types';
import { getAssetBlob } from './storage';
import { getBundledAssetUrl } from './bundledAssets';
import { defaultVariantKinds, variantOptions, type AssetVariantKind, type SaveAssetVariant } from './assetVariants';
import { processingProfile, type SuggestedSurfaces } from './assetVariantRules.js';

export interface VariantJob { state: 'queued' | 'processing' | 'ready' | 'error' | 'cancelled'; message: string; loaded?: number; total?: number }
type Preferences = { outputs: AssetVariantKind[]; automatic: boolean };
const storageKey = 'mapshroom.asset-versions.v1';
const interruptedKey = 'mapshroom.asset-versions.running';
const order: AssetVariantKind[] = ['segmentation', 'gradient', 'field', 'edges', 'background', 'depth'];
function readPreferences(): Preferences {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (value && Array.isArray(value.outputs)) return { outputs: value.outputs.filter((id: AssetVariantKind) => variantOptions.some(option => option.id === id)), automatic: value.automatic === true };
  } catch { /* Private browsing may not provide storage. */ }
  return { outputs: defaultVariantKinds, automatic: true };
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
  const pending = useRef<{ source: AssetRecord; outputs: AssetVariantKind[]; ai: boolean }[]>([]);
  const running = useRef<{ source: AssetRecord; outputs: AssetVariantKind[] } | null>(null);
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
      for (const kind of next.outputs) if (occupied.current.has(variantJobKey(next.source.id, kind))) publish(next.source.id, kind, { state: 'error', message });
      finish();
    };
    void (async () => {
      try {
        const bundled = getBundledAssetUrl(next.source.id);
        const response = bundled ? await fetch(bundled) : null;
        if (response && !response.ok) throw new Error('This image could not be opened.');
        const source = response ? await response.blob() : await getAssetBlob(next.source.id);
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
            occupied.current.delete(variantJobKey(next.source.id, kind)); publish(next.source.id, kind, { state: 'error', message: data.message });
          } else if (data.type === 'result') {
            try {
              if (!assetsRef.current.some(asset => asset.id === next.source.id)) throw new Error('The original was removed.');
              const asset = await saveRef.current(next.source, { kind, blob: data.blob, width: data.width, height: data.height, method: data.method });
              if (token !== generation.current || !alive.current) return;
              if (!asset) throw new Error('Could not save this version. Free browser storage and retry.');
              publish(next.source.id, kind, { state: 'ready', message: data.method });
            } catch (error) {
              if (token === generation.current) publish(next.source.id, kind, { state: 'error', message: error instanceof Error ? error.message : 'Could not save the result.' });
            }
            occupied.current.delete(variantJobKey(next.source.id, kind));
            if (token === generation.current) worker.postMessage({ type: 'ack' });
          } else if (data.type === 'fatal') fail(data.message);
          else if (data.type === 'done') finish();
        };
        worker.postMessage({ type: 'run', source, outputs: next.outputs, profile, ai: next.ai });
      } catch (error) { if (token === generation.current) fail(error instanceof Error ? error.message : 'Could not start processing.'); }
    })();
  };
  const generate = (source: AssetRecord, kinds = preferences.outputs, automatic = false) => {
    if (source.kind !== 'image') return;
    // Automatic imports never start AI jobs on an unvalidated phone.
    const allowedAI = ai && (!automatic || !profile.mobile);
    const outputs = order.filter(kind => kinds.includes(kind) && (kind !== 'depth' || allowedAI) && !occupied.current.has(variantJobKey(source.id, kind)) && !assetsRef.current.some(asset => asset.derivation?.sourceAssetId === source.id && asset.derivation.kind === kind));
    if (!outputs.length) return;
    for (const kind of outputs) { occupied.current.add(variantJobKey(source.id, kind)); publish(source.id, kind, { state: 'queued', message: 'Queued' }); }
    pending.current.push({ source, outputs, ai: allowedAI }); setInterrupted(false); pumpRef.current();
  };
  const generateRef = useRef(generate); generateRef.current = generate;
  const cancel = useCallback(() => {
    generation.current++; workerRef.current?.terminate(); workerRef.current = null;
    const keys = new Set(occupied.current); occupied.current.clear(); pending.current = []; running.current = null; clearMarker();
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
