import { useEffect, useState } from 'react';
import type { ProjectLibraryEntry } from '../types';
import { readBrowserStorageUsage, type BrowserStorageUsage } from '../lib/storage';

interface ProjectLibraryDialogProps {
  open: boolean;
  currentProjectName: string;
  activeSessionId: string | null;
  savedProjects: ProjectLibraryEntry[];
  needsFileSave: boolean;
  onClose: () => void;
  onSaveProject: (name: string) => void;
  onSaveAsNewProject: (name: string) => void;
  onCreateNewProject: () => void;
  onCreateEmptyProject: () => void;
  onOpenProject: (sessionId: string) => void;
  onDeleteProject: (sessionId: string) => void;
  onSaveFile: () => void;
  onOpenFile: () => void;
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

function formatStorageBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }
  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function describeStorageUsage(usage: BrowserStorageUsage | null): {
  label: string;
  warning: boolean;
} {
  if (!usage || usage.usageBytes == null || usage.quotaBytes == null || usage.quotaBytes <= 0) {
    return {
      label: 'Browser storage size is not reported here. Save a file anyway so this work is not only in the browser.',
      warning: false,
    };
  }

  const remaining = usage.quotaBytes - usage.usageBytes;
  const percent = Math.round((usage.usageBytes / usage.quotaBytes) * 100);
  const warning = remaining < 50 * 1024 * 1024 || percent >= 80;
  return {
    label: `This browser is using ${formatStorageBytes(usage.usageBytes)} of ${formatStorageBytes(usage.quotaBytes)} (${percent}%). ${
      warning
        ? 'Leave old copies in place and save a file before adding more images.'
        : 'The durable copy is still a file you keep, not this browser cache.'
    }`,
    warning,
  };
}

export function ProjectLibraryDialog({
  open,
  currentProjectName,
  activeSessionId,
  savedProjects,
  needsFileSave,
  onClose,
  onSaveProject,
  onSaveAsNewProject,
  onCreateNewProject,
  onCreateEmptyProject,
  onOpenProject,
  onDeleteProject,
  onSaveFile,
  onOpenFile,
}: ProjectLibraryDialogProps) {
  const [projectNameDraft, setProjectNameDraft] = useState(currentProjectName);
  const [storageUsage, setStorageUsage] = useState<BrowserStorageUsage | null>(null);

  useEffect(() => {
    if (open) {
      setProjectNameDraft(currentProjectName);
      void readBrowserStorageUsage().then(setStorageUsage);
    }
  }, [currentProjectName, open]);

  if (!open) {
    return null;
  }

  const storageCopy = describeStorageUsage(storageUsage);

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
              Open Or Save File
            </h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="dialog-body">
          <section className="dialog-section">
            <span className="panel-eyebrow">Current workspace</span>
            <p
              className={`project-library-storage-hint ${
                needsFileSave || storageCopy.warning ? 'project-library-storage-hint-warning' : ''
              }`}
            >
              {needsFileSave
                ? 'This show is only recovered in this browser. Save a file, then open that file later. Mapshroom will not delete older copies to make room for new images.'
                : 'A file copy was saved from this tab. Keep that file. The list below is only browser recovery plus starter templates.'}
            </p>
            <p className={`project-library-storage-hint ${storageCopy.warning ? 'project-library-storage-hint-warning' : ''}`}>
              {storageCopy.label}
            </p>
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
                <button type="button" className="primary-button" onClick={onSaveFile}>
                  Save File
                </button>
                <button type="button" className="primary-button" onClick={onOpenFile}>
                  Open File
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onSaveProject(projectNameDraft)}
                >
                  Pin In Browser
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onSaveAsNewProject(projectNameDraft)}
                >
                  Pin As New Browser Copy
                </button>
                <button type="button" className="secondary-button" onClick={onCreateNewProject}>
                  New Starter
                </button>
                <button type="button" className="secondary-button" onClick={onCreateEmptyProject}>
                  New Empty
                </button>
              </div>
            </div>
          </section>

          <section className="dialog-section">
            <span className="panel-eyebrow">Browser recovery and starters</span>
            <p className="project-library-storage-hint">
              Starters are templates. Opening one replaces the current workspace after a warning. Delete only if you already have a file; Mapshroom will not auto-remove old projects.
            </p>
            <div className="project-library-list">
              {savedProjects.length ? (
                savedProjects.map((entry) => (
                  <article key={entry.sessionId} className="project-library-card">
                    <div className="project-library-card-copy">
                      <div className="project-library-card-title-row">
                        <strong>{entry.name}</strong>
                        {entry.bundled ? (
                          <span className="project-library-card-badge">Starter</span>
                        ) : null}
                        {entry.sessionId === activeSessionId ? (
                          <span className="project-library-card-badge">Current</span>
                        ) : null}
                      </div>
                      <span className="project-library-card-meta">
                        Updated {formatProjectTimestamp(entry.updatedAt)}
                      </span>
                    </div>
                    <div className="project-library-card-actions">
                      {!entry.bundled && entry.sessionId !== activeSessionId ? (
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => onDeleteProject(entry.sessionId)}
                        >
                          Delete
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => onOpenProject(entry.sessionId)}
                      >
                        Open
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="project-library-empty">
                  Open a file, or save a file from this workspace, to keep a copy outside the browser.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
