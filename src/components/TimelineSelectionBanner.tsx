export interface TimelineSelectionInfo {
  label: string;
  shaderName: string;
  sourceName: string | null;
  isDirty: boolean;
  isLinked: boolean;
}

interface TimelineSelectionBannerProps {
  selection: TimelineSelectionInfo;
  compact?: boolean;
}

export function TimelineSelectionBanner({
  selection,
  compact = false,
}: TimelineSelectionBannerProps) {
  const statusLabel = selection.isLinked ? 'Timeline Linked' : 'Linked';

  return (
    <div
      className={`selection-target-banner timeline-selection-banner ${
        compact ? 'timeline-selection-banner-compact' : ''
      }`}
    >
      <div>
        <span className="timeline-selection-eyebrow">Selected Timeline Shader</span>
        <strong>{selection.label} - {selection.shaderName}</strong>
        <p>
          {selection.sourceName
            ? `Based on ${selection.sourceName}. Changes here update this timeline shader live.`
            : 'Changes here update this selected timeline shader live.'}
        </p>
      </div>
      <span className="selection-target-status timeline-selection-status">{statusLabel}</span>
    </div>
  );
}
