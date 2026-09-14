// Rules describe image statistics, not a semantic understanding of its subject.
export function normalizeGradientSettings(value) {
  return {
    zones: Number.isFinite(value?.zones) ? Math.max(2, Math.min(48, Math.round(value.zones))) : 2,
    smoothing: Number.isFinite(value?.smoothing) ? Math.max(0, Math.min(100, Math.round(value.smoothing))) : 0,
  };
}

export function surfaceSettingsForVariant(suggested, kind, gradientSettings) {
  return kind === 'gradient' ? { ...suggested, ...normalizeGradientSettings(gradientSettings) } : suggested;
}

export function suggestSurfaceSettings(rgba, width, height, mobile = false) {
  let opaque = 0, green = 0, colorful = 0, border = 0, darkBorder = 0, transparent = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4, r = rgba[i], g = rgba[i + 1], b = rgba[i + 2], a = rgba[i + 3];
    const bright = Math.max(r, g, b);
    if (a < 240) transparent++;
    if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
      border++; if (a < 32 || bright < 34) darkBorder++;
    }
    if (a > 32 && bright > 34) {
      opaque++;
      if (g > r * 1.05 && g > b * 1.18) green++;
      if (bright - Math.min(r, g, b) > 65) colorful++;
    }
  }
  const darkBackground = border > 0 && darkBorder / border > .85;
  const shape = darkBackground && green / Math.max(1, opaque) > .45;
  return {
    method: shape ? 'shape' : 'graph', zones: shape ? 12 : colorful / Math.max(1, opaque) > .5 ? 24 : 16,
    smoothing: shape ? 70 : 80, black: darkBackground ? 8 : 0, resolution: mobile ? 640 : 960,
    darkBackground, hasAlpha: transparent / (width * height) > .005,
  };
}

export function processingProfile({ mobile = false, memory, supported = true } = {}) {
  const limited = !supported || (typeof memory === 'number' && memory <= 2);
  return { id: limited ? 'limited' : mobile ? 'mobile' : 'desktop', mobile: mobile || limited,
    ai: supported && !mobile && !limited, canEnableAI: supported && !limited,
    maxPixels: limited ? 1e6 : mobile ? 3e6 : 24e6, maxEdge: limited ? 1280 : mobile ? 2048 : 8192,
    label: limited ? 'Lightweight' : mobile ? 'Mobile balanced' : 'Original quality' };
}

export function fitProcessingSize(width, height, profile) {
  const scale = Math.min(1, profile.maxEdge / Math.max(width, height), Math.sqrt(profile.maxPixels / (width * height)));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

// Only background connected to the image boundary is removed. Dark details
// inside the subject remain intact; general scenes need a real matte model.
export function connectedDarkAlpha(rgba, width, height, threshold = 34) {
  const n = width * height, alpha = new Uint8ClampedArray(n), seen = new Uint8Array(n), queue = new Uint32Array(n);
  let head = 0, tail = 0;
  for (let i = 0; i < n; i++) alpha[i] = rgba[i * 4 + 3];
  const add = i => {
    if (seen[i]) return;
    seen[i] = 1;
    const k = i * 4;
    if (rgba[k + 3] < 32 || Math.max(rgba[k], rgba[k + 1], rgba[k + 2]) < threshold) queue[tail++] = i;
  };
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
  while (head < tail) {
    const i = queue[head++], x = i % width;
    alpha[i] = 0;
    if (x > 0) add(i - 1); if (x < width - 1) add(i + 1);
    if (i >= width) add(i - width); if (i + width < n) add(i + width);
  }
  return alpha;
}
