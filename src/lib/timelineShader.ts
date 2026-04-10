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

function buildTimelineOverlayComposer(): string {
  return `
vec2 getTimelineOverlayUv(
    vec2 uv,
    vec2 resolution,
    float aspectRatio,
    float scaleX,
    float scaleY,
    float offsetX,
    float offsetY,
    float fitMode
) {
    float baseAspect = resolution.x / max(resolution.y, 1.0);
    float safeAspect = max(aspectRatio, 0.0001);
    vec2 fitScale = vec2(1.0);
    if (fitMode < 0.5) {
        if (safeAspect > baseAspect) {
            fitScale.x = baseAspect / safeAspect;
        } else {
            fitScale.y = safeAspect / baseAspect;
        }
    } else if (fitMode < 1.5) {
        if (safeAspect > baseAspect) {
            fitScale.y = safeAspect / baseAspect;
        } else {
            fitScale.x = baseAspect / safeAspect;
        }
    }

    vec2 centered = uv - 0.5;
    vec2 transformed = centered / (fitScale * vec2(max(scaleX, 0.05), max(scaleY, 0.05)));
    transformed -= vec2(offsetX, offsetY);
    return transformed + 0.5;
}

float getTimelineOverlayMask(vec2 uv) {
    return step(0.0, uv.x) * step(0.0, uv.y) * step(uv.x, 1.0) * step(uv.y, 1.0);
}

vec4 sampleTimelineOverlayColor(
    sampler2D overlayImage,
    vec2 uv,
    vec2 resolution,
    float quality
) {
    vec4 center = texture2D(overlayImage, uv);
    if (quality < 0.5) {
        return center;
    }

    vec2 pixel = 1.0 / max(resolution, vec2(1.0));
    vec4 north = texture2D(overlayImage, uv + vec2(0.0, -pixel.y));
    vec4 south = texture2D(overlayImage, uv + vec2(0.0, pixel.y));
    vec4 east = texture2D(overlayImage, uv + vec2(pixel.x, 0.0));
    vec4 west = texture2D(overlayImage, uv + vec2(-pixel.x, 0.0));
    vec4 smoothColor = (center * 4.0 + north + south + east + west) / 8.0;

    if (quality < 1.5) {
        return smoothColor;
    }

    vec4 northEast = texture2D(overlayImage, uv + vec2(pixel.x, -pixel.y));
    vec4 northWest = texture2D(overlayImage, uv + vec2(-pixel.x, -pixel.y));
    vec4 southEast = texture2D(overlayImage, uv + vec2(pixel.x, pixel.y));
    vec4 southWest = texture2D(overlayImage, uv + vec2(-pixel.x, pixel.y));
    vec4 wideBlur = (smoothColor * 4.0 + northEast + northWest + southEast + southWest) / 8.0;
    vec3 sharpened = clamp(center.rgb * 1.35 - wideBlur.rgb * 0.35, 0.0, 1.0);
    return vec4(sharpened, max(center.a, smoothColor.a));
}

vec3 blendTimelineOverlay(
    vec3 baseColor,
    vec3 overlayColor,
    float blendMode,
    float amount
) {
    if (blendMode < 0.5) {
        return mix(baseColor, overlayColor, amount);
    }
    if (blendMode < 1.5) {
        vec3 screenColor = 1.0 - (1.0 - baseColor) * (1.0 - overlayColor);
        return mix(baseColor, screenColor, amount);
    }
    if (blendMode < 2.5) {
        vec3 addedColor = min(baseColor + overlayColor, vec3(1.0));
        return mix(baseColor, addedColor, amount);
    }

    vec3 multipliedColor = baseColor * overlayColor;
    return mix(baseColor, multipliedColor, amount);
}

vec4 applyTimelineOverlay(
    vec4 baseColor,
    sampler2D overlayImage,
    vec2 uv,
    vec2 resolution,
    float aspectRatio,
    float scaleX,
    float scaleY,
    float offsetX,
    float offsetY,
    float opacity,
    float blendMode,
    float fitMode,
    float quality
) {
    if (opacity <= 0.001) {
        return baseColor;
    }

    vec2 overlayUv = getTimelineOverlayUv(
        uv,
        resolution,
        aspectRatio,
        scaleX,
        scaleY,
        offsetX,
        offsetY,
        fitMode
    );
    float overlayMask = getTimelineOverlayMask(overlayUv);
    if (overlayMask <= 0.001) {
        return baseColor;
    }

    vec4 overlayColor = sampleTimelineOverlayColor(overlayImage, overlayUv, resolution, quality);
    float overlayMix = clamp(overlayColor.a * opacity * overlayMask, 0.0, 1.0);
    vec3 compositedColor = blendTimelineOverlay(
        baseColor.rgb,
        overlayColor.rgb,
        blendMode,
        overlayMix
    );
    return vec4(clamp(compositedColor, 0.0, 1.0), max(baseColor.a, overlayMix));
}`;
}

