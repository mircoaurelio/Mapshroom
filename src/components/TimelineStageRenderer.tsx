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
  isOutputOnly,
  onCompilerError,
}: TimelineStageRendererProps) {
  const [timelineNowMs, setTimelineNowMs] = useState(() => performance.now());
  const availableShaders = useMemo(() => {
    if (savedShaders.some((shader) => shader.id === activeShaderId)) {
      return savedShaders;
    }

    return [
      {
        id: activeShaderId,
        name: activeShaderName,
        code: activeShaderCode,
        description: 'Current shader from the live editor.',
        group: 'Live',
      },
      ...savedShaders,
    ];
  }, [activeShaderCode, activeShaderId, activeShaderName, savedShaders]);
  const shaderSequence = timeline.shaderSequence ?? { enabled: false, steps: [] };
  const sequenceEnabled = shaderSequence.enabled && shaderSequence.steps.length > 0;

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
      steps: shaderSequence.steps,
      timeSeconds: getTransportTimeSeconds(transport, timelineNowMs),
      loop: transport.loop,
    });
  }, [
    availableShaders,
    sequenceEnabled,
    shaderSequence.steps,
    timelineNowMs,
    transport,
  ]);

  const renderDescriptor = useMemo(() => {
    if (!timelineState) {
      return {
        shaderCode: activeShaderCode,
        isTransitionShader: false,
        useActiveUniformValues: true,
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
        useActiveUniformValues: false,
      };
    }

    return {
      shaderCode: timelineState.currentShader.code,
      isTransitionShader: false,
      useActiveUniformValues: timelineState.currentShader.id === activeShaderId,
    };
  }, [
    activeShaderCode,
    activeShaderId,
    timelineState?.currentShader.code,
    timelineState?.currentShader.id,
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
        renderDescriptor.useActiveUniformValues ? activeUniformValues : EMPTY_UNIFORM_VALUES,
        renderUniformDefinitions,
      ),
    [activeUniformValues, renderDescriptor.useActiveUniformValues, renderUniformDefinitions],
  );

  const renderUniformValues = useMemo(() => {
    if (!renderDescriptor.isTransitionShader) {
      return baseUniformValues;
    }

    let nextValues: ShaderUniformValueMap = {
      ...baseUniformValues,
      u_transition_progress: timelineState?.transitionProgress ?? 0,
    };

    if (timelineState?.currentShader.id === activeShaderId) {
      nextValues = applyNamespacedUniformValues({
        baseValues: nextValues,
        sourceValues: activeUniformValues,
        namespace: 'timeline_from',
      });
    }

    if (timelineState?.nextShader?.id === activeShaderId) {
      nextValues = applyNamespacedUniformValues({
        baseValues: nextValues,
        sourceValues: activeUniformValues,
        namespace: 'timeline_to',
      });
    }

    return nextValues;
  }, [
    activeShaderId,
    activeUniformValues,
    baseUniformValues,
    renderDescriptor.isTransitionShader,
    timelineState?.currentShader.id,
    timelineState?.nextShader?.id,
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
