import { useEffect, useState } from 'react';
import type { ProjectLibraryEntry } from '../types';
import { readBrowserStorageUsage, type BrowserStorageUsage } from '../lib/storage';
import { ProjectSaveStatus } from './ProjectSaveStatus';

interface ProjectLibraryDialogProps {
  open: boolean;
  currentProjectName: string;
  activeSessionId: string | null;
  savedProjects: ProjectLibraryEntry[];
  saveStatus: import('../lib/projectAutosave').ProjectSaveStatus;
  onRetrySave: () => void;
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
      label: 'Projects and uploaded media are stored on this device, in this browser.',
      warning: false,
    };
  }

  const remaining = usage.quotaBytes - usage.usageBytes;
  const percent = Math.round((usage.usageBytes / usage.quotaBytes) * 100);
  const warning = remaining < 50 * 1024 * 1024 || percent >= 80;
  return {
    label: `This browser is using ${formatStorageBytes(usage.usageBytes)} of ${formatStorageBytes(usage.quotaBytes)} (${percent}%). ${
      warning
        ? 'Storage is running low. Free some space before adding more images.'
        : 'Projects and uploaded media stay in this browser. Clearing site data removes them.'
    }`,
    warning,
  };
}

export function ProjectLibraryDialog({
  open,
  currentProjectName,
  activeSessionId,
  savedProjects,
  saveStatus,
  onRetrySave,
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
              Projects
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
                saveStatus === 'error' || storageCopy.warning ? 'project-library-storage-hint-warning' : ''
              }`}
            >
              <ProjectSaveStatus status={saveStatus} />
              {' — Changes save automatically. Reopen Mapshroom in this browser to continue.'}
            </p>
            {saveStatus === 'error' && <button type="button" className="secondary-button" onClick={onRetrySave}>Retry saving</button>}
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
                  Export JSON
                </button>
                <button type="button" className="primary-button" onClick={onOpenFile}>
                  Import JSON
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onSaveProject(projectNameDraft)}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onSaveAsNewProject(projectNameDraft)}
                >
                  Duplicate
                </button>
                <button type="button" className="secondary-button" onClick={onCreateNewProject}>
                  New Starter
                </button>
                <button type="button" className="secondary-button" onClick={onCreateEmptyProject}>
                  New Empty
                </button>
              </div>
            </div>
            <p className="project-library-storage-hint">JSON export contains project settings; uploaded media are stored separately in this browser and are not included.</p>
          </section>

          <section className="dialog-section">
            <span className="panel-eyebrow">Your projects and starters</span>
            <p className="project-library-storage-hint">
              Opening a starter creates your editable local project. Your changes are kept when you switch projects or return later.
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
                        {entry.bundled ? 'Ready to start' : `Updated ${formatProjectTimestamp(entry.updatedAt)}`}
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
                  Create a project to start. Changes save automatically here.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
