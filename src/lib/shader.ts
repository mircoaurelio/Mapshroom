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

export function extractGlslCode(text: string): string {
  const fencedMatch = text.match(/```glsl([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }
  return text.trim();
}

export function buildFragmentShaderSource(code: string): string {
  return `${FRAGMENT_SHADER_HEADER}\n${code}\n${FRAGMENT_SHADER_FOOTER}`;
}
