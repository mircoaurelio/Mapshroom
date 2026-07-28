import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildAudioReactiveBindings,
  createAudioReactiveRuntime,
  DEFAULT_AUDIO_REACTIVE_FRAME,
  getAudioReactiveChannelName,
  getAudioReactiveStorageKey,
  loadAudioReactivePreferences,
  saveAudioReactivePreferences,
  type AudioBpmMode,
  type AudioCaptureSource,
  type AudioMappingMode,
  type AudioReactiveBinding,
  type AudioReactiveFrame,
  type AudioReactiveLiveMessage,
  type AudioReactivePreferences,
  type AudioReactiveRuntime,
} from '../lib/audioReactivity';
import {
  createAudioSectionDetector,
  updateAudioSectionDetector,
  type AudioSectionDetectorState,
} from '../lib/audioSectionDetection';
import type { ShaderUniformMap, ShaderUniformValueMap } from '../types';

export type AudioReactiveStatus = 'idle' | 'starting' | 'listening' | 'error';

export interface AudioReactivityController {
  preferences: AudioReactivePreferences;
  runtime: AudioReactiveRuntime;
  uiFrame: AudioReactiveFrame;
  status: AudioReactiveStatus;
  errorMessage: string | null;
  captureLabel: string | null;
  start: (source?: AudioCaptureSource) => Promise<void>;
  stop: () => void;
  setSource: (source: AudioCaptureSource) => void;
  setBpmMode: (mode: AudioBpmMode) => void;
  setManualBpm: (bpm: number) => void;
  setSyncOffsetMs: (offsetMs: number) => void;
  tapTempo: () => void;
  setModeEnabled: (enabled: boolean) => void;
  setMappingMode: (mode: AudioMappingMode) => void;
  configureShaderBindings: (
    shaderId: string,
    uniformDefinitions: ShaderUniformMap,
    uniformValues: ShaderUniformValueMap,
    shaderCode?: string,
    force?: boolean,
  ) => void;
  seedShaderBindings: (
    shaderId: string,
    bindings: Record<string, AudioReactiveBinding>,
  ) => void;
  setBinding: (
    shaderId: string,
    uniformName: string,
    binding: AudioReactiveBinding | null,
  ) => void;
}

export interface AudioReactivityOptions {
  sectionDetectionEnabled?: boolean;
  minimumSectionSeconds?: number;
}

