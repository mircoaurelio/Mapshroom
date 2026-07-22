import { useEffect, useState } from 'react';
import {
  queryOutputDisplays,
  type OutputDisplayOption,
  type OutputDisplayQueryResult,
} from '../lib/screenDetails';

interface OutputScreenDialogProps {
  open: boolean;
  onClose: () => void;
  onOpenOnDisplay: (display: OutputDisplayOption) => void;
  onOpenFullscreenHere: () => void;
}

function formatDisplaySize(display: OutputDisplayOption): string {
  return `${display.width}×${display.height}`;
}

function OutputScreenDialogContent({
  onClose,
  onOpenOnDisplay,
  onOpenFullscreenHere,
}: Omit<OutputScreenDialogProps, 'open'>) {
  const [query, setQuery] = useState<OutputDisplayQueryResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    void queryOutputDisplays().then((result) => {
      if (!cancelled) {
        setQuery(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = query === null;
  const secondaryScreens = query?.status === 'ready' ? query.secondaryScreens : [];
  const currentScreen =
    query?.status === 'ready' ? query.screens.find((screen) => screen.isCurrent) ?? null : null;
  const fallbackMessage =
    query && query.status !== 'ready' ? query.message : null;

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
        className="dialog-panel output-screen-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="output-screen-dialog-title"
      >
        <header className="dialog-header">
          <div>
            <span className="panel-eyebrow">Output</span>
            <h2 id="output-screen-dialog-title" className="dialog-title">
              Choose Projection Display
            </h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="dialog-body">
          <p className="dialog-note">
            Pick a secondary screen to open the Mapshroom output window fullscreen, ready for
            projection. Chrome-based browsers can list connected displays after you allow screen
            access.
          </p>

          {isLoading ? <p className="dialog-note">Detecting connected displays…</p> : null}

          {!isLoading && fallbackMessage ? (
            <p className="dialog-note">{fallbackMessage}</p>
          ) : null}

          {!isLoading && query?.status === 'ready' && secondaryScreens.length === 0 ? (
            <p className="dialog-note">
              No secondary display was detected. Connect a projector or second monitor, then try
              again — or open fullscreen on this screen.
            </p>
          ) : null}

          {!isLoading && secondaryScreens.length > 0 ? (
            <section className="dialog-section">
              <span className="panel-eyebrow">Secondary displays</span>
              <div className="output-screen-choice" role="list">
                {secondaryScreens.map((display) => (
                  <button
                    key={display.id}
                    type="button"
                    role="listitem"
                    className="output-screen-card"
                    onClick={() => onOpenOnDisplay(display)}
                  >
                    <strong>{display.label}</strong>
                    <span>
                      {formatDisplaySize(display)}
                      {display.isPrimary ? ' · Primary' : ''}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section className="dialog-section">
            <span className="panel-eyebrow">This display</span>
            <div className="output-screen-choice">
              <button
                type="button"
                className="output-screen-card"
                onClick={onOpenFullscreenHere}
              >
                <strong>
                  {currentScreen?.label ? `${currentScreen.label} (this screen)` : 'This screen'}
                </strong>
                <span>
                  {currentScreen
                    ? `${formatDisplaySize(currentScreen)} · Fullscreen`
                    : 'Open output fullscreen here'}
                </span>
              </button>
            </div>
          </section>
        </div>

        <footer className="dialog-footer">
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancel
          </button>
        </footer>
      </section>
    </div>
  );
}

export function OutputScreenDialog({
  open,
  onClose,
  onOpenOnDisplay,
  onOpenFullscreenHere,
}: OutputScreenDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <OutputScreenDialogContent
      onClose={onClose}
      onOpenOnDisplay={onOpenOnDisplay}
      onOpenFullscreenHere={onOpenFullscreenHere}
    />
  );
}
