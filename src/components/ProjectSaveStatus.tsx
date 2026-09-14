import type { ProjectSaveStatus as SaveStatus } from '../lib/projectAutosave';
import './ProjectSaveStatus.css';

export function ProjectSaveStatus({ status }: { status: SaveStatus }) {
  return <span className={`project-save-status project-save-status-${status}`} role="status">
    {status === 'saved' ? 'Saved locally' : status === 'error' ? 'Not saved — retry' : 'Saving…'}
  </span>;
}
