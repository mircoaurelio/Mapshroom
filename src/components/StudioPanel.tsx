import { useMemo, useRef, useEffect, useState, type UIEvent as ReactUIEvent } from 'react';
import type {
  SavedShader,
  ShaderUniformMap,
  ShaderUniformValue,
  ShaderUniformValueMap,
  ShaderVersion,
} from '../types';
import { PanelSection } from './PanelSection';
import type { TimelineSelectionInfo } from './TimelineSelectionBanner';
import { UniformPanel } from './UniformPanel';

interface ShaderStudioControlsSectionProps {
  savedShaders: SavedShader[];
  activeShaderId: string;
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

function ExpandIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M7.5 3.5h-4v4" />
      <path d="M3.5 3.5 8 8" />
      <path d="M12.5 3.5h4v4" />
      <path d="M16.5 3.5 12 8" />
      <path d="M7.5 16.5h-4v-4" />
      <path d="M3.5 16.5 8 12" />
      <path d="M12.5 16.5h4v-4" />
      <path d="M16.5 16.5 12 12" />
    </svg>
  );
}

function PresetIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <rect x="3" y="4" width="5" height="5" rx="1" />
      <rect x="12" y="4" width="5" height="5" rx="1" />
      <rect x="3" y="11" width="5" height="5" rx="1" />
      <rect x="12" y="11" width="5" height="5" rx="1" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3h8.38L17 6.12V15.5A1.5 1.5 0 0 1 15.5 17h-10A1.5 1.5 0 0 1 4 15.5Z" />
      <path d="M7 3.75v4.5h5.5v-4.5" />
      <path d="M7.25 17v-4.75h5.5V17" />
    </svg>
  );
}

const GLSL_TYPES = new Set([
  'bool',
  'float',
  'int',
  'mat2',
  'mat3',
  'mat4',
  'sampler2D',
  'vec2',
  'vec3',
  'vec4',
  'void',
]);

const GLSL_KEYWORDS = new Set([
  'break',
  'const',
  'continue',
  'discard',
  'do',
  'else',
  'false',
  'for',
  'if',
  'in',
  'inout',
  'out',
  'precision',
  'return',
  'struct',
  'true',
  'uniform',
  'varying',
  'while',
]);

const GLSL_BUILTINS = new Set([
  'abs',
  'acos',
  'asin',
  'atan',
  'ceil',
  'clamp',
  'cos',
  'cross',
  'distance',
  'dot',
  'exp',
  'floor',
  'fract',
  'length',
  'log',
  'max',
  'min',
  'mix',
  'mod',
  'normalize',
  'pow',
  'reflect',
  'sin',
  'smoothstep',
  'sqrt',
  'step',
  'tan',
  'texture2D',
]);

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function wrapToken(className: string, value: string): string {
  return `<span class="${className}">${escapeHtml(value)}</span>`;
}

function getUniformNames(shaderCode: string): Set<string> {
  const names = new Set<string>();
  for (const match of shaderCode.matchAll(/\buniform\s+\w+\s+([A-Za-z_]\w*)/g)) {
    names.add(match[1]);
  }
  return names;
}

function highlightGlslCodePart(value: string, uniformNames: Set<string>): string {
  const tokenPattern = /[A-Za-z_]\w*|\d*\.\d+(?:[eE][+-]?\d+)?|\d+(?:[eE][+-]?\d+)?|[{}()[\];,.+\-*/%=<>!&|?:]/g;
  let output = '';
  let cursor = 0;
  for (const match of value.matchAll(tokenPattern)) {
    const token = match[0];
    const index = match.index ?? 0;
    output += escapeHtml(value.slice(cursor, index));

    if (GLSL_TYPES.has(token)) {
      output += wrapToken('glsl-token-type', token);
    } else if (GLSL_KEYWORDS.has(token)) {
      output += wrapToken('glsl-token-keyword', token);
    } else if (uniformNames.has(token)) {
      output += wrapToken('glsl-token-uniform', token);
    } else if (GLSL_BUILTINS.has(token)) {
      output += wrapToken('glsl-token-function', token);
    } else if (/^\d/.test(token) || token.startsWith('.')) {
      output += wrapToken('glsl-token-number', token);
    } else if (/^[{}()[\];,.+\-*/%=<>!&|?:]$/.test(token)) {
      output += wrapToken('glsl-token-operator', token);
    } else {
      output += escapeHtml(token);
    }

    cursor = index + token.length;
  }

  return output + escapeHtml(value.slice(cursor));
}

function highlightGlslCode(shaderCode: string): string {
  const uniformNames = getUniformNames(shaderCode);
  return shaderCode
    .split('\n')
    .map((line) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith('#')) {
        return wrapToken('glsl-token-preprocessor', line);
      }

      const commentIndex = line.indexOf('//');
      if (commentIndex >= 0) {
        return `${highlightGlslCodePart(line.slice(0, commentIndex), uniformNames)}${wrapToken(
          'glsl-token-comment',
          line.slice(commentIndex),
        )}`;
      }

      return highlightGlslCodePart(line, uniformNames);
    })
    .join('\n');
}

