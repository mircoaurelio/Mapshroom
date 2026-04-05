export type AssetKind = 'image' | 'video';
export type AssetSourceType = 'uploaded' | 'generated';
export type ShaderUniformType = 'float' | 'int' | 'vec3' | 'bool';
export type ShaderUniformValue = number | boolean | [number, number, number];
export type WorkspaceMode = 'split' | 'immersive';
export type ShaderProvider = 'openai' | 'google';
export type MobileUiMode = 'full' | 'bar' | 'hidden';
export type TimelineTransitionEffect = 'cut' | 'mix' | 'wipe' | 'radial' | 'glitch';
export type TimelineSequenceMode = 'sequence' | 'random' | 'randomMix';
export type TimelineEditorViewMode = 'simple' | 'advanced';
export type TimelineStagePreviewMode = 'timeline' | 'focused';

export interface AssetRecord {
  id: string;
  name: string;
  kind: AssetKind;
  mimeType: string;
  size: number;
  lastModified: number;
  createdAt: string;
  sourceType: AssetSourceType;
}

export interface ShaderVersion {
  id: string;
  prompt: string;
  name: string;
  code: string;
  createdAt: string;
}

export interface SavedShader {
  id: string;
  name: string;
  code: string;
  lastValidCode?: string;
  description?: string;
  group?: string;
  uniformValues?: ShaderUniformValueMap;
  lastValidUniformValues?: ShaderUniformValueMap;
  isTemporary?: boolean;
  isDirty?: boolean;
  sourceShaderId?: string;
  ownerTimelineStepId?: string;
  pendingAiJobCount?: number;
  hasUnreadAiResult?: boolean;
  compileError?: string;
}

export interface StageTransform {
  offsetX: number;
  offsetY: number;
  widthAdjust: number;
  heightAdjust: number;
  precision: number;
  moveMode: boolean;
  rotationLocked: boolean;
}

export interface PlaybackTransport {
  isPlaying: boolean;
  currentTimeSeconds: number;
  anchorTimestampMs: number | null;
  playbackRate: number;
  loop: boolean;
  externalClockEnabled: boolean;
}

export interface AiSettings {
  openaiApiKey: string;
  googleApiKey: string;
  runwayApiKey: string;
  shaderProvider: ShaderProvider;
  openaiShaderModel: string;
  googleShaderModel: string;
  videoGenProvider: 'runway';
}

export interface TimelineStub {
  enabled: boolean;
  durationSeconds: number;
  markers: string[];
  tracks: Array<{
    id: string;
    label: string;
    type: string;
  }>;
  shaderSequence: {
    enabled: boolean;
    mode: TimelineSequenceMode;
    editorView: TimelineEditorViewMode;
    stagePreviewMode: TimelineStagePreviewMode;
    focusedStepId: string | null;
    singleStepLoopEnabled: boolean;
    randomChoiceEnabled: boolean;
    sharedTransitionEnabled: boolean;
    sharedTransitionEffect: TimelineTransitionEffect;
    sharedTransitionDurationSeconds: number;
    steps: Array<{
      id: string;
      shaderId: string;
      durationSeconds: number;
      transitionDurationSeconds: number;
      transitionEffect: TimelineTransitionEffect;
    }>;
  };
}

export interface ExportStub {
  enabled: boolean;
  deterministicRenderReady: boolean;
  lastRequestedAt: string | null;
}

export interface ShaderDefinition {
  id: string;
  name: string;
  code: string;
  description: string;
  group: string;
}

export interface ShaderUniformDefinition {
  type: ShaderUniformType;
  min: number;
  max: number;
  default: ShaderUniformValue;
}

export type ShaderUniformMap = Record<string, ShaderUniformDefinition>;
export type ShaderUniformValueMap = Record<string, ShaderUniformValue>;

export interface ShaderChatTurn {
  role: 'user' | 'model';
  text: string;
}

export interface ProjectDocument {
  version: number;
  sessionId: string;
  library: {
    assets: AssetRecord[];
    activeAssetId: string | null;
  };
  studio: {
    activeShaderId: string;
    activeShaderName: string;
    activeShaderCode: string;
    shaderVersions: ShaderVersion[];
    savedShaders: SavedShader[];
    shaderChatHistory: ShaderChatTurn[];
    uniformValues: ShaderUniformValueMap;
  };
  mapping: {
    stageTransform: StageTransform;
  };
  playback: {
    activeAssetId: string | null;
    transport: PlaybackTransport;
  };
  ai: {
    settings: AiSettings;
  };
  timeline: {
    stub: TimelineStub;
  };
  export: {
    stub: ExportStub;
  };
}

export interface UiPreferences {
  workspaceMode: WorkspaceMode;
  chromeVisible: boolean;
  sidebarVisible: boolean;
  mobileUiMode: MobileUiMode;
  desktopSlidersWindowEnabled: boolean;
}
