import {
  TIMELINE_ASSET_BLEND_MODE_OPTIONS,
  TIMELINE_ASSET_FIT_MODE_OPTIONS,
  TIMELINE_ASSET_QUALITY_OPTIONS,
  TIMELINE_PINNED_COMPOSITE_MODE_OPTIONS,
  TIMELINE_PINNED_STACK_MASK_OPTIONS,
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
  isPinnedStep?: boolean;
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
  isPinnedStep = false,
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

  const showPinnedControls = Boolean(assignedAsset);

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

        {assignedAsset ? (
          <div className="stack gap-sm">
            <button
              type="button"
              className={`toggle-chip ${settings.useStepAssetAsShaderBase ? 'toggle-chip-active' : ''}`}
              aria-pressed={settings.useStepAssetAsShaderBase}
              onClick={() =>
                onSettingsChange({
                  useStepAssetAsShaderBase: !settings.useStepAssetAsShaderBase,
                })
              }
            >
              Use step asset as shader input
            </button>
            <p className="helper-copy">
              {settings.useStepAssetAsShaderBase
                ? 'The shader runs on this step media. Pinned display settings below control how this step composites over the live timeline when pinned.'
                : 'When off, the live stage asset stays the shader input and this step media is composited as an overlay.'}
            </p>

            {showPinnedControls ? (
              <div className="stack gap-sm timeline-pinned-overlay-settings">
                <label className="field">
                  <span>Pinned display</span>
                  <select
                    className="select-field"
                    value={settings.pinnedCompositeMode}
                    onChange={(event) =>
                      onSettingsChange({
                        pinnedCompositeMode:
                          event.target.value as TimelineStepAssetSettings['pinnedCompositeMode'],
                      })
                    }
                  >
                    {TIMELINE_PINNED_COMPOSITE_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {settings.pinnedCompositeMode === 'stackOnTop' ? (
                  <>
                    <label className="field">
                      <span>Stack mask</span>
                      <select
                        className="select-field"
                        value={settings.pinnedStackMaskMode}
                        onChange={(event) =>
                          onSettingsChange({
                            pinnedStackMaskMode:
                              event.target.value as TimelineStepAssetSettings['pinnedStackMaskMode'],
                          })
                        }
                      >
                        {TIMELINE_PINNED_STACK_MASK_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    {settings.pinnedStackMaskMode === 'nonBlack' ? (
                      <label className="field">
                        <span>Black threshold</span>
                        <input
                          className="text-field"
                          type="number"
                          min={0}
                          max={0.5}
                          step={0.005}
                          value={settings.pinnedStackMaskThreshold}
                          onChange={(event) =>
                            onSettingsChange({
                              pinnedStackMaskThreshold: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                    ) : null}
                  </>
                ) : null}

                <p className="helper-copy">
                  {isPinnedStep
                    ? settings.pinnedCompositeMode === 'stackOnTop'
                      ? settings.pinnedStackMaskMode === 'nonBlack'
                        ? 'Pinned content is stacked on top and black pixels are treated as transparent. Lower Black threshold keeps more dark pixels; raise it to cut more black.'
                        : settings.useStepAssetAsShaderBase
                          ? 'Pinned shader output is stacked on top of the live timeline. Use Transparency to control strength.'
                          : 'Pinned media is stacked on top of the live timeline. Use Transparency to control strength.'
                      : settings.useStepAssetAsShaderBase
                        ? 'Pinned shader output is placed over the live timeline with a transparent alpha mix. Use Transparency to control strength.'
                        : 'Pinned media is placed over the live timeline with a transparent alpha mix. Use Transparency to control strength.'
                    : 'These pinned compositing settings apply when this step is pinned beside the live timeline.'}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

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