function GlslCodeEditor({
  value,
  expanded = false,
  autoFocus = false,
  onChange,
}: {
  value: string;
  expanded?: boolean;
  autoFocus?: boolean;
  onChange: (value: string) => void;
}) {
  const highlightRef = useRef<HTMLPreElement | null>(null);
  const highlightedCode = useMemo(() => highlightGlslCode(value), [value]);
  const handleScroll = (event: ReactUIEvent<HTMLTextAreaElement>) => {
    if (!highlightRef.current) {
      return;
    }

    highlightRef.current.scrollTop = event.currentTarget.scrollTop;
    highlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
  };

  return (
    <div className={`code-editor-shell ${expanded ? 'code-editor-shell-expanded' : ''}`}>
      <pre
        ref={highlightRef}
        className={`code-editor-highlight ${expanded ? 'code-editor-highlight-expanded' : ''}`}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: `${highlightedCode}\n` }}
      />
      <textarea
        className={`code-editor code-editor-semantic ${
          expanded ? 'code-editor-expanded' : ''
        }`}
        value={value}
        spellCheck={false}
        autoFocus={autoFocus}
        onScroll={handleScroll}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return collapsed ? (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m7 6 6 4-6 4" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m6 7 4 6 4-6" />
    </svg>
  );
}

export function ShaderStudioControlsSection({
  savedShaders,
  activeShaderId,
  onSaveShader,
  onBrowsePresets,
  timelineSelection,
}: ShaderStudioControlsSectionProps) {
  const activeShaderName =
    savedShaders.find((shader) => shader.id === activeShaderId)?.name ?? 'Custom Shader';

  return (
    <PanelSection title="Shader Studio">
      <div className="stack gap-md">
        <div className="stack gap-sm">
          <div className="field-inline-label">
            <span>Current Shader</span>
            <small>{activeShaderName}</small>
          </div>
          <div className="button-row shader-studio-action-row">
            <button
              type="button"
              className="secondary-button shader-studio-action-button"
              onClick={onBrowsePresets}
            >
              <PresetIcon />
              <span>Preset List</span>
            </button>
            <button
              type="button"
              className="primary-button shader-studio-action-button"
              onClick={onSaveShader}
            >
              <SaveIcon />
              <span>{timelineSelection?.isLinked ? 'Save To Library' : 'Save'}</span>
            </button>
          </div>
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
}: ShaderCodeSectionProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [collapsed, setCollapsed] = useState(false);
  const [isExpandedEditorOpen, setIsExpandedEditorOpen] = useState(false);
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

  useEffect(() => {
    if (!isExpandedEditorOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpandedEditorOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpandedEditorOpen]);

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
            className="icon-button"
            aria-label="Open expanded code editor"
            title="Open expanded code editor"
            onClick={() => setIsExpandedEditorOpen(true)}
          >
            <ExpandIcon />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={collapsed ? 'Expand code editor' : 'Collapse code editor'}
            title={collapsed ? 'Expand code editor' : 'Collapse code editor'}
            onClick={() => setCollapsed((currentValue) => !currentValue)}
          >
            <CollapseIcon collapsed={collapsed} />
          </button>
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
      {collapsed ? (
        <div className="code-collapsed-note">Code editor collapsed.</div>
      ) : (
        <div className="stack gap-md">
          <GlslCodeEditor value={shaderCode} onChange={onShaderCodeChange} />
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
      )}

      {isExpandedEditorOpen ? (
        <div
          className="dialog-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsExpandedEditorOpen(false);
            }
          }}
        >
          <section
            className="dialog-panel code-editor-dialog-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="expanded-code-editor-title"
          >
            <header className="dialog-header">
              <div>
                <span className="panel-eyebrow">Shader Source</span>
                <h2 id="expanded-code-editor-title" className="dialog-title">
                  Code Editor
                </h2>
              </div>
              <div className="button-row">
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
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setIsExpandedEditorOpen(false)}
                >
                  Close
                </button>
              </div>
            </header>

            <div className="code-editor-dialog-body">
              <GlslCodeEditor
                value={shaderCode}
                expanded
                autoFocus
                onChange={onShaderCodeChange}
              />
              {compilerError ? (
                <div className="error-panel code-editor-dialog-error">
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
          </section>
        </div>
      ) : null}
    </PanelSection>
  );
}

export function StudioPanel({
  savedShaders,
  activeShaderId,
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
        />
      ) : null}

      <ShaderCodeSection
        shaderCode={shaderCode}
        onShaderCodeChange={onShaderCodeChange}
        compilerError={compilerError}
        aiLoading={aiLoading}
        onFixError={onFixError}
        onReloadShaderCode={onReloadShaderCode}
      />

      <ShaderVersionTrailSection versions={versions} onRestoreVersion={onRestoreVersion} />
    </>
  );
}