interface AudioEngine {
  token: symbol;
  stream: MediaStream;
  context: AudioContext;
  sourceNode: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  silentGain: GainNode;
  frequencyData: Uint8Array<ArrayBuffer>;
  timeData: Uint8Array<ArrayBuffer>;
  animationFrameId: number | null;
  lastAnalysisAt: number;
  lastUiUpdateAt: number;
  lastBroadcastAt: number;
  smoothedLevel: number;
  smoothedBass: number;
  smoothedMid: number;
  smoothedHigh: number;
  bassPeak: number;
  midPeak: number;
  highPeak: number;
  bassAverage: number;
  beatEnvelope: number;
  lastBeatAt: number;
  beatIntervals: number[];
  detectedBpm: number;
  sectionDetector: AudioSectionDetectorState | null;
  lastSectionAnalysisAt: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function smooth(previous: number, next: number): number {
  const amount = next > previous ? 0.42 : 0.12;
  return previous + (next - previous) * amount;
}

function averageFrequencyBand(
  data: Uint8Array<ArrayBuffer>,
  sampleRate: number,
  fftSize: number,
  lowHz: number,
  highHz: number,
): number {
  const binWidth = sampleRate / fftSize;
  const bandCount = 6;
  const safeLow = Math.max(lowHz, binWidth);
  const safeHigh = Math.max(safeLow + binWidth, highHz);
  let perceptualTotal = 0;

  for (let bandIndex = 0; bandIndex < bandCount; bandIndex += 1) {
    const startRatio = bandIndex / bandCount;
    const endRatio = (bandIndex + 1) / bandCount;
    const bandLow = safeLow * Math.pow(safeHigh / safeLow, startRatio);
    const bandHigh = safeLow * Math.pow(safeHigh / safeLow, endRatio);
    const first = clamp(Math.floor(bandLow / binWidth), 0, data.length - 1);
    const last = clamp(Math.ceil(bandHigh / binWidth), first + 1, data.length);
    let energy = 0;
    let samples = 0;

    for (let index = first; index < last; index += 1) {
      const normalized = data[index] / 255;
      energy += normalized * normalized;
      samples += 1;
    }

    if (samples > 0) {
      perceptualTotal += Math.sqrt(energy / samples);
    }
  }

  return clamp(Math.pow(perceptualTotal / bandCount, 0.82) * 1.42, 0, 1);
}

function getLogFrequencyFeatures(
  data: Uint8Array<ArrayBuffer>,
  sampleRate: number,
  fftSize: number,
  bandCount = 12,
): number[] {
  const binWidth = sampleRate / fftSize;
  const lowHz = Math.max(35, binWidth);
  const highHz = Math.min(14_000, sampleRate / 2);
  const features: number[] = [];

  for (let bandIndex = 0; bandIndex < bandCount; bandIndex += 1) {
    const startRatio = bandIndex / bandCount;
    const endRatio = (bandIndex + 1) / bandCount;
    const bandLow = lowHz * Math.pow(highHz / lowHz, startRatio);
    const bandHigh = lowHz * Math.pow(highHz / lowHz, endRatio);
    const first = clamp(Math.floor(bandLow / binWidth), 0, data.length - 1);
    const last = clamp(Math.ceil(bandHigh / binWidth), first + 1, data.length);
    let squaredEnergy = 0;

    for (let index = first; index < last; index += 1) {
      const normalized = data[index] / 255;
      squaredEnergy += normalized * normalized;
    }

    features.push(
      clamp(Math.sqrt(squaredEnergy / Math.max(1, last - first)), 0, 1),
    );
  }

  return features;
}

function getRms(data: Uint8Array<ArrayBuffer>): number {
  let sum = 0;
  for (const sample of data) {
    const centered = (sample - 128) / 128;
    sum += centered * centered;
  }
  return clamp(Math.sqrt(sum / data.length) * 3.25, 0, 1);
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function foldBpmIntoRange(bpm: number): number {
  let folded = bpm;
  while (folded < 70) folded *= 2;
  while (folded > 180) folded /= 2;
  return clamp(folded, 40, 240);
}

function getAudioErrorMessage(error: unknown, source: AudioCaptureSource): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return source === 'system'
        ? 'Sharing was cancelled. Choose the YouTube tab and enable “Share tab audio”.'
        : 'Microphone access was not allowed.';
    }
    if (error.name === 'NotFoundError') {
      return source === 'system'
        ? 'No shareable audio source was found.'
        : 'No microphone is available.';
    }
  }

  return error instanceof Error ? error.message : 'Unable to start audio capture.';
}

function stopMediaStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

