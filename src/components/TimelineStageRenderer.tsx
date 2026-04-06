import { useEffect, useMemo, useState } from 'react';
import { getTransportTimeSeconds } from '../lib/clock';
import { parseUniforms, syncUniformValues } from '../lib/shader';
import {
  getRenderableShaderCode,
  getRenderableShaderUniformValues,
  hasShaderCompileError,
} from '../lib/shaderState';
import { resolveShaderTimelineState } from '../lib/timeline';
import {
  buildTimelineDoubleShaderCode,
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
import { StageRenderer } from './StageRenderer';
import type { AssetObjectUrlStatus } from '../lib/useAssetObjectUrl';

const EMPTY_UNIFORM_VALUES: ShaderUniformValueMap = {};

type TimelineRenderDescriptorKind = 'single' | 'transition' | 'double';

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
  shaderCompileNonce,
  stageTransform,
  transport,
  forceActiveShaderPreview = false,
  preferActiveShaderCompilePreview = false,
  isOutputOnly,
  onCompilerError,
}: TimelineStageRendererProps) {
  const [timelineNowMs, setTimelineNowMs] = useState(() => performance.now());
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
      timeSeconds: getTransportTimeSeconds(transport, timelineNowMs),
      loop: transport.loop,
    });
  }, [
    availableShaders,
    shouldResolveLiveTimelineState,
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
    const renderableActiveShaderCode = activeSavedShader
      ? getRenderableShaderCode(activeSavedShader)
      : activeShaderCode;
    const renderableActiveUniformValues = activeSavedShader
      ? getRenderableShaderUniformValues(activeSavedShader)
      : activeUniformValues;
    const previewActiveShaderCode = preferActiveShaderCompilePreview
      ? activeShaderCode
      : renderableActiveShaderCode;
    const previewActiveUniformValues = preferActiveShaderCompilePreview
      ? syncUniformValues(activeUniformValues, parseUniforms(activeShaderCode))
      : renderableActiveUniformValues;

    if (workspaceFocusedPreviewEnabled) {
      const focusedShader = focusedSequenceShader ?? activeSavedShader;
      const focusedShaderIsActive = focusedShader?.id === activeShaderId;
      const focusedShaderCode =
        focusedShader && !(preferActiveShaderCompilePreview && focusedShaderIsActive)
          ? getRenderableShaderCode(focusedShader)
          : previewActiveShaderCode;
      const focusedUniformValues =
        focusedShader && !(preferActiveShaderCompilePreview && focusedShaderIsActive)
          ? getRenderableShaderUniformValues(focusedShader)
          : previewActiveUniformValues;

      return {
        shaderCode: focusedShaderCode,
        kind: 'single' as TimelineRenderDescriptorKind,
        uniformValues: focusedUniformValues,
        usedFallback:
          !preferActiveShaderCompilePreview &&
          hasShaderCompileError(focusedShader ?? activeSavedShader),
      };
    }

    if (!timelineState) {
      return {
        shaderCode: previewActiveShaderCode,
        kind: 'single' as TimelineRenderDescriptorKind,
        uniformValues: previewActiveUniformValues,
        usedFallback: !preferActiveShaderCompilePreview && hasShaderCompileError(activeSavedShader),
      };
    }

    if (shaderSequence.mode === 'double' && timelineState.nextShader) {
      const currentShaderCode =
        preferActiveShaderCompilePreview && timelineState.currentShader.id === activeShaderId
          ? activeShaderCode
          : getRenderableShaderCode(timelineState.currentShader);
      const nextShaderCode =
        preferActiveShaderCompilePreview && timelineState.nextShader.id === activeShaderId
          ? activeShaderCode
          : getRenderableShaderCode(timelineState.nextShader);
      const currentUsesFallback =
        !(preferActiveShaderCompilePreview && timelineState.currentShader.id === activeShaderId) &&
        hasShaderCompileError(timelineState.currentShader);
      const nextUsesFallback =
        !(preferActiveShaderCompilePreview && timelineState.nextShader.id === activeShaderId) &&
        hasShaderCompileError(timelineState.nextShader);

      return {
        shaderCode: buildTimelineDoubleShaderCode({
          primaryCode: currentShaderCode,
          secondaryCode: nextShaderCode,
        }),
        kind: 'double' as TimelineRenderDescriptorKind,
        uniformValues: EMPTY_UNIFORM_VALUES,
        usedFallback: currentUsesFallback || nextUsesFallback,
      };
    }

    if (
      timelineState.isTransitioning &&
      timelineState.nextShader &&
      timelineState.transitionEffect !== 'cut'
    ) {
      const currentShaderCode =
        preferActiveShaderCompilePreview && timelineState.currentShader.id === activeShaderId
          ? activeShaderCode
          : getRenderableShaderCode(timelineState.currentShader);
      const nextShaderCode =
        preferActiveShaderCompilePreview && timelineState.nextShader.id === activeShaderId
          ? activeShaderCode
          : getRenderableShaderCode(timelineState.nextShader);
      const currentUsesFallback =
        !(preferActiveShaderCompilePreview && timelineState.currentShader.id === activeShaderId) &&
        hasShaderCompileError(timelineState.currentShader);
      const nextUsesFallback =
        !(preferActiveShaderCompilePreview && timelineState.nextShader.id === activeShaderId) &&
        hasShaderCompileError(timelineState.nextShader);

      return {
        shaderCode: buildTimelineTransitionShaderCode({
          fromCode: currentShaderCode,
          toCode: nextShaderCode,
          effect: timelineState.transitionEffect,
        }),
        kind: 'transition' as TimelineRenderDescriptorKind,
        uniformValues: EMPTY_UNIFORM_VALUES,
        usedFallback: currentUsesFallback || nextUsesFallback,
      };
    }

    return {
      shaderCode:
        preferActiveShaderCompilePreview && timelineState.currentShader.id === activeShaderId
          ? activeShaderCode
          : getRenderableShaderCode(timelineState.currentShader),
      kind: 'single' as TimelineRenderDescriptorKind,
      uniformValues:
        timelineState.currentShader.id === activeShaderId
          ? previewActiveUniformValues
          : getRenderableShaderUniformValues(timelineState.currentShader),
      usedFallback:
        timelineState.currentShader.id === activeShaderId
          ? !preferActiveShaderCompilePreview && hasShaderCompileError(activeSavedShader)
          : hasShaderCompileError(timelineState.currentShader),
    };
  }, [
    activeShaderCode,
    activeShaderId,
    activeUniformValues,
    activeSavedShader,
    focusedSequenceShader,
    isOutputOnly,
    preferActiveShaderCompilePreview,
    shaderSequence.mode,
    workspaceFocusedPreviewEnabled,
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
              ? preferActiveShaderCompilePreview
                ? activeUniformValues
                : getRenderableShaderUniformValues(activeSavedShader)
              : getRenderableShaderUniformValues(timelineState.currentShader),
            parseUniforms(
              preferActiveShaderCompilePreview && timelineState.currentShader.id === activeShaderId
                ? activeShaderCode
                : getRenderableShaderCode(timelineState.currentShader),
            ),
          )
        : EMPTY_UNIFORM_VALUES,
    [
      activeSavedShader,
      activeShaderCode,
      activeShaderId,
      activeUniformValues,
      preferActiveShaderCompilePreview,
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
              ? preferActiveShaderCompilePreview
                ? activeUniformValues
                : getRenderableShaderUniformValues(activeSavedShader)
              : getRenderableShaderUniformValues(timelineState.nextShader),
            parseUniforms(
              preferActiveShaderCompilePreview && timelineState.nextShader.id === activeShaderId
                ? activeShaderCode
                : getRenderableShaderCode(timelineState.nextShader),
            ),
          )
        : EMPTY_UNIFORM_VALUES,
    [
      activeSavedShader,
      activeShaderCode,
      activeShaderId,
      activeUniformValues,
      preferActiveShaderCompilePreview,
      timelineState?.nextShader?.code,
      timelineState?.nextShader?.id,
      timelineState?.nextShader?.uniformValues,
    ],
  );

  const renderUniformValues = useMemo(() => {
    if (renderDescriptor.kind === 'single') {
      return baseUniformValues;
    }

    let nextValues: ShaderUniformValueMap = { ...baseUniformValues };

    if (renderDescriptor.kind === 'transition') {
      nextValues.u_transition_progress = timelineState?.transitionProgress ?? 0;
    }

    nextValues = applyNamespacedUniformValues({
      baseValues: nextValues,
      sourceValues: currentTimelineUniformValues,
      namespace: renderDescriptor.kind === 'double' ? 'timeline_primary' : 'timeline_from',
    });

    nextValues = applyNamespacedUniformValues({
      baseValues: nextValues,
      sourceValues: nextTimelineUniformValues,
      namespace: renderDescriptor.kind === 'double' ? 'timeline_secondary' : 'timeline_to',
    });

    return nextValues;
  }, [
    baseUniformValues,
    currentTimelineUniformValues,
    nextTimelineUniformValues,
    renderDescriptor.kind,
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
      onCompilerError={(message) => {
        if (!onCompilerError) {
          return;
        }

        if (!message && renderDescriptor.usedFallback) {
          return;
        }

        onCompilerError(message);
      }}
    />
  );
}
