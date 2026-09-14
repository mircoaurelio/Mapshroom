import { shaderPresetList } from '../src/shaders/presets';
import { parseUniforms, syncUniformValues } from '../src/lib/shader';
import { shaderThumbnailKey, THUMBNAIL_TIME, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT } from '../src/lib/shaderThumbnailKey';
import { createShaderThumbnailSource } from '../src/lib/shaderThumbnailSource';
import { destroyShaderPreviewRenderer, renderShaderPreviewToDataUrl, type ShaderPreviewRenderer } from '../src/lib/shaderPreview';

const send = async (path: string, value: unknown) => {
  const response = await fetch(path, { method: 'POST', body: JSON.stringify(value) });
  if (!response.ok) throw new Error(`Thumbnail writer: ${response.status}`);
};
async function main() {
  const renderer = { current: null as ShaderPreviewRenderer | null };
  const source = createShaderThumbnailSource();
  const seen = new Set<string>();
  const results: { id: string; name: string; key: string; time?: number; error?: string }[] = [];
  await send('/progress', { count: shaderPresetList.length });
  try {
    for (const preset of shaderPresetList) {
      const values = syncUniformValues(preset.uniformValues ?? {}, parseUniforms(preset.code));
      const key = shaderThumbnailKey(preset.code, values);
      if (seen.has(key)) { results.push({ id: preset.id, name: preset.name, key }); continue; }
      seen.add(key);
      try {
        let time = THUMBNAIL_TIME;
        let url = await renderShaderPreviewToDataUrl(preset.code, values, source, null, renderer, { strict: true, timeSeconds: time });
        // Retry later only when the real shader starts with an almost black frame.
        const measure = document.createElement('canvas'); measure.width = THUMBNAIL_WIDTH; measure.height = THUMBNAIL_HEIGHT;
        const context = measure.getContext('2d')!;
        for (const candidate of [3.2, 5.6]) {
          const bitmap = await createImageBitmap(await (await fetch(url!)).blob());
          context.drawImage(bitmap, 0, 0); bitmap.close();
          const pixels = context.getImageData(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT).data;
          let visible = 0;
          for (let i = 0; i < pixels.length; i += 4) if (Math.max(pixels[i], pixels[i+1], pixels[i+2]) > 25) visible++;
          if (visible > THUMBNAIL_WIDTH * THUMBNAIL_HEIGHT * .025) break;
          time = candidate;
          url = await renderShaderPreviewToDataUrl(preset.code, values, source, null, renderer, { strict: true, timeSeconds: time });
        }
        await send('/thumbnail', { key, dataUrl: url, time });
        results.push({ id: preset.id, name: preset.name, key, time });
      } catch (error) {
        results.push({ id: preset.id, name: preset.name, key, error: String(error) });
      }
      if (results.length % 25 === 0) await send('/progress', { completed: results.length });
    }
  } finally { destroyShaderPreviewRenderer(renderer.current); }
  await send('/complete', { results });
  document.body.textContent = 'Thumbnails complete';
}
void main().catch(error => void send('/error', { error: String(error) }));
