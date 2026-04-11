import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { useEffect, useMemo, useRef, useState } from 'react';
import { TimelineStageRenderer } from './TimelineStageRenderer';
import type { StageRendererState } from './StageRenderer';
import type { AssetObjectUrlStatus } from '../lib/useAssetObjectUrl';
import type {
  AssetRecord,
  PlaybackTransport,
  SavedShader,
  ShaderUniformValueMap,
  StageTransform,
  TimelineStub,
} from '../types';

const EXPORT_RESOLUTION_PRESETS = [
  { value: '1080p', label: 'Full HD', width: 1920, height: 1080, bitrateMbps: 18 },
  { value: '1440p', label: 'QHD', width: 2560, height: 1440, bitrateMbps: 26 },
  { value: '2160p', label: '4K', width: 3840, height: 2160, bitrateMbps: 40 },
] as const;

const EXPORT_FPS_OPTIONS = [30, 60] as const;
const EXPORT_CODEC_CANDIDATES = [
  'avc1.640033',
  'avc1.640032',
  'avc1.640028',
  'avc1.4d4029',
  'avc1.42001f',
] as const;
const MICROSECONDS_PER_SECOND = 1_000_000;

type ExportResolutionPreset = (typeof EXPORT_RESOLUTION_PRESETS)[number]['value'];

interface TimelineExportDialogProps {
  open: boolean;
  projectName: string;
  activeAsset: AssetRecord | null;
  activeAssetUrl: string | null;
  activeAssetUrlStatus: AssetObjectUrlStatus;
  assets: AssetRecord[];
  activeShaderId: string;
  activeShaderName: string;
  activeShaderCode: string;
  activeUniformValues: ShaderUniformValueMap;
  savedShaders: SavedShader[];
  timeline: TimelineStub;
  pinnedStepId: string | null;
  stageTransform: StageTransform;
  durationSeconds: number;
  forceActiveShaderPreview?: boolean;
  onClose: () => void;
  onExportRequested?: () => void;
  onExportCompleted?: (result: { filename: string; bytes: number }) => void;
}

function sanitizeFileName(value: string): string {
  const baseName = value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return baseName || 'mapshroom-timeline';
}