export function useAudioReactivity(
  sessionId: string | null,
  options: AudioReactivityOptions = {},
): AudioReactivityController {
  const runtimeRef = useMemo(() => createAudioReactiveRuntime(), []);
  const [preferences, setPreferences] = useState<AudioReactivePreferences>(() => ({
    ...loadAudioReactivePreferences(sessionId),
    modeEnabled: false,
  }));
  const preferencesRef = useRef(preferences);
  const optionsRef = useRef(options);
  const loadedSessionRef = useRef<string | null>(sessionId);
  const engineRef = useRef<AudioEngine | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tapTimesRef = useRef<number[]>([]);
  const [uiFrame, setUiFrame] = useState<AudioReactiveFrame>({
    ...DEFAULT_AUDIO_REACTIVE_FRAME,
  });
  const [status, setStatus] = useState<AudioReactiveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [captureLabel, setCaptureLabel] = useState<string | null>(null);

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);
  optionsRef.current = options;

  const publish = useCallback(
    (message: Omit<AudioReactiveLiveMessage, 'sessionId'>) => {
      if (!sessionId) {
        return;
      }

      channelRef.current?.postMessage({ ...message, sessionId });
    },
    [sessionId],
  );

  const stop = useCallback(() => {
    const engine = engineRef.current;
    const lastSection =
      engine?.sectionDetector?.snapshot ??
      runtimeRef.current.section ??
      DEFAULT_AUDIO_REACTIVE_FRAME.section;
    engineRef.current = null;

    if (engine) {
      if (engine.animationFrameId !== null) {
        cancelAnimationFrame(engine.animationFrameId);
      }
      engine.sourceNode.disconnect();
      engine.analyser.disconnect();
      engine.silentGain.disconnect();
      stopMediaStream(engine.stream);
      void engine.context.close();
    }

    const stoppedFrame = {
      ...DEFAULT_AUDIO_REACTIVE_FRAME,
      bpm:
        preferencesRef.current.bpmMode === 'manual'
          ? preferencesRef.current.manualBpm
          : runtimeRef.current.bpm,
      updatedAt: performance.now(),
      section: lastSection,
    };
    runtimeRef.current = stoppedFrame;
    setUiFrame(stoppedFrame);
    setStatus('idle');
    setCaptureLabel(null);
    publish({ type: 'stop', frame: stoppedFrame });
  }, [publish, runtimeRef]);

  useEffect(() => {
    stop();
    const nextPreferences = {
      ...loadAudioReactivePreferences(sessionId),
      modeEnabled: false,
    };
    loadedSessionRef.current = sessionId;
    preferencesRef.current = nextPreferences;
    setPreferences(nextPreferences);
    setErrorMessage(null);

    channelRef.current?.close();
    channelRef.current =
      sessionId && typeof BroadcastChannel !== 'undefined'
        ? new BroadcastChannel(getAudioReactiveChannelName(sessionId))
        : null;

    return () => {
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [sessionId, stop]);

  useEffect(() => {
    if (!sessionId || loadedSessionRef.current !== sessionId) {
      return;
    }
    saveAudioReactivePreferences(sessionId, preferences);
  }, [preferences, sessionId]);

  useEffect(() => stop, [stop]);

  const start = useCallback(
    async (requestedSource?: AudioCaptureSource) => {
      if (!sessionId || !navigator.mediaDevices) {
        setStatus('error');
        setErrorMessage('Audio capture is not available in this browser.');
        return;
      }

      stop();
      const source = requestedSource ?? preferencesRef.current.source;
      setPreferences((current) => ({ ...current, source }));
      setStatus('starting');
      setErrorMessage(null);

      let stream: MediaStream | null = null;
      try {
        stream =
          source === 'microphone'
            ? await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: {
                  autoGainControl: false,
                  echoCancellation: false,
                  noiseSuppression: false,
                  channelCount: 1,
                },
              })
            : await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
              });

        const audioTrack = stream.getAudioTracks()[0];
        if (!audioTrack) {
          stopMediaStream(stream);
          throw new Error(
            'No audio was received. Choose a browser tab and enable “Share tab audio”.',
          );
        }

        for (const videoTrack of stream.getVideoTracks()) {
          videoTrack.enabled = false;
        }

        const context = new AudioContext({ latencyHint: 'interactive' });
        await context.resume();
        const sourceNode = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.18;
        const silentGain = context.createGain();
        silentGain.gain.value = 0;
        sourceNode.connect(analyser);
        analyser.connect(silentGain);
        silentGain.connect(context.destination);

        const token = Symbol('audio-engine');
        const engine: AudioEngine = {
          token,
          stream,
          context,
          sourceNode,
          analyser,
          silentGain,
          frequencyData: new Uint8Array(analyser.frequencyBinCount),
          timeData: new Uint8Array(analyser.fftSize),
          animationFrameId: null,
          lastAnalysisAt: performance.now(),
          lastUiUpdateAt: 0,
          lastBroadcastAt: 0,
          smoothedLevel: 0,
          smoothedBass: 0,
          smoothedMid: 0,
          smoothedHigh: 0,
          bassPeak: 0.22,
          midPeak: 0.2,
          highPeak: 0.16,
          bassAverage: 0.08,
          beatEnvelope: 0,
          lastBeatAt: 0,
          beatIntervals: [],
          detectedBpm: 120,
          sectionDetector: null,
          lastSectionAnalysisAt: 0,
        };
        engineRef.current = engine;

        audioTrack.addEventListener(
          'ended',
          () => {
            if (engineRef.current?.token === token) {
              stop();
            }
          },
          { once: true },
        );

        setCaptureLabel(
          source === 'system'
            ? audioTrack.label || 'Browser tab / computer audio'
            : audioTrack.label || 'Microphone',
        );
        setStatus('listening');

        const analyze = (now: number) => {
          const currentEngine = engineRef.current;
          if (!currentEngine || currentEngine.token !== token) {
            return;
          }

          const elapsedMs = Math.max(1, now - currentEngine.lastAnalysisAt);
          currentEngine.lastAnalysisAt = now;
          currentEngine.analyser.getByteTimeDomainData(currentEngine.timeData);
          currentEngine.analyser.getByteFrequencyData(currentEngine.frequencyData);

          const nyquist = currentEngine.context.sampleRate / 2;
          currentEngine.smoothedLevel = smooth(
            currentEngine.smoothedLevel,
            getRms(currentEngine.timeData),
          );
          const rawBass = averageFrequencyBand(
            currentEngine.frequencyData,
            currentEngine.context.sampleRate,
            currentEngine.analyser.fftSize,
            30,
            250,
          );
          const rawMid = averageFrequencyBand(
            currentEngine.frequencyData,
            currentEngine.context.sampleRate,
            currentEngine.analyser.fftSize,
            250,
            2_500,
          );
          const rawHigh = averageFrequencyBand(
            currentEngine.frequencyData,
            currentEngine.context.sampleRate,
            currentEngine.analyser.fftSize,
            2_500,
            Math.min(14_000, nyquist),
          );
          const peakDecay = Math.pow(0.997, elapsedMs / 16.67);
          currentEngine.bassPeak = Math.max(rawBass, currentEngine.bassPeak * peakDecay);
          currentEngine.midPeak = Math.max(rawMid, currentEngine.midPeak * peakDecay);
          currentEngine.highPeak = Math.max(rawHigh, currentEngine.highPeak * peakDecay);
          currentEngine.smoothedBass = smooth(
            currentEngine.smoothedBass,
            clamp(rawBass / Math.max(0.22, currentEngine.bassPeak), 0, 1),
          );
          currentEngine.smoothedMid = smooth(
            currentEngine.smoothedMid,
            clamp(rawMid / Math.max(0.2, currentEngine.midPeak), 0, 1),
          );
          currentEngine.smoothedHigh = smooth(
            currentEngine.smoothedHigh,
            clamp(rawHigh / Math.max(0.16, currentEngine.highPeak), 0, 1),
          );

          currentEngine.bassAverage =
            currentEngine.bassAverage * 0.965 + currentEngine.smoothedBass * 0.035;
          const beatDetected =
            currentEngine.smoothedBass > Math.max(0.13, currentEngine.bassAverage * 1.38) &&
            currentEngine.smoothedLevel > 0.035 &&
            now - currentEngine.lastBeatAt > 220;

          if (beatDetected) {
            if (currentEngine.lastBeatAt > 0) {
              const interval = now - currentEngine.lastBeatAt;
              if (interval >= 250 && interval <= 2_000) {
                currentEngine.beatIntervals.push(interval);
                currentEngine.beatIntervals = currentEngine.beatIntervals.slice(-8);
                const typicalInterval = median(currentEngine.beatIntervals);
                if (typicalInterval > 0) {
                  currentEngine.detectedBpm = foldBpmIntoRange(60_000 / typicalInterval);
                }
              }
            }
            currentEngine.lastBeatAt = now;
            currentEngine.beatEnvelope = 1;
          } else {
            currentEngine.beatEnvelope *= Math.exp(-elapsedMs / 135);
          }

          const currentPreferences = preferencesRef.current;
          const bpm =
            currentPreferences.bpmMode === 'manual'
              ? currentPreferences.manualBpm
              : currentEngine.detectedBpm;
          const beatDurationMs = 60_000 / Math.max(1, bpm);
          const clockOrigin =
            currentEngine.lastBeatAt > 0 ? currentEngine.lastBeatAt : now;
          const shiftedTime = now - clockOrigin + currentPreferences.syncOffsetMs;
          const phase = ((shiftedTime % beatDurationMs) + beatDurationMs) % beatDurationMs;
          const tempoPulse = Math.exp(-phase / Math.max(35, beatDurationMs * 0.12));
          const sectionOptions = optionsRef.current;
          const sectionDetectionEnabled =
            sectionOptions.sectionDetectionEnabled === true;

          if (!sectionDetectionEnabled) {
            currentEngine.sectionDetector = null;
            currentEngine.lastSectionAnalysisAt = 0;
          } else {
            if (!currentEngine.sectionDetector) {
              const epochMs = Date.now();
              currentEngine.sectionDetector = createAudioSectionDetector(
                crypto.randomUUID(),
                now,
                epochMs,
              );
              currentEngine.lastSectionAnalysisAt = now;
            } else if (now - currentEngine.lastSectionAnalysisAt >= 100) {
              currentEngine.lastSectionAnalysisAt = now;
              currentEngine.sectionDetector = updateAudioSectionDetector(
                currentEngine.sectionDetector,
                {
                  atMs: now,
                  epochMs: Date.now(),
                  features: [
                    ...getLogFrequencyFeatures(
                      currentEngine.frequencyData,
                      currentEngine.context.sampleRate,
                      currentEngine.analyser.fftSize,
                    ),
                    currentEngine.smoothedLevel,
                    currentEngine.smoothedBass,
                    currentEngine.smoothedMid,
                    currentEngine.smoothedHigh,
                  ],
                  level: currentEngine.smoothedLevel,
                  beat: currentEngine.beatEnvelope,
                },
                {
                  minSectionMs:
                    clamp(
                      sectionOptions.minimumSectionSeconds ?? 8,
                      1,
                      600,
                    ) * 1_000,
                },
              ).state;
            }
          }

          const frame: AudioReactiveFrame = {
            active: true,
            level: currentEngine.smoothedLevel,
            bass: currentEngine.smoothedBass,
            mid: currentEngine.smoothedMid,
            high: currentEngine.smoothedHigh,
            beat: clamp(currentEngine.beatEnvelope, 0, 1),
            tempo: clamp(tempoPulse, 0, 1),
            bpm: Math.round(bpm * 10) / 10,
            updatedAt: now,
            section:
              currentEngine.sectionDetector?.snapshot ??
              DEFAULT_AUDIO_REACTIVE_FRAME.section,
          };
          runtimeRef.current = frame;

          if (now - currentEngine.lastUiUpdateAt >= 50) {
            currentEngine.lastUiUpdateAt = now;
            setUiFrame(frame);
          }
          if (now - currentEngine.lastBroadcastAt >= 33) {
            currentEngine.lastBroadcastAt = now;
            publish({ type: 'frame', frame });
          }

          currentEngine.animationFrameId = requestAnimationFrame(analyze);
        };

        engine.animationFrameId = requestAnimationFrame(analyze);
      } catch (error) {
        if (stream) {
          stopMediaStream(stream);
        }
        engineRef.current = null;
        runtimeRef.current = { ...DEFAULT_AUDIO_REACTIVE_FRAME };
        setUiFrame({ ...DEFAULT_AUDIO_REACTIVE_FRAME });
        setStatus('error');
        setCaptureLabel(null);
        setErrorMessage(getAudioErrorMessage(error, source));
      }
    },
    [publish, runtimeRef, sessionId, stop],
  );

  const setSource = useCallback((source: AudioCaptureSource) => {
    setPreferences((current) => ({ ...current, source }));
  }, []);

  const setModeEnabled = useCallback((modeEnabled: boolean) => {
    setPreferences((current) => ({ ...current, modeEnabled }));
  }, []);

  const setMappingMode = useCallback((mappingMode: AudioMappingMode) => {
    setPreferences((current) => ({ ...current, mappingMode }));
  }, []);

  const configureShaderBindings = useCallback(
    (
      shaderId: string,
      uniformDefinitions: ShaderUniformMap,
      uniformValues: ShaderUniformValueMap,
      shaderCode?: string,
      force = false,
    ) => {
      setPreferences((current) => {
        const generated = buildAudioReactiveBindings({
          shaderCode,
          uniformDefinitions,
          uniformValues,
          mode: current.mappingMode,
        });
        const existing = current.bindingsByShaderId[shaderId] ?? {};
        const missingNames = Object.keys(generated).filter((name) => !existing[name]);
        if (!force && missingNames.length === 0) {
          return current;
        }

        const nextBindings = force ? generated : { ...generated, ...existing };
        return {
          ...current,
          bindingsByShaderId: {
            ...current.bindingsByShaderId,
            [shaderId]: nextBindings,
          },
        };
      });
    },
    [],
  );

  const seedShaderBindings = useCallback(
    (shaderId: string, bindings: Record<string, AudioReactiveBinding>) => {
      setPreferences((current) => {
        if (current.bindingsByShaderId[shaderId]) {
          return current;
        }

        const normalizedBindings = Object.fromEntries(
          Object.entries(bindings).map(([name, binding]) => [
            name,
            {
              ...binding,
              min: Math.min(binding.min, binding.max),
              max: Math.max(binding.min, binding.max),
            },
          ]),
        );

        return {
          ...current,
          bindingsByShaderId: {
            ...current.bindingsByShaderId,
            [shaderId]: normalizedBindings,
          },
        };
      });
    },
    [],
  );

  const setBpmMode = useCallback((bpmMode: AudioBpmMode) => {
    setPreferences((current) => ({ ...current, bpmMode }));
  }, []);

  const setManualBpm = useCallback((manualBpm: number) => {
    setPreferences((current) => ({
      ...current,
      manualBpm: clamp(manualBpm, 40, 240),
    }));
  }, []);

  const setSyncOffsetMs = useCallback((syncOffsetMs: number) => {
    setPreferences((current) => ({
      ...current,
      syncOffsetMs: clamp(syncOffsetMs, -500, 500),
    }));
  }, []);

  const tapTempo = useCallback(() => {
    const now = performance.now();
    tapTimesRef.current = [...tapTimesRef.current.filter((time) => now - time < 4_000), now].slice(
      -6,
    );
    if (tapTimesRef.current.length < 2) {
      return;
    }

    const intervals = tapTimesRef.current
      .slice(1)
      .map((time, index) => time - tapTimesRef.current[index]);
    const bpm = foldBpmIntoRange(60_000 / median(intervals));
    setPreferences((current) => ({
      ...current,
      bpmMode: 'manual',
      manualBpm: Math.round(bpm * 10) / 10,
    }));
  }, []);

  const setBinding = useCallback(
    (
      shaderId: string,
      uniformName: string,
      binding: AudioReactiveBinding | null,
    ) => {
      setPreferences((current) => {
        const shaderBindings = {
          ...(current.bindingsByShaderId[shaderId] ?? {}),
        };

        if (binding) {
          shaderBindings[uniformName] = {
            ...binding,
            min: Math.min(binding.min, binding.max),
            max: Math.max(binding.min, binding.max),
          };
        } else {
          delete shaderBindings[uniformName];
        }

        const bindingsByShaderId = { ...current.bindingsByShaderId };
        if (Object.keys(shaderBindings).length > 0) {
          bindingsByShaderId[shaderId] = shaderBindings;
        } else {
          delete bindingsByShaderId[shaderId];
        }

        return { ...current, bindingsByShaderId };
      });
    },
    [],
  );

  return {
    preferences,
    runtime: runtimeRef,
    uiFrame,
    status,
    errorMessage,
    captureLabel,
    start,
    stop,
    setSource,
    setBpmMode,
    setManualBpm,
    setSyncOffsetMs,
    tapTempo,
    setModeEnabled,
    setMappingMode,
    configureShaderBindings,
    seedShaderBindings,
    setBinding,
  };
}

