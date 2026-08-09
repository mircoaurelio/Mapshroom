import type { ShaderUniformDefinition, ShaderUniformMap, ShaderUniformValue } from '../types';
import {
  buildFragmentShaderFooter,
  buildFragmentShaderHeader,
  buildFragmentShaderSourceForTarget,
  buildVertexShaderSource,
  normalizeOfficialShaderBody,
  OFFICIAL_SHADER_TARGET,
} from './shaderCompiler.ts';

export const VERTEX_SHADER_SOURCE = buildVertexShaderSource(OFFICIAL_SHADER_TARGET);
export const FRAGMENT_SHADER_HEADER = buildFragmentShaderHeader(OFFICIAL_SHADER_TARGET);
export const FRAGMENT_SHADER_FOOTER = buildFragmentShaderFooter(OFFICIAL_SHADER_TARGET);

export function rgbToHex(value: ShaderUniformValue): string {
  if (!Array.isArray(value)) {
    return '#ffffff';
  }

  return `#${value
    .map((channel) => Math.round(Math.max(0, Math.min(1, channel)) * 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16) / 255,
    Number.parseInt(hex.slice(3, 5), 16) / 255,
    Number.parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

export function parseShaderName(code: string): string {
  const match = code.match(/\/\/\s*NAME:\s*(.*)/i);
  return match?.[1]?.trim() || 'Untitled Shader';
}

// Timeline playback parses the same (potentially very large) generated shader
// strings on every animation frame, so results are memoized by source code.
const parseUniformsCache = new Map<string, ShaderUniformMap>();
const PARSE_UNIFORMS_CACHE_LIMIT = 512;

export function parseUniforms(code: string): ShaderUniformMap {
  const cachedUniforms = parseUniformsCache.get(code);
  if (cachedUniforms) {
    parseUniformsCache.delete(code);
    parseUniformsCache.set(code, cachedUniforms);
    return cachedUniforms;
  }

  const uniformRegex =
    /uniform\s+(float|int|vec3|bool)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;\s*(?:\/\/\s*(.*))?/g;
  const uniforms: ShaderUniformMap = {};
  let match: RegExpExecArray | null = null;

  while ((match = uniformRegex.exec(code)) !== null) {
    const [, type, name, meta = ''] = match;

    let min = 0;
    let max = 1;
    let defaultValue: ShaderUniformValue = type === 'bool' ? false : type === 'vec3' ? [1, 1, 1] : 0.5;

    if (type === 'float' || type === 'int') {
      const minMatch = meta.match(/@min\s+([\d.-]+)/);
      const maxMatch = meta.match(/@max\s+([\d.-]+)/);
      if (minMatch) {
        min = Number.parseFloat(minMatch[1]);
      }
      if (maxMatch) {
        max = Number.parseFloat(maxMatch[1]);
      }
    }

    const defaultMatch = meta.match(/@default\s+([\w.,-]+)/);
    if (defaultMatch) {
      if (type === 'bool') {
        defaultValue = defaultMatch[1] === 'true';
      } else if (type === 'vec3') {
        const channels = defaultMatch[1].split(',').map((item) => Number.parseFloat(item));
        defaultValue = [
          channels[0] ?? 1,
          channels[1] ?? 1,
          channels[2] ?? 1,
        ];
      } else {
        defaultValue = Number.parseFloat(defaultMatch[1]);
      }
    }

    uniforms[name] = {
      type: type as ShaderUniformDefinition['type'],
      min,
      max,
      default: defaultValue,
    };
  }

  if (parseUniformsCache.size >= PARSE_UNIFORMS_CACHE_LIMIT) {
    const oldestKey = parseUniformsCache.keys().next().value;
    if (oldestKey !== undefined) {
      parseUniformsCache.delete(oldestKey);
    }
  }
  parseUniformsCache.set(code, uniforms);

  return uniforms;
}

export function syncUniformValues(
  currentValues: Record<string, ShaderUniformValue>,
  definitions: ShaderUniformMap,
): Record<string, ShaderUniformValue> {
  let changed = false;
  const nextValues: Record<string, ShaderUniformValue> = {};

  for (const [name, definition] of Object.entries(definitions)) {
    if (currentValues[name] === undefined) {
      nextValues[name] = definition.default;
      changed = true;
      continue;
    }
    nextValues[name] = currentValues[name];
  }

  const currentKeys = Object.keys(currentValues);
  if (currentKeys.length !== Object.keys(nextValues).length) {
    changed = true;
  }

  return changed ? nextValues : currentValues;
}

function scoreShaderCandidate(candidate: string): number {
  let score = candidate.length;

  if (/\/\/\s*NAME:/i.test(candidate)) {
    score += 500;
  }
  if (/vec4\s+processColor\s*\(/.test(candidate)) {
    score += 500;
  }
  if (/uniform\s+(float|int|vec3|bool)\s+/.test(candidate)) {
    score += 250;
  }

  return score;
}

function trimToShaderStart(text: string): string {
  const patterns = [
    /\/\/\s*NAME:/i,
    /uniform\s+(float|int|vec3|bool)\s+/,
    /vec4\s+processColor\s*\(/,
  ];

  const startIndexes = patterns
    .map((pattern) => text.search(pattern))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right);

  if (!startIndexes.length) {
    return text;
  }

  return text.slice(startIndexes[0]).trim();
}

function sanitizeExtractedShader(text: string): string {
  let normalized = text.replace(/\r\n/g, '\n').trim();

  normalized = normalized
    .replace(/^\s*```[^\n]*$/gm, '')
    .replace(/^\s*glsl\s*$/gim, '')
    .replace(/```/g, '')
    .trim();

  normalized = trimToShaderStart(normalized);

  const trailingFenceIndex = normalized.indexOf('```');
  if (trailingFenceIndex >= 0) {
    normalized = normalized.slice(0, trailingFenceIndex).trim();
  }

  return normalized.trim();
}

