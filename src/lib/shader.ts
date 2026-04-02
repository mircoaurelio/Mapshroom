import type { ShaderUniformDefinition, ShaderUniformMap, ShaderUniformValue } from '../types';

export const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    v_uv.y = 1.0 - v_uv.y;
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

export const FRAGMENT_SHADER_HEADER = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform float u_time;
uniform vec2 u_resolution;

float node_rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float node_noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u * u * (3.0 - 2.0 * u);
    float res = mix(
        mix(node_rand(ip), node_rand(ip + vec2(1.0, 0.0)), u.x),
        mix(node_rand(ip + vec2(0.0, 1.0)), node_rand(ip + vec2(1.0, 1.0)), u.x),
        u.y
    );
    return res * res;
}
`;

export const FRAGMENT_SHADER_FOOTER = `
void main() {
    gl_FragColor = processColor(u_image, v_uv, u_time, u_resolution);
}`;

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

export function parseUniforms(code: string): ShaderUniformMap {
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

export function validateGeneratedShader(code: string): string {
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

  if (/```|`/.test(trimmed)) {
    problems.push('contains markdown fence characters instead of pure GLSL');
  }

  if (problems.length > 0) {
    throw new Error(`AI shader does not match the required structure: ${problems.join('; ')}.`);
  }

  return trimmed;
}

export function buildFragmentShaderSource(code: string): string {
  return `${FRAGMENT_SHADER_HEADER}\n${code}\n${FRAGMENT_SHADER_FOOTER}`;
}