export function useAudioReactivityOutput(sessionId: string | null): {
  preferences: AudioReactivePreferences;
  runtime: AudioReactiveRuntime;
} {
  const runtimeRef = useMemo(() => createAudioReactiveRuntime(), []);
  const [preferences, setPreferences] = useState<AudioReactivePreferences>(() =>
    loadAudioReactivePreferences(sessionId),
  );

  useEffect(() => {
    runtimeRef.current = { ...DEFAULT_AUDIO_REACTIVE_FRAME };
    const preferenceUpdateId = window.setTimeout(() => {
      setPreferences(loadAudioReactivePreferences(sessionId));
    }, 0);
    if (!sessionId) {
      return () => window.clearTimeout(preferenceUpdateId);
    }

    const storageKey = getAudioReactiveStorageKey(sessionId);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        setPreferences(loadAudioReactivePreferences(sessionId));
      }
    };
    window.addEventListener('storage', handleStorage);

    const channel =
      typeof BroadcastChannel !== 'undefined'
        ? new BroadcastChannel(getAudioReactiveChannelName(sessionId))
        : null;
    if (channel) {
      channel.onmessage = (event: MessageEvent<AudioReactiveLiveMessage>) => {
        const message = event.data;
        if (!message || message.sessionId !== sessionId) {
          return;
        }
        runtimeRef.current = message.frame
          ? message.frame
          : { ...DEFAULT_AUDIO_REACTIVE_FRAME };
      };
    }

    return () => {
      window.clearTimeout(preferenceUpdateId);
      window.removeEventListener('storage', handleStorage);
      channel?.close();
      runtimeRef.current = { ...DEFAULT_AUDIO_REACTIVE_FRAME };
    };
  }, [runtimeRef, sessionId]);

  return { preferences, runtime: runtimeRef };
}
