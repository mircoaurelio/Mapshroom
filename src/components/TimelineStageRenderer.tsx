import { useEffect, useMemo, useRef, useState } from 'react';
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
  buildTimelineTransitionShaderCode,
} from '../lib/timelineShader';
import type {
  PlaybackTransport,
  SavedShader,
  ShaderUniformValueMap,
  StageTransform,
  TimelineStub,
  AssetRecord,
} from '../types';
import { StageRenderer, type StageRenderLayer } from './StageRenderer';
import type { AssetObjectUrlStatus } from '../lib/useAssetObjectUrl';

const DOUBLE_SECONDARY_SPEED = 1.35;
const PRELOAD_TRANSITION_PROGRESS = 0.001;
const PRELOAD_LOOKAHEAD_EPSILON_SECONDS = 0.01;
const STANDARD_PRELOAD_LOOKAHEAD_DEPTH = 1;
const DOUBLE_PRELOAD_LOOKAHEAD_DEPTH = 2;
const DOUBLE_SECONDARY_VARIANT_COUNT = 5;
const DOUBLE_RANDOM_RESEED_EPSILON_SECONDS = 0.05;
const PIN_LAYER_FADE_DURATION_MS = 1_200;

type TimelineRenderLayerKind = 'single' | 'transition';
type ResolvedTimelineState = NonNullable<ReturnType<typeof resolveShaderTimelineState>>;

interface TimelineRenderLayer {
  kind: TimelineRenderLayerKind;
  shaderCode: string;
  uniformValues: ShaderUniformValueMap;
  usedFallback: boolean;
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
  const [pinFadeNowMs, setPinFadeNowMs] = useState(() => performance.now());
  const [pinFadeState, setPinFadeState] = useState<{
    stepId: string;
    startedAtMs: number;
  } | null>(null);
  const [doubleModeRandomSeedToken, setDoubleModeRandomSeedToken] = useState(() =>
    createTimelineRandomSeedToken(),
  );
  const previousDoubleModeRef = useRef(false);
  const hasMountedPinnedStepRef = useRef(false);
  const previousPinnedStepIdRef = useRef<string | null>(null);
  const previousTransportSnapshotRef = useRef({
    isPlaying: transport.isPlaying,
    currentTimeSeconds: transport.currentTimeSeconds,
  });
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
  const activeSavedShader = useMemo(
    () => availableShaders.find((shader) => shader.id === activeShaderId) ?? null,
    [activeShaderId, availableShaders],
  );
  const focusedSequenceShader = useMemo(() => {
    const focusedStepId = shaderSequence.focusedStepId ?? null;
    if (!focusedStepId) {
      return null;
    }

    const focusedStep =
      shaderSequence.steps.find((step) => step.id === focusedStepId) ?? null;
    if (!focusedStep) {
      return null;
    }

    return availableShaders.find((shader) => shader.id === focusedStep.shaderId) ?? null;
  }, [availableShaders, shaderSequence.focusedStepId, shaderSequence.steps]);
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
  const pinnedSequenceStepId = pinnedSequenceStep?.id ?? null;

  useEffect(() => {
    if (!hasMountedPinnedStepRef.current) {
      hasMountedPinnedStepRef.current = true;
      previousPinnedStepIdRef.current = pinnedSequenceStepId;
      return;
    }

    if (pinnedSequenceStepId === previousPinnedStepIdRef.current) {
      return;
    }

    previousPinnedStepIdRef.current = pinnedSequenceStepId;

    if (!pinnedSequenceStepId) {
      setPinFadeState(null);
      return;
    }

    const now = performance.now();
    setPinFadeNowMs(now);
    setPinFadeState({
      stepId: pinnedSequenceStepId,
      startedAtMs: now,
    });
  }, [pinnedSequenceStepId]);

