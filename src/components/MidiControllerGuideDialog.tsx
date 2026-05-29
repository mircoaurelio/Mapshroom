interface MidiControllerGuideDialogProps {
  open: boolean;
  onClose: () => void;
}

const timelineMappings = [
  ['Shader layout', 'Fader CC messages control shader sliders'],
  ['Timeline layout', 'Bottom button messages control timeline performance'],
  ['1. Play', 'Start timeline playback'],
  ['2. Stop', 'Pause timeline playback and stay at the current position'],
  ['3. Record', 'Add the current shader to the timeline'],
  ['4. Previous', 'Previous shader with a hard cut'],
  ['5. Next', 'Next shader with a hard cut'],
  ['6. Previous 1', 'Previous shader with a mix transition'],
  ['7. Next 1', 'Next shader with a mix transition'],
  ['8. Up', 'Make the mix faster'],
  ['9. Down', 'Make the mix slower'],
  ['10. Left', 'Select the previous shader without triggering a mix'],
  ['11. Right', 'Select the next shader without triggering a mix'],
  ['Fader 8', 'Manual A/B mix: 0% shows shader A, 100% advances to the next pair'],
  ['CC 22 / CC 23', 'Cycle the selected mix mode'],
  ['Knobs', 'Set mix velocity'],
];

export function MidiControllerGuideDialog({
  open,
  onClose,
}: MidiControllerGuideDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="dialog-panel midi-guide-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="midi-guide-title"
      >
        <header className="dialog-header">
          <div>
            <span className="timeline-dialog-label">MIDI Timeline Mode</span>
            <h2 id="midi-guide-title" className="dialog-title">
              M-VAVE SMC-MIXER
            </h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="dialog-body midi-guide-body">
          <figure className="midi-guide-figure">
            <img
              className="midi-guide-image"
              src="/assets/smc-mixer.jpeg"
              alt="M-VAVE SMC-MIXER controller"
            />
            <figcaption>
              Change mode on the mixer. The app reads the incoming MIDI signal layout and switches
              automatically: slider layout drives shader uniforms, timeline layout drives timeline
              performance. In timeline mode, fader 8 manually controls the current A/B shader mix.
            </figcaption>
          </figure>

          <div className="midi-guide-map" aria-label="MIDI timeline control map">
            {timelineMappings.map(([control, action]) => (
              <div className="midi-guide-row" key={control}>
                <span>{control}</span>
                <strong>{action}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
