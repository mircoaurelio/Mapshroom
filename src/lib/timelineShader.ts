import { parseUniforms } from './shader';
import type { TimelineTransitionEffect } from '../types';

function stripShaderNameHeader(code: string): string {
  return code.replace(/^\s*\/\/\s*NAME:.*$/im, '').trim();
}

function collectFunctionNames(code: string): string[] {
  const names = new Set<string>();
  const functionRegex =
    /\b(?:float|int|bool|vec2|vec3|vec4|mat2|mat3|mat4|void)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  let match: RegExpExecArray | null = null;

  while ((match = functionRegex.exec(code)) !== null) {
    if (match[1] !== 'main') {
      names.add(match[1]);
    }
  }

  return [...names];
}

function replaceIdentifier(source: string, name: string, replacement: string): string {
  return source.replace(new RegExp(`\\b${name}\\b`, 'g'), replacement);
}

function namespaceShaderCode(code: string, namespace: string): string {
  let nextCode = stripShaderNameHeader(code);
  const uniformNames = Object.keys(parseUniforms(nextCode));
  const functionNames = collectFunctionNames(nextCode);
  const replacements = [...uniformNames, ...functionNames]
    .map((name) => ({
      name,
      replacement: `${namespace}_${name}`,
    }))
    .sort((left, right) => right.name.length - left.name.length);

  for (const replacement of replacements) {
    nextCode = replaceIdentifier(nextCode, replacement.name, replacement.replacement);
  }

  return nextCode;
}

function buildTransitionMixer(effect: TimelineTransitionEffect): string {
  switch (effect) {
    case 'cut':
      return `
vec4 mixTimelineTransition(vec4 fromColor, vec4 toColor, vec2 uv, float progress) {
    return progress < 0.999 ? fromColor : toColor;
}`;
    case 'wipe':
      return `
vec4 mixTimelineTransition(vec4 fromColor, vec4 toColor, vec2 uv, float progress) {
    float edge = smoothstep(progress - 0.08, progress + 0.08, uv.x);
    return mix(fromColor, toColor, edge);
}`;
    case 'radial':
      return `
vec4 mixTimelineTransition(vec4 fromColor, vec4 toColor, vec2 uv, float progress) {
    float distanceToCenter = distance(uv, vec2(0.5));
    float radius = mix(0.9, 0.0, progress);
    float edge = 1.0 - smoothstep(radius - 0.08, radius + 0.08, distanceToCenter);
    return mix(fromColor, toColor, edge);
}`;
    case 'glitch':
      return `
vec4 mixTimelineTransition(vec4 fromColor, vec4 toColor, vec2 uv, float progress) {
    float stripe = step(0.45, fract(uv.y * 18.0 + u_time * 4.0));
    float jitter = (node_noise(vec2(uv.y * 24.0, u_time * 3.0)) - 0.5) * 0.22 * (1.0 - progress);
    float mask = smoothstep(progress - 0.14, progress + 0.14, uv.x + (stripe - 0.5) * 0.2 + jitter);
    vec4 shiftedTo = vec4(
        mix(fromColor.r, toColor.r, mask),
        mix(fromColor.g, toColor.g, clamp(mask + 0.1 * (1.0 - progress), 0.0, 1.0)),
        mix(fromColor.b, toColor.b, clamp(mask - 0.08 * (1.0 - progress), 0.0, 1.0)),
        mix(fromColor.a, toColor.a, mask)
    );
    return mix(fromColor, shiftedTo, clamp(progress * 1.2, 0.0, 1.0));
}`;
    case 'mix':
    default:
      return `
vec4 mixTimelineTransition(vec4 fromColor, vec4 toColor, vec2 uv, float progress) {
    return mix(fromColor, toColor, progress);
}`;
  }
}

export function buildTimelineTransitionShaderCode({
  fromCode,
  toCode,
  effect,
}: {
  fromCode: string;
  toCode: string;
  effect: TimelineTransitionEffect;
}): string {
  const leftCode = namespaceShaderCode(fromCode, 'timeline_from');
  const rightCode = namespaceShaderCode(toCode, 'timeline_to');
  const transitionMixer = buildTransitionMixer(effect);

  return `// NAME: Timeline Transition
uniform float u_transition_progress; // @min 0.0 @max 1.0 @default 0.0

${leftCode}

${rightCode}

${transitionMixer}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 fromColor = timeline_from_processColor(tex, uv, time, resolution);
    vec4 toColor = timeline_to_processColor(tex, uv, time, resolution);
    float progress = clamp(u_transition_progress, 0.0, 1.0);
    return mixTimelineTransition(fromColor, toColor, uv, progress);
}`;
}
