import { buildShaderMutationPrompt } from '../shaders/requestContract';
import { SHADER_SYSTEM_PROMPT } from '../shaders/systemPrompt';
import { extractGlslCode, validateGeneratedShader } from './shader';

export const LOCAL_VISION_MODEL = { id: 'onnx-community/Florence-2-base-ft', label: 'Florence-2 Vision', size: '~0.8 GB quantized' } as const;
export const LOCAL_SHADER_MODELS = [
  { id: 'onnx-community/SmolLM2-360M-Instruct-ONNX', tier: 'Small', label: 'SmolLM2 360M', size: '~0.3 GB', memory: '2 GB+ free RAM', note: 'Fastest; simple shader edits.' },
  { id: 'onnx-community/Qwen2.5-Coder-0.5B-Instruct', tier: 'Medium', label: 'Qwen 2.5 Coder 0.5B', size: '~0.4 GB', memory: '2 GB+ free RAM', note: 'Compact code-specialized model.' },
  { id: 'onnx-community/Qwen2.5-Coder-1.5B-Instruct', tier: 'Big', label: 'Qwen 2.5 Coder 1.5B', size: '~1.1 GB', memory: '4 GB+ free RAM', note: 'Recommended balance.' },
  { id: 'onnx-community/Qwen2.5-Coder-3B-Instruct', tier: 'Ultra', label: 'Qwen 2.5 Coder 3B', size: '~2.4 GB', memory: '8 GB+ free RAM', note: 'Highest local quality; desktop WebGPU only.' },
] as const;
export const LEGACY_ULTRA_MODEL_ID = 'onnx-community/Qwen3-4B-ONNX';
export const ULTRA_MODEL_ID = 'onnx-community/Qwen2.5-Coder-3B-Instruct';

export type LocalModelProgress = { phase: 'vision' | 'shader' | 'ready'; percent: number; file?: string };
type CallablePipeline = (input: unknown, options?: Record<string, unknown>) => Promise<unknown>;
type FlorenceModel = {
  generate: (inputs: Record<string, unknown>) => Promise<unknown>;
};
type FlorenceProcessor = {
  (image: unknown, prompts: string[]): Promise<Record<string, unknown>>;
  construct_prompts: (task: string) => string[];
  batch_decode: (tokens: unknown, options: { skip_special_tokens: boolean }) => string[];
  post_process_generation: (
    text: string,
    task: string,
    imageSize: [number, number],
  ) => Record<string, unknown>;
};
type VisionImage = { size: [number, number] };

let visionModel: FlorenceModel | null = null;
let visionProcessor: FlorenceProcessor | null = null;
let loadVisionImage: ((input: string) => Promise<VisionImage>) | null = null;
const shaderPipelines = new Map<string, CallablePipeline>();

function options() {
  const webgpu = 'gpu' in navigator;
  return { device: webgpu ? 'webgpu' as const : 'wasm' as const, dtype: webgpu ? 'q4f16' as const : 'q4' as const };
}
async function ensureUltraCompatibility(modelId: string): Promise<void> {
  if (modelId !== ULTRA_MODEL_ID) return;
  const gpu = (navigator as Navigator & {
    gpu?: { requestAdapter: () => Promise<unknown | null> };
  }).gpu;
  if (!gpu || !await gpu.requestAdapter()) {
    throw new Error('Ultra needs WebGPU. Try Big on this browser, or enable hardware acceleration and reload.');
  }
}

function localModelError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/aborted|memory|allocation|out of bounds/i.test(message)) {
    return new Error('This model exceeded the browser\'s available memory. Close other tabs or try a smaller model.');
  }
  return error instanceof Error ? error : new Error('The local model could not be loaded.');
}
function progress(phase: LocalModelProgress['phase'], callback?: (value: LocalModelProgress) => void) {
  return (event: { status?: string; progress?: number; file?: string }) => callback?.({ phase, percent: event.status === 'ready' ? 100 : Math.round(event.progress ?? 0), file: event.file });
}
export function isLocalModelReady(modelId: string, includeVision: boolean): boolean {
  return shaderPipelines.has(modelId) && (
    !includeVision || Boolean(visionModel && visionProcessor && loadVisionImage)
  );
}
export async function prepareLocalModel(modelId: string, includeVision: boolean, onProgress?: (value: LocalModelProgress) => void) {
  await ensureUltraCompatibility(modelId);
  const transformers = await import('@huggingface/transformers');
  if (includeVision && (!visionModel || !visionProcessor || !loadVisionImage)) {
    const visionProgress = progress('vision', onProgress);
    visionModel = await transformers.Florence2ForConditionalGeneration.from_pretrained(
      LOCAL_VISION_MODEL.id,
      { ...options(), progress_callback: visionProgress },
    ) as unknown as FlorenceModel;
    visionProcessor = await transformers.AutoProcessor.from_pretrained(
      LOCAL_VISION_MODEL.id,
      { progress_callback: visionProgress },
    ) as unknown as FlorenceProcessor;
    loadVisionImage = transformers.load_image as (input: string) => Promise<VisionImage>;
  }
  if (!shaderPipelines.has(modelId)) {
    try {
      shaderPipelines.set(modelId, await transformers.pipeline('text-generation', modelId, { ...options(), progress_callback: progress('shader', onProgress) }) as unknown as CallablePipeline);
    } catch (error) {
      throw localModelError(error);
    }
  }
  onProgress?.({ phase: 'ready', percent: 100 });
}
function generatedText(output: unknown): string {
  const first = Array.isArray(output) ? output[0] : output;
  const value = first && typeof first === 'object' ? (first as { generated_text?: unknown }).generated_text : '';
  if (typeof value === 'string') return value;
  const last = Array.isArray(value) ? value.at(-1) : null;
  return last && typeof last === 'object' && 'content' in last ? String((last as { content: unknown }).content ?? '') : '';
}
async function describe(stageImage?: string) {
  if (!stageImage || !visionModel || !visionProcessor || !loadVisionImage) return '';
  const task = '<MORE_DETAILED_CAPTION>';
  const image = await loadVisionImage(stageImage);
  const inputs = await visionProcessor(image, visionProcessor.construct_prompts(task));
  const generatedIds = await visionModel.generate({ ...inputs, max_new_tokens: 160 });
  const generated = visionProcessor.batch_decode(generatedIds, {
    skip_special_tokens: false,
  })[0] ?? '';
  const result = visionProcessor.post_process_generation(generated, task, image.size);
  const caption = result[task];
  return typeof caption === 'string' ? caption : '';
}
export async function requestLocalShaderMutation({ modelId, prompt, currentCode, stageImage, visionEnabled }: { modelId: string; prompt: string; currentCode: string; stageImage?: string; visionEnabled: boolean }) {
  await prepareLocalModel(modelId, visionEnabled);
  const generator = shaderPipelines.get(modelId);
  if (!generator) throw new Error('The selected local shader model is not ready.');
  const caption = visionEnabled ? await describe(stageImage) : '';
  const request = `${buildShaderMutationPrompt(prompt, currentCode)}${caption ? `\n\nVISION ANALYSIS OF CURRENT STAGE:\n${caption}` : ''}`;
  const output = await generator([{ role: 'system', content: SHADER_SYSTEM_PROMPT }, { role: 'user', content: request }], { max_new_tokens: 4096, do_sample: false, repetition_penalty: 1.05 });
  const text = generatedText(output).trim();
  if (!text) throw new Error('The local model returned no shader content.');
  return validateGeneratedShader(extractGlslCode(text));
}
