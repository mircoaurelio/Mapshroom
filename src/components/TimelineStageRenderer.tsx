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
  resolveShaderTimelineState,
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
  buildTimelineTransitionShaderCode,
} from '../lib/timelineShader';
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
  type StageRenderInputSource,
  type StageRenderLayer,
} from './StageRenderer';
import type { AssetObjectUrlStatus } from '../lib/useAssetObjectUrl';

const DOUBLE_SECONDARY_SPEED = 1.35;
const PRELOAD_TRANSITION_PROGRESS = 0.001;
const PRELOAD_LOOKAHEAD_EPSILON_SECONDS = 0.01;
const STANDARD_PRELOAD_LOOKAHEAD_DEPTH = 1;
const DOUBLE_PRELOAD_LOOKAHEAD_DEPTH = 2;
const DOUBLE_SECONDARY_VARIANT_COUNT = 5;
const DOUBLE_RANDOM_RESEED_EPSILON_SECONDS = 0.05;
const PIN_LAYER_FADE_DURATION_MS = 1_200;
const timelineAssetUrlCache = new Map<string, string>();

type TimelineRenderLayerKind = 'single' | 'transition';
type ResolvedTimelineState = NonNullable<ReturnType<typeof resolveShaderTimelineState>>;
type TimelineSequenceStep = TimelineStub['shaderSequence']['steps'][number];

interface TimelineRenderLayer {
  kind: TimelineRenderLayerKind;
  shaderCode: string;
  uniformValues: ShaderUniformValueMap;
  usedFallback: boolean;
  overlaySource?: StageRenderInputSource | null;
  transitionOverlaySources?: {
    from: StageRenderInputSource | null;
    to: StageRenderInputSource | null;
  } | null;
}

