import { useId, useLayoutEffect, useRef } from 'react';
import './AudioCaptureDialog.css';

/** Stays above the workspace while the browser picker and audio setup are pending. */
export function AudioCaptureDialog({ open }: { open: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const instructionsId = useId();

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="audio-capture-dialog"
      aria-labelledby={titleId}
      aria-describedby={instructionsId}
      aria-busy={open}
      // The browser's picker owns cancellation; hiding this dialog would leave capture pending.
      onCancel={(event) => event.preventDefault()}
    >
      <span className="audio-capture-dialog-spinner" aria-hidden="true" />
      <h2 id={titleId}>Share your computer audio</h2>
      <div id={instructionsId} className="audio-capture-dialog-instructions">
        <p>In the browser’s sharing window, choose <strong>Window</strong> or <strong>Entire screen</strong>.</p>
        <p>Turn on <strong>Share audio</strong>, then click <strong>Share</strong>.</p>
      </div>
      <p className="audio-capture-dialog-status" role="status">Waiting for audio sharing…</p>
      <p className="audio-capture-dialog-note">
        Setup may take a few seconds. This message closes automatically when audio is ready.
      </p>
    </dialog>
  );
}
