interface ShareProjectDialogProps {
  open: boolean;
  projectName: string;
  shareUrl: string;
  shareHash: string;
  payloadBytes: number;
  shaderCount: number;
  isGenerating: boolean;
  errorMessage: string;
  onClose: () => void;
  onGenerate: () => void;
  onCopy: () => void;
}

function formatPayloadBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ShareProjectDialog({
  open,
  projectName,
  shareUrl,
  shareHash,
  payloadBytes,
  shaderCount,
  isGenerating,
  errorMessage,
  onClose,
  onGenerate,
  onCopy,
}: ShareProjectDialogProps) {
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
      <section className="dialog-panel share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title">
        <header className="dialog-header">
          <div>
            <span className="panel-eyebrow">Share</span>
            <h2 id="share-dialog-title" className="dialog-title">
              Share "{projectName}"
            </h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="dialog-body">
          <p className="dialog-note">
            The share link contains project settings, timeline state, and only the shaders used in
            the timeline. Imported assets are excluded, and the payload is compressed for the URL
            with SHA-256 integrity metadata.
          </p>

          <div className="project-share-stats">
            <span>{shaderCount} shader{shaderCount === 1 ? '' : 's'}</span>
            <span>{formatPayloadBytes(payloadBytes)}</span>
          </div>

          <div className="project-share-actions">
            <button
              type="button"
              className="primary-button"
              disabled={isGenerating}
              onClick={onGenerate}
            >
              {isGenerating ? 'Generating Link...' : shareUrl ? 'Refresh Link' : 'Generate Link'}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={!shareUrl || isGenerating}
              onClick={onCopy}
            >
              Copy Link
            </button>
          </div>

          {errorMessage ? <div className="project-share-error">{errorMessage}</div> : null}

          {shareUrl ? (
            <>
              <label className="field">
                <span>Share URL</span>
                <textarea className="text-area project-share-url" value={shareUrl} readOnly rows={5} />
              </label>

              <label className="field">
                <span>SHA-256</span>
                <input className="text-field" type="text" value={shareHash} readOnly />
              </label>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