  useEffect(() => {
    if (
      !pinnedSequenceStepId ||
      !pinFadeState ||
      pinFadeState.stepId !== pinnedSequenceStepId
    ) {
      return;
    }

    let frameId = 0;
    const tick = (timestamp: number) => {
      setPinFadeNowMs(timestamp);
      if (timestamp - pinFadeState.startedAtMs < PIN_LAYER_FADE_DURATION_MS) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [pinFadeState, pinnedSequenceStepId]);

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

  const resolveSingleShaderLayer = (
    shader: SavedShader | null | undefined,
  ): TimelineRenderLayer => {
    const targetShader = shader ?? activeSavedShader;
    const isActiveShader = targetShader?.id === activeShaderId;

    if (isActiveShader) {
      return {
        kind: 'single',
        shaderCode: previewActiveShaderCode,
        uniformValues: previewActiveUniformValues,
        usedFallback:
          !preferActiveShaderCompilePreview && hasShaderCompileError(activeSavedShader),
      };
    }

    if (!targetShader) {
      return {
        kind: 'single',
        shaderCode: previewActiveShaderCode,
        uniformValues: previewActiveUniformValues,
        usedFallback: false,
      };
    }

    return {
      kind: 'single',
      shaderCode: getRenderableShaderCode(targetShader),
      uniformValues: getRenderableShaderUniformValues(targetShader),
      usedFallback: hasShaderCompileError(targetShader),
    };
  };

  const buildTimelineRenderLayer = (
    state: NonNullable<typeof timelineState>,
  ): TimelineRenderLayer => {
    const currentLayer = resolveSingleShaderLayer(state.currentShader);

    if (
      state.isTransitioning &&
      state.nextShader &&
      state.transitionEffect !== 'cut'
    ) {
      const nextLayer = resolveSingleShaderLayer(state.nextShader);

      return {
        kind: 'transition',
        shaderCode: buildTimelineTransitionShaderCode({
          fromCode: currentLayer.shaderCode,
          toCode: nextLayer.shaderCode,
          effect: state.transitionEffect,
        }),
        uniformValues: {
          u_transition_progress: easeTransitionProgress(state.transitionProgress),
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
      };
    }

    return currentLayer;
  };

  const buildTransitionPreloadLayer = (
    state: NonNullable<typeof timelineState>,
  ): StageRenderLayer | null => {
    if (!state.nextShader || state.transitionEffect === 'cut') {
      return null;
    }

    const currentLayer = resolveSingleShaderLayer(state.currentShader);
    const nextLayer = resolveSingleShaderLayer(state.nextShader);
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
    };
  };

  const buildNextSinglePreloadLayer = (
    state: NonNullable<typeof timelineState>,
  ): StageRenderLayer | null => {
    if (!state.nextShader) {
      return null;
    }

    const nextLayer = resolveSingleShaderLayer(state.nextShader);
    return {
      shaderCode: nextLayer.shaderCode,
      uniformDefinitions: parseUniforms(nextLayer.shaderCode),
      uniformValues: nextLayer.uniformValues,
      opacity: 1,
    };
  };

  const createStageRenderLayer = (
    layer: TimelineRenderLayer,
    opacity: number,
  ): StageRenderLayer => ({
    shaderCode: layer.shaderCode,
    uniformDefinitions: parseUniforms(layer.shaderCode),
    uniformValues: layer.uniformValues,
    opacity,
  });

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
      const focusedLayer = resolveSingleShaderLayer(focusedTargetShader);
      baseLayers.push(focusedLayer);
      if (shaderSequence.focusedStepId) {
        visibleStepIds.add(shaderSequence.focusedStepId);
      }
      if (focusedTargetShader) {
        visibleShaderIds.add(focusedTargetShader.id);
      }
    } else if (!timelineState) {
      const fallbackLayer = resolveSingleShaderLayer(activeSavedShader);
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
      pinnedLayer = resolveSingleShaderLayer(pinnedSequenceShader);
    }

    return {
      baseLayers,
      pinnedLayer,
    };
  }, [
    activeSavedShader,
    focusedSequenceShader,
    pinnedSequenceShader,
    pinnedSequenceStep,
    previewActiveShaderCode,
    previewActiveUniformValues,
    preferActiveShaderCompilePreview,
    secondaryTimelineState,
    shaderSequence.focusedStepId,
    shaderSequence.mode,
    timelineState,
    workspaceFocusedPreviewEnabled,
  ]);
  const visibleTimelineRenderLayers = visibleTimelineRenderState.baseLayers;
  const pinnedTimelineRenderLayer = visibleTimelineRenderState.pinnedLayer;
  const shouldStartPinFadeThisRender =
    hasMountedPinnedStepRef.current &&
    Boolean(
      pinnedSequenceStepId &&
        pinnedSequenceStepId !== previousPinnedStepIdRef.current &&
        pinnedTimelineRenderLayer,
    );
  const pinFadeProgress = useMemo(() => {
    if (!pinnedTimelineRenderLayer || !pinnedSequenceStepId) {
      return 1;
    }

    if (shouldStartPinFadeThisRender) {
      return 0;
    }

    if (!pinFadeState || pinFadeState.stepId !== pinnedSequenceStepId) {
      return 1;
    }

    return Math.max(
      0,
      Math.min(1, (pinFadeNowMs - pinFadeState.startedAtMs) / PIN_LAYER_FADE_DURATION_MS),
    );
  }, [
    pinFadeNowMs,
    pinFadeState,
    pinnedSequenceStepId,
    pinnedTimelineRenderLayer,
    shouldStartPinFadeThisRender,
  ]);

  const stageRenderLayers = useMemo<StageRenderLayer[]>(() => {
    if (!pinnedTimelineRenderLayer) {
      const normalizedOpacity =
        visibleTimelineRenderLayers.length > 1 ? 1 / visibleTimelineRenderLayers.length : 1;

      return visibleTimelineRenderLayers.map((layer) =>
        createStageRenderLayer(layer, normalizedOpacity),
      );
    }

    const baseLayerCount = visibleTimelineRenderLayers.length;
    if (baseLayerCount === 0) {
      return [createStageRenderLayer(pinnedTimelineRenderLayer, 1)];
    }

    const targetPinnedOpacity = 1 / (baseLayerCount + 1);
    const currentPinnedOpacity = targetPinnedOpacity * easeTransitionProgress(pinFadeProgress);
    const currentBaseOpacity = (1 - currentPinnedOpacity) / baseLayerCount;

    return [
      ...visibleTimelineRenderLayers.map((layer) =>
        createStageRenderLayer(layer, currentBaseOpacity),
      ),
      createStageRenderLayer(pinnedTimelineRenderLayer, currentPinnedOpacity),
    ];
  }, [pinFadeProgress, pinnedTimelineRenderLayer, visibleTimelineRenderLayers]);

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
      Boolean(pinnedTimelineRenderLayer?.usedFallback),
    [pinnedTimelineRenderLayer, visibleTimelineRenderLayers],
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
