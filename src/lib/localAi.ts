import { buildShaderMutationPrompt } from '../shaders/requestContract';
import { SHADER_SYSTEM_PROMPT } from '../shaders/systemPrompt';
import { extractGlslCode, validateGeneratedShader } from './shader';

export const LOCAL_VISION_MODEL = { id: 'onnx-community/Florence-2-base-ft', label: 'Florence-2 Vision', size: '~0.8 GB quantized' } as const;
export const LOCAL_SHADER_MODELS = [
  { id: 'onnx-community/Qwen2.5-Coder-0.5B-Instruct', tier: 'Small', label: 'Qwen 2.5 Coder 0.5B', size: '~0.4 GB', memory: '2 GB+ free RAM', note: 'Fastest; simple shader edits.' },
  { id: 'onnx-community/Qwen2.5-Coder-1.5B-Instruct', tier: 'Medium', label: 'Qwen 2.5 Coder 1.5B', size: '~1.1 GB', memory: '4 GB+ free RAM', note: 'Recommended balance.' },
  { id: 'onnx-community/Qwen2.5-Coder-3B-Instruct', tier: 'Big', label: 'Qwen 2.5 Coder 3B', size: '~2.4 GB', memory: '8 GB+ free RAM', note: 'Better multi-pass GLSL reasoning.' },
  { id: 'onnx-community/Qwen3-4B-ONNX', tier: 'Ultra', label: 'Qwen 3 4B', size: '~2.9 GB', memory: '12 GB+ free RAM', note: 'Highest local quality; desktop WebGPU only.' },
] as const;

export type LocalModelProgress = { phase: 'vision' | 'shader' | 'ready'; percent: number; file?: string };
type CallablePipeline = (input: unknown, options?: Record<string, unknown>) => Promise<unknown>;
let visionPipeline: CallablePipeline | null = null;
const shaderPipelines = new Map<string, CallablePipeline>();

function options() {
  const webgpu = 'gpu' in navigator;
  return { device: webgpu ? 'webgpu' as const : 'wasm' as const, dtype: webgpu ? 'q4f16' as const : 'q4' as const };
}
function progress(phase: LocalModelProgress['phase'], callback?: (value: LocalModelProgress) => void) {
  return (event: { status?: string; progress?: number; file?: string }) => callback?.({ phase, percent: event.status === 'ready' ? 100 : Math.round(event.progress ?? 0), file: event.file });
}
export function isLocalModelReady(modelId: string, includeVision: boolean): boolean {
  return shaderPipelines.has(modelId) && (!includeVision || Boolean(visionPipeline));
}
export async function prepareLocalModel(modelId: string, includeVision: boolean, onProgress?: (value: LocalModelProgress) => void) {
  const { pipeline } = await import('@huggingface/transformers');
  if (includeVision && !visionPipeline) {
    visionPipeline = await pipeline('image-to-text', LOCAL_VISION_MODEL.id, { ...options(), progress_callback: progress('vision', onProgress) }) as unknown as CallablePipeline;
  }
  if (!shaderPipelines.has(modelId)) {
    shaderPipelines.set(modelId, await pipeline('text-generation', modelId, { ...options(), progress_callback: progress('shader', onProgress) }) as unknown as CallablePipeline);
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
  if (!stageImage || !visionPipeline) return '';
  return generatedText(await visionPipeline(stageImage, { prompt: '<MORE_DETAILED_CAPTION>', max_new_tokens: 160 }));
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
