export type EditorPanel = 'refine' | 'draw' | 'depth' | 'wand';
export type ImageResultKind = 'mask' | 'draw' | 'depth';
export interface EditorSaveResult {
  resultKind: ImageResultKind;
  resultId: string | null;
  automatic: boolean;
  width: number;
  height: number;
}
export interface SavedDepthInput {
  resultId: string;
  originalBuffer?: ArrayBuffer | null;
  originalName?: string;
  originalMimeType?: string;
}
export interface ImageEditorController {
  open(file: File, savedDepth?: SavedDepthInput | null): Promise<void>;
  save(): Promise<void>;
  dispose(): void;
}
export function createImageEditor(root: HTMLElement, options?: {
  integrated?: boolean;
  initialPanel?: EditorPanel;
  manualStart?: boolean;
  mobile?: boolean;
  onPanelChange?: (panel: EditorPanel) => void;
  onStatus?: (state: { status: 'loading' | 'processing' | 'ready' | 'error'; message: string; resultKind: ImageResultKind | null }) => void;
  onSave?: (blob: Blob, result: EditorSaveResult) => Promise<boolean>;
}): ImageEditorController;
