export const PREVIEW_PIXEL_LIMIT = 1920 * 1080;
export const OUTPUT_PIXEL_LIMIT = 3840 * 2160;
export const MIN_RENDER_PIXELS = 960 * 540;

function percentile(values: number[], fraction: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] ?? 0;
}

/** One controller per stage. GPU cost and sustained frame misses are separate signals. */
export class AdaptiveRenderQuality {
  pixels = PREVIEW_PIXEL_LIMIT;
  private key = '';
  private remembered = new Map<string, number>();
  private frames: number[] = [];
  private gpu: number[] = [];
  private windowStart = 0;
  private headroomSince = 0;
  private settleUntil = 0;
  private slowWindows = 0;

  resetSamples(now: number) {
    this.frames = [];
    this.gpu = [];
    this.windowStart = now;
    this.headroomSince = 0;
    this.settleUntil = now + 500;
    this.slowWindows = 0;
  }

  select(key: string, now: number, maxPixels: number) {
    if (key !== this.key) {
      if (this.key) {
        this.remembered.delete(this.key);
        this.remembered.set(this.key, this.pixels);
        if (this.remembered.size > 32) this.remembered.delete(this.remembered.keys().next().value!);
      }
      // A new mix inherits a conservative budget; a previously seen program
      // resumes its learned quality instead of jumping back to full HD.
      this.pixels = Math.min(this.pixels, this.remembered.get(key) ?? PREVIEW_PIXEL_LIMIT);
      this.key = key;
      this.resetSamples(now);
    }
    this.pixels = Math.min(this.pixels, maxPixels);
  }

  sample(input: {
    now: number; frameMs: number; gpuMs: number | null;
    gpuAvailable: boolean; actualPixels: number; maxPixels: number;
  }) {
    const { now, frameMs, gpuMs, gpuAvailable, actualPixels, maxPixels } = input;
    if (!Number.isFinite(frameMs) || frameMs <= 0 || frameMs > 250) {
      this.resetSamples(now);
      return this.pixels;
    }
    if (now < this.settleUntil) return this.pixels;
    this.frames.push(frameMs);
    if (gpuMs !== null && Number.isFinite(gpuMs) && gpuMs > 0) this.gpu.push(gpuMs);
    if (now - this.windowStart < 750 || this.frames.length < 12) return this.pixels;
    const frameP80 = percentile(this.frames, .8);
    const frameMean = this.frames.reduce((sum, value) => sum + value, 0) / this.frames.length;
    const gpuP80 = percentile(this.gpu, .8);
    const enoughGpuSamples = this.gpu.length >= 3;
    this.slowWindows = frameMean > 20 ? this.slowWindows + 1 : 0;
    // GPU timers exclude browser compositing, presentation and some driver
    // work. Sustained frame misses must also lower the budget even when the
    // shader draw alone is cheap; one bad window is insufficient.
    const overloaded = (gpuAvailable && enoughGpuSamples && gpuP80 > 14) || this.slowWindows >= 2;
    // Without GPU timing we can safely downscale, but cannot establish spare
    // GPU capacity at VSync. Do not repeatedly probe higher resolutions.
    const headroom = gpuAvailable && enoughGpuSamples && gpuP80 < 9 && frameP80 < 19 && frameMean < 17.5;
    this.frames = [];
    this.gpu = [];
    this.windowStart = now;
    if (overloaded) {
      this.pixels = Math.max(MIN_RENDER_PIXELS, Math.round(Math.min(this.pixels, actualPixels) * .75));
      this.headroomSince = 0;
      this.slowWindows = 0;
      this.settleUntil = now + 500;
    } else if (headroom) {
      this.headroomSince ||= now;
      if (now - this.headroomSince >= 3000 && actualPixels >= this.pixels * .95) {
        this.pixels = Math.min(maxPixels, Math.round(this.pixels * 1.15));
        this.headroomSince = 0;
        this.settleUntil = now + 500;
      }
    } else {
      this.headroomSince = 0;
    }
    return this.pixels;
  }
}

export function stagePixelRatio(width: number, height: number, deviceRatio: number, budget: number, output: boolean) {
  return Math.min(deviceRatio || 1, output ? Infinity : 2, Math.sqrt(budget / Math.max(1, width * height)));
}