export function buildTimelineOverlayShaderCode({
  shaderCode,
}: {
  shaderCode: string;
}): string {
  const baseCode = namespaceShaderCode(shaderCode, 'timeline_base');
  const overlayComposer = buildTimelineOverlayComposer();

  return `// NAME: Timeline Overlay
uniform bool u_timeline_has_overlay; // @default false
uniform sampler2D u_timeline_overlay_image;
uniform float u_timeline_overlay_opacity; // @min 0.0 @max 1.0 @default 0.85
uniform float u_timeline_overlay_scale_x; // @min 0.1 @max 4.0 @default 1.0
uniform float u_timeline_overlay_scale_y; // @min 0.1 @max 4.0 @default 1.0
uniform float u_timeline_overlay_offset_x; // @min -1.5 @max 1.5 @default 0.0
uniform float u_timeline_overlay_offset_y; // @min -1.5 @max 1.5 @default 0.0
uniform float u_timeline_overlay_blend_mode; // @min 0.0 @max 3.0 @default 0.0
uniform float u_timeline_overlay_fit_mode; // @min 0.0 @max 2.0 @default 0.0
uniform float u_timeline_overlay_quality; // @min 0.0 @max 2.0 @default 1.0
uniform float u_timeline_overlay_aspect_ratio; // @min 0.1 @max 8.0 @default 1.0

${baseCode}

${overlayComposer}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 baseColor = timeline_base_processColor(tex, uv, time, resolution);
    if (!u_timeline_has_overlay) {
        return baseColor;
    }

    return applyTimelineOverlay(
        baseColor,
        u_timeline_overlay_image,
        uv,
        resolution,
        u_timeline_overlay_aspect_ratio,
        u_timeline_overlay_scale_x,
        u_timeline_overlay_scale_y,
        u_timeline_overlay_offset_x,
        u_timeline_overlay_offset_y,
        u_timeline_overlay_opacity,
        u_timeline_overlay_blend_mode,
        u_timeline_overlay_fit_mode,
        u_timeline_overlay_quality
    );
}`;
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
  const overlayComposer = buildTimelineOverlayComposer();

  return `// NAME: Timeline Transition
uniform float u_transition_progress; // @min 0.0 @max 1.0 @default 0.0
uniform bool u_timeline_from_has_overlay; // @default false
uniform bool u_timeline_to_has_overlay; // @default false
uniform sampler2D u_timeline_from_overlay_image;
uniform sampler2D u_timeline_to_overlay_image;
uniform float u_timeline_from_overlay_opacity; // @min 0.0 @max 1.0 @default 0.85
uniform float u_timeline_from_overlay_scale_x; // @min 0.1 @max 4.0 @default 1.0
uniform float u_timeline_from_overlay_scale_y; // @min 0.1 @max 4.0 @default 1.0
uniform float u_timeline_from_overlay_offset_x; // @min -1.5 @max 1.5 @default 0.0
uniform float u_timeline_from_overlay_offset_y; // @min -1.5 @max 1.5 @default 0.0
uniform float u_timeline_from_overlay_blend_mode; // @min 0.0 @max 3.0 @default 0.0
uniform float u_timeline_from_overlay_fit_mode; // @min 0.0 @max 2.0 @default 0.0
uniform float u_timeline_from_overlay_quality; // @min 0.0 @max 2.0 @default 1.0
uniform float u_timeline_from_overlay_aspect_ratio; // @min 0.1 @max 8.0 @default 1.0
uniform float u_timeline_to_overlay_opacity; // @min 0.0 @max 1.0 @default 0.85
uniform float u_timeline_to_overlay_scale_x; // @min 0.1 @max 4.0 @default 1.0
uniform float u_timeline_to_overlay_scale_y; // @min 0.1 @max 4.0 @default 1.0
uniform float u_timeline_to_overlay_offset_x; // @min -1.5 @max 1.5 @default 0.0
uniform float u_timeline_to_overlay_offset_y; // @min -1.5 @max 1.5 @default 0.0
uniform float u_timeline_to_overlay_blend_mode; // @min 0.0 @max 3.0 @default 0.0
uniform float u_timeline_to_overlay_fit_mode; // @min 0.0 @max 2.0 @default 0.0
uniform float u_timeline_to_overlay_quality; // @min 0.0 @max 2.0 @default 1.0
uniform float u_timeline_to_overlay_aspect_ratio; // @min 0.1 @max 8.0 @default 1.0

${leftCode}

${rightCode}

${overlayComposer}

${transitionMixer}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 fromColor = timeline_from_processColor(tex, uv, time, resolution);
    vec4 toColor = timeline_to_processColor(tex, uv, time, resolution);
    if (u_timeline_from_has_overlay) {
        fromColor = applyTimelineOverlay(
            fromColor,
            u_timeline_from_overlay_image,
            uv,
            resolution,
            u_timeline_from_overlay_aspect_ratio,
            u_timeline_from_overlay_scale_x,
            u_timeline_from_overlay_scale_y,
            u_timeline_from_overlay_offset_x,
            u_timeline_from_overlay_offset_y,
            u_timeline_from_overlay_opacity,
            u_timeline_from_overlay_blend_mode,
            u_timeline_from_overlay_fit_mode,
            u_timeline_from_overlay_quality
        );
    }
    if (u_timeline_to_has_overlay) {
        toColor = applyTimelineOverlay(
            toColor,
            u_timeline_to_overlay_image,
            uv,
            resolution,
            u_timeline_to_overlay_aspect_ratio,
            u_timeline_to_overlay_scale_x,
            u_timeline_to_overlay_scale_y,
            u_timeline_to_overlay_offset_x,
            u_timeline_to_overlay_offset_y,
            u_timeline_to_overlay_opacity,
            u_timeline_to_overlay_blend_mode,
            u_timeline_to_overlay_fit_mode,
            u_timeline_to_overlay_quality
        );
    }
    float progress = clamp(u_transition_progress, 0.0, 1.0);
    return mixTimelineTransition(fromColor, toColor, uv, progress);
}`;
}

export function buildTimelineDoubleShaderCode({
  primaryCode,
  secondaryCode,
}: {
  primaryCode: string;
  secondaryCode: string;
}): string {
  const leftCode = namespaceShaderCode(primaryCode, 'timeline_primary');
  const rightCode = namespaceShaderCode(secondaryCode, 'timeline_secondary');

  return `// NAME: Timeline Double
${leftCode}

${rightCode}

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 primaryColor = timeline_primary_processColor(tex, uv, time, resolution);
    vec4 secondaryColor = timeline_secondary_processColor(tex, uv, time, resolution);
    return vec4(
        mix(primaryColor.rgb, secondaryColor.rgb, 0.5),
        mix(primaryColor.a, secondaryColor.a, 0.5)
    );
}`;
}
