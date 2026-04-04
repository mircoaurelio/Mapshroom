import { useEffect, useState } from 'react';
import type {
  SavedShader,
  ShaderUniformMap,
  ShaderUniformValue,
  ShaderUniformValueMap,
  ShaderVersion,
} from '../types';
import { PanelSection } from './PanelSection';
import {
  TimelineSelectionBanner,
  type TimelineSelectionInfo,
} from './TimelineSelectionBanner';
import { UniformPanel } from './UniformPanel';

interface ShaderStudioControlsSectionProps {
  savedShaders: SavedShader[];
  activeShaderId: string;
  onNewShader: () => void;
  onSaveShader: () => void;
  onBrowsePresets: () => void;
  timelineSelection?: TimelineSelectionInfo;
}

interface ShaderVersionTrailSectionProps {
  versions: ShaderVersion[];
  onRestoreVersion: (versionId: string) => void;
}

interface ShaderCodeSectionProps {
  shaderCode: string;
  onShaderCodeChange: (value: string) => void;
  compilerError: string;
  aiLoading: boolean;
  onFixError: () => void;
  onReloadShaderCode: () => void;
  timelineSelection?: TimelineSelectionInfo;
}

interface StudioPanelProps
  extends ShaderStudioControlsSectionProps,
    ShaderVersionTrailSectionProps,
    ShaderCodeSectionProps {
  uniformDefinitions: ShaderUniformMap;
  uniformValues: ShaderUniformValueMap;
  onUniformChange: (name: string, value: ShaderUniformValue) => void;
  newUniformName: string;
  onNewUniformNameChange: (value: string) => void;
  onQuickAddUniform: () => void;
  showUniformPanel?: boolean;
  uniformPanelTitle?: string;
  timelineSelection?: TimelineSelectionInfo;
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <rect x="7" y="5" width="9" height="11" rx="1.5" />
      <path d="M5.5 12.5H4.75A1.75 1.75 0 0 1 3 10.75v-7A1.75 1.75 0 0 1 4.75 2h7A1.75 1.75 0 0 1 13.5 3.75v.75" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10.5 7.25 13.75 16 5" />
    </svg>
  );
}

function ReloadIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M16 10A6 6 0 1 1 14.24 5.76" />
      <path d="M12.5 2.5H16V6" />
    </svg>
  );
}

export function ShaderStudioControlsSection({
  savedShaders,
  activeShaderId,
  onNewShader,
  onSaveShader,
  onBrowsePresets,
  timelineSelection,
}: ShaderStudioControlsSectionProps) {
  const activeShaderName =
    savedShaders.find((shader) => shader.id === activeShaderId)?.name ?? 'Custom Shader';

  return (
    <PanelSection title="Shader Studio">
      <div className="stack gap-md">
        {timelineSelection ? (
          <TimelineSelectionBanner selection={timelineSelection} />
        ) : null}

        <div className="stack gap-sm">
          <div className="field-inline-label">
            <span>Current Shader</span>
            <small>{activeShaderName}</small>
          </div>
          <div className="button-row">
            <button type="button" className="secondary-button" onClick={onBrowsePresets}>
              Preset List
            </button>
            <button type="button" className="primary-button" onClick={onSaveShader}>
              {timelineSelection?.isLinked ? 'Save To Library' : 'Save'}
            </button>
          </div>
        </div>

        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onNewShader}>
            New Shader
          </button>
        </div>
      </div>
    </PanelSection>
  );
}

export function ShaderVersionTrailSection({
  versions,
  onRestoreVersion,
}: ShaderVersionTrailSectionProps) {
  return (
    <PanelSection title="History">
      <div className="version-list">
        {[...versions].reverse().map((version) => (
          <article className="version-card" key={version.id}>
            <div>
              <strong>{version.name}</strong>
              <p>{version.prompt}</p>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={() => onRestoreVersion(version.id)}
            >
              Restore
            </button>
          </article>
        ))}
      </div>
    </PanelSection>
  );
}

export function ShaderCodeSection({
  shaderCode,
  onShaderCodeChange,
  compilerError,
  aiLoading,
  onFixError,
  onReloadShaderCode,
  timelineSelection,
}: ShaderCodeSectionProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const copyLabel =
    copyState === 'copied' ? 'Code copied' : copyState === 'error' ? 'Copy failed' : 'Copy code';

  useEffect(() => {
    if (copyState === 'idle') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyState('idle');
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copyState]);

  const handleCopyCode = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard unavailable.');
      }

      await navigator.clipboard.writeText(shaderCode);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  };

  return (
    <PanelSection
      title="Code"
      actions={
        <>
          <button
            type="button"
            className={`icon-button ${
              copyState === 'copied'
                ? 'icon-button-success'
                : copyState === 'error'
                  ? 'icon-button-error'
                  : ''
            }`}
            aria-label={copyLabel}
            title={copyLabel}
            onClick={() => {
              void handleCopyCode();
            }}
          >
            {copyState === 'copied' ? <CheckIcon /> : <CopyIcon />}
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Recompile current code"
            title="Recompile current code"
            onClick={onReloadShaderCode}
          >
            <ReloadIcon />
          </button>
        </>
      }
    >
      <div className="stack gap-md">
        {timelineSelection ? (
          <TimelineSelectionBanner selection={timelineSelection} compact />
        ) : null}
        <textarea
          className="code-editor"
          value={shaderCode}
          spellCheck={false}
          onChange={(event) => onShaderCodeChange(event.target.value)}
        />
        {compilerError ? (
          <div className="error-panel">
            {compilerError}
            <button
              type="button"
              className="fix-error-button"
              disabled={aiLoading}
              onClick={onFixError}
            >
              {aiLoading ? 'Fixing...' : 'Fix Error'}
            </button>
          </div>
        ) : null}
      </div>
    </PanelSection>
  );
}

export function StudioPanel({
  savedShaders,
  activeShaderId,
  onNewShader,
  onSaveShader,
  uniformDefinitions,
  uniformValues,
  onUniformChange,
  newUniformName,
  onNewUniformNameChange,
  onQuickAddUniform,
  shaderCode,
  onShaderCodeChange,
  compilerError,
  aiLoading,
  onFixError,
  onBrowsePresets,
  onReloadShaderCode,
  versions,
  onRestoreVersion,
  showUniformPanel = true,
  uniformPanelTitle,
  timelineSelection,
}: StudioPanelProps) {
  return (
    <>
      <ShaderStudioControlsSection
        savedShaders={savedShaders}
        activeShaderId={activeShaderId}
        onNewShader={onNewShader}
        onSaveShader={onSaveShader}
        onBrowsePresets={onBrowsePresets}
        timelineSelection={timelineSelection}
      />

      {showUniformPanel ? (
        <UniformPanel
          title={uniformPanelTitle}
          uniformDefinitions={uniformDefinitions}
          uniformValues={uniformValues}
          onUniformChange={onUniformChange}
          newUniformName={newUniformName}
          onNewUniformNameChange={onNewUniformNameChange}
          onQuickAddUniform={onQuickAddUniform}
          timelineSelection={timelineSelection}
        />
      ) : null}

      <ShaderVersionTrailSection versions={versions} onRestoreVersion={onRestoreVersion} />

      <ShaderCodeSection
        shaderCode={shaderCode}
        onShaderCodeChange={onShaderCodeChange}
        compilerError={compilerError}
        aiLoading={aiLoading}
        onFixError={onFixError}
        onReloadShaderCode={onReloadShaderCode}
        timelineSelection={timelineSelection}
      />
    </>
  );
}
