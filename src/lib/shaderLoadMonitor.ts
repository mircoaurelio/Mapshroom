export type ShaderLoadWarning = 'gpu' | 'frame' | null;

export interface ShaderLoadMeasurement {
  frameMs: number;
  gpuMs: number | null;
}

interface ShaderLoadSample {
  now: number;
  key: string;
  frameMs: number;
  gpuMs: number | null;
  valid: boolean;
}

function percentile80(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * .8) - 1)] ?? 0;
}

/** Measures the current preview, not a permanent rating of a shader or device. */
export class ShaderLoadMonitor {
  warning: ShaderLoadWarning = null;
  measurement: ShaderLoadMeasurement | null = null;
  private key = '';
  private settleUntil = 0;
  private windowStart = 0;
  private frames: number[] = [];
  private gpu: number[] = [];
  private gpuWindows = 0;
  private slowWindows = 0;
  private recoveryWindows = 0;

  reset(now: number, key = this.key) {
    this.key = key;
    this.warning = null;
    this.measurement = null;
    this.settleUntil = now + 1000;
    this.windowStart = this.settleUntil;
    this.frames = [];
    this.gpu = [];
    this.gpuWindows = this.slowWindows = this.recoveryWindows = 0;
  }

  sample({ now, key, frameMs, gpuMs, valid }: ShaderLoadSample): ShaderLoadWarning {
    // Hidden tabs, shader switches and compilation frames are not evidence of load.
    if (key !== this.key || !valid || !Number.isFinite(frameMs) || frameMs <= 0 || frameMs > 2000) {
      this.reset(now, key);
      return null;
    }
    if (now < this.settleUntil) return this.warning;
    this.frames.push(frameMs);
    if (gpuMs !== null && Number.isFinite(gpuMs) && gpuMs > 0) this.gpu.push(gpuMs);
    if (now - this.windowStart < 1200 || this.frames.length < 12) return this.warning;

    const frameMean = this.frames.reduce((sum, ms) => sum + ms, 0) / this.frames.length;
    const enoughGpu = this.gpu.length >= 3;
    const gpuP80 = percentile80(this.gpu);
    this.measurement = { frameMs: frameMean, gpuMs: enoughGpu ? gpuP80 : null };
    this.gpuWindows = enoughGpu && gpuP80 > 1000 / 60 ? this.gpuWindows + 1 : 0;
    // Frame timing alone cannot attribute the slowdown to the shader/GPU.
    this.slowWindows = frameMean > 40 ? this.slowWindows + 1 : 0;
    this.recoveryWindows = frameMean < 32 && (!enoughGpu || gpuP80 < 12)
      ? this.recoveryWindows + 1 : 0;
    if (this.gpuWindows >= 2) this.warning = 'gpu';
    else if (this.slowWindows >= 2) this.warning = 'frame';
    else if (this.recoveryWindows >= 3) this.warning = null;

    this.windowStart = now;
    this.frames = [];
    this.gpu = [];
    return this.warning;
  }
}
