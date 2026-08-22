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
import {
  createLiveUniformSync,
  type LiveUniformUpdate,
} from '../lib/liveUniformSync';
import { isTauri, placeDesktopOutputOnMonitor } from '../lib/desktop';
import { loadProjectDocument } from '../lib/storage';
import { useAssetObjectUrl } from '../lib/useAssetObjectUrl';
import { useAudioReactivityOutput } from '../hooks/useAudioReactivity';
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

function applyLiveUniformUpdates(
  project: ProjectDocument,
  updates: LiveUniformUpdate[],
): ProjectDocument {
  if (updates.length === 0) {
    return project;
  }

  const updatesByShaderId = new Map<string, Map<string, LiveUniformUpdate>>();
  for (const update of updates) {
    const shaderUpdates = updatesByShaderId.get(update.shaderId) ?? new Map();
    shaderUpdates.set(update.name, update);
    updatesByShaderId.set(update.shaderId, shaderUpdates);
  }

  const applyValues = (
    values: ProjectDocument['studio']['uniformValues'] | undefined,
    shaderUpdates: Map<string, LiveUniformUpdate>,
  ) => {
    const nextValues = { ...(values ?? {}) };
    for (const update of shaderUpdates.values()) {
      nextValues[update.name] = update.value;
    }
    return nextValues;
  };

  const activeUpdates = updatesByShaderId.get(project.studio.activeShaderId);
  return {
    ...project,
    studio: {
      ...project.studio,
      uniformValues: activeUpdates
        ? applyValues(project.studio.uniformValues, activeUpdates)
        : project.studio.uniformValues,
      savedShaders: project.studio.savedShaders.map((shader) => {
        const shaderUpdates = updatesByShaderId.get(shader.id);
        if (!shaderUpdates) {
          return shader;
        }
        const nextValues = applyValues(shader.uniformValues, shaderUpdates);
        return {
          ...shader,
          uniformValues: nextValues,
          lastValidUniformValues: shader.compileError
            ? shader.lastValidUniformValues
            : nextValues,
        };
      }),
    },
  };
}

export function OutputRoute() {
  const { sessionId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const chooseScreenOnOpen = searchParams.get('chooseScreen') === '1';
  const [storedProject, setStoredProject] = useState<ProjectDocument | null>(null);
  const [liveProject, setLiveProject] = useState<ProjectDocument | null>(null);
  const [showFullscreenGate, setShowFullscreenGate] = useState(false);
  const [showScreenPicker, setShowScreenPicker] = useState(chooseScreenOnOpen);
  const [displayQuery, setDisplayQuery] = useState<OutputDisplayQueryResult | null>(null);
  const [fullscreenError, setFullscreenError] = useState('');
  const [selectedScreen, setSelectedScreen] = useState<ScreenDetailed | null>(null);
  const [midiOutputMix, setMidiOutputMix] = useState<MidiOutputLiveState | null>(() =>
    sessionId ? loadMidiOutputMixState(sessionId) : null,
  );
  const audioReactivity = useAudioReactivityOutput(sessionId || null);

  useEffect(() => {
    let cancelled = false;
    if (!sessionId) {
      return;
    }

    void loadProjectDocument(sessionId).then((loadedProject) => {
      if (!cancelled) {
        setStoredProject(loadedProject);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

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

    if (isTauri()) {
      void placeDesktopOutputOnMonitor(display?.id ?? null, true)
        .then(() => {
          setShowScreenPicker(false);
          setShowFullscreenGate(false);
        })
        .catch((error: unknown) => {
          setFullscreenError(
            error instanceof Error
              ? error.message
              : 'Unable to place the output window on the selected display.',
          );
          setShowFullscreenGate(true);
        });
      return;
    }

    if (display) {
      try {
        window.moveTo(display.left, display.top);
        window.resizeTo(display.width, display.height);
      } catch {
        // Fullscreen can still succeed when the browser blocks window positioning.
      }
    }

    const request = document.documentElement.requestFullscreen?.(
      display?.screen ? { screen: display.screen } : undefined,
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

    const sync = createLiveUniformSync(sessionId, (updates) => {
      setLiveProject((currentProject) => {
        const baseProject =
          currentProject?.sessionId === sessionId ? currentProject : storedProject;
        return baseProject ? applyLiveUniformUpdates(baseProject, updates) : currentProject;
      });
    });
    return () => sync.destroy();
  }, [sessionId, storedProject]);

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
          currentTransport?.renderTimeOffsetSeconds ===
            nextTransport?.renderTimeOffsetSeconds &&
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
        audioBindingsByShaderId={
          audioReactivity.preferences.modeEnabled
            ? audioReactivity.preferences.bindingsByShaderId
            : undefined
        }
        audioRuntime={audioReactivity.runtime}
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
        showGrid={Boolean(project.mapping?.stageTransform?.showGrid)}
      />
      {showScreenPicker ? (
        <section className="output-screen-picker" aria-labelledby="output-screen-picker-title">
          <div className="output-screen-picker-card">
            <span className="panel-eyebrow">Mapshroom output</span>
            <h1 id="output-screen-picker-title">Send Output to your projector</h1>
            <p>
              Keep the Mapshroom workspace on your PC. This separate Output window is the only
              window affected by Move.
            </p>
            <div className="output-setup-guide" role="note" aria-label="Projector setup">
              <div className="output-setup-guide-heading">
                <span aria-hidden="true">1</span>
                <p>
                  <strong>Extend your PC screen first.</strong>
                  On Windows, press <kbd>Win</kbd> + <kbd>P</kbd>, then choose{' '}
                  <strong>Extend</strong> — not Duplicate.
                </p>
              </div>
              <div className="output-setup-guide-heading">
                <span aria-hidden="true">2</span>
                <p>
                  <strong>Choose the projector below.</strong>
                  Mapshroom will move this Output window there and open it fullscreen.
                </p>
              </div>
            </div>
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
                    <span>
                      {display.width} × {display.height} · Move Output here and open fullscreen
                    </span>
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
                  <strong>Fullscreen on this display</strong>
                  <span>First drag this Output window onto the projector, then click here</span>
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
