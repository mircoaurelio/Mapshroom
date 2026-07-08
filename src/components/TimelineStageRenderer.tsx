import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getTransportTimeSeconds } from '../lib/clock';
import { parseUniforms, syncUniformValues } from '../lib/shader';
import {
  getRenderableShaderCode,
  getRenderableShaderUniformValues,
  hasShaderCompileError,
} from '../lib/shaderState';
import {
  clampTimelineStepDuration,
  excludePinnedStepFromTimelinePlayback,
  getTimelineTransitionSeed,
  resolveShaderTimelineState,
  resolveTimelineStepIdForShader,
} from '../lib/timeline';
import {
  createTimelineAssetSourceKey,
  getTimelineAssetBlendModeIndex,
  getTimelineAssetFitModeIndex,
  getTimelineAssetQualityIndex,
  normalizeTimelineStepAssetSettings,
} from '../lib/timelineAssetSettings';
import {
  buildTimelineOverlayShaderCode,
  buildTimelinePinStackShaderOutputShaderCode,
  buildTimelinePinShaderAlphaOverlayShaderCode,
  buildTimelineTransitionShaderCode,
} from '../lib/timelineShader';
import { getBundledAssetUrl } from '../lib/bundledAssets';
import { getAssetBlob } from '../lib/storage';
import type {
  PlaybackTransport,
  SavedShader,
  ShaderUniformValueMap,
  StageTransform,
  TimelineStub,
  TimelineSequenceMode,
  AssetRecord,
  TimelineStepAssetSettings,
} from '../types';
import {
  StageRenderer,
  type StageFrameInfo,
  type StageRendererState,
  type StageRenderInputSource,
  type StageRenderLayer,
} from './StageRenderer';
import type { AssetObjectUrlStatus } from '../lib/useAssetObjectUrl';

const DOUBLE_SECONDARY_SPEED = 1.35;
const PRELOAD_TRANSITION_PROGRESS = 0.001;
const PRELOAD_LOOKAHEAD_EPSILON_SECONDS = 0.01;
const STANDARD_PRELOAD_LOOKAHEAD_DEPTH = 2;
const DOUBLE_PRELOAD_LOOKAHEAD_DEPTH = 2;
const DOUBLE_RANDOM_RESEED_EPSILON_SECONDS = 0.05;
const DOUBLE_AUTOMATA_BALANCED_PROGRESS = 0.5;
const DOUBLE_AUTOMATA_GROW_AMOUNT = 0.12;
const DOUBLE_AUTOMATA_MOTION_SECONDS = 1.25;
const PIN_LAYER_FADE_DURATION_MS = 1_200;
const MODE_LAYER_WARMUP_DURATION_MS = 900;
const MODE_LAYER_FADE_DURATION_MS = 1_000;
const timelineAssetUrlCache = new Map<string, string>();
const timelineDecodedAssetIds = new Set<string>();

function getStageRenderLayerWarmupKey(
  layer: Pick<
    StageRenderLayer,
    'shaderCode' | 'inputSource' | 'overlaySource' | 'transitionInputSources' | 'transitionOverlaySources'
  >,
): string {
  return [
    layer.shaderCode,
    layer.inputSource?.sourceKey ?? '',
    layer.overlaySource?.sourceKey ?? '',
    layer.transitionInputSources?.from?.sourceKey ?? '',
    layer.transitionInputSources?.to?.sourceKey ?? '',
    layer.transitionOverlaySources?.from?.sourceKey ?? '',
    layer.transitionOverlaySources?.to?.sourceKey ?? '',
  ].join('|');
}

function registerResolvedShaderLayerSources(
  layer: ResolvedShaderLayer,
  sources: Map<string, StageRenderInputSource>,
) {
  if (layer.inputSource) {
    sources.set(layer.inputSource.sourceKey, layer.inputSource);
  }

  if (layer.overlaySource) {
    sources.set(layer.overlaySource.sourceKey, layer.overlaySource);
  }
}

function isTimelineStepMediaResolved(
  shader: SavedShader | null | undefined,
  resolvedInputSources: Record<string, { url: string | null; status: AssetObjectUrlStatus }>,
): boolean {
  const assetId = shader?.inputAssetId ?? null;
  if (!assetId) {
    return true;
  }

  const resolved = resolvedInputSources[assetId];
  if (!resolved || resolved.status !== 'ready' || !resolved.url) {
    return false;
  }

  return timelineDecodedAssetIds.has(assetId);
}

function timelinePlaybackStateNeedsDeferredMedia(
  state: ResolvedTimelineState,
  resolvedInputSources: Record<string, { url: string | null; status: AssetObjectUrlStatus }>,
): boolean {
  return !isTimelineStepMediaResolved(state.currentShader, resolvedInputSources);
}

type TimelineRenderLayerKind = 'single' | 'transition';
type ResolvedTimelineState = NonNullable<ReturnType<typeof resolveShaderTimelineState>>;
type TimelineSequenceStep = TimelineStub['shaderSequence']['steps'][number];

interface TimelineRenderLayer {
  kind: TimelineRenderLayerKind;
  shaderCode: string;
  uniformValues: ShaderUniformValueMap;
  usedFallback: boolean;
  inputSource?: StageRenderInputSource | null;
  overlaySource?: StageRenderInputSource | null;
  compositeMode?: StageRenderLayer['compositeMode'];
  requiresCompositeBase?: boolean;
  transitionInputSources?: {
    from: StageRenderInputSource | null;
    to: StageRenderInputSource | null;
  } | null;
  transitionOverlaySources?: {
    from: StageRenderInputSource | null;
    to: StageRenderInputSource | null;
  } | null;
}

interface ResolvedShaderLayer {
  shaderCode: string;
  uniformValues: ShaderUniformValueMap;
  usedFallback: boolean;
  inputSource: StageRenderInputSource | null;
  overlaySource: StageRenderInputSource | null;
  assetSettings: TimelineStepAssetSettings;
}

interface ResolveShaderLayerOptions {
  preferStepSnapshot?: boolean;
}

interface PinLayerTransitionState {
  fromKey: string | null;
  toKey: string | null;
  fromLayer: TimelineRenderLayer | null;
  toLayer: TimelineRenderLayer | null;
  startedAtMs: number;
}

interface ModeLayerTransitionState {
  fromMode: TimelineSequenceMode;
  toMode: TimelineSequenceMode;
  fromLayers: TimelineRenderLayer[];
  toLayers: TimelineRenderLayer[];
  startedAtMs: number;
}

function prefixUniformValueKeys({
  sourceValues,
  namespace,
}: {
  sourceValues: ShaderUniformValueMap;
  namespace: string;
}): ShaderUniformValueMap {
  const nextValues: ShaderUniformValueMap = {};
  for (const [name, value] of Object.entries(sourceValues)) {
    nextValues[`${namespace}_${name}`] = value;
  }

  return nextValues;
}

function easeTransitionProgress(progress: number): number {
  const clamped = Math.max(0, Math.min(1, progress));
  return clamped * clamped * (3 - 2 * clamped);
}

function getDoubleAutomataBalancedProgress(timeSeconds: number): number {
  const cyclePosition = ((timeSeconds / DOUBLE_AUTOMATA_MOTION_SECONDS) % 1 + 1) % 1;
  const wave = Math.sin(cyclePosition * Math.PI * 2);

  return DOUBLE_AUTOMATA_BALANCED_PROGRESS + wave * DOUBLE_AUTOMATA_GROW_AMOUNT;
}

function buildOverlayUniformValues(
  namespace: string,
  settings: TimelineStepAssetSettings,
): ShaderUniformValueMap {
  return {
    [`${namespace}_opacity`]: settings.opacity,
    [`${namespace}_scale_x`]: settings.scaleX,
    [`${namespace}_scale_y`]: settings.scaleY,
    [`${namespace}_offset_x`]: settings.offsetX,
    [`${namespace}_offset_y`]: settings.offsetY,
    [`${namespace}_blend_mode`]: getTimelineAssetBlendModeIndex(settings.blendMode),
    [`${namespace}_fit_mode`]: getTimelineAssetFitModeIndex(settings.fitMode),
    [`${namespace}_quality`]: getTimelineAssetQualityIndex(settings.quality),
  };
}

function buildPinnedCompositeUniformValues(
  settings: TimelineStepAssetSettings,
  keyBlack: boolean,
): ShaderUniformValueMap {
  return {
    ...buildOverlayUniformValues('u_timeline_overlay', settings),
    u_timeline_pin_key_black: keyBlack ? 1 : 0,
    u_timeline_pin_key_threshold: settings.pinnedStackMaskThreshold,
  };
}

function getTimelineTransitionOccurrenceSalt(
  state: ResolvedTimelineState,
  timelineRandomSeedToken: string,
  randomSeedSalt = '',
): string {
  return `${state.cycleIndex}:${timelineRandomSeedToken}:${randomSeedSalt}`;
}

function getTimelineStateLookaheadKey(state: ResolvedTimelineState): string {
  return [
    state.currentStep.id,
    state.nextStep?.id ?? 'none',
    state.transitionEffect,
    state.isTransitioning ? 'transition' : 'single',
  ].join(':');
}

function collectTimelineLookaheadStates({
  currentState,
  currentTimeSeconds,
  resolveStateAt,
  depth,
}: {
  currentState: ResolvedTimelineState | null;
  currentTimeSeconds: number;
  resolveStateAt: (timeSeconds: number) => ResolvedTimelineState | null;
  depth: number;
}): ResolvedTimelineState[] {
  if (!currentState || depth <= 0) {
    return [];
  }

  const collectedStates: ResolvedTimelineState[] = [];
  const seenStateKeys = new Set([getTimelineStateLookaheadKey(currentState)]);
  let nextSourceState = currentState;
  let nextTimeSeconds = currentTimeSeconds;

  for (let index = 0; index < depth; index += 1) {
    const remainingStepSeconds = Math.max(
      0,
      clampTimelineStepDuration(nextSourceState.currentStep.durationSeconds) -
        nextSourceState.localTimeSeconds,
    );
    nextTimeSeconds += remainingStepSeconds + PRELOAD_LOOKAHEAD_EPSILON_SECONDS;

    const resolvedState = resolveStateAt(nextTimeSeconds);
    if (!resolvedState) {
      break;
    }

    const stateKey = getTimelineStateLookaheadKey(resolvedState);
    if (seenStateKeys.has(stateKey)) {
      break;
    }

    seenStateKeys.add(stateKey);
    collectedStates.push(resolvedState);
    nextSourceState = resolvedState;
  }

  return collectedStates;
}

