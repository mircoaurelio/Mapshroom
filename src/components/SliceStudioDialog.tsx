import { getSliceStudioUrl } from '../lib/sliceStudioUrl';

interface SliceStudioDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SliceStudioDialog({ open, onClose }: SliceStudioDialogProps) {
  if (!open) {
    return null;
  }

  const handleOpenSliceStudio = () => {
    window.open(getSliceStudioUrl(), '_blank', 'noopener,noreferrer');
    onClose();
  };

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
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="slice-studio-title"
      >
        <header className="dialog-header">
          <div>
            <span className="timeline-dialog-label">Slice Studio</span>
            <h2 id="slice-studio-title" className="dialog-title">
              Open 3D OBJ Slicer
            </h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="dialog-body">
          <p className="dialog-note">
            Slice Studio is a separate Mapshroom module for uploading OBJ models, previewing cross-section
            slices, and exporting printable slice PDFs. It opens in a new browser tab so your current shader
            workspace stays untouched.
          </p>

          <div className="status-card">
            <div className="status-card-row">
              <span className="status-card-label">Module</span>
              <span className="status-card-value">OBJ to Slice PDF</span>
            </div>
            <div className="status-card-row">
              <span className="status-card-label">Opens in</span>
              <span className="status-card-value">New tab</span>
            </div>
          </div>
        </div>

        <footer className="dialog-footer">
          <button type="button" className="ghost-button" onClick={onClose}>
            Stay in Mapshroom
          </button>
          <button type="button" className="primary-button" onClick={handleOpenSliceStudio}>
            Open Slice Studio
          </button>
        </footer>
      </section>
    </div>
  );
}
