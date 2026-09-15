import { useEffect, useMemo, useState, type ReactNode, type RefObject } from 'react';
import { getTransportTimeSeconds } from '../lib/clock';
import { getEffectiveTimelinePlaybackSteps, isTimelineStepEnabled, roundTimelineSeconds, resolveShaderTimelineState } from '../lib/timeline';
import { resolveAudioReactiveTimelineState } from '../lib/audioTimeline';
import type { AudioReactiveRuntime } from '../lib/audioReactivity';
import type { AssetRecord, AssetKind, PlaybackTransport, SavedShader, TimelineSequenceMode, TimelineStub, TimelineTransitionEffect } from '../types';
import { ShaderTimelineEditor } from './ShaderTimelineEditor';
import { DurationInput } from './DurationInput';
import type { ImageTransfer } from '../lib/imageTransfer';

interface TimelineBarProps {
  assets: AssetRecord[];
  assetKind: AssetKind | null;
  assetUrl: string | null;
  activeShaderId: string;
  savedShaders: SavedShader[];
  editingStepId: string | null;
  pinnedStepId: string | null;
  sequence: TimelineStub['shaderSequence'];
  transport: PlaybackTransport;
  durationSeconds: number;
  randomSeedSalt: string;
  midiTimelineControlActive?: boolean;
  midiManualMixArmed?: boolean;
  audioReactiveAvailable?: boolean;
  audioReactiveListening?: boolean;
  audioRuntime?: AudioReactiveRuntime;
  transportControls?: ReactNode;
  stageViewportRef?: RefObject<HTMLElement | null>;
  onPlayToggle: () => void;
  onSequenceModeChange: (mode: TimelineSequenceMode) => void;
  onSequenceSharedTransitionChange: (patch: {
    sharedTransitionEnabled?: boolean;
    sharedTransitionEffect?: TimelineTransitionEffect;
    sharedTransitionDurationSeconds?: number;
    sharedSectionDurationSeconds?: number;
  }) => void;
  onSequenceStepChange: (
    stepId: string,
    patch: Partial<TimelineStub['shaderSequence']['steps'][number]>,
  ) => void;
  onRandomizeSequenceStep: (stepId: string) => void;
  onSequencePinnedStepToggle: (stepId: string) => void;
  onBrowseSequenceAssets: (stepId: string) => void;
  onDropSequenceImage: (transfer: ImageTransfer, stepId: string) => void;
  onDuplicateSequenceStep: (stepId: string) => void;
  onRemoveSequenceStep: (stepId: string) => void;
  onEditSequenceStep: (stepId: string) => void;
  onAddSequenceStep?: () => void;
  onAddRandomSequenceStep?: () => void;
  scrollToStepRequest?: { stepId: string; token: number } | null;
}

interface TimelineDialogProps extends Pick<TimelineBarProps, 'sequence' | 'transport' | 'audioReactiveAvailable' | 'audioReactiveListening' | 'onSequenceModeChange' | 'onPlayToggle'> {
  open: boolean;
  onClose: () => void;
  onMobileEqualDurationChange: (durationSeconds: number) => void;
}

function formatTimelineTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function TimelineBar({
  assets,
  assetKind,
  assetUrl,
  activeShaderId,
  savedShaders,
  editingStepId,
  pinnedStepId,
  sequence,
  transport,
  durationSeconds,
  randomSeedSalt,
  midiTimelineControlActive = false,
  midiManualMixArmed = false,
  audioReactiveAvailable = false,
  audioReactiveListening = false,
  audioRuntime,
  transportControls,
  stageViewportRef,
  onSequenceModeChange,
  onSequenceSharedTransitionChange,
  onSequenceStepChange,
  onRandomizeSequenceStep,
  onSequencePinnedStepToggle,
  onBrowseSequenceAssets,
  onDropSequenceImage,
  onDuplicateSequenceStep,
  onRemoveSequenceStep,
  onEditSequenceStep,
  onAddSequenceStep,
  onAddRandomSequenceStep,
  scrollToStepRequest = null,
}: TimelineBarProps) {
  const [nowMs, setNowMs] = useState(() => performance.now());
  useEffect(() => {
    const update = () => { if (!document.hidden) setNowMs(performance.now()); };
    update();
    if (!transport.isPlaying && sequence.mode !== 'audioReactive') return;
    // Card highlighting needs only a low-frequency UI clock, not a scrubber frame loop.
    const timer = window.setInterval(update, 125);
    document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, [sequence.mode, transport.anchorTimestampMs, transport.isPlaying, transport.playbackRate]);

  const transportTimeSeconds = getTransportTimeSeconds(transport, nowMs);
  const nowEpochMs = performance.timeOrigin + nowMs;
  const playbackDisplaySteps = useMemo(
    () =>
      getEffectiveTimelinePlaybackSteps({
        mode: sequence.mode,
        randomChoiceEnabled: sequence.randomChoiceEnabled,
        steps: sequence.steps,
        sharedSectionDurationSeconds: sequence.sharedSectionDurationSeconds,
        sharedTransitionEnabled: sequence.sharedTransitionEnabled,
        sharedTransitionDurationSeconds: sequence.sharedTransitionDurationSeconds,
        pinnedStepId,
      }),
    [
      pinnedStepId,
      sequence.mode,
      sequence.randomChoiceEnabled,
      sequence.sharedSectionDurationSeconds,
      sequence.sharedTransitionEnabled,
      sequence.sharedTransitionDurationSeconds,
      sequence.steps,
    ],
  );
  const timelineState = useMemo(() => {
    if (playbackDisplaySteps.length === 0) {
      return null;
    }

    if (sequence.mode === 'audioReactive' && audioRuntime) {
      return resolveAudioReactiveTimelineState({
        shaders: savedShaders,
        steps: playbackDisplaySteps,
        section: audioRuntime.current.section,
        nowEpochMs,
        transitionEffect: sequence.sharedTransitionEffect,
        transitionDurationSeconds: sequence.sharedTransitionDurationSeconds,
        focusedStepId: sequence.focusedStepId,
        singleStepLoopEnabled: sequence.singleStepLoopEnabled,
      });
    }

    return resolveShaderTimelineState({
      shaders: savedShaders,
      mode: sequence.mode,
      focusedStepId: sequence.focusedStepId,
      singleStepLoopEnabled: sequence.singleStepLoopEnabled,
      randomChoiceEnabled: sequence.randomChoiceEnabled,
      sharedTransitionEnabled: sequence.sharedTransitionEnabled,
      sharedTransitionEffect: sequence.sharedTransitionEffect,
      sharedTransitionDurationSeconds: sequence.sharedTransitionDurationSeconds,
      sharedSectionDurationSeconds: sequence.sharedSectionDurationSeconds,
      steps: playbackDisplaySteps,
      timeSeconds: transportTimeSeconds,
      loop: transport.loop,
      randomSeedSalt,
    });
  }, [
    playbackDisplaySteps,
    audioRuntime,
    nowEpochMs,
    savedShaders,
    sequence.focusedStepId,
    sequence.mode,
    sequence.randomChoiceEnabled,
    sequence.sharedTransitionEnabled,
    sequence.singleStepLoopEnabled,
    sequence.sharedSectionDurationSeconds,
    sequence.sharedTransitionDurationSeconds,
    sequence.sharedTransitionEffect,
    transport.loop,
    transportTimeSeconds,
    randomSeedSalt,
  ]);
  return (
    <div className="timeline-bar timeline-bar-desktop">
      <ShaderTimelineEditor
        transportControls={transportControls}
        stageViewportRef={stageViewportRef}
        assets={assets}
        assetKind={assetKind}
        assetUrl={assetUrl}
        savedShaders={savedShaders}
        activeShaderId={activeShaderId}
        editingStepId={editingStepId}
        activeStepId={timelineState?.currentStep.id ?? null}
        transitionStepId={
          timelineState?.isTransitioning ? timelineState.nextStep?.id ?? null : null
        }
        pinnedStepId={pinnedStepId}
        sequence={sequence}
        totalDurationSeconds={durationSeconds}
        midiTimelineControlActive={midiTimelineControlActive}
        midiManualMixArmed={midiManualMixArmed}
        audioReactiveAvailable={audioReactiveAvailable}
        audioReactiveListening={audioReactiveListening}
        onModeChange={onSequenceModeChange}
        onSharedTransitionChange={onSequenceSharedTransitionChange}
        onStepChange={onSequenceStepChange}
        onRandomizeStep={onRandomizeSequenceStep}
        onPinnedStepToggle={onSequencePinnedStepToggle}
        onBrowseAssets={onBrowseSequenceAssets}
        onDropImage={onDropSequenceImage}
        onDuplicateStep={onDuplicateSequenceStep}
        onRemoveStep={onRemoveSequenceStep}
        onEditStep={onEditSequenceStep}
        onAddStep={onAddSequenceStep}
        onAddRandomStep={onAddRandomSequenceStep}
        scrollToStepRequest={scrollToStepRequest}
      />
    </div>
  );
}

export function TimelineDialog({
  open,
  onClose,
  onMobileEqualDurationChange,
  ...timelineProps
}: TimelineDialogProps) {
  if (!open) {
    return null;
  }

  const enabledStepCount = timelineProps.sequence.steps.filter(isTimelineStepEnabled).length;
  const randomEnabled =
    timelineProps.sequence.mode === 'random' || timelineProps.sequence.randomChoiceEnabled;
  const audioEnabled = timelineProps.sequence.mode === 'audioReactive';
  const equalDurationSeconds = timelineProps.sequence.sharedSectionDurationSeconds;

  return (
    <div
      className="dialog-backdrop timeline-dialog-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="dialog-panel timeline-dialog-panel"
        role="dialog"
        aria-label="Timeline playback settings"
      >
        <div className="dialog-body mobile-timeline-settings">
          <p className="mobile-timeline-settings-copy">
            Every shader uses the same time. Shader previews and editing live in the Shader panel.
          </p>
          <div className="mobile-timeline-settings-grid">
            <button
              type="button"
              className={`mobile-timeline-setting-card ${
                !audioEnabled ? 'mobile-timeline-setting-card-active' : ''
              }`}
              aria-pressed={!audioEnabled}
              onClick={() => timelineProps.onSequenceModeChange(randomEnabled ? 'sequence' : 'random')}
            >
              <span>Order</span>
              <strong>{randomEnabled ? 'Random' : 'In order'}</strong>
              <small>{randomEnabled ? 'Picks a different card before repeating.' : 'Plays cards from first to last.'}</small>
            </button>
            {timelineProps.audioReactiveAvailable || audioEnabled ? (
              <button
                type="button"
                className={`mobile-timeline-setting-card ${
                  audioEnabled ? 'mobile-timeline-setting-card-active' : ''
                }`}
                aria-pressed={audioEnabled}
                onClick={() =>
                  timelineProps.onSequenceModeChange(
                    audioEnabled ? 'sequence' : 'audioReactive',
                  )
                }
              >
                <span>Music</span>
                <strong>Audio Sync</strong>
                <small>
                  {timelineProps.audioReactiveListening
                    ? 'Advances when the song changes section.'
                    : 'Waiting for Audio Reactive capture.'}
                </small>
              </button>
            ) : null}
            <div className="mobile-timeline-setting-card mobile-timeline-duration-card">
              <DurationInput
                label="Clip"
                description={audioEnabled ? 'Minimum clip duration before an audio change.' : 'Total clip duration, including the mix.'}
                value={equalDurationSeconds}
                min={audioEnabled ? 1 : 0.5}
                max={600}
                onCommit={onMobileEqualDurationChange}
              />
              <small>
                {audioEnabled
                  ? `Wait at least ${roundTimelineSeconds(equalDurationSeconds)}s between changes`
                  : `${enabledStepCount} shaders · ${formatTimelineTime(equalDurationSeconds * enabledStepCount)} total`}
              </small>
            </div>
          </div>
          <div className="mobile-timeline-transport-card">
            <div>
              <span>{audioEnabled ? 'Audio input' : 'Playback'}</span>
              <strong>
                {audioEnabled
                  ? timelineProps.audioReactiveListening
                    ? 'Listening for song changes'
                    : 'Capture is not running'
                  : timelineProps.transport.isPlaying
                    ? 'Timeline running'
                    : 'Timeline paused'}
              </strong>
            </div>
            {!audioEnabled ? (
              <button type="button" className="primary-button" onClick={timelineProps.onPlayToggle}>
                {timelineProps.transport.isPlaying ? 'Pause' : 'Play'}
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