interface TimelineStageRendererProps {
  asset: AssetRecord | null;
  assets: AssetRecord[];
  assetUrl: string | null;
  assetUrlStatus?: AssetObjectUrlStatus;
  activeShaderId: string;
  activeShaderName: string;
  activeShaderCode: string;
  activeUniformValues: ShaderUniformValueMap;
  savedShaders: SavedShader[];
  timeline: TimelineStub;
  pinnedStepId?: string | null;
  shaderCompileNonce?: number;
  stageTransform: StageTransform;
  transport: PlaybackTransport;
  forceActiveShaderPreview?: boolean;
  focusedPreviewStepId?: string | null;
  midiManualMix?: {
    enabled: boolean;
    currentStepId: string | null;
    nextStepId: string | null;
    followingStepId?: string | null;
    progress: number;
  };
  preferActiveShaderCompilePreview?: boolean;
  isOutputOnly?: boolean;
  onPinnedIndicatorClick?: () => void;
  onNavigateToTimelineStep?: (stepId: string) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
  onRenderStateChange?: (state: StageRendererState) => void;
  onCompilerError?: (message: string) => void;
  onFrameRendered?: (frame: StageFrameInfo) => void;
}

export function TimelineStageRenderer({
  asset,
  assets,
  assetUrl,
  assetUrlStatus,
  activeShaderId,
  activeShaderName,
  activeShaderCode,
  activeUniformValues,
  savedShaders,
  timeline,
  pinnedStepId = null,
  shaderCompileNonce,
  stageTransform,
  transport,
  forceActiveShaderPreview = false,
  focusedPreviewStepId = null,
  midiManualMix,
  preferActiveShaderCompilePreview = false,
  isOutputOnly,
  onPinnedIndicatorClick,
  onNavigateToTimelineStep,
  onCanvasReady,
  onRenderStateChange,
  onCompilerError,
  onFrameRendered,
}: TimelineStageRendererProps) {
  const [timelineNowMs, setTimelineNowMs] = useState(() => performance.now());
  const [pinTransitionNowMs, setPinTransitionNowMs] = useState(() => performance.now());
  const [modeTransitionNowMs, setModeTransitionNowMs] = useState(() => performance.now());
  const pinLayerTransitionRef = useRef<PinLayerTransitionState | null>(null);
  const modeLayerTransitionRef = useRef<ModeLayerTransitionState | null>(null);
  const previousSequenceModeRef = useRef<TimelineSequenceMode | null>(null);
  const hasMountedPinLayerRef = useRef(false);
  const previousPinnedStepIdRef = useRef<string | null>(null);
  const latestPinnedLayerSnapshotRef = useRef<{
    key: string | null;
    layer: TimelineRenderLayer | null;
  }>({
    key: null,
    layer: null,
  });
  const latestModeLayerSnapshotRef = useRef<{
    mode: TimelineSequenceMode | null;
    layers: TimelineRenderLayer[];
  }>({
    mode: null,
    layers: [],
  });
  const previousTransportSnapshotRef = useRef({
    isPlaying: transport.isPlaying,
    currentTimeSeconds: transport.currentTimeSeconds,
  });
  const transitionProgressHoldRef = useRef<Map<string, number>>(new Map());
  // Raw timeline progress observed when a transition first became renderable
  // (program compiled). Used to restart the visual transition from 0 when the
  // program finished compiling after the scheduled transition start, so the
  // second shader fades in late instead of jumping or stalling the stream.
  const transitionProgressStartRef = useRef<Map<string, number>>(new Map());
  // Shader codes whose WebGL programs are compiled and ready to draw.
  const [compiledShaderCodes, setCompiledShaderCodes] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const [resolvedInputSources, setResolvedInputSources] = useState<
    Record<string, { url: string | null; status: AssetObjectUrlStatus }>
  >({});
  const [decodedAssetVersion, setDecodedAssetVersion] = useState(0);
  const lastReadyTimelineStateRef = useRef<ResolvedTimelineState | null>(null);
  const assetMap = useMemo(
    () => new Map(assets.map((assetRecord) => [assetRecord.id, assetRecord])),
    [assets],
  );
  const workspaceFocusedPreviewEnabled = forceActiveShaderPreview && !isOutputOnly;
  const workspacePersonalPreviewActive = forceActiveShaderPreview && !isOutputOnly;
  const availableShaders = useMemo(() => {
    const liveShader = {
      ...savedShaders.find((shader) => shader.id === activeShaderId),
      id: activeShaderId,
      name: activeShaderName,
      code: activeShaderCode,
      description: 'Current shader from the live editor.',
      group: 'Live',
      uniformValues: activeUniformValues,
    };

    if (savedShaders.some((shader) => shader.id === activeShaderId)) {
      return savedShaders.map((shader) => (shader.id === activeShaderId ? liveShader : shader));
    }

    return [liveShader, ...savedShaders];
  }, [activeShaderCode, activeShaderId, activeShaderName, activeUniformValues, savedShaders]);
  const shaderSequence = timeline.shaderSequence ?? {
    enabled: false,
    mode: 'sequence',
    editorView: 'advanced',
    stagePreviewMode: 'timeline',
    focusedStepId: null,
    pinnedStepId: null,
    randomSeedToken: 'fallback-random-seed',
    singleStepLoopEnabled: false,
    randomChoiceEnabled: false,
    sharedTransitionEnabled: false,
    sharedTransitionEffect: 'mix',
    sharedTransitionDurationSeconds: 0.75,
    steps: [],
  };
  const timelineRandomSeedToken = shaderSequence.randomSeedToken || 'fallback-random-seed';
  const doublePrimaryRandomSeedSalt =
    shaderSequence.mode === 'double' ? `double-primary:${timelineRandomSeedToken}` : '';
  const doubleSecondaryRandomSeedBase =
    shaderSequence.mode === 'double' ? `double-secondary:${timelineRandomSeedToken}` : '';
  const primaryRandomSeedSalt =
    shaderSequence.mode === 'double'
      ? doublePrimaryRandomSeedSalt
      : shaderSequence.mode === 'random' ||
          shaderSequence.mode === 'randomMix' ||
          shaderSequence.randomChoiceEnabled
        ? `random:${timelineRandomSeedToken}`
        : '';
  const playbackTimelineSteps = useMemo(
    () => excludePinnedStepFromTimelinePlayback(shaderSequence.steps, pinnedStepId),
    [pinnedStepId, shaderSequence.steps],
  );
  const sequenceEnabled = playbackTimelineSteps.length > 0;
  const shouldResolveLiveTimelineState = sequenceEnabled && !workspaceFocusedPreviewEnabled;
  const referencedInputAssetIds = useMemo(() => {
    const shaderById = new Map(savedShaders.map((shader) => [shader.id, shader]));
    const assetIds = new Set<string>();

    for (const shader of savedShaders) {
      if (shader.inputAssetId) {
        assetIds.add(shader.inputAssetId);
      }
    }

    for (const step of shaderSequence.steps) {
      const stepShader = shaderById.get(step.shaderId);
      if (stepShader?.inputAssetId) {
        assetIds.add(stepShader.inputAssetId);
      }
    }

    if (pinnedStepId) {
      const pinnedStep = shaderSequence.steps.find((step) => step.id === pinnedStepId);
      const pinnedShader = pinnedStep ? shaderById.get(pinnedStep.shaderId) : null;
      if (pinnedShader?.inputAssetId) {
        assetIds.add(pinnedShader.inputAssetId);
      }
    }

    return Array.from(assetIds);
  }, [pinnedStepId, savedShaders, shaderSequence.steps]);
  const referencedInputAssetSignature = useMemo(
    () => referencedInputAssetIds.join('\u0001'),
    [referencedInputAssetIds],
  );

  useEffect(() => {
    let disposed = false;

    // Release object URLs of assets that no longer exist in the project so
    // long sessions do not leak the underlying blobs.
    for (const [cachedAssetId, cachedObjectUrl] of timelineAssetUrlCache.entries()) {
      if (assetMap.has(cachedAssetId)) {
        continue;
      }

      URL.revokeObjectURL(cachedObjectUrl);
      timelineAssetUrlCache.delete(cachedAssetId);
      timelineDecodedAssetIds.delete(cachedAssetId);
    }

    const nextKnownSources = referencedInputAssetIds.reduce<
      Record<string, { url: string | null; status: AssetObjectUrlStatus }>
    >((collection, assetId) => {
      const assetRecord = assetMap.get(assetId);
      if (!assetRecord) {
        collection[assetId] = {
          url: null,
          status: 'missing',
        };
        return collection;
      }

      const cachedUrl = getBundledAssetUrl(assetId) ?? timelineAssetUrlCache.get(assetId) ?? null;
      collection[assetId] = {
        url: cachedUrl,
        status: cachedUrl ? 'ready' : 'loading',
      };
      return collection;
    }, {});

    setResolvedInputSources(nextKnownSources);

    const missingAssetRecords = referencedInputAssetIds
      .map((assetId) => assetMap.get(assetId) ?? null)
      .filter((assetRecord): assetRecord is AssetRecord => {
        if (!assetRecord) {
          return false;
        }
        if (getBundledAssetUrl(assetRecord.id)) {
          return false;
        }

        return !timelineAssetUrlCache.has(assetRecord.id);
      });
    if (missingAssetRecords.length === 0) {
      return () => {
        disposed = true;
      };
    }

    void Promise.all(
      missingAssetRecords.map(async (assetRecord) => {
        const blob = await getAssetBlob(assetRecord.id);
        if (!blob) {
          return [assetRecord.id, null] as const;
        }

        const objectUrl = URL.createObjectURL(blob);
        timelineAssetUrlCache.set(assetRecord.id, objectUrl);
        return [assetRecord.id, objectUrl] as const;
      }),
    ).then((entries) => {
      if (disposed) {
        return;
      }

      setResolvedInputSources(() => {
        const nextValue = referencedInputAssetIds.reduce<
          Record<string, { url: string | null; status: AssetObjectUrlStatus }>
        >((collection, assetId) => {
          const cachedUrl = getBundledAssetUrl(assetId) ?? timelineAssetUrlCache.get(assetId) ?? null;
          const assetRecord = assetMap.get(assetId);
          const resolvedEntry = entries.find(([entryAssetId]) => entryAssetId === assetId);
          const resolvedUrl = resolvedEntry?.[1] ?? cachedUrl;
          collection[assetId] = {
            url: resolvedUrl,
            status: assetRecord ? (resolvedUrl ? 'ready' : 'missing') : 'missing',
          };
          return collection;
        }, {});

        return nextValue;
      });
    });

    return () => {
      disposed = true;
    };
  }, [assetMap, referencedInputAssetIds, referencedInputAssetSignature]);

  useEffect(() => {
    let disposed = false;

    for (const assetId of referencedInputAssetIds) {
      if (timelineDecodedAssetIds.has(assetId)) {
        continue;
      }

      const resolved = resolvedInputSources[assetId];
      const assetRecord = assetMap.get(assetId);
      if (!resolved?.url || !assetRecord) {
        continue;
      }

      if (assetRecord.kind === 'image') {
        const image = new Image();
        image.decoding = 'async';
        image.crossOrigin = 'anonymous';
        image.onload = () => {
          if (disposed) {
            return;
          }

          timelineDecodedAssetIds.add(assetId);
          setDecodedAssetVersion((currentValue) => currentValue + 1);
        };
        image.onerror = () => {
          if (disposed) {
            return;
          }

          timelineDecodedAssetIds.add(assetId);
          setDecodedAssetVersion((currentValue) => currentValue + 1);
        };
        image.src = resolved.url;
        continue;
      }

      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.crossOrigin = 'anonymous';
      video.onloadeddata = () => {
        if (disposed) {
          return;
        }

        timelineDecodedAssetIds.add(assetId);
        setDecodedAssetVersion((currentValue) => currentValue + 1);
      };
      video.onerror = () => {
        if (disposed) {
          return;
        }

        timelineDecodedAssetIds.add(assetId);
        setDecodedAssetVersion((currentValue) => currentValue + 1);
      };
      video.src = resolved.url;
    }

    return () => {
      disposed = true;
    };
  }, [assetMap, referencedInputAssetIds, referencedInputAssetSignature, resolvedInputSources]);
  const activeSavedShader = useMemo(
    () => availableShaders.find((shader) => shader.id === activeShaderId) ?? null,
    [activeShaderId, availableShaders],
  );
  const effectiveFocusedStepId =
    workspaceFocusedPreviewEnabled
      ? focusedPreviewStepId ?? shaderSequence.focusedStepId ?? null
      : shaderSequence.focusedStepId ?? null;
  const focusedSequenceStep = useMemo(() => {
    if (!effectiveFocusedStepId) {
      return null;
    }

    return shaderSequence.steps.find((step) => step.id === effectiveFocusedStepId) ?? null;
  }, [effectiveFocusedStepId, shaderSequence.steps]);
  const focusedSequenceShader = useMemo(() => {
    if (!focusedSequenceStep) {
      return null;
    }

    return availableShaders.find((shader) => shader.id === focusedSequenceStep.shaderId) ?? null;
  }, [availableShaders, focusedSequenceStep]);
  const pinnedSequenceStep = useMemo(() => {
    if (!pinnedStepId) {
      return null;
    }

    return shaderSequence.steps.find((step) => step.id === pinnedStepId && !step.disabled) ?? null;
  }, [pinnedStepId, shaderSequence.steps]);
  const pinnedSequenceShader = useMemo(() => {
    if (!pinnedSequenceStep) {
      return null;
    }

    return availableShaders.find((shader) => shader.id === pinnedSequenceStep.shaderId) ?? null;
  }, [availableShaders, pinnedSequenceStep]);

  // Shader animation time flows through StageRenderer's own render loop, so a
  // React re-render is only needed when the resolved timeline state actually
  // changes shape (step boundary, transition start/end, cycle wrap) or while a
  // continuously animated value is on screen (transition progress, double-mode
  // automata, MIDI manual mixing). The probe below is refreshed every render
  // and lets the ticker decide per frame whether a re-render is required,
  // which keeps steady single-shader playback almost free of React churn.
  const timelineTickProbeRef = useRef<(timestamp: number) => { signature: string; continuous: boolean }>(
    () => ({ signature: '', continuous: true }),
  );

  useEffect(() => {
    timelineTickProbeRef.current = (timestamp: number) => {
      if (midiManualMix?.enabled) {
        return { signature: 'midi-manual', continuous: true };
      }

      const timeSeconds = getTransportTimeSeconds(transport, timestamp);
      const state = resolveShaderTimelineState({
        shaders: availableShaders,
        mode: shaderSequence.mode ?? 'sequence',
        focusedStepId: shaderSequence.focusedStepId ?? null,
        singleStepLoopEnabled: shaderSequence.singleStepLoopEnabled ?? false,
        randomChoiceEnabled: shaderSequence.randomChoiceEnabled ?? false,
        sharedTransitionEnabled: shaderSequence.sharedTransitionEnabled ?? false,
        sharedTransitionEffect: shaderSequence.sharedTransitionEffect ?? 'mix',
        sharedTransitionDurationSeconds: shaderSequence.sharedTransitionDurationSeconds ?? 0.75,
        sharedSectionDurationSeconds: shaderSequence.sharedSectionDurationSeconds ?? 8,
        steps: playbackTimelineSteps,
        timeSeconds,
        loop: transport.loop,
        randomSeedSalt: primaryRandomSeedSalt,
      });
      const continuous =
        (shaderSequence.mode ?? 'sequence') === 'double' || Boolean(state?.isTransitioning);
      const signature = state
        ? [
            state.currentStep.id,
            state.nextStep?.id ?? '',
            state.isTransitioning ? 1 : 0,
            state.cycleIndex,
          ].join('|')
        : 'none';

      return { signature, continuous };
    };
  });

  useEffect(() => {
    if (!shouldResolveLiveTimelineState || !transport.isPlaying) {
      setTimelineNowMs(performance.now());
      return;
    }

    let frameId = 0;
    let lastSignature: string | null = null;
    const tick = (timestamp: number) => {
      const { signature, continuous } = timelineTickProbeRef.current(timestamp);
      if (continuous || lastSignature === null || signature !== lastSignature) {
        setTimelineNowMs(timestamp);
      }
      lastSignature = signature;
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [
    shouldResolveLiveTimelineState,
    transport.anchorTimestampMs,
    transport.currentTimeSeconds,
    transport.isPlaying,
    transport.loop,
    transport.playbackRate,
  ]);

  const transportTimeSeconds = useMemo(
    () => getTransportTimeSeconds(transport, timelineNowMs),
    [timelineNowMs, transport],
  );
  const secondaryTimelineTimeSeconds = transportTimeSeconds * DOUBLE_SECONDARY_SPEED;

  useEffect(() => {
    const previousTransportSnapshot = previousTransportSnapshotRef.current;
    const rewoundToStart =
      !transport.isPlaying &&
      previousTransportSnapshot.currentTimeSeconds > DOUBLE_RANDOM_RESEED_EPSILON_SECONDS &&
      transport.currentTimeSeconds <= DOUBLE_RANDOM_RESEED_EPSILON_SECONDS;
    const restartedPlaybackFromStart =
      transport.isPlaying &&
      transport.currentTimeSeconds <= DOUBLE_RANDOM_RESEED_EPSILON_SECONDS &&
      (!previousTransportSnapshot.isPlaying ||
        previousTransportSnapshot.currentTimeSeconds > DOUBLE_RANDOM_RESEED_EPSILON_SECONDS);

    if (restartedPlaybackFromStart || rewoundToStart) {
      transitionProgressHoldRef.current.clear();
      transitionProgressStartRef.current.clear();
    }

    previousTransportSnapshotRef.current = {
      isPlaying: transport.isPlaying,
      currentTimeSeconds: transport.currentTimeSeconds,
    };
  }, [transport.currentTimeSeconds, transport.isPlaying]);

  useEffect(() => {
    transitionProgressHoldRef.current.clear();
    transitionProgressStartRef.current.clear();
  }, [timelineRandomSeedToken]);

  const availableShaderById = useMemo(
    () => new Map(availableShaders.map((shader) => [shader.id, shader])),
    [availableShaders],
  );

  const createMidiManualTimelineState = useCallback((
    currentStepId: string,
    nextStepId: string,
    progress: number,
  ): ResolvedTimelineState | null => {
    const currentStep =
      playbackTimelineSteps.find((step) => step.id === currentStepId) ?? null;
    const nextStep =
      playbackTimelineSteps.find((step) => step.id === nextStepId) ?? null;
    const currentShader = currentStep ? availableShaderById.get(currentStep.shaderId) ?? null : null;
    const nextShader = nextStep ? availableShaderById.get(nextStep.shaderId) ?? null : null;

    if (!currentStep || !nextStep || !currentShader || !nextShader) {
      return null;
    }

    const transitionDurationSeconds =
      shaderSequence.sharedTransitionEnabled
        ? shaderSequence.sharedTransitionDurationSeconds ?? 0.75
        : currentStep.transitionDurationSeconds;
    const transitionProgress = Math.max(0, Math.min(1, progress));

    return {
      currentStep,
      currentShader,
      nextStep,
      nextShader,
      stepStartSeconds: 0,
      stepEndSeconds: clampTimelineStepDuration(currentStep.durationSeconds),
      localTimeSeconds: 0,
      totalDurationSeconds: clampTimelineStepDuration(currentStep.durationSeconds),
      transitionProgress,
      transitionEffect: shaderSequence.sharedTransitionEnabled
        ? shaderSequence.sharedTransitionEffect ?? 'mix'
        : currentStep.transitionEffect,
      transitionStartSeconds: 0,
      transitionDurationSeconds,
      cycleIndex: 0,
      isTransitioning: true,
    } satisfies ResolvedTimelineState;
  }, [
    availableShaderById,
    playbackTimelineSteps,
    shaderSequence.sharedTransitionDurationSeconds,
    shaderSequence.sharedTransitionEffect,
    shaderSequence.sharedTransitionEnabled,
  ]);

  const timelineState = useMemo(() => {
    if (!shouldResolveLiveTimelineState) {
      return null;
    }

    if (
      midiManualMix?.enabled &&
      midiManualMix.currentStepId &&
      midiManualMix.nextStepId
    ) {
      return createMidiManualTimelineState(
        midiManualMix.currentStepId,
        midiManualMix.nextStepId,
        midiManualMix.progress,
      );
    }

    return resolveShaderTimelineState({
      shaders: availableShaders,
      mode: shaderSequence.mode ?? 'sequence',
      focusedStepId: shaderSequence.focusedStepId ?? null,
      singleStepLoopEnabled: shaderSequence.singleStepLoopEnabled ?? false,
      randomChoiceEnabled: shaderSequence.randomChoiceEnabled ?? false,
      sharedTransitionEnabled: shaderSequence.sharedTransitionEnabled ?? false,
      sharedTransitionEffect: shaderSequence.sharedTransitionEffect ?? 'mix',
      sharedTransitionDurationSeconds: shaderSequence.sharedTransitionDurationSeconds ?? 0.75,
      sharedSectionDurationSeconds: shaderSequence.sharedSectionDurationSeconds ?? 8,
      steps: playbackTimelineSteps,
      timeSeconds: transportTimeSeconds,
      loop: transport.loop,
      randomSeedSalt: primaryRandomSeedSalt,
    });
  }, [
    availableShaders,
    createMidiManualTimelineState,
    doublePrimaryRandomSeedSalt,
    primaryRandomSeedSalt,
    shouldResolveLiveTimelineState,
    midiManualMix,
    playbackTimelineSteps,
    shaderSequence.focusedStepId,
    shaderSequence.mode,
    shaderSequence.randomChoiceEnabled,
    shaderSequence.sharedTransitionEnabled,
    shaderSequence.sharedSectionDurationSeconds,
    shaderSequence.sharedTransitionDurationSeconds,
    shaderSequence.sharedTransitionEffect,
    shaderSequence.singleStepLoopEnabled,
    transport.loop,
    transportTimeSeconds,
  ]);

  const midiManualLookaheadTimelineState = useMemo(() => {
    if (
      !midiManualMix?.enabled ||
      !midiManualMix.nextStepId ||
      !midiManualMix.followingStepId
    ) {
      return null;
    }

    return createMidiManualTimelineState(
      midiManualMix.nextStepId,
      midiManualMix.followingStepId,
      PRELOAD_TRANSITION_PROGRESS,
    );
  }, [
    createMidiManualTimelineState,
    midiManualMix?.enabled,
    midiManualMix?.followingStepId,
    midiManualMix?.nextStepId,
  ]);

  const renderTimelineState = useMemo(() => {
    if (!timelineState) {
      return null;
    }

    if (timelinePlaybackStateNeedsDeferredMedia(timelineState, resolvedInputSources)) {
      return lastReadyTimelineStateRef.current;
    }

    lastReadyTimelineStateRef.current = timelineState;
    return timelineState;
  }, [decodedAssetVersion, resolvedInputSources, timelineState]);

  const secondaryTimelineResolution = useMemo(() => {
    if (!shouldResolveLiveTimelineState || shaderSequence.mode !== 'double') {
      return {
        state: null as ResolvedTimelineState | null,
        randomSeedSalt: '',
      };
    }

    const secondaryRandomSeedSalt = `${doubleSecondaryRandomSeedBase}:secondary`;
    const secondaryState = resolveShaderTimelineState({
      shaders: availableShaders,
      mode: 'randomMix',
      focusedStepId: shaderSequence.focusedStepId ?? null,
      singleStepLoopEnabled: shaderSequence.singleStepLoopEnabled ?? false,
      randomChoiceEnabled: false,
      sharedTransitionEnabled: true,
      sharedTransitionEffect: shaderSequence.sharedTransitionEffect ?? 'mix',
      sharedTransitionDurationSeconds: shaderSequence.sharedTransitionDurationSeconds ?? 0.75,
      sharedSectionDurationSeconds: shaderSequence.sharedSectionDurationSeconds ?? 8,
      steps: playbackTimelineSteps,
      timeSeconds: secondaryTimelineTimeSeconds,
      loop: transport.loop,
      randomSeedSalt: secondaryRandomSeedSalt,
    });

    return {
      state: secondaryState,
      randomSeedSalt: secondaryRandomSeedSalt,
    };
  }, [
    availableShaders,
    doubleSecondaryRandomSeedBase,
    shouldResolveLiveTimelineState,
    secondaryTimelineTimeSeconds,
    shaderSequence.focusedStepId,
    shaderSequence.mode,
    shaderSequence.sharedTransitionDurationSeconds,
    shaderSequence.sharedTransitionEffect,
    shaderSequence.singleStepLoopEnabled,
    playbackTimelineSteps,
    transport.loop,
  ]);
  const secondaryTimelineState = secondaryTimelineResolution.state;

  const renderableActiveShaderCode = activeSavedShader
    ? getRenderableShaderCode(activeSavedShader)
    : activeShaderCode;
  const renderableActiveUniformValues = activeSavedShader
    ? getRenderableShaderUniformValues(activeSavedShader)
    : activeUniformValues;
  const previewActiveShaderCode = preferActiveShaderCompilePreview
    ? activeShaderCode
    : renderableActiveShaderCode;
  const previewActiveUniformValues = useMemo(
    () =>
      preferActiveShaderCompilePreview
        ? syncUniformValues(activeUniformValues, parseUniforms(activeShaderCode))
        : renderableActiveUniformValues,
    [
      activeShaderCode,
      activeUniformValues,
      preferActiveShaderCompilePreview,
      renderableActiveUniformValues,
    ],
  );

  const resolveShaderOverlaySource = useCallback((
    shader: SavedShader | null | undefined,
    step: TimelineSequenceStep | null | undefined,
    scope: string,
  ): StageRenderInputSource | null => {
    const inputAssetId = shader?.inputAssetId ?? null;
    if (!inputAssetId) {
      return null;
    }
    const assetSettings = normalizeTimelineStepAssetSettings(step?.assetSettings);

    if (asset && inputAssetId === asset.id) {
      return {
        sourceKey: createTimelineAssetSourceKey(asset.id, scope, assetSettings),
        assetId: asset.id,
        assetName: asset.name,
        kind: asset.kind,
        url: assetUrl,
        status: assetUrlStatus ?? (assetUrl ? 'ready' : 'loading'),
        clipStartSeconds: asset.kind === 'video' ? assetSettings.clipStartSeconds : 0,
        clipDurationSeconds: asset.kind === 'video' ? assetSettings.clipDurationSeconds : null,
        quality: assetSettings.quality,
      };
    }

    const sourceAsset = assetMap.get(inputAssetId) ?? null;
    if (!sourceAsset) {
      return {
        sourceKey: createTimelineAssetSourceKey(inputAssetId, scope, assetSettings),
        assetId: inputAssetId,
        assetName: 'Assigned asset',
        kind: 'image',
        url: null,
        status: 'missing',
        clipStartSeconds: 0,
        clipDurationSeconds: null,
        quality: assetSettings.quality,
      };
    }

    const resolvedSource = resolvedInputSources[inputAssetId];

    return {
      sourceKey: createTimelineAssetSourceKey(sourceAsset.id, scope, assetSettings),
      assetId: sourceAsset.id,
      assetName: sourceAsset.name,
      kind: sourceAsset.kind,
      url: resolvedSource?.url ?? null,
      status: resolvedSource?.status ?? 'loading',
      clipStartSeconds: sourceAsset.kind === 'video' ? assetSettings.clipStartSeconds : 0,
      clipDurationSeconds: sourceAsset.kind === 'video' ? assetSettings.clipDurationSeconds : null,
      quality: assetSettings.quality,
    };
  }, [asset, assetMap, assetUrl, assetUrlStatus, resolvedInputSources]);

  const resolveShaderLayer = useCallback((
    shader: SavedShader | null | undefined,
    step: TimelineSequenceStep | null | undefined,
    scope: string,
    options?: ResolveShaderLayerOptions,
  ): ResolvedShaderLayer => {
    const targetShader = shader ?? activeSavedShader;
    const isActiveShader =
      !options?.preferStepSnapshot && targetShader?.id === activeShaderId;
    const assetSettings = normalizeTimelineStepAssetSettings(step?.assetSettings);
    const assignedSource = resolveShaderOverlaySource(targetShader, step, scope);
    const useAssignedAssetAsBase = Boolean(
      assetSettings.useStepAssetAsShaderBase && assignedSource,
    );
    const overlaySource = useAssignedAssetAsBase ? null : assignedSource;
    const inputSource = useAssignedAssetAsBase ? assignedSource : null;

    if (isActiveShader) {
      return {
        shaderCode: previewActiveShaderCode,
        uniformValues: previewActiveUniformValues,
        usedFallback:
          !preferActiveShaderCompilePreview && hasShaderCompileError(activeSavedShader),
        inputSource,
        overlaySource,
        assetSettings,
      };
    }

    if (!targetShader) {
      return {
        shaderCode: previewActiveShaderCode,
        uniformValues: previewActiveUniformValues,
        usedFallback: false,
        inputSource: null,
        overlaySource: null,
        assetSettings,
      };
    }

    return {
      shaderCode: getRenderableShaderCode(targetShader),
      uniformValues: getRenderableShaderUniformValues(targetShader),
      usedFallback: hasShaderCompileError(targetShader),
      inputSource,
      overlaySource,
      assetSettings,
    };
  }, [
    activeSavedShader,
    activeShaderId,
    preferActiveShaderCompilePreview,
    previewActiveShaderCode,
    previewActiveUniformValues,
    resolveShaderOverlaySource,
  ]);

  const buildSingleShaderLayer = useCallback((
    layer: ResolvedShaderLayer,
  ): TimelineRenderLayer => {
    if (layer.inputSource) {
      return {
        kind: 'single',
        shaderCode: layer.shaderCode,
        uniformValues: layer.uniformValues,
        usedFallback: layer.usedFallback,
        inputSource: layer.inputSource,
        overlaySource: null,
      };
    }

    if (!layer.overlaySource) {
      return {
        kind: 'single',
        shaderCode: layer.shaderCode,
        uniformValues: layer.uniformValues,
        usedFallback: layer.usedFallback,
        inputSource: null,
        overlaySource: null,
      };
    }

    return {
      kind: 'single',
      shaderCode: buildTimelineOverlayShaderCode({
        shaderCode: layer.shaderCode,
      }),
      uniformValues: {
        u_timeline_has_overlay: true,
        ...buildOverlayUniformValues('u_timeline_overlay', layer.assetSettings),
        ...prefixUniformValueKeys({
          sourceValues: layer.uniformValues,
          namespace: 'timeline_base',
        }),
      },
      usedFallback: layer.usedFallback,
      inputSource: null,
      overlaySource: layer.overlaySource,
    };
  }, []);

  const buildPinnedCompareLayer = useCallback((
    resolvedLayer: ResolvedShaderLayer,
  ): TimelineRenderLayer => {
    const { pinnedCompositeMode, pinnedStackMaskMode } = resolvedLayer.assetSettings;
    const usesTransparentOverlay = pinnedCompositeMode === 'blend';
    const keyBlack = pinnedStackMaskMode === 'nonBlack';
    const pinCompositeSettings = {
      compositeMode: pinnedCompositeMode,
      requiresCompositeBase: usesTransparentOverlay,
    };
    const applyKeyBlack = !usesTransparentOverlay && keyBlack;
    const baseLayer = buildSingleShaderLayer(resolvedLayer);
    const prefixedBaseUniformValues = prefixUniformValueKeys({
      sourceValues: baseLayer.uniformValues,
      namespace: 'timeline_pin',
    });

    if (usesTransparentOverlay) {
      return {
        ...baseLayer,
        shaderCode: buildTimelinePinShaderAlphaOverlayShaderCode(baseLayer.shaderCode),
        uniformValues: {
          ...prefixedBaseUniformValues,
          u_timeline_overlay_opacity: resolvedLayer.assetSettings.opacity,
        },
        ...pinCompositeSettings,
      };
    }

    return {
      ...baseLayer,
      shaderCode: buildTimelinePinStackShaderOutputShaderCode(baseLayer.shaderCode),
      uniformValues: {
        ...prefixedBaseUniformValues,
        ...buildPinnedCompositeUniformValues(resolvedLayer.assetSettings, applyKeyBlack),
      },
      ...pinCompositeSettings,
    };
  }, [buildSingleShaderLayer]);

  const liveTimelineState = timelineState;

  const resolveTimelineStepLayer = useCallback((
    shader: SavedShader | null | undefined,
    step: TimelineSequenceStep | null | undefined,
    options?: ResolveShaderLayerOptions,
  ): ResolvedShaderLayer => {
    const stepScope = step ? `step:${step.id}:current` : 'shader:current';
    return resolveShaderLayer(shader, step, stepScope, options);
  }, [resolveShaderLayer]);

  const buildTimelineRenderLayer = useCallback((
    state: NonNullable<typeof timelineState>,
  ): TimelineRenderLayer => {
    const timelineLayerOptions = {
      preferStepSnapshot: shouldResolveLiveTimelineState,
    } satisfies ResolveShaderLayerOptions;
    const currentLayer = resolveTimelineStepLayer(
      state.currentShader,
      state.currentStep,
      timelineLayerOptions,
    );

    if (state.nextShader && state.nextStep) {
      const nextLayer = resolveTimelineStepLayer(
        state.nextShader,
        state.nextStep,
        timelineLayerOptions,
      );
      const nextMediaReady = isTimelineStepMediaResolved(state.nextShader, resolvedInputSources);
      const transitionOccurrenceSalt = getTimelineTransitionOccurrenceSalt(
        state,
        timelineRandomSeedToken,
        doublePrimaryRandomSeedSalt,
      );
      const pairKey = `${state.currentStep.id}:${state.nextStep.id}:${state.transitionEffect}:${transitionOccurrenceSalt}`;
      const transitionSeed = getTimelineTransitionSeed(
        state.currentStep.id,
        state.nextStep.id,
        transitionOccurrenceSalt,
      );
      const transitionShaderCode = buildTimelineTransitionShaderCode({
        fromCode: currentLayer.shaderCode,
        toCode: nextLayer.shaderCode,
        effect: state.transitionEffect,
      });
      // During live playback, never put a still-compiling transition program on
      // screen: keep playing the current shader alone and let the combined
      // program finish compiling in the background (it stays queued through the
      // preload layers). When it becomes ready the transition starts from zero
      // at that moment, so the next shader appears slightly later instead of
      // stalling or jumping the stream. Paused/scrub/export rendering skips the
      // gate because those consumers wait for compilation explicitly.
      const liveGatingActive =
        shouldResolveLiveTimelineState && transport.isPlaying && !midiManualMix?.enabled;
      const transitionProgramReady = compiledShaderCodes.has(transitionShaderCode);

      if (liveGatingActive && !transitionProgramReady) {
        return buildSingleShaderLayer(currentLayer);
      }

      let transitionProgress = 0;
      if (state.isTransitioning) {
        const rawProgress = Math.max(0, Math.min(1, state.transitionProgress));
        let startProgress = 0;
        if (liveGatingActive) {
          const heldStartProgress = transitionProgressStartRef.current.get(pairKey);
          startProgress = heldStartProgress ?? rawProgress;
          if (heldStartProgress === undefined) {
            transitionProgressStartRef.current.set(pairKey, startProgress);
          }
        }
        const normalizedProgress =
          startProgress >= 0.999 ? 1 : (rawProgress - startProgress) / (1 - startProgress);
        const requestedProgress = easeTransitionProgress(normalizedProgress);
        const currentHeldProgress = transitionProgressHoldRef.current.get(pairKey) ?? 0;
        transitionProgress = midiManualMix?.enabled
          ? requestedProgress
          : Math.max(currentHeldProgress, requestedProgress);
        transitionProgressHoldRef.current.set(pairKey, transitionProgress);
      } else {
        transitionProgressHoldRef.current.set(pairKey, 0);
        transitionProgressStartRef.current.delete(pairKey);
      }

      return {
        kind: 'transition',
        shaderCode: transitionShaderCode,
        uniformValues: {
          u_transition_progress: transitionProgress,
          u_transition_seed: transitionSeed,
          u_transition_duration: Math.max(
            state.transitionDurationSeconds,
            state.isTransitioning ? 0.001 : 0.75,
          ),
          u_timeline_from_has_overlay: Boolean(currentLayer.overlaySource),
          u_timeline_to_has_overlay: nextMediaReady && Boolean(nextLayer.overlaySource),
          ...buildOverlayUniformValues('u_timeline_from_overlay', currentLayer.assetSettings),
          ...(nextMediaReady
            ? buildOverlayUniformValues('u_timeline_to_overlay', nextLayer.assetSettings)
            : buildOverlayUniformValues('u_timeline_to_overlay', currentLayer.assetSettings)),
          ...prefixUniformValueKeys({
            sourceValues: currentLayer.uniformValues,
            namespace: 'timeline_from',
          }),
          ...(nextMediaReady
            ? prefixUniformValueKeys({
                sourceValues: nextLayer.uniformValues,
                namespace: 'timeline_to',
              })
            : prefixUniformValueKeys({
                sourceValues: currentLayer.uniformValues,
                namespace: 'timeline_to',
              })),
        },
        usedFallback: currentLayer.usedFallback || nextLayer.usedFallback,
        transitionInputSources: {
          from: currentLayer.inputSource ?? null,
          to: nextMediaReady
            ? nextLayer.inputSource ?? null
            : currentLayer.inputSource ?? null,
        },
        transitionOverlaySources: {
          from: currentLayer.overlaySource ?? null,
          to: nextMediaReady
            ? nextLayer.overlaySource ?? null
            : currentLayer.overlaySource ?? null,
        },
      };
    }

    return buildSingleShaderLayer(currentLayer);
  }, [
    buildSingleShaderLayer,
    compiledShaderCodes,
    resolveTimelineStepLayer,
    resolvedInputSources,
    shouldResolveLiveTimelineState,
    timelineRandomSeedToken,
    doublePrimaryRandomSeedSalt,
    midiManualMix?.enabled,
    transport.isPlaying,
  ]);

  const buildDoubleAutomataRenderLayer = useCallback((
    primaryState: ResolvedTimelineState,
    secondaryState: ResolvedTimelineState,
  ): TimelineRenderLayer => {
    const primaryLayer = buildTimelineRenderLayer(primaryState);
    const secondaryLayer = buildTimelineRenderLayer(secondaryState);
    const transitionSeed = getTimelineTransitionSeed(
      'double-primary',
      'double-secondary',
      `${doublePrimaryRandomSeedSalt}:${primaryState.cycleIndex}`,
    );
    const shaderCode = buildTimelineTransitionShaderCode({
      fromCode: primaryLayer.shaderCode,
      toCode: secondaryLayer.shaderCode,
      effect: 'noise',
    });

    return {
      kind: 'transition',
      shaderCode,
      uniformValues: {
        u_transition_progress: getDoubleAutomataBalancedProgress(transportTimeSeconds),
        u_transition_seed: transitionSeed,
        u_transition_duration: DOUBLE_AUTOMATA_MOTION_SECONDS,
        u_timeline_from_has_overlay: Boolean(primaryLayer.overlaySource),
        u_timeline_to_has_overlay: Boolean(secondaryLayer.overlaySource),
        ...prefixUniformValueKeys({
          sourceValues: primaryLayer.uniformValues,
          namespace: 'timeline_from',
        }),
        ...prefixUniformValueKeys({
          sourceValues: secondaryLayer.uniformValues,
          namespace: 'timeline_to',
        }),
      },
      usedFallback: primaryLayer.usedFallback || secondaryLayer.usedFallback,
      transitionInputSources: {
        from: primaryLayer.inputSource ?? null,
        to: secondaryLayer.inputSource ?? null,
      },
      transitionOverlaySources: {
        from: primaryLayer.overlaySource ?? null,
        to: secondaryLayer.overlaySource ?? null,
      },
    };
  }, [
    buildTimelineRenderLayer,
    doublePrimaryRandomSeedSalt,
    transportTimeSeconds,
  ]);

  const buildTransitionPreloadLayer = useCallback((
    state: NonNullable<typeof timelineState>,
  ): StageRenderLayer | null => {
    if (!state.nextShader || !state.nextStep) {
      return null;
    }

    const timelineLayerOptions = {
      preferStepSnapshot: shouldResolveLiveTimelineState,
    } satisfies ResolveShaderLayerOptions;
    const currentLayer = resolveTimelineStepLayer(
      state.currentShader,
      state.currentStep,
      timelineLayerOptions,
    );
    const nextLayer = resolveTimelineStepLayer(
      state.nextShader,
      state.nextStep,
      timelineLayerOptions,
    );
    const transitionOccurrenceSalt = getTimelineTransitionOccurrenceSalt(
      state,
      timelineRandomSeedToken,
      doublePrimaryRandomSeedSalt,
    );
    const transitionSeed = getTimelineTransitionSeed(
      state.currentStep.id,
      state.nextStep.id,
      transitionOccurrenceSalt,
    );
    const shaderCode = buildTimelineTransitionShaderCode({
      fromCode: currentLayer.shaderCode,
      toCode: nextLayer.shaderCode,
      effect: state.transitionEffect,
    });

    return {
      shaderCode,
      uniformDefinitions: parseUniforms(shaderCode),
      uniformValues: {
        u_transition_progress: PRELOAD_TRANSITION_PROGRESS,
        u_transition_seed: transitionSeed,
        u_transition_duration: Math.max(state.transitionDurationSeconds, 0.001),
        u_timeline_from_has_overlay: Boolean(currentLayer.overlaySource),
        u_timeline_to_has_overlay: Boolean(nextLayer.overlaySource),
        ...buildOverlayUniformValues('u_timeline_from_overlay', currentLayer.assetSettings),
        ...buildOverlayUniformValues('u_timeline_to_overlay', nextLayer.assetSettings),
        ...prefixUniformValueKeys({
          sourceValues: currentLayer.uniformValues,
          namespace: 'timeline_from',
        }),
        ...prefixUniformValueKeys({
          sourceValues: nextLayer.uniformValues,
          namespace: 'timeline_to',
        }),
      },
      opacity: 1,
      transitionInputSources: {
        from: currentLayer.inputSource ?? null,
        to: nextLayer.inputSource ?? null,
      },
      transitionOverlaySources: {
        from: currentLayer.overlaySource ?? null,
        to: nextLayer.overlaySource ?? null,
      },
    };
  }, [resolveTimelineStepLayer, shouldResolveLiveTimelineState, timelineRandomSeedToken, doublePrimaryRandomSeedSalt]);

  const createStageRenderLayer = useCallback((
    layer: TimelineRenderLayer,
    opacity: number,
  ): StageRenderLayer => ({
    shaderCode: layer.shaderCode,
    uniformDefinitions: parseUniforms(layer.shaderCode),
    uniformValues: layer.uniformValues,
    opacity,
    inputSource: layer.inputSource ?? null,
    overlaySource: layer.overlaySource ?? null,
    transitionInputSources: layer.transitionInputSources ?? null,
    transitionOverlaySources: layer.transitionOverlaySources ?? null,
    compositeMode: layer.compositeMode,
    requiresCompositeBase: layer.requiresCompositeBase,
  }), []);

  const buildSingleStepPreloadLayer = useCallback((
    shader: SavedShader | null | undefined,
    step: TimelineSequenceStep | null | undefined,
  ): StageRenderLayer | null => {
    if (!shader || !step) {
      return null;
    }

    const timelineLayerOptions = {
      preferStepSnapshot: shouldResolveLiveTimelineState,
    } satisfies ResolveShaderLayerOptions;
    const layer = buildSingleShaderLayer(
      resolveTimelineStepLayer(shader, step, timelineLayerOptions),
    );

    return createStageRenderLayer(layer, 1);
  }, [
    buildSingleShaderLayer,
    createStageRenderLayer,
    resolveTimelineStepLayer,
    shouldResolveLiveTimelineState,
  ]);

  const timelineWarmupSources = useMemo(() => {
    const sources = new Map<string, StageRenderInputSource>();

    // Warmup sources reuse the exact playback scopes so they share the same
    // texture/video element with the live render layers instead of creating a
    // duplicate decoder per asset.
    for (const step of shaderSequence.steps) {
      const stepShader = availableShaders.find((shader) => shader.id === step.shaderId);
      if (!stepShader) {
        continue;
      }

      registerResolvedShaderLayerSources(
        resolveShaderLayer(stepShader, step, `step:${step.id}:current`, {
          preferStepSnapshot: true,
        }),
        sources,
      );
    }

    if (pinnedSequenceStep && pinnedSequenceShader) {
      registerResolvedShaderLayerSources(
        resolveShaderLayer(
          pinnedSequenceShader,
          pinnedSequenceStep,
          `step:${pinnedSequenceStep.id}:pinned`,
          { preferStepSnapshot: true },
        ),
        sources,
      );
    }

    return Array.from(sources.values());
  }, [
    availableShaders,
    pinnedSequenceShader,
    pinnedSequenceStep,
    resolveShaderLayer,
    shaderSequence.steps,
  ]);

  const visibleTimelineRenderState = useMemo(() => {
    const baseLayers: TimelineRenderLayer[] = [];
    const visibleStepIds = new Set<string>();
    const visibleShaderIds = new Set<string>();
    const markStateVisible = (state: ResolvedTimelineState | null) => {
      if (!state) {
        return;
      }

      visibleStepIds.add(state.currentStep.id);
      visibleShaderIds.add(state.currentShader.id);
      if (state.nextStep) {
        visibleStepIds.add(state.nextStep.id);
      }
      if (state.nextShader) {
        visibleShaderIds.add(state.nextShader.id);
      }
    };

    if (workspaceFocusedPreviewEnabled) {
      const focusedTargetShader = focusedSequenceShader ?? activeSavedShader;
      const focusedLayer = buildSingleShaderLayer(
        resolveShaderLayer(
          focusedTargetShader,
          focusedSequenceStep,
          focusedSequenceStep ? `step:${focusedSequenceStep.id}:focused` : 'shader:focused',
        ),
      );
      baseLayers.push(focusedLayer);
      if (shaderSequence.focusedStepId) {
        visibleStepIds.add(shaderSequence.focusedStepId);
      }
      if (focusedTargetShader) {
        visibleShaderIds.add(focusedTargetShader.id);
      }
    } else if (!liveTimelineState) {
      const fallbackLayer = buildSingleShaderLayer(
        resolveShaderLayer(activeSavedShader, null, 'shader:fallback'),
      );
      baseLayers.push(fallbackLayer);
      if (activeSavedShader) {
        visibleShaderIds.add(activeSavedShader.id);
      }
    } else if (shaderSequence.mode === 'double') {
      const resolvedSecondaryState = secondaryTimelineState ?? liveTimelineState;

      baseLayers.push(buildDoubleAutomataRenderLayer(liveTimelineState, resolvedSecondaryState));

      markStateVisible(liveTimelineState);
      markStateVisible(resolvedSecondaryState);
    } else {
      const activeLayer = buildTimelineRenderLayer(liveTimelineState);
      baseLayers.push(activeLayer);
      markStateVisible(liveTimelineState);
    }

    let pinnedLayer: TimelineRenderLayer | null = null;
    if (pinnedSequenceStep && pinnedSequenceShader) {
      pinnedLayer = buildPinnedCompareLayer(
        resolveShaderLayer(
          pinnedSequenceShader,
          pinnedSequenceStep,
          `step:${pinnedSequenceStep.id}:pinned`,
          { preferStepSnapshot: true },
        ),
      );
    }

    return {
      baseLayers,
      pinnedLayer,
      pinnedLayerKey: pinnedLayer ? pinnedSequenceStep?.id ?? null : null,
    };
  }, [
    activeSavedShader,
    buildSingleShaderLayer,
    buildTimelineRenderLayer,
    buildDoubleAutomataRenderLayer,
    buildPinnedCompareLayer,
    focusedSequenceShader,
    focusedSequenceStep,
    pinnedSequenceShader,
    pinnedSequenceStep,
    resolveShaderLayer,
    secondaryTimelineState,
    shaderSequence.focusedStepId,
    shaderSequence.mode,
    liveTimelineState,
    decodedAssetVersion,
    workspaceFocusedPreviewEnabled,
  ]);
  const visibleTimelineRenderLayers = visibleTimelineRenderState.baseLayers;
  const pinnedTimelineRenderLayer = visibleTimelineRenderState.pinnedLayer;
  const pinnedTimelineRenderLayerKey = visibleTimelineRenderState.pinnedLayerKey;
  const currentSequenceMode = shaderSequence.mode ?? 'sequence';
  const effectivePinnedStepId = pinnedStepId ?? null;

  if (previousSequenceModeRef.current === null) {
    previousSequenceModeRef.current = currentSequenceMode;
  } else if (currentSequenceMode !== previousSequenceModeRef.current) {
    const previousModeLayerSnapshot =
      latestModeLayerSnapshotRef.current.mode === previousSequenceModeRef.current
        ? latestModeLayerSnapshotRef.current.layers
        : [];
    const now = performance.now();

    modeLayerTransitionRef.current =
      previousModeLayerSnapshot.length > 0 || visibleTimelineRenderLayers.length > 0
        ? {
            fromMode: previousSequenceModeRef.current,
            toMode: currentSequenceMode,
            fromLayers: previousModeLayerSnapshot,
            toLayers: visibleTimelineRenderLayers,
            startedAtMs: now,
          }
        : null;
    previousSequenceModeRef.current = currentSequenceMode;
  }

  if (!modeLayerTransitionRef.current) {
    latestModeLayerSnapshotRef.current = {
      mode: currentSequenceMode,
      layers: visibleTimelineRenderLayers,
    };
  }

  if (!hasMountedPinLayerRef.current) {
    hasMountedPinLayerRef.current = true;
    previousPinnedStepIdRef.current = effectivePinnedStepId;
  } else if (effectivePinnedStepId !== previousPinnedStepIdRef.current) {
    const previousPinnedLayerSnapshot =
      latestPinnedLayerSnapshotRef.current.key === previousPinnedStepIdRef.current
        ? latestPinnedLayerSnapshotRef.current.layer
        : null;
    const now = performance.now();

    pinLayerTransitionRef.current =
      previousPinnedLayerSnapshot || pinnedTimelineRenderLayer
        ? {
            fromKey: previousPinnedStepIdRef.current,
            toKey: effectivePinnedStepId,
            fromLayer: previousPinnedLayerSnapshot,
            toLayer: pinnedTimelineRenderLayer,
            startedAtMs: now,
          }
        : null;
    previousPinnedStepIdRef.current = effectivePinnedStepId;
  }

  if (!pinLayerTransitionRef.current) {
    if (pinnedTimelineRenderLayerKey && pinnedTimelineRenderLayer) {
      latestPinnedLayerSnapshotRef.current = {
        key: pinnedTimelineRenderLayerKey,
        layer: pinnedTimelineRenderLayer,
      };
    } else {
      latestPinnedLayerSnapshotRef.current = {
        key: null,
        layer: null,
      };
    }
  }

  const pinLayerTransition = pinLayerTransitionRef.current;

  useEffect(() => {
    if (!pinLayerTransitionRef.current) {
      return;
    }

    const activeTransition = pinLayerTransitionRef.current;
    let frameId = 0;
    let cancelled = false;

    const tick = (timestamp: number) => {
      if (cancelled) {
        return;
      }

      setPinTransitionNowMs(timestamp);
      if (timestamp - activeTransition.startedAtMs < PIN_LAYER_FADE_DURATION_MS) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      pinLayerTransitionRef.current = null;
    };

    setPinTransitionNowMs(activeTransition.startedAtMs);
    frameId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [effectivePinnedStepId]);

  useEffect(() => {
    if (!modeLayerTransitionRef.current) {
      return;
    }

    const activeTransition = modeLayerTransitionRef.current;
    let frameId = 0;
    let cancelled = false;

    const tick = (timestamp: number) => {
      if (cancelled) {
        return;
      }

      setModeTransitionNowMs(timestamp);
      if (
        timestamp - activeTransition.startedAtMs <
        MODE_LAYER_WARMUP_DURATION_MS + MODE_LAYER_FADE_DURATION_MS
      ) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      modeLayerTransitionRef.current = null;
      latestModeLayerSnapshotRef.current = {
        mode: activeTransition.toMode,
        layers: activeTransition.toLayers,
      };
    };

    setModeTransitionNowMs(activeTransition.startedAtMs);
    frameId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [currentSequenceMode]);

  const stageRenderLayers = useMemo<StageRenderLayer[]>(() => {
    const createBaseStageRenderLayers = (
      layers: TimelineRenderLayer[],
      totalOpacity: number,
    ): StageRenderLayer[] => {
      if (layers.length === 0 || totalOpacity <= 0.001) {
        return [];
      }

      const layerOpacity = totalOpacity / layers.length;
      return layers.map((layer) => createStageRenderLayer(layer, layerOpacity));
    };
    const activeModeLayerTransition = modeLayerTransitionRef.current;
    const effectiveModeTransitionNowMs = activeModeLayerTransition
      ? Math.max(modeTransitionNowMs, activeModeLayerTransition.startedAtMs)
      : modeTransitionNowMs;
    const modeTransitionProgress = activeModeLayerTransition
      ? easeTransitionProgress(
          Math.max(
            0,
            Math.min(
              1,
              (effectiveModeTransitionNowMs -
                activeModeLayerTransition.startedAtMs -
                MODE_LAYER_WARMUP_DURATION_MS) /
                MODE_LAYER_FADE_DURATION_MS,
            ),
          ),
        )
      : 1;
    const baseStageLayers = activeModeLayerTransition
      ? [
          ...createBaseStageRenderLayers(
            activeModeLayerTransition.fromLayers,
            1 - modeTransitionProgress,
          ),
          ...createBaseStageRenderLayers(
            activeModeLayerTransition.toLayers,
            modeTransitionProgress,
          ),
        ]
      : createBaseStageRenderLayers(visibleTimelineRenderLayers, 1);
    const activePinLayerTransition = pinLayerTransitionRef.current;
    const effectivePinTransitionNowMs = activePinLayerTransition
      ? Math.max(pinTransitionNowMs, activePinLayerTransition.startedAtMs)
      : pinTransitionNowMs;

    if (!activePinLayerTransition && !pinnedTimelineRenderLayer) {
      return baseStageLayers;
    }

    const baseLayerCount = baseStageLayers.length;
    let transitionFromOpacity = 0;
    let transitionToOpacity = 0;
    let transitionFromLayer: TimelineRenderLayer | null = null;
    let transitionToLayer: TimelineRenderLayer | null = null;

    if (activePinLayerTransition) {
      transitionFromLayer = activePinLayerTransition.fromLayer;
      transitionToLayer = activePinLayerTransition.toLayer;
    } else if (pinnedTimelineRenderLayer) {
      transitionToLayer = pinnedTimelineRenderLayer;
    }

    const activePinnedLayer = transitionToLayer ?? pinnedTimelineRenderLayer;
    const pinnedUsesStackOnTop = activePinnedLayer?.compositeMode === 'stackOnTop';
    const pinnedUsesBlendComposite = activePinnedLayer?.requiresCompositeBase === true;
    const pinTargetOpacity =
      pinnedUsesStackOnTop || pinnedUsesBlendComposite
        ? 1
        : baseLayerCount > 0
          ? 1 / (baseLayerCount + 1)
          : 1;

    if (activePinLayerTransition) {
      const easedProgress = easeTransitionProgress(
        Math.max(
          0,
          Math.min(
            1,
            (effectivePinTransitionNowMs - activePinLayerTransition.startedAtMs) /
              PIN_LAYER_FADE_DURATION_MS,
          ),
        ),
      );
      transitionFromOpacity = transitionFromLayer ? pinTargetOpacity * (1 - easedProgress) : 0;
      transitionToOpacity = transitionToLayer ? pinTargetOpacity * easedProgress : 0;
    } else if (pinnedTimelineRenderLayer) {
      transitionToOpacity = pinTargetOpacity;
    }

    const totalPinnedOpacity = transitionFromOpacity + transitionToOpacity;

    if (baseLayerCount === 0) {
      return [
        ...(transitionFromLayer && transitionFromOpacity > 0.001
          ? [createStageRenderLayer(transitionFromLayer, transitionFromOpacity)]
          : []),
        ...(transitionToLayer && transitionToOpacity > 0.001
          ? [createStageRenderLayer(transitionToLayer, transitionToOpacity)]
          : []),
      ];
    }

    const currentBaseOpacityScale =
      pinnedUsesStackOnTop || pinnedUsesBlendComposite
        ? 1
        : 1 - totalPinnedOpacity;

    const composedLayers: StageRenderLayer[] = [
      ...baseStageLayers.map((layer) => ({
        ...layer,
        opacity: (layer.opacity ?? 1) * currentBaseOpacityScale,
      })),
    ];

    if (transitionFromLayer && transitionFromOpacity > 0.001) {
      composedLayers.push(createStageRenderLayer(transitionFromLayer, transitionFromOpacity));
    }

    if (transitionToLayer && transitionToOpacity > 0.001) {
      composedLayers.push(createStageRenderLayer(transitionToLayer, transitionToOpacity));
    }

    return composedLayers;
  }, [
    createStageRenderLayer,
    modeTransitionNowMs,
    pinTransitionNowMs,
    pinnedTimelineRenderLayer,
    visibleTimelineRenderLayers,
  ]);

  const renderDescriptor = stageRenderLayers[0] ?? {
    shaderCode: previewActiveShaderCode,
    uniformDefinitions: parseUniforms(previewActiveShaderCode),
    uniformValues: previewActiveUniformValues,
    opacity: 1,
  };

  const primaryLookaheadTimelineStates = useMemo(
    () =>
      collectTimelineLookaheadStates({
        currentState: timelineState,
        currentTimeSeconds: transportTimeSeconds,
        resolveStateAt: (timeSeconds) =>
          resolveShaderTimelineState({
            shaders: availableShaders,
            mode: shaderSequence.mode ?? 'sequence',
            focusedStepId: shaderSequence.focusedStepId ?? null,
            singleStepLoopEnabled: shaderSequence.singleStepLoopEnabled ?? false,
            randomChoiceEnabled: shaderSequence.randomChoiceEnabled ?? false,
            sharedTransitionEnabled: shaderSequence.sharedTransitionEnabled ?? false,
            sharedTransitionEffect: shaderSequence.sharedTransitionEffect ?? 'mix',
            sharedTransitionDurationSeconds:
              shaderSequence.sharedTransitionDurationSeconds ?? 0.75,
            sharedSectionDurationSeconds: shaderSequence.sharedSectionDurationSeconds ?? 8,
            steps: playbackTimelineSteps,
            timeSeconds,
            loop: transport.loop,
            randomSeedSalt: primaryRandomSeedSalt,
          }),
        depth:
          shaderSequence.mode === 'double'
            ? DOUBLE_PRELOAD_LOOKAHEAD_DEPTH
            : STANDARD_PRELOAD_LOOKAHEAD_DEPTH,
      }),
    [
      availableShaders,
      doublePrimaryRandomSeedSalt,
      primaryRandomSeedSalt,
      playbackTimelineSteps,
      shaderSequence.focusedStepId,
      shaderSequence.mode,
      shaderSequence.randomChoiceEnabled,
      shaderSequence.sharedTransitionEnabled,
      shaderSequence.sharedSectionDurationSeconds,
      shaderSequence.sharedTransitionDurationSeconds,
      shaderSequence.sharedTransitionEffect,
      shaderSequence.singleStepLoopEnabled,
      timelineState,
      transport.loop,
      transportTimeSeconds,
    ],
  );

  const secondaryLookaheadTimelineStates = useMemo(
    () =>
      shaderSequence.mode !== 'double'
        ? []
        : collectTimelineLookaheadStates({
            currentState: secondaryTimelineState,
            currentTimeSeconds: secondaryTimelineTimeSeconds,
            resolveStateAt: (timeSeconds) =>
              resolveShaderTimelineState({
                shaders: availableShaders,
                mode: 'randomMix',
                focusedStepId: shaderSequence.focusedStepId ?? null,
                singleStepLoopEnabled: shaderSequence.singleStepLoopEnabled ?? false,
                randomChoiceEnabled: false,
                sharedTransitionEnabled: true,
                sharedTransitionEffect: shaderSequence.sharedTransitionEffect ?? 'mix',
                sharedTransitionDurationSeconds:
                  shaderSequence.sharedTransitionDurationSeconds ?? 0.75,
                sharedSectionDurationSeconds: shaderSequence.sharedSectionDurationSeconds ?? 8,
                steps: playbackTimelineSteps,
                timeSeconds,
                loop: transport.loop,
                randomSeedSalt: secondaryTimelineResolution.randomSeedSalt,
              }),
            depth: DOUBLE_PRELOAD_LOOKAHEAD_DEPTH,
          }),
    [
      availableShaders,
      playbackTimelineSteps,
      secondaryTimelineState,
      secondaryTimelineTimeSeconds,
      secondaryTimelineResolution.randomSeedSalt,
      shaderSequence.focusedStepId,
      shaderSequence.mode,
      shaderSequence.sharedSectionDurationSeconds,
      shaderSequence.sharedTransitionDurationSeconds,
      shaderSequence.sharedTransitionEffect,
      shaderSequence.singleStepLoopEnabled,
      transport.loop,
    ],
  );

  const preloadStageLayers = useMemo<StageRenderLayer[]>(() => {
    if (workspaceFocusedPreviewEnabled || !timelineState) {
      return [];
    }

    const preloadCandidates: Array<StageRenderLayer | null> = [];
    const activeModeLayerTransition = modeLayerTransitionRef.current;
    if (activeModeLayerTransition) {
      for (const layer of activeModeLayerTransition.toLayers) {
        preloadCandidates.push(createStageRenderLayer(layer, 1));
      }
    }

    const pushStatePreloads = (state: ResolvedTimelineState) => {
      preloadCandidates.push(buildSingleStepPreloadLayer(state.nextShader, state.nextStep));
      preloadCandidates.push(buildTransitionPreloadLayer(state));
    };

    pushStatePreloads(timelineState);
    if (midiManualLookaheadTimelineState) {
      pushStatePreloads(midiManualLookaheadTimelineState);
    }
    primaryLookaheadTimelineStates.forEach(pushStatePreloads);

    if (shaderSequence.mode === 'double' && secondaryTimelineState) {
      pushStatePreloads(secondaryTimelineState);
      secondaryLookaheadTimelineStates.forEach(pushStatePreloads);

      for (const primaryState of primaryLookaheadTimelineStates) {
        preloadCandidates.push(
          createStageRenderLayer(
            buildDoubleAutomataRenderLayer(primaryState, secondaryTimelineState),
            1,
          ),
        );
      }

      for (const secondaryState of secondaryLookaheadTimelineStates) {
        preloadCandidates.push(
          createStageRenderLayer(
            buildDoubleAutomataRenderLayer(timelineState, secondaryState),
            1,
          ),
        );
      }

      const pairedLookaheadCount = Math.min(
        primaryLookaheadTimelineStates.length,
        secondaryLookaheadTimelineStates.length,
      );
      for (let index = 0; index < pairedLookaheadCount; index += 1) {
        preloadCandidates.push(
          createStageRenderLayer(
            buildDoubleAutomataRenderLayer(
              primaryLookaheadTimelineStates[index],
              secondaryLookaheadTimelineStates[index],
            ),
            1,
          ),
        );
      }
    }

    const visiblePreloadKeys = new Set(stageRenderLayers.map((layer) => getStageRenderLayerWarmupKey(layer)));
    const dedupedPreloads = new Map<string, StageRenderLayer>();
    for (const candidate of preloadCandidates) {
      if (!candidate) {
        continue;
      }

      const preloadKey = getStageRenderLayerWarmupKey(candidate);
      if (visiblePreloadKeys.has(preloadKey)) {
        continue;
      }

      dedupedPreloads.set(preloadKey, candidate);
    }

    return Array.from(dedupedPreloads.values());
  }, [
    buildTransitionPreloadLayer,
    buildDoubleAutomataRenderLayer,
    buildSingleStepPreloadLayer,
    createStageRenderLayer,
    midiManualLookaheadTimelineState,
    modeTransitionNowMs,
    primaryLookaheadTimelineStates,
    secondaryLookaheadTimelineStates,
    secondaryTimelineState,
    shaderSequence.mode,
    stageRenderLayers,
    timelineState,
    workspaceFocusedPreviewEnabled,
  ]);

  const usedFallback = useMemo(
    () =>
      visibleTimelineRenderLayers.some((layer) => layer.usedFallback) ||
      Boolean(pinnedTimelineRenderLayer?.usedFallback) ||
      Boolean(pinLayerTransition?.fromLayer?.usedFallback) ||
      Boolean(pinLayerTransition?.toLayer?.usedFallback),
    [pinLayerTransition, pinnedTimelineRenderLayer, visibleTimelineRenderLayers],
  );

  const showPinnedStageIndicator =
    !isOutputOnly && Boolean(pinnedSequenceStep && pinnedSequenceShader);

  const handleStageDoubleClick = useCallback(() => {
    if (isOutputOnly || !onNavigateToTimelineStep) {
      return;
    }

    let stepId: string | null = null;

    if (workspaceFocusedPreviewEnabled) {
      stepId =
        focusedPreviewStepId ??
        focusedSequenceStep?.id ??
        shaderSequence.focusedStepId ??
        null;
    } else if (renderTimelineState?.currentStep.id) {
      stepId = renderTimelineState.currentStep.id;
    } else {
      stepId = resolveTimelineStepIdForShader(
        shaderSequence.steps,
        activeSavedShader,
        activeShaderId,
      );
    }

    if (stepId) {
      onNavigateToTimelineStep(stepId);
    }
  }, [
    activeSavedShader,
    activeShaderId,
    focusedPreviewStepId,
    focusedSequenceStep,
    isOutputOnly,
    onNavigateToTimelineStep,
    renderTimelineState,
    shaderSequence.focusedStepId,
    shaderSequence.steps,
    workspaceFocusedPreviewEnabled,
  ]);

  const stageNavigateToTimelineEnabled =
    !isOutputOnly && Boolean(onNavigateToTimelineStep) && shaderSequence.steps.length > 0;

  return (
    <StageRenderer
      asset={asset}
      assetUrl={assetUrl}
      assetUrlStatus={assetUrlStatus}
      renderLayers={stageRenderLayers}
      preloadLayers={preloadStageLayers}
      warmupSources={timelineWarmupSources}
      shaderCode={renderDescriptor.shaderCode}
      shaderCompileNonce={shaderCompileNonce}
      uniformDefinitions={renderDescriptor.uniformDefinitions}
      uniformValues={renderDescriptor.uniformValues}
      stageTransform={stageTransform}
      transport={transport}
      isOutputOnly={isOutputOnly}
      personalPreviewActive={workspacePersonalPreviewActive}
      showPinnedIndicator={showPinnedStageIndicator}
      pinnedIndicatorLabel={pinnedSequenceShader?.name ?? null}
      onPinnedIndicatorClick={onPinnedIndicatorClick}
      onStageDoubleClick={stageNavigateToTimelineEnabled ? handleStageDoubleClick : undefined}
      stageDoubleClickTitle={
        stageNavigateToTimelineEnabled
          ? 'Double-click to locate this shader in the timeline'
          : null
      }
      onCanvasReady={onCanvasReady}
      onRenderStateChange={onRenderStateChange}
      onCompiledShaderCodesChange={setCompiledShaderCodes}
      onFrameRendered={onFrameRendered}
      onCompilerError={(message) => {
        if (!onCompilerError) {
          return;
        }

        if (!message && usedFallback) {
          return;
        }

        onCompilerError(message);
      }}
    />
  );
}
