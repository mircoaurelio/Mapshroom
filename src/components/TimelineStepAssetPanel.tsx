import {
  TIMELINE_ASSET_BLEND_MODE_OPTIONS,
  TIMELINE_ASSET_FIT_MODE_OPTIONS,
  TIMELINE_ASSET_QUALITY_OPTIONS,
} from '../lib/timelineAssetSettings';
import { useAssetObjectUrl } from '../lib/useAssetObjectUrl';
import type { AssetRecord, TimelineStepAssetSettings } from '../types';
import { PanelSection } from './PanelSection';

interface TimelineStepAssetPanelProps {
  stepLabel: string | null;
  shaderName: string | null;
  assignedAsset: AssetRecord | null;
  settings: TimelineStepAssetSettings | null;
  onSettingsChange: ((patch: Partial<TimelineStepAssetSettings>) => void) | null;
  onChooseAsset: (() => void) | null;
  onImportAsset: (() => void) | null;
  onUseLiveStageAsset: (() => void) | null;
}

export function TimelineStepAssetPanel({
  stepLabel,
  shaderName,
  assignedAsset,
  settings,
  onSettingsChange,
  onChooseAsset,
  onImportAsset,
  onUseLiveStageAsset,
}: TimelineStepAssetPanelProps) {
  const assignedAssetResolution = useAssetObjectUrl(assignedAsset);
  const assignedAssetUrl = assignedAssetResolution.url;

  if (!settings || !onSettingsChange) {
    return (
      <PanelSection title="Step Asset">
        <p className="empty-copy">
          Select a timeline step to edit media size, fit, transparency, blend, and clip timing.
        </p>
      </PanelSection>
    );
  }

  return (
    <PanelSection title="Step Asset">
      <div className="stack gap-md timeline-step-asset-panel">
        <div className="asset-browser-preview-shell timeline-step-asset-panel-preview">
          {assignedAsset && assignedAssetUrl ? (
            assignedAsset.kind === 'video' ? (
              <video
                className="asset-browser-preview-media"
                src={assignedAssetUrl}
                muted
                playsInline
                loop
                autoPlay
              />
            ) : (
              <img
                className="asset-browser-preview-media"
                src={assignedAssetUrl}
                alt={assignedAsset.name}
              />
            )
          ) : (
            <div className="asset-browser-preview-placeholder">
              {assignedAsset
                ? 'Preview unavailable on this device.'
                : 'This step is using the live stage asset. Use Choose Asset or Load Media to assign dedicated media.'}
            </div>
          )}
        </div>

        <div className="stack gap-sm">
          <div className="field-inline-label">
            <span>{stepLabel ?? 'Timeline step'}</span>
            <small>{shaderName ?? 'No shader selected'}</small>
          </div>

          <p className="helper-copy">
            {assignedAsset
              ? `${assignedAsset.name} is assigned to this step. Use Choose Asset to replace it, or switch back to the live stage asset here.`
              : 'This step follows the live stage asset until you assign a dedicated library image or video.'}
          </p>

          {onChooseAsset || onImportAsset || (assignedAsset && onUseLiveStageAsset) ? (
            <div className="timeline-step-asset-panel-actions">
              {onChooseAsset ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onChooseAsset}
                >
                  Choose Asset
                </button>
              ) : null}

              {onImportAsset ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onImportAsset}
                >
                  Load Media
                </button>
              ) : null}

              {assignedAsset && onUseLiveStageAsset ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onUseLiveStageAsset}
                >
                  Use Live Stage Asset
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="timeline-asset-settings-grid">
          <label className="field">
            <span>Size X</span>
            <input
              className="text-field"
              type="number"
              min={0.1}
              max={4}
              step={0.05}
              value={settings.scaleX}
              onChange={(event) =>
                onSettingsChange({ scaleX: Number(event.target.value) })
              }
            />
          </label>

          <label className="field">
            <span>Size Y</span>
            <input
              className="text-field"
              type="number"
              min={0.1}
              max={4}
              step={0.05}
              value={settings.scaleY}
              onChange={(event) =>
                onSettingsChange({ scaleY: Number(event.target.value) })
              }
            />
          </label>

          <label className="field">
            <span>Offset X</span>
            <input
              className="text-field"
              type="number"
              min={-1.5}
              max={1.5}
              step={0.05}
              value={settings.offsetX}
              onChange={(event) =>
                onSettingsChange({ offsetX: Number(event.target.value) })
              }
            />
          </label>

          <label className="field">
            <span>Offset Y</span>
            <input
              className="text-field"
              type="number"
              min={-1.5}
              max={1.5}
              step={0.05}
              value={settings.offsetY}
              onChange={(event) =>
                onSettingsChange({ offsetY: Number(event.target.value) })
              }
            />
          </label>

          <label className="field">
            <span>Transparency</span>
            <input
              className="text-field"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={settings.opacity}
              onChange={(event) =>
                onSettingsChange({ opacity: Number(event.target.value) })
              }
            />
          </label>

          <label className="field">
            <span>Blend</span>
            <select
              className="select-field"
              value={settings.blendMode}
              onChange={(event) =>
                onSettingsChange({
                  blendMode: event.target.value as TimelineStepAssetSettings['blendMode'],
                })
              }
            >
              {TIMELINE_ASSET_BLEND_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Fit</span>
            <select
              className="select-field"
              value={settings.fitMode}
              onChange={(event) =>
                onSettingsChange({
                  fitMode: event.target.value as TimelineStepAssetSettings['fitMode'],
                })
              }
            >
              {TIMELINE_ASSET_FIT_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Quality</span>
            <select
              className="select-field"
              value={settings.quality}
              onChange={(event) =>
                onSettingsChange({
                  quality: event.target.value as TimelineStepAssetSettings['quality'],
                })
              }
            >
              {TIMELINE_ASSET_QUALITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Clip Start</span>
            <input
              className="text-field"
              type="number"
              min={0}
              step={0.1}
              disabled={assignedAsset?.kind !== 'video'}
              value={settings.clipStartSeconds}
              onChange={(event) =>
                onSettingsChange({
                  clipStartSeconds: Number(event.target.value),
                })
              }
            />
          </label>

          <label className="field">
            <span>Time Length</span>
            <input
              className="text-field"
              type="number"
              min={0.1}
              step={0.1}
              placeholder="Auto"
              disabled={assignedAsset?.kind !== 'video'}
              value={settings.clipDurationSeconds ?? ''}
              onChange={(event) =>
                onSettingsChange({
                  clipDurationSeconds: event.target.value.trim()
                    ? Number(event.target.value)
                    : null,
                })
              }
            />
          </label>
        </div>
      </div>
    </PanelSection>
  );
}
