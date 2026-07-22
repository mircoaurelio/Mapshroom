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
import {
  queryOutputDisplays,
  type OutputDisplayOption,
  type OutputDisplayQueryResult,
} from '../lib/screenDetails';
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
  const chooseScreenOnOpen = searchParams.get('chooseScreen') === '1';
  const storedProject = useMemo(
    () => (sessionId ? loadProjectDocument(sessionId) : null),
    [sessionId],
  );
  const [liveProject, setLiveProject] = useState<ProjectDocument | null>(null);
  const [showFullscreenGate, setShowFullscreenGate] = useState(false);
  const [showScreenPicker, setShowScreenPicker] = useState(chooseScreenOnOpen);
  const [displayQuery, setDisplayQuery] = useState<OutputDisplayQueryResult | null>(null);
  const [fullscreenError, setFullscreenError] = useState('');
  const [selectedScreen, setSelectedScreen] = useState<ScreenDetailed | null>(null);
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
    if (!showScreenPicker) return;
    let cancelled = false;
    void queryOutputDisplays().then((result) => {
      if (!cancelled) setDisplayQuery(result);
    });
    return () => {
      cancelled = true;
    };
  }, [showScreenPicker]);

  const enterFullscreenOnDisplay = (display: OutputDisplayOption | null) => {
    setFullscreenError('');
    setSelectedScreen(display?.screen ?? null);
    if (display) {
      try {
        window.moveTo(display.left, display.top);
        window.resizeTo(display.width, display.height);
      } catch {
        // Fullscreen can still succeed when the browser blocks window positioning.
      }
    }

    const request = document.documentElement.requestFullscreen?.(
      display ? { screen: display.screen } : undefined,
    );
    if (!request) {
      setFullscreenError('Fullscreen is not available in this browser. Press F11 to continue.');
      return;
    }

    void request
      .then(() => {
        setShowScreenPicker(false);
        setShowFullscreenGate(false);
      })
      .catch(() => {
        setShowScreenPicker(false);
        setShowFullscreenGate(true);
      });
  };

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
      {showScreenPicker ? (
        <section className="output-screen-picker" aria-labelledby="output-screen-picker-title">
          <div className="output-screen-picker-card">
            <span className="panel-eyebrow">Mapshroom output</span>
            <h1 id="output-screen-picker-title">Where should the output play?</h1>
            <p>Choose a display. This window will move there and fill the entire screen.</p>
            {displayQuery === null ? (
              <p className="output-screen-picker-status">Finding connected displays...</p>
            ) : null}
            {displayQuery?.status === 'ready' ? (
              <div className="output-screen-choice" role="list">
                {displayQuery.screens.map((display) => (
                  <button
                    key={display.id}
                    type="button"
                    role="listitem"
                    className="output-screen-card"
                    onClick={() => enterFullscreenOnDisplay(display)}
                  >
                    <strong>
                      {display.label}{display.isCurrent ? ' (this screen)' : ''}
                    </strong>
                    <span>{display.width} × {display.height} · Open fullscreen</span>
                  </button>
                ))}
              </div>
            ) : null}
            {displayQuery && displayQuery.status !== 'ready' ? (
              <>
                <p className="output-screen-picker-status">{displayQuery.message}</p>
                <button
                  type="button"
                  className="output-screen-card"
                  onClick={() => enterFullscreenOnDisplay(null)}
                >
                  <strong>Use this screen</strong>
                  <span>Open fullscreen here</span>
                </button>
              </>
            ) : null}
            {fullscreenError ? (
              <p className="output-screen-picker-error">{fullscreenError}</p>
            ) : null}
          </div>
        </section>
      ) : null}
      {showFullscreenGate ? (
        <button
          type="button"
          className="output-fullscreen-gate"
          onClick={() => {
            void document.documentElement.requestFullscreen?.(
              selectedScreen ? { screen: selectedScreen } : undefined,
            )
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