interface ResolvedShaderLayer {
  shaderCode: string;
  uniformValues: ShaderUniformValueMap;
  usedFallback: boolean;
  overlaySource: StageRenderInputSource | null;
  assetSettings: TimelineStepAssetSettings;
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
  preferActiveShaderCompilePreview?: boolean;
  isOutputOnly?: boolean;
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
  preferActiveShaderCompilePreview = false,
  isOutputOnly,
  onCompilerError,
}: TimelineStageRendererProps) {
  const [timelineNowMs, setTimelineNowMs] = useState(() => performance.now());
  const [pinTransitionNowMs, setPinTransitionNowMs] = useState(() => performance.now());
  const [pinLayerTransition, setPinLayerTransition] = useState<PinLayerTransitionState | null>(
    null,
  );
  const [doubleModeRandomSeedToken, setDoubleModeRandomSeedToken] = useState(() =>
    createTimelineRandomSeedToken(),
  );
  const previousDoubleModeRef = useRef(false);
  const hasMountedPinLayerRef = useRef(false);
  const previousPinnedLayerKeyRef = useRef<string | null>(null);
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
  const [resolvedInputSources, setResolvedInputSources] = useState<
    Record<string, { url: string | null; status: AssetObjectUrlStatus }>
  >({});
  const assetMap = useMemo(
    () => new Map(assets.map((assetRecord) => [assetRecord.id, assetRecord])),
    [assets],
  );
  const workspaceFocusedPreviewEnabled = forceActiveShaderPreview && !isOutputOnly;
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
    editorView: 'simple',
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
  const sequenceEnabled = shaderSequence.steps.length > 0;
  const shouldResolveLiveTimelineState = sequenceEnabled && !workspaceFocusedPreviewEnabled;
  const referencedInputAssetIds = useMemo(
    () =>
      Array.from(
        new Set(
          savedShaders
            .map((shader) => shader.inputAssetId ?? null)
            .filter((assetId): assetId is string => Boolean(assetId)),
        ),
      ),
    [savedShaders],
  );
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

      const cachedUrl = timelineAssetUrlCache.get(assetId) ?? null;
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
          const cachedUrl = timelineAssetUrlCache.get(assetId) ?? null;
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
  const activeSavedShader = useMemo(
    () => availableShaders.find((shader) => shader.id === activeShaderId) ?? null,
    [activeShaderId, availableShaders],
  );
  const focusedSequenceStep = useMemo(() => {
    const focusedStepId = shaderSequence.focusedStepId ?? null;
    if (!focusedStepId) {
      return null;
    }

    return shaderSequence.steps.find((step) => step.id === focusedStepId) ?? null;
  }, [shaderSequence.focusedStepId, shaderSequence.steps]);
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
      steps: shaderSequence.steps,
      timeSeconds: transportTimeSeconds,
      loop: transport.loop,
      randomSeedSalt: doublePrimaryRandomSeedSalt,
    });
  }, [
    availableShaders,
    doublePrimaryRandomSeedSalt,
    shouldResolveLiveTimelineState,
    shaderSequence.focusedStepId,
    shaderSequence.mode,
    shaderSequence.randomChoiceEnabled,
    shaderSequence.sharedTransitionEnabled,
    shaderSequence.sharedTransitionDurationSeconds,
    shaderSequence.sharedTransitionEffect,
    shaderSequence.singleStepLoopEnabled,
    shaderSequence.steps,
    transport.loop,
    transportTimeSeconds,
  ]);

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
        steps: shaderSequence.steps,
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
    shaderSequence.steps,
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
  ): ResolvedShaderLayer => {
    const targetShader = shader ?? activeSavedShader;
    const isActiveShader = targetShader?.id === activeShaderId;
    const assetSettings = normalizeTimelineStepAssetSettings(step?.assetSettings);
    const overlaySource = resolveShaderOverlaySource(targetShader, step, scope);

    if (isActiveShader) {
      return {
        shaderCode: previewActiveShaderCode,
        uniformValues: previewActiveUniformValues,
        usedFallback:
          !preferActiveShaderCompilePreview && hasShaderCompileError(activeSavedShader),
        overlaySource,
        assetSettings,
      };
    }

    if (!targetShader) {
      return {
        shaderCode: previewActiveShaderCode,
        uniformValues: previewActiveUniformValues,
        usedFallback: false,
        overlaySource: null,
        assetSettings,
      };
    }

    return {
      shaderCode: getRenderableShaderCode(targetShader),
      uniformValues: getRenderableShaderUniformValues(targetShader),
      usedFallback: hasShaderCompileError(targetShader),
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
    if (!layer.overlaySource) {
      return {
        kind: 'single',
        shaderCode: layer.shaderCode,
        uniformValues: layer.uniformValues,
        usedFallback: layer.usedFallback,
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
      overlaySource: layer.overlaySource,
    };
  }, []);

  const buildTimelineRenderLayer = useCallback((
    state: NonNullable<typeof timelineState>,
  ): TimelineRenderLayer => {
    const currentLayer = resolveShaderLayer(
      state.currentShader,
      state.currentStep,
      `step:${state.currentStep.id}:current`,
    );

    if (
      state.isTransitioning &&
      state.nextShader &&
      state.transitionEffect !== 'cut'
    ) {
      const nextLayer = resolveShaderLayer(
        state.nextShader,
        state.nextStep,
        `step:${state.nextStep?.id ?? state.currentStep.id}:next`,
      );

      return {
        kind: 'transition',
        shaderCode: buildTimelineTransitionShaderCode({
          fromCode: currentLayer.shaderCode,
          toCode: nextLayer.shaderCode,
          effect: state.transitionEffect,
        }),
        uniformValues: {
          u_transition_progress: easeTransitionProgress(state.transitionProgress),
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
        usedFallback: currentLayer.usedFallback || nextLayer.usedFallback,
        transitionOverlaySources: {
          from: currentLayer.overlaySource ?? null,
          to: nextLayer.overlaySource ?? null,
        },
      };
    }

    return buildSingleShaderLayer(currentLayer);
  }, [buildSingleShaderLayer, resolveShaderLayer]);

  const buildTransitionPreloadLayer = useCallback((
    state: NonNullable<typeof timelineState>,
  ): StageRenderLayer | null => {
    if (!state.nextShader || state.transitionEffect === 'cut') {
      return null;
    }

    const currentLayer = resolveShaderLayer(
      state.currentShader,
      state.currentStep,
      `step:${state.currentStep.id}:preload-current`,
    );
    const nextLayer = resolveShaderLayer(
      state.nextShader,
      state.nextStep,
      `step:${state.nextStep?.id ?? state.currentStep.id}:preload-next`,
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
      transitionOverlaySources: {
        from: currentLayer.overlaySource ?? null,
        to: nextLayer.overlaySource ?? null,
      },
    };
  }, [resolveShaderLayer]);

  const buildNextSinglePreloadLayer = useCallback((
    state: NonNullable<typeof timelineState>,
  ): StageRenderLayer | null => {
    if (!state.nextShader) {
      return null;
    }

    const nextLayer = buildSingleShaderLayer(
      resolveShaderLayer(
        state.nextShader,
        state.nextStep,
        `step:${state.nextStep?.id ?? state.currentStep.id}:preload-single`,
      ),
    );
    return {
      shaderCode: nextLayer.shaderCode,
      uniformDefinitions: parseUniforms(nextLayer.shaderCode),
      uniformValues: nextLayer.uniformValues,
      opacity: 1,
      overlaySource: nextLayer.overlaySource ?? null,
    };
  }, [buildSingleShaderLayer, resolveShaderLayer]);

  const createStageRenderLayer = useCallback((
    layer: TimelineRenderLayer,
    opacity: number,
  ): StageRenderLayer => ({
    shaderCode: layer.shaderCode,
    uniformDefinitions: parseUniforms(layer.shaderCode),
    uniformValues: layer.uniformValues,
    opacity,
    overlaySource: layer.overlaySource ?? null,
    transitionOverlaySources: layer.transitionOverlaySources ?? null,
  }), []);

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
    } else if (!timelineState) {
      const fallbackLayer = buildSingleShaderLayer(
        resolveShaderLayer(activeSavedShader, null, 'shader:fallback'),
      );
      baseLayers.push(fallbackLayer);
      if (activeSavedShader) {
        visibleShaderIds.add(activeSavedShader.id);
      }
    } else if (shaderSequence.mode === 'double') {
      const primaryLayer = buildTimelineRenderLayer(timelineState);
      const resolvedSecondaryState = secondaryTimelineState ?? timelineState;
      const secondaryLayer = buildTimelineRenderLayer(resolvedSecondaryState);

      baseLayers.push(primaryLayer, secondaryLayer);
      markStateVisible(timelineState);
      markStateVisible(resolvedSecondaryState);
    } else {
      const activeLayer = buildTimelineRenderLayer(timelineState);
      baseLayers.push(activeLayer);
      markStateVisible(timelineState);
    }

    let pinnedLayer: TimelineRenderLayer | null = null;
    if (
      pinnedSequenceStep &&
      pinnedSequenceShader &&
      !visibleStepIds.has(pinnedSequenceStep.id) &&
      !visibleShaderIds.has(pinnedSequenceShader.id)
    ) {
      pinnedLayer = buildSingleShaderLayer(
        resolveShaderLayer(
          pinnedSequenceShader,
          pinnedSequenceStep,
          `step:${pinnedSequenceStep.id}:pinned`,
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
    focusedSequenceShader,
    focusedSequenceStep,
    pinnedSequenceShader,
    pinnedSequenceStep,
    resolveShaderLayer,
    secondaryTimelineState,
    shaderSequence.focusedStepId,
    shaderSequence.mode,
    timelineState,
    workspaceFocusedPreviewEnabled,
  ]);
  const visibleTimelineRenderLayers = visibleTimelineRenderState.baseLayers;
  const pinnedTimelineRenderLayer = visibleTimelineRenderState.pinnedLayer;
  const pinnedTimelineRenderLayerKey = visibleTimelineRenderState.pinnedLayerKey;

  useEffect(() => {
    if (!hasMountedPinLayerRef.current) {
      hasMountedPinLayerRef.current = true;
      previousPinnedLayerKeyRef.current = pinnedTimelineRenderLayerKey;
      return;
    }

    if (pinnedTimelineRenderLayerKey === previousPinnedLayerKeyRef.current) {
      return;
    }

    const previousPinnedLayerSnapshot =
      latestPinnedLayerSnapshotRef.current.key === previousPinnedLayerKeyRef.current
        ? latestPinnedLayerSnapshotRef.current.layer
        : null;
    const now = performance.now();

    setPinTransitionNowMs(now);
    setPinLayerTransition(
      previousPinnedLayerSnapshot || pinnedTimelineRenderLayer
        ? {
            fromKey: previousPinnedLayerKeyRef.current,
            toKey: pinnedTimelineRenderLayerKey,
            fromLayer: previousPinnedLayerSnapshot,
            toLayer: pinnedTimelineRenderLayer,
            startedAtMs: now,
          }
        : null,
    );
    previousPinnedLayerKeyRef.current = pinnedTimelineRenderLayerKey;
  }, [pinnedTimelineRenderLayer, pinnedTimelineRenderLayerKey]);

  useEffect(() => {
    if (pinnedTimelineRenderLayerKey && pinnedTimelineRenderLayer) {
      latestPinnedLayerSnapshotRef.current = {
        key: pinnedTimelineRenderLayerKey,
        layer: pinnedTimelineRenderLayer,
      };
      return;
    }

    if (!pinLayerTransition) {
      latestPinnedLayerSnapshotRef.current = {
        key: null,
        layer: null,
      };
    }
  }, [pinLayerTransition, pinnedTimelineRenderLayer, pinnedTimelineRenderLayerKey]);

  useEffect(() => {
    if (!pinLayerTransition) {
      return;
    }

    let frameId = 0;
    const tick = (timestamp: number) => {
      setPinTransitionNowMs(timestamp);
      if (timestamp - pinLayerTransition.startedAtMs < PIN_LAYER_FADE_DURATION_MS) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      setPinLayerTransition(null);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [pinLayerTransition]);

  const stageRenderLayers = useMemo<StageRenderLayer[]>(() => {
    if (!pinLayerTransition && !pinnedTimelineRenderLayer) {
      const normalizedOpacity =
        visibleTimelineRenderLayers.length > 1 ? 1 / visibleTimelineRenderLayers.length : 1;

      return visibleTimelineRenderLayers.map((layer) =>
        createStageRenderLayer(layer, normalizedOpacity),
      );
    }

    const baseLayerCount = visibleTimelineRenderLayers.length;
    const pinTargetOpacity = baseLayerCount > 0 ? 1 / (baseLayerCount + 1) : 1;

    let transitionFromOpacity = 0;
    let transitionToOpacity = 0;
    let transitionFromLayer: TimelineRenderLayer | null = null;
    let transitionToLayer: TimelineRenderLayer | null = null;

    if (pinLayerTransition) {
      const easedProgress = easeTransitionProgress(
        Math.max(
          0,
          Math.min(
            1,
            (pinTransitionNowMs - pinLayerTransition.startedAtMs) / PIN_LAYER_FADE_DURATION_MS,
          ),
        ),
      );
      transitionFromLayer = pinLayerTransition.fromLayer;
      transitionToLayer = pinLayerTransition.toLayer;
      transitionFromOpacity = transitionFromLayer ? pinTargetOpacity * (1 - easedProgress) : 0;
      transitionToOpacity = transitionToLayer ? pinTargetOpacity * easedProgress : 0;
    } else if (pinnedTimelineRenderLayer) {
      transitionToLayer = pinnedTimelineRenderLayer;
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

    const currentBaseOpacity = (1 - totalPinnedOpacity) / baseLayerCount;

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
    pinLayerTransition,
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
            steps: shaderSequence.steps,
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
      shaderSequence.focusedStepId,
      shaderSequence.mode,
      shaderSequence.randomChoiceEnabled,
      shaderSequence.sharedTransitionEnabled,
      shaderSequence.sharedTransitionDurationSeconds,
      shaderSequence.sharedTransitionEffect,
      shaderSequence.singleStepLoopEnabled,
      shaderSequence.steps,
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
                steps: shaderSequence.steps,
                timeSeconds,
                loop: transport.loop,
                randomSeedSalt: secondaryTimelineResolution.randomSeedSalt,
              }),
            depth: DOUBLE_PRELOAD_LOOKAHEAD_DEPTH,
          }),
    [
      availableShaders,
      secondaryTimelineState,
      secondaryTimelineTimeSeconds,
      secondaryTimelineResolution.randomSeedSalt,
      shaderSequence.focusedStepId,
      shaderSequence.mode,
      shaderSequence.sharedTransitionDurationSeconds,
      shaderSequence.sharedTransitionEffect,
      shaderSequence.singleStepLoopEnabled,
      shaderSequence.steps,
      transport.loop,
    ],
  );

  const preloadStageLayers = useMemo<StageRenderLayer[]>(() => {
    if (workspaceFocusedPreviewEnabled || !timelineState) {
      return [];
    }

    const preloadCandidates: Array<StageRenderLayer | null> = [];
    const pushStatePreloads = (state: ResolvedTimelineState) => {
      preloadCandidates.push(
        buildTransitionPreloadLayer(state),
        buildNextSinglePreloadLayer(state),
      );
    };

    pushStatePreloads(timelineState);
    primaryLookaheadTimelineStates.forEach(pushStatePreloads);

    if (shaderSequence.mode === 'double' && secondaryTimelineState) {
      pushStatePreloads(secondaryTimelineState);
      secondaryLookaheadTimelineStates.forEach(pushStatePreloads);
    }

    const visibleShaderCodes = new Set(stageRenderLayers.map((layer) => layer.shaderCode));
    const dedupedPreloads = new Map<string, StageRenderLayer>();
    for (const candidate of preloadCandidates) {
      if (!candidate || visibleShaderCodes.has(candidate.shaderCode)) {
        continue;
      }
      dedupedPreloads.set(candidate.shaderCode, candidate);
    }

    return Array.from(dedupedPreloads.values());
  }, [
    buildNextSinglePreloadLayer,
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

  return (
    <StageRenderer
      asset={asset}
      assetUrl={assetUrl}
      assetUrlStatus={assetUrlStatus}
      renderLayers={stageRenderLayers}
      preloadLayers={preloadStageLayers}
      shaderCode={renderDescriptor.shaderCode}
      shaderCompileNonce={shaderCompileNonce}
      uniformDefinitions={renderDescriptor.uniformDefinitions}
      uniformValues={renderDescriptor.uniformValues}
      stageTransform={stageTransform}
      transport={transport}
      isOutputOnly={isOutputOnly}
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
