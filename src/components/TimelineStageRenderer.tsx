import { useEffect, useMemo, useState } from 'react';
import { getTransportTimeSeconds } from '../lib/clock';
import { parseUniforms, syncUniformValues } from '../lib/shader';
import { resolveShaderTimelineState } from '../lib/timeline';
import { buildTimelineTransitionShaderCode } from '../lib/timelineShader';
import type {
  PlaybackTransport,
  SavedShader,
  ShaderUniformValueMap,
  StageTransform,
  TimelineStub,
  AssetRecord,
} from '../types';
import { StageRenderer } from './StageRenderer';
import type { AssetObjectUrlStatus } from '../lib/useAssetObjectUrl';

const EMPTY_UNIFORM_VALUES: ShaderUniformValueMap = {};

function applyNamespacedUniformValues({
  baseValues,
  sourceValues,
  namespace,
}: {
  baseValues: ShaderUniformValueMap;
  sourceValues: ShaderUniformValueMap;
  namespace: string;
}): ShaderUniformValueMap {
  const nextValues = { ...baseValues };

  for (const [name, value] of Object.entries(sourceValues)) {
    const namespacedName = `${namespace}_${name}`;
    if (nextValues[namespacedName] !== undefined) {
      nextValues[namespacedName] = value;
    }
  }

  return nextValues;
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
  shaderCompileNonce?: number;
  stageTransform: StageTransform;
  transport: PlaybackTransport;
  forceActiveShaderPreview?: boolean;
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
  shaderCompileNonce,
  stageTransform,
  transport,
  forceActiveShaderPreview = false,
  isOutputOnly,
  onCompilerError,
}: TimelineStageRendererProps) {
  const [timelineNowMs, setTimelineNowMs] = useState(() => performance.now());
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
  const sequenceEnabled = shaderSequence.steps.length > 0;

  useEffect(() => {
    if (!sequenceEnabled || !transport.isPlaying) {
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
    sequenceEnabled,
    transport.anchorTimestampMs,
    transport.currentTimeSeconds,
    transport.isPlaying,
    transport.loop,
    transport.playbackRate,
  ]);

  const timelineState = useMemo(() => {
    if (!sequenceEnabled) {
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
      timeSeconds: getTransportTimeSeconds(transport, timelineNowMs),
      loop: transport.loop,
    });
  }, [
    availableShaders,
    sequenceEnabled,
    shaderSequence.focusedStepId,
    shaderSequence.mode,
    shaderSequence.randomChoiceEnabled,
    shaderSequence.sharedTransitionEnabled,
    shaderSequence.sharedTransitionDurationSeconds,
    shaderSequence.sharedTransitionEffect,
    shaderSequence.singleStepLoopEnabled,
    shaderSequence.steps,
    timelineNowMs,
    transport,
  ]);

  const renderDescriptor = useMemo(() => {
    if (forceActiveShaderPreview && !isOutputOnly) {
      return {
        shaderCode: activeShaderCode,
        isTransitionShader: false,
        uniformValues: activeUniformValues,
      };
    }

    if (!timelineState) {
      return {
        shaderCode: activeShaderCode,
        isTransitionShader: false,
        uniformValues: activeUniformValues,
      };
    }

    if (
      timelineState.isTransitioning &&
      timelineState.nextShader &&
      timelineState.transitionEffect !== 'cut'
    ) {
      return {
        shaderCode: buildTimelineTransitionShaderCode({
          fromCode: timelineState.currentShader.code,
          toCode: timelineState.nextShader.code,
          effect: timelineState.transitionEffect,
        }),
        isTransitionShader: true,
        uniformValues: EMPTY_UNIFORM_VALUES,
      };
    }

    return {
      shaderCode: timelineState.currentShader.code,
      isTransitionShader: false,
      uniformValues:
        timelineState.currentShader.id === activeShaderId
          ? activeUniformValues
          : timelineState.currentShader.uniformValues ?? EMPTY_UNIFORM_VALUES,
    };
  }, [
    activeShaderCode,
    activeShaderId,
    activeUniformValues,
    forceActiveShaderPreview,
    isOutputOnly,
    timelineState?.currentShader.code,
    timelineState?.currentShader.id,
    timelineState?.currentShader.uniformValues,
    timelineState?.isTransitioning,
    timelineState?.nextShader?.code,
    timelineState?.nextShader?.id,
    timelineState?.transitionEffect,
  ]);

  const renderUniformDefinitions = useMemo(
    () => parseUniforms(renderDescriptor.shaderCode),
    [renderDescriptor.shaderCode],
  );

  const baseUniformValues = useMemo(
    () =>
      syncUniformValues(
        renderDescriptor.uniformValues,
        renderUniformDefinitions,
      ),
    [renderDescriptor.uniformValues, renderUniformDefinitions],
  );

  const currentTimelineUniformValues = useMemo(
    () =>
      timelineState
        ? syncUniformValues(
            timelineState.currentShader.id === activeShaderId
              ? activeUniformValues
              : timelineState.currentShader.uniformValues ?? EMPTY_UNIFORM_VALUES,
            parseUniforms(timelineState.currentShader.code),
          )
        : EMPTY_UNIFORM_VALUES,
    [
      activeShaderId,
      activeUniformValues,
      timelineState?.currentShader.code,
      timelineState?.currentShader.id,
      timelineState?.currentShader.uniformValues,
    ],
  );

  const nextTimelineUniformValues = useMemo(
    () =>
      timelineState?.nextShader
        ? syncUniformValues(
            timelineState.nextShader.id === activeShaderId
              ? activeUniformValues
              : timelineState.nextShader.uniformValues ?? EMPTY_UNIFORM_VALUES,
            parseUniforms(timelineState.nextShader.code),
          )
        : EMPTY_UNIFORM_VALUES,
    [
      activeShaderId,
      activeUniformValues,
      timelineState?.nextShader?.code,
      timelineState?.nextShader?.id,
      timelineState?.nextShader?.uniformValues,
    ],
  );

  const renderUniformValues = useMemo(() => {
    if (!renderDescriptor.isTransitionShader) {
      return baseUniformValues;
    }

    let nextValues: ShaderUniformValueMap = {
      ...baseUniformValues,
      u_transition_progress: timelineState?.transitionProgress ?? 0,
    };

    nextValues = applyNamespacedUniformValues({
      baseValues: nextValues,
      sourceValues: currentTimelineUniformValues,
      namespace: 'timeline_from',
    });

    nextValues = applyNamespacedUniformValues({
      baseValues: nextValues,
      sourceValues: nextTimelineUniformValues,
      namespace: 'timeline_to',
    });

    return nextValues;
  }, [
    baseUniformValues,
    currentTimelineUniformValues,
    nextTimelineUniformValues,
    renderDescriptor.isTransitionShader,
    timelineState?.transitionProgress,
  ]);

  return (
    <StageRenderer
      asset={asset}
      assetUrl={assetUrl}
      assetUrlStatus={assetUrlStatus}
      shaderCode={renderDescriptor.shaderCode}
      shaderCompileNonce={shaderCompileNonce}
      uniformDefinitions={renderUniformDefinitions}
      uniformValues={renderUniformValues}
      stageTransform={stageTransform}
      transport={transport}
      isOutputOnly={isOutputOnly}
      onCompilerError={onCompilerError}
    />
  );
}
