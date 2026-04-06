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

type TimelineRenderLayerKind = 'single' | 'transition';

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

  const transportTimeSeconds = useMemo(
    () => getTransportTimeSeconds(transport, timelineNowMs),
    [timelineNowMs, transport],
  );

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
    transport.loop,
    transportTimeSeconds,
  ]);

  const secondaryTimelineState = useMemo(() => {
    if (!shouldResolveLiveTimelineState || shaderSequence.mode !== 'double') {
      return null;
    }

    return resolveShaderTimelineState({
      shaders: availableShaders,
      mode: 'randomMix',
      focusedStepId: shaderSequence.focusedStepId ?? null,
      singleStepLoopEnabled: shaderSequence.singleStepLoopEnabled ?? false,
      randomChoiceEnabled: false,
      sharedTransitionEnabled: true,
      sharedTransitionEffect: shaderSequence.sharedTransitionEffect ?? 'mix',
      sharedTransitionDurationSeconds: shaderSequence.sharedTransitionDurationSeconds ?? 0.75,
      steps: shaderSequence.steps,
      timeSeconds: transportTimeSeconds * DOUBLE_SECONDARY_SPEED,
      loop: transport.loop,
      randomSeedSalt: 'double-secondary',
    });
  }, [
    availableShaders,
    shouldResolveLiveTimelineState,
    shaderSequence.focusedStepId,
    shaderSequence.mode,
    shaderSequence.sharedTransitionDurationSeconds,
    shaderSequence.sharedTransitionEffect,
    shaderSequence.singleStepLoopEnabled,
    shaderSequence.steps,
    transport.loop,
    transportTimeSeconds,
  ]);

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
          u_transition_progress: state.transitionProgress,
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

  const stageRenderLayers = useMemo<StageRenderLayer[]>(() => {
    if (workspaceFocusedPreviewEnabled) {
      const focusedLayer = resolveSingleShaderLayer(focusedSequenceShader ?? activeSavedShader);
      return [
        {
          shaderCode: focusedLayer.shaderCode,
          uniformDefinitions: parseUniforms(focusedLayer.shaderCode),
          uniformValues: focusedLayer.uniformValues,
          opacity: 1,
        },
      ];
    }

    if (!timelineState) {
      const fallbackLayer = resolveSingleShaderLayer(activeSavedShader);
      return [
        {
          shaderCode: fallbackLayer.shaderCode,
          uniformDefinitions: parseUniforms(fallbackLayer.shaderCode),
          uniformValues: fallbackLayer.uniformValues,
          opacity: 1,
        },
      ];
    }

    if (shaderSequence.mode === 'double') {
      const primaryLayer = buildTimelineRenderLayer(timelineState);
      const secondaryLayer = buildTimelineRenderLayer(
        secondaryTimelineState ?? timelineState,
      );

      return [
        {
          shaderCode: primaryLayer.shaderCode,
          uniformDefinitions: parseUniforms(primaryLayer.shaderCode),
          uniformValues: primaryLayer.uniformValues,
          opacity: 0.5,
        },
        {
          shaderCode: secondaryLayer.shaderCode,
          uniformDefinitions: parseUniforms(secondaryLayer.shaderCode),
          uniformValues: secondaryLayer.uniformValues,
          opacity: 0.5,
        },
      ];
    }

    const activeLayer = buildTimelineRenderLayer(timelineState);
    return [
      {
        shaderCode: activeLayer.shaderCode,
        uniformDefinitions: parseUniforms(activeLayer.shaderCode),
        uniformValues: activeLayer.uniformValues,
        opacity: 1,
      },
    ];
  }, [
    activeSavedShader,
    focusedSequenceShader,
    previewActiveShaderCode,
    previewActiveUniformValues,
    preferActiveShaderCompilePreview,
    secondaryTimelineState,
    shaderSequence.mode,
    timelineState,
    workspaceFocusedPreviewEnabled,
  ]);

  const renderDescriptor = stageRenderLayers[0] ?? {
    shaderCode: previewActiveShaderCode,
    uniformDefinitions: parseUniforms(previewActiveShaderCode),
    uniformValues: previewActiveUniformValues,
    opacity: 1,
  };

  const usedFallback = useMemo(
    () => {
      if (workspaceFocusedPreviewEnabled) {
        return resolveSingleShaderLayer(focusedSequenceShader ?? activeSavedShader).usedFallback;
      }

      if (!timelineState) {
        return resolveSingleShaderLayer(activeSavedShader).usedFallback;
      }

      if (shaderSequence.mode === 'double') {
        const primaryLayer = buildTimelineRenderLayer(timelineState);
        const secondaryLayer = buildTimelineRenderLayer(secondaryTimelineState ?? timelineState);
        return primaryLayer.usedFallback || secondaryLayer.usedFallback;
      }

      return buildTimelineRenderLayer(timelineState).usedFallback;
    },
    [
      activeSavedShader,
      focusedSequenceShader,
      secondaryTimelineState,
      shaderSequence.mode,
      timelineState,
      workspaceFocusedPreviewEnabled,
    ],
  );

  return (
    <StageRenderer
      asset={asset}
      assetUrl={assetUrl}
      assetUrlStatus={assetUrlStatus}
      renderLayers={stageRenderLayers}
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
