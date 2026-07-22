import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { TimelineStageRenderer } from '../components/TimelineStageRenderer';
import { DEFAULT_STAGE_TRANSFORM } from '../config';
import {
  createMidiOutputSync,
  loadMidiOutputMixState,
  type MidiOutputLiveState,
} from '../lib/midi/outputSync';
import { saveOutputViewportSnapshot } from '../lib/outputViewport';
import { createSessionSync } from '../lib/sessionSync';
import { loadProjectDocument } from '../lib/storage';
import { useAssetObjectUrl } from '../lib/useAssetObjectUrl';
import type { ProjectDocument } from '../types';

const FALLBACK_TIMELINE_STUB = {
  enabled: false,
  durationSeconds: 180,
  markers: [],
  tracks: [],
  shaderSequence: {
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
    sharedSectionDurationSeconds: 8,
    steps: [],
  },
} as const;

export function OutputRoute() {
  const { sessionId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const requestFullscreenOnOpen = searchParams.get('fullscreen') === '1';
  const storedProject = useMemo(
    () => (sessionId ? loadProjectDocument(sessionId) : null),
    [sessionId],
  );
  const [liveProject, setLiveProject] = useState<ProjectDocument | null>(null);
  const [showFullscreenGate, setShowFullscreenGate] = useState(false);
  const [midiOutputMix, setMidiOutputMix] = useState<MidiOutputLiveState | null>(() =>
    sessionId ? loadMidiOutputMixState(sessionId) : null,
  );

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    saveOutputViewportSnapshot(sessionId);
    const handleResize = () => saveOutputViewportSnapshot(sessionId);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    document.addEventListener('fullscreenchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!requestFullscreenOnOpen) {
      setShowFullscreenGate(false);
      return;
    }

    if (document.fullscreenElement) {
      setShowFullscreenGate(false);
      return;
    }

    const root = document.documentElement;
    if (typeof root.requestFullscreen !== 'function') {
      return;
    }

    const attemptFullscreen = () => {
      if (document.fullscreenElement) {
        setShowFullscreenGate(false);
        return;
      }
      void root.requestFullscreen()
        .then(() => setShowFullscreenGate(false))
        .catch(() => setShowFullscreenGate(true));
    };

    attemptFullscreen();
    const retryId = window.setTimeout(attemptFullscreen, 200);
    const gateId = window.setTimeout(() => {
      if (!document.fullscreenElement) {
        setShowFullscreenGate(true);
      }
    }, 500);

    const handleFullscreenChange = () => {
      setShowFullscreenGate(!document.fullscreenElement && requestFullscreenOnOpen);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.clearTimeout(retryId);
      window.clearTimeout(gateId);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [requestFullscreenOnOpen]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const sync = createSessionSync(sessionId, (incomingProject) => {
      setLiveProject(incomingProject);
    });

    return () => sync.destroy();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    setMidiOutputMix(loadMidiOutputMixState(sessionId));
    const sync = createMidiOutputSync(sessionId, setMidiOutputMix);
    const intervalId = window.setInterval(() => {
      const nextState = loadMidiOutputMixState(sessionId);
      if (!nextState) {
        return;
      }

      setMidiOutputMix((currentState) => {
        const currentTransport = currentState?.transport;
        const nextTransport = nextState.transport;
        const stateUnchanged =
          currentState?.enabled === nextState.enabled &&
          currentState?.currentStepId === nextState.currentStepId &&
          currentState?.nextStepId === nextState.nextStepId &&
          currentState?.progress === nextState.progress &&
          currentState?.updatedAt === nextState.updatedAt &&
          currentTransport?.isPlaying === nextTransport?.isPlaying &&
          currentTransport?.currentTimeSeconds === nextTransport?.currentTimeSeconds &&
          currentTransport?.playbackRate === nextTransport?.playbackRate &&
          currentTransport?.loop === nextTransport?.loop;

        return stateUnchanged ? currentState : nextState;
      });
    }, 33);

    return () => {
      window.clearInterval(intervalId);
      sync.destroy();
    };
  }, [sessionId]);

  const project = liveProject?.sessionId === sessionId ? liveProject : storedProject;
  const outputTransport = midiOutputMix?.transport ?? project?.playback.transport ?? null;

  const activeAsset = useMemo(() => {
    if (!project) {
      return null;
    }

    const activeId = project.playback.activeAssetId || project.library.activeAssetId;
    return project.library.assets.find((asset) => asset.id === activeId) ?? null;
  }, [project]);

  const activeAssetResolution = useAssetObjectUrl(activeAsset);
  const activeAssetUrl = activeAssetResolution.url;

  if (!project) {
    return (
      <div className="output-waiting-screen">
        <div className="output-waiting-card">
          <span className="panel-eyebrow">Output</span>
          <h1>Waiting for a live session</h1>
          <p>Open the desktop workspace and launch the dedicated output window again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="output-route">
      <TimelineStageRenderer
        asset={activeAsset}
        assets={project.library.assets}
        assetUrl={activeAssetUrl}
        assetUrlStatus={activeAssetResolution.status}
        activeShaderId={project.studio.activeShaderId}
        activeShaderName={project.studio.activeShaderName}
        activeShaderCode={project.studio.activeShaderCode}
        activeUniformValues={project.studio.uniformValues}
        savedShaders={project.studio.savedShaders}
        timeline={project.timeline?.stub ?? FALLBACK_TIMELINE_STUB}
        pinnedStepId={project.timeline?.stub?.shaderSequence?.pinnedStepId ?? null}
        stageTransform={project.mapping?.stageTransform ?? DEFAULT_STAGE_TRANSFORM}
        transport={outputTransport ?? project.playback.transport}
        midiManualMix={{
          enabled: Boolean(midiOutputMix?.enabled),
          currentStepId: midiOutputMix?.currentStepId ?? null,
          nextStepId: midiOutputMix?.nextStepId ?? null,
          followingStepId: midiOutputMix?.followingStepId ?? null,
          progress: midiOutputMix?.progress ?? 0,
        }}
        isOutputOnly
      />
      {showFullscreenGate ? (
        <button
          type="button"
          className="output-fullscreen-gate"
          onClick={() => {
            void document.documentElement.requestFullscreen?.()
              .then(() => setShowFullscreenGate(false))
              .catch(() => undefined);
          }}
        >
          <span className="panel-eyebrow">Output</span>
          <strong>Enter fullscreen</strong>
          <span>One click — no F11 needed</span>
        </button>
      ) : null}
    </div>
  );
}