export function extractGlslCode(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  const fencedMatches = Array.from(
    normalized.matchAll(/```(?:\s*([A-Za-z0-9_+-]+))?\s*\n?([\s\S]*?)```/g),
  );

  if (fencedMatches.length) {
    const bestMatch = fencedMatches
      .map((match) => {
        const language = match[1]?.trim().toLowerCase() ?? '';
        const candidate = sanitizeExtractedShader(match[2] ?? '');
        const languageBoost = language === 'glsl' ? 1000 : 0;

        return {
          candidate,
          score: scoreShaderCandidate(candidate) + languageBoost,
        };
      })
      .filter((item) => Boolean(item.candidate))
      .sort((left, right) => right.score - left.score)[0];

    if (bestMatch?.candidate) {
      return bestMatch.candidate;
    }
  }

  return sanitizeExtractedShader(normalized);
}

export const AI_MINIMUM_UI_UNIFORM_COUNT = 3;

export function validateGeneratedShader(
  code: string,
  options: { minimumUiUniformCount?: number } = {},
): string {
  const trimmed = code.trim();
  const firstNonEmptyLine = trimmed
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);
  const problems: string[] = [];

  if (!firstNonEmptyLine || !/^\/\/\s*NAME:\s*\S+/i.test(firstNonEmptyLine)) {
    problems.push('missing a valid // NAME header');
  }

  if (
    !/vec4\s+processColor\s*\(\s*sampler2D\s+\w+\s*,\s*vec2\s+\w+\s*,\s*float\s+\w+\s*,\s*vec2\s+\w+\s*\)/.test(
      trimmed,
    )
  ) {
    problems.push('missing the required processColor(tex, uv, time, resolution) function');
  }

  if (/void\s+main\s*\(/.test(trimmed)) {
    problems.push('must not declare void main() because the app injects it');
  }

  if (/gl_FragColor\s*=/.test(trimmed)) {
    problems.push('must not write directly to gl_FragColor inside the generated shader body');
  }

  if (/^\s*#version\b/m.test(trimmed)) {
    problems.push('must not declare #version because the app injects the GLSL ES version');
  }

  if (/```|`/.test(trimmed)) {
    problems.push('contains markdown fence characters instead of pure GLSL');
  }

  const uniformDeclarations = Array.from(
    trimmed.matchAll(
      /^\s*uniform\s+(float|int|vec3|bool)\s+([A-Za-z_][A-Za-z0-9_]*)\s*;\s*(?:\/\/\s*(.*))?$/gm,
    ),
  );
  const minimumUiUniformCount = Math.max(1, options.minimumUiUniformCount ?? 1);
  if (uniformDeclarations.length < minimumUiUniformCount) {
    problems.push(
      `must expose at least ${minimumUiUniformCount} annotated UI uniform${
        minimumUiUniformCount === 1 ? '' : 's'
      } so Mapshroom can create automatic controls`,
    );
  }
  for (const declaration of uniformDeclarations) {
    const type = declaration[1];
    const name = declaration[2];
    const metadata = declaration[3] ?? '';
    const hasDefault = /@default\s+[\w.,-]+/.test(metadata);
    const hasNumericRange = /@min\s+[\d.-]+/.test(metadata) && /@max\s+[\d.-]+/.test(metadata);
    if (!hasDefault || ((type === 'float' || type === 'int') && !hasNumericRange)) {
      problems.push(
        `uniform ${name} is missing the same-line ${
          type === 'float' || type === 'int'
            ? '@min, @max or @default slider metadata'
            : '@default control metadata'
        }`,
      );
    }
  }

  if (problems.length > 0) {
    throw new Error(`AI shader does not match the required structure: ${problems.join('; ')}.`);
  }

  return normalizeOfficialShaderBody(trimmed);
}

export function buildFragmentShaderSource(code: string): string {
  return buildFragmentShaderSourceForTarget(code, OFFICIAL_SHADER_TARGET);
}
