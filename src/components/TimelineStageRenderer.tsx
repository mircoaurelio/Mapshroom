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
  AssetRecord,
  TimelineStepAssetSettings,
} from '../types';
import {
  StageRenderer,
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
const DOUBLE_SECONDARY_VARIANT_COUNT = 5;
const DOUBLE_RANDOM_RESEED_EPSILON_SECONDS = 0.05;
const PIN_LAYER_FADE_DURATION_MS = 1_200;
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

function createTimelineRandomSeedToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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

function getDoubleSecondaryCandidateScore(
  candidate: ResolvedTimelineState,
  primaryState: ResolvedTimelineState | null,
): number {
  if (!primaryState) {
    return 0;
  }

  let score = 0;
  if (candidate.currentShader.id !== primaryState.currentShader.id) {
    score += 4;
  }
  if ((candidate.nextShader?.id ?? null) !== (primaryState.nextShader?.id ?? null)) {
    score += 2;
  }
  if (candidate.currentStep.id !== primaryState.currentStep.id) {
    score += 1;
  }
  if ((candidate.nextStep?.id ?? null) !== (primaryState.nextStep?.id ?? null)) {
    score += 1;
  }

  return score;
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
  preferActiveShaderCompilePreview?: boolean;
  isOutputOnly?: boolean;
  onPinnedIndicatorClick?: () => void;
  onNavigateToTimelineStep?: (stepId: string) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
  onRenderStateChange?: (state: StageRendererState) => void;
  onCompilerError?: (message: string) => void;
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
  preferActiveShaderCompilePreview = false,
  isOutputOnly,
  onPinnedIndicatorClick,
  onNavigateToTimelineStep,
  onCanvasReady,
  onRenderStateChange,
  onCompilerError,
}: TimelineStageRendererProps) {
  const [timelineNowMs, setTimelineNowMs] = useState(() => performance.now());
  const [pinTransitionNowMs, setPinTransitionNowMs] = useState(() => performance.now());
  const pinLayerTransitionRef = useRef<PinLayerTransitionState | null>(null);
  const [doubleModeRandomSeedToken, setDoubleModeRandomSeedToken] = useState(() =>
    createTimelineRandomSeedToken(),
  );
  const previousDoubleModeRef = useRef(false);
  const hasMountedPinLayerRef = useRef(false);
  const previousPinnedStepIdRef = useRef<string | null>(null);
  const latestPinnedLayerSnapshotRef = useRef<{
    key: string | null;
    layer: TimelineRenderLayer | null;
  }>({
    key: null,
    layer: null,
  });
  const previousTransportSnapshotRef = useRef({
    isPlaying: transport.isPlaying,
    currentTimeSeconds: transport.currentTimeSeconds,
  });
  const transitionProgressHoldRef = useRef({ pairKey: '', progress: 0 });
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
    singleStepLoopEnabled: false,
    randomChoiceEnabled: false,
    sharedTransitionEnabled: false,
    sharedTransitionEffect: 'mix',
    sharedTransitionDurationSeconds: 0.75,
    steps: [],
  };
  const doublePrimaryRandomSeedSalt =
    shaderSequence.mode === 'double' ? `double-primary:${doubleModeRandomSeedToken}` : '';
  const doubleSecondaryRandomSeedBase =
    shaderSequence.mode === 'double' ? `double-secondary:${doubleModeRandomSeedToken}` : '';
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

  useEffect(() => {
    if (!shouldResolveLiveTimelineState || !transport.isPlaying) {
      setTimelineNowMs(performance.now());
      return;
    }

    let frameId = 0;
    const tick = (timestamp: number) => {
      setTimelineNowMs(timestamp);
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
    const isDoubleMode = shaderSequence.mode === 'double';
    const wasDoubleMode = previousDoubleModeRef.current;
    const previousTransportSnapshot = previousTransportSnapshotRef.current;
    const rewoundToStart =
      isDoubleMode &&
      !transport.isPlaying &&
      previousTransportSnapshot.currentTimeSeconds > DOUBLE_RANDOM_RESEED_EPSILON_SECONDS &&
      transport.currentTimeSeconds <= DOUBLE_RANDOM_RESEED_EPSILON_SECONDS;
    const restartedPlaybackFromStart =
      isDoubleMode &&
      transport.isPlaying &&
      transport.currentTimeSeconds <= DOUBLE_RANDOM_RESEED_EPSILON_SECONDS &&
      (!previousTransportSnapshot.isPlaying ||
        previousTransportSnapshot.currentTimeSeconds > DOUBLE_RANDOM_RESEED_EPSILON_SECONDS);

    if (isDoubleMode && (!wasDoubleMode || rewoundToStart || restartedPlaybackFromStart)) {
      setDoubleModeRandomSeedToken(createTimelineRandomSeedToken());
    }

    previousDoubleModeRef.current = isDoubleMode;
    previousTransportSnapshotRef.current = {
      isPlaying: transport.isPlaying,
      currentTimeSeconds: transport.currentTimeSeconds,
    };
  }, [shaderSequence.mode, transport.currentTimeSeconds, transport.isPlaying]);

  const timelineState = useMemo(() => {
    if (!shouldResolveLiveTimelineState) {
      return null;
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
      randomSeedSalt: doublePrimaryRandomSeedSalt,
    });
  }, [
    availableShaders,
    doublePrimaryRandomSeedSalt,
    shouldResolveLiveTimelineState,
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

    let bestState: ResolvedTimelineState | null = null;
    let bestSeedSalt = `${doubleSecondaryRandomSeedBase}:0`;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < DOUBLE_SECONDARY_VARIANT_COUNT; index += 1) {
      const nextSeedSalt = `${doubleSecondaryRandomSeedBase}:${index}`;
      const nextState = resolveShaderTimelineState({
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
        randomSeedSalt: nextSeedSalt,
      });
      if (!nextState) {
        continue;
      }

      const nextScore = getDoubleSecondaryCandidateScore(nextState, timelineState);
      if (!bestState || nextScore > bestScore) {
        bestState = nextState;
        bestSeedSalt = nextSeedSalt;
        bestScore = nextScore;
      }

      if (nextScore >= 6) {
        break;
      }
    }

    return {
      state: bestState,
      randomSeedSalt: bestSeedSalt,
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
    timelineState,
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
  const isTimelineTransitionRendering = Boolean(
    liveTimelineState?.isTransitioning &&
      liveTimelineState.nextShader &&
      liveTimelineState.nextStep &&
      liveTimelineState.transitionEffect !== 'cut',
  );

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

    if (
      state.isTransitioning &&
      state.nextShader &&
      state.nextStep &&
      state.transitionEffect !== 'cut'
    ) {
      const nextLayer = resolveTimelineStepLayer(
        state.nextShader,
        state.nextStep,
        timelineLayerOptions,
      );
      const nextMediaReady = isTimelineStepMediaResolved(state.nextShader, resolvedInputSources);
      let transitionProgress = 0;
      if (state.isTransitioning) {
        const pairKey = `${state.currentStep.id}:${state.nextStep.id}:${state.transitionEffect}`;
        const requestedProgress = easeTransitionProgress(state.transitionProgress);
        if (transitionProgressHoldRef.current.pairKey !== pairKey) {
          transitionProgressHoldRef.current = {
            pairKey,
            progress: requestedProgress,
          };
        } else {
          transitionProgressHoldRef.current.progress = Math.max(
            transitionProgressHoldRef.current.progress,
            requestedProgress,
          );
        }
        transitionProgress = transitionProgressHoldRef.current.progress;
      }

      return {
        kind: 'transition',
        shaderCode: buildTimelineTransitionShaderCode({
          fromCode: currentLayer.shaderCode,
          toCode: nextLayer.shaderCode,
          effect: state.transitionEffect,
        }),
        uniformValues: {
          u_transition_progress: transitionProgress,
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
    resolveTimelineStepLayer,
    resolvedInputSources,
    shouldResolveLiveTimelineState,
  ]);

  const buildTransitionPreloadLayer = useCallback((
    state: NonNullable<typeof timelineState>,
  ): StageRenderLayer | null => {
    if (!state.nextShader || state.transitionEffect === 'cut') {
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
  }, [resolveTimelineStepLayer, shouldResolveLiveTimelineState]);

  const buildRevealedStepSinglePreloadLayer = useCallback((
    state: NonNullable<typeof timelineState>,
  ): StageRenderLayer | null => {
    if (!state.nextShader || !state.nextStep || state.transitionEffect === 'cut') {
      return null;
    }

    const revealedLayer = buildSingleShaderLayer(
      resolveTimelineStepLayer(
        state.nextShader,
        state.nextStep,
        { preferStepSnapshot: shouldResolveLiveTimelineState },
      ),
    );

    return {
      shaderCode: revealedLayer.shaderCode,
      uniformDefinitions: parseUniforms(revealedLayer.shaderCode),
      uniformValues: revealedLayer.uniformValues,
      opacity: 1,
      inputSource: revealedLayer.inputSource ?? null,
      overlaySource: revealedLayer.overlaySource ?? null,
    };
  }, [buildSingleShaderLayer, resolveTimelineStepLayer, shouldResolveLiveTimelineState]);

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

  const timelineWarmupSources = useMemo(() => {
    const sources = new Map<string, StageRenderInputSource>();

    for (const step of shaderSequence.steps) {
      const stepShader = availableShaders.find((shader) => shader.id === step.shaderId);
      if (!stepShader) {
        continue;
      }

      registerResolvedShaderLayerSources(
        resolveShaderLayer(stepShader, step, `warmup:step:${step.id}`, {
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
          `warmup:step:${pinnedSequenceStep.id}:pinned`,
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
      const primaryLayer = buildTimelineRenderLayer(liveTimelineState);
      const resolvedSecondaryState = secondaryTimelineState ?? liveTimelineState;
      const secondaryLayer = buildTimelineRenderLayer(resolvedSecondaryState);

      baseLayers.push(primaryLayer, secondaryLayer);
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
  const effectivePinnedStepId = pinnedStepId ?? null;

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

  const stageRenderLayers = useMemo<StageRenderLayer[]>(() => {
    const activePinLayerTransition = pinLayerTransitionRef.current;
    const effectivePinTransitionNowMs = activePinLayerTransition
      ? Math.max(pinTransitionNowMs, activePinLayerTransition.startedAtMs)
      : pinTransitionNowMs;

    if (
      isTimelineTransitionRendering ||
      (!activePinLayerTransition && !pinnedTimelineRenderLayer)
    ) {
      const normalizedOpacity =
        visibleTimelineRenderLayers.length > 1 ? 1 / visibleTimelineRenderLayers.length : 1;

      return visibleTimelineRenderLayers.map((layer) =>
        createStageRenderLayer(layer, normalizedOpacity),
      );
    }

    const baseLayerCount = visibleTimelineRenderLayers.length;
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

    const currentBaseOpacity =
      pinnedUsesStackOnTop || pinnedUsesBlendComposite
        ? 1
        : (1 - totalPinnedOpacity) / baseLayerCount;

    const composedLayers: StageRenderLayer[] = [
      ...visibleTimelineRenderLayers.map((layer) =>
        createStageRenderLayer(layer, currentBaseOpacity),
      ),
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
    isTimelineTransitionRendering,
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
            randomSeedSalt: doublePrimaryRandomSeedSalt,
          }),
        depth:
          shaderSequence.mode === 'double'
            ? DOUBLE_PRELOAD_LOOKAHEAD_DEPTH
            : STANDARD_PRELOAD_LOOKAHEAD_DEPTH,
      }),
    [
      availableShaders,
      doublePrimaryRandomSeedSalt,
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
    const pushStatePreloads = (state: ResolvedTimelineState) => {
      preloadCandidates.push(buildTransitionPreloadLayer(state));
      preloadCandidates.push(buildRevealedStepSinglePreloadLayer(state));
    };

    pushStatePreloads(timelineState);
    primaryLookaheadTimelineStates.forEach(pushStatePreloads);

    if (shaderSequence.mode === 'double' && secondaryTimelineState) {
      pushStatePreloads(secondaryTimelineState);
      secondaryLookaheadTimelineStates.forEach(pushStatePreloads);
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
    buildRevealedStepSinglePreloadLayer,
    buildTransitionPreloadLayer,
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