function waitForAnimationFrames(frameCount = 1): Promise<void> {
  return new Promise((resolve) => {
    let remainingFrames = Math.max(1, frameCount);
    const tick = () => {
      remainingFrames -= 1;
      if (remainingFrames <= 0) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
}

function waitForTimeout(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

async function resolveSupportedVideoEncoderConfig({
  width,
  height,
  fps,
  bitrate,
}: {
  width: number;
  height: number;
  fps: number;
  bitrate: number;
}): Promise<VideoEncoderConfig> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoEncoder.isConfigSupported !== 'function') {
    throw new Error('This browser cannot encode MP4 exports. Use a recent Chrome or Edge build.');
  }

  for (const codec of EXPORT_CODEC_CANDIDATES) {
    const candidate: VideoEncoderConfig = {
      codec,
      width,
      height,
      bitrate,
      framerate: fps,
      bitrateMode: 'variable',
      hardwareAcceleration: 'prefer-hardware',
      avc: {
        format: 'avc',
      },
    };
    const support = await VideoEncoder.isConfigSupported(candidate);
    if (support.supported) {
      return support.config ?? candidate;
    }
  }

  throw new Error('H.264 MP4 export is not supported by this browser.');
}

export function TimelineExportDialog({
  open,
  projectName,
  activeAsset,
  activeAssetUrl,
  activeAssetUrlStatus,
  assets,
  activeShaderId,
  activeShaderName,
  activeShaderCode,
  activeUniformValues,
  savedShaders,
  timeline,
  pinnedStepId,
  stageTransform,
  durationSeconds,
  forceActiveShaderPreview = false,
  onClose,
  onExportRequested,
  onExportCompleted,
}: TimelineExportDialogProps) {
  const defaultPreset = EXPORT_RESOLUTION_PRESETS[0];
  const [fileName, setFileName] = useState(() => `${sanitizeFileName(projectName)}-timeline`);
  const [resolutionPreset, setResolutionPreset] = useState<ExportResolutionPreset>(defaultPreset.value);
  const [width, setWidth] = useState<number>(defaultPreset.width);
  const [height, setHeight] = useState<number>(defaultPreset.height);
  const [fps, setFps] = useState<(typeof EXPORT_FPS_OPTIONS)[number]>(60);
  const [bitrateMbps, setBitrateMbps] = useState<number>(defaultPreset.bitrateMbps);
  const [isExporting, setIsExporting] = useState(false);
  const [progressRatio, setProgressRatio] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Ready to export the current timeline.');
  const [errorMessage, setErrorMessage] = useState('');
  const [exportTransport, setExportTransport] = useState<PlaybackTransport>({
    isPlaying: false,
    currentTimeSeconds: 0,
    anchorTimestampMs: null,
    playbackRate: 1,
    loop: false,
    externalClockEnabled: false,
  });
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderStateRef = useRef<StageRendererState | null>(null);
  const renderErrorRef = useRef('');
  const encoderErrorRef = useRef<Error | null>(null);
  const dialogSessionTokenRef = useRef(0);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFileName(`${sanitizeFileName(projectName)}-timeline`);
    setProgressRatio(0);
    setStatusMessage('Ready to export the current timeline.');
    setErrorMessage('');
    renderStateRef.current = null;
    renderErrorRef.current = '';
    encoderErrorRef.current = null;
    setExportTransport({
      isPlaying: false,
      currentTimeSeconds: 0,
      anchorTimestampMs: null,
      playbackRate: 1,
      loop: false,
      externalClockEnabled: false,
    });
  }, [open, projectName]);

  useEffect(() => {
    const matchingPreset = EXPORT_RESOLUTION_PRESETS.find((preset) => preset.value === resolutionPreset);
    if (!matchingPreset) {
      return;
    }

    setWidth(matchingPreset.width);
    setHeight(matchingPreset.height);
    setBitrateMbps(matchingPreset.bitrateMbps);
  }, [resolutionPreset]);

  const exportCapabilityMessage = useMemo(() => {
    if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
      return 'MP4 export requires WebCodecs support. Use a recent Chrome or Edge build.';
    }

    return '';
  }, []);

  const exportDurationSeconds =
    Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 1;
  const assetMap = useMemo(
    () => new Map(assets.map((assetRecord) => [assetRecord.id, assetRecord])),
    [assets],
  );
  const exportUsesVideoInput = useMemo(() => {
    if (activeAsset?.kind === 'video') {
      return true;
    }

    const usedShaderIds = new Set(timeline.shaderSequence.steps.map((step) => step.shaderId));
    for (const shader of savedShaders) {
      if (!usedShaderIds.has(shader.id) || !shader.inputAssetId) {
        continue;
      }

      if (assetMap.get(shader.inputAssetId)?.kind === 'video') {
        return true;
      }
    }

    return false;
  }, [activeAsset?.kind, assetMap, savedShaders, timeline.shaderSequence.steps]);

  const hiddenRendererStyle = useMemo(
    () => ({
      width: `${width}px`,
      height: `${height}px`,
    }),
    [height, width],
  );

  const waitForRendererReady = async (sessionToken: number) => {
    const deadline = performance.now() + 20_000;

    while (performance.now() < deadline) {
      if (dialogSessionTokenRef.current !== sessionToken) {
        throw new Error('Export cancelled.');
      }

      const canvas = exportCanvasRef.current;
      const renderState = renderStateRef.current;
      const renderError = renderErrorRef.current.trim();
      const encoderError = encoderErrorRef.current;

      if (renderError) {
        throw new Error(renderError);
      }

      if (encoderError) {
        throw encoderError;
      }

      if (
        canvas &&
        canvas.width > 0 &&
        canvas.height > 0 &&
        renderState &&
        (!renderState.hasLoadingInputSource ||
          renderState.hasBufferedMedia ||
          renderState.hasMissingOnlyInputSources ||
          !renderState.hasRequiredInputSource)
      ) {
        return;
      }

      await waitForAnimationFrames(2);
      if (exportUsesVideoInput) {
        await waitForTimeout(30);
      }
    }

    throw new Error('The export renderer did not become ready in time.');
  };

  const handleExport = async () => {
    if (isExporting) {
      return;
    }

    const nextFileName = sanitizeFileName(fileName);
    const nextWidth = Math.max(16, Math.round(width));
    const nextHeight = Math.max(16, Math.round(height));
    const nextBitrate = Math.max(1, bitrateMbps) * 1_000_000;
    const nextFps = Math.max(1, fps);

    setFileName(nextFileName);
    setErrorMessage('');
    setIsExporting(true);
    setProgressRatio(0);
    setStatusMessage('Preparing the export renderer...');
    renderErrorRef.current = '';
    encoderErrorRef.current = null;
    onExportRequested?.();

    const exportSessionToken = dialogSessionTokenRef.current + 1;
    dialogSessionTokenRef.current = exportSessionToken;

    try {
      const encoderConfig = await resolveSupportedVideoEncoderConfig({
        width: nextWidth,
        height: nextHeight,
        fps: nextFps,
        bitrate: nextBitrate,
      });

      setExportTransport({
        isPlaying: false,
        currentTimeSeconds: 0,
        anchorTimestampMs: null,
        playbackRate: 1,
        loop: false,
        externalClockEnabled: false,
      });

      await waitForAnimationFrames(2);
      await waitForRendererReady(exportSessionToken);

      const sourceCanvas = exportCanvasRef.current;
      if (!sourceCanvas) {
        throw new Error('Unable to access the export canvas.');
      }

      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = nextWidth;
      compositeCanvas.height = nextHeight;
      const compositeContext = compositeCanvas.getContext('2d', {
        alpha: false,
        willReadFrequently: false,
      });
      if (!compositeContext) {
        throw new Error('Unable to allocate the export surface.');
      }

      compositeContext.imageSmoothingEnabled = true;
      compositeContext.imageSmoothingQuality = 'high';

      const muxTarget = new ArrayBufferTarget();
      const muxer = new Muxer({
        target: muxTarget,
        video: {
          codec: 'avc',
          width: nextWidth,
          height: nextHeight,
          frameRate: nextFps,
        },
        fastStart: 'in-memory',
      });

      const encoder = new VideoEncoder({
        output: (chunk, meta) => {
          muxer.addVideoChunk(chunk, meta);
        },
        error: (error) => {
          encoderErrorRef.current = error instanceof Error ? error : new Error(String(error));
        },
      });
      encoder.configure(encoderConfig);

      const frameCount = Math.max(1, Math.ceil(exportDurationSeconds * nextFps));
      const frameDurationUs = Math.round(MICROSECONDS_PER_SECOND / nextFps);
      const keyFrameInterval = Math.max(1, Math.round(nextFps * 2));

      for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
        if (dialogSessionTokenRef.current !== exportSessionToken) {
          throw new Error('Export cancelled.');
        }

        const frameTimeSeconds = Math.min(
          Math.max(0, exportDurationSeconds - 1 / nextFps),
          frameIndex / nextFps,
        );

        setStatusMessage(
          `Rendering frame ${frameIndex + 1} of ${frameCount} at ${frameTimeSeconds.toFixed(2)}s...`,
        );
        setExportTransport({
          isPlaying: false,
          currentTimeSeconds: frameTimeSeconds,
          anchorTimestampMs: null,
          playbackRate: 1,
          loop: false,
          externalClockEnabled: false,
        });

        await waitForAnimationFrames(2);
        if (exportUsesVideoInput) {
          await waitForTimeout(30);
          await waitForAnimationFrames(1);
        }

        if (encoderErrorRef.current) {
          throw encoderErrorRef.current;
        }

        const drawWidth = sourceCanvas.width;
        const drawHeight = sourceCanvas.height;
        if (drawWidth <= 0 || drawHeight <= 0) {
          throw new Error('The export canvas produced an invalid frame.');
        }

        const sourceAspectRatio = drawWidth / drawHeight;
        const targetAspectRatio = nextWidth / nextHeight;
        const targetDrawWidth =
          sourceAspectRatio > targetAspectRatio ? nextWidth : Math.round(nextHeight * sourceAspectRatio);
        const targetDrawHeight =
          sourceAspectRatio > targetAspectRatio ? Math.round(nextWidth / sourceAspectRatio) : nextHeight;
        const targetOffsetX = Math.round((nextWidth - targetDrawWidth) * 0.5);
        const targetOffsetY = Math.round((nextHeight - targetDrawHeight) * 0.5);

        compositeContext.fillStyle = '#000000';
        compositeContext.fillRect(0, 0, nextWidth, nextHeight);
        compositeContext.drawImage(
          sourceCanvas,
          targetOffsetX,
          targetOffsetY,
          targetDrawWidth,
          targetDrawHeight,
        );

        const videoFrame = new VideoFrame(compositeCanvas, {
          timestamp: frameIndex * frameDurationUs,
          duration: frameDurationUs,
        });

        try {
          encoder.encode(videoFrame, {
            keyFrame: frameIndex === 0 || frameIndex % keyFrameInterval === 0,
          });
        } finally {
          videoFrame.close();
        }

        setProgressRatio((frameIndex + 1) / frameCount);
      }

      setStatusMessage('Finalizing MP4...');
      await encoder.flush();
      if (encoderErrorRef.current) {
        throw encoderErrorRef.current;
      }
      encoder.close();
      muxer.finalize();

      const blob = new Blob([muxTarget.buffer], { type: 'video/mp4' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${nextFileName}.mp4`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1_000);

      setProgressRatio(1);
      setStatusMessage(`Downloaded ${nextFileName}.mp4`);
      onExportCompleted?.({
        filename: `${nextFileName}.mp4`,
        bytes: blob.size,
      });
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : 'Unable to export the timeline.';
      setErrorMessage(nextMessage);
      setStatusMessage('Export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isExporting) {
          onClose();
        }
      }}
    >
      <section className="dialog-panel timeline-export-dialog" role="dialog" aria-modal="true" aria-labelledby="timeline-export-title">
        <header className="dialog-header">
          <div>
            <span className="panel-eyebrow">Export</span>
            <h2 id="timeline-export-title" className="dialog-title">
              Timeline MP4
            </h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose} disabled={isExporting}>
            Close
          </button>
        </header>

        <div className="dialog-body timeline-export-dialog-body">
          <p className="dialog-note">
            Export creates a high-quality H.264 MP4 of the current timeline selection. The file does
            not include audio.
          </p>

          {exportCapabilityMessage ? (
            <p className="dialog-note dialog-note-danger">{exportCapabilityMessage}</p>
          ) : null}

          <div className="dialog-grid timeline-export-grid">
            <section className="dialog-section">
              <span className="panel-eyebrow">File</span>
              <div className="stack gap-md">
                <label className="field">
                  <span>Filename</span>
                  <input
                    className="text-field"
                    type="text"
                    value={fileName}
                    onChange={(event) => setFileName(event.target.value)}
                    disabled={isExporting}
                  />
                </label>

                <label className="field">
                  <span>Resolution</span>
                  <select
                    className="select-field"
                    value={resolutionPreset}
                    onChange={(event) => setResolutionPreset(event.target.value as ExportResolutionPreset)}
                    disabled={isExporting}
                  >
                    {EXPORT_RESOLUTION_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label} ({preset.width}x{preset.height})
                      </option>
                    ))}
                  </select>
                </label>

                <div className="dialog-grid timeline-export-size-grid">
                  <label className="field">
                    <span>Width</span>
                    <input
                      className="text-field"
                      type="number"
                      min={320}
                      step={2}
                      value={width}
                      onChange={(event) => setWidth(Number(event.target.value))}
                      disabled={isExporting}
                    />
                  </label>

                  <label className="field">
                    <span>Height</span>
                    <input
                      className="text-field"
                      type="number"
                      min={240}
                      step={2}
                      value={height}
                      onChange={(event) => setHeight(Number(event.target.value))}
                      disabled={isExporting}
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="dialog-section">
              <span className="panel-eyebrow">Video</span>
              <div className="stack gap-md">
                <label className="field">
                  <span>FPS</span>
                  <select
                    className="select-field"
                    value={fps}
                    onChange={(event) => setFps(Number(event.target.value) as (typeof EXPORT_FPS_OPTIONS)[number])}
                    disabled={isExporting}
                  >
                    {EXPORT_FPS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option} fps
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Bitrate (Mbps)</span>
                  <input
                    className="text-field"
                    type="number"
                    min={4}
                    step={1}
                    value={bitrateMbps}
                    onChange={(event) => setBitrateMbps(Number(event.target.value))}
                    disabled={isExporting}
                  />
                </label>

                <div className="status-card timeline-export-status-card">
                  <span className="status-card-label">Timeline</span>
                  <strong className="status-card-value">{exportDurationSeconds.toFixed(2)}s</strong>
                  <p className="helper-copy">
                    The exporter renders the current timeline once, respecting the active mapping,
                    pinned comparison state, and timeline preview selection.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <section className="dialog-section timeline-export-progress-section">
            <span className="panel-eyebrow">Status</span>
            <div className="stack gap-md">
              <div className="timeline-export-progress-bar" aria-hidden="true">
                <span style={{ width: `${Math.max(0, Math.min(100, progressRatio * 100))}%` }} />
              </div>
              <p className="helper-copy">{statusMessage}</p>
              {errorMessage ? <p className="dialog-error-copy">{errorMessage}</p> : null}
            </div>
          </section>

          <div className="timeline-export-render-host" aria-hidden="true">
            <div className="timeline-export-render-shell" style={hiddenRendererStyle}>
              <TimelineStageRenderer
                asset={activeAsset}
                assets={assets}
                assetUrl={activeAssetUrl}
                assetUrlStatus={activeAssetUrlStatus}
                activeShaderId={activeShaderId}
                activeShaderName={activeShaderName}
                activeShaderCode={activeShaderCode}
                activeUniformValues={activeUniformValues}
                savedShaders={savedShaders}
                timeline={timeline}
                pinnedStepId={pinnedStepId}
                stageTransform={stageTransform}
                transport={exportTransport}
                forceActiveShaderPreview={forceActiveShaderPreview}
                onCanvasReady={(canvas) => {
                  exportCanvasRef.current = canvas;
                }}
                onRenderStateChange={(state) => {
                  renderStateRef.current = state;
                }}
                onCompilerError={(message) => {
                  renderErrorRef.current = message;
                }}
              />
            </div>
          </div>
        </div>

        <footer className="dialog-footer">
          <button type="button" className="secondary-button" onClick={onClose} disabled={isExporting}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              void handleExport();
            }}
            disabled={isExporting || Boolean(exportCapabilityMessage)}
          >
            {isExporting ? 'Exporting...' : 'Export MP4'}
          </button>
        </footer>
      </section>
    </div>
  );
}
