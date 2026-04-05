import { useEffect, useState } from 'react';
import type { ProjectLibraryEntry } from '../types';

interface ProjectLibraryDialogProps {
  open: boolean;
  currentProjectName: string;
  activeSessionId: string | null;
  savedProjects: ProjectLibraryEntry[];
  onClose: () => void;
  onSaveProject: (name: string) => void;
  onOpenProject: (sessionId: string) => void;
}

function formatProjectTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function ProjectLibraryDialog({
  open,
  currentProjectName,
  activeSessionId,
  savedProjects,
  onClose,
  onSaveProject,
  onOpenProject,
}: ProjectLibraryDialogProps) {
  const [projectNameDraft, setProjectNameDraft] = useState(currentProjectName);

  useEffect(() => {
    if (open) {
      setProjectNameDraft(currentProjectName);
    }
  }, [currentProjectName, open]);

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
      <section className="dialog-panel project-dialog" role="dialog" aria-modal="true" aria-labelledby="project-dialog-title">
        <header className="dialog-header">
          <div>
            <span className="panel-eyebrow">Project</span>
            <h2 id="project-dialog-title" className="dialog-title">
              Save Or Open Project
            </h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="dialog-body">
          <section className="dialog-section">
            <span className="panel-eyebrow">Current Project</span>
            <div className="stack gap-md">
              <label className="field">
                <span>Name</span>
                <input
                  className="text-field"
                  type="text"
                  value={projectNameDraft}
                  onChange={(event) => setProjectNameDraft(event.target.value)}
                  placeholder="Untitled Project"
                />
              </label>
              <div className="project-dialog-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => onSaveProject(projectNameDraft)}
                >
                  Save Project
                </button>
              </div>
            </div>
          </section>

          <section className="dialog-section">
            <span className="panel-eyebrow">Saved Projects</span>
            <div className="project-library-list">
              {savedProjects.length ? (
                savedProjects.map((entry) => (
                  <article key={entry.sessionId} className="project-library-card">
                    <div className="project-library-card-copy">
                      <div className="project-library-card-title-row">
                        <strong>{entry.name}</strong>
                        {entry.sessionId === activeSessionId ? (
                          <span className="project-library-card-badge">Current</span>
                        ) : null}
                      </div>
                      <span className="project-library-card-meta">
                        Updated {formatProjectTimestamp(entry.updatedAt)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => onOpenProject(entry.sessionId)}
                    >
                      Open
                    </button>
                  </article>
                ))
              ) : (
                <div className="project-library-empty">
                  Save the current workspace to pin it in your project list.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
