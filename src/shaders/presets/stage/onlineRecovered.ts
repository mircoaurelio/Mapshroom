import type { ShaderPresetDefinition } from '../types';

// Recovered from the online Mapshroom local-storage backup exported on 2026-05-24.
// Incomplete draft shaders are intentionally skipped; the original backup remains untouched.
const onlineRecoveredStagePresetListSource: ShaderPresetDefinition[] = [
  {
    "id": "default_duotone_relic",
    "name": "Duotone Relic",
    "template": "stage",
    "group": "Color",
    "description": "Maps the drawing to paper and ink tones, giving black-line art a printmaking finish.",
    "code": "// NAME: Duotone Relic\nuniform vec3 paper; // @default 1.0,0.96,0.90\nuniform vec3 inkColor; // @default 0.11,0.12,0.16\nuniform float contrast; // @min 0.5 @max 2.0 @default 1.2\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    float tone = clamp((lum - 0.5) * contrast + 0.5, 0.0, 1.0);\n    float grain = node_noise(uv * resolution * 0.02 + time * 0.04) * 0.05;\n\n    vec3 paperShade = clamp(paper - vec3(grain * 0.7), 0.0, 1.0);\n    vec3 inkShade = clamp(inkColor + vec3(grain * 0.15), 0.0, 1.0);\n    vec3 result = mix(inkShade, paperShade, tone);\n    return vec4(result, source.a);\n}",
    "uniformValues": {
      "paper": [
        1,
        0.96,
        0.9
      ],
      "inkColor": [
        0.11,
        0.12,
        0.16
      ],
      "contrast": 1.2
    }
  },
  {
    "id": "default_poster_threshold",
    "name": "Poster Threshold",
    "template": "stage",
    "group": "Color",
    "description": "Quantizes the drawing into bold tonal bands that stay readable on black-line illustrations.",
    "code": "// NAME: Poster Threshold\nuniform float levels; // @min 2.0 @max 8.0 @default 4.0\nuniform float threshold; // @min 0.45 @max 0.95 @default 0.8\nuniform vec3 lineColor; // @default 0.10,0.12,0.16\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    float noisePulse = node_noise(uv * 3.0 + vec2(time * 0.12, -time * 0.09));\n    float animatedLevels = max(2.0, levels + sin(time * 0.8 + noisePulse * 6.28318) * 0.35);\n    float poster = floor(lum * animatedLevels) / max(animatedLevels - 1.0, 1.0);\n    float ink = 1.0 - smoothstep(threshold - 0.16, threshold, lum + (noisePulse - 0.5) * 0.04);\n\n    vec3 plate = vec3(poster) * (0.92 + 0.08 * sin(time * 0.9 + uv.y * 8.0));\n    vec3 animatedLine = clamp(\n        lineColor + vec3(\n            sin(time * 0.8 + uv.x * 5.0),\n            sin(time * 1.0 + uv.y * 6.0 + 2.0),\n            sin(time * 1.2 + uv.x * 4.0 + 4.0)\n        ) * 0.05,\n        0.0,\n        1.0\n    );\n    vec3 result = mix(plate, animatedLine, ink);\n    return vec4(result, source.a);\n}",
    "uniformValues": {
      "levels": 4,
      "threshold": 0.8,
      "lineColor": [
        0.1,
        0.12,
        0.16
      ]
    }
  },
  {
    "id": "default_cyber",
    "name": "Spectral Contour Split",
    "template": "stage",
    "group": "Color",
    "description": "Pushes RGB channels away from the dark line work for a clean chromatic contour effect.",
    "code": "// NAME: Spectral Contour Split\nuniform float split; // @min 0.0 @max 0.08 @default 0.02\nuniform float pulse; // @min 0.0 @max 4.0 @default 0.9\nuniform float invertMix; // @min 0.0 @max 1.0 @default 0.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 center = uv - 0.5;\n    vec2 dir = normalize(center + vec2(0.0001));\n    float shift = split * (0.7 + 0.3 * sin(time * pulse));\n\n    vec4 base = texture2D(tex, uv);\n    vec4 red = texture2D(tex, uv + dir * shift);\n    vec4 blue = texture2D(tex, uv - dir * shift);\n\n    float lum = dot(base.rgb, vec3(0.299, 0.587, 0.114));\n    float ink = 1.0 - smoothstep(0.72, 0.95, lum);\n    vec3 aberration = vec3(red.r, base.g, blue.b);\n    vec3 result = mix(base.rgb, aberration, ink);\n    result = mix(result, 1.0 - result, step(0.5, invertMix));\n\n    return vec4(result, base.a);\n}",
    "uniformValues": {
      "split": 0.02,
      "pulse": 0.9,
      "invertMix": 0
    }
  },
  {
    "id": "default_thermal",
    "name": "Thermal Vision",
    "template": "stage",
    "group": "Color",
    "description": "False-color heat mapping that follows the darkest contours.",
    "code": "// NAME: Thermal Vision\nuniform float contrast; // @min 0.5 @max 3.0 @default 1.5\nuniform float heatSpread; // @min 0.0 @max 1.0 @default 0.5\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    float t = time * speed;\n    vec4 col = texture2D(tex, uv);\n    float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));\n    float lineMask = smoothstep(0.6, 0.1, lum);\n\n    float n1 = node_noise(uv * 4.0 + vec2(t * 0.4, t * 0.3));\n    float n2 = node_noise(uv * 6.0 - vec2(t * 0.25, t * 0.5));\n    float n3 = node_noise(uv * 3.0 + vec2(sin(t * 0.6) * 0.5, cos(t * 0.4) * 0.5));\n    float flow = (n1 + n2 + n3) / 3.0;\n\n    float heat = lineMask * contrast;\n    float spreading = flow * heatSpread * (0.7 + 0.3 * sin(t * 1.5));\n    heat = clamp(heat + spreading * lineMask + spreading * 0.15, 0.0, 1.0);\n\n    float pulse = 0.85 + 0.15 * sin(t * 2.5 + uv.y * 5.0);\n    heat *= pulse;\n\n    vec3 cold = vec3(0.0, 0.0, 0.4);\n    vec3 cool = vec3(0.0, 0.2, 1.0);\n    vec3 warm = vec3(1.0, 0.8, 0.0);\n    vec3 hot = vec3(1.0, 0.0, 0.0);\n    vec3 white = vec3(1.0, 0.9, 0.8);\n\n    vec3 thermal = mix(cold, cool, smoothstep(0.0, 0.25, heat));\n    thermal = mix(thermal, warm, smoothstep(0.25, 0.5, heat));\n    thermal = mix(thermal, hot, smoothstep(0.5, 0.75, heat));\n    thermal = mix(thermal, white, smoothstep(0.75, 1.0, heat));\n\n    vec3 bg = vec3(0.0, 0.0, 0.12 + 0.03 * sin(t * 0.8));\n    vec3 result = mix(bg, thermal, max(lineMask * 0.3, heat));\n    return vec4(result, col.a);\n}",
    "uniformValues": {
      "contrast": 1.5,
      "heatSpread": 0.5,
      "speed": 0.8
    }
  },
  {
    "id": "default_watercolor",
    "name": "Watercolor Bleed",
    "template": "stage",
    "group": "Color",
    "description": "A watercolor wash with soft paper grain and bleeding edges.",
    "code": "// NAME: Watercolor Bleed\nuniform float bleed; // @min 0.001 @max 0.02 @default 0.006\nuniform float speed; // @min 0.0 @max 2.0 @default 0.4\nuniform float saturation; // @min 0.3 @max 2.0 @default 1.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    float t = time * speed;\n    float n1 = node_noise(uv * 5.0 + t * 0.2);\n    float n2 = node_noise(uv * 8.0 - t * 0.15);\n    vec2 distort = vec2(n1 - 0.5, n2 - 0.5) * bleed;\n\n    vec4 col = texture2D(tex, uv + distort);\n    float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));\n    float lineMask = smoothstep(0.7, 0.15, lum);\n\n    float hue = node_noise(uv * 2.0 + t * 0.1) * 6.28318;\n    vec3 pigment = 0.5 + 0.5 * cos(hue + vec3(0.0, 2.094, 4.189));\n    pigment = mix(vec3(dot(pigment, vec3(0.333))), pigment, saturation);\n\n    float paper = 0.95 + 0.05 * node_noise(uv * 30.0);\n    float bloom = smoothstep(0.0, 0.65, lineMask);\n    vec3 wash = mix(vec3(paper), pigment * 0.72, bloom);\n    vec3 result = mix(vec3(paper), wash, 0.9);\n    return vec4(result, col.a);\n}",
    "uniformValues": {
      "bleed": 0.006,
      "speed": 0.4,
      "saturation": 1
    }
  },
  {
    "id": "default_ritual_kaleidoscope",
    "name": "Ritual Kaleidoscope",
    "template": "stage",
    "group": "Geometry",
    "description": "Mirrors the drawing into a radial mandala, ideal for symmetrical spiritual artwork.",
    "code": "// NAME: Ritual Kaleidoscope\nuniform float segments; // @min 3.0 @max 12.0 @default 6.0\nuniform float zoom; // @min 0.6 @max 2.0 @default 1.0\nuniform float spin; // @min -2.0 @max 2.0 @default 0.15\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 p = (uv - 0.5) / zoom;\n    float angle = atan(p.y, p.x) + time * spin * 0.35;\n    float radius = length(p);\n    float slice = 6.28318 / max(segments, 1.0);\n    angle = abs(mod(angle, slice) - 0.5 * slice);\n\n    vec2 sampleUv = vec2(cos(angle), sin(angle)) * radius + 0.5;\n    sampleUv = clamp(sampleUv, 0.0, 1.0);\n    return texture2D(tex, sampleUv);\n}",
    "uniformValues": {
      "segments": 6,
      "zoom": 1,
      "spin": 0.15
    }
  },
  {
    "id": "default_vortex_ink",
    "name": "Vortex Ink",
    "template": "stage",
    "group": "Geometry",
    "description": "Twists the drawing around the center for a ceremonial vortex without losing line readability.",
    "code": "// NAME: Vortex Ink\nuniform float twist; // @min 0.0 @max 4.0 @default 1.2\nuniform float speed; // @min 0.0 @max 3.0 @default 0.8\nuniform float zoom; // @min 0.6 @max 2.0 @default 1.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 p = (uv - 0.5) / zoom;\n    float radius = length(p);\n    float angle = atan(p.y, p.x);\n    angle += twist * (1.0 - clamp(radius, 0.0, 1.0)) * sin(time * speed);\n\n    vec2 sampleUv = vec2(cos(angle), sin(angle)) * radius + 0.5;\n    sampleUv = clamp(sampleUv, 0.0, 1.0);\n    return texture2D(tex, sampleUv);\n}",
    "uniformValues": {
      "twist": 1.2,
      "speed": 0.8,
      "zoom": 1
    }
  },
  {
    "id": "default_psych",
    "name": "Ink Aura Bloom",
    "template": "stage",
    "group": "Glow",
    "description": "Builds a soft colored halo around dark contours while keeping the white paper readable.",
    "code": "// NAME: Ink Aura Bloom\nuniform float glow; // @min 0.0 @max 2.0 @default 0.85\nuniform float threshold; // @min 0.55 @max 0.98 @default 0.82\nuniform vec3 glowColor; // @default 0.10,0.88,0.76\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 px = 1.5 / max(resolution, vec2(1.0));\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    float ink = 1.0 - smoothstep(threshold - 0.18, threshold, lum);\n\n    float inkX1 = 1.0 - smoothstep(threshold - 0.18, threshold, dot(texture2D(tex, uv + vec2(px.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114)));\n    float inkX2 = 1.0 - smoothstep(threshold - 0.18, threshold, dot(texture2D(tex, uv - vec2(px.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114)));\n    float inkY1 = 1.0 - smoothstep(threshold - 0.18, threshold, dot(texture2D(tex, uv + vec2(0.0, px.y)).rgb, vec3(0.299, 0.587, 0.114)));\n    float inkY2 = 1.0 - smoothstep(threshold - 0.18, threshold, dot(texture2D(tex, uv - vec2(0.0, px.y)).rgb, vec3(0.299, 0.587, 0.114)));\n\n    float aura = max(0.0, ((inkX1 + inkX2 + inkY1 + inkY2) * 0.25) - ink) * glow;\n    float pulse = 0.78 + 0.22 * sin(time * 0.9 + uv.y * 8.0);\n    vec3 halo = glowColor * aura * pulse;\n    vec3 lineLift = mix(source.rgb, glowColor, ink * 0.14);\n    vec3 paperLift = mix(lineLift, vec3(1.0), 0.05);\n    vec3 result = clamp(paperLift + halo, 0.0, 1.0);\n    return vec4(result, source.a);\n}",
    "uniformValues": {
      "glow": 0.85,
      "threshold": 0.82,
      "glowColor": [
        0.1,
        0.88,
        0.76
      ]
    }
  },
  {
    "id": "default_ink_bloom",
    "name": "Ink Bloom",
    "template": "stage",
    "group": "Glow",
    "description": "Creates a colorful bloom from the darkest strokes while preserving fine line detail.",
    "code": "// NAME: Ink Bloom\nuniform float bloom; // @min 0.0 @max 3.0 @default 1.1\nuniform vec3 bloomColor; // @default 1.0,0.35,0.74\nuniform float threshold; // @min 0.55 @max 0.98 @default 0.82\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 px = 2.0 / max(resolution, vec2(1.0));\n    vec4 source = texture2D(tex, uv);\n    float center = 1.0 - smoothstep(threshold - 0.16, threshold, dot(source.rgb, vec3(0.299, 0.587, 0.114)));\n\n    float blur = 0.0;\n    blur += 1.0 - smoothstep(threshold - 0.16, threshold, dot(texture2D(tex, uv + vec2(px.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114)));\n    blur += 1.0 - smoothstep(threshold - 0.16, threshold, dot(texture2D(tex, uv - vec2(px.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114)));\n    blur += 1.0 - smoothstep(threshold - 0.16, threshold, dot(texture2D(tex, uv + vec2(0.0, px.y)).rgb, vec3(0.299, 0.587, 0.114)));\n    blur += 1.0 - smoothstep(threshold - 0.16, threshold, dot(texture2D(tex, uv - vec2(0.0, px.y)).rgb, vec3(0.299, 0.587, 0.114)));\n    blur *= 0.25;\n\n    float pulse = 0.82 + 0.18 * sin(time * 0.9 + uv.y * 10.0);\n    float swirl = node_noise(uv * 3.0 + vec2(time * 0.12, -time * 0.08));\n    float glow = max(0.0, blur - center * 0.5) * bloom * pulse;\n    vec3 animatedBloom = clamp(\n        bloomColor + vec3(\n            sin(time * 0.7 + swirl * 6.28318),\n            sin(time * 0.9 + swirl * 6.28318 + 2.1),\n            sin(time * 1.1 + swirl * 6.28318 + 4.2)\n        ) * 0.08,\n        0.0,\n        1.0\n    );\n    vec3 result = clamp(source.rgb + animatedBloom * glow + animatedBloom * center * 0.15, 0.0, 1.0);\n    return vec4(result, source.a);\n}",
    "uniformValues": {
      "bloom": 1.1,
      "bloomColor": [
        1,
        0.35,
        0.74
      ],
      "threshold": 0.82
    }
  },
  {
    "id": "default_inverted_neon",
    "name": "Inverted Neon",
    "template": "stage",
    "group": "Glow",
    "description": "Flips the page toward darkness and turns the black contours into bright electric traces.",
    "code": "// NAME: Inverted Neon\nuniform vec3 neon; // @default 0.20,0.84,1.0\nuniform float boost; // @min 0.0 @max 2.5 @default 1.25\nuniform float threshold; // @min 0.55 @max 0.98 @default 0.82\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    float ink = 1.0 - smoothstep(threshold - 0.18, threshold, lum);\n\n    vec3 night = vec3(0.02, 0.03, 0.05);\n    vec3 electric = neon * (0.45 + ink * boost);\n    float shimmer = 0.88 + 0.12 * sin(time * 1.6 + uv.y * 18.0);\n    vec3 result = mix(night, electric * shimmer, ink);\n    return vec4(clamp(result, 0.0, 1.0), source.a);\n}",
    "uniformValues": {
      "neon": [
        0.2,
        0.84,
        1
      ],
      "boost": 1.25,
      "threshold": 0.82
    }
  },
  {
    "id": "default_monochrome_bleed",
    "name": "Monochrome Bleed",
    "template": "stage",
    "group": "Glow",
    "description": "Expands dark lines into a soft analog bleed, useful for projection surfaces with texture.",
    "code": "// NAME: Monochrome Bleed\nuniform float bleed; // @min 0.5 @max 4.0 @default 1.5\nuniform float softness; // @min 0.0 @max 1.0 @default 0.45\nuniform vec3 inkColor; // @default 0.08,0.08,0.10\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 pulse = (vec2(\n        node_noise(uv * 2.6 + vec2(time * 0.10, -time * 0.07)),\n        node_noise(uv * 2.6 + vec2(-time * 0.08, time * 0.11) + 3.7)\n    ) - 0.5) * 0.6;\n    vec2 px = (bleed + pulse) / max(resolution, vec2(1.0));\n    vec4 source = texture2D(tex, uv);\n    float center = 1.0 - smoothstep(0.72, 0.94, dot(source.rgb, vec3(0.299, 0.587, 0.114)));\n\n    float sampleX1 = 1.0 - smoothstep(0.72, 0.94, dot(texture2D(tex, uv + vec2(px.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114)));\n    float sampleX2 = 1.0 - smoothstep(0.72, 0.94, dot(texture2D(tex, uv - vec2(px.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114)));\n    float sampleY1 = 1.0 - smoothstep(0.72, 0.94, dot(texture2D(tex, uv + vec2(0.0, px.y)).rgb, vec3(0.299, 0.587, 0.114)));\n    float sampleY2 = 1.0 - smoothstep(0.72, 0.94, dot(texture2D(tex, uv - vec2(0.0, px.y)).rgb, vec3(0.299, 0.587, 0.114)));\n    float sampleD1 = 1.0 - smoothstep(0.72, 0.94, dot(texture2D(tex, uv + px).rgb, vec3(0.299, 0.587, 0.114)));\n    float sampleD2 = 1.0 - smoothstep(0.72, 0.94, dot(texture2D(tex, uv - px).rgb, vec3(0.299, 0.587, 0.114)));\n    float surround = (sampleX1 + sampleX2 + sampleY1 + sampleY2 + sampleD1 + sampleD2) * 0.1667;\n\n    float shimmer = 0.8 + 0.2 * sin(time * 1.0 + uv.y * 12.0);\n    float bleedMask = smoothstep(0.08, 0.9, surround) * softness * shimmer;\n    vec3 animatedInk = clamp(\n        inkColor + vec3(\n            sin(time * 0.7 + uv.x * 6.0),\n            sin(time * 0.9 + uv.y * 5.0 + 2.0),\n            sin(time * 1.1 + uv.x * 4.0 + 4.0)\n        ) * 0.04,\n        0.0,\n        1.0\n    );\n    vec3 result = mix(vec3(1.0), animatedInk, clamp(center + bleedMask * 0.7, 0.0, 1.0));\n    return vec4(result, source.a);\n}",
    "uniformValues": {
      "bleed": 1.5,
      "softness": 0.45,
      "inkColor": [
        0.08,
        0.08,
        0.1
      ]
    }
  },
  {
    "id": "default_neon",
    "name": "Neon Glow Lines",
    "template": "stage",
    "group": "Glow",
    "description": "A bright neon outline that glows around dark edges.",
    "code": "// NAME: Neon Glow Lines\nuniform float glowSize; // @min 0.001 @max 0.02 @default 0.005\nuniform float brightness; // @min 0.5 @max 3.0 @default 1.5\nuniform vec3 tint; // @default 0.0,1.0,0.6\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 col = texture2D(tex, uv);\n    float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));\n    float lineMask = smoothstep(0.6, 0.1, lum);\n\n    float d1 = glowSize;\n    float d2 = glowSize * 2.0;\n    float d3 = glowSize * 3.0;\n    float d4 = glowSize * 4.0;\n    float glow =\n        dot(texture2D(tex, uv + vec2(d1, 0.0)).rgb, vec3(0.299, 0.587, 0.114)) +\n        dot(texture2D(tex, uv - vec2(d1, 0.0)).rgb, vec3(0.299, 0.587, 0.114)) +\n        dot(texture2D(tex, uv + vec2(0.0, d2)).rgb, vec3(0.299, 0.587, 0.114)) +\n        dot(texture2D(tex, uv - vec2(0.0, d2)).rgb, vec3(0.299, 0.587, 0.114)) +\n        dot(texture2D(tex, uv + vec2(d3, d3)).rgb, vec3(0.299, 0.587, 0.114)) +\n        dot(texture2D(tex, uv - vec2(d3, d3)).rgb, vec3(0.299, 0.587, 0.114)) +\n        dot(texture2D(tex, uv + vec2(-d4, d4)).rgb, vec3(0.299, 0.587, 0.114)) +\n        dot(texture2D(tex, uv + vec2(d4, -d4)).rgb, vec3(0.299, 0.587, 0.114));\n    glow = 1.0 - glow / 8.0;\n    float glowMask = smoothstep(0.1, 0.6, glow);\n\n    float pulse = 0.8 + 0.2 * sin(time * 2.0);\n    vec3 neon = tint * brightness * pulse;\n\n    vec3 result = mix(vec3(0.02), neon, max(lineMask, glowMask * 0.5));\n    return vec4(result, col.a);\n}",
    "uniformValues": {
      "glowSize": 0.005,
      "brightness": 1.5,
      "tint": [
        0,
        1,
        0.6
      ]
    }
  },
  {
    "id": "default_psych_halo",
    "name": "Psychedelic Dark Halo Echoes",
    "template": "stage",
    "group": "Glow",
    "description": "Animated halo echoes that stack color around dark contours.",
    "code": "// NAME: Psychedelic Dark Halo Echoes\nuniform float intensity; // @min 0.0 @max 5.0 @default 2.0\nuniform float speed; // @min 0.0 @max 3.0 @default 1.0\nuniform vec3 tint; // @default 0.0,0.33,0.67\nuniform float haloSize; // @min 0.0 @max 1.0 @default 0.4\nuniform float haloSoftness; // @min 0.01 @max 1.0 @default 0.3\nuniform float echoDistance; // @min 0.0 @max 0.5 @default 0.05\nuniform float blobDarkness; // @min 0.0 @max 5.0 @default 1.5\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    float t = time * speed;\n    vec2 center = uv - 0.5;\n    vec2 warp = (vec2(\n        node_noise(uv * 2.2 + vec2(t * 0.12, -t * 0.18)),\n        node_noise(uv * 2.2 + vec2(-t * 0.16, t * 0.11) + 3.1)\n    ) - 0.5) * 0.05;\n\n    vec2 echoUv0 = uv + warp * 0.35;\n    vec2 echoUv1 = 0.5 + center * (1.0 - echoDistance * 0.7) + warp;\n    vec2 echoUv2 = 0.5 + center * (1.0 - echoDistance * 1.4) - warp * 0.8;\n\n    vec4 source = texture2D(tex, uv);\n    float lum0 = dot(texture2D(tex, echoUv0).rgb, vec3(0.299, 0.587, 0.114));\n    float lum1 = dot(texture2D(tex, echoUv1).rgb, vec3(0.299, 0.587, 0.114));\n    float lum2 = dot(texture2D(tex, echoUv2).rgb, vec3(0.299, 0.587, 0.114));\n\n    float blobNoise = node_noise(uv * 3.2 + warp * 8.0 + t * 0.2);\n    float darkMultiplier = 0.35 + 0.65 * (1.0 - smoothstep(0.18, 0.88, blobNoise * blobDarkness * 0.35));\n\n    float mask0 = smoothstep(0.0, 0.06, lum0) * (1.0 - smoothstep(haloSize, haloSize + haloSoftness, lum0));\n    float mask1 = smoothstep(0.0, 0.06, lum1) * (1.0 - smoothstep(haloSize, haloSize + haloSoftness, lum1));\n    float mask2 = smoothstep(0.0, 0.06, lum2) * (1.0 - smoothstep(haloSize, haloSize + haloSoftness, lum2));\n\n    vec3 color0 = 0.5 + 0.5 * cos(6.28318 * (vec3(lum0 + blobNoise * 0.9 + t * 0.18) + tint + vec3(0.00, 0.12, 0.24)));\n    vec3 color1 = 0.5 + 0.5 * cos(6.28318 * (vec3(lum1 + blobNoise * 1.1 + t * 0.20) + tint + vec3(0.08, 0.20, 0.32)));\n    vec3 color2 = 0.5 + 0.5 * cos(6.28318 * (vec3(lum2 + blobNoise * 1.3 + t * 0.22) + tint + vec3(0.16, 0.28, 0.40)));\n\n    vec3 finalColor =\n        color0 * mask0 +\n        color1 * mask1 * 0.78 +\n        color2 * mask2 * 0.56;\n\n    finalColor *= intensity * darkMultiplier;\n    return vec4(clamp(finalColor, 0.0, 1.0), source.a);\n}",
    "uniformValues": {
      "intensity": 2,
      "speed": 1,
      "tint": [
        0,
        0.33,
        0.67
      ],
      "haloSize": 0.4,
      "haloSoftness": 0.3,
      "echoDistance": 0.05,
      "blobDarkness": 1.5
    }
  },
  {
    "id": "default_psych_halo_only",
    "name": "Psychedelic Dark Halo Only",
    "template": "stage",
    "group": "Glow",
    "description": "A pure dark-halo treatment with animated color bands.",
    "code": "// NAME: Psychedelic Dark Halo Only\nuniform float intensity; // @min 0.0 @max 5.0 @default 2.0\nuniform float speed; // @min 0.0 @max 3.0 @default 1.0\nuniform vec3 tint; // @default 0.0,0.33,0.67\nuniform float haloSize; // @min 0.0 @max 1.0 @default 0.4\nuniform float haloSoftness; // @min 0.01 @max 1.0 @default 0.3\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    float t = time * speed;\n    vec4 original = texture2D(tex, uv);\n    float lum = dot(original.rgb, vec3(0.299, 0.587, 0.114));\n    float blurLum =\n        lum * 0.4 +\n        dot(texture2D(tex, uv + vec2(1.0 / max(resolution.x, 1.0), 0.0)).rgb, vec3(0.299, 0.587, 0.114)) * 0.15 +\n        dot(texture2D(tex, uv - vec2(1.0 / max(resolution.x, 1.0), 0.0)).rgb, vec3(0.299, 0.587, 0.114)) * 0.15 +\n        dot(texture2D(tex, uv + vec2(0.0, 1.0 / max(resolution.y, 1.0))).rgb, vec3(0.299, 0.587, 0.114)) * 0.15 +\n        dot(texture2D(tex, uv - vec2(0.0, 1.0 / max(resolution.y, 1.0))).rgb, vec3(0.299, 0.587, 0.114)) * 0.15;\n\n    float darkHaloMask = smoothstep(max(0.0, haloSize - haloSoftness), haloSize, blurLum) *\n                         (1.0 - smoothstep(haloSize, haloSize + haloSoftness, blurLum));\n\n    float blobNoise = node_noise(uv * 3.0 + vec2(t * 0.18, -t * 0.14));\n    vec3 psychColor = 0.5 + 0.5 * cos(6.28318 * (vec3(blurLum + blobNoise * 1.1 + t * 0.2) + tint + vec3(0.0, 0.15, 0.3)));\n    vec3 finalColor = psychColor * clamp(darkHaloMask * intensity, 0.0, 1.0);\n\n    return vec4(clamp(finalColor, 0.0, 1.0), original.a);\n}",
    "uniformValues": {
      "intensity": 2,
      "speed": 1,
      "tint": [
        0,
        0.33,
        0.67
      ],
      "haloSize": 0.4,
      "haloSoftness": 0.3
    }
  },
  {
    "id": "default_pulsing_soft_halo",
    "name": "Pulsing Soft Psychedelic Halo",
    "template": "stage",
    "group": "Glow",
    "description": "A soft halo variant with breathing size and color pulses.",
    "code": "// NAME: Pulsing Soft Psychedelic Halo\nuniform float intensity; // @min 0.0 @max 5.0 @default 2.5\nuniform float speed; // @min 0.0 @max 3.0 @default 1.0\nuniform vec3 tint; // @default 0.1,0.5,0.9\nuniform float haloSize; // @min 0.0 @max 1.0 @default 0.6\nuniform float haloSoftness; // @min 0.01 @max 1.0 @default 0.5\nuniform float warp; // @min 0.0 @max 5.0 @default 1.5\nuniform float pulseAmount; // @min 0.0 @max 1.0 @default 0.4\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    float t = time * speed;\n    vec4 original = texture2D(tex, uv);\n    vec2 off = 2.0 / max(resolution, vec2(1.0));\n    float lum = dot(original.rgb, vec3(0.299, 0.587, 0.114));\n    lum += dot(texture2D(tex, uv + vec2(off.x, off.y)).rgb, vec3(0.299, 0.587, 0.114));\n    lum += dot(texture2D(tex, uv + vec2(-off.x, off.y)).rgb, vec3(0.299, 0.587, 0.114));\n    lum += dot(texture2D(tex, uv + vec2(off.x, -off.y)).rgb, vec3(0.299, 0.587, 0.114));\n    lum += dot(texture2D(tex, uv + vec2(-off.x, -off.y)).rgb, vec3(0.299, 0.587, 0.114));\n    lum *= 0.2;\n    float sizeBlob = node_noise(uv * 1.5 + vec2(t * 0.28, -t * 0.22));\n    float dynamicHaloSize = clamp(haloSize + (sizeBlob - 0.5) * pulseAmount, 0.01, 0.99);\n    float darkHaloMask = smoothstep(max(0.0, dynamicHaloSize - haloSoftness), dynamicHaloSize, lum) *\n                         (1.0 - smoothstep(dynamicHaloSize, dynamicHaloSize + haloSoftness, lum));\n\n    vec2 flow = (vec2(\n        node_noise(uv * 2.0 + vec2(t * 0.18, -t * 0.12)),\n        node_noise(uv * 2.0 + vec2(-t * 0.14, t * 0.16) + 2.7)\n    ) - 0.5) * warp;\n    float blobNoise = node_noise(uv * 2.8 + flow * 1.8 + t * 0.24);\n    float pulse = 0.82 + 0.18 * sin(t * 1.8 + uv.y * 6.0);\n    float phase = lum + blobNoise * 1.25 + flow.x * 0.35 + flow.y * 0.22 + t * 0.32;\n    vec3 psychColor = 0.5 + 0.5 * cos(6.28318 * (vec3(phase) + tint + vec3(0.02, 0.20, 0.38)));\n    vec3 bands = vec3(\n        sin(phase * 4.0 + t * 1.0),\n        sin(phase * 5.2 - t * 0.75),\n        sin(phase * 6.1 + t * 1.05)\n    ) * 0.12;\n    vec3 finalColor = clamp((psychColor + bands) * darkHaloMask * intensity * pulse, 0.0, 1.0);\n\n    return vec4(finalColor, original.a);\n}",
    "uniformValues": {
      "intensity": 2.5,
      "speed": 1,
      "tint": [
        0.1,
        0.5,
        0.9
      ],
      "haloSize": 0.6,
      "haloSoftness": 0.5,
      "warp": 1.5,
      "pulseAmount": 0.4
    }
  },
  {
    "id": "default_radial_crown",
    "name": "Radial Crown",
    "template": "stage",
    "group": "Glow",
    "description": "Places animated circular light crowns around dark strokes and central motifs.",
    "code": "// NAME: Radial Crown\nuniform float rings; // @min 1.0 @max 20.0 @default 6.0\nuniform float strength; // @min 0.0 @max 1.2 @default 0.35\nuniform vec3 crown; // @default 0.98,0.78,0.24\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    float ink = 1.0 - smoothstep(0.72, 0.95, lum);\n    float radius = length(uv - 0.5);\n    float pulse = 0.5 + 0.5 * cos(radius * rings * 18.0 - time * 2.0);\n    vec3 aura = crown * pulse * ink * strength;\n    vec3 result = clamp(source.rgb + aura, 0.0, 1.0);\n    return vec4(result, source.a);\n}",
    "uniformValues": {
      "rings": 6,
      "strength": 0.35,
      "crown": [
        0.98,
        0.78,
        0.24
      ]
    }
  },
  {
    "id": "default_soft_psych_halo",
    "name": "Soft Psychedelic Halo",
    "template": "stage",
    "group": "Glow",
    "description": "A softer halo bloom with gently warped color motion.",
    "code": "// NAME: Soft Psychedelic Halo\nuniform float intensity; // @min 0.0 @max 5.0 @default 2.5\nuniform float speed; // @min 0.0 @max 3.0 @default 1.0\nuniform vec3 tint; // @default 0.1,0.5,0.9\nuniform float haloSize; // @min 0.0 @max 1.0 @default 0.6\nuniform float haloSoftness; // @min 0.01 @max 1.0 @default 0.5\nuniform float warp; // @min 0.0 @max 5.0 @default 1.5\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    float t = time * speed;\n    vec4 original = texture2D(tex, uv);\n    vec2 off = 2.0 / max(resolution, vec2(1.0));\n    float lum = dot(original.rgb, vec3(0.299, 0.587, 0.114));\n    lum += dot(texture2D(tex, uv + vec2(off.x, off.y)).rgb, vec3(0.299, 0.587, 0.114));\n    lum += dot(texture2D(tex, uv + vec2(-off.x, off.y)).rgb, vec3(0.299, 0.587, 0.114));\n    lum += dot(texture2D(tex, uv + vec2(off.x, -off.y)).rgb, vec3(0.299, 0.587, 0.114));\n    lum += dot(texture2D(tex, uv + vec2(-off.x, -off.y)).rgb, vec3(0.299, 0.587, 0.114));\n    lum *= 0.2;\n    float darkHaloMask = smoothstep(max(0.0, haloSize - haloSoftness), haloSize, lum) *\n                         (1.0 - smoothstep(haloSize, haloSize + haloSoftness, lum));\n\n    vec2 flow = (vec2(\n        node_noise(uv * 2.0 + vec2(t * 0.16, -t * 0.10)),\n        node_noise(uv * 2.0 + vec2(-t * 0.12, t * 0.14) + 4.2)\n    ) - 0.5) * warp;\n    float blobNoise = node_noise(uv * 3.0 + flow * 1.5 + t * 0.22);\n    float phase = lum + blobNoise * 1.3 + flow.x * 0.4 + flow.y * 0.2 + t * 0.35;\n    vec3 psychColor = 0.5 + 0.5 * cos(6.28318 * (vec3(phase) + tint + vec3(0.0, 0.18, 0.36)));\n    vec3 bands = vec3(\n        sin(phase * 4.0 + t),\n        sin(phase * 5.0 - t * 0.8),\n        sin(phase * 6.0 + t * 1.1)\n    ) * 0.12;\n    vec3 finalColor = clamp((psychColor + bands) * darkHaloMask * intensity, 0.0, 1.0);\n\n    return vec4(finalColor, original.a);\n}",
    "uniformValues": {
      "intensity": 2.5,
      "speed": 1,
      "tint": [
        0.1,
        0.5,
        0.9
      ],
      "haloSize": 0.6,
      "haloSoftness": 0.5,
      "warp": 1.5
    }
  },
  {
    "id": "default_crosshatch_shade",
    "name": "Crosshatch Shade",
    "template": "stage",
    "group": "Graphic",
    "description": "Adds procedural hatch layers so the line work feels etched and shaded rather than flat.",
    "code": "// NAME: Crosshatch Shade\nuniform float density; // @min 100.0 @max 900.0 @default 420.0\nuniform float strength; // @min 0.0 @max 1.0 @default 0.78\nuniform vec3 inkColor; // @default 0.08,0.08,0.10\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    float shadow = 1.0 - lum;\n    vec2 flow = (vec2(\n        node_noise(uv * 2.0 + vec2(time * 0.08, -time * 0.05)),\n        node_noise(uv * 2.0 + vec2(-time * 0.06, time * 0.09) + 4.1)\n    ) - 0.5) * 0.018;\n    vec2 hatchUv = uv + flow;\n\n    float hatchA = step(0.5, fract((hatchUv.x + hatchUv.y * 1.1) * density));\n    float hatchB = step(0.5, fract((hatchUv.x - hatchUv.y * 1.3) * density * 0.78));\n    float hatchC = step(0.5, fract((hatchUv.x + hatchUv.y * 0.45) * density * 1.35));\n\n    float pattern = 0.0;\n    pattern = max(pattern, hatchA * smoothstep(0.12, 0.38, shadow));\n    pattern = max(pattern, hatchB * smoothstep(0.28, 0.62, shadow));\n    pattern = max(pattern, hatchC * smoothstep(0.5, 0.92, shadow));\n    pattern = max(pattern, shadow * 0.65);\n\n    float phase = node_noise(hatchUv * 3.0 + time * 0.12);\n    vec3 animatedInk = clamp(\n        inkColor + vec3(\n            sin(time * 0.7 + phase * 6.28318),\n            sin(time * 0.9 + phase * 6.28318 + 1.9),\n            sin(time * 1.1 + phase * 6.28318 + 3.8)\n        ) * 0.05,\n        0.0,\n        1.0\n    );\n    vec3 result = mix(vec3(1.0), animatedInk, pattern * strength);\n    return vec4(result, source.a);\n}",
    "uniformValues": {
      "density": 420,
      "strength": 0.78,
      "inkColor": [
        0.08,
        0.08,
        0.1
      ]
    }
  },
  {
    "id": "default_engraved_emboss",
    "name": "Engraved Emboss",
    "template": "stage",
    "group": "Graphic",
    "description": "Uses neighboring luminance differences to turn the line art into a beveled engraving.",
    "code": "// NAME: Engraved Emboss\nuniform float radius; // @min 0.5 @max 4.0 @default 1.6\nuniform float depth; // @min 0.2 @max 3.0 @default 1.15\nuniform vec3 tint; // @default 0.78,0.82,0.88\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 jitter = (vec2(\n        node_noise(uv * 3.0 + vec2(time * 0.1, -time * 0.08)),\n        node_noise(uv * 3.0 + vec2(-time * 0.09, time * 0.07) + 2.8)\n    ) - 0.5) * 0.4;\n    vec2 px = (radius + jitter) / max(resolution, vec2(1.0));\n    float topLeft = dot(texture2D(tex, uv - px).rgb, vec3(0.299, 0.587, 0.114));\n    float bottomRight = dot(texture2D(tex, uv + px).rgb, vec3(0.299, 0.587, 0.114));\n    float baseLum = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n\n    float relief = clamp(0.5 + (topLeft - bottomRight) * depth, 0.0, 1.0);\n    float mask = 1.0 - smoothstep(0.7, 0.96, baseLum);\n    float shimmer = 0.5 + 0.5 * sin(time * 0.9 + uv.y * 8.0);\n    vec3 animatedTint = clamp(tint + vec3(0.08, -0.04, 0.1) * (shimmer - 0.5), 0.0, 1.0);\n    vec3 engraved = mix(vec3(0.16), animatedTint, relief);\n    vec3 paper = vec3(0.97);\n    vec3 result = mix(paper, engraved, mask + 0.22);\n    return vec4(clamp(result, 0.0, 1.0), 1.0);\n}",
    "uniformValues": {
      "radius": 1.6,
      "depth": 1.15,
      "tint": [
        0.78,
        0.82,
        0.88
      ]
    }
  },
  {
    "id": "default_halftone_temple",
    "name": "Halftone Temple",
    "template": "stage",
    "group": "Graphic",
    "description": "Turns the illustration into offset print dots, which works especially well on white backgrounds.",
    "code": "// NAME: Halftone Temple\nuniform float scale; // @min 30.0 @max 220.0 @default 92.0\nuniform float softness; // @min 0.01 @max 0.35 @default 0.12\nuniform vec3 dotColor; // @default 0.06,0.06,0.09\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    float phase = time * 0.7;\n    float animatedScale = scale * (0.94 + 0.06 * sin(phase + uv.y * 4.0));\n    vec2 wave = (vec2(\n        node_noise(uv * 2.2 + vec2(phase * 0.18, -phase * 0.14)),\n        node_noise(uv * 2.2 + vec2(-phase * 0.16, phase * 0.12) + 5.0)\n    ) - 0.5) * 0.035;\n    vec2 grid = (uv + wave) * animatedScale;\n    vec2 cell = fract(grid) - 0.5;\n    float angle = 0.35 + sin(phase * 0.8) * 0.12;\n    vec2 rotatedCell = vec2(\n        cell.x * cos(angle) - cell.y * sin(angle),\n        cell.x * sin(angle) + cell.y * cos(angle)\n    );\n\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    float radius = mix(0.46, 0.06, lum) * (0.94 + 0.06 * sin(phase + wave.x * 40.0));\n    float dotMask = 1.0 - smoothstep(radius, radius + softness, length(rotatedCell));\n    vec3 animatedDotColor = clamp(\n        dotColor + vec3(\n            sin(phase + uv.x * 6.0),\n            sin(phase * 1.1 + uv.y * 5.0 + 2.1),\n            sin(phase * 1.2 + uv.x * 4.0 + 4.2)\n        ) * 0.05,\n        0.0,\n        1.0\n    );\n    vec3 result = mix(vec3(1.0), animatedDotColor, dotMask);\n    return vec4(mix(source.rgb, result, 0.9), source.a);\n}",
    "uniformValues": {
      "scale": 92,
      "softness": 0.12,
      "dotColor": [
        0.06,
        0.06,
        0.09
      ]
    }
  },
  {
    "id": "default_pixel_shrine",
    "name": "Pixel Shrine",
    "template": "stage",
    "group": "Graphic",
    "description": "Pixelates the image into shrine-like tiles while keeping contour contrast intact.",
    "code": "// NAME: Pixel Shrine\nuniform float cell; // @min 10.0 @max 240.0 @default 72.0\nuniform float split; // @min 0.0 @max 0.08 @default 0.015\nuniform float monochromeMix; // @min 0.0 @max 1.0 @default 0.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    float wobble = node_noise(uv * 3.0 + time * 0.15);\n    float animatedCell = cell * (0.96 + 0.04 * sin(time * 0.8 + uv.y * 5.0));\n    vec2 gridOffset = (vec2(\n        node_noise(uv * 2.5 + vec2(time * 0.10, -time * 0.08)),\n        node_noise(uv * 2.5 + vec2(-time * 0.12, time * 0.09) + 1.6)\n    ) - 0.5) / max(animatedCell, 1.0);\n    vec2 quantized = (floor((uv + gridOffset) * animatedCell) + 0.5) / animatedCell;\n    vec2 offset = vec2(split / max(animatedCell, 1.0), 0.0) * (0.8 + wobble * 0.6);\n    vec4 center = texture2D(tex, quantized);\n    vec4 red = texture2D(tex, clamp(quantized + offset, 0.0, 1.0));\n    vec4 blue = texture2D(tex, clamp(quantized - offset, 0.0, 1.0));\n\n    vec3 splitColor = vec3(red.r, center.g, blue.b);\n    vec3 mono = vec3(dot(center.rgb, vec3(0.299, 0.587, 0.114)));\n    vec3 psychedelicTint = vec3(\n        0.5 + 0.5 * sin(time * 0.9 + wobble * 6.28318),\n        0.5 + 0.5 * sin(time * 1.1 + wobble * 6.28318 + 2.1),\n        0.5 + 0.5 * sin(time * 1.3 + wobble * 6.28318 + 4.2)\n    );\n    vec3 colorized = mix(splitColor, splitColor * psychedelicTint, 0.22);\n    vec3 result = mix(colorized, mono, step(0.5, monochromeMix));\n    return vec4(result, center.a);\n}",
    "uniformValues": {
      "cell": 72,
      "split": 0.015,
      "monochromeMix": 0
    }
  },
  {
    "id": "default_solar_outline",
    "name": "Solar Outline",
    "template": "stage",
    "group": "Graphic",
    "description": "Detects contour edges and wraps them with warm solar highlights.",
    "code": "// NAME: Solar Outline\nuniform float edgeWidth; // @min 0.5 @max 4.0 @default 1.2\nuniform vec3 outline; // @default 1.0,0.58,0.15\nuniform float fill; // @min 0.0 @max 1.0 @default 0.22\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 drift = (vec2(\n        node_noise(uv * 3.2 + vec2(time * 0.10, -time * 0.08)),\n        node_noise(uv * 3.2 + vec2(-time * 0.07, time * 0.11) + 2.5)\n    ) - 0.5) * 0.35;\n    vec2 px = (edgeWidth + drift) / max(resolution, vec2(1.0));\n    float left = dot(texture2D(tex, uv - vec2(px.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));\n    float right = dot(texture2D(tex, uv + vec2(px.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));\n    float up = dot(texture2D(tex, uv - vec2(0.0, px.y)).rgb, vec3(0.299, 0.587, 0.114));\n    float down = dot(texture2D(tex, uv + vec2(0.0, px.y)).rgb, vec3(0.299, 0.587, 0.114));\n    float base = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n\n    float edge = clamp(length(vec2(right - left, down - up)) * 4.5, 0.0, 1.0);\n    float ink = 1.0 - smoothstep(0.72, 0.95, base);\n    float flare = 0.82 + 0.18 * sin(time * 1.0 + uv.x * 10.0);\n    vec3 animatedOutline = clamp(\n        outline + vec3(\n            sin(time * 0.9),\n            sin(time * 1.1 + 2.0),\n            sin(time * 1.3 + 4.0)\n        ) * 0.06,\n        0.0,\n        1.0\n    );\n    vec3 result = mix(vec3(base), animatedOutline * flare, clamp(edge + ink * fill, 0.0, 1.0));\n    return vec4(result, 1.0);\n}",
    "uniformValues": {
      "edgeWidth": 1.2,
      "outline": [
        1,
        0.58,
        0.15
      ],
      "fill": 0.22
    }
  },
  {
    "id": "default_marble_drift",
    "name": "Marble Drift",
    "template": "stage",
    "group": "Motion",
    "description": "Warps the line work through slow marbled noise, useful for ceremonial or fluid visuals.",
    "code": "// NAME: Marble Drift\nuniform float distortion; // @min 0.0 @max 0.08 @default 0.028\nuniform float scale; // @min 1.0 @max 18.0 @default 6.0\nuniform vec3 tint; // @default 0.42,0.72,1.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    float nx = node_noise(uv * scale + vec2(time * 0.24, time * 0.12));\n    float ny = node_noise(uv * scale + vec2(7.0 - time * 0.18, 3.0 + time * 0.15));\n    vec2 sampleUv = clamp(uv + (vec2(nx, ny) - 0.5) * distortion, 0.0, 1.0);\n    vec4 source = texture2D(tex, sampleUv);\n    float ink = 1.0 - smoothstep(0.72, 0.95, dot(source.rgb, vec3(0.299, 0.587, 0.114)));\n    vec3 haze = tint * (0.18 + 0.82 * node_noise(sampleUv * scale * 1.35 + time * 0.1));\n    vec3 result = mix(source.rgb, haze, ink * 0.72);\n    return vec4(result, source.a);\n}",
    "uniformValues": {
      "distortion": 0.028,
      "scale": 6,
      "tint": [
        0.42,
        0.72,
        1
      ]
    }
  },
  {
    "id": "default_noise_mirage",
    "name": "Noise Mirage",
    "template": "stage",
    "group": "Motion",
    "description": "Uses soft procedural displacement to make still line art feel alive and atmospheric.",
    "code": "// NAME: Noise Mirage\nuniform float amount; // @min 0.0 @max 0.06 @default 0.02\nuniform float speed; // @min 0.0 @max 3.0 @default 0.7\nuniform float scale; // @min 1.0 @max 18.0 @default 9.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    float nx = node_noise(uv * scale + vec2(time * speed * 0.25, 0.0));\n    float ny = node_noise(uv * scale * 1.3 + vec2(3.7, -time * speed * 0.22));\n    vec2 offset = (vec2(nx, ny) - 0.5) * amount;\n    vec2 sampleUv = clamp(uv + offset, 0.0, 1.0);\n    return texture2D(tex, sampleUv);\n}",
    "uniformValues": {
      "amount": 0.02,
      "speed": 0.7,
      "scale": 9
    }
  },
  {
    "id": "default_oracle_ripple",
    "name": "Oracle Ripple",
    "template": "stage",
    "group": "Motion",
    "description": "Adds circular breathing waves from the center without destroying the line structure.",
    "code": "// NAME: Oracle Ripple\nuniform float amplitude; // @min 0.0 @max 0.08 @default 0.018\nuniform float frequency; // @min 0.5 @max 18.0 @default 6.0\nuniform float speed; // @min 0.0 @max 4.0 @default 1.2\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 p = uv - 0.5;\n    float radius = length(p);\n    vec2 dir = normalize(p + vec2(0.0001));\n    float wave = sin(radius * frequency * 6.28318 - time * speed * 2.0);\n    vec2 offset = dir * wave * amplitude * (0.2 + 0.8 * (1.0 - radius));\n    vec2 sampleUv = clamp(uv + offset, 0.0, 1.0);\n    return texture2D(tex, sampleUv);\n}",
    "uniformValues": {
      "amplitude": 0.018,
      "frequency": 6,
      "speed": 1.2
    }
  },
  {
    "id": "default_pixelsort",
    "name": "Pixel Sort Drift",
    "template": "stage",
    "group": "Motion",
    "description": "A horizontal drift that sorts dark contour fragments into soft glitches.",
    "code": "// NAME: Pixel Sort Drift\nuniform float drift; // @min 0.0 @max 0.15 @default 0.04\nuniform float speed; // @min 0.1 @max 3.0 @default 1.0\nuniform vec3 tint; // @default 0.1,0.4,0.8\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    float t = time * speed;\n    vec4 col = texture2D(tex, uv);\n    float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));\n    float lineMask = smoothstep(0.6, 0.1, lum);\n\n    float wave = sin(uv.y * 36.0 + t * 2.6) * 0.5 + 0.5;\n    float offsetA = lineMask * drift * sin(t * 1.8 + uv.y * 18.0) * wave;\n    float offsetB = lineMask * drift * 0.6 * cos(t * 1.4 + uv.y * 12.0);\n\n    vec4 shiftedA = texture2D(tex, vec2(uv.x + offsetA, uv.y));\n    vec4 shiftedB = texture2D(tex, vec2(uv.x - offsetB, uv.y));\n    float shiftedLumA = dot(shiftedA.rgb, vec3(0.299, 0.587, 0.114));\n    float shiftedLumB = dot(shiftedB.rgb, vec3(0.299, 0.587, 0.114));\n    float shiftedMaskA = smoothstep(0.6, 0.1, shiftedLumA);\n    float shiftedMaskB = smoothstep(0.6, 0.1, shiftedLumB);\n\n    float combinedMask = max(lineMask, max(shiftedMaskA * 0.6, shiftedMaskB * 0.45));\n    vec3 lineColor = tint * (1.0 - combinedMask * 0.3);\n    vec3 result = mix(vec3(1.0), lineColor, combinedMask);\n    return vec4(result, col.a);\n}",
    "uniformValues": {
      "drift": 0.04,
      "speed": 1,
      "tint": [
        0.1,
        0.4,
        0.8
      ]
    }
  },
  {
    "id": "default_scanline_apparition",
    "name": "Scanline Apparition",
    "template": "stage",
    "group": "Motion",
    "description": "Adds drifting CRT-style scanlines that suit monochrome illustration surprisingly well.",
    "code": "// NAME: Scanline Apparition\nuniform float density; // @min 40.0 @max 600.0 @default 220.0\nuniform float drift; // @min 0.0 @max 0.08 @default 0.012\nuniform float speed; // @min 0.0 @max 4.0 @default 1.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 warped = uv + vec2(sin(uv.y * density * 0.05 + time * speed) * drift, 0.0);\n    vec4 source = texture2D(tex, clamp(warped, 0.0, 1.0));\n    float lines = 0.82 + 0.18 * sin(uv.y * density - time * speed * 6.0);\n    return vec4(source.rgb * lines, source.a);\n}",
    "uniformValues": {
      "density": 220,
      "drift": 0.012,
      "speed": 1
    }
  },
  {
    "id": "default_strobe_contour",
    "name": "Strobe Contour",
    "template": "stage",
    "group": "Motion",
    "description": "Turns dark line density into a rhythmic strobe palette for energetic projection looks.",
    "code": "// NAME: Strobe Contour\nuniform float speed; // @min 0.0 @max 5.0 @default 1.2\nuniform float contrast; // @min 0.4 @max 2.0 @default 1.25\nuniform vec3 strobeColor; // @default 0.92,0.16,0.44\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    float ink = pow(1.0 - lum, contrast);\n    float strobe = step(0.5, fract(time * speed * 0.5 + ink * 0.65));\n    vec3 lineColor = mix(vec3(0.05), strobeColor, strobe);\n    vec3 result = mix(vec3(1.0), lineColor, ink);\n    return vec4(result, source.a);\n}",
    "uniformValues": {
      "speed": 1.2,
      "contrast": 1.25,
      "strobeColor": [
        0.92,
        0.16,
        0.44
      ]
    }
  },
  {
    "id": "timeline-028ae0af-527c-47b0-a05b-09f05b35e9d9",
    "name": "1Customizable Multiverse Aliens (Random Saccade Edition)",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 1Customizable Multiverse Aliens (Random Saccade Edition)\nuniform float lightHeight; // @min 0.01 @max 1.0 @default 0.5\nuniform float lightIntensity; // @min 0.0 @max 10.0 @default 4.5\nuniform float ambient; // @min 0.0 @max 1.0 @default 0.1\nuniform float shininess; // @min 1.0 @max 200.0 @default 120.0\nuniform float detail; // @min 0.1 @max 10.0 @default 5.0\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float colorSpeed; // @min 0.0 @max 5.0 @default 0.8\nuniform float alienCount; // @min 1.0 @max 5.0 @default 1.0\nuniform float alienSpread; // @min 0.5 @max 4.0 @default 2.0\nuniform float alienSize; // @min 0.1 @max 3.0 @default 1.2\nuniform float moveX; // @min -5.0 @max 5.0 @default 0.0\nuniform float moveY; // @min -5.0 @max 5.0 @default 0.0\nuniform float irisSize; // @min 0.2 @max 0.8 @default 0.45\nuniform float pupilSize; // @min 0.1 @max 0.5 @default 0.2\nuniform float eyeDilation; // @min 0.5 @max 1.5 @default 1.0\nuniform float veinIntensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float lookDownAmount; // @min 0.0 @max 1.5 @default 0.6\nuniform float lookSideAmount; // @min 0.0 @max 1.5 @default 0.8\nuniform float freneticSpeed; // @min 0.0 @max 60.0 @default 35.0\nuniform float twitchIntensity; // @min 0.0 @max 0.5 @default 0.15\nmat2 rot(float a) {\nfloat s = sin(a), c = cos(a);\nreturn mat2(c, -s, s, c);\n}\nfloat sdSphere(vec3 p, float s) {\nreturn length(p) - s;\n}\nfloat hash11(float p) {\np = fract(p * 0.1031);\np *= p + 33.33;\np *= p + p;\nreturn fract(p);\n}\nvec2 getEyeRotation(float t, float speed, float sideAmt, float downAmt, float twitch) {\nfloat dartRate = max(1.0, speed * 0.08);\nfloat seedTime = floor(t * dartRate);\nfloat smoothT = smoothstep(0.0, 0.2, fract(t * dartRate));\nfloat prevX = (hash11(seedTime * 12.34) - 0.5) * 2.0;\nfloat nextX = (hash11((seedTime + 1.0) * 12.34) - 0.5) * 2.0;\nfloat curX = mix(prevX, nextX, smoothT);\nfloat prevY = (hash11(seedTime * 45.67) - 0.5) * 2.0;\nfloat nextY = (hash11((seedTime + 1.0) * 45.67) - 0.5) * 2.0;\nfloat curY = mix(prevY, nextY, smoothT);\nfloat jX = sin(t * speed) * cos(t * speed * 0.61);\nfloat jY = cos(t * speed * 0.83) * sin(t * speed * 1.27);\nfloat finalX = (curX * sideAmt) + (jX * twitch);\nfloat finalY = (curY * downAmt) - (downAmt * 0.3) + (jY * twitch);\nreturn vec2(finalX, finalY);\n}\nvec2 singleAlien(vec3 p, float time, float idOffset) {\np /= alienSize;\np.y = -p.y;\nfloat t = time + idOffset;\np.xy *= rot(sin(t * 0.5) * 0.05);\nvec2 eyeRot = getEyeRotation(t, freneticSpeed, lookSideAmount, lookDownAmount, twitchIntensity);\np.xz *= rot(eyeRot.x);\np.yz *= rot(eyeRot.y);\nfloat d = sdSphere(p, 1.0);\nfloat mat = 0.0;\nvec3 normP = normalize(p);\nif (normP.z > 0.0) {\nfloat r = length(normP.xy);\nfloat pSize = pupilSize * (1.0 + sin(time * 2.0) * 0.05 * eyeDilation);\nif (r < pSize) {\nmat = 2.0;\n} else if (r < irisSize) {\nmat = 1.0;\n}\n}\nreturn vec2(d * alienSize, mat);\n}\nvec2 map(vec3 p, float time) {\nvec2 res = vec2(1e10, 0.0);\nfloat count = floor(alienCount);\nfor(int i = 0; i < 5; i++) {\nif (float(i) >= count) break;\nfloat xOffset = (float(i) - (count - 1.0) * 0.5) * alienSpread;\nvec3 objectPos = vec3(xOffset + moveX, moveY, 0.0);\nvec2 d = singleAlien(p - objectPos, time, float(i) * 4.0);\nif (d.x < res.x) res = d;\n}\nreturn res;\n}\nvec3 getNormal(vec3 p, float t) {\nvec2 e = vec2(0.001, 0.0);\nreturn normalize(vec3(\nmap(p + e.xyy, t).x - map(p - e.xyy, t).x,\nmap(p + e.yxy, t).x - map(p - e.yxy, t).x,\nmap(p + e.yyx, t).x - map(p - e.yyx, t).x\n));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 base = texture2D(tex, uv);\nfloat isNotBlack = smoothstep(blackThreshold, blackThreshold + 0.05, max(max(base.r, base.g), base.b));\nif (isNotBlack < 0.01) return vec4(0.0, 0.0, 0.0, base.a);\nvec2 p = (uv - 0.5) * 2.0;\np.x *= resolution.x / resolution.y;\nvec3 ro = vec3(0.0, 0.0, 4.0);\nvec3 rd = normalize(vec3(p, -3.5));\nfloat tDist = 0.0;\nvec2 res;\nfor(int i = 0; i < 64; i++) {\nres = map(ro + rd * tDist, time);\nif(res.x < 0.001 || tDist > 10.0) break;\ntDist += res.x;\n}\nif(res.x < 0.001) {\nvec3 pos = ro + rd * tDist;\nvec3 normal = getNormal(pos, time);\nvec3 viewDir = -rd;\nvec3 localPos = pos;\nfloat closestI = 0.0;\nfloat minDist = 100.0;\nfloat count = floor(alienCount);\nfor(int i = 0; i < 5; i++) {\nif (float(i) >= count) break;\nfloat xOffset = (float(i) - (count - 1.0) * 0.5) * alienSpread;\nvec3 objectPos = vec3(xOffset + moveX, moveY, 0.0);\nfloat d = length(pos - objectPos);\nif (d < minDist) { minDist = d; closestI = float(i); }\n}\nfloat xOff = (closestI - (count - 1.0) * 0.5) * alienSpread;\nlocalPos -= vec3(xOff + moveX, moveY, 0.0);\nlocalPos /= alienSize;\nlocalPos.y = -localPos.y;\nfloat t_loc = time + closestI * 4.0;\nlocalPos.xy *= rot(sin(t_loc * 0.5) * 0.05);\nvec2 eyeRot = getEyeRotation(t_loc, freneticSpeed, lookSideAmount, lookDownAmount, twitchIntensity);\nlocalPos.xz *= rot(eyeRot.x);\nlocalPos.yz *= rot(eyeRot.y);\nvec3 localNorm = normalize(localPos);\nfloat r = length(localNorm.xy);\nfloat angle = atan(localNorm.y, localNorm.x);\nvec3 lp = vec3(2.0 * sin(time), 3.0, 5.0 * lightHeight);\nvec3 lDir = normalize(lp - pos);\nvec3 col = vec3(0.92, 0.88, 0.88);\nif (res.y == 0.0) {\nfloat warp1 = sin(localNorm.z * 15.0) * 0.15 + cos(localNorm.z * 25.0) * 0.05;\nfloat warp2 = cos(localNorm.z * 20.0) * 0.25 - sin(localNorm.z * 40.0) * 0.1;\nfloat mainVeins = sin((angle + warp1) * 12.0);\nmainVeins = smoothstep(0.95, 1.0, mainVeins);\nfloat secVeins = sin((angle + warp2) * 26.0);\nsecVeins = smoothstep(0.98, 1.0, secVeins);\nfloat veinMask = max(mainVeins, secVeins * 0.6);\nfloat breakup = smoothstep(0.0, 0.5, sin(localNorm.z * 50.0 + angle * 5.0) * 0.5 + 0.5);\nveinMask *= mix(0.4, 1.0, breakup);\nfloat veinFade = smoothstep(irisSize - 0.02, irisSize + 0.5, r);\nvec3 bloodCol = vec3(0.7, 0.05, 0.05);\ncol = mix(col, bloodCol, veinMask * veinFade * veinIntensity);\n} else if (res.y == 1.0) {\nfloat f = abs(sin(angle * 20.0 + detail));\nvec3 irisCol = vec3(0.2, 0.4, 0.8);\nirisCol += 0.5 * sin(vec3(0.0, 1.0, 2.0) + time * colorSpeed);\ncol = mix(irisCol * 0.5, irisCol, f);\ncol *= smoothstep(irisSize, irisSize - 0.05, r);\n} else if (res.y == 2.0) {\ncol = vec3(0.02);\n}\nfloat diff = max(dot(normal, lDir), 0.0);\nfloat spec = pow(max(dot(normal, normalize(lDir + viewDir)), 0.0), shininess);\nfloat glint = pow(max(dot(normal, normalize(vec3(1.0, 1.0, 1.0))), 0.0), 300.0) * 2.0;\nvec3 finalCol = col * (ambient + diff * lightIntensity * 0.5);\nfinalCol += (spec + glint) * lightIntensity * 0.3;\nreturn vec4(finalCol * isNotBlack, base.a);\n}\nreturn vec4(0.0, 0.0, 0.0, base.a);\n}",
    "uniformValues": {
      "lightHeight": 0.5,
      "lightIntensity": 4.5,
      "ambient": 0.56,
      "shininess": 120,
      "detail": 5,
      "blackThreshold": 0.05,
      "colorSpeed": 0.8,
      "alienCount": 1,
      "alienSpread": 1.41,
      "alienSize": 0.912,
      "moveX": 0,
      "moveY": -0.1,
      "irisSize": 0.632,
      "pupilSize": 0.5,
      "eyeDilation": 0.65,
      "veinIntensity": 0.57,
      "lookDownAmount": 0.225,
      "lookSideAmount": 0.405,
      "freneticSpeed": 45.6,
      "twitchIntensity": 0.04
    }
  },
  {
    "id": "timeline-323c5cf4-499c-40b6-a885-dd7e0e7df5d7",
    "name": "1sxCustomizable Multiverse Aliens (Random Saccade Edition)",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 1sxCustomizable Multiverse Aliens (Random Saccade Edition)\nuniform float lightHeight; // @min 0.01 @max 1.0 @default 0.5\nuniform float lightIntensity; // @min 0.0 @max 10.0 @default 4.5\nuniform float ambient; // @min 0.0 @max 1.0 @default 0.1\nuniform float shininess; // @min 1.0 @max 200.0 @default 120.0\nuniform float detail; // @min 0.1 @max 10.0 @default 5.0\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float colorSpeed; // @min 0.0 @max 5.0 @default 0.8\nuniform float alienCount; // @min 1.0 @max 5.0 @default 1.0\nuniform float alienSpread; // @min 0.5 @max 4.0 @default 2.0\nuniform float alienSize; // @min 0.1 @max 3.0 @default 1.2\nuniform float moveX; // @min -5.0 @max 5.0 @default 0.0\nuniform float moveY; // @min -5.0 @max 5.0 @default 0.0\nuniform float irisSize; // @min 0.2 @max 0.8 @default 0.45\nuniform float pupilSize; // @min 0.1 @max 0.5 @default 0.2\nuniform float eyeDilation; // @min 0.5 @max 1.5 @default 1.0\nuniform float veinIntensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float lookDownAmount; // @min 0.0 @max 1.5 @default 0.6\nuniform float lookSideAmount; // @min 0.0 @max 1.5 @default 0.8\nuniform float freneticSpeed; // @min 0.0 @max 60.0 @default 35.0\nuniform float twitchIntensity; // @min 0.0 @max 0.5 @default 0.15\nmat2 rot(float a) {\nfloat s = sin(a), c = cos(a);\nreturn mat2(c, -s, s, c);\n}\nfloat sdSphere(vec3 p, float s) {\nreturn length(p) - s;\n}\nfloat hash11(float p) {\np = fract(p * 0.1031);\np *= p + 33.33;\np *= p + p;\nreturn fract(p);\n}\nvec2 getEyeRotation(float t, float speed, float sideAmt, float downAmt, float twitch) {\nfloat dartRate = max(1.0, speed * 0.08);\nfloat seedTime = floor(t * dartRate);\nfloat smoothT = smoothstep(0.0, 0.2, fract(t * dartRate));\nfloat prevX = (hash11(seedTime * 12.34) - 0.5) * 2.0;\nfloat nextX = (hash11((seedTime + 1.0) * 12.34) - 0.5) * 2.0;\nfloat curX = mix(prevX, nextX, smoothT);\nfloat prevY = (hash11(seedTime * 45.67) - 0.5) * 2.0;\nfloat nextY = (hash11((seedTime + 1.0) * 45.67) - 0.5) * 2.0;\nfloat curY = mix(prevY, nextY, smoothT);\nfloat jX = sin(t * speed) * cos(t * speed * 0.61);\nfloat jY = cos(t * speed * 0.83) * sin(t * speed * 1.27);\nfloat finalX = (curX * sideAmt) + (jX * twitch);\nfloat finalY = (curY * downAmt) - (downAmt * 0.3) + (jY * twitch);\nreturn vec2(finalX, finalY);\n}\nvec2 singleAlien(vec3 p, float time, float idOffset) {\np /= alienSize;\np.y = -p.y;\nfloat t = time + idOffset;\np.xy *= rot(sin(t * 0.5) * 0.05);\nvec2 eyeRot = getEyeRotation(t, freneticSpeed, lookSideAmount, lookDownAmount, twitchIntensity);\np.xz *= rot(eyeRot.x);\np.yz *= rot(eyeRot.y);\nfloat d = sdSphere(p, 1.0);\nfloat mat = 0.0;\nvec3 normP = normalize(p);\nif (normP.z > 0.0) {\nfloat r = length(normP.xy);\nfloat pSize = pupilSize * (1.0 + sin(time * 2.0) * 0.05 * eyeDilation);\nif (r < pSize) {\nmat = 2.0;\n} else if (r < irisSize) {\nmat = 1.0;\n}\n}\nreturn vec2(d * alienSize, mat);\n}\nvec2 map(vec3 p, float time) {\nvec2 res = vec2(1e10, 0.0);\nfloat count = floor(alienCount);\nfor(int i = 0; i < 5; i++) {\nif (float(i) >= count) break;\nfloat xOffset = (float(i) - (count - 1.0) * 0.5) * alienSpread;\nvec3 objectPos = vec3(xOffset + moveX, moveY, 0.0);\nvec2 d = singleAlien(p - objectPos, time, float(i) * 4.0);\nif (d.x < res.x) res = d;\n}\nreturn res;\n}\nvec3 getNormal(vec3 p, float t) {\nvec2 e = vec2(0.001, 0.0);\nreturn normalize(vec3(\nmap(p + e.xyy, t).x - map(p - e.xyy, t).x,\nmap(p + e.yxy, t).x - map(p - e.yxy, t).x,\nmap(p + e.yyx, t).x - map(p - e.yyx, t).x\n));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 base = texture2D(tex, uv);\nfloat isNotBlack = smoothstep(blackThreshold, blackThreshold + 0.05, max(max(base.r, base.g), base.b));\nif (isNotBlack < 0.01) return vec4(0.0, 0.0, 0.0, base.a);\nvec2 p = (uv - 0.5) * 2.0;\np.x *= resolution.x / resolution.y;\nvec3 ro = vec3(0.0, 0.0, 4.0);\nvec3 rd = normalize(vec3(p, -3.5));\nfloat tDist = 0.0;\nvec2 res;\nfor(int i = 0; i < 64; i++) {\nres = map(ro + rd * tDist, time);\nif(res.x < 0.001 || tDist > 10.0) break;\ntDist += res.x;\n}\nif(res.x < 0.001) {\nvec3 pos = ro + rd * tDist;\nvec3 normal = getNormal(pos, time);\nvec3 viewDir = -rd;\nvec3 localPos = pos;\nfloat closestI = 0.0;\nfloat minDist = 100.0;\nfloat count = floor(alienCount);\nfor(int i = 0; i < 5; i++) {\nif (float(i) >= count) break;\nfloat xOffset = (float(i) - (count - 1.0) * 0.5) * alienSpread;\nvec3 objectPos = vec3(xOffset + moveX, moveY, 0.0);\nfloat d = length(pos - objectPos);\nif (d < minDist) { minDist = d; closestI = float(i); }\n}\nfloat xOff = (closestI - (count - 1.0) * 0.5) * alienSpread;\nlocalPos -= vec3(xOff + moveX, moveY, 0.0);\nlocalPos /= alienSize;\nlocalPos.y = -localPos.y;\nfloat t_loc = time + closestI * 4.0;\nlocalPos.xy *= rot(sin(t_loc * 0.5) * 0.05);\nvec2 eyeRot = getEyeRotation(t_loc, freneticSpeed, lookSideAmount, lookDownAmount, twitchIntensity);\nlocalPos.xz *= rot(eyeRot.x);\nlocalPos.yz *= rot(eyeRot.y);\nvec3 localNorm = normalize(localPos);\nfloat r = length(localNorm.xy);\nfloat angle = atan(localNorm.y, localNorm.x);\nvec3 lp = vec3(2.0 * sin(time), 3.0, 5.0 * lightHeight);\nvec3 lDir = normalize(lp - pos);\nvec3 col = vec3(0.92, 0.88, 0.88);\nif (res.y == 0.0) {\nfloat warp1 = sin(localNorm.z * 15.0) * 0.15 + cos(localNorm.z * 25.0) * 0.05;\nfloat warp2 = cos(localNorm.z * 20.0) * 0.25 - sin(localNorm.z * 40.0) * 0.1;\nfloat mainVeins = sin((angle + warp1) * 12.0);\nmainVeins = smoothstep(0.95, 1.0, mainVeins);\nfloat secVeins = sin((angle + warp2) * 26.0);\nsecVeins = smoothstep(0.98, 1.0, secVeins);\nfloat veinMask = max(mainVeins, secVeins * 0.6);\nfloat breakup = smoothstep(0.0, 0.5, sin(localNorm.z * 50.0 + angle * 5.0) * 0.5 + 0.5);\nveinMask *= mix(0.4, 1.0, breakup);\nfloat veinFade = smoothstep(irisSize - 0.02, irisSize + 0.5, r);\nvec3 bloodCol = vec3(0.7, 0.05, 0.05);\ncol = mix(col, bloodCol, veinMask * veinFade * veinIntensity);\n} else if (res.y == 1.0) {\nfloat f = abs(sin(angle * 20.0 + detail));\nvec3 irisCol = vec3(0.2, 0.4, 0.8);\nirisCol += 0.5 * sin(vec3(0.0, 1.0, 2.0) + time * colorSpeed);\ncol = mix(irisCol * 0.5, irisCol, f);\ncol *= smoothstep(irisSize, irisSize - 0.05, r);\n} else if (res.y == 2.0) {\ncol = vec3(0.02);\n}\nfloat diff = max(dot(normal, lDir), 0.0);\nfloat spec = pow(max(dot(normal, normalize(lDir + viewDir)), 0.0), shininess);\nfloat glint = pow(max(dot(normal, normalize(vec3(1.0, 1.0, 1.0))), 0.0), 300.0) * 2.0;\nvec3 finalCol = col * (ambient + diff * lightIntensity * 0.5);\nfinalCol += (spec + glint) * lightIntensity * 0.3;\nreturn vec4(finalCol * isNotBlack, base.a);\n}\nreturn vec4(0.0, 0.0, 0.0, base.a);\n}",
    "uniformValues": {
      "lightHeight": 0.5,
      "lightIntensity": 4.5,
      "ambient": 0.56,
      "shininess": 120,
      "detail": 5,
      "blackThreshold": 0.05,
      "colorSpeed": 0.8,
      "alienCount": 1,
      "alienSpread": 1.41,
      "alienSize": 0.912,
      "moveX": -1.4,
      "moveY": -0.1,
      "irisSize": 0.584,
      "pupilSize": 0.372,
      "eyeDilation": 1.31,
      "veinIntensity": 0.57,
      "lookDownAmount": 0.225,
      "lookSideAmount": 0.405,
      "freneticSpeed": 60,
      "twitchIntensity": 0
    }
  },
  {
    "id": "timeline-480590bd-7280-4261-9f84-ab75162e3d6a",
    "name": "3Customizable Multiverse Aliens (Random Saccade Edition)",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3Customizable Multiverse Aliens (Random Saccade Edition)\nuniform float lightHeight; // @min 0.01 @max 1.0 @default 0.5\nuniform float lightIntensity; // @min 0.0 @max 10.0 @default 4.5\nuniform float ambient; // @min 0.0 @max 1.0 @default 0.1\nuniform float shininess; // @min 1.0 @max 200.0 @default 120.0\nuniform float detail; // @min 0.1 @max 10.0 @default 5.0\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float colorSpeed; // @min 0.0 @max 5.0 @default 0.8\nuniform float alienCount; // @min 1.0 @max 5.0 @default 1.0\nuniform float alienSpread; // @min 0.5 @max 4.0 @default 2.0\nuniform float alienSize; // @min 0.1 @max 3.0 @default 1.2\nuniform float moveX; // @min -5.0 @max 5.0 @default 0.0\nuniform float moveY; // @min -5.0 @max 5.0 @default 0.0\nuniform float irisSize; // @min 0.2 @max 0.8 @default 0.45\nuniform float pupilSize; // @min 0.1 @max 0.5 @default 0.2\nuniform float eyeDilation; // @min 0.5 @max 1.5 @default 1.0\nuniform float veinIntensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float lookDownAmount; // @min 0.0 @max 1.5 @default 0.6\nuniform float lookSideAmount; // @min 0.0 @max 1.5 @default 0.8\nuniform float freneticSpeed; // @min 0.0 @max 60.0 @default 35.0\nuniform float twitchIntensity; // @min 0.0 @max 0.5 @default 0.15\nmat2 rot(float a) {\nfloat s = sin(a), c = cos(a);\nreturn mat2(c, -s, s, c);\n}\nfloat sdSphere(vec3 p, float s) {\nreturn length(p) - s;\n}\nfloat hash11(float p) {\np = fract(p * 0.1031);\np *= p + 33.33;\np *= p + p;\nreturn fract(p);\n}\nvec2 getEyeRotation(float t, float speed, float sideAmt, float downAmt, float twitch) {\nfloat dartRate = max(1.0, speed * 0.08);\nfloat seedTime = floor(t * dartRate);\nfloat smoothT = smoothstep(0.0, 0.2, fract(t * dartRate));\nfloat prevX = (hash11(seedTime * 12.34) - 0.5) * 2.0;\nfloat nextX = (hash11((seedTime + 1.0) * 12.34) - 0.5) * 2.0;\nfloat curX = mix(prevX, nextX, smoothT);\nfloat prevY = (hash11(seedTime * 45.67) - 0.5) * 2.0;\nfloat nextY = (hash11((seedTime + 1.0) * 45.67) - 0.5) * 2.0;\nfloat curY = mix(prevY, nextY, smoothT);\nfloat jX = sin(t * speed) * cos(t * speed * 0.61);\nfloat jY = cos(t * speed * 0.83) * sin(t * speed * 1.27);\nfloat finalX = (curX * sideAmt) + (jX * twitch);\nfloat finalY = (curY * downAmt) - (downAmt * 0.3) + (jY * twitch);\nreturn vec2(finalX, finalY);\n}\nvec2 singleAlien(vec3 p, float time, float idOffset) {\np /= alienSize;\np.y = -p.y;\nfloat t = time + idOffset;\np.xy *= rot(sin(t * 0.5) * 0.05);\nvec2 eyeRot = getEyeRotation(t, freneticSpeed, lookSideAmount, lookDownAmount, twitchIntensity);\np.xz *= rot(eyeRot.x);\np.yz *= rot(eyeRot.y);\nfloat d = sdSphere(p, 1.0);\nfloat mat = 0.0;\nvec3 normP = normalize(p);\nif (normP.z > 0.0) {\nfloat r = length(normP.xy);\nfloat pSize = pupilSize * (1.0 + sin(time * 2.0) * 0.05 * eyeDilation);\nif (r < pSize) {\nmat = 2.0;\n} else if (r < irisSize) {\nmat = 1.0;\n}\n}\nreturn vec2(d * alienSize, mat);\n}\nvec2 map(vec3 p, float time) {\nvec2 res = vec2(1e10, 0.0);\nfloat count = floor(alienCount);\nfor(int i = 0; i < 5; i++) {\nif (float(i) >= count) break;\nfloat xOffset = (float(i) - (count - 1.0) * 0.5) * alienSpread;\nvec3 objectPos = vec3(xOffset + moveX, moveY, 0.0);\nvec2 d = singleAlien(p - objectPos, time, float(i) * 4.0);\nif (d.x < res.x) res = d;\n}\nreturn res;\n}\nvec3 getNormal(vec3 p, float t) {\nvec2 e = vec2(0.001, 0.0);\nreturn normalize(vec3(\nmap(p + e.xyy, t).x - map(p - e.xyy, t).x,\nmap(p + e.yxy, t).x - map(p - e.yxy, t).x,\nmap(p + e.yyx, t).x - map(p - e.yyx, t).x\n));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 base = texture2D(tex, uv);\nfloat isNotBlack = smoothstep(blackThreshold, blackThreshold + 0.05, max(max(base.r, base.g), base.b));\nif (isNotBlack < 0.01) return vec4(0.0, 0.0, 0.0, base.a);\nvec2 p = (uv - 0.5) * 2.0;\np.x *= resolution.x / resolution.y;\nvec3 ro = vec3(0.0, 0.0, 4.0);\nvec3 rd = normalize(vec3(p, -3.5));\nfloat tDist = 0.0;\nvec2 res;\nfor(int i = 0; i < 64; i++) {\nres = map(ro + rd * tDist, time);\nif(res.x < 0.001 || tDist > 10.0) break;\ntDist += res.x;\n}\nif(res.x < 0.001) {\nvec3 pos = ro + rd * tDist;\nvec3 normal = getNormal(pos, time);\nvec3 viewDir = -rd;\nvec3 localPos = pos;\nfloat closestI = 0.0;\nfloat minDist = 100.0;\nfloat count = floor(alienCount);\nfor(int i = 0; i < 5; i++) {\nif (float(i) >= count) break;\nfloat xOffset = (float(i) - (count - 1.0) * 0.5) * alienSpread;\nvec3 objectPos = vec3(xOffset + moveX, moveY, 0.0);\nfloat d = length(pos - objectPos);\nif (d < minDist) { minDist = d; closestI = float(i); }\n}\nfloat xOff = (closestI - (count - 1.0) * 0.5) * alienSpread;\nlocalPos -= vec3(xOff + moveX, moveY, 0.0);\nlocalPos /= alienSize;\nlocalPos.y = -localPos.y;\nfloat t_loc = time + closestI * 4.0;\nlocalPos.xy *= rot(sin(t_loc * 0.5) * 0.05);\nvec2 eyeRot = getEyeRotation(t_loc, freneticSpeed, lookSideAmount, lookDownAmount, twitchIntensity);\nlocalPos.xz *= rot(eyeRot.x);\nlocalPos.yz *= rot(eyeRot.y);\nvec3 localNorm = normalize(localPos);\nfloat r = length(localNorm.xy);\nfloat angle = atan(localNorm.y, localNorm.x);\nvec3 lp = vec3(2.0 * sin(time), 3.0, 5.0 * lightHeight);\nvec3 lDir = normalize(lp - pos);\nvec3 col = vec3(0.92, 0.88, 0.88);\nif (res.y == 0.0) {\nfloat warp1 = sin(localNorm.z * 15.0) * 0.15 + cos(localNorm.z * 25.0) * 0.05;\nfloat warp2 = cos(localNorm.z * 20.0) * 0.25 - sin(localNorm.z * 40.0) * 0.1;\nfloat mainVeins = sin((angle + warp1) * 12.0);\nmainVeins = smoothstep(0.95, 1.0, mainVeins);\nfloat secVeins = sin((angle + warp2) * 26.0);\nsecVeins = smoothstep(0.98, 1.0, secVeins);\nfloat veinMask = max(mainVeins, secVeins * 0.6);\nfloat breakup = smoothstep(0.0, 0.5, sin(localNorm.z * 50.0 + angle * 5.0) * 0.5 + 0.5);\nveinMask *= mix(0.4, 1.0, breakup);\nfloat veinFade = smoothstep(irisSize - 0.02, irisSize + 0.5, r);\nvec3 bloodCol = vec3(0.7, 0.05, 0.05);\ncol = mix(col, bloodCol, veinMask * veinFade * veinIntensity);\n} else if (res.y == 1.0) {\nfloat f = abs(sin(angle * 20.0 + detail));\nvec3 irisCol = vec3(0.2, 0.4, 0.8);\nirisCol += 0.5 * sin(vec3(0.0, 1.0, 2.0) + time * colorSpeed);\ncol = mix(irisCol * 0.5, irisCol, f);\ncol *= smoothstep(irisSize, irisSize - 0.05, r);\n} else if (res.y == 2.0) {\ncol = vec3(0.02);\n}\nfloat diff = max(dot(normal, lDir), 0.0);\nfloat spec = pow(max(dot(normal, normalize(lDir + viewDir)), 0.0), shininess);\nfloat glint = pow(max(dot(normal, normalize(vec3(1.0, 1.0, 1.0))), 0.0), 300.0) * 2.0;\nvec3 finalCol = col * (ambient + diff * lightIntensity * 0.5);\nfinalCol += (spec + glint) * lightIntensity * 0.3;\nreturn vec4(finalCol * isNotBlack, base.a);\n}\nreturn vec4(0.0, 0.0, 0.0, base.a);\n}",
    "uniformValues": {
      "lightHeight": 0.5,
      "lightIntensity": 4.5,
      "ambient": 0.56,
      "shininess": 120,
      "detail": 5,
      "blackThreshold": 0.05,
      "colorSpeed": 0.8,
      "alienCount": 3.28,
      "alienSpread": 1.41,
      "alienSize": 0.912,
      "moveX": 0,
      "moveY": -0.1,
      "irisSize": 0.584,
      "pupilSize": 0.372,
      "eyeDilation": 1.31,
      "veinIntensity": 0.57,
      "lookDownAmount": 0.225,
      "lookSideAmount": 0.405,
      "freneticSpeed": 4.8,
      "twitchIntensity": 0.08
    }
  },
  {
    "id": "timeline-d0632531-abe6-4b26-b99e-7c4a0e8be1b9",
    "name": "3D Contrasted Radial Strobe Edge",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Contrasted Radial Strobe Edge\nuniform float speed; // @min 0.0 @max 5.0 @default 1.5\nuniform float warp; // @min 0.0 @max 0.2 @default 0.05\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.85\nuniform float trippy; // @min 0.0 @max 5.0 @default 2.0\nuniform float radialSpeed; // @min 0.0 @max 10.0 @default 4.0\nuniform float radialDensity; // @min 1.0 @max 50.0 @default 15.0\nuniform float strobeSpeed; // @min 0.0 @max 100.0 @default 40.0\n#define TAU 6.28318530718\nfloat luma(vec3 c) {\nreturn dot(c, vec3(0.2126, 0.7152, 0.0722));\n}\nvec3 palette(float t) {\nvec3 a = vec3(0.5);\nvec3 b = vec3(0.5);\nvec3 c = vec3(1.0, 1.2, 1.5) * trippy;\nvec3 d = vec3(0.00, 0.33, 0.67);\nreturn a + b * cos(TAU * (c * t + d));\n}\nfloat inkAt(sampler2D tex, vec2 uv) {\nuv = clamp(uv, 0.0, 1.0);\nfloat lum = luma(texture2D(tex, uv).rgb);\nreturn 1.0 - smoothstep(threshold - 0.15, threshold + 0.15, lum);\n}\nfloat blurInk(sampler2D tex, vec2 uv, vec2 px, float radiusPx) {\nvec2 r = px * radiusPx;\nfloat s = inkAt(tex, uv + vec2(1.0, 0.0)*r) + inkAt(tex, uv + vec2(-1.0, 0.0)*r) +\ninkAt(tex, uv + vec2(0.0, 1.0)*r) + inkAt(tex, uv + vec2(0.0, -1.0)*r);\nreturn s * 0.25;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 origColor = texture2D(tex, uv);\nfloat origLum = luma(origColor.rgb);\nvec2 px = 1.0 / resolution.xy;\nfloat t = time * speed * 0.62;\nfloat symX = abs(uv.x - 0.5);\nfloat signX = sign(uv.x - 0.5);\nvec2 warpedUv = uv + vec2(sin(uv.y * 15.0 + t * 3.0) * signX, cos(symX * 30.0 - t * 2.5)) * warp;\nvec2 p = warpedUv - 0.5;\np.x *= resolution.x / resolution.y;\nfloat r = length(p);\nfloat a = atan(p.y, p.x);\nfloat ink = inkAt(tex, warpedUv);\nfloat inkNear = blurInk(tex, warpedUv, px, 3.0);\nfloat inkFar = blurInk(tex, warpedUv, px, 9.0);\nfloat halo = clamp(inkFar - ink * 0.5, 0.0, 1.0);\nfloat filigree = clamp((inkNear - ink) * 2.0, 0.0, 1.0);\nvec2 drift = vec2(sin(9.0 * p.y + t * 2.7), cos(11.0 * p.x - t * 2.5));\nvec2 q = p + drift * 0.2;\nfloat rq = length(q);\nfloat aq = atan(q.y, q.x);\nfloat field = 0.5 + 0.5 * sin(20.0 * aq - 12.0 * rq - t * 5.2);\nfloat auraWave = 0.5 + 0.5 * sin(40.0 * r - 20.0 * a - t * 8.0);\nvec3 psyA = palette(t * 0.2 + field * 1.5 + auraWave * 0.5);\nvec3 psyB = palette(t * 0.3 - field * 1.2 + sin(8.0 * a - t * 2.0));\nvec3 psyC = palette(rq * 5.0 - t * 0.5 + aq * 2.0);\nvec3 sourceColor = texture2D(tex, warpedUv).rgb;\nvec3 color = sourceColor * mix(vec3(1.0), psyC * 2.0, 0.5 + 0.5 * sin(t + r * 10.0));\ncolor += psyA * (0.3 + 0.7 * field) * (1.0 - ink);\ncolor += psyB * pow(halo, 0.9) * (0.8 + 1.2 * auraWave);\ncolor += psyC * pow(filigree, 1.1) * 1.5;\ncolor *= 1.0 - ink;\nfloat perfectR = length((uv - 0.5) * vec2(resolution.x / resolution.y, 1.0));\nfloat radialWave = pow(sin(perfectR * radialDensity + time * radialSpeed) * 0.5 + 0.5, 2.0);\nfloat strobe = step(0.5, sin(time * strobeSpeed));\ncolor += radialWave * strobe * psyA * origLum;\nreturn vec4(clamp(color, 0.0, 1.0), origColor.a);\n}",
    "uniformValues": {
      "speed": 5,
      "warp": 0,
      "threshold": 0.71,
      "trippy": 0.5,
      "radialSpeed": 8.1,
      "radialDensity": 8.84,
      "strobeSpeed": 100
    }
  },
  {
    "id": "timeline-c32abfe7-b6f0-4a21-9e97-ab74c4b24982",
    "name": "3D Dual Light Spiral Masked Ground",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Dual Light Spiral Masked Ground\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float speed2; // @min -10.0 @max 10.0 @default 3.0\nuniform float lineLength; // @min 1.0 @max 10.0 @default 1.0\nuniform float delay; // @min 0.0 @max 5.0 @default 2.0\nuniform float distOffset; // @min 0.0 @max 20.0 @default 10.0\nuniform float centerBlur; // @min 0.0 @max 0.5 @default 0.1\nuniform vec3 waveColor1; // @default 0.1,0.5,1.0\nuniform vec3 waveColor2; // @default 1.0,0.1,0.8\nuniform vec3 waveColor3; // @default 0.9,1.0,0.1\nuniform float waveFreq; // @min 1.0 @max 50.0 @default 20.0\nuniform float colorShiftSpeed; // @min 0.0 @max 5.0 @default 1.0\nuniform float blackSpotAmount; // @min 0.0 @max 1.0 @default 0.8\nuniform float spiralScale; // @min 5.0 @max 100.0 @default 40.0\nuniform float spiralSpeed; // @min -20.0 @max 20.0 @default 7.0\nuniform float spiralSize; // @min 0.05 @max 1.0 @default 0.3\nuniform float lsdGlowWidth; // @min 0.1 @max 2.0 @default 0.8\nuniform float prime1; // @min 1.0 @max 13.0 @default 2.0\nuniform float prime2; // @min 1.0 @max 13.0 @default 3.0\nuniform bool blackLinesInLight; // @default false\nuniform vec3 secondLightColor; // @default 0.8,0.9,1.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 baseColor = texture2D(tex, uv);\nfloat baseLuma = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));\nfloat spiralMask = smoothstep(0.01, 0.05, baseLuma);\nvec2 symUv = uv;\nfloat dir = 1.0;\nif (symUv.x > 0.5) {\nsymUv.x = 1.0 - symUv.x;\ndir = -1.0;\n}\nfloat blob = node_noise(symUv * 5.0);\nfloat localTime = (blob > 0.0) ? time - delay : time;\nvec2 off = 1.0 / resolution;\nfloat t00 = texture2D(tex, uv + vec2(-off.x, -off.y)).r;\nfloat t10 = texture2D(tex, uv + vec2( 0.0, -off.y)).r;\nfloat t20 = texture2D(tex, uv + vec2( off.x, -off.y)).r;\nfloat t01 = texture2D(tex, uv + vec2(-off.x, 0.0)).r;\nfloat t21 = texture2D(tex, uv + vec2( off.x, 0.0)).r;\nfloat t02 = texture2D(tex, uv + vec2(-off.x, off.y)).r;\nfloat t12 = texture2D(tex, uv + vec2( 0.0, off.y)).r;\nfloat t22 = texture2D(tex, uv + vec2( off.x, off.y)).r;\nfloat gx = (t00 + 2.0 * t01 + t02) - (t20 + 2.0 * t21 + t22);\nfloat gy = (t00 + 2.0 * t10 + t20) - (t02 + 2.0 * t12 + t22);\nfloat edge = sqrt(gx * gx + gy * gy);\nfloat angle = atan(gy, gx);\nfloat dist = distance(uv, vec2(0.5));\nfloat segment1 = smoothstep(mix(0.7, 0.0, smoothstep(centerBlur + 0.001, 0.0, abs(uv.x - 0.5))), mix(0.95, 1.0, smoothstep(centerBlur + 0.001, 0.0, abs(uv.x - 0.5))), sin(angle * lineLength + localTime * speed * dir - dist * distOffset));\nfloat segment2 = smoothstep(0.2, 0.8, sin(angle * lineLength - localTime * speed2 * dir - dist * distOffset * 0.7));\nfloat shift = time * colorShiftSpeed;\nvec3 dynColor1 = mix(waveColor1, waveColor2, sin(shift) * 0.5 + 0.5);\nvec3 dynColor2 = mix(waveColor2, waveColor3, cos(shift * 0.8) * 0.5 + 0.5);\nvec3 dynColor3 = mix(waveColor3, waveColor1, sin(shift * 1.2) * 0.5 + 0.5);\nvec3 lineColor1 = mix(dynColor1, dynColor2, node_noise(vec2(dist * waveFreq, 0.0) + vec2(cos(fract(time * speed * 0.05) * 6.283), sin(fract(time * speed * 0.05) * 6.283))) * 0.5 + 0.5);\nvec3 lineColor2 = mix(dynColor2, dynColor3, node_noise(vec2(dist * waveFreq * 0.6, 5.0) + vec2(cos(fract(time * speed2 * 0.05) * 6.283), sin(fract(time * speed2 * 0.05) * 6.283))) * 0.5 + 0.5);\nvec3 finalColor = (baseColor.rgb * 0.4) + (lineColor1 * edge * segment1 * 2.0) + (lineColor2 * edge * segment2 * 1.5);\nvec2 centeredUv = (symUv - vec2(0.5)) * vec2(resolution.x / resolution.y, 1.0);\nfloat r = length(centeredUv);\nfloat a = atan(centeredUv.y, centeredUv.x);\nfloat mathBlob = sin(a * 5.0 + r * spiralScale * prime1 - time * spiralSpeed) + cos(r * spiralScale * prime2 + a * 11.0) + sin(r * spiralScale * prime1 - time * 5.0);\nfloat sizeMask = smoothstep(spiralSize, 0.05, r) * (smoothstep(0.0, 0.15, uv.x) * smoothstep(1.0, 0.85, uv.x) * smoothstep(0.0, 0.15, uv.y) * smoothstep(1.0, 0.85, uv.y));\nfloat spot = smoothstep(0.5, 1.5, mathBlob) * sizeMask * spiralMask;\nfloat lsdEdge = smoothstep(lsdGlowWidth, 0.0, abs(mathBlob - 0.3)) * sizeMask * spiralMask;\nfinalColor += lineColor1 * lsdEdge * blackSpotAmount * 2.0;\nfinalColor = mix(finalColor, vec3(0.0), spot * blackSpotAmount);\nvec2 lPos1 = vec2(0.5 + 0.4 * sin(time * 1.1 + node_noise(vec2(time * 0.5, 0.0))), 0.5 + 0.4 * cos(time * 1.3 + node_noise(vec2(0.0, time * 0.5))));\nvec2 lPos2 = vec2(0.5 + 0.4 * sin(time * 0.85 + node_noise(vec2(time * 0.2, 5.0)) * 10.0), 0.5 + 0.4 * cos(time * 0.65 + node_noise(vec2(5.0, time * 0.2)) * 10.0));\nvec2 aspectUv = uv * vec2(resolution.x / resolution.y, 1.0);\nfloat illumination = pow(smoothstep(1.2, 0.0, distance(aspectUv, lPos1 * vec2(resolution.x / resolution.y, 1.0))), 1.5);\nfinalColor *= illumination * (1.0 + vec3(1.0, 0.9, 0.7) * 2.5);\nif (blackLinesInLight) {\nfinalColor = mix(finalColor, vec3(0.0), clamp((edge * segment1 * 2.0) + (edge * segment2 * 1.5) + (lsdEdge * 2.0), 0.0, 1.0) * illumination);\n}\nfloat illumination2 = pow(smoothstep(0.8, 0.0, distance(aspectUv, lPos2 * vec2(resolution.x / resolution.y, 1.0))), 2.0) * spiralMask;\nfinalColor = mix(finalColor, (vec3(1.0) - baseColor.rgb) * secondLightColor * 2.5, illumination2);\nreturn vec4(finalColor, baseColor.a);\n}",
    "uniformValues": {
      "speed": -9.6,
      "speed2": 4.4,
      "lineLength": 4.6,
      "delay": 2,
      "distOffset": 3.2,
      "centerBlur": 0.395,
      "waveColor1": [
        0.06274509803921569,
        0.5568627450980392,
        0.1450980392156863
      ],
      "waveColor2": [
        0.058823529411764705,
        0.43529411764705883,
        0.5607843137254902
      ],
      "waveColor3": [
        0.9882352941176471,
        0.2,
        1
      ],
      "waveFreq": 40.69,
      "colorShiftSpeed": 4.85,
      "blackSpotAmount": 0.59,
      "spiralScale": 20.2,
      "spiralSpeed": 7,
      "spiralSize": 0.9905,
      "lsdGlowWidth": 0.8,
      "prime1": 9.76,
      "prime2": 9.16,
      "blackLinesInLight": false,
      "secondLightColor": [
        0.047058823529411764,
        0.047058823529411764,
        0.054901960784313725
      ]
    }
  },
  {
    "id": "timeline-554160d1-7164-485a-94f6-2c97fafff911",
    "name": "3D Spotlight Tracer",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Spotlight Tracer\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float contrast; // @min 1.0 @max 5.0 @default 1.5\nuniform float depth; // @min 0.1 @max 5.0 @default 1.5\nvec3 hsv2rgb(vec3 c) {\nvec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\nvec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\nreturn c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);\n}\nvec3 calcLight(vec3 lightPos, vec3 lightCol, vec3 normal, vec3 fragPos, vec3 viewDir) {\nvec3 lightDir = normalize(lightPos - fragPos);\nfloat diff = max(dot(normal, lightDir), 0.0);\nvec3 reflectDir = reflect(-lightDir, normal);\nfloat spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);\nfloat dist = length(lightPos - fragPos);\nfloat attenuation = 1.0 / (1.0 + 2.0 * dist * dist);\nreturn lightCol * (diff * 0.8 + spec * 1.2) * attenuation;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 baseColor = texture2D(tex, uv);\nvec2 off = 1.0 / resolution;\nfloat t00 = texture2D(tex, uv + vec2(-off.x, -off.y)).r;\nfloat t10 = texture2D(tex, uv + vec2( 0.0, -off.y)).r;\nfloat t20 = texture2D(tex, uv + vec2( off.x, -off.y)).r;\nfloat t01 = texture2D(tex, uv + vec2(-off.x, 0.0)).r;\nfloat t21 = texture2D(tex, uv + vec2( off.x, 0.0)).r;\nfloat t02 = texture2D(tex, uv + vec2(-off.x, off.y)).r;\nfloat t12 = texture2D(tex, uv + vec2( 0.0, off.y)).r;\nfloat t22 = texture2D(tex, uv + vec2( off.x, off.y)).r;\nfloat gx = (t00 + 2.0 * t01 + t02) - (t20 + 2.0 * t21 + t22);\nfloat gy = (t00 + 2.0 * t10 + t20) - (t02 + 2.0 * t12 + t22);\nvec3 normal = normalize(vec3(gx, gy, 1.0 / depth));\nvec3 fragPos = vec3(uv * 2.0 - 1.0, 0.0);\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 lPos1 = vec3(sin(time * speed * 0.3) * 0.8, cos(time * speed * 0.3) * 0.8, 0.3);\nvec3 lPos2 = vec3(cos(time * speed * 0.24) * 0.8, sin(time * speed * 0.24) * 0.8, 0.3);\nvec3 lPos3 = vec3(sin(time * speed * 0.18 + 2.0) * 0.8, cos(time * speed * 0.18 + 2.0) * 0.8, 0.3);\nvec3 lCol1 = hsv2rgb(vec3(time * 0.1, 1.0, 1.0));\nvec3 lCol2 = hsv2rgb(vec3(time * 0.1 + 0.33, 1.0, 1.0));\nvec3 lCol3 = hsv2rgb(vec3(time * 0.1 + 0.66, 1.0, 1.0));\nvec3 lighting = calcLight(lPos1, lCol1, normal, fragPos, viewDir) +\ncalcLight(lPos2, lCol2, normal, fragPos, viewDir) +\ncalcLight(lPos3, lCol3, normal, fragPos, viewDir);\nvec3 finalColor = baseColor.rgb * lighting * contrast;\nreturn vec4(finalColor, baseColor.a);\n}",
    "uniformValues": {
      "speed": -10,
      "contrast": 5,
      "depth": 5
    }
  },
  {
    "id": "timeline-dc8cdc32-72c2-4e8d-944c-fb85951d4253",
    "name": "Animated Dot Grid",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Animated Dot Grid\nuniform float gridDensity; // @min 5.0 @max 100.0 @default 40.0\nuniform float growSpeed; // @min 0.1 @max 5.0 @default 1.0\nuniform float maxDistance; // @min 0.05 @max 0.5 @default 0.4\nuniform float animationDelay; // @min 0.0 @max 2.0 @default 0.2\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat aspect = resolution.x / resolution.y;\nvec2 gridUv = uv * gridDensity;\ngridUv.x *= aspect;\nvec2 cellId = floor(gridUv);\nvec2 localPos = fract(gridUv) - 0.5;\nfloat delay = (cellId.x + cellId.y) * animationDelay;\nfloat phase = fract(time * growSpeed + delay);\nfloat radius = phase * maxDistance;\nfloat dist = length(localPos);\nfloat dotMask = 1.0 - smoothstep(radius - 0.02, radius + 0.02, dist);\nfloat brightness = (source.r + source.g + source.b) / 3.0;\nfloat isColored = step(0.05, brightness) * step(0.05, source.a);\nreturn source * dotMask * isColored;\n}",
    "uniformValues": {
      "gridDensity": 61.05,
      "growSpeed": 1.031,
      "maxDistance": 0.113,
      "animationDelay": 0.52
    }
  },
  {
    "id": "timeline-4ccd847c-e6d0-468a-a3d2-84c5175be081",
    "name": "Color to White",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Color to White\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.01\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat intensity = max(source.r, max(source.g, source.b));\nif (intensity > threshold) {\nreturn vec4(1.0, 1.0, 1.0, source.a);\n}\nreturn source;\n}",
    "uniformValues": {
      "threshold": 0.18
    }
  },
  {
    "id": "timeline-da8ff855-8634-4081-94aa-da38494930c3",
    "name": "Color to White",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Color to White\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.01\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat intensity = max(source.r, max(source.g, source.b));\nif (intensity > threshold) {\nreturn vec4(1.0, 1.0, 1.0, source.a);\n}\nreturn source;\n}",
    "uniformValues": {
      "threshold": 0.18
    }
  },
  {
    "id": "timeline-fd028411-8852-4c6b-882c-7dce91418aed",
    "name": "Color to White",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Color to White\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.01\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat intensity = max(source.r, max(source.g, source.b));\nif (intensity > threshold) {\nreturn vec4(1.0, 1.0, 1.0, source.a);\n}\nreturn source;\n}",
    "uniformValues": {
      "threshold": 0.18
    }
  },
  {
    "id": "timeline-236df45c-96f7-4dbd-a963-efd94dc5d402",
    "name": "Distorted Chromy Hue Scanner",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Distorted Chromy Hue Scanner\nuniform float rangeWidth; // @min 0.0 @max 1.0 @default 0.2\nuniform float speed; // @min -2.0 @max 2.0 @default 0.5\nuniform float p; // @min 0.0 @max 10.0 @default 5.0\nuniform float dotGrid; // @min 1.0 @max 100.0 @default 10.0\nuniform float dotSize; // @min 0.0 @max 2.0 @default 1.0\nuniform float gridGrowth; // @min 0.0 @max 5.0 @default 1.0\nuniform float dotspeed; // @min 0.0 @max 1.0 @default 0.2\nuniform float distortion; // @min 0.0 @max 5.0 @default 1.5\nvec3 rgb2hsv(vec3 c) {\nvec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\nvec4 p_vec = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\nvec4 q = mix(vec4(p_vec.xyw, c.r), vec4(c.r, p_vec.yzx), step(p_vec.x, c.r));\nfloat d = q.x - min(q.w, q.y);\nfloat e = 1.0e-10;\nreturn vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec3 hsv = rgb2hsv(source.rgb);\nfloat targetHue = fract(time * speed);\nfloat dist = abs(fract(hsv.x - targetHue + 0.5) - 0.5);\nfloat mask = step(dist, rangeWidth * 0.5);\nvec2 aspect = vec2(resolution.x / resolution.y, 1.0);\nvec2 centeredUv = (uv - 0.5) * aspect;\nfloat distFromCenter = length(centeredUv);\nfloat angle = distFromCenter * distortion * 3.0 - time;\nfloat s = sin(angle);\nfloat c = cos(angle);\nvec2 distortedUv = centeredUv * mat2(c, s, -s, c);\ndistortedUv += normalize(centeredUv + 0.0001) * sin(distFromCenter * 15.0 - time * 4.0) * (distFromCenter * distFromCenter) * distortion * 0.5;\nfloat scale = exp(fract(time * gridGrowth) * 3.0);\nvec2 gridUv = distortedUv * dotGrid * scale;\nvec2 dotUv = fract(gridUv + time * dotspeed * 0.1) - 0.5;\nfloat currentDotSize = dotSize * distFromCenter * 3.0 + (1.0 - 1.0 / scale) * 0.5 + 0.2;\nfloat dots = 1.0 - smoothstep(0.0, currentDotSize * 2.0 + 0.1, length(dotUv));\nfloat brightness = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat isNotBlack = smoothstep(0.05, 0.25, brightness);\ndots *= isNotBlack;\nvec3 invertedColor = 1.0 - source.rgb;\nfloat invLum = dot(invertedColor, vec3(0.299, 0.587, 0.114));\nvec3 chromyColor = 0.5 + 0.5 * sin(invLum * 12.0 + vec3(0.0, 2.0, 4.0));\nvec3 finalColor = (chromyColor * dots) * mask;\nreturn vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "rangeWidth": 0.25,
      "speed": 2,
      "p": 0,
      "dotGrid": 49.51,
      "dotSize": 0.12,
      "gridGrowth": 0,
      "dotspeed": 1,
      "distortion": 0
    }
  },
  {
    "id": "timeline-922856b9-9d79-481e-99c3-c7134c1412ad",
    "name": "Distorted Chromy Hue Scanner",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Distorted Chromy Hue Scanner\nuniform float rangeWidth; // @min 0.0 @max 1.0 @default 0.2\nuniform float speed; // @min -2.0 @max 2.0 @default 0.5\nuniform float p; // @min 0.0 @max 10.0 @default 5.0\nuniform float dotGrid; // @min 1.0 @max 100.0 @default 10.0\nuniform float dotSize; // @min 0.0 @max 2.0 @default 1.0\nuniform float gridGrowth; // @min 0.0 @max 5.0 @default 1.0\nuniform float dotspeed; // @min 0.0 @max 1.0 @default 0.2\nuniform float distortion; // @min 0.0 @max 5.0 @default 1.5\nvec3 rgb2hsv(vec3 c) {\nvec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\nvec4 p_vec = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\nvec4 q = mix(vec4(p_vec.xyw, c.r), vec4(c.r, p_vec.yzx), step(p_vec.x, c.r));\nfloat d = q.x - min(q.w, q.y);\nfloat e = 1.0e-10;\nreturn vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec3 hsv = rgb2hsv(source.rgb);\nfloat targetHue = fract(time * speed);\nfloat dist = abs(fract(hsv.x - targetHue + 0.5) - 0.5);\nfloat mask = step(dist, rangeWidth * 0.5);\nvec2 aspect = vec2(resolution.x / resolution.y, 1.0);\nvec2 centeredUv = (uv - 0.5) * aspect;\nfloat distFromCenter = length(centeredUv);\nfloat angle = distFromCenter * distortion * 3.0 - time;\nfloat s = sin(angle);\nfloat c = cos(angle);\nvec2 distortedUv = centeredUv * mat2(c, s, -s, c);\ndistortedUv += normalize(centeredUv + 0.0001) * sin(distFromCenter * 15.0 - time * 4.0) * (distFromCenter * distFromCenter) * distortion * 0.5;\nfloat scale = exp(fract(time * gridGrowth) * 3.0);\nvec2 gridUv = distortedUv * dotGrid * scale;\nvec2 dotUv = fract(gridUv + time * dotspeed * 0.1) - 0.5;\nfloat currentDotSize = dotSize * distFromCenter * 3.0 + (1.0 - 1.0 / scale) * 0.5 + 0.2;\nfloat dots = 1.0 - smoothstep(0.0, currentDotSize * 2.0 + 0.1, length(dotUv));\nfloat brightness = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat isNotBlack = smoothstep(0.05, 0.25, brightness);\ndots *= isNotBlack;\nvec3 invertedColor = 1.0 - source.rgb;\nfloat invLum = dot(invertedColor, vec3(0.299, 0.587, 0.114));\nvec3 chromyColor = 0.5 + 0.5 * sin(invLum * 12.0 + vec3(0.0, 2.0, 4.0));\nvec3 finalColor = mix(source.rgb, chromyColor * dots, mask);\nreturn vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "rangeWidth": 0.97,
      "speed": 0.76,
      "p": 1.3,
      "dotGrid": 49.51,
      "dotSize": 0,
      "gridGrowth": 0,
      "dotspeed": 0.84,
      "distortion": 1.6
    }
  },
  {
    "id": "timeline-961ff105-c875-460f-b5c1-4e408fa3789f",
    "name": "Distorted LSD Snake",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Distorted LSD Snake\nuniform float scale; // @min 1.0 @max 50.0 @default 10.0\nuniform float speed; // @min 0.0 @max 5.0 @default 0.5\nuniform float dash_freq; // @min 1.0 @max 20.0 @default 8.0\nuniform float thickness; // @min 0.01 @max 0.5 @default 0.15\nuniform float blur; // @min 0.0 @max 0.2 @default 0.05\nuniform float distortion; // @min 0.0 @max 5.0 @default 1.5\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 bg = texture2D(tex, uv);\nfloat luma = dot(bg.rgb, vec3(0.299, 0.587, 0.114));\nfloat isNotBlack = smoothstep(0.02, 0.1, luma);\nvec2 centerDist = uv - 0.5;\nfloat dist = length(centerDist);\nvec2 p = uv + centerDist * sin(dist * 15.0 - time * 3.0) * distortion * 0.1;\np.x = abs(p.x - 0.5);\nfloat dyn_scale = scale + sin(time * 0.5) * 2.0;\np *= dyn_scale;\nvec2 ip = floor(p);\nvec2 fp = fract(p);\nfloat h = fract(sin(dot(ip, vec2(12.9898, 78.233))) * 43758.5453);\nif (h > 0.5) {\nfp.x = 1.0 - fp.x;\n}\nfloat d1 = length(fp);\nfloat d2 = length(fp - vec2(1.0));\nfloat d = min(abs(d1 - 0.5), abs(d2 - 0.5));\nfloat dyn_thick = thickness + sin(time * 3.0) * 0.02;\nfloat path = smoothstep(dyn_thick, dyn_thick - blur, d);\nfloat arcLen = min(d1, d2);\nfloat dash = step(0.5, fract((arcLen - time * speed) * dash_freq));\nfloat mask = path * dash * isNotBlack;\nfloat nx = clamp(d / dyn_thick, 0.0, 1.0);\nfloat nz = sqrt(1.0 - nx * nx);\nvec3 lsdColor = 0.5 + 0.5 * cos(time * 5.0 - arcLen * 25.0 + vec3(0.0, 2.0, 4.0));\nlsdColor = clamp(lsdColor * bg.rgb * 2.0, 0.0, 1.0);\nvec3 snakeColor = lsdColor * nz;\nsnakeColor += lsdColor * pow(nz, 4.0);\nfloat glow = smoothstep(dyn_thick + 0.2, dyn_thick, d) * dash * isNotBlack;\nvec3 bgWithGlow = (bg.rgb * glow) + (lsdColor * glow * 0.8);\nvec3 finalColor = mix(bgWithGlow, snakeColor, mask);\nreturn vec4(finalColor, bg.a);\n}",
    "uniformValues": {
      "scale": 36.77,
      "speed": 1.1,
      "dash_freq": 7.08,
      "thickness": 0.451,
      "blur": 0,
      "distortion": 1.45
    }
  },
  {
    "id": "timeline-870d7e61-146c-4a0c-8fdd-7f27dfbd047c",
    "name": "Distorted Symmetric Hex Dance",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Distorted Symmetric Hex Dance\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\nuniform float intensity; // @min 0.0 @max 3.0 @default 1.0\nuniform float scale; // @min 0.1 @max 5.0 @default 0.3\nuniform float gridDensity; // @min 5.0 @max 100.0 @default 40.0\nuniform float gridSize; // @min 0.01 @max 0.3 @default 0.05\nuniform float gridBrightness; // @min 0.0 @max 1.0 @default 0.5\nuniform float dotDistortion; // @min 0.0 @max 0.5 @default 0.1\nuniform float dotAspect; // @min 0.2 @max 2.0 @default 1.5\nuniform vec3 gridColor; // @default 1.0,1.0,1.0\n#define R3 1.732051\nmat2 Rot(float a) {\nfloat s = sin(a), c = cos(a);\nreturn mat2(c, -s, s, c);\n}\nvec4 HexCoords(vec2 uv) {\nvec2 s = vec2(1.0, R3);\nvec2 h = 0.5 * s;\nvec2 a = mod(uv, s) - h;\nvec2 b = mod(uv + h, s) - h;\nreturn dot(a, a) < dot(b, b) ? vec4(a, uv - a) : vec4(b, uv - b);\n}\nfloat Hexagon(vec2 uv, float r, float time) {\nuv *= Rot(mix(0.0, 3.1415, r));\nuv = abs(vec2(-uv.y * R3, uv.x));\nfloat d = max(dot(uv, vec2(0.5, 0.866)) - r, uv.y - r * 0.707);\nreturn smoothstep(0.06, 0.02, abs(d)) + smoothstep(0.1, 0.09, abs(r - 0.5)) * sin(time);\n}\nfloat GetSize(vec2 id, float seed, float time) {\nfloat d = length(id);\nreturn (sin(d * seed + time * 0.5) + sin(d * seed * seed * 10.0 + time)) * 0.25 + 0.5;\n}\nfloat Layer(vec2 uv, float s, float time) {\nvec4 hu = HexCoords(uv * 2.0);\nfloat d = 0.0;\nfor(int y = -1; y <= 1; y++) {\nfor(int x = -1; x <= 1; x++) {\nvec2 offs = vec2(float(x), float(y) * 0.866);\nif (mod(float(y), 2.0) != 0.0) offs.x += 0.5;\nd += Hexagon(hu.xy - offs, GetSize(hu.zw + offs, s, time), time);\n}\n}\nreturn d * 0.3;\n}\nvec3 Col(float p, float offs) {\nfloat n = fract(sin(p * 123.34) * 345.456) * 1234.34;\nreturn sin(n * vec3(12.23, 45.23, 56.2) + offs * 3.0) * 0.5 + 0.5;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec2 UV = (uv - 0.5);\nUV.x *= resolution.x / resolution.y;\nfloat symX = abs(UV.x);\nvec2 symUV = vec2(symX, UV.y);\nfloat t = time * speed * 0.5;\nvec2 p_uv = symUV * mix(1.0, 5.0, sin(t * 0.5) * 0.5 + 0.5) * scale;\np_uv *= Rot(t);\nvec3 col = vec3(0.0);\nfor(float i = 0.0; i < 1.0; i += 0.33) {\nfloat id = floor(i + t);\nfloat ft = fract(i + t);\nfloat fade = smoothstep(0.0, 0.3, ft) * smoothstep(1.0, 0.7, ft);\ncol += fade * Layer(p_uv * mix(5.0, 0.1, ft), fract(sin(i + id)), time) * Col(id, dot(symUV, symUV));\n}\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(0.01, 0.05, lum);\nfloat illumination = clamp(length(col * intensity), 0.0, 1.0);\nvec3 baseColor = (source.rgb * illumination) + (col * intensity * mask);\nvec2 gridUV = vec2(abs(uv.x - 0.5), uv.y);\ngridUV.x += sin(gridUV.y * 10.0 + time) * dotDistortion * 0.1;\ngridUV.y += cos(gridUV.x * 10.0 + time) * dotDistortion * 0.1;\nvec2 g_st = fract(gridUV * gridDensity) - 0.5;\nfloat d = length(g_st * vec2(1.0, dotAspect));\nfloat dots = smoothstep(gridSize, gridSize * 0.8, d);\nfloat gridVisibility = mask * (1.0 - illumination);\nvec3 finalColor = baseColor + (gridColor * dots * gridBrightness * gridVisibility);\nreturn vec4(clamp(finalColor, 0.0, 1.0), source.a);\n}",
    "uniformValues": {
      "speed": 3.9,
      "intensity": 0.33,
      "scale": 1.815,
      "gridDensity": 80.05,
      "gridSize": 0.2304,
      "gridBrightness": 1,
      "dotDistortion": 0.39,
      "dotAspect": 1.262,
      "gridColor": [
        0.8156862745098039,
        0.7647058823529411,
        0.7647058823529411
      ]
    }
  },
  {
    "id": "timeline-725906ce-9eb8-4b8c-94ce-da06fa3829e5",
    "name": "Dual Blob Inversion & Color Hide",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Dual Blob Inversion & Color Hide\nuniform vec3 tint; // @default 0.1,0.5,0.9\nuniform float warp; // @min 0.0 @max 5.0 @default 1.5\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\nuniform float blobIntensity; // @min 0.0 @max 5.0 @default 1.5\nuniform float colorSpeed; // @min 0.0 @max 5.0 @default 1.0\nuniform float hideTolerance; // @min 0.0 @max 1.0 @default 0.2\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 original = texture2D(tex, fract(uv));\nvec2 off = 2.0 / max(resolution, vec2(1.0));\nfloat lum = dot(original.rgb, vec3(0.299, 0.587, 0.114));\nlum += dot(texture2D(tex, fract(uv + vec2(off.x, off.y))).rgb, vec3(0.299, 0.587, 0.114));\nlum += dot(texture2D(tex, fract(uv + vec2(-off.x, off.y))).rgb, vec3(0.299, 0.587, 0.114));\nlum += dot(texture2D(tex, fract(uv + vec2(off.x, -off.y))).rgb, vec3(0.299, 0.587, 0.114));\nlum += dot(texture2D(tex, fract(uv + vec2(-off.x, -off.y))).rgb, vec3(0.299, 0.587, 0.114));\nlum *= 0.2;\nvec2 symUv = abs(uv - 0.5);\nvec2 uvWrap = symUv * 6.28318530718 * 2.0;\nfloat t = time * speed;\nvec2 flow = vec2(\nsin(uvWrap.x * 2.0 + cos(uvWrap.y * 2.0 + t)),\ncos(uvWrap.y * 2.0 + sin(uvWrap.x * 2.0 - t))\n) * warp * 0.25;\nfloat blobNoise = sin(uvWrap.x * 3.0 + flow.x * 5.0 + t * 1.5) * cos(uvWrap.y * 3.0 + flow.y * 5.0 - t * 1.2);\nfloat phase = lum + blobNoise * 0.5 + flow.x * 0.5 + flow.y * 0.5 - t * 0.5;\nvec3 psychColor = 0.5 + 0.5 * cos(6.28318530718 * (vec3(phase) + tint + vec3(0.02, 0.20, 0.38)));\nvec3 psychColor2 = 0.5 + 0.5 * cos(6.28318530718 * (vec3(phase) + tint + vec3(0.38, 0.20, 0.02)));\nvec2 blobPos = vec2(\nsin(t * 0.8) * 0.25 + (node_noise(vec2(t, 0.0)) - 0.5) * 0.2,\ncos(t * 0.9) * 0.25 + (node_noise(vec2(0.0, t)) - 0.5) * 0.2\n);\nvec2 symY = vec2(abs(uv.x - 0.5), uv.y - 0.5) - blobPos;\nfloat blobMask = smoothstep(0.4, 0.0, length(symY));\nvec2 blobPos2 = vec2(\nsin(t * 0.7 + 3.14) * 0.3 + (node_noise(vec2(t * 1.1, 5.0)) - 0.5) * 0.2,\ncos(t * 0.8 + 3.14) * 0.3 + (node_noise(vec2(5.0, t * 1.1)) - 0.5) * 0.2\n);\nvec2 symY2 = vec2(abs(uv.x - 0.5), uv.y - 0.5) - blobPos2;\nfloat blobMask2 = smoothstep(0.4, 0.0, length(symY2));\nfloat isNotDark = smoothstep(0.05, 0.2, lum);\nvec3 softInvert = mix(original.rgb, 1.0 - original.rgb, 0.8);\nvec3 invertedAreaColor = softInvert + psychColor2 * blobMask2 * blobIntensity;\nvec3 normalAreaColor = original.rgb + psychColor * blobMask * blobIntensity;\nvec3 effectColor = mix(invertedAreaColor, normalAreaColor, blobMask);\nvec3 finalColor = mix(original.rgb, effectColor, isNotDark);\nvec3 targetColor = 0.5 + 0.5 * cos(time * colorSpeed + vec3(0.0, 2.094, 4.188));\nfloat colorDist = distance(original.rgb, targetColor);\nfloat hideMask = smoothstep(hideTolerance, hideTolerance + 0.15, colorDist);\nreturn vec4(clamp(finalColor, 0.0, 1.0) * hideMask, original.a * hideMask);\n}",
    "uniformValues": {
      "tint": [
        0.023529411764705882,
        0.47058823529411764,
        0.9176470588235294
      ],
      "warp": 10,
      "speed": 1.3,
      "blobIntensity": 0.65,
      "colorSpeed": 1,
      "hideTolerance": 0.72
    }
  },
  {
    "id": "timeline-5d75d00a-f196-42a4-ba8c-12499efa25e4",
    "name": "Dynamic Transparent Dot Grid",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Dynamic Transparent Dot Grid\nuniform float gridDensity; // @min 5.0 @max 100.0 @default 40.0\nuniform float growSpeed; // @min 0.1 @max 5.0 @default 1.0\nuniform float maxDistance; // @min 0.05 @max 0.5 @default 0.4\nuniform float animationDelay; // @min 0.0 @max 2.0 @default 0.2\nuniform float inclination; // @min -3.0 @max 6.0 @default 0.3\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 symUv = vec2(0.5 - abs(uv.x - 0.5), uv.y);\nvec4 source = texture2D(tex, symUv);\nfloat aspect = resolution.x / resolution.y;\nvec2 gridUv = symUv * gridDensity;\ngridUv.x *= aspect;\ngridUv.x += gridUv.y * inclination;\nvec2 cellId = floor(gridUv);\nvec2 localPos = fract(gridUv) - 0.5;\nfloat delay = (cellId.x + cellId.y) * animationDelay;\nfloat phase = fract(time * growSpeed + delay);\nfloat radius = phase * maxDistance;\nfloat transparency = 1.0 - phase;\nfloat dist = length(localPos);\nfloat dotMask = 1.0 - smoothstep(radius - 0.02, radius + 0.02, dist);\nfloat brightness = (source.r + source.g + source.b) / 3.0;\nfloat isColored = step(0.05, brightness) * step(0.05, source.a);\nvec3 shiftedColor = mix(source.rgb, vec3(source.b, source.r, source.g), phase);\nvec4 finalColor = vec4(shiftedColor, source.a * transparency);\nreturn finalColor * dotMask * isColored;\n}",
    "uniformValues": {
      "gridDensity": 27.8,
      "growSpeed": 1.423,
      "maxDistance": 0.1805,
      "animationDelay": 0.26,
      "inclination": 4.11
    }
  },
  {
    "id": "timeline-6cfef9db-f262-457b-beed-de39ea418987",
    "name": "Grid Drive Color Range",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Grid Drive Color Range\nuniform vec3 target_color; // @default 0.0,0.0,0.0\nuniform float color_threshold; // @min 0.0 @max 2.0 @default 0.3\nuniform float color_smoothness; // @min 0.001 @max 1.0 @default 0.1\nuniform float spped; // @min 0.0 @max 1.0 @default 0.5\n#define PI 3.141592654\nmat2 rot(float x) {\nreturn mat2(cos(x), sin(x), -sin(x), cos(x));\n}\nvec2 foldRotate(in vec2 p, in float s) {\nfloat a = PI / s - atan(p.x, p.y);\nfloat n = PI * 2.0 / s;\na = floor(a / n) * n;\np *= rot(a);\nreturn p;\n}\nfloat sdRect(vec2 p, vec2 b) {\nvec2 d = abs(p) - b;\nreturn min(max(d.x, d.y), 0.0) + length(max(d, 0.0));\n}\nfloat tex_func(vec2 p, float z) {\np = foldRotate(p, 8.0);\nvec2 q = (fract(p / 10.0) - 0.5) * 10.0;\nfor (int i = 0; i < 3; ++i) {\nfor(int j = 0; j < 2; j++) {\nq = abs(q) - 0.25;\nq *= rot(PI * 0.25);\n}\nq = abs(q) - vec2(1.0, 1.5);\nq *= rot(PI * 0.25 * z);\nq = foldRotate(q, 3.0);\n}\nfloat d = sdRect(q, vec2(1.0, 1.0));\nfloat f = 1.0 / (1.0 + abs(d));\nreturn smoothstep(0.9, 1.0, f);\n}\nfloat Bokeh(vec2 p, vec2 sp, float size, float mi, float blur) {\nfloat d = length(p - sp);\nfloat c = smoothstep(size, size * (1.0 - blur), d);\nc *= mix(mi, 1.0, smoothstep(size * 0.8, size, d));\nreturn c;\n}\nvec2 hash(vec2 p) {\np = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));\nreturn fract(sin(p) * 43758.5453) * 2.0 - 1.0;\n}\nfloat dirt(vec2 uv, float n) {\nvec2 p = fract(uv * n);\nvec2 st = (floor(uv * n) + 0.5) / n;\nvec2 rnd = hash(st);\nreturn Bokeh(p, vec2(0.5) + vec2(0.2) * rnd, 0.05, abs(rnd.y * 0.4) + 0.3, 0.25 + rnd.x * rnd.y * 0.2);\n}\nfloat sm(float start, float end, float t, float smo) {\nreturn smoothstep(start, start + smo, t) - smoothstep(end - smo, end, t);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat dist = distance(source.rgb, target_color);\nfloat mask = 1.0 - smoothstep(color_threshold, color_threshold + color_smoothness, dist);\nif (mask <= 0.0) {\nreturn vec4(0.0, 0.0, 0.0, source.a);\n}\nvec2 p_uv = uv * 2.0 - 1.0;\np_uv.x *= resolution.x / resolution.y;\np_uv *= 2.0;\nvec3 col = vec3(0.0);\nfloat INTERVAL = 3.0;\nfloat t_val = time * spped * 2.0;\nfor(int i = 0; i < 6; i++) {\nfloat ii = float(6 - i);\nfloat t1 = ii * INTERVAL - mod(t_val - INTERVAL * 0.75, INTERVAL);\nvec3 I1 = vec3((18.0 - t1) / 18.0);\ncol = mix(col, I1, dirt(mod(p_uv * max(0.0, t1) * 0.1 + vec2(0.2, -0.2) * t_val, 1.2), 3.5));\nfloat t2 = ii * INTERVAL - mod(t_val + INTERVAL * 0.5, INTERVAL);\nvec3 I2 = vec3((18.0 - t2) / 18.0);\ncol = mix(col, I2 * vec3(0.7, 0.8, 1.0) * 1.3, tex_func(p_uv * max(0.0, t2), 4.45));\nfloat t3 = ii * INTERVAL - mod(t_val - INTERVAL * 0.25, INTERVAL);\nvec3 I3 = vec3((18.0 - t3) / 18.0);\ncol = mix(col, I3, dirt(mod(p_uv * max(0.0, t3) * 0.1 + vec2(-0.2, -0.2) * t_val, 1.2), 3.5));\nfloat t4 = ii * INTERVAL - mod(t_val, INTERVAL);\nvec3 I4 = vec3((18.0 - t4) / 18.0);\nfloat r = length(p_uv * 2.0 * max(0.0, t4));\nfloat rr = sm(-24.0, 0.0, (r - mod(t_val * 30.0, 90.0)), 10.0);\ncol = mix(col, mix(I4, I4 * vec3(0.7, 0.5, 1.0) * 3.0, rr), tex_func(p_uv * 2.0 * max(0.0, t4), 0.27 + (2.0 * rr)));\n}\nreturn mix(vec4(0.0, 0.0, 0.0, source.a), vec4(col, source.a), mask);\n}",
    "uniformValues": {
      "target_color": [
        0.7176470588235294,
        0.6823529411764706,
        0.6823529411764706
      ],
      "color_threshold": 0.3,
      "color_smoothness": 0.1,
      "spped": 0.5
    }
  },
  {
    "id": "timeline-7c94a35d-752b-44d3-8047-f2db7a304c66",
    "name": "HD 3D Dual Relight",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: HD 3D Dual Relight\nuniform float lightHeight; // @min 0.01 @max 1.0 @default 0.15\nuniform float lightIntensity; // @min 0.0 @max 5.0 @default 2.5\nuniform float ambient; // @min 0.0 @max 1.0 @default 0.15\nuniform float shininess; // @min 1.0 @max 100.0 @default 40.0\nuniform float detail; // @min 0.1 @max 10.0 @default 3.0\nuniform vec3 lightColor1; // @default 0.0,0.8,1.0\nuniform vec3 lightColor2; // @default 1.0,0.2,0.5\nfloat getLuma(vec4 c) {\nreturn dot(c.rgb, vec3(0.299, 0.587, 0.114));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 texel = 1.0 / resolution;\nvec4 base = texture2D(tex, uv);\nfloat isNotBlack = step(0.01, max(max(base.r, base.g), base.b));\nfloat tl = getLuma(texture2D(tex, uv + vec2(-texel.x, -texel.y)));\nfloat tc = getLuma(texture2D(tex, uv + vec2(0.0, -texel.y)));\nfloat tr = getLuma(texture2D(tex, uv + vec2(texel.x, -texel.y)));\nfloat ml = getLuma(texture2D(tex, uv + vec2(-texel.x, 0.0)));\nfloat mr = getLuma(texture2D(tex, uv + vec2(texel.x, 0.0)));\nfloat bl = getLuma(texture2D(tex, uv + vec2(-texel.x, texel.y)));\nfloat bc = getLuma(texture2D(tex, uv + vec2(0.0, texel.y)));\nfloat br = getLuma(texture2D(tex, uv + vec2(texel.x, texel.y)));\nfloat dX = (tr + 2.0 * mr + br) - (tl + 2.0 * ml + bl);\nfloat dY = (bl + 2.0 * bc + br) - (tl + 2.0 * tc + tr);\nvec3 normal = normalize(vec3(dX * detail, dY * detail, 0.1));\nvec3 fragPos = vec3(uv, 0.0);\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 lightPos1 = vec3(0.5 + 0.4 * sin(time), 0.5 + 0.4 * cos(time * 1.3), lightHeight);\nvec3 lightPos2 = vec3(0.5 + 0.4 * cos(time * 1.1), 0.5 + 0.4 * sin(time * 0.8), lightHeight);\nvec3 L1 = normalize(lightPos1 - fragPos);\nvec3 H1 = normalize(L1 + viewDir);\nfloat diff1 = max(dot(normal, L1), 0.0);\nfloat spec1 = pow(max(dot(normal, H1), 0.0), shininess);\nvec3 dist1 = lightPos1 - fragPos;\nfloat att1 = 1.0 / (1.0 + 10.0 * dot(dist1, dist1));\nvec3 L2 = normalize(lightPos2 - fragPos);\nvec3 H2 = normalize(L2 + viewDir);\nfloat diff2 = max(dot(normal, L2), 0.0);\nfloat spec2 = pow(max(dot(normal, H2), 0.0), shininess);\nvec3 dist2 = lightPos2 - fragPos;\nfloat att2 = 1.0 / (1.0 + 10.0 * dot(dist2, dist2));\nvec3 ambientLight = base.rgb * ambient;\nvec3 diffuseLight = base.rgb * (diff1 * lightColor1 * att1 + diff2 * lightColor2 * att2) * lightIntensity;\nvec3 specularLight = (spec1 * lightColor1 * att1 + spec2 * lightColor2 * att2) * lightIntensity;\nvec3 finalColor = (ambientLight + diffuseLight + specularLight) * isNotBlack;\nreturn vec4(clamp(finalColor, 0.0, 1.0), base.a);\n}",
    "uniformValues": {
      "lightHeight": 0.01,
      "lightIntensity": 2.15,
      "ambient": 0.46,
      "shininess": 86.14,
      "detail": 4.357,
      "lightColor1": [
        0.5764705882352941,
        0.5333333333333333,
        0.807843137254902
      ],
      "lightColor2": [
        1,
        0.8666666666666667,
        0.2
      ]
    }
  },
  {
    "id": "timeline-777e4745-4552-45b6-8ecf-83f33311fbb1",
    "name": "Hexagon Dance Overlay",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Hexagon Dance Overlay\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\nuniform float intensity; // @min 0.0 @max 3.0 @default 1.0\nuniform float scale; // @min 0.1 @max 5.0 @default 0.3\n#define R3 1.732051\nvec4 HexCoords(vec2 uv) {\nvec2 s = vec2(1.0, R3);\nvec2 h = 0.5 * s;\nvec2 gv = s * uv;\nvec2 a = mod(gv, s) - h;\nvec2 b = mod(gv + h, s) - h;\nvec2 ab = dot(a, a) < dot(b, b) ? a : b;\nreturn vec4(ab, gv - ab);\n}\nfloat GetSize(vec2 id, float seed, float time) {\nfloat d = length(id);\nfloat t = time * 0.5;\nfloat a = sin(d * seed + t) + sin(d * seed * seed * 10.0 + t * 2.0);\nreturn a / 2.0 + 0.5;\n}\nmat2 Rot(float a) {\nfloat s = sin(a), c = cos(a);\nreturn mat2(c, -s, s, c);\n}\nfloat Hexagon(vec2 uv, float r, float time) {\nuv *= Rot(mix(0.0, 3.1415, r));\nr /= 0.7071;\nuv = vec2(-uv.y, uv.x);\nuv.x *= R3;\nuv = abs(uv);\nfloat d = dot(uv, normalize(vec2(1.0, 1.0))) - r;\nd = max(d, uv.y - r * 0.707);\nd = smoothstep(0.06, 0.02, abs(d));\nd += smoothstep(0.1, 0.09, abs(r - 0.5)) * sin(time);\nreturn d;\n}\nfloat Layer(vec2 uv, float s, float time) {\nvec4 hu = HexCoords(uv * 2.0);\nfloat d = Hexagon(hu.xy, GetSize(hu.zw, s, time), time);\nvec2 offs = vec2(1.0, 0.0);\nd += Hexagon(hu.xy - offs, GetSize(hu.zw + offs, s, time), time);\nd += Hexagon(hu.xy + offs, GetSize(hu.zw - offs, s, time), time);\noffs = vec2(0.5, 0.8725);\nd += Hexagon(hu.xy - offs, GetSize(hu.zw + offs, s, time), time);\nd += Hexagon(hu.xy + offs, GetSize(hu.zw - offs, s, time), time);\noffs = vec2(-0.5, 0.8725);\nd += Hexagon(hu.xy - offs, GetSize(hu.zw + offs, s, time), time);\nd += Hexagon(hu.xy + offs, GetSize(hu.zw - offs, s, time), time);\nreturn d;\n}\nfloat N(float p) {\nreturn fract(sin(p * 123.34) * 345.456);\n}\nvec3 Col(float p, float offs) {\nfloat n = N(p) * 1234.34;\nreturn sin(n * vec3(12.23, 45.23, 56.2) + offs * 3.0) * 0.5 + 0.5;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec2 UV = uv - 0.5;\nUV.x *= resolution.x / resolution.y;\nfloat duv = dot(UV, UV);\nfloat t = time * speed * 0.5 + 5.0;\nvec2 p_uv = UV * mix(1.0, 5.0, sin(t * 0.5) * 0.5 + 0.5) * scale;\np_uv *= Rot(t);\np_uv.x *= R3;\nvec3 col = vec3(0.0);\nfor(float i = 0.0; i < 1.0; i += 0.3333) {\nfloat id = floor(i + t);\nfloat ft = fract(i + t);\nfloat z = mix(5.0, 0.1, ft);\nfloat fade = smoothstep(0.0, 0.3, ft) * smoothstep(1.0, 0.7, ft);\ncol += fade * ft * Layer(p_uv * z, N(i + id), time) * Col(id, duv);\n}\ncol *= 2.0 * intensity;\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(0.01, 0.05, lum);\nfloat illumination = clamp(length(col), 0.0, 1.0);\nvec3 finalColor = (source.rgb * illumination) + (col * mask);\nreturn vec4(clamp(finalColor, 0.0, 1.0), source.a);\n}",
    "uniformValues": {
      "speed": 2.55,
      "intensity": 0.12,
      "scale": 0.541
    }
  },
  {
    "id": "timeline-82e68405-40e3-4aec-8fd4-915fce5f7be7",
    "name": "High Contrast Aura",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: High Contrast Aura\nuniform float speed; // @min 0.0 @max 100.0 @default 30.0\nuniform float softness; // @min 0.0 @max 10.0 @default 4.0\nuniform float sensitivity; // @min 0.0 @max 10.0 @default 5.0\nuniform float depth_mult; // @min 0.0 @max 1.0 @default 0.4\nuniform float shadow_threshold; // @min 0.0 @max 1.0 @default 0.1\nuniform float shadow_contrast; // @min 0.0 @max 5.0 @default 2.0\nuniform float glimmer; // @min 0.0 @max 1.0 @default 0.5\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 texel = 1.0 / max(resolution, vec2(1.0));\nvec4 base = texture2D(tex, uv);\nvec2 sO = texel * softness;\nvec4 s1 = texture2D(tex, uv + vec2(sO.x, 0.0));\nvec4 s2 = texture2D(tex, uv - vec2(sO.x, 0.0));\nvec4 s3 = texture2D(tex, uv + vec2(0.0, sO.y));\nvec4 s4 = texture2D(tex, uv - vec2(0.0, sO.y));\nvec4 blurred = (base + s1 + s2 + s3 + s4) * 0.2;\nvec3 lum = vec3(0.299, 0.587, 0.114);\nfloat h = dot(blurred.rgb, lum);\nfloat hx = dot(s1.rgb, lum);\nfloat hy = dot(s3.rgb, lum);\nvec3 n = normalize(vec3((h - hx) * depth_mult * 40.0, (h - hy) * depth_mult * 40.0, 0.2));\nfloat t = time * speed;\nvec3 lr = normalize(vec3(sin(t + blurred.r * sensitivity), cos(t * 1.1), 0.6));\nvec3 lg = normalize(vec3(sin(t * 1.2 + blurred.g * sensitivity), cos(t * 0.8), 0.6));\nvec3 lb = normalize(vec3(sin(t * 0.9 + blurred.b * sensitivity), cos(t * 1.3), 0.6));\nvec3 light;\nlight.r = max(dot(n, lr), 0.0);\nlight.g = max(dot(n, lg), 0.0);\nlight.b = max(dot(n, lb), 0.0);\nlight = max(vec3(0.0), light - shadow_threshold);\nlight = pow(light, vec3(1.0 + shadow_contrast));\nfloat spec = pow(max(dot(n, vec3(0.0, 0.0, 1.0)), 0.0), 32.0) * glimmer;\nvec3 finalRGB = base.rgb * (light * 3.0 + 0.1);\nfinalRGB += light * blurred.rgb * 1.2;\nfinalRGB += spec * light;\nreturn vec4(finalRGB, base.a);\n}",
    "uniformValues": {
      "speed": 10,
      "softness": 4.8,
      "sensitivity": 0,
      "depth_mult": 0.87,
      "shadow_threshold": 0.74,
      "shadow_contrast": 0,
      "glimmer": 0
    }
  },
  {
    "id": "timeline-7b32d234-c6eb-4e86-a661-75718a8e582d",
    "name": "Horizontal Symmetrical Hexagon",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Horizontal Symmetrical Hexagon\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\nuniform float intensity; // @min 0.0 @max 1.5 @default 0.5\nuniform float scale; // @min 0.1 @max 5.0 @default 0.3\nuniform float effectAmount; // @min 0.0 @max 1.0 @default 1.0\nuniform float blackLineScale; // @min 0.01 @max 1.0 @default 0.15\nuniform float blackLineThickness; // @min 0.01 @max 2.0 @default 0.1\nuniform float blackLineSpeed; // @min -5.0 @max 5.0 @default -1.0\nuniform float blackLineBlur; // @min 0.0 @max 2.0 @default 0.5\n#define R3 1.732051\nvec4 HexCoords(vec2 uv) {\nvec2 s = vec2(1.0, R3);\nvec2 h = 0.5 * s;\nvec2 gv = s * uv;\nvec2 a = mod(gv, s) - h;\nvec2 b = mod(gv + h, s) - h;\nvec2 ab = dot(a, a) < dot(b, b) ? a : b;\nreturn vec4(ab, gv - ab);\n}\nfloat GetSize(vec2 id, float seed, float time) {\nfloat d = length(id);\nfloat t = time * 0.5;\nreturn (sin(d * seed + t) + sin(d * seed * seed * 10.0 + t * 2.0)) / 2.0 + 0.5;\n}\nmat2 Rot(float a) {\nfloat s = sin(a), c = cos(a);\nreturn mat2(c, -s, s, c);\n}\nfloat Hexagon(vec2 uv, float r, float time, float thickness, float blur) {\nuv *= Rot(mix(0.0, 3.1415, r));\nr /= 0.7071;\nuv = vec2(-uv.y, uv.x);\nuv.x *= R3;\nuv = abs(uv);\nfloat d = dot(uv, normalize(vec2(1.0, 1.0))) - r;\nd = max(d, uv.y - r * 0.707);\nfloat edge = smoothstep(0.06 * thickness + blur, 0.02 * thickness, abs(d));\nfloat glow = smoothstep(0.25 * thickness + blur, 0.0, abs(d)) * 2.5;\nreturn edge + glow + smoothstep(0.1 * thickness + blur, 0.09 * thickness, abs(r - 0.5)) * sin(time);\n}\nfloat Layer(vec2 uv, float s, float time, float thickness, float blur) {\nvec4 hu = HexCoords(uv * 2.0);\nfloat d = Hexagon(hu.xy, GetSize(hu.zw, s, time), time, thickness, blur);\nvec2 offs = vec2(1.0, 0.0);\nd += Hexagon(hu.xy - offs, GetSize(hu.zw + offs, s, time), time, thickness, blur);\nd += Hexagon(hu.xy + offs, GetSize(hu.zw - offs, s, time), time, thickness, blur);\noffs = vec2(0.5, 0.8725);\nd += Hexagon(hu.xy - offs, GetSize(hu.zw + offs, s, time), time, thickness, blur);\nd += Hexagon(hu.xy + offs, GetSize(hu.zw - offs, s, time), time, thickness, blur);\noffs = vec2(-0.5, 0.8725);\nd += Hexagon(hu.xy - offs, GetSize(hu.zw + offs, s, time), time, thickness, blur);\nd += Hexagon(hu.xy + offs, GetSize(hu.zw - offs, s, time), time, thickness, blur);\nreturn d;\n}\nfloat N(float p) {\nreturn fract(sin(p * 123.34) * 345.456);\n}\nvec3 Col(float p, float offs) {\nfloat n = N(p) * 1234.34;\nreturn sin(n * vec3(12.23, 45.23, 56.2) + offs * 3.0) * 0.5 + 0.5;\n}\nvec3 GetAnimColor(vec2 UV, float time, float duv, float thickness, float blur, float timeMult) {\nfloat t = time * speed * timeMult * 0.5 + 5.0;\nvec2 p_uv = UV * mix(1.0, 5.0, sin(t * 0.5) * 0.5 + 0.5) * scale;\np_uv *= Rot(t);\np_uv.x *= R3;\nvec3 col = vec3(0.0);\nfor(float i = 0.0; i < 1.0; i += 0.3333) {\nfloat id = floor(i + t);\nfloat ft = fract(i + t);\nfloat z = mix(5.0, 0.1, ft);\nfloat fade = smoothstep(0.0, 0.3, ft) * smoothstep(1.0, 0.7, ft);\ncol += fade * ft * Layer(p_uv * z, N(i + id), time, thickness, blur) * Col(id, duv);\n}\nreturn col;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec2 UV = uv - 0.5;\nUV.x *= resolution.x / resolution.y;\nfloat duv = dot(UV, UV);\nUV.x = abs(UV.x);\nvec3 col1 = GetAnimColor(UV, time, duv, 1.0, 0.0, 1.0);\nvec3 illuminatedColor = source.rgb * col1 * 2.0 * intensity;\nfloat illumFactor = clamp(length(col1 * intensity), 0.0, 1.0);\nvec3 invertedSource = 1.0 - source.rgb;\nfloat brightness = dot(source.rgb, vec3(0.299, 0.587, 0.114));\ninvertedSource *= smoothstep(0.05, 0.2, brightness);\nvec3 effectColor = mix(invertedSource, illuminatedColor, illumFactor);\nvec3 finalColor = mix(source.rgb, effectColor, effectAmount);\nfloat whiteness = min(finalColor.r, min(finalColor.g, finalColor.b));\nfloat mask = smoothstep(0.8, 1.0, whiteness);\nif (mask > 0.0) {\nvec3 col2 = GetAnimColor(UV, time, duv, 1.0, 0.0, -1.0);\nvec3 reverseIlluminated = source.rgb * col2 * 2.0 * intensity;\nfinalColor = mix(finalColor, reverseIlluminated, mask);\n}\nvec3 col3 = GetAnimColor(UV * blackLineScale, time, duv, blackLineThickness, blackLineBlur, blackLineSpeed);\nfloat blackMask = smoothstep(0.2, 0.8, length(col3));\nfinalColor = mix(finalColor, vec3(0.0), blackMask * effectAmount * 0.85);\nreturn vec4(clamp(finalColor, 0.0, 1.0), source.a);\n}",
    "uniformValues": {
      "speed": 1,
      "intensity": 0.225,
      "scale": 0.982,
      "effectAmount": 1,
      "blackLineScale": 0.2476,
      "blackLineThickness": 0.2289,
      "blackLineSpeed": -0.1,
      "blackLineBlur": 0.08
    }
  },
  {
    "id": "timeline-633e9496-efb2-48e9-bed6-e2e1832a4018",
    "name": "Hue Scanner Multi Negative Dots",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Hue Scanner Multi Negative Dots\nuniform float rangeWidth; // @min 0.0 @max 1.0 @default 0.2\nuniform float speed; // @min -2.0 @max 2.0 @default 0.5\nuniform float p; // @min 0.0 @max 10.0 @default 5.0\nuniform float dotGrid; // @min 1.0 @max 100.0 @default 10.0\nuniform float dotSize; // @min 0.0 @max 1.0 @default 0.5\nuniform float dotsblur; // @min 0.0 @max 1.0 @default 0.5\nuniform float gridGrowth; // @min 0.0 @max 5.0 @default 1.0\nuniform float gridDistortion; // @min 0.0 @max 5.0 @default 2.0\nuniform float colorFreq; // @min 0.1 @max 10.0 @default 2.0\nuniform float colorSpeed; // @min -5.0 @max 5.0 @default 1.0\nuniform float tint; // @min 0.0 @max 1.0 @default 0.5\nvec3 rgb2hsv(vec3 c) {\nvec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\nvec4 p_vec = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\nvec4 q = mix(vec4(p_vec.xyw, c.r), vec4(c.r, p_vec.yzx), step(p_vec.x, c.r));\nfloat d = q.x - min(q.w, q.y);\nfloat e = 1.0e-10;\nreturn vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\nvec3 hsv2rgb(vec3 c) {\nvec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\nvec3 p_vec = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\nreturn c.z * mix(K.xxx, clamp(p_vec - K.xxx, 0.0, 1.0), c.y);\n}\nfloat getDots(float tOffset, vec2 centeredUv, float distFromCenter, float time) {\nfloat t = time + tOffset;\nfloat linearProgress = abs(fract(t * gridGrowth * 0.5) * 2.0 - 1.0);\nfloat loopProgress = smoothstep(0.0, 1.0, linearProgress);\nfloat scale = exp(-loopProgress * 3.0);\nfloat fade = smoothstep(0.0, 0.2, loopProgress) * (1.0 - smoothstep(0.8, 1.0, loopProgress));\nfloat distortion = exp(-distFromCenter * gridDistortion);\nvec2 gridUv = centeredUv * dotGrid * scale * distortion;\nvec2 dotUv = fract(gridUv) - 0.5;\nfloat currentDotSize = dotSize * distFromCenter * 2.0;\nfloat d = 1.0 - smoothstep(max(0.0, currentDotSize - dotsblur), currentDotSize + dotsblur + 0.001, length(dotUv));\nreturn d * fade;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec3 hsv = rgb2hsv(source.rgb);\nfloat targetHue = fract(time * speed);\nfloat dist = abs(fract(hsv.x - targetHue + 0.5) - 0.5);\nfloat mask = step(dist, rangeWidth * 0.5);\nvec2 aspect = vec2(resolution.x / resolution.y, 1.0);\nvec2 centeredUv = (uv - 0.5) * aspect;\nfloat distFromCenter = length(centeredUv);\nfloat d1 = getDots(0.0, centeredUv, distFromCenter, time);\nfloat d2 = getDots(0.33, centeredUv, distFromCenter, time);\nfloat d3 = getDots(0.66, centeredUv, distFromCenter, time);\nfloat dots = abs(d1 - d2 - d3);\nfloat isNotBlack = step(0.05, length(source.rgb));\ndots *= isNotBlack;\nvec3 scannerColor = source.rgb * p * mask * (1.0 - dots);\nvec3 generatedColor = hsv2rgb(vec3(distFromCenter * colorFreq - time * colorSpeed, 1.0, 1.0));\nvec3 dotPatternColor = mix(source.rgb, generatedColor, tint);\nvec3 dotsColor = dotPatternColor * dots * (1.0 - mask);\nreturn vec4(scannerColor + dotsColor, source.a);\n}",
    "uniformValues": {
      "rangeWidth": 0,
      "speed": 1.96,
      "p": 0.4,
      "dotGrid": 100,
      "dotSize": 0.35,
      "dotsblur": 0.09,
      "gridGrowth": 1.1,
      "gridDistortion": 0,
      "colorFreq": 10,
      "colorSpeed": -1.2,
      "tint": 0.28
    }
  },
  {
    "id": "timeline-0c40c349-9ff2-4f93-b52f-09ba2b6cf9f3",
    "name": "Hue Scanner PingPong Ease Dots",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Hue Scanner PingPong Ease Dots\nuniform float rangeWidth; // @min 0.0 @max 1.0 @default 0.2\nuniform float speed; // @min -2.0 @max 2.0 @default 0.5\nuniform float p; // @min 0.0 @max 10.0 @default 5.0\nuniform float dotGrid; // @min 1.0 @max 100.0 @default 10.0\nuniform float dotSize; // @min 0.0 @max 1.0 @default 0.5\nuniform float dotsblur; // @min 0.0 @max 1.0 @default 0.5\nuniform float gridGrowth; // @min 0.0 @max 5.0 @default 1.0\nuniform float gridDistortion; // @min 0.0 @max 5.0 @default 2.0\nuniform float colorFreq; // @min 0.1 @max 10.0 @default 2.0\nuniform float colorSpeed; // @min -5.0 @max 5.0 @default 1.0\nuniform float tint; // @min 0.0 @max 1.0 @default 0.5\nvec3 rgb2hsv(vec3 c) {\nvec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\nvec4 p_vec = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\nvec4 q = mix(vec4(p_vec.xyw, c.r), vec4(c.r, p_vec.yzx), step(p_vec.x, c.r));\nfloat d = q.x - min(q.w, q.y);\nfloat e = 1.0e-10;\nreturn vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\nvec3 hsv2rgb(vec3 c) {\nvec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\nvec3 p_vec = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\nreturn c.z * mix(K.xxx, clamp(p_vec - K.xxx, 0.0, 1.0), c.y);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec3 hsv = rgb2hsv(source.rgb);\nfloat targetHue = fract(time * speed);\nfloat dist = abs(fract(hsv.x - targetHue + 0.5) - 0.5);\nfloat mask = step(dist, rangeWidth * 0.5);\nvec2 aspect = vec2(resolution.x / resolution.y, 1.0);\nvec2 centeredUv = (uv - 0.5) * aspect;\nfloat distFromCenter = length(centeredUv);\nfloat linearProgress = abs(fract(time * gridGrowth * 0.5) * 2.0 - 1.0);\nfloat loopProgress = smoothstep(0.0, 1.0, linearProgress);\nfloat scale = exp(-loopProgress * 3.0);\nfloat fade = smoothstep(0.0, 0.2, loopProgress) * (1.0 - smoothstep(0.8, 1.0, loopProgress));\nfloat distortion = exp(-distFromCenter * gridDistortion);\nvec2 gridUv = centeredUv * dotGrid * scale * distortion;\nvec2 dotUv = fract(gridUv) - 0.5;\nfloat currentDotSize = dotSize * distFromCenter * 2.0;\nfloat dots = 1.0 - smoothstep(max(0.0, currentDotSize - dotsblur), currentDotSize + dotsblur + 0.001, length(dotUv));\nfloat isNotBlack = step(0.05, length(source.rgb));\ndots *= isNotBlack;\nvec3 scannerColor = source.rgb * p * mask * (1.0 - dots);\nvec3 generatedColor = hsv2rgb(vec3(distFromCenter * colorFreq - time * colorSpeed, 1.0, 1.0));\nvec3 dotPatternColor = mix(source.rgb, generatedColor, tint);\nvec3 dotsColor = dotPatternColor * dots * (1.0 - mask) * fade;\nreturn vec4(scannerColor + dotsColor, source.a);\n}",
    "uniformValues": {
      "rangeWidth": 0.5,
      "speed": -1.88,
      "p": 10,
      "dotGrid": 71.29,
      "dotSize": 1,
      "dotsblur": 0.38,
      "gridGrowth": 2.45,
      "gridDistortion": 2,
      "colorFreq": 0.298,
      "colorSpeed": 3.6,
      "tint": 0.22
    }
  },
  {
    "id": "timeline-b0b6b1db-4a2f-4fc8-a6e9-659406d58bf7",
    "name": "Hue Scanner PingPong Ease Dots",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Hue Scanner PingPong Ease Dots\nuniform float rangeWidth; // @min 0.0 @max 1.0 @default 0.2\nuniform float speed; // @min -2.0 @max 2.0 @default 0.5\nuniform float p; // @min 0.0 @max 10.0 @default 5.0\nuniform float dotGrid; // @min 1.0 @max 100.0 @default 10.0\nuniform float dotSize; // @min 0.0 @max 1.0 @default 0.5\nuniform float dotsblur; // @min 0.0 @max 1.0 @default 0.5\nuniform float gridGrowth; // @min 0.0 @max 5.0 @default 1.0\nuniform float gridDistortion; // @min 0.0 @max 5.0 @default 2.0\nuniform float colorFreq; // @min 0.1 @max 10.0 @default 2.0\nuniform float colorSpeed; // @min -5.0 @max 5.0 @default 1.0\nuniform float tint; // @min 0.0 @max 1.0 @default 0.5\nvec3 rgb2hsv(vec3 c) {\nvec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\nvec4 p_vec = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\nvec4 q = mix(vec4(p_vec.xyw, c.r), vec4(c.r, p_vec.yzx), step(p_vec.x, c.r));\nfloat d = q.x - min(q.w, q.y);\nfloat e = 1.0e-10;\nreturn vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\nvec3 hsv2rgb(vec3 c) {\nvec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\nvec3 p_vec = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\nreturn c.z * mix(K.xxx, clamp(p_vec - K.xxx, 0.0, 1.0), c.y);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec3 hsv = rgb2hsv(source.rgb);\nfloat targetHue = fract(time * speed);\nfloat dist = abs(fract(hsv.x - targetHue + 0.5) - 0.5);\nfloat mask = step(dist, rangeWidth * 0.5);\nvec2 aspect = vec2(resolution.x / resolution.y, 1.0);\nvec2 centeredUv = (uv - 0.5) * aspect;\nfloat distFromCenter = length(centeredUv);\nfloat linearProgress = abs(fract(time * gridGrowth * 0.5) * 2.0 - 1.0);\nfloat loopProgress = smoothstep(0.0, 1.0, linearProgress);\nfloat scale = exp(-loopProgress * 3.0);\nfloat fade = smoothstep(0.0, 0.2, loopProgress) * (1.0 - smoothstep(0.8, 1.0, loopProgress));\nfloat distortion = exp(-distFromCenter * gridDistortion);\nvec2 gridUv = centeredUv * dotGrid * scale * distortion;\nvec2 dotUv = fract(gridUv) - 0.5;\nfloat currentDotSize = dotSize * distFromCenter * 2.0;\nfloat dots = 1.0 - smoothstep(max(0.0, currentDotSize - dotsblur), currentDotSize + dotsblur + 0.001, length(dotUv));\nfloat isNotBlack = step(0.05, length(source.rgb));\ndots *= isNotBlack;\nvec3 scannerColor = source.rgb * p * mask * (1.0 - dots);\nvec3 generatedColor = hsv2rgb(vec3(distFromCenter * colorFreq - time * colorSpeed, 1.0, 1.0));\nvec3 dotPatternColor = mix(source.rgb, generatedColor, tint);\nvec3 dotsColor = dotPatternColor * dots * (1.0 - mask) * fade;\nreturn vec4(scannerColor + dotsColor, source.a);\n}",
    "uniformValues": {
      "rangeWidth": 0.9,
      "speed": -2,
      "p": 10,
      "dotGrid": 71.29,
      "dotSize": 0.4,
      "dotsblur": 0.26,
      "gridGrowth": 2.45,
      "gridDistortion": 2.7,
      "colorFreq": 0.298,
      "colorSpeed": -1.8,
      "tint": 0.22
    }
  },
  {
    "id": "timeline-4065d5af-ea65-4cb2-90c4-a03179d25503",
    "name": "Hue Scanner",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Hue Scanner\nuniform float rangeWidth; // @min 0.0 @max 1.0 @default 0.2\nuniform float speed; // @min -2.0 @max 2.0 @default 0.5\nvec3 rgb2hsv(vec3 c) {\nvec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\nvec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\nvec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));\nfloat d = q.x - min(q.w, q.y);\nfloat e = 1.0e-10;\nreturn vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec3 hsv = rgb2hsv(source.rgb);\nfloat targetHue = fract(time * speed);\nfloat dist = abs(fract(hsv.x - targetHue + 0.5) - 0.5);\nfloat mask = step(dist, rangeWidth * 0.5);\nreturn vec4(source.rgb * mask, source.a);\n}",
    "uniformValues": {
      "rangeWidth": 0.21,
      "speed": 1.28
    }
  },
  {
    "id": "timeline-274e18f9-c35e-4cc4-a4f6-ff06054779b0",
    "name": "Infinity Cube Delayed",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Infinity Cube Delayed\nuniform float size; // @min 0.1 @max 1.0 @default 0.4\nuniform float thickness; // @min 0.005 @max 0.05 @default 0.01\nuniform float speed; // @min 0.1 @max 3.0 @default 1.0\nuniform float delay; // @min 0.0 @max 2.0 @default 0.5\nuniform float glow; // @min 0.001 @max 0.01 @default 0.003\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.02\nuniform float spacing; // @min 1.5 @max 5.0 @default 2.5\nuniform float nearClip; // @min 0.0 @max 15.0 @default 3.0\nuniform float farClip; // @min 5.0 @max 30.0 @default 15.0\nuniform float count; // @min 0.0 @max 5.0 @default 2.0\nuniform float sourceMix; // @min 0.0 @max 1.0 @default 1.0\nuniform vec3 color1; // @default 1.0,0.2,0.2\nuniform vec3 color2; // @default 0.2,1.0,0.2\nuniform vec3 color3; // @default 0.2,0.2,1.0\nmat2 node_rot(float a) {\nfloat s = sin(a), c = cos(a);\nreturn mat2(c, -s, s, c);\n}\nfloat sdFrame(vec3 p, float s, float e) {\np = abs(p) - s;\nvec3 q = abs(p + e) - e;\nreturn min(min(\nlength(max(vec3(p.x, q.y, q.z), 0.0)) + min(max(p.x, max(q.y, q.z)), 0.0),\nlength(max(vec3(q.x, p.y, q.z), 0.0)) + min(max(q.x, max(p.y, q.z)), 0.0)),\nlength(max(vec3(q.x, q.y, p.z), 0.0)) + min(max(q.x, max(q.y, p.z)), 0.0));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 src = texture2D(tex, uv);\nif (max(src.r, max(src.g, src.b)) <= blackThreshold) return src;\nvec2 p = (uv - 0.5) * 2.0;\np.x *= resolution.x / resolution.y;\nvec3 ro = vec3(0.0, 0.0, 5.0), rd = normalize(vec3(p, -2.0)), glowCol = vec3(0.0);\nfloat t = 0.0, animCount = (0.5 + 0.5 * sin(time * speed)) * count;\nfor(int i = 0; i < 40; i++) {\nvec3 pos = ro + rd * t;\nvec3 cell = floor(pos / spacing + 0.5);\nvec3 clampedCell = clamp(cell, -animCount, animCount);\nvec3 q = pos - clampedCell * spacing;\nfloat distCenter = length(clampedCell * spacing);\nfloat rotBase = time * speed - distCenter * delay;\nfloat colorVal = distCenter * 0.4 - time * speed;\nvec3 c1 = mix(color1, color2, 0.5 + 0.5 * sin(colorVal));\nvec3 c2 = mix(color2, color3, 0.5 + 0.5 * sin(colorVal + 2.0));\nvec3 c3 = mix(color3, color1, 0.5 + 0.5 * sin(colorVal + 4.0));\nvec3 q1 = q; q1.xy *= node_rot(rotBase * 0.4); q1.xz *= node_rot(rotBase * 0.7);\nfloat d1 = sdFrame(q1, size, thickness);\nvec3 q2 = q; q2.xy *= node_rot(rotBase * 0.55); q2.xz *= node_rot(rotBase * 0.8);\nfloat d2 = sdFrame(q2, size * 0.7, thickness);\nvec3 q3 = q; q3.xy *= node_rot(rotBase * 0.7); q3.xz *= node_rot(rotBase * 0.9);\nfloat d3 = sdFrame(q3, size * 0.4, thickness);\nfloat dScene = min(d1, min(d2, d3));\nfloat fade = smoothstep(nearClip, nearClip + 0.5, t) * (1.0 - smoothstep(farClip - 2.0, farClip, t));\nglowCol += fade * c1 * (glow / (d1 + 0.04));\nglowCol += fade * c2 * (glow / (d2 + 0.04));\nglowCol += fade * c3 * (glow / (d3 + 0.04));\nif(t > farClip || (t > nearClip && dScene < 0.001)) break;\nt += (t < nearClip) ? max(dScene, 0.2) : dScene * 0.8;\n}\nreturn vec4(src.rgb * sourceMix + glowCol, src.a);\n}",
    "uniformValues": {
      "size": 0.217,
      "thickness": 0.00995,
      "speed": 1,
      "delay": 0.5,
      "glow": 0.003,
      "blackThreshold": 0,
      "spacing": 2.5,
      "nearClip": 3,
      "farClip": 15,
      "count": 2,
      "sourceMix": 1,
      "color1": [
        1,
        0.2,
        0.2
      ],
      "color2": [
        0.2,
        1,
        0.2
      ],
      "color3": [
        0.2,
        0.2,
        1
      ]
    }
  },
  {
    "id": "timeline-32d298fe-8cbb-4bb2-a9b2-57d67e97a715",
    "name": "Inverted Fractal Edge",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Inverted Fractal Edge\nuniform float speed; // @min 0.1 @max 2.0 @default 0.5\nuniform float intensity; // @min 0.0 @max 2.0 @default 1.0\nuniform float zoom; // @min 0.2 @max 4.0 @default 1.0\nuniform float symmetry; // @min 0.0 @max 1.0 @default 1.0\nuniform float mask_strength; // @min 0.0 @max 1.0 @default 0.5\nuniform vec3 color_tint; // @default 1.0,1.0,1.0\nuniform float edge_boost; // @min 0.0 @max 5.0 @default 2.5\nuniform float edge_width; // @min 0.5 @max 3.0 @default 1.0\nfloat sigm(float x) { return x / (1.0 + abs(x)); }\nfloat iter(vec2 p, float t, float m, float stereo) {\nvec4 a = 3.14159 * vec4(0.1, -0.11, 0.111, -0.1111);\nvec4 scale = (1.0 / (1.0 + 0.5 * dot(p, p))) * pow(vec4(2.0), -4.0 * fract(vec4(t, t+0.05, t+0.1, t+0.15)));\nvec4 ms = 0.5 - 0.5 * cos(6.28318 * fract(vec4(t, t+0.05, t+0.1, t+0.15)));\nvec4 angle = (t + m) * a;\nvec4 v = ms * sin(1.88 * (t + m) + (m + 25.0 * scale) * ((p.x + stereo/scale) * cos(angle) + p.y * sin(angle)));\nreturn sigm(v.x + v.y + v.z + v.w + m);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat isNotBlack = step(0.01, source.r + source.g + source.b);\nvec2 off = edge_width / resolution;\nvec3 luma = vec3(0.299, 0.587, 0.114);\nfloat h = dot(texture2D(tex, uv + vec2(off.x, 0.0)).rgb, luma) -\ndot(texture2D(tex, uv - vec2(off.x, 0.0)).rgb, luma);\nfloat v = dot(texture2D(tex, uv + vec2(0.0, off.y)).rgb, luma) -\ndot(texture2D(tex, uv - vec2(0.0, off.y)).rgb, luma);\nfloat edge = sqrt(h*h + v*v);\nvec2 sym_uv = mix(uv, abs(uv - 0.5) + 0.5, symmetry);\nvec2 p = (sym_uv * 2.0 - 1.0) * vec2(resolution.x / resolution.y, 1.0) / zoom;\nfloat blur = 0.5 * dot(p, p);\nfloat gt = (time * speed) + 1100.0;\nfloat t = 0.04 * gt + 0.05 * sin(0.258 * mod(0.0411 * gt, 1.0));\nfloat stereo = sigm(2.0 * (sin(1.325 * t * cos(0.5 * t)) + sin(-0.7 * t * sin(0.77 * t))));\np += 0.5 * sin(0.33 * t) * vec2(cos(t), sin(t));\nfloat p0 = iter(p, t, 0.0, stereo);\nfloat p1 = iter(p, t, p0, stereo);\nfloat p2 = sigm(p0 / (p1 + blur));\nfloat p5 = iter(p, t, sigm(iter(p, t, p2, stereo) / (p2 + blur)), stereo);\nvec3 c = max(vec3(0.0), 0.4 + 0.6 * vec3(sigm(p0 + p1 + p5), sigm(p0 - p1 + p2), sigm(p0 + p1 + p2 + p5))) * color_tint;\nfloat mask = sigm(((max(0.0, 0.4 - min(abs(p1), abs(p5))) / 0.4) - 0.5) * 70.0 / (1.0 + 10.0 * blur)) * 0.5 + 0.5;\nvec3 fractalRGB = c * intensity * mask * (1.0 - 0.4 * blur);\nvec3 invertedEdge = (vec3(1.0) - c) * edge * edge_boost;\nvec3 finalRGB = fractalRGB + invertedEdge;\nfloat alphaMask = mix(1.0, clamp(source.a * (source.r + source.g + source.b), 0.0, 1.0), mask_strength);\nreturn vec4(finalRGB, 1.0) * alphaMask * isNotBlack;\n}",
    "uniformValues": {
      "speed": 0.157,
      "intensity": 1.16,
      "zoom": 0.884,
      "symmetry": 1,
      "mask_strength": 1,
      "color_tint": [
        0.9921568627450981,
        0.984313725490196,
        0.996078431372549
      ],
      "edge_boost": 0.6,
      "edge_width": 0.5
    }
  },
  {
    "id": "timeline-c4b30a0c-5b34-4ede-9bbd-5a0e9fc1a9c7",
    "name": "Inverted Fractal Edge",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Inverted Fractal Edge\nuniform float speed; // @min 0.1 @max 2.0 @default 0.5\nuniform float intensity; // @min 0.0 @max 2.0 @default 1.0\nuniform float zoom; // @min 0.2 @max 4.0 @default 1.0\nuniform float symmetry; // @min 0.0 @max 1.0 @default 1.0\nuniform float mask_strength; // @min 0.0 @max 1.0 @default 0.5\nuniform vec3 color_tint; // @default 1.0,1.0,1.0\nuniform float edge_boost; // @min 0.0 @max 5.0 @default 2.5\nuniform float edge_width; // @min 0.5 @max 3.0 @default 1.0\nfloat sigm(float x) { return x / (1.0 + abs(x)); }\nfloat iter(vec2 p, float t, float m, float stereo) {\nvec4 a = 3.14159 * vec4(0.1, -0.11, 0.111, -0.1111);\nvec4 scale = (1.0 / (1.0 + 0.5 * dot(p, p))) * pow(vec4(2.0), -4.0 * fract(vec4(t, t+0.05, t+0.1, t+0.15)));\nvec4 ms = 0.5 - 0.5 * cos(6.28318 * fract(vec4(t, t+0.05, t+0.1, t+0.15)));\nvec4 angle = (t + m) * a;\nvec4 v = ms * sin(1.88 * (t + m) + (m + 25.0 * scale) * ((p.x + stereo/scale) * cos(angle) + p.y * sin(angle)));\nreturn sigm(v.x + v.y + v.z + v.w + m);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat isNotBlack = step(0.01, source.r + source.g + source.b);\nvec2 off = edge_width / resolution;\nvec3 luma = vec3(0.299, 0.587, 0.114);\nfloat h = dot(texture2D(tex, uv + vec2(off.x, 0.0)).rgb, luma) -\ndot(texture2D(tex, uv - vec2(off.x, 0.0)).rgb, luma);\nfloat v = dot(texture2D(tex, uv + vec2(0.0, off.y)).rgb, luma) -\ndot(texture2D(tex, uv - vec2(0.0, off.y)).rgb, luma);\nfloat edge = sqrt(h*h + v*v);\nvec2 sym_uv = mix(uv, abs(uv - 0.5) + 0.5, symmetry);\nvec2 p = (sym_uv * 2.0 - 1.0) * vec2(resolution.x / resolution.y, 1.0) / zoom;\nfloat blur = 0.5 * dot(p, p);\nfloat gt = (time * speed) + 1100.0;\nfloat t = 0.04 * gt + 0.05 * sin(0.258 * mod(0.0411 * gt, 1.0));\nfloat stereo = sigm(2.0 * (sin(1.325 * t * cos(0.5 * t)) + sin(-0.7 * t * sin(0.77 * t))));\np += 0.5 * sin(0.33 * t) * vec2(cos(t), sin(t));\nfloat p0 = iter(p, t, 0.0, stereo);\nfloat p1 = iter(p, t, p0, stereo);\nfloat p2 = sigm(p0 / (p1 + blur));\nfloat p5 = iter(p, t, sigm(iter(p, t, p2, stereo) / (p2 + blur)), stereo);\nvec3 c = max(vec3(0.0), 0.4 + 0.6 * vec3(sigm(p0 + p1 + p5), sigm(p0 - p1 + p2), sigm(p0 + p1 + p2 + p5))) * color_tint;\nfloat mask = sigm(((max(0.0, 0.4 - min(abs(p1), abs(p5))) / 0.4) - 0.5) * 70.0 / (1.0 + 10.0 * blur)) * 0.5 + 0.5;\nvec3 fractalRGB = c * intensity * mask * (1.0 - 0.4 * blur);\nvec3 invertedEdge = (vec3(1.0) - c) * edge * edge_boost;\nvec3 finalRGB = fractalRGB + invertedEdge;\nfloat alphaMask = mix(1.0, clamp(source.a * (source.r + source.g + source.b), 0.0, 1.0), mask_strength);\nreturn vec4(finalRGB, 1.0) * alphaMask * isNotBlack;\n}",
    "uniformValues": {
      "speed": 0.157,
      "intensity": 1.16,
      "zoom": 0.884,
      "symmetry": 0.52,
      "mask_strength": 1,
      "color_tint": [
        0.49411764705882355,
        0.16470588235294117,
        0.027450980392156862
      ],
      "edge_boost": 4.35,
      "edge_width": 0.5
    }
  },
  {
    "id": "timeline-254705eb-4fb7-44d0-b4e3-19ea69d33fe5",
    "name": "Isolated Psychedelic Snake",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Isolated Psychedelic Snake\nuniform float scale; // @min 1.0 @max 50.0 @default 10.0\nuniform float speed; // @min 0.0 @max 5.0 @default 0.5\nuniform float dash_freq; // @min 1.0 @max 20.0 @default 8.0\nuniform float thickness; // @min 0.01 @max 0.5 @default 0.15\nuniform float blur; // @min 0.0 @max 0.2 @default 0.05\nuniform float dark_threshold; // @min 0.0 @max 1.0 @default 0.1\nuniform float warp_strength; // @min -0.5 @max 0.5 @default 0.1\nuniform float chrome_mix; // @min 0.0 @max 1.0 @default 0.85\nuniform float ripple_strength; // @min 0.0 @max 0.2 @default 0.05\nvec3 rgb2hsv(vec3 c) {\nvec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\nvec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\nvec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));\nfloat d = q.x - min(q.w, q.y);\nfloat e = 1.0e-10;\nreturn vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 aspect = vec2(resolution.x / resolution.y, 1.0);\nvec2 dir = (uv - 0.5) * aspect;\nfloat dist = length(dir);\nfloat wave = fract(time);\nfloat radius = 1.0 - wave;\nfloat ripple = exp(-30.0 * abs(dist - radius)) * sin((dist - radius) * 40.0);\nuv += (dist > 0.001 ? (dir / dist) : vec2(0.0)) * ripple * ripple_strength / aspect;\nvec4 src = texture2D(tex, uv);\nvec4 result = vec4(0.0);\nif (length(src.rgb) >= dark_threshold && src.a >= 0.01) {\nvec3 hsv = rgb2hsv(src.rgb);\nbool isVioletToGreen = (hsv.x > 0.70 || hsv.x < 0.35);\nbool isColorful = hsv.y > 0.2 && hsv.z > 0.2;\nif (isVioletToGreen && isColorful) {\nvec2 p = uv;\np.x = abs(p.x - 0.5);\nfloat dyn_scale = scale + sin(time * 0.5) * 3.0;\nfloat dyn_dash = dash_freq + cos(time * 0.8) * 4.0;\np *= dyn_scale;\nvec2 ip = floor(p);\nvec2 fp = fract(p);\nfloat h = fract(sin(dot(ip, vec2(12.9898, 78.233))) * 43758.5453);\nif (h > 0.5) {\nfp.x = 1.0 - fp.x;\n}\nfloat d1 = length(fp);\nfloat d2 = length(fp - vec2(1.0));\nfloat d = min(abs(d1 - 0.5), abs(d2 - 0.5));\nfloat dyn_thick = thickness + sin(time * 1.2) * 0.05;\nfloat path = smoothstep(dyn_thick, dyn_thick - blur, d);\nfloat arcLen = min(d1, d2);\nfloat dash = step(0.5, fract((arcLen - time * speed) * dyn_dash));\nfloat mask = path * dash;\nif (mask > 0.01) {\nvec2 centerDir = uv - 0.5;\nvec2 warpedUV = uv + centerDir * mask * warp_strength;\nvec4 warpedSrc = texture2D(tex, warpedUV);\nfloat nx = clamp(d / dyn_thick, 0.0, 1.0);\nfloat ny = sqrt(max(1.0 - nx * nx, 0.0));\nvec3 normal = vec3(nx, ny, 0.0);\nfloat diff = max(dot(normal, normalize(vec3(1.0, 1.0, 1.0))), 0.0);\nvec3 chrome = vec3(diff) * hsv.z;\nvec4 snakeColor = mix(warpedSrc, vec4(chrome, src.a), chrome_mix);\nresult = vec4(snakeColor.rgb, src.a * mask);\n}\n}\n}\nreturn result;\n}",
    "uniformValues": {
      "scale": 18.15,
      "speed": 3.05,
      "dash_freq": 8.98,
      "thickness": 0.1962,
      "blur": 0.036,
      "dark_threshold": 0.45,
      "warp_strength": -0.35,
      "chrome_mix": 0.35,
      "ripple_strength": 0.2
    }
  },
  {
    "id": "timeline-10b868ff-908a-4b91-b679-7763f851eecd",
    "name": "Looping Color Relight",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Looping Color Relight\nuniform float lightHeight; // @min 0.01 @max 1.0 @default 0.15\nuniform float lightIntensity; // @min 0.0 @max 5.0 @default 2.5\nuniform float ambient; // @min 0.0 @max 1.0 @default 0.15\nuniform float shininess; // @min 1.0 @max 100.0 @default 40.0\nuniform float detail; // @min 0.1 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float colorSpeed; // @min 0.0 @max 5.0 @default 1.0\nfloat getLuma(vec3 c) {\nreturn dot(c, vec3(0.299, 0.587, 0.114));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 texel = 1.0 / resolution;\nvec4 base = texture2D(tex, uv);\nfloat maxColor = max(max(base.r, base.g), base.b);\nfloat isNotBlack = smoothstep(max(0.0, blackThreshold - 0.02), blackThreshold + 0.02, maxColor);\nfloat l = getLuma(texture2D(tex, uv + vec2(-texel.x, 0.0)).rgb);\nfloat r = getLuma(texture2D(tex, uv + vec2(texel.x, 0.0)).rgb);\nfloat u = getLuma(texture2D(tex, uv + vec2(0.0, -texel.y)).rgb);\nfloat d = getLuma(texture2D(tex, uv + vec2(0.0, texel.y)).rgb);\nfloat dX = r - l;\nfloat dY = d - u;\nvec3 normal = normalize(vec3(dX * detail, dY * detail, 0.2));\nvec3 fragPos = vec3(uv, 0.0);\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 lp1 = vec3(0.5 + 0.4 * sin(time), 0.5 + 0.4 * cos(time * 1.3), lightHeight);\nvec3 lp2 = vec3(0.5 + 0.4 * cos(time * 1.1), 0.5 + 0.4 * sin(time * 0.8), lightHeight);\nvec3 l1 = lp1 - fragPos;\nvec3 l2 = lp2 - fragPos;\nfloat distSq1 = dot(l1, l1);\nfloat distSq2 = dot(l2, l2);\nvec3 L1 = l1 * inversesqrt(distSq1);\nvec3 L2 = l2 * inversesqrt(distSq2);\nvec3 H1 = normalize(L1 + viewDir);\nvec3 H2 = normalize(L2 + viewDir);\nfloat diff1 = max(dot(normal, L1), 0.0);\nfloat diff2 = max(dot(normal, L2), 0.0);\nfloat spec1 = pow(max(dot(normal, H1), 0.0), shininess);\nfloat spec2 = pow(max(dot(normal, H2), 0.0), shininess);\nfloat att1 = 1.0 / (1.0 + 10.0 * distSq1);\nfloat att2 = 1.0 / (1.0 + 10.0 * distSq2);\nfloat t = time * colorSpeed;\nvec3 animColor1 = vec3(0.5 + 0.5 * sin(t), 0.5 + 0.5 * sin(t + 2.094), 0.5 + 0.5 * sin(t + 4.188));\nvec3 animColor2 = vec3(0.5 + 0.5 * cos(t * 1.2), 0.5 + 0.5 * cos(t * 1.2 + 2.094), 0.5 + 0.5 * cos(t * 1.2 + 4.188));\nvec3 ambientLight = base.rgb * ambient;\nvec3 diffuseLight = base.rgb * (diff1 * animColor1 * att1 + diff2 * animColor2 * att2) * lightIntensity;\nvec3 specularLight = (spec1 * animColor1 * att1 + spec2 * animColor2 * att2) * lightIntensity;\nvec3 finalColor = (ambientLight + diffuseLight + specularLight) * isNotBlack;\nreturn vec4(clamp(finalColor, 0.0, 1.0), base.a);\n}",
    "uniformValues": {
      "lightHeight": 0.01,
      "lightIntensity": 3,
      "ambient": 0,
      "shininess": 40,
      "detail": 10,
      "blackThreshold": 0.41,
      "colorSpeed": 1
    }
  },
  {
    "id": "timeline-81783f1e-7c39-4459-bedb-091e6b6e4309",
    "name": "Masked Dual Light Spiral",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Masked Dual Light Spiral\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float speed2; // @min -10.0 @max 10.0 @default 3.0\nuniform float lineLength; // @min 1.0 @max 10.0 @default 1.0\nuniform float delay; // @min 0.0 @max 5.0 @default 2.0\nuniform float distOffset; // @min 0.0 @max 20.0 @default 10.0\nuniform float centerBlur; // @min 0.0 @max 0.5 @default 0.1\nuniform float waveFreq; // @min 1.0 @max 50.0 @default 20.0\nuniform float blackSpotAmount; // @min 0.0 @max 1.0 @default 0.8\nuniform float spiralScale; // @min 5.0 @max 100.0 @default 40.0\nuniform float spiralSpeed; // @min -20.0 @max 20.0 @default 7.0\nuniform float spiralSize; // @min 0.05 @max 1.0 @default 0.3\nuniform float lsdGlowWidth; // @min 0.1 @max 2.0 @default 0.8\nuniform float prime1; // @min 1.0 @max 13.0 @default 2.0\nuniform float prime2; // @min 1.0 @max 13.0 @default 3.0\nuniform bool blackLinesInLight; // @default false\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 baseColor = texture2D(tex, uv);\nfloat luma = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));\nfloat effectMask = smoothstep(0.01, 0.1, luma);\nvec2 symUv = uv;\nfloat dir = (symUv.x > 0.5) ? -1.0 : 1.0;\nif (symUv.x > 0.5) symUv.x = 1.0 - symUv.x;\nfloat localTime = (node_noise(symUv * 5.0) > 0.0) ? time - delay : time;\nvec2 off = 1.0 / resolution;\nfloat t01 = texture2D(tex, uv + vec2(-off.x, 0.0)).r;\nfloat t21 = texture2D(tex, uv + vec2(off.x, 0.0)).r;\nfloat t10 = texture2D(tex, uv + vec2(0.0, -off.y)).r;\nfloat t12 = texture2D(tex, uv + vec2(0.0, off.y)).r;\nfloat gx = t01 - t21;\nfloat gy = t10 - t12;\nfloat edge = sqrt(gx * gx + gy * gy);\nfloat angle = atan(gy, gx);\nfloat dist = distance(uv, vec2(0.5));\nfloat seg1 = smoothstep(mix(0.7, 0.0, smoothstep(centerBlur + 0.001, 0.0, abs(uv.x - 0.5))), 1.0, sin(angle * lineLength + localTime * speed * dir - dist * distOffset));\nfloat seg2 = smoothstep(0.2, 0.8, sin(angle * lineLength - localTime * speed2 * dir - dist * distOffset * 0.7));\nvec3 dW1 = vec3(sin(time * 0.4), cos(time * 0.3), sin(time * 0.5)) * 0.5 + 0.5;\nvec3 dW2 = vec3(cos(time * 0.5), sin(time * 0.6), cos(time * 0.4)) * 0.5 + 0.5;\nvec3 dW3 = vec3(sin(time * 0.7), cos(time * 0.8), sin(time * 0.6)) * 0.5 + 0.5;\nvec3 col1 = mix(dW1, dW2, sin(dist * waveFreq - time * speed) * 0.5 + 0.5);\nvec3 col2 = mix(dW2, dW3, sin(dist * waveFreq * 0.6 + time * speed2) * 0.5 + 0.5);\nvec3 finalColor = baseColor.rgb * 0.4 + (col1 * edge * seg1 * 2.0 + col2 * edge * seg2 * 1.5) * effectMask;\nvec2 cUv = (symUv - 0.5) * vec2(resolution.x / resolution.y, 1.0);\nfloat r = length(cUv), a = atan(cUv.y, cUv.x);\nfloat sR = r * spiralScale;\nfloat mB = sin(a * 5.0 + sR * prime1 - time * spiralSpeed) + cos(sR * prime2 + a * 11.0) + sin(sR * prime1 - time * 5.0);\nfloat bM = smoothstep(0.0, 0.15, uv.x) * smoothstep(1.0, 0.85, uv.x) * smoothstep(0.0, 0.15, uv.y) * smoothstep(1.0, 0.85, uv.y);\nfloat sM = smoothstep(spiralSize, 0.05, r) * bM * effectMask;\nfloat spot = smoothstep(0.5, 1.5, mB) * sM;\nfloat lsdE = smoothstep(lsdGlowWidth, 0.0, abs(mB - 0.3)) * sM;\nfinalColor += col1 * lsdE * blackSpotAmount * 2.0;\nfinalColor = mix(finalColor, vec3(0.0), spot * blackSpotAmount);\nvec2 lP1 = vec2(0.5 + 0.4 * sin(time * 1.1), 0.5 + 0.4 * cos(time * 1.3));\nvec2 lP2 = vec2(0.5 + 0.4 * cos(time * 0.7 + 2.0), 0.5 + 0.4 * sin(time * 0.9 + 1.0));\nvec2 lUv = uv * vec2(resolution.x / resolution.y, 1.0);\nfloat illu = pow(smoothstep(1.2, 0.0, distance(lUv, lP1 * vec2(resolution.x / resolution.y, 1.0))), 1.5);\nfinalColor *= illu * (1.0 + (vec3(sin(time * 0.2), cos(time * 0.25), sin(time * 0.3)) * 0.5 + 0.5) * 2.5);\nif (blackLinesInLight) finalColor = mix(finalColor, vec3(0.0), clamp((edge * seg1 * 2.0 + edge * seg2 * 1.5 + lsdE * 2.0), 0.0, 1.0) * illu);\nfloat illu2 = pow(smoothstep(0.8, 0.0, distance(lUv, lP2 * vec2(resolution.x / resolution.y, 1.0))), 2.0) * effectMask;\nfinalColor = mix(finalColor, (1.0 - baseColor.rgb) * col2 * 2.5, illu2);\nreturn vec4(finalColor, baseColor.a);\n}",
    "uniformValues": {
      "speed": 5,
      "speed2": 3,
      "lineLength": 1,
      "delay": 2,
      "distOffset": 10,
      "centerBlur": 0.1,
      "waveFreq": 20,
      "blackSpotAmount": 0.8,
      "spiralScale": 40,
      "spiralSpeed": 7,
      "spiralSize": 0.3,
      "lsdGlowWidth": 1.582,
      "prime1": 2,
      "prime2": 3,
      "blackLinesInLight": false
    }
  },
  {
    "id": "timeline-22908240-de37-45d4-afb2-636dfb76cbb9",
    "name": "New Shader",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: New Shader\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nreturn source;\n}"
  },
  {
    "id": "timeline-746936f3-a43c-4b21-95d9-5e5b2a2f4eef",
    "name": "New Shader",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: New Shader\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nreturn source;\n}"
  },
  {
    "id": "timeline-cca437fe-26e1-4b6f-bf80-0a7d44e7ebeb",
    "name": "New Shader",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: New Shader\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nreturn source;\n}"
  },
  {
    "id": "timeline-2089eb8c-735f-46c5-a804-9abe352e4117",
    "name": "Psych Sections Inverted Border Black Distorted",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psych Sections Inverted Border Black Distorted\nuniform float dark_distance; // @min 0.0 @max 10.0 @default 2.0\nuniform float colorrangeeffect; // @min 0.0 @max 1.0 @default 0.5\nuniform float speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float border_width; // @min 0.01 @max 0.5 @default 0.15\nuniform float distortion_amount; // @min 0.0 @max 1.0 @default 0.1\n#define PI 3.141592654\nmat2 rot(float x) {\nreturn mat2(cos(x), sin(x), -sin(x), cos(x));\n}\nvec2 foldRotate(in vec2 p, in float s) {\nfloat a = PI / s - atan(p.x, p.y);\nfloat n = PI * 2.0 / s;\nreturn p * rot(floor(a / n) * n);\n}\nvec2 tex_func(vec2 p, float z, float t, float bw) {\np = foldRotate(p, 8.0 + sin(t * 0.5) * 4.0);\nvec2 q = (fract(p / 10.0) - 0.5) * 10.0;\nfor (int i = 0; i < 3; ++i) {\nq = abs(q) - (0.25 + sin(t * 0.8 + float(i)) * 0.1);\nq *= rot(PI * 0.25 + t * 0.3);\nq = abs(q) - vec2(1.0 + cos(t * 1.1) * 0.5, 1.5 + sin(t * 0.7) * 0.5);\nq *= rot(PI * 0.25 * z + t * 0.6);\nq = foldRotate(q, 3.0 + sin(t * 0.4) * 2.0);\n}\nvec2 d = abs(q) - vec2(1.0);\nfloat sd = min(max(d.x, d.y), 0.0) + length(max(d, 0.0));\nfloat val = 1.0 / (1.0 + abs(sd));\nfloat fill = smoothstep(0.9, 1.0, val);\nfloat border = smoothstep(0.9 - bw, 0.9, val) - fill;\nreturn vec2(fill, max(0.0, border));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nfloat t = time * speed;\nvec2 p_uv_base = (uv * 2.0 - 1.0) * vec2(resolution.x / resolution.y, 1.0) * 2.0;\np_uv_base.x = abs(p_uv_base.x);\nvec2 anim_offset = vec2(sin(p_uv_base.y * 4.0 + t), cos(p_uv_base.x * 4.0 + t)) * 0.15;\nvec2 uv_offset = anim_offset;\nuv_offset.x *= sign(uv.x - 0.5);\nvec2 distorted_uv = uv + uv_offset * distortion_amount;\nvec4 source = texture2D(tex, distorted_uv);\nvec2 texel = dark_distance / resolution;\nfloat min_lum = 1.0;\nfor(int x = -1; x <= 1; x+=2) {\nfor(int y = -1; y <= 1; y+=2) {\nvec4 s = texture2D(tex, distorted_uv + vec2(float(x), float(y)) * texel);\nmin_lum = min(min_lum, dot(s.rgb, vec3(0.299, 0.587, 0.114)));\n}\n}\nfloat mask = smoothstep(0.1, 0.9, min_lum);\nif (mask <= 0.0) {\nreturn vec4(0.0, 0.0, 0.0, source.a);\n}\nvec2 p_uv = p_uv_base + anim_offset;\np_uv *= rot(t * 0.2 + length(p_uv) * 0.5);\nvec3 col = vec3(0.0);\nfloat border_mask = 0.0;\nfloat INTERVAL = 3.0;\nvec3 cycleColor = 0.5 + 0.5 * cos(t * 0.8 + vec3(0.0, 2.094, 4.188));\ncycleColor = mix(cycleColor, vec3(1.0, 0.2, 0.8), colorrangeeffect * 0.5);\nfor(int i = 0; i < 4; i++) {\nfloat ii = float(4 - i);\nfloat t2 = ii * INTERVAL - mod(t + INTERVAL * 0.5, INTERVAL);\nvec2 res2 = tex_func(p_uv * max(0.0, t2), 4.45, t, border_width);\ncol = mix(col, vec3((12.0 - t2) / 12.0) * cycleColor * 2.0, res2.x);\nborder_mask = max(border_mask, res2.y * (0.5 + 0.5 * sin(t * 5.0 + t2 * 2.0)));\nfloat t4 = ii * INTERVAL - mod(t, INTERVAL);\nvec2 res4 = tex_func(p_uv * max(0.0, t4), 4.45, t, border_width);\ncol = mix(col, vec3((12.0 - t4) / 12.0) * cycleColor * 2.0, res4.x);\nborder_mask = max(border_mask, res4.y * (0.5 + 0.5 * cos(t * 4.0 + t4 * 2.0)));\n}\nvec3 border_color = vec3(0.5) + 0.5 * sin(t * 3.0 + vec3(1.0, 2.0, 3.0));\ncol = mix(col, border_color, border_mask);\ncol = 1.0 - col;\nreturn vec4(mix(vec3(0.0), col, mask), source.a);\n}",
    "uniformValues": {
      "dark_distance": 0.1,
      "colorrangeeffect": 0.68,
      "speed": 0.884,
      "border_width": 0.4951,
      "distortion_amount": 0.03
    }
  },
  {
    "id": "timeline-1ba5c2e3-ff54-4639-ba52-5201f641f0b4",
    "name": "Psych Wave Halo",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psych Wave Halo\nuniform float intensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float waveSpacing; // @min 10.0 @max 150.0 @default 60.0\nuniform float waveSpeed; // @min 0.0 @max 100.0 @default 30.0\nuniform float invertThreshold; // @min 0.0 @max 1.0 @default 0.8\nuniform float verticalWave; // @min 0.0 @max 1.0 @default 0.0\nvec3 palette(float i) {\nreturn 0.5 + 0.5 * cos(6.28318 * (vec3(3.0, 2.0, 5.0) * i + vec3(0.0, 0.33, 0.67)));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 origSource = texture2D(tex, uv);\nfloat origMax = max(max(origSource.r, origSource.g), origSource.b);\nfloat origMin = min(min(origSource.r, origSource.g), origSource.b);\nfloat origChroma = origMax - origMin;\nfloat origHue = 0.0;\nif (origChroma > 0.0) {\nif (origMax == origSource.r) origHue = (origSource.g - origSource.b) / origChroma;\nelse if (origMax == origSource.g) origHue = 2.0 + (origSource.b - origSource.r) / origChroma;\nelse origHue = 4.0 + (origSource.r - origSource.g) / origChroma;\norigHue *= 60.0;\nif (origHue < 0.0) origHue += 360.0;\n}\nbool isBlueOrViolet = origChroma > 0.05 && origHue >= 200.0 && origHue <= 330.0;\nfloat localTime = isBlueOrViolet ? -time : time;\nvec2 centerUv = uv - 0.5;\nvec2 aspectUv = centerUv * vec2(resolution.x / resolution.y, 1.0);\nfloat dist = length(aspectUv);\nfloat waveDist = mix(dist, aspectUv.y, verticalWave);\nfloat phase = waveDist * waveSpacing - localTime * waveSpeed;\nfloat wave = sin(phase);\nvec2 warpDir = mix(centerUv, vec2(0.0, 1.0), verticalWave);\nvec2 warp = uv + warpDir * wave * 0.04 * intensity;\nvec4 source = texture2D(tex, warp);\nvec2 uv_c = centerUv * 2.0;\nuv_c.x *= resolution.x / resolution.y;\nfor(int i = 0; i < 5; i++) {\nuv_c = abs(uv_c) - 0.4;\nfloat a = localTime * 3.0 + length(uv_c) * 8.0;\nmat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));\nuv_c *= rot;\nuv_c *= 1.6;\n}\nvec3 psychColor = palette(length(uv_c) - localTime * 5.0);\npsychColor = fract(psychColor * 2.5);\nfloat flash = abs(sin(localTime * 10.0));\npsychColor += vec3(flash, 0.0, 1.0 - flash) * step(0.95, fract(uv_c.x * 10.0));\nvec4 finalColor = mix(source, vec4(psychColor, 1.0), intensity);\nfloat waveIndex = floor(phase / 3.14159);\nif (mod(waveIndex, 2.0) != 0.0 && node_rand(uv + localTime) > invertThreshold) {\nfinalColor.rgb = 1.0 - finalColor.rgb;\n}\nfloat blackMask = smoothstep(0.0, 0.3, origMax);\nreturn mix(origSource, finalColor, blackMask);\n}",
    "uniformValues": {
      "intensity": 0,
      "waveSpacing": 150,
      "waveSpeed": 26,
      "invertThreshold": 0,
      "verticalWave": 0.29
    }
  },
  {
    "id": "timeline-c8271a58-9e49-44d4-ace8-f1f5fb9b78e9",
    "name": "Psych Wave Halo",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psych Wave Halo\nuniform float intensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float waveSpacing; // @min 10.0 @max 150.0 @default 60.0\nuniform float waveSpeed; // @min 0.0 @max 100.0 @default 30.0\nuniform float invertThreshold; // @min 0.0 @max 1.0 @default 0.8\nuniform float verticalWave; // @min 0.0 @max 1.0 @default 0.0\nvec3 palette(float i) {\nreturn 0.5 + 0.5 * cos(6.28318 * (vec3(3.0, 2.0, 5.0) * i + vec3(0.0, 0.33, 0.67)));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 origSource = texture2D(tex, uv);\nfloat origMax = max(max(origSource.r, origSource.g), origSource.b);\nfloat origMin = min(min(origSource.r, origSource.g), origSource.b);\nfloat origChroma = origMax - origMin;\nfloat origHue = 0.0;\nif (origChroma > 0.0) {\nif (origMax == origSource.r) origHue = (origSource.g - origSource.b) / origChroma;\nelse if (origMax == origSource.g) origHue = 2.0 + (origSource.b - origSource.r) / origChroma;\nelse origHue = 4.0 + (origSource.r - origSource.g) / origChroma;\norigHue *= 60.0;\nif (origHue < 0.0) origHue += 360.0;\n}\nbool isBlueOrViolet = origChroma > 0.05 && origHue >= 200.0 && origHue <= 330.0;\nfloat localTime = isBlueOrViolet ? -time : time;\nvec2 centerUv = uv - 0.5;\nvec2 aspectUv = centerUv * vec2(resolution.x / resolution.y, 1.0);\nfloat dist = length(aspectUv);\nfloat waveDist = mix(dist, aspectUv.y, verticalWave);\nfloat phase = waveDist * waveSpacing - localTime * waveSpeed;\nfloat wave = sin(phase);\nvec2 warpDir = mix(centerUv, vec2(0.0, 1.0), verticalWave);\nvec2 warp = uv + warpDir * wave * 0.04 * intensity;\nvec4 source = texture2D(tex, warp);\nvec2 uv_c = centerUv * 2.0;\nuv_c.x *= resolution.x / resolution.y;\nfor(int i = 0; i < 5; i++) {\nuv_c = abs(uv_c) - 0.4;\nfloat a = localTime * 3.0 + length(uv_c) * 8.0;\nmat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));\nuv_c *= rot;\nuv_c *= 1.6;\n}\nvec3 psychColor = palette(length(uv_c) - localTime * 5.0);\npsychColor = fract(psychColor * 2.5);\nfloat flash = abs(sin(localTime * 10.0));\npsychColor += vec3(flash, 0.0, 1.0 - flash) * step(0.95, fract(uv_c.x * 10.0));\nvec4 finalColor = mix(source, vec4(psychColor, 1.0), intensity);\nfloat waveIndex = floor(phase / 3.14159);\nif (mod(waveIndex, 2.0) != 0.0 && node_rand(uv + localTime) > invertThreshold) {\nfinalColor.rgb = 1.0 - finalColor.rgb;\n}\nfloat blackMask = smoothstep(0.0, 0.3, origMax);\nreturn mix(origSource, finalColor, blackMask);\n}",
    "uniformValues": {
      "intensity": 0.01,
      "waveSpacing": 150,
      "waveSpeed": 46,
      "invertThreshold": 0,
      "verticalWave": 0
    }
  },
  {
    "id": "timeline-fb0c2385-3eb6-43a6-a270-393a0287e7ec",
    "name": "Psych Wave Halo",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psych Wave Halo\nuniform float intensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float waveSpacing; // @min 10.0 @max 150.0 @default 60.0\nuniform float waveSpeed; // @min 0.0 @max 100.0 @default 30.0\nuniform float invertThreshold; // @min 0.0 @max 1.0 @default 0.8\nuniform float verticalWave; // @min 0.0 @max 1.0 @default 0.0\nvec3 palette(float i) {\nreturn 0.5 + 0.5 * cos(6.28318 * (vec3(3.0, 2.0, 5.0) * i + vec3(0.0, 0.33, 0.67)));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 origSource = texture2D(tex, uv);\nfloat origMax = max(max(origSource.r, origSource.g), origSource.b);\nfloat origMin = min(min(origSource.r, origSource.g), origSource.b);\nfloat origChroma = origMax - origMin;\nfloat origHue = 0.0;\nif (origChroma > 0.0) {\nif (origMax == origSource.r) origHue = (origSource.g - origSource.b) / origChroma;\nelse if (origMax == origSource.g) origHue = 2.0 + (origSource.b - origSource.r) / origChroma;\nelse origHue = 4.0 + (origSource.r - origSource.g) / origChroma;\norigHue *= 60.0;\nif (origHue < 0.0) origHue += 360.0;\n}\nbool isBlueOrViolet = origChroma > 0.05 && origHue >= 200.0 && origHue <= 330.0;\nfloat localTime = isBlueOrViolet ? -time : time;\nvec2 centerUv = uv - 0.5;\nvec2 aspectUv = centerUv * vec2(resolution.x / resolution.y, 1.0);\nfloat dist = length(aspectUv);\nfloat waveDist = mix(dist, aspectUv.y, verticalWave);\nfloat phase = waveDist * waveSpacing - localTime * waveSpeed;\nfloat wave = sin(phase);\nvec2 warpDir = mix(centerUv, vec2(0.0, 1.0), verticalWave);\nvec2 warp = uv + warpDir * wave * 0.04 * intensity;\nvec4 source = texture2D(tex, warp);\nvec2 uv_c = centerUv * 2.0;\nuv_c.x *= resolution.x / resolution.y;\nfor(int i = 0; i < 5; i++) {\nuv_c = abs(uv_c) - 0.4;\nfloat a = localTime * 3.0 + length(uv_c) * 8.0;\nmat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));\nuv_c *= rot;\nuv_c *= 1.6;\n}\nvec3 psychColor = palette(length(uv_c) - localTime * 5.0);\npsychColor = fract(psychColor * 2.5);\nfloat flash = abs(sin(localTime * 10.0));\npsychColor += vec3(flash, 0.0, 1.0 - flash) * step(0.95, fract(uv_c.x * 10.0));\nvec4 finalColor = mix(source, vec4(psychColor, 1.0), intensity);\nfloat waveIndex = floor(phase / 3.14159);\nif (mod(waveIndex, 2.0) != 0.0 && node_rand(uv + localTime) > invertThreshold) {\nfinalColor.rgb = 1.0 - finalColor.rgb;\n}\nfloat blackMask = smoothstep(0.0, 0.3, origMax);\nreturn mix(origSource, finalColor, blackMask);\n}",
    "uniformValues": {
      "intensity": 0.91,
      "waveSpacing": 150,
      "waveSpeed": 43,
      "invertThreshold": 0,
      "verticalWave": 0
    }
  },
  {
    "id": "timeline-1973822b-1f45-4bc8-806c-dc0262ccd222",
    "name": "Psychedelic Black Preserve Range",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psychedelic Black Preserve Range\nuniform float intensity; // @min 0.0 @max 2.0 @default 1.0\nuniform float thresholdMin; // @min 0.0 @max 1.0 @default 0.2\nuniform float thresholdMax; // @min 0.0 @max 1.0 @default 0.8\nuniform float pixeldistance; // @min 0.0 @max 1.0 @default 0.5\nuniform float pixelDistLoopSpeed; // @min 0.0 @max 5.0 @default 1.0\nuniform float speedThreshold; // @min 0.00 @max 2.0 @default 1.0\nuniform float blurStrength; // @min 0.0 @max 2.0 @default 0.5\nuniform float distColorIntensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float distColorFreq; // @min 0.1 @max 5.0 @default 2.0\nuniform float isolationThreshold; // @min 0.0 @max 1.0 @default 0.2\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat luma = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nif (luma < 0.02) return vec4(0.0, 0.0, 0.0, source.a);\nvec2 texel = 1.0 / resolution;\nfloat minDiff = 1.0;\nfor(int i = -2; i <= 2; i += 2) {\nfor(int j = -2; j <= 2; j += 2) {\nif(i == 0 && j == 0) continue;\nvec4 neighbor = texture2D(tex, uv + vec2(float(i), float(j)) * texel * 4.0);\nminDiff = min(minDiff, distance(source.rgb, neighbor.rgb));\n}\n}\nif (minDiff > isolationThreshold) {\nvec3 psych = 0.5 + 0.5 * cos(time * 5.0 + uv.xyx * 15.0 + vec3(0.0, 2.0, 4.0));\nreturn vec4(mix(1.0 - source.rgb, psych, 0.6), source.a);\n}\nfloat oscillation = abs(mod(time * speedThreshold, 2.0) - 1.0);\nfloat currentThreshold = mix(thresholdMin, thresholdMax, oscillation);\nfloat currentPixelDist = abs(mod(pixeldistance + time * pixelDistLoopSpeed, 2.0) - 1.0);\nfloat distMult = currentPixelDist * 5.0 + 0.1;\nfloat minDist = 100.0;\nfor(int i = -4; i <= 4; i++) {\nfor(int j = -4; j <= 4; j++) {\nfloat d2 = float(i * i + j * j);\nif (d2 <= 16.0) {\nvec4 s = texture2D(tex, uv + vec2(float(i), float(j)) * texel * distMult);\nif (dot(s.rgb, vec3(0.299, 0.587, 0.114)) < currentThreshold && s.a > 0.5) {\nminDist = min(minDist, sqrt(d2));\n}\n}\n}\n}\nif (minDist <= 4.0) {\nfloat blurAmount = smoothstep(0.0, 4.0, minDist) * blurStrength;\nvec3 col = vec3(0.0);\nfor(int i = -2; i <= 2; i++) {\nfor(int j = -2; j <= 2; j++) {\nvec2 offset = vec2(float(i), float(j)) * texel * blurAmount * 10.0;\nvec3 shift = vec3(sin(time * 3.0 + float(i)), cos(time * 2.0 + float(j)), sin(time * 4.0)) * 0.5 + 0.5;\ncol += texture2D(tex, uv + offset).rgb * shift * intensity;\n}\n}\nvec3 distColor = 0.5 + 0.5 * cos(time * 3.0 - minDist * distColorFreq + vec3(0.0, 2.0, 4.0));\nreturn vec4(mix(col / 25.0, distColor, distColorIntensity), source.a * (1.0 - smoothstep(0.0, 4.0, minDist)));\n}\nreturn (luma >= currentThreshold) ? vec4(0.0, 0.0, 0.0, source.a) : source;\n}",
    "uniformValues": {
      "intensity": 0.36,
      "thresholdMin": 0.28,
      "thresholdMax": 0.18,
      "pixeldistance": 0.04,
      "pixelDistLoopSpeed": 5,
      "speedThreshold": 2,
      "blurStrength": 2,
      "distColorIntensity": 0,
      "distColorFreq": 2.942,
      "isolationThreshold": 0.97
    }
  },
  {
    "id": "timeline-a54ef00e-ba50-4b61-a4a4-24c6696671a5",
    "name": "Psychedelic Edge Drive",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psychedelic Edge Drive\nuniform float dark_distance; // @min 0.0 @max 10.0 @default 2.0\nuniform float colorrangeeffect; // @min 0.0 @max 1.0 @default 0.5\nuniform float fold_symmetry; // @min 3.0 @max 12.0 @default 8.0\nuniform float distortion_4d; // @min 0.0 @max 5.0 @default 1.5\nuniform float speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float psych_intensity; // @min 0.0 @max 5.0 @default 2.0\n#define PI 3.141592654\nmat2 rot(float x) {\nreturn mat2(cos(x), sin(x), -sin(x), cos(x));\n}\nvec2 foldRotate(in vec2 p, in float s) {\nfloat a = PI / s - atan(p.x, p.y);\nfloat n = PI * 2.0 / s;\nreturn p * rot(floor(a / n) * n);\n}\nfloat tex_func(vec2 p, float z, float t, float sym, float dist) {\np = foldRotate(p, sym);\np *= rot(length(p) * dist * 0.05 + t * 0.3);\nvec2 q = (fract(p / 10.0) - 0.5) * 10.0;\nfor (int i = 0; i < 2; ++i) {\nq = abs(q) - 0.25;\nq *= rot(PI * 0.25 + dist * 0.15 * sin(t * 0.8 + length(q)));\nq = abs(q) - vec2(1.0, 1.5);\nq *= rot(PI * 0.25 * z);\nq = foldRotate(q, 3.0);\n}\nvec2 d = abs(q) - vec2(1.0);\nfloat sd = min(max(d.x, d.y), 0.0) + length(max(d, 0.0));\nreturn smoothstep(0.9, 1.0, 1.0 / (1.0 + abs(sd)));\n}\nvec3 hueShift(vec3 color, float hue) {\nconst vec3 k = vec3(0.57735, 0.57735, 0.57735);\nfloat cosAngle = cos(hue);\nreturn vec3(color * cosAngle + cross(k, color) * sin(hue) + k * dot(k, color) * (1.0 - cosAngle));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec2 texel = dark_distance / resolution;\nfloat color_diff = 0.0;\nfloat min_lum = 1.0;\nfor(int x = -1; x <= 1; x+=2) {\nfor(int y = -1; y <= 1; y+=2) {\nvec4 s = texture2D(tex, uv + vec2(float(x), float(y)) * texel);\ncolor_diff += length(s.rgb - source.rgb);\nfloat lum = dot(s.rgb, vec3(0.299, 0.587, 0.114)) * s.a;\nmin_lum = min(min_lum, lum);\n}\n}\ncolor_diff /= 4.0;\nfloat mask = smoothstep(0.1, 0.9, min_lum);\nvec2 p_uv = (uv * 2.0 - 1.0) * vec2(resolution.x / resolution.y, 1.0) * 2.0;\np_uv += vec2(sin(time * 2.0 + p_uv.y * 5.0), cos(time * 2.0 + p_uv.x * 5.0)) * color_diff * psych_intensity * 0.5;\nfloat INTERVAL = 3.0;\nfloat t_scaled = time * speed;\nvec3 c1 = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.3, 0.3), colorrangeeffect);\nvec3 c2 = mix(vec3(0.7, 0.5, 1.0), vec3(0.3, 1.0, 0.3), colorrangeeffect);\nvec3 col = vec3(0.0);\nif (mask > 0.0) {\nfor(int i = 0; i < 4; i++) {\nfloat ii = float(4 - i);\nfloat t2 = ii * INTERVAL - mod(t_scaled + INTERVAL * 0.5, INTERVAL);\ncol = mix(col, vec3((12.0 - t2) / 12.0) * c1 * 1.3, tex_func(p_uv * max(0.0, t2), 4.45, t_scaled, fold_symmetry, distortion_4d));\nfloat t4 = ii * INTERVAL - mod(t_scaled, INTERVAL);\ncol = mix(col, vec3((12.0 - t4) / 12.0) * c2 * 1.3, tex_func(p_uv * max(0.0, t4), 4.45, t_scaled, fold_symmetry, distortion_4d));\n}\n}\nvec4 final_col = mix(vec4(0.0, 0.0, 0.0, source.a), vec4(col, source.a), mask);\nvec3 psych_edge = hueShift(source.rgb, time * 5.0 + color_diff * 15.0);\nfinal_col.rgb = mix(final_col.rgb, psych_edge, smoothstep(0.05, 0.4, color_diff) * clamp(psych_intensity, 0.0, 1.0));\nreturn final_col;\n}",
    "uniformValues": {
      "dark_distance": 2,
      "colorrangeeffect": 0.5,
      "fold_symmetry": 8,
      "distortion_4d": 1.5,
      "speed": 1,
      "psych_intensity": 2
    }
  },
  {
    "id": "timeline-e730368a-ddf7-4790-b836-11b4e1575b8a",
    "name": "Psychedelic Edge Drive",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psychedelic Edge Drive\nuniform float dark_distance; // @min 0.0 @max 10.0 @default 2.0\nuniform float colorrangeeffect; // @min 0.0 @max 1.0 @default 0.5\nuniform float fold_symmetry; // @min 3.0 @max 12.0 @default 8.0\nuniform float distortion_4d; // @min 0.0 @max 5.0 @default 1.5\nuniform float speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float psych_intensity; // @min 0.0 @max 5.0 @default 2.0\n#define PI 3.141592654\nmat2 rot(float x) {\nreturn mat2(cos(x), sin(x), -sin(x), cos(x));\n}\nvec2 foldRotate(in vec2 p, in float s) {\nfloat a = PI / s - atan(p.x, p.y);\nfloat n = PI * 2.0 / s;\nreturn p * rot(floor(a / n) * n);\n}\nfloat tex_func(vec2 p, float z, float t, float sym, float dist) {\np = foldRotate(p, sym);\np *= rot(length(p) * dist * 0.05 + t * 0.3);\nvec2 q = (fract(p / 10.0) - 0.5) * 10.0;\nfor (int i = 0; i < 2; ++i) {\nq = abs(q) - 0.25;\nq *= rot(PI * 0.25 + dist * 0.15 * sin(t * 0.8 + length(q)));\nq = abs(q) - vec2(1.0, 1.5);\nq *= rot(PI * 0.25 * z);\nq = foldRotate(q, 3.0);\n}\nvec2 d = abs(q) - vec2(1.0);\nfloat sd = min(max(d.x, d.y), 0.0) + length(max(d, 0.0));\nreturn smoothstep(0.9, 1.0, 1.0 / (1.0 + abs(sd)));\n}\nvec3 hueShift(vec3 color, float hue) {\nconst vec3 k = vec3(0.57735, 0.57735, 0.57735);\nfloat cosAngle = cos(hue);\nreturn vec3(color * cosAngle + cross(k, color) * sin(hue) + k * dot(k, color) * (1.0 - cosAngle));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec2 texel = dark_distance / resolution;\nfloat color_diff = 0.0;\nfloat min_lum = 1.0;\nfor(int x = -1; x <= 1; x+=2) {\nfor(int y = -1; y <= 1; y+=2) {\nvec4 s = texture2D(tex, uv + vec2(float(x), float(y)) * texel);\ncolor_diff += length(s.rgb - source.rgb);\nfloat lum = dot(s.rgb, vec3(0.299, 0.587, 0.114)) * s.a;\nmin_lum = min(min_lum, lum);\n}\n}\ncolor_diff /= 4.0;\nfloat mask = smoothstep(0.1, 0.9, min_lum);\nvec2 p_uv = (uv * 2.0 - 1.0) * vec2(resolution.x / resolution.y, 1.0) * 2.0;\np_uv += vec2(sin(time * 2.0 + p_uv.y * 5.0), cos(time * 2.0 + p_uv.x * 5.0)) * color_diff * psych_intensity * 0.5;\nfloat INTERVAL = 3.0;\nfloat t_scaled = time * speed;\nvec3 c1 = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.3, 0.3), colorrangeeffect);\nvec3 c2 = mix(vec3(0.7, 0.5, 1.0), vec3(0.3, 1.0, 0.3), colorrangeeffect);\nvec3 col = vec3(0.0);\nif (mask > 0.0) {\nfor(int i = 0; i < 4; i++) {\nfloat ii = float(4 - i);\nfloat t2 = ii * INTERVAL - mod(t_scaled + INTERVAL * 0.5, INTERVAL);\ncol = mix(col, vec3((12.0 - t2) / 12.0) * c1 * 1.3, tex_func(p_uv * max(0.0, t2), 4.45, t_scaled, fold_symmetry, distortion_4d));\nfloat t4 = ii * INTERVAL - mod(t_scaled, INTERVAL);\ncol = mix(col, vec3((12.0 - t4) / 12.0) * c2 * 1.3, tex_func(p_uv * max(0.0, t4), 4.45, t_scaled, fold_symmetry, distortion_4d));\n}\n}\nvec4 final_col = mix(vec4(0.0, 0.0, 0.0, source.a), vec4(col, source.a), mask);\nvec3 psych_edge = hueShift(source.rgb, time * 5.0 + color_diff * 15.0);\nfinal_col.rgb = mix(final_col.rgb, psych_edge, smoothstep(0.05, 0.4, color_diff) * clamp(psych_intensity, 0.0, 1.0));\nreturn final_col;\n}",
    "uniformValues": {
      "dark_distance": 2,
      "colorrangeeffect": 0.5,
      "fold_symmetry": 8,
      "distortion_4d": 1.5,
      "speed": 1,
      "psych_intensity": 2
    }
  },
  {
    "id": "timeline-a02921ed-4667-4334-abff-71ce36027679",
    "name": "Psychedelic Snakes with Blob",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psychedelic Snakes with Blob\nuniform float linesCount; // @min 1.0 @max 50.0 @default 15.0\nuniform float snakeSpeed; // @min -10.0 @max 10.0 @default 5.0\nuniform float snakeTiling; // @min 1.0 @max 20.0 @default 3.0\nuniform float lineThickness; // @min 0.01 @max 0.5 @default 0.15\nuniform float zoneThreshold; // @min 0.0 @max 1.0 @default 0.8\nuniform float minZoneThreshold; // @min 0.0 @max 1.0 @default 0.2\nuniform float loopSpeed; // @min -5.0 @max 5.0 @default 1.0\nuniform float pixelSoftness; // @min 0.01 @max 3.0 @default 1.8\nuniform float colorSpeed; // @min 0.0 @max 10.0 @default 2.0\nuniform float psychedelicScale; // @min 1.0 @max 20.0 @default 5.0\nuniform bool showBackground; // @default true\nuniform float blobSize; // @min 0.1 @max 2.0 @default 0.6\nuniform float blobBlur; // @min 0.1 @max 2.0 @default 0.8\nfloat getMask(sampler2D tex, vec2 uv, vec2 res, float t, float lc, float lt, float ps, float zt, float st, float ss, float ls) {\nvec3 lw = vec3(0.299, 0.587, 0.114);\nfloat lum = dot(texture2D(tex, uv).rgb, lw);\nvec2 eps = vec2(3.0) / res;\nfloat lumX = dot(texture2D(tex, uv + vec2(eps.x, 0.0)).rgb, lw);\nfloat lumY = dot(texture2D(tex, uv + vec2(0.0, eps.y)).rgb, lw);\nvec2 grad = vec2(lumX - lum, lumY - lum);\nfloat angle = atan(grad.y, grad.x + 0.0001);\nfloat iso = fract(lum * lc - t * ls);\nfloat soft = lt * ps * 1.5;\nfloat line = smoothstep(zt - soft, zt, iso) - smoothstep(zt, zt + soft, iso);\nline *= smoothstep(0.001, 0.02, length(grad));\nfloat snake = sin(angle * st * 2.0 + t * ss);\nreturn line * smoothstep(-1.2 * ps, 1.2, snake);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat currentZT = mix(minZoneThreshold, zoneThreshold, sin(time * loopSpeed) * 0.5 + 0.5);\nfloat m0 = getMask(tex, uv, resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\nvec2 eps = vec2(4.0) / resolution;\nfloat mx = getMask(tex, uv + vec2(eps.x, 0.0), resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\nfloat my = getMask(tex, uv + vec2(0.0, eps.y), resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\nvec3 n = normalize(vec3(m0 - mx, m0 - my, 0.25));\nvec3 lightDir = normalize(vec3(0.8, 0.8, 1.0));\nfloat diff = max(dot(n, lightDir), 0.0);\nfloat diffSoft = diff * 0.6 + 0.4;\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 halfDir = normalize(lightDir + viewDir);\nfloat spec = pow(max(dot(n, halfDir), 0.0), 12.0) * m0 * 0.6;\nfloat fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.5) * m0;\nvec3 darkGradient = vec3(0.02, 0.04, 0.08) * (1.5 - length(uv - 0.5) * 1.5);\nvec3 bg = showBackground ? mix(source.rgb * 0.3, darkGradient, 0.5) : darkGradient;\nvec3 lw = vec3(0.299, 0.587, 0.114);\nfloat lum = dot(source.rgb, lw);\nvec2 epsGrad = vec2(3.0) / resolution;\nfloat lumX = dot(texture2D(tex, uv + vec2(epsGrad.x, 0.0)).rgb, lw);\nfloat lumY = dot(texture2D(tex, uv + vec2(0.0, epsGrad.y)).rgb, lw);\nvec2 grad = vec2(lumX - lum, lumY - lum);\nfloat angle = atan(grad.y, grad.x + 0.0001);\nfloat phase = angle * snakeTiling * 2.0 + time * snakeSpeed;\nfloat n1 = node_noise(uv * psychedelicScale + time);\nfloat n2 = node_noise(uv * psychedelicScale * 2.0 - time * 0.5 + n1 * 3.0);\nfloat r1 = node_rand(floor(uv * psychedelicScale * 5.0) + time * 0.1);\nvec3 trailColor = 0.5 + 0.5 * cos(phase * 0.5 - time * colorSpeed + n2 * 6.28 + vec3(0.0, 2.1, 4.2) + r1 * 1.5);\nvec3 finalColor = trailColor * diffSoft + spec + fresnel * vec3(0.8, 0.9, 1.0);\nvec3 mixedColor = mix(bg, finalColor, m0);\nvec2 centered = uv - 0.5;\nvec2 symUv = abs(centered);\nfloat blobNoise = node_noise(symUv * 5.0 - time * 0.3);\nfloat dist = length(centered) + blobNoise * 0.4;\nfloat blobMask = smoothstep(blobSize, blobSize - blobBlur, dist);\nmixedColor = mix(mixedColor, vec3(0.0), blobMask);\nreturn vec4(mixedColor, source.a);\n}",
    "uniformValues": {
      "linesCount": 1,
      "snakeSpeed": -10,
      "snakeTiling": 1,
      "lineThickness": 0.4069,
      "zoneThreshold": 0.56,
      "minZoneThreshold": 0.08,
      "loopSpeed": -1.9,
      "pixelSoftness": 0.9967,
      "colorSpeed": 7.6,
      "psychedelicScale": 1.95,
      "showBackground": true,
      "blobSize": 0.6,
      "blobBlur": 0.8
    }
  },
  {
    "id": "timeline-1c970909-9464-43e8-8a50-487a5e486a8b",
    "name": "Psytrance Desert DMT",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psytrance Desert DMT\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.08\nuniform float speed; // @min 0.1 @max 5.0 @default 1.2\nuniform float warp; // @min 1.0 @max 20.0 @default 10.0\nuniform float edge_boost; // @min 1.0 @max 20.0 @default 15.0\nuniform float sides; // @min 2.0 @max 12.0 @default 6.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 src = texture2D(tex, uv);\nfloat luma = max(src.r, max(src.g, src.b));\nif (luma < threshold) {\nreturn vec4(0.0, 0.0, 0.0, src.a);\n}\nfloat t = time * speed;\nvec2 aspect = vec2(resolution.x / resolution.y, 1.0);\nvec2 p = (uv - 0.5) * aspect;\nfloat r = length(p);\nfloat a = atan(p.y, p.x);\nfloat tau = 6.283185;\nfloat slice = tau / max(sides, 1.0);\na = mod(a, slice) - slice * 0.5;\na = abs(a);\np = vec2(cos(a), sin(a)) * r;\np.x += sin(p.y * warp + t) * 0.12;\np.y += cos(p.x * warp - t * 0.7) * 0.12;\np += node_noise(p * 4.0 + t * 0.2) * 0.07;\nfloat spiral = atan(p.y, p.x) * 3.0 + length(p) * 22.0 - t * 5.0;\nfloat dotPattern = pow(abs(sin(spiral) * cos(spiral * 0.5)), 4.0);\nfloat dotMask = smoothstep(0.1, 0.4, dotPattern);\nvec3 desertOrange = vec3(1.0, 0.45, 0.1);\nvec3 desertGold = vec3(1.0, 0.8, 0.2);\nvec3 psyCyan = vec3(0.0, 1.0, 0.9);\nvec3 psyMagenta = vec3(1.0, 0.0, 0.8);\nfloat colorCycle = sin(r * 10.0 - t) * 0.5 + 0.5;\nvec3 warmBase = mix(desertOrange, desertGold, sin(t) * 0.5 + 0.5);\nvec3 neonAccent = mix(psyCyan, psyMagenta, cos(t * 0.8) * 0.5 + 0.5);\nvec3 psyColorBase = mix(warmBase, neonAccent, colorCycle);\nvec3 psyColor = mix(src.rgb, psyColorBase * 1.8, dotMask);\nvec2 off = 1.2 / resolution;\nvec3 s1 = texture2D(tex, uv + off).rgb;\nvec3 s2 = texture2D(tex, uv - off).rgb;\nfloat edge = distance(s1, s2);\nfloat edgeFactor = clamp(edge * edge_boost, 0.0, 1.0);\nvec3 invertedColor = 1.0 - psyColor;\nvec3 edgeGlow = mix(psyMagenta, psyCyan, sin(t * 2.0) * 0.5 + 0.5);\nvec3 finalRGB = mix(psyColor, invertedColor + edgeGlow * 0.3, edgeFactor);\nfinalRGB *= luma * (1.2 + 0.3 * sin(t * 2.5));\nfinalRGB *= smoothstep(threshold, threshold + 0.08, luma);\nreturn vec4(finalRGB, src.a);\n}",
    "uniformValues": {
      "threshold": 0.115,
      "speed": 0.443,
      "warp": 4.04,
      "edge_boost": 15,
      "sides": 10.9
    }
  },
  {
    "id": "timeline-4679fd9c-5e48-4ccf-94cd-d9b024374088",
    "name": "Radial Delayed Soft Edge Blur",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Radial Delayed Soft Edge Blur\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float lineLength; // @min 1.0 @max 10.0 @default 1.0\nuniform float delay; // @min 0.0 @max 5.0 @default 2.0\nuniform float distOffset; // @min 0.0 @max 20.0 @default 10.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 baseColor = texture2D(tex, uv);\nfloat blob = node_noise(uv * 5.0);\nfloat localTime = time;\nif (blob > 0.0) {\nlocalTime = time - delay;\n}\nvec2 off = 1.0 / resolution;\nfloat t00 = texture2D(tex, uv + vec2(-off.x, -off.y)).r;\nfloat t10 = texture2D(tex, uv + vec2( 0.0, -off.y)).r;\nfloat t20 = texture2D(tex, uv + vec2( off.x, -off.y)).r;\nfloat t01 = texture2D(tex, uv + vec2(-off.x, 0.0)).r;\nfloat t21 = texture2D(tex, uv + vec2( off.x, 0.0)).r;\nfloat t02 = texture2D(tex, uv + vec2(-off.x, off.y)).r;\nfloat t12 = texture2D(tex, uv + vec2( 0.0, off.y)).r;\nfloat t22 = texture2D(tex, uv + vec2( off.x, off.y)).r;\nfloat gx = (t00 + 2.0 * t01 + t02) - (t20 + 2.0 * t21 + t22);\nfloat gy = (t00 + 2.0 * t10 + t20) - (t02 + 2.0 * t12 + t22);\nfloat edge = sqrt(gx * gx + gy * gy);\nfloat angle = atan(gy, gx);\nfloat dist = distance(uv, vec2(0.5));\nfloat segment = sin(angle * lineLength + localTime * speed - dist * distOffset);\nsegment = smoothstep(0.7, 0.95, segment);\nvec3 softLight = baseColor.rgb * 0.4;\nvec3 highlight = baseColor.rgb * edge * segment * 2.0;\nvec3 finalColor = softLight + highlight;\nreturn vec4(finalColor, baseColor.a);\n}",
    "uniformValues": {
      "speed": 7.6,
      "lineLength": 1,
      "delay": 5,
      "distOffset": 19.6
    }
  },
  {
    "id": "timeline-23441f58-808d-4ab0-8511-362f77c9321b",
    "name": "Random 3D Wide Light",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Random 3D Wide Light\nuniform float speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float range; // @min 1.0 @max 15.0 @default 8.0\nuniform float brightness; // @min 0.0 @max 10.0 @default 4.5\nuniform float depth_scale; // @min 0.1 @max 3.0 @default 1.5\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 aspect = vec2(resolution.x / resolution.y, 1.0);\nvec4 source = texture2D(tex, uv);\nfloat t = time * speed * 0.5;\nvec2 light_uv = vec2(\nnode_noise(vec2(t, 12.34)),\nnode_noise(vec2(t, 56.78))\n);\nlight_uv = 0.05 + light_uv * 0.9;\nfloat dynamic_z = 0.1 + node_noise(vec2(t, 91.01)) * depth_scale;\nvec3 dynamic_color = vec3(\nnode_noise(vec2(t * 0.8, 0.5)),\nnode_noise(vec2(t * 0.8, 1.5)),\nnode_noise(vec2(t * 0.8, 2.5))\n);\ndynamic_color = normalize(dynamic_color + 0.3);\nfloat luma = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nvec3 surfacePos = vec3(uv * aspect, luma * 0.15);\nvec3 lightPos = vec3(light_uv * aspect, dynamic_z);\nfloat dist = length(lightPos - surfacePos);\nfloat falloff = dist / range;\nfloat attenuation = exp(-falloff * falloff * 2.2) * 0.8 + exp(-falloff * 1.2) * 0.4;\nvec3 lighting = dynamic_color * attenuation * brightness;\nvec3 finalRGB = source.rgb * (lighting + 0.12);\nreturn vec4(finalRGB, source.a);\n}",
    "uniformValues": {
      "speed": 25.07,
      "range": 0.738,
      "brightness": 3.05,
      "depth_scale": 1.5
    }
  },
  {
    "id": "timeline-6cc5875d-0802-46b0-b848-710c6e77e5bd",
    "name": "Random Light Shadow BPM",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Random Light Shadow BPM\nuniform float bpm; // @min 1.0 @max 240.0 @default 120.0\nuniform float light_z; // @min 0.01 @max 1.0 @default 0.15\nuniform float intensity; // @min 0.0 @max 10.0 @default 5.0\nuniform float ambient; // @min 0.0 @max 1.0 @default 0.1\nuniform float bump; // @min 0.001 @max 0.2 @default 0.05\nuniform float speed; // @min 0.1 @max 2.0 @default 1.0\nuniform float lightspped; // @min 0.0 @max 10.0 @default 1.0\nuniform float edge_glow; // @min 0.0 @max 5.0 @default 1.5\nuniform float shadow_strength; // @min 0.0 @max 1.0 @default 0.8\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 texel = 1.0 / resolution;\nvec4 source = texture2D(tex, uv);\nfloat beat = floor(time * (bpm / 60.0) * speed * lightspped);\nvec2 lp = vec2(\nnode_rand(vec2(beat, 12.345)),\nnode_rand(vec2(beat, 67.890))\n);\nvec3 lumWeight = vec3(0.299, 0.587, 0.114);\nfloat l = dot(source.rgb, lumWeight);\nfloat lx = dot(texture2D(tex, uv + vec2(texel.x, 0.0)).rgb, lumWeight);\nfloat ly = dot(texture2D(tex, uv + vec2(0.0, texel.y)).rgb, lumWeight);\nvec2 grad = vec2(l - lx, l - ly);\nvec3 normal = normalize(vec3(grad, bump));\nvec3 lightPos3D = vec3(lp, light_z);\nvec3 fragPos3D = vec3(uv, l * bump);\nvec3 dir = normalize(lightPos3D - fragPos3D);\nfloat shadow = 1.0;\nfloat currentH = l * bump;\nvec2 rayStep = (lp - uv) * 0.125;\nfor (int i = 1; i <= 8; i++) {\nvec2 sampleUv = uv + rayStep * float(i);\nfloat sampleHeight = dot(texture2D(tex, sampleUv).rgb, lumWeight) * bump;\nfloat rayHeight = mix(currentH, light_z, float(i) * 0.125);\nif (sampleHeight > rayHeight) {\nshadow = 1.0 - shadow_strength;\nbreak;\n}\n}\nfloat dist = distance(lightPos3D, fragPos3D);\nfloat atten = 1.0 / (1.0 + dist * dist * 20.0);\nfloat diff = max(dot(normal, dir), 0.0);\nfloat edge = length(grad) * edge_glow * 10.0;\nfloat directLight = (diff * intensity * atten) * shadow;\nvec3 lighting = source.rgb * (ambient + directLight);\nlighting += vec3(edge * atten * intensity * shadow);\nreturn vec4(lighting, source.a);\n}",
    "uniformValues": {
      "bpm": 44.02,
      "light_z": 0.01,
      "intensity": 2,
      "ambient": 0,
      "bump": 0.2,
      "speed": 0.86,
      "lightspped": 9.8,
      "edge_glow": 0.05,
      "shadow_strength": 0.5
    }
  },
  {
    "id": "timeline-a384ce44-4229-4f2c-82c6-878a73da5f91",
    "name": "Reactive Cloud Perturbations",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Reactive Cloud Perturbations\nuniform float speed; // @min 0.0 @max 0.5 @default 0.1\nuniform float density; // @min 0.5 @max 5.0 @default 2.0\nuniform float distortion; // @min 0.0 @max 2.0 @default 0.5\nuniform float contrast; // @min 0.5 @max 2.0 @default 1.25\nfloat fbm_reactive(vec2 p, float seed) {\nfloat v = 0.0;\nfloat a = 0.5;\nvec2 shift = vec2(seed * 13.17, seed * 1.21);\nfor (int i = 0; i < 5; i++) {\nv += a * node_noise(p + shift);\np *= 2.0;\na *= 0.5;\n}\nreturn v;\n}\nfloat cosh_shaper(float x, float s) {\nfloat y = cos(fract(x) * 3.14159265);\nreturn floor(x) + 0.5 - (0.5 * pow(abs(y), 1.0 / s) * sign(y));\n}\nvec3 gradient_reactive(float t, vec3 a, vec3 b, vec3 c, vec3 d) {\nreturn a + b * cos(6.28318 * (c * t + d));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec2 p = (uv * 2.0 - 1.0) * vec2(resolution.x / resolution.y, 1.0);\nfloat t = time * speed + 1.0;\nfloat mag = length(p);\nvec3 c1 = source.rgb * 0.3;\nvec3 c2 = vec3(0.4);\nvec3 c3 = vec3(1.0);\nvec3 c4 = source.rgb * (sin(t) * 0.1 + 0.4);\nfloat d = 0.0;\nvec3 col = vec3(0.0);\nfloat ti = floor(t);\nfloat tf = fract(t);\nvec2 st = p * density + (source.rg - 0.5) * distortion;\nfor (int i = 0; i < 3; i++) {\nst *= 2.0;\nfloat da = fbm_reactive(st * d + source.b * 0.1, ti);\nfloat db = fbm_reactive(st * d + source.b * 0.1, ti + 1.0);\nd = mix(da, db, pow(tf, 0.25));\ncol += gradient_reactive(d * 2.0 - t * 0.5 + mag * float(i), c1, c2, c3, c4) * d;\n}\nfloat s = contrast + sin(5.0 * t + mag + d) * 0.25;\ncol.r = cosh_shaper(col.r, s);\ncol.g = cosh_shaper(col.g, s);\ncol.b = cosh_shaper(col.b, s);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nvec3 finalCol = mix(source.rgb * col, col, lum);\nreturn vec4(finalCol, 1.0);\n}",
    "uniformValues": {
      "speed": 0.82,
      "density": 2,
      "distortion": 0.76,
      "contrast": 1.25
    }
  },
  {
    "id": "timeline-da6d6953-ed6a-4d1f-9f12-4f911f131f1e",
    "name": "Rounded Pixel Swirl",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Rounded Pixel Swirl\nuniform float colorShift; // @min 0.0 @max 10.0 @default 3.0\nuniform float intensity; // @min 0.0 @max 1.0 @default 0.9\nuniform float blur; // @min 0.0 @max 1.0 @default 0.5\nuniform float pixelSize; // @min 1.0 @max 50.0 @default 15.0\nuniform float roundness; // @min 0.0 @max 1.0 @default 0.4\nuniform float spacing; // @min 0.0 @max 0.5 @default 0.1\nvec3 palette(float t){\nreturn vec3(0.84, 0.49, 0.85) + vec3(0.52, 0.56, 0.88) * cos(6.28318 * (vec3(0.18, 0.40, 0.07) * t + vec3(0.28, 0.68, 0.30)));\n}\nvec2 swirl(vec2 p, float strength, float freq, float speed, float time) {\nfloat r = length(p);\nfloat a = atan(p.y, p.x);\nfloat w = sin(speed * time + freq * r);\na += strength * r * w + strength * r * sin(speed * time + freq * r + 3.0 * a);\nreturn (r + 0.06 * w) * vec2(cos(a), sin(a));\n}\nvec3 makeFlower(vec2 p, float level, float time, float b) {\nfloat r = length(p);\nvec2 cuv = vec2(atan(p.y, p.x) / 6.28318 + 0.5, r / 0.8);\nfloat m = smoothstep(0.8 + b, 0.8 - b, r);\nfloat stripe = 0.05 / (pow(0.5 + 0.5 * sin(6.28318 * (cuv.x * 8.0 + time)), 2.0) + b * 0.5 + 0.05);\nreturn vec3(stripe) * palette(cuv.y * sin(time * 0.25) * 3.0 + level) * smoothstep(1.0, 0.4 - b * 0.2, cuv.y) * smoothstep(0.0, 0.4 + b * 0.2, cuv.y) * m;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 grid = resolution / max(1.0, pixelSize);\nvec2 puv = (floor(uv * grid) + 0.5) / grid;\nvec2 local = (fract(uv * grid) - 0.5) * 2.0;\nfloat r_limit = 1.0 - spacing;\nvec2 d = abs(local) - (r_limit - roundness);\nfloat dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);\nfloat mask = smoothstep(roundness, roundness - 0.05, dist);\nvec4 source = texture2D(tex, puv);\nvec2 p = (puv * 2.0 - 1.0);\np.x *= resolution.x / resolution.y;\nfloat t_r = time + source.r * colorShift;\nfloat t_g = time + source.g * colorShift;\nfloat t_b = time + source.b * colorShift;\np = swirl(p * (sin(time * 0.25) + 1.15), 0.15, 0.15, 0.1 + source.b * 0.3, t_r);\nvec3 finalCol = makeFlower(p, 4.0 + source.g * colorShift, t_g, blur);\np /= 8.0;\nfloat r_len = length(mat2(1.0, 0.3, -0.2, 1.0) * p);\nfor (int i = 0; i < 2; i++) {\nfloat fi = float(i);\nvec2 p_loop = abs(fract(p * 2.0) - 0.5) * 2.0;\nfinalCol += makeFlower(p_loop * exp(-r_len), fi + source.r * colorShift, t_b, blur) / (fi + 0.5);\n}\nvec3 blended = mix(source.rgb, finalCol, intensity * smoothstep(0.05, 0.4, dot(source.rgb, vec3(0.299, 0.587, 0.114))));\nreturn vec4(blended * mask, source.a * mask);\n}",
    "uniformValues": {
      "colorShift": 6.7,
      "intensity": 0.9,
      "blur": 0.08,
      "pixelSize": 10.8,
      "roundness": 1,
      "spacing": 0.48
    }
  },
  {
    "id": "timeline-09c2541b-0024-48df-a028-06c69e5a20c7",
    "name": "Soft Symmetrical Scanner with Blurred Trace",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Soft Symmetrical Scanner with Blurred Trace\nuniform float rangeWidth; // @min 0.0 @max 1.0 @default 0.2\nuniform float speed; // @min -2.0 @max 2.0 @default 0.5\nuniform vec3 tintColor; // @default 1.0,0.5,0.0\nuniform float edgeSoftness; // @min 0.001 @max 0.5 @default 0.05\nuniform float borderSoftness; // @min 0.001 @max 1.0 @default 0.2\nuniform float traceLength; // @min 0.0 @max 1.0 @default 0.3\nuniform float whiteBlurAmount; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.001 @max 0.5 @default 0.05\nuniform float psychScale; // @min 1.0 @max 50.0 @default 20.0\nuniform float psychIntensity; // @min 0.0 @max 1.0 @default 0.3\nuniform float whiteOpacity; // @min 0.0 @max 5.0 @default 1.2\nvec3 rgb2hsv(vec3 c) {\nvec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\nvec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\nvec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));\nfloat d = q.x - min(q.w, q.y);\nfloat e = 1.0e-10;\nreturn vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\nvec3 hsv2rgb(vec3 c) {\nvec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\nvec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\nreturn c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 symUv = vec2(uv.x > 0.5 ? 1.0 - uv.x : uv.x, uv.y);\nvec4 source = texture2D(tex, symUv);\nvec3 hsv = rgb2hsv(source.rgb);\nfloat targetHue = fract(time * speed);\nfloat signedDist = fract(hsv.x - targetHue + 0.5) - 0.5;\nfloat dist = abs(signedDist);\nfloat mask = smoothstep(rangeWidth * 0.5 + edgeSoftness, rangeWidth * 0.5, dist);\nfloat dir = speed >= 0.0 ? 1.0 : -1.0;\nfloat finalWhite = 0.0;\nfloat totalWeight = 0.0;\nvec2 texel = 1.0 / resolution;\nfor(int i = -1; i <= 1; i++) {\nfor(int j = -1; j <= 1; j++) {\nvec2 offset = vec2(float(i), float(j)) * whiteBlurAmount * texel * 2.0;\nvec2 sampleUv = symUv + offset;\nvec4 s = texture2D(tex, sampleUv);\nvec3 shsv = rgb2hsv(s.rgb);\nfloat sDistSigned = fract(shsv.x - targetHue + 0.5) - 0.5;\nfloat sDist = abs(sDistSigned);\nfloat b = smoothstep(borderSoftness, 0.0, abs(sDist - rangeWidth * 0.5));\nfloat t = smoothstep(rangeWidth * 0.5 + traceLength, rangeWidth * 0.5, sDist) * step(0.0, -sDistSigned * dir);\nfloat weight = 1.0 - (abs(float(i)) + abs(float(j))) * 0.25;\nfinalWhite += max(b, t) * weight;\ntotalWeight += weight;\n}\n}\nfinalWhite /= totalWeight;\nfloat psychShift = sin(symUv.x * psychScale + time * 3.0) * psychIntensity +\ncos(symUv.y * psychScale - time * 2.0) * psychIntensity + time * 2.0;\nhsv.x = fract(hsv.x + psychShift);\nhsv.y = clamp(hsv.y * 1.5, 0.0, 1.0);\nvec3 psychColor = hsv2rgb(hsv);\npsychColor *= tintColor * 1.5;\nvec3 finalColor = psychColor * mask + vec3(1.0) * finalWhite * whiteOpacity;\nfloat blackMask = smoothstep(0.0, blackThreshold, hsv.z);\nfinalColor *= blackMask;\nreturn vec4(clamp(finalColor, 0.0, 1.0), source.a);\n}",
    "uniformValues": {
      "rangeWidth": 0.75,
      "speed": 1.04,
      "tintColor": [
        0.3607843137254902,
        0.28627450980392155,
        0.396078431372549
      ],
      "edgeSoftness": 0.16567,
      "borderSoftness": 0.001,
      "traceLength": 0.95,
      "whiteBlurAmount": 9,
      "blackThreshold": 0.03593,
      "psychScale": 18.64,
      "psychIntensity": 0.62,
      "whiteOpacity": 0.35
    }
  },
  {
    "id": "timeline-0ffafeec-be83-44dd-ae96-fa29a9591ca6",
    "name": "Soft Symmetrical Scanner with Blurred Trace",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Soft Symmetrical Scanner with Blurred Trace\nuniform float rangeWidth; // @min 0.0 @max 1.0 @default 0.2\nuniform float speed; // @min -2.0 @max 2.0 @default 0.5\nuniform vec3 tintColor; // @default 1.0,0.5,0.0\nuniform float edgeSoftness; // @min 0.001 @max 0.5 @default 0.05\nuniform float borderSoftness; // @min 0.001 @max 1.0 @default 0.2\nuniform float traceLength; // @min 0.0 @max 1.0 @default 0.3\nuniform float whiteBlurAmount; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.001 @max 0.5 @default 0.05\nuniform float psychScale; // @min 1.0 @max 50.0 @default 20.0\nuniform float psychIntensity; // @min 0.0 @max 1.0 @default 0.3\nuniform float whiteOpacity; // @min 0.0 @max 5.0 @default 1.2\nvec3 rgb2hsv(vec3 c) {\nvec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\nvec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\nvec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));\nfloat d = q.x - min(q.w, q.y);\nfloat e = 1.0e-10;\nreturn vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\nvec3 hsv2rgb(vec3 c) {\nvec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\nvec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\nreturn c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 symUv = vec2(uv.x > 0.5 ? 1.0 - uv.x : uv.x, uv.y);\nvec4 source = texture2D(tex, symUv);\nvec3 hsv = rgb2hsv(source.rgb);\nfloat targetHue = fract(time * speed);\nfloat signedDist = fract(hsv.x - targetHue + 0.5) - 0.5;\nfloat dist = abs(signedDist);\nfloat mask = smoothstep(rangeWidth * 0.5 + edgeSoftness, rangeWidth * 0.5, dist);\nfloat dir = speed >= 0.0 ? 1.0 : -1.0;\nfloat finalWhite = 0.0;\nfloat totalWeight = 0.0;\nvec2 texel = 1.0 / resolution;\nfor(int i = -1; i <= 1; i++) {\nfor(int j = -1; j <= 1; j++) {\nvec2 offset = vec2(float(i), float(j)) * whiteBlurAmount * texel * 2.0;\nvec2 sampleUv = symUv + offset;\nvec4 s = texture2D(tex, sampleUv);\nvec3 shsv = rgb2hsv(s.rgb);\nfloat sDistSigned = fract(shsv.x - targetHue + 0.5) - 0.5;\nfloat sDist = abs(sDistSigned);\nfloat b = smoothstep(borderSoftness, 0.0, abs(sDist - rangeWidth * 0.5));\nfloat t = smoothstep(rangeWidth * 0.5 + traceLength, rangeWidth * 0.5, sDist) * step(0.0, -sDistSigned * dir);\nfloat weight = 1.0 - (abs(float(i)) + abs(float(j))) * 0.25;\nfinalWhite += max(b, t) * weight;\ntotalWeight += weight;\n}\n}\nfinalWhite /= totalWeight;\nfloat psychShift = sin(symUv.x * psychScale + time * 3.0) * psychIntensity +\ncos(symUv.y * psychScale - time * 2.0) * psychIntensity + time * 2.0;\nhsv.x = fract(hsv.x + psychShift);\nhsv.y = clamp(hsv.y * 1.5, 0.0, 1.0);\nvec3 psychColor = hsv2rgb(hsv);\npsychColor *= tintColor * 1.5;\nvec3 finalColor = psychColor * mask + vec3(1.0) * finalWhite * whiteOpacity;\nfloat blackMask = smoothstep(0.0, blackThreshold, hsv.z);\nfinalColor *= blackMask;\nreturn vec4(clamp(finalColor, 0.0, 1.0), source.a);\n}",
    "uniformValues": {
      "rangeWidth": 0,
      "speed": 1.76,
      "tintColor": [
        0.03529411764705882,
        0.17254901960784313,
        0.00784313725490196
      ],
      "edgeSoftness": 0.5,
      "borderSoftness": 0.001,
      "traceLength": 1,
      "whiteBlurAmount": 10,
      "blackThreshold": 0.34531,
      "psychScale": 50,
      "psychIntensity": 0,
      "whiteOpacity": 0.45
    }
  },
  {
    "id": "timeline-5f69bb27-3a59-433e-877f-754ddfb362c1",
    "name": "Soft Symmetrical Scanner with Blurred Trace",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Soft Symmetrical Scanner with Blurred Trace\nuniform float rangeWidth; // @min 0.0 @max 1.0 @default 0.2\nuniform float speed; // @min -2.0 @max 2.0 @default 0.5\nuniform vec3 tintColor; // @default 1.0,0.5,0.0\nuniform float edgeSoftness; // @min 0.001 @max 0.5 @default 0.05\nuniform float borderSoftness; // @min 0.001 @max 1.0 @default 0.2\nuniform float traceLength; // @min 0.0 @max 1.0 @default 0.3\nuniform float whiteBlurAmount; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.001 @max 0.5 @default 0.05\nuniform float psychScale; // @min 1.0 @max 50.0 @default 20.0\nuniform float psychIntensity; // @min 0.0 @max 1.0 @default 0.3\nuniform float whiteOpacity; // @min 0.0 @max 5.0 @default 1.2\nvec3 rgb2hsv(vec3 c) {\nvec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\nvec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\nvec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));\nfloat d = q.x - min(q.w, q.y);\nfloat e = 1.0e-10;\nreturn vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\nvec3 hsv2rgb(vec3 c) {\nvec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\nvec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\nreturn c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 symUv = vec2(uv.x > 0.5 ? 1.0 - uv.x : uv.x, uv.y);\nvec4 source = texture2D(tex, symUv);\nvec3 hsv = rgb2hsv(source.rgb);\nfloat targetHue = fract(time * speed);\nfloat signedDist = fract(hsv.x - targetHue + 0.5) - 0.5;\nfloat dist = abs(signedDist);\nfloat mask = smoothstep(rangeWidth * 0.5 + edgeSoftness, rangeWidth * 0.5, dist);\nfloat dir = speed >= 0.0 ? 1.0 : -1.0;\nfloat finalWhite = 0.0;\nfloat totalWeight = 0.0;\nvec2 texel = 1.0 / resolution;\nfor(int i = -1; i <= 1; i++) {\nfor(int j = -1; j <= 1; j++) {\nvec2 offset = vec2(float(i), float(j)) * whiteBlurAmount * texel * 2.0;\nvec2 sampleUv = symUv + offset;\nvec4 s = texture2D(tex, sampleUv);\nvec3 shsv = rgb2hsv(s.rgb);\nfloat sDistSigned = fract(shsv.x - targetHue + 0.5) - 0.5;\nfloat sDist = abs(sDistSigned);\nfloat b = smoothstep(borderSoftness, 0.0, abs(sDist - rangeWidth * 0.5));\nfloat t = smoothstep(rangeWidth * 0.5 + traceLength, rangeWidth * 0.5, sDist) * step(0.0, -sDistSigned * dir);\nfloat weight = 1.0 - (abs(float(i)) + abs(float(j))) * 0.25;\nfinalWhite += max(b, t) * weight;\ntotalWeight += weight;\n}\n}\nfinalWhite /= totalWeight;\nfloat psychShift = sin(symUv.x * psychScale + time * 3.0) * psychIntensity +\ncos(symUv.y * psychScale - time * 2.0) * psychIntensity + time * 2.0;\nhsv.x = fract(hsv.x + psychShift);\nhsv.y = clamp(hsv.y * 1.5, 0.0, 1.0);\nvec3 psychColor = hsv2rgb(hsv);\npsychColor *= tintColor * 1.5;\nvec3 finalColor = psychColor * mask + vec3(1.0) * finalWhite * whiteOpacity;\nfloat blackMask = smoothstep(0.0, blackThreshold, hsv.z);\nfinalColor *= blackMask;\nreturn vec4(clamp(finalColor, 0.0, 1.0), source.a);\n}",
    "uniformValues": {
      "rangeWidth": 0,
      "speed": 1.76,
      "tintColor": [
        0.09019607843137255,
        0.24705882352941178,
        0.25098039215686274
      ],
      "edgeSoftness": 0.24551,
      "borderSoftness": 0.45055,
      "traceLength": 1,
      "whiteBlurAmount": 1.7,
      "blackThreshold": 0.5,
      "psychScale": 50,
      "psychIntensity": 0.65,
      "whiteOpacity": 0.3
    }
  },
  {
    "id": "timeline-58b9be84-3020-40c6-ac08-a0955bcb09ec",
    "name": "Soft Symmetrical Scanner2",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Soft Symmetrical Scanner2\nuniform float rangeWidth; // @min 0.0 @max 1.0 @default 0.2\nuniform float speed; // @min -2.0 @max 2.0 @default 0.5\nuniform vec3 tintColor; // @default 1.0,0.5,0.0\nuniform float edgeSoftness; // @min 0.001 @max 0.5 @default 0.05\nuniform float borderSoftness; // @min 0.001 @max 1.0 @default 0.2\nuniform float blackThreshold; // @min 0.001 @max 0.5 @default 0.05\nuniform float psychScale; // @min 1.0 @max 50.0 @default 20.0\nuniform float psychIntensity; // @min 0.0 @max 1.0 @default 0.3\nuniform float addbackgroundcolor; // @min 0.0 @max 1.0 @default 0.5\nvec3 rgb2hsv(vec3 c) {\nvec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\nvec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\nvec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));\nfloat d = q.x - min(q.w, q.y);\nfloat e = 1.0e-10;\nreturn vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\nvec3 hsv2rgb(vec3 c) {\nvec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\nvec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\nreturn c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 symUv = vec2(uv.x > 0.5 ? 1.0 - uv.x : uv.x, uv.y);\nvec4 source = texture2D(tex, symUv);\nvec3 hsv = rgb2hsv(source.rgb);\nfloat targetHue = fract(time * speed);\nfloat dist = abs(fract(hsv.x - targetHue + 0.5) - 0.5);\nfloat mask = smoothstep(rangeWidth * 0.5 + edgeSoftness, rangeWidth * 0.5, dist);\nfloat border = smoothstep(borderSoftness, 0.0, abs(dist - rangeWidth * 0.5));\nfloat psychShift = sin(symUv.x * psychScale + time * 3.0) * psychIntensity +\ncos(symUv.y * psychScale - time * 2.0) * psychIntensity + time * 2.0;\nhsv.x = fract(hsv.x + psychShift);\nhsv.y = clamp(hsv.y * 1.5, 0.0, 1.0);\nvec3 psychColor = hsv2rgb(hsv);\npsychColor *= tintColor * 1.5;\nvec3 finalColor = psychColor * mask + vec3(1.0) * border * 1.2;\nfinalColor += source.rgb * addbackgroundcolor * (1.0 - clamp(mask + border, 0.0, 1.0));\nfloat blackMask = smoothstep(0.0, blackThreshold, hsv.z);\nfinalColor *= blackMask;\nreturn vec4(clamp(finalColor, 0.0, 1.0), source.a);\n}",
    "uniformValues": {
      "rangeWidth": 0,
      "speed": 2,
      "tintColor": [
        0.9921568627450981,
        0.8666666666666667,
        0.07058823529411765
      ],
      "edgeSoftness": 0.09581,
      "borderSoftness": 0.001,
      "blackThreshold": 0.17066,
      "psychScale": 19.62,
      "psychIntensity": 0.08,
      "addbackgroundcolor": 0.06
    }
  },
  {
    "id": "timeline-84a19e91-546f-413e-a36c-db6555304ebc",
    "name": "Soft Symmetrical Scanner",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Soft Symmetrical Scanner\nuniform float rangeWidth; // @min 0.0 @max 1.0 @default 0.2\nuniform float speed; // @min -2.0 @max 2.0 @default 0.5\nuniform vec3 tintColor; // @default 1.0,0.5,0.0\nuniform float edgeSoftness; // @min 0.001 @max 0.5 @default 0.05\nuniform float borderSoftness; // @min 0.001 @max 1.0 @default 0.2\nuniform float blackThreshold; // @min 0.001 @max 0.5 @default 0.05\nuniform float psychScale; // @min 1.0 @max 50.0 @default 20.0\nuniform float psychIntensity; // @min 0.0 @max 1.0 @default 0.3\nuniform float addbackgroundcolor; // @min 0.0 @max 1.0 @default 0.5\nvec3 rgb2hsv(vec3 c) {\nvec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\nvec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\nvec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));\nfloat d = q.x - min(q.w, q.y);\nfloat e = 1.0e-10;\nreturn vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\nvec3 hsv2rgb(vec3 c) {\nvec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\nvec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\nreturn c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 symUv = vec2(uv.x > 0.5 ? 1.0 - uv.x : uv.x, uv.y);\nvec4 source = texture2D(tex, symUv);\nvec3 hsv = rgb2hsv(source.rgb);\nfloat targetHue = fract(time * speed);\nfloat dist = abs(fract(hsv.x - targetHue + 0.5) - 0.5);\nfloat mask = smoothstep(rangeWidth * 0.5 + edgeSoftness, rangeWidth * 0.5, dist);\nfloat border = smoothstep(borderSoftness, 0.0, abs(dist - rangeWidth * 0.5));\nfloat psychShift = sin(symUv.x * psychScale + time * 3.0) * psychIntensity +\ncos(symUv.y * psychScale - time * 2.0) * psychIntensity + time * 2.0;\nhsv.x = fract(hsv.x + psychShift);\nhsv.y = clamp(hsv.y * 1.5, 0.0, 1.0);\nvec3 psychColor = hsv2rgb(hsv);\npsychColor *= tintColor * 1.5;\nvec3 finalColor = psychColor * mask + vec3(1.0) * border * 1.2;\nfinalColor += source.rgb * addbackgroundcolor * (1.0 - clamp(mask + border, 0.0, 1.0));\nfloat blackMask = smoothstep(0.0, blackThreshold, hsv.z);\nfinalColor *= blackMask;\nreturn vec4(clamp(finalColor, 0.0, 1.0), source.a);\n}",
    "uniformValues": {
      "rangeWidth": 0.02,
      "speed": 2,
      "tintColor": [
        0.054901960784313725,
        0.0392156862745098,
        1
      ],
      "edgeSoftness": 0.5,
      "borderSoftness": 0.15085,
      "blackThreshold": 0.33034,
      "psychScale": 19.62,
      "psychIntensity": 0.89,
      "addbackgroundcolor": 0.08
    }
  },
  {
    "id": "timeline-f7706a66-a878-4ea7-9142-1568e8892ebb",
    "name": "Soft Symmetrical Scanner",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Soft Symmetrical Scanner\nuniform float rangeWidth; // @min 0.0 @max 1.0 @default 0.2\nuniform float speed; // @min -2.0 @max 2.0 @default 0.5\nuniform vec3 tintColor; // @default 1.0,0.5,0.0\nuniform float edgeSoftness; // @min 0.001 @max 0.5 @default 0.05\nuniform float borderSoftness; // @min 0.001 @max 1.0 @default 0.2\nuniform float blackThreshold; // @min 0.001 @max 0.5 @default 0.05\nuniform float psychScale; // @min 1.0 @max 50.0 @default 20.0\nuniform float psychIntensity; // @min 0.0 @max 1.0 @default 0.3\nuniform float addbackgroundcolor; // @min 0.0 @max 1.0 @default 0.5\nvec3 rgb2hsv(vec3 c) {\nvec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\nvec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\nvec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));\nfloat d = q.x - min(q.w, q.y);\nfloat e = 1.0e-10;\nreturn vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\nvec3 hsv2rgb(vec3 c) {\nvec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\nvec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\nreturn c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 symUv = vec2(uv.x > 0.5 ? 1.0 - uv.x : uv.x, uv.y);\nvec4 source = texture2D(tex, symUv);\nvec3 hsv = rgb2hsv(source.rgb);\nfloat targetHue = fract(time * speed);\nfloat dist = abs(fract(hsv.x - targetHue + 0.5) - 0.5);\nfloat mask = smoothstep(rangeWidth * 0.5 + edgeSoftness, rangeWidth * 0.5, dist);\nfloat border = smoothstep(borderSoftness, 0.0, abs(dist - rangeWidth * 0.5));\nfloat psychShift = sin(symUv.x * psychScale + time * 3.0) * psychIntensity +\ncos(symUv.y * psychScale - time * 2.0) * psychIntensity + time * 2.0;\nhsv.x = fract(hsv.x + psychShift);\nhsv.y = clamp(hsv.y * 1.5, 0.0, 1.0);\nvec3 psychColor = hsv2rgb(hsv);\npsychColor *= tintColor * 1.5;\nvec3 finalColor = psychColor * mask + vec3(1.0) * border * 1.2;\nfinalColor += source.rgb * addbackgroundcolor * (1.0 - clamp(mask + border, 0.0, 1.0));\nfloat blackMask = smoothstep(0.0, blackThreshold, hsv.z);\nfinalColor *= blackMask;\nreturn vec4(clamp(finalColor, 0.0, 1.0), source.a);\n}",
    "uniformValues": {
      "rangeWidth": 0.25,
      "speed": 2,
      "tintColor": [
        0.9294117647058824,
        0.9294117647058824,
        0.9294117647058824
      ],
      "edgeSoftness": 0.001,
      "borderSoftness": 0.09091,
      "blackThreshold": 0.5,
      "psychScale": 2.96,
      "psychIntensity": 0.17,
      "addbackgroundcolor": 0.38
    }
  },
  {
    "id": "timeline-b1862460-0e75-4025-937c-c9ba29717c2b",
    "name": "Speed-Looping Chrome Halo",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Speed-Looping Chrome Halo\nuniform float speed; // @min 0.1 @max 2.0 @default 0.5\nuniform float speed_loop; // @min 0.0 @max 5.0 @default 1.0\nuniform float range_width; // @min 0.01 @max 0.5 @default 0.1\nuniform float halo_strength; // @min 0.0 @max 3.0 @default 1.5\nuniform float halo_spread; // @min 1.0 @max 15.0 @default 5.0\nuniform vec3 halo_color; // @default 0.0,0.8,1.0\nuniform float zoom; // @min 1.0 @max 10.0 @default 4.0\nuniform float psy_blend; // @min 0.0 @max 1.0 @default 0.8\nuniform float contrast; // @min 0.5 @max 2.0 @default 1.2\nuniform float saturation; // @min 0.0 @max 2.0 @default 1.3\nfloat getActivity(sampler2D t, vec2 uv, float target, float width) {\nvec3 c = texture2D(t, uv).rgb;\nfloat lum = dot(c, vec3(0.299, 0.587, 0.114));\nif (lum < 0.02) return 0.0;\nfloat diff = abs(lum - target);\nif (diff > 0.5) diff = 1.0 - diff;\nreturn smoothstep(width, width * 0.5, diff);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat origLum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nif (origLum < 0.01) return vec4(0.0, 0.0, 0.0, source.a);\nvec2 texel = 1.0 / resolution;\nfloat t_mod = time * speed;\nif (speed_loop > 0.0) {\nt_mod += (sin(time * speed_loop) * 0.5);\n}\nfloat dynSpread = halo_spread * (0.6 + 0.4 * node_noise(vec2(t_mod * 0.5, 7.12)));\nfloat dynStrength = halo_strength * (0.5 + 0.5 * node_noise(vec2(13.45, t_mod * 0.7)));\nfloat target = fract(t_mod * 0.2);\nfloat active = getActivity(tex, uv, target, range_width);\nvec3 finalRGB = vec3(0.0);\nif (active > 0.01) {\nvec3 groupedColor = floor(source.rgb * 10.0) / 10.0;\nfloat groupID = node_rand(groupedColor.rg + groupedColor.b);\nfloat localTime = t_mod + (groupID * 10.0);\nvec2 p = (uv - 0.5) * zoom;\np.x *= resolution.x / resolution.y;\nvec3 psy = vec3(0.0);\nfor (int i = 0; i < 4; i++) {\nfloat fi = float(i);\nfloat angle = localTime * 0.2 + fi * 1.047 + (groupID * 6.28);\nfloat s = sin(angle), c = cos(angle);\np = vec2(p.x * c - p.y * s, p.x * s + p.y * c);\np = abs(p) - (0.3 + groupID * 0.1);\nif (p.x < p.y) p = p.yx;\nfloat d = max(abs(p.x) * 0.866 + p.y * 0.5, -p.y);\npsy.r += sin(d * 12.0 + localTime) * 0.5 + 0.5;\npsy.g += sin(d * 12.0 + localTime + 2.09) * 0.5 + 0.5;\npsy.b += sin(d * 12.0 + localTime + 4.18) * 0.5 + 0.5;\n}\nfinalRGB = mix(source.rgb, (psy / 4.0) * 2.0, psy_blend * active);\n} else {\nfloat haloIntensity = 0.0;\nvec2 offsets[8];\noffsets[0] = vec2(1, 1); offsets[1] = vec2(-1, -1);\noffsets[2] = vec2(1, -1); offsets[3] = vec2(-1, 1);\noffsets[4] = vec2(0, 1); offsets[5] = vec2(0, -1);\noffsets[6] = vec2(1, 0); offsets[7] = vec2(-1, 0);\nfor (int i = 0; i < 8; i++) {\nhaloIntensity += getActivity(tex, uv + offsets[i] * texel * dynSpread, target, range_width);\n}\nhaloIntensity /= 8.0;\nif (haloIntensity > 0.001) {\nvec3 dynamicColor = halo_color * (0.6 + 0.4 * sin(t_mod * 3.0 + origLum));\nfinalRGB = dynamicColor * haloIntensity * dynStrength;\n} else {\nreturn vec4(0.0, 0.0, 0.0, source.a);\n}\n}\nfinalRGB = (finalRGB - 0.5) * contrast + 0.5;\nfloat gray = dot(finalRGB, vec3(0.299, 0.587, 0.114));\nfinalRGB = mix(vec3(gray), finalRGB, saturation);\nfinalRGB *= smoothstep(0.0, 0.02, origLum);\nreturn vec4(clamp(finalRGB, 0.0, 1.0), source.a);\n}",
    "uniformValues": {
      "speed": 1.582,
      "speed_loop": 3.7,
      "range_width": 0.1864,
      "halo_strength": 3,
      "halo_spread": 14.86,
      "halo_color": [
        0.7333333333333333,
        0.027450980392156862,
        0.7098039215686275
      ],
      "zoom": 2.89,
      "psy_blend": 0.95,
      "contrast": 1.13,
      "saturation": 1.04
    }
  },
  {
    "id": "timeline-3b431b13-c948-4a1e-9271-51c4665722b5",
    "name": "Symmetrical Fractal Path",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Symmetrical Fractal Path\nuniform float speed; // @min 0.0 @max 2.0 @default 0.6\nuniform float scale; // @min 0.5 @max 10.0 @default 3.5\nuniform float intensity; // @min 0.1 @max 2.0 @default 1.2\nuniform float gridDensity; // @min 5.0 @max 50.0 @default 25.0\nuniform float shakeAmount; // @min 0.0 @max 2.0 @default 0.6\nuniform float dotSize; // @min 0.01 @max 0.5 @default 0.18\nuniform float glowRange; // @min 0.1 @max 1.0 @default 0.7\nuniform float randomness; // @min 0.0 @max 2.0 @default 1.2\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat aspect = resolution.x / resolution.y;\nfloat t = time * speed;\nvec2 symUv = abs(uv - 0.5);\nvec2 drift = vec2(node_noise(vec2(t * 0.1, 0.42)), node_noise(vec2(0.42, t * 0.1))) * randomness * 0.2;\nvec2 p = (symUv + drift) * vec2(aspect, 1.0) * scale;\nfloat d = 1.0;\nvec2 z = p;\nfor (int i = 0; i < 5; i++) {\nfloat fi = float(i);\nfloat noiseVal = node_noise(vec2(t * 0.2, fi * 1.5));\nfloat offset = 0.3 + 0.3 * noiseVal * randomness;\nz = abs(z) - offset;\nfloat ang = t * 0.3 + fi * 0.8 + (noiseVal * 2.0 - 1.0) * randomness;\nfloat s = sin(ang);\nfloat c = cos(ang);\nz = mat2(c, -s, s, c) * z;\nd = min(d, length(z));\n}\nfloat mask = smoothstep(glowRange, 0.0, d);\nfloat colorNoise = node_noise(vec2(t * 0.5, d * 2.0)) * randomness;\nvec3 coreCol = 0.5 + 0.5 * cos(t + d * 12.0 + vec3(0.0, 2.0, 4.0) + colorNoise);\nvec3 blueEdge = vec3(0.1, 0.4, 1.0) * (1.0 + colorNoise);\nvec3 fractalCol = mix(blueEdge, coreCol, smoothstep(glowRange * 0.7, 0.0, d));\nvec3 tintedColor = source.rgb * (vec3(1.0) + fractalCol * 2.5);\nfloat jitter = node_rand(symUv + fract(time));\nvec2 dynamicShake = vec2(\nnode_noise(vec2(t * 15.0, symUv.y * 20.0)),\nnode_noise(vec2(symUv.x * 20.0, t * 15.0))\n) * mask * shakeAmount * jitter * randomness;\nfloat gravityStrength = exp(-d * 3.0);\nvec2 gravityWarp = (p - z) * gravityStrength * 0.5;\nvec2 gridUv = symUv * vec2(gridDensity * aspect, gridDensity) + gravityWarp + dynamicShake;\nvec2 gPos = fract(gridUv) - 0.5;\nfloat gridDots = smoothstep(dotSize, dotSize * 0.5, length(gPos));\nfloat brightness = clamp(length(source.rgb) * 4.0, 0.0, 1.0);\nvec3 finalGrid = vec3(gridDots) * source.a * brightness;\nvec3 finalRGB = mix(finalGrid, tintedColor, mask * intensity);\nreturn vec4(finalRGB, source.a);\n}",
    "uniformValues": {
      "speed": 1.46,
      "scale": 1.64,
      "intensity": 1,
      "gridDensity": 50,
      "shakeAmount": 2,
      "dotSize": 0.1521,
      "glowRange": 0.28,
      "randomness": 0.34
    }
  },
  {
    "id": "timeline-917aa747-27d9-49cf-89ea-e568e876309f",
    "name": "Symmetrical Halo Square with White Glow",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Symmetrical Halo Square with White Glow\nuniform float intensity; // @min 0.0 @max 5.0 @default 2.5\nuniform vec3 tint; // @default 0.1,0.5,0.9\nuniform float haloSize; // @min 0.0 @max 1.0 @default 0.6\nuniform float haloSoftness; // @min 0.01 @max 1.0 @default 0.5\nuniform float warp; // @min 0.0 @max 5.0 @default 1.5\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\nuniform float sizeofthesquare; // @min 0.0 @max 1.0 @default 0.5\nuniform float whiteSoftLight; // @min 0.0 @max 1.0 @default 0.5\nuniform float whitesoftlighttreshold; // @min 0.0 @max 1.0 @default 0.5\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 symUv = uv;\nsymUv.x = abs(symUv.x - 0.5) + 0.5;\nvec4 original = texture2D(tex, fract(symUv));\nvec2 off = 2.0 / max(resolution, vec2(1.0));\nfloat lum = dot(original.rgb, vec3(0.299, 0.587, 0.114));\nlum += dot(texture2D(tex, fract(symUv + vec2(off.x, off.y))).rgb, vec3(0.299, 0.587, 0.114));\nlum += dot(texture2D(tex, fract(symUv + vec2(-off.x, off.y))).rgb, vec3(0.299, 0.587, 0.114));\nlum += dot(texture2D(tex, fract(symUv + vec2(off.x, -off.y))).rgb, vec3(0.299, 0.587, 0.114));\nlum += dot(texture2D(tex, fract(symUv + vec2(-off.x, -off.y))).rgb, vec3(0.299, 0.587, 0.114));\nlum *= 0.2;\nfloat dynamicHaloSize = clamp(haloSize, 0.01, 0.99);\nfloat animSoftness = max(0.01, haloSoftness * (0.5 + 0.5 * sin(time * speed * 2.0)));\nfloat darkHaloMask = smoothstep(max(0.0, dynamicHaloSize - animSoftness), dynamicHaloSize, lum) *\n(1.0 - smoothstep(dynamicHaloSize, dynamicHaloSize + animSoftness, lum));\nvec2 uvWrap = symUv * 6.28318530718;\nfloat t = time * speed;\nvec2 flow = vec2(\nsin(uvWrap.x * 2.0 + cos(uvWrap.y * 2.0 + t)),\ncos(uvWrap.y * 2.0 + sin(uvWrap.x * 2.0 - t))\n) * warp * 0.25;\nfloat blobNoise = sin(uvWrap.x * 3.0 + flow.x * 5.0 + t * 1.5) * cos(uvWrap.y * 3.0 + flow.y * 5.0 - t * 1.2);\nfloat phase = lum + blobNoise * 0.5 + flow.x * 0.5 + flow.y * 0.5 - t * 0.5;\nvec3 psychColor = 0.5 + 0.5 * cos(6.28318530718 * (vec3(phase) + tint + vec3(0.02, 0.20, 0.38)));\nvec3 finalColor = clamp(psychColor * darkHaloMask * intensity, 0.0, 1.0);\nfloat cMax = max(max(original.r, original.g), original.b);\nfloat cMin = min(min(original.r, original.g), original.b);\nfloat saturation = cMax - cMin;\nfloat glowAmount = smoothstep(whitesoftlighttreshold, whitesoftlighttreshold + 0.1, saturation);\nfloat glow = glowAmount * whiteSoftLight;\nfinalColor = finalColor + (vec3(1.0) - finalColor) * glow;\nvec2 centerUv = uv - 0.5;\nfloat squareMask = step(abs(centerUv.x), sizeofthesquare * 0.5) * step(abs(centerUv.y), sizeofthesquare * 0.5);\nfloat alpha = clamp(squareMask * darkHaloMask + glow * squareMask, 0.0, 1.0);\nreturn vec4(finalColor, alpha);\n}",
    "uniformValues": {
      "intensity": 1.8,
      "tint": [
        0.6705882352941176,
        0.6431372549019608,
        0.48627450980392156
      ],
      "haloSize": 0.16,
      "haloSoftness": 0.2278,
      "warp": 2.3,
      "speed": 3,
      "sizeofthesquare": 0.99,
      "whiteSoftLight": 0.81,
      "whitesoftlighttreshold": 0.15
    }
  },
  {
    "id": "timeline-a8f085dd-8c2a-4cdd-842b-946c54770226",
    "name": "Symmetrical Halo Swirl",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Symmetrical Halo Swirl\nuniform float seed; // @min 0.0 @max 100.0 @default 0.0\nuniform float colorShift; // @min 0.0 @max 10.0 @default 3.0\nuniform float intensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float shine; // @min 0.0 @max 5.0 @default 1.5\nuniform float haloSize; // @min 0.0 @max 0.05 @default 0.01\nuniform float haloIntensity; // @min 0.0 @max 2.0 @default 0.6\nvec3 palette(float t) {\nreturn vec3(0.5) + vec3(0.5) * cos(6.28318 * (vec3(0.18, 0.40, 0.07) * t + vec3(0.28, 0.68, 0.30)));\n}\nvec2 swirl(vec2 p, float strength, float freq, float speed, float time) {\nfloat r = length(p);\nfloat a = atan(p.y, p.x) + strength * r * sin(speed * time + freq * r);\nreturn (r + 0.03 * sin(speed * time + freq * r)) * vec2(cos(a), sin(a));\n}\nvec3 makeFlower(vec2 p, float level, float time) {\nfloat d = length(p);\nfloat a = atan(p.y, p.x) / 6.28318 + 0.5;\nfloat m = smoothstep(0.8, 0.7, d);\nfloat stripe = 0.5 + 0.5 * sin(6.28318 * (a * 8.0 + time));\nvec3 col = vec3(pow(stripe, 3.0) * 5.0) * palette(d * sin(time * 0.2) * 2.0 + level);\nreturn col * (smoothstep(1.0, 0.3, d / 0.75) * smoothstep(0.0, 0.4, d / 0.75)) * m;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nfloat stime = time + seed * 23.45;\nvec2 uv_sym = vec2(0.5 + abs(uv.x - 0.5), uv.y);\nvec4 source = texture2D(tex, uv_sym);\nvec2 p = (uv_sym * 2.0 - 1.0);\np.x *= resolution.x / resolution.y;\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat t_r = stime + source.r * colorShift;\np = swirl(p * (sin(stime * 0.4) * 0.1 + 1.1), 0.12, 0.2, 0.2 + source.b * 0.3, t_r);\nvec3 finalCol = makeFlower(p, 4.0 + source.g * colorShift, stime + source.g * colorShift);\nvec2 p_iter = p * 0.25;\nfor (int i = 0; i < 2; i++) {\np_iter = abs(fract(p_iter * 2.1) - 0.5) * 2.0;\nfloat fade = smoothstep(1.0, 0.7, p_iter.x) * smoothstep(1.0, 0.7, p_iter.y);\nfinalCol += (makeFlower(p_iter * exp(-length(p * 0.25)), float(i) + source.r * colorShift, stime + source.b * colorShift) * fade / (float(i) + 1.5));\n}\nvec3 blended = mix(source.rgb, finalCol, intensity * smoothstep(0.0, 0.4, lum));\nblended += blended * (pow(lum, 3.0) * shine * 0.5 * (0.5 + 0.5 * sin(stime * 2.0)));\nvec3 halo = vec3(0.0);\nhalo += texture2D(tex, uv + vec2(haloSize, haloSize)).rgb;\nhalo += texture2D(tex, uv + vec2(-haloSize, haloSize)).rgb;\nhalo += texture2D(tex, uv + vec2(haloSize, -haloSize)).rgb;\nhalo += texture2D(tex, uv + vec2(-haloSize, -haloSize)).rgb;\nblended += (halo * 0.25) * haloIntensity * (0.5 + 0.5 * sin(stime + lum * 10.0));\nreturn vec4(blended, source.a);\n}",
    "uniformValues": {
      "seed": 0,
      "colorShift": 0,
      "intensity": 1,
      "shine": 0,
      "haloSize": 0.01,
      "haloIntensity": 0.6
    }
  },
  {
    "id": "timeline-b9147de6-2c0d-4ad7-82ab-97817a4df644",
    "name": "Symmetrical Psytrance",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Symmetrical Psytrance\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float intensity; // @min 0.0 @max 2.0 @default 1.0\nuniform float pulse_rate; // @min 0.1 @max 10.0 @default 4.0\nuniform float thresholdwhiteloopfrom01to08; // @min 0.0 @max 1.0 @default 0.5\nuniform float randomness; // @min 0.0 @max 2.0 @default 0.8\nmat2 rot(float a) {\nfloat s = sin(a), c = cos(a);\nreturn mat2(c, -s, s, c);\n}\nvec3 palette(float t, float seed, float randFactor) {\nvec3 a = vec3(0.5, 0.5, 0.5);\nvec3 b = vec3(0.5, 0.5, 0.5);\nvec3 c = vec3(2.0, 1.0, 0.0);\nvec3 d = vec3(0.50, 0.20, 0.25);\nc += vec3(node_rand(vec2(seed, 1.1)), node_rand(vec2(seed, 1.2)), node_rand(vec2(seed, 1.3))) * randFactor * 4.0;\nd += vec3(node_rand(vec2(seed, 2.1)), node_rand(vec2(seed, 2.2)), node_rand(vec2(seed, 2.3))) * randFactor * 2.0;\nreturn a + b * cos(6.28318 * (c * t + d));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec2 p = (uv - 0.5) * 2.0;\np.x *= resolution.x / resolution.y;\np = abs(p);\nfloat t = time * speed;\nvec2 noiseDist = vec2(node_noise(p * 2.0 + t), node_noise(p * 2.0 - t));\np += noiseDist * randomness * 0.3;\nvec2 p0 = p;\nvec3 finalColor = vec3(0.0);\nfloat loopThresh = mix(0.01, 0.08, thresholdwhiteloopfrom01to08);\nfor (int i = 0; i < 4; i++) {\nfloat fi = float(i);\np = fract(p * 1.5) - 0.5;\nfloat d = length(p) * exp(-length(p0));\nfloat rndOffset = node_rand(vec2(fi, floor(time * 5.0))) * randomness * 0.5;\nfloat colorSeed = fi + floor(time * 2.0);\nvec3 col = palette(length(p0) + fi * 0.4 + t * 0.4 + rndOffset, colorSeed, randomness);\nd = sin(d * 10.0 + t * 2.0) / 10.0;\nd = abs(d);\nd = pow(loopThresh / d, 1.2);\nfloat pulse = mix(0.3, 1.0, sin(time * pulse_rate + fi * 1.5) * 0.5 + 0.5);\nfloat jitter = 1.0 + node_rand(p * time) * randomness * 0.5;\nfinalColor += col * d * pulse * intensity * jitter;\np *= rot(t * 0.3 + fi + node_noise(p0 * fi + t) * randomness);\n}\nvec4 effect = vec4(finalColor, 1.0);\nfloat brightness = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat animThresholdWhite = mix(0.1, 0.8, sin(time * speed) * 0.5 + 0.5);\nfloat whiteMask = smoothstep(animThresholdWhite - 0.05, animThresholdWhite + 0.05, brightness);\nfloat blendAlpha = source.a * (1.0 - whiteMask);\nreturn mix(effect, source, blendAlpha);\n}",
    "uniformValues": {
      "speed": 0.786,
      "intensity": 0.06,
      "pulse_rate": 10,
      "thresholdwhiteloopfrom01to08": 1,
      "randomness": 2
    }
  },
  {
    "id": "timeline-92f688a0-053c-4e88-a86b-5e418864078c",
    "name": "Zone Fractal  Grid Blob  Diamond Stripe Mask (fixed)",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Zone Fractal  Grid Blob  Diamond Stripe Mask (fixed)\nuniform float zoneWidth; // @min 1.0 @max 80.0 @default 15.0\nuniform float zoneEdgeWidth; // @min 0.0 @max 10.0 @default 1.5\nuniform float maxDepth; // @min 10.0 @max 200.0 @default 100.0\nuniform float blackThreshold; // @min 0.03 @max 0.6 @default 0.18\nuniform float whiteThreshold; // @min 0.4 @max 0.99 @default 0.85\nuniform float trailSpeed; // @min 0.0 @max 200.0 @default 50.0\nuniform float trailLength; // @min 0.01 @max 0.99 @default 0.65\nuniform float trailDistance; // @min 1.0 @max 80.0 @default 15.0\nuniform float scanSpeed; // @min -2.0 @max 2.0 @default 0.4\nuniform float rangeWidth; // @min 0.0 @max 1.0 @default 0.25\nuniform float hueScanSoftness; // @min 0.001 @max 0.5 @default 0.06\nuniform float borderSoftness; // @min 0.001 @max 1.0 @default 0.15\nuniform float borderBright; // @min 0.0 @max 2.0 @default 1.2\nuniform float symmetrical; // @min 0.0 @max 1.0 @default 1.0\nuniform float hueScanMode; // @min 0.0 @max 1.0 @default 0.0\nuniform float edgeThreshold; // @min 0.0 @max 2.0 @default 0.2\nuniform float edgeSoftness; // @min 0.01 @max 1.0 @default 0.3\nuniform float tintAmount; // @min 0.0 @max 1.0 @default 0.85\nuniform float edgeWidth; // @min 0.5 @max 5.0 @default 1.0\nuniform float darkThreshold; // @min 0.0 @max 1.0 @default 0.2\nuniform float wiggleAmp; // @min 0.0 @max 0.1 @default 0.01\nuniform float wiggleFreq; // @min 1.0 @max 50.0 @default 15.0\nuniform float wiggleSpeed; // @min 0.0 @max 10.0 @default 3.0\nuniform float blobRadius; // @min 0.0 @max 1.0 @default 0.2\nuniform float blobSoftness; // @min 0.01 @max 1.0 @default 0.2\nuniform float blobMoveRadius; // @min 0.0 @max 1.0 @default 0.2\nuniform float blobMoveSpeed; // @min 0.0 @max 10.0 @default 2.0\nuniform vec3 blobColor; // @default 0.0,0.0,0.0\nuniform float gridScale; // @min 10.0 @max 500.0 @default 200.0\nuniform float gridIntensity; // @min 0.0 @max 1.0 @default 0.6\nuniform float gridSpeed; // @min 0.0 @max 5.0 @default 0.5\nuniform float gridDistortion; // @min 0.0 @max 0.5 @default 0.05\nuniform float stripeFreq; // @min 1.0 @max 30.0 @default 8.0\nuniform float stripeSpeed; // @min -5.0 @max 5.0 @default 1.2\nuniform float stripeSoftness; // @min 0.0 @max 0.5 @default 0.02\nuniform float stripeRotSpeed; // @min -2.0 @max 2.0 @default 0.15\nvec3 rgb2hsv(vec3 c) {\nvec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\nvec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\nvec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));\nfloat d = q.x - min(q.w, q.y);\nfloat e = 1.0e-10;\nreturn vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\nbool isEdgePixel(vec4 sp, float blackT, float whiteT) {\nreturn sp.a < 0.3\n|| (sp.r < blackT && sp.g < blackT && sp.b < blackT)\n|| (sp.r > whiteT && sp.g > whiteT && sp.b > whiteT);\n}\nfloat marchRay(sampler2D tex, vec2 uv, vec2 dir, vec2 px,\nfloat minD, float blackT, float whiteT,\ninout vec2 nearVec) {\nfor (int j = 11; j <= 100; j++) {\nfloat fj = float(j);\nif (fj >= minD) break;\nvec2 s = uv + dir * px * fj;\nif (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) {\nif (fj < minD) { minD = fj; nearVec = dir; }\nbreak;\n}\nif (isEdgePixel(texture2D(tex, s), blackT, whiteT)) {\nif (fj < minD) { minD = fj; nearVec = dir; }\nbreak;\n}\n}\nreturn minD;\n}\nvec3 sampleZoneColor(sampler2D tex, vec2 uv,\nvec2 nearVec, vec2 px,\nfloat minD, float zoneW, float maxD,\nfloat blackT, float whiteT) {\nfloat zoneCenter = (floor(minD / zoneW) + 0.5) * zoneW;\nvec2 anchorUV = uv + nearVec * px * (minD - zoneCenter);\nvec3 accum = vec3(0.0);\nfloat weight = 0.0;\nfor (int dy = -1; dy <= 1; dy++) {\nfor (int dx = -1; dx <= 1; dx++) {\nvec2 s = anchorUV + vec2(float(dx), float(dy)) * px * 1.5;\nif (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) continue;\nvec4 sc = texture2D(tex, s);\nif (isEdgePixel(sc, blackT, whiteT)) continue;\nif (sc.r < blackT && sc.g < blackT && sc.b < blackT && sc.a > 0.3) continue;\naccum += sc.rgb;\nweight += 1.0;\n}\n}\nvec3 col = (weight > 0.0) ? accum / weight : vec3(0.3);\nfloat depthFade = 1.0 - (zoneCenter / maxD) * 0.6;\ncol *= depthFade * 0.65;\nreturn col;\n}\nvec2 hueScanTint(sampler2D tex, vec2 uv, float time) {\nvec2 maskUV = uv;\nif (symmetrical > 0.5)\nmaskUV.x = uv.x > 0.5 ? 1.0 - uv.x : uv.x;\nvec4 src = texture2D(tex, maskUV);\nvec3 hsv = rgb2hsv(src.rgb);\nfloat targetHue = fract(time * scanSpeed);\nfloat dist = abs(fract(hsv.x - targetHue + 0.5) - 0.5);\nfloat mask = smoothstep(rangeWidth * 0.5 + hueScanSoftness, rangeWidth * 0.5, dist);\nfloat border = smoothstep(borderSoftness, 0.0, abs(dist - rangeWidth * 0.5));\nreturn vec2(mask, border);\n}\nfloat diamondStripeMask(vec2 uv, float time) {\nvec2 c = uv - 0.5;\nfloat angle = 0.7854 + time * stripeRotSpeed;\nvec2 r = vec2(cos(angle) * c.x - sin(angle) * c.y,\nsin(angle) * c.x + cos(angle) * c.y);\nfloat dist = max(abs(r.x), abs(r.y));\nfloat stripe = fract(dist * stripeFreq - time * stripeSpeed);\nreturn smoothstep(0.5 - stripeSoftness, 0.5 + stripeSoftness, stripe);\n}\nvec4 computeShaderA(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 src = texture2D(tex, uv);\nbool srcIsBlack = src.r < blackThreshold && src.g < blackThreshold\n&& src.b < blackThreshold && src.a > 0.3;\nbool srcIsBg = src.r > whiteThreshold && src.g > whiteThreshold\n&& src.b > whiteThreshold;\nbool srcIsShape = src.a > 0.3 && !srcIsBlack && !srcIsBg;\nif (srcIsBlack) return vec4(0.0, 0.0, 0.0, 1.0);\nif (srcIsBg || !srcIsShape) return vec4(0.0, 0.0, 0.0, 0.0);\nvec2 ht = hueScanTint(tex, uv, time);\nfloat hMask = ht.x;\nfloat hBorder = ht.y;\nfloat aspect = resolution.x / resolution.y;\nvec2 px = vec2(0.001, 0.001 * aspect);\nfloat minD = maxDepth;\nvec2 nearVec = vec2(1.0, 0.0);\nfor (int dy = -10; dy <= 10; dy++) {\nfor (int dx = -10; dx <= 10; dx++) {\nfloat fdx = float(dx), fdy = float(dy);\nfloat d2 = fdx*fdx + fdy*fdy;\nif (d2 < 0.5 || d2 > 100.5) continue;\nvec2 s = uv + vec2(fdx, fdy) * px;\nfloat nd = sqrt(d2);\nif (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) {\nif (nd < minD) { minD = nd; nearVec = normalize(vec2(fdx, fdy)); }\ncontinue;\n}\nif (isEdgePixel(texture2D(tex, s), blackThreshold, whiteThreshold))\nif (nd < minD) { minD = nd; nearVec = normalize(vec2(fdx, fdy)); }\n}\n}\nif (minD > 10.0) {\nminD = marchRay(tex, uv, vec2( 1.0000, 0.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.9808, 0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.9239, 0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.8315, 0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.7071, 0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.5556, 0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.3827, 0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.1951, 0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.0000, 1.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.1951, 0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.3827, 0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.5556, 0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.7071, 0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.8315, 0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.9239, 0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.9808, 0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-1.0000, 0.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.9808,-0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.9239,-0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.8315,-0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.7071,-0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.5556,-0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.3827,-0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.1951,-0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.0000,-1.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.1951,-0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.3827,-0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.5556,-0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.7071,-0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.8315,-0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.9239,-0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.9808,-0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\n}\nfloat depFrac = mod(minD, zoneWidth);\nif (depFrac < zoneEdgeWidth || depFrac > zoneWidth - zoneEdgeWidth)\nreturn vec4(0.0, 0.0, 0.0, 1.0);\nfloat snapAngle = floor(atan(nearVec.y, nearVec.x) / 0.7854 + 0.5) * 0.7854;\nvec2 tangent = vec2(-sin(snapAngle), cos(snapAngle));\nvec3 col = sampleZoneColor(tex, uv, nearVec, px,\nminD, zoneWidth, maxDepth,\nblackThreshold, whiteThreshold);\nfloat zoneNum = floor(minD / zoneWidth);\nfloat isEven = mod(zoneNum, 2.0) < 0.5 ? 1.0 : 0.0;\nfloat zoneIdx = mod(zoneNum, 4.0);\nfloat speedMul;\nif (zoneIdx < 0.5) speedMul = 1.0;\nelse if (zoneIdx < 1.5) speedMul = -1.4;\nelse if (zoneIdx < 2.5) speedMul = 1.2;\nelse speedMul = -0.9;\nspeedMul *= isEven > 0.5 ? -1.0 : 1.0;\nvec2 uvPx = uv * vec2(1000.0, 1000.0 / aspect);\nfloat along = dot(uvPx, tangent);\nfloat phase = fract((along + time * trailSpeed * speedMul) / trailDistance);\nfloat headSize = 0.04;\nif (phase < headSize) {\ncol = mix(col, vec3(1.0), 0.95);\n} else if (phase < headSize + trailLength) {\nfloat t = (phase - headSize) / trailLength;\ncol = mix(col, vec3(1.0), 0.88 * (1.0 - t * t));\n}\nfloat scanFade = mix(1.0, hMask, hueScanMode);\nvec3 scanGlow = vec3(1.0) * hBorder * borderBright;\nvec3 finalRGB = clamp(col * scanFade + scanGlow, 0.0, 1.0);\nreturn vec4(finalRGB, 1.0);\n}\nvec4 computeShaderB(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 texel = edgeWidth / resolution;\nvec4 c = texture2D(tex, uv);\nvec2 symUv = vec2(abs(uv.x - 0.5), uv.y - 0.5);\nvec2 wiggleOffset = vec2(\nsin(symUv.y * wiggleFreq + time * wiggleSpeed),\ncos(symUv.x * wiggleFreq + time * wiggleSpeed)\n) * wiggleAmp;\nif (uv.x > 0.5) wiggleOffset.x = -wiggleOffset.x;\nvec2 wUv = uv + wiggleOffset;\nvec4 wc = texture2D(tex, wUv);\nvec4 n = texture2D(tex, wUv + vec2(0.0, texel.y));\nvec4 sv = texture2D(tex, wUv - vec2(0.0, texel.y));\nvec4 e = texture2D(tex, wUv + vec2(texel.x, 0.0 ));\nvec4 w = texture2D(tex, wUv - vec2(texel.x, 0.0 ));\nvec4 diff = abs(wc - n) + abs(wc - sv) + abs(wc - e) + abs(wc - w);\nfloat edge = length(diff.rgb) + diff.a;\nfloat isEdge = smoothstep(edgeThreshold, edgeThreshold + edgeSoftness, edge);\nfloat lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));\nfloat darkFactor = smoothstep(0.0, darkThreshold, lum);\nfloat strobo = step(0.5, fract(time * 15.0));\nvec3 psychColor = mix(vec3(1.0, 0.4, 0.0), vec3(0.7, 0.0, 1.0), strobo);\nfloat swirl = sin(uv.x * 15.0 + time * 5.0) * cos(uv.y * 15.0 - time * 4.0);\npsychColor = clamp(psychColor + swirl * 0.3, 0.0, 1.0);\nvec4 tinted = mix(c, vec4(psychColor, c.a), tintAmount * darkFactor);\nfloat aspect = resolution.x / resolution.y;\nvec2 aspectUv = symUv * vec2(aspect, 1.0);\nvec2 blobCenter = vec2(0.25 * aspect, 0.0)\n+ vec2(cos(time * blobMoveSpeed), sin(time * blobMoveSpeed)) * blobMoveRadius;\nfloat blobDist = distance(aspectUv, blobCenter);\nfloat blob = smoothstep(blobRadius, blobRadius + blobSoftness, blobDist);\ntinted.rgb = mix(blobColor, tinted.rgb, blob);\nvec4 finalColor = mix(tinted, wc, isEdge);\nfloat zoom = 1.0 + 0.6 * sin(time * 1.5);\nvec2 gridUv = vec2(abs(uv.x - 0.5), uv.y);\ngridUv = (gridUv - vec2(0.25, 0.5)) * zoom + vec2(0.25, 0.5);\ngridUv.y -= time * gridSpeed;\ngridUv += vec2(sin(gridUv.y * 15.0 + time), cos(gridUv.x * 15.0 + time)) * gridDistortion;\nfloat gridX = sin(gridUv.x * gridScale);\nfloat gridY = sin(gridUv.y * gridScale);\nfloat dots = (gridX * gridY) * 0.5 + 0.5;\nfloat dotSize = 0.5 + 0.45 * sin(time * 3.0);\nfloat moire = smoothstep(1.0 - dotSize, 1.0 - dotSize + 0.1, dots);\nfloat gridMask = mix(1.0 - gridIntensity, 1.0 + gridIntensity, moire);\nfinalColor.rgb *= gridMask;\nreturn finalColor;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 a = computeShaderA(tex, uv, time, resolution);\nvec4 b = computeShaderB(tex, uv, time, resolution);\nfloat dmask = diamondStripeMask(uv, time);\nvec3 rgb = mix(a.rgb, b.rgb, dmask);\nfloat alpha = mix(a.a, b.a, dmask);\nreturn vec4(rgb, alpha);\n}",
    "uniformValues": {
      "zoneWidth": 4.95,
      "zoneEdgeWidth": 0.1,
      "maxDepth": 17.6,
      "blackThreshold": 0.18,
      "whiteThreshold": 0.85,
      "trailSpeed": 74,
      "trailLength": 0.3432,
      "trailDistance": 27.86,
      "scanSpeed": -2,
      "rangeWidth": 0.25,
      "hueScanSoftness": 0.06,
      "borderSoftness": 0.15,
      "borderBright": 1.2,
      "symmetrical": 1,
      "hueScanMode": 0,
      "edgeThreshold": 0.2,
      "edgeSoftness": 0.3,
      "tintAmount": 0.85,
      "edgeWidth": 1,
      "darkThreshold": 0.2,
      "wiggleAmp": 0.01,
      "wiggleFreq": 1,
      "wiggleSpeed": 0,
      "blobRadius": 0.2,
      "blobSoftness": 0.2,
      "blobMoveRadius": 0.2,
      "blobMoveSpeed": 2,
      "blobColor": [
        0,
        0,
        0
      ],
      "gridScale": 200,
      "gridIntensity": 0.6,
      "gridSpeed": 0.5,
      "gridDistortion": 0.05,
      "stripeFreq": 2.16,
      "stripeSpeed": 0.1,
      "stripeSoftness": 0.13,
      "stripeRotSpeed": 0
    }
  },
  {
    "id": "timeline-82c28739-b198-43cb-a939-c85bf7b28baf",
    "name": "Zone Fractal  Grid Blob  Diamond Stripe Mask 1",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Zone Fractal  Grid Blob  Diamond Stripe Mask 1\nuniform float zoneWidth; // @min 1.0 @max 80.0 @default 15.0\nuniform float zoneEdgeWidth; // @min 0.0 @max 10.0 @default 1.5\nuniform float maxDepth; // @min 10.0 @max 200.0 @default 100.0\nuniform float blackThreshold; // @min 0.03 @max 0.6 @default 0.18\nuniform float whiteThreshold; // @min 0.4 @max 0.99 @default 0.85\nuniform float trailSpeed; // @min 0.0 @max 200.0 @default 50.0\nuniform float trailLength; // @min 0.01 @max 0.99 @default 0.65\nuniform float trailDistance; // @min 1.0 @max 80.0 @default 15.0\nuniform float scanSpeed; // @min -2.0 @max 2.0 @default 0.4\nuniform float rangeWidth; // @min 0.0 @max 1.0 @default 0.25\nuniform float hueScanSoftness; // @min 0.001 @max 0.5 @default 0.06\nuniform float borderSoftness; // @min 0.001 @max 1.0 @default 0.15\nuniform float borderBright; // @min 0.0 @max 2.0 @default 1.2\nuniform float symmetrical; // @min 0.0 @max 1.0 @default 1.0\nuniform float hueScanMode; // @min 0.0 @max 1.0 @default 0.0\nuniform float edgeThreshold; // @min 0.0 @max 2.0 @default 0.2\nuniform float edgeSoftness; // @min 0.01 @max 1.0 @default 0.3\nuniform float tintAmount; // @min 0.0 @max 1.0 @default 0.85\nuniform float edgeWidth; // @min 0.5 @max 5.0 @default 1.0\nuniform float darkThreshold; // @min 0.0 @max 1.0 @default 0.2\nuniform float wiggleAmp; // @min 0.0 @max 0.1 @default 0.01\nuniform float wiggleFreq; // @min 1.0 @max 50.0 @default 15.0\nuniform float wiggleSpeed; // @min 0.0 @max 10.0 @default 3.0\nuniform float blobRadius; // @min 0.0 @max 1.0 @default 0.2\nuniform float blobSoftness; // @min 0.01 @max 1.0 @default 0.2\nuniform float blobMoveRadius; // @min 0.0 @max 1.0 @default 0.2\nuniform float blobMoveSpeed; // @min 0.0 @max 10.0 @default 2.0\nuniform vec3 blobColor; // @default 0.0,0.0,0.0\nuniform float gridScale; // @min 10.0 @max 500.0 @default 200.0\nuniform float gridIntensity; // @min 0.0 @max 1.0 @default 0.6\nuniform float gridSpeed; // @min 0.0 @max 5.0 @default 0.5\nuniform float gridDistortion; // @min 0.0 @max 0.5 @default 0.05\nuniform float stripeFreq; // @min 1.0 @max 30.0 @default 8.0\nuniform float stripeSpeed; // @min -5.0 @max 5.0 @default 1.2\nuniform float stripeSoftness; // @min 0.0 @max 0.5 @default 0.02\nuniform float stripeRotSpeed; // @min -2.0 @max 2.0 @default 0.15\nvec3 rgb2hsv(vec3 c) {\nvec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\nvec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\nvec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));\nfloat d = q.x - min(q.w, q.y);\nfloat e = 1.0e-10;\nreturn vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\nbool isEdgePixel(vec4 sp, float blackT, float whiteT) {\nreturn sp.a < 0.3\n|| (sp.r < blackT && sp.g < blackT && sp.b < blackT)\n|| (sp.r > whiteT && sp.g > whiteT && sp.b > whiteT);\n}\nfloat marchRay(sampler2D tex, vec2 uv, vec2 dir, vec2 px,\nfloat minD, float blackT, float whiteT,\ninout vec2 nearVec) {\nfor (int j = 11; j <= 100; j++) {\nfloat fj = float(j);\nif (fj >= minD) break;\nvec2 s = uv + dir * px * fj;\nif (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) {\nif (fj < minD) { minD = fj; nearVec = dir; }\nbreak;\n}\nif (isEdgePixel(texture2D(tex, s), blackT, whiteT)) {\nif (fj < minD) { minD = fj; nearVec = dir; }\nbreak;\n}\n}\nreturn minD;\n}\nvec3 sampleZoneColor(sampler2D tex, vec2 uv,\nvec2 nearVec, vec2 px,\nfloat minD, float zoneW, float maxD,\nfloat blackT, float whiteT) {\nfloat zoneCenter = (floor(minD / zoneW) + 0.5) * zoneW;\nvec2 anchorUV = uv + nearVec * px * (minD - zoneCenter);\nvec3 accum = vec3(0.0);\nfloat weight = 0.0;\nfor (int dy = -1; dy <= 1; dy++) {\nfor (int dx = -1; dx <= 1; dx++) {\nvec2 s = anchorUV + vec2(float(dx), float(dy)) * px * 1.5;\nif (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) continue;\nvec4 sc = texture2D(tex, s);\nif (isEdgePixel(sc, blackT, whiteT)) continue;\nif (sc.r < blackT && sc.g < blackT && sc.b < blackT && sc.a > 0.3) continue;\naccum += sc.rgb;\nweight += 1.0;\n}\n}\nvec3 col = (weight > 0.0) ? accum / weight : vec3(0.3);\nfloat depthFade = 1.0 - (zoneCenter / maxD) * 0.6;\ncol *= depthFade * 0.65;\nreturn col;\n}\nvec2 hueScanTint(sampler2D tex, vec2 uv, float time) {\nvec2 maskUV = uv;\nif (symmetrical > 0.5)\nmaskUV.x = uv.x > 0.5 ? 1.0 - uv.x : uv.x;\nvec4 src = texture2D(tex, maskUV);\nvec3 hsv = rgb2hsv(src.rgb);\nfloat targetHue = fract(time * scanSpeed);\nfloat dist = abs(fract(hsv.x - targetHue + 0.5) - 0.5);\nfloat mask = smoothstep(rangeWidth * 0.5 + hueScanSoftness, rangeWidth * 0.5, dist);\nfloat border = smoothstep(borderSoftness, 0.0, abs(dist - rangeWidth * 0.5));\nreturn vec2(mask, border);\n}\nfloat diamondStripeMask(vec2 uv, float time) {\nvec2 c = uv - 0.5;\nfloat angle = 0.7854 + time * stripeRotSpeed;\nvec2 r = vec2(cos(angle) * c.x - sin(angle) * c.y,\nsin(angle) * c.x + cos(angle) * c.y);\nfloat dist = max(abs(r.x), abs(r.y));\nfloat stripe = fract(dist * stripeFreq - time * stripeSpeed);\nreturn smoothstep(0.5 - stripeSoftness, 0.5 + stripeSoftness, stripe);\n}\nvec4 computeShaderA(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 src = texture2D(tex, uv);\nbool srcIsBlack = src.r < blackThreshold && src.g < blackThreshold\n&& src.b < blackThreshold && src.a > 0.3;\nbool srcIsBg = src.r > whiteThreshold && src.g > whiteThreshold\n&& src.b > whiteThreshold;\nbool srcIsShape = src.a > 0.3 && !srcIsBlack && !srcIsBg;\nif (srcIsBlack) return vec4(0.0, 0.0, 0.0, 1.0);\nif (srcIsBg || !srcIsShape) return vec4(0.0, 0.0, 0.0, 0.0);\nvec2 ht = hueScanTint(tex, uv, time);\nfloat hMask = ht.x;\nfloat hBorder = ht.y;\nfloat aspect = resolution.x / resolution.y;\nvec2 px = vec2(0.001, 0.001 * aspect);\nfloat minD = maxDepth;\nvec2 nearVec = vec2(1.0, 0.0);\nfor (int dy = -10; dy <= 10; dy++) {\nfor (int dx = -10; dx <= 10; dx++) {\nfloat fdx = float(dx), fdy = float(dy);\nfloat d2 = fdx*fdx + fdy*fdy;\nif (d2 < 0.5 || d2 > 100.5) continue;\nvec2 s = uv + vec2(fdx, fdy) * px;\nfloat nd = sqrt(d2);\nif (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) {\nif (nd < minD) { minD = nd; nearVec = normalize(vec2(fdx, fdy)); }\ncontinue;\n}\nif (isEdgePixel(texture2D(tex, s), blackThreshold, whiteThreshold))\nif (nd < minD) { minD = nd; nearVec = normalize(vec2(fdx, fdy)); }\n}\n}\nif (minD > 10.0) {\nminD = marchRay(tex, uv, vec2( 1.0000, 0.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.9808, 0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.9239, 0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.8315, 0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.7071, 0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.5556, 0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.3827, 0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.1951, 0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.0000, 1.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.1951, 0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.3827, 0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.5556, 0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.7071, 0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.8315, 0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.9239, 0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.9808, 0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-1.0000, 0.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.9808,-0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.9239,-0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.8315,-0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.7071,-0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.5556,-0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.3827,-0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.1951,-0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.0000,-1.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.1951,-0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.3827,-0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.5556,-0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.7071,-0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.8315,-0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.9239,-0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.9808,-0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\n}\nfloat depFrac = mod(minD, zoneWidth);\nif (depFrac < zoneEdgeWidth || depFrac > zoneWidth - zoneEdgeWidth)\nreturn vec4(0.0, 0.0, 0.0, 1.0);\nfloat snapAngle = floor(atan(nearVec.y, nearVec.x) / 0.7854 + 0.5) * 0.7854;\nvec2 tangent = vec2(-sin(snapAngle), cos(snapAngle));\nvec3 col = sampleZoneColor(tex, uv, nearVec, px,\nminD, zoneWidth, maxDepth,\nblackThreshold, whiteThreshold);\nfloat zoneNum = floor(minD / zoneWidth);\nfloat isEven = mod(zoneNum, 2.0) < 0.5 ? 1.0 : 0.0;\nfloat zoneIdx = mod(zoneNum, 4.0);\nfloat speedMul;\nif (zoneIdx < 0.5) speedMul = 1.0;\nelse if (zoneIdx < 1.5) speedMul = -1.4;\nelse if (zoneIdx < 2.5) speedMul = 1.2;\nelse speedMul = -0.9;\nspeedMul *= isEven > 0.5 ? -1.0 : 1.0;\nvec2 uvPx = uv * vec2(1000.0, 1000.0 / aspect);\nfloat along = dot(uvPx, tangent);\nfloat phase = fract((along + time * trailSpeed * speedMul) / trailDistance);\nfloat headSize = 0.04;\nif (phase < headSize) {\ncol = mix(col, vec3(1.0), 0.95);\n} else if (phase < headSize + trailLength) {\nfloat t = (phase - headSize) / trailLength;\ncol = mix(col, vec3(1.0), 0.88 * (1.0 - t * t));\n}\nfloat scanFade = mix(1.0, hMask, hueScanMode);\nvec3 scanGlow = vec3(1.0) * hBorder * borderBright;\nvec3 finalRGB = clamp(col * scanFade + scanGlow, 0.0, 1.0);\nreturn vec4(finalRGB, 1.0);\n}\nvec4 computeShaderB(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 texel = edgeWidth / resolution;\nvec4 c = texture2D(tex, uv);\nvec2 symUv = vec2(abs(uv.x - 0.5), uv.y - 0.5);\nvec2 wiggleOffset = vec2(\nsin(symUv.y * wiggleFreq + time * wiggleSpeed),\ncos(symUv.x * wiggleFreq + time * wiggleSpeed)\n) * wiggleAmp;\nif (uv.x > 0.5) wiggleOffset.x = -wiggleOffset.x;\nvec2 wUv = uv + wiggleOffset;\nvec4 wc = texture2D(tex, wUv);\nvec4 n = texture2D(tex, wUv + vec2(0.0, texel.y));\nvec4 sv = texture2D(tex, wUv - vec2(0.0, texel.y));\nvec4 e = texture2D(tex, wUv + vec2(texel.x, 0.0 ));\nvec4 w = texture2D(tex, wUv - vec2(texel.x, 0.0 ));\nvec4 diff = abs(wc - n) + abs(wc - sv) + abs(wc - e) + abs(wc - w);\nfloat edge = length(diff.rgb) + diff.a;\nfloat isEdge = smoothstep(edgeThreshold, edgeThreshold + edgeSoftness, edge);\nfloat lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));\nfloat darkFactor = smoothstep(0.0, darkThreshold, lum);\nfloat strobo = step(0.5, fract(time * 15.0));\nvec3 psychColor = mix(vec3(1.0, 0.4, 0.0), vec3(0.7, 0.0, 1.0), strobo);\nfloat swirl = sin(uv.x * 15.0 + time * 5.0) * cos(uv.y * 15.0 - time * 4.0);\npsychColor = clamp(psychColor + swirl * 0.3, 0.0, 1.0);\nvec4 tinted = mix(c, vec4(psychColor, c.a), tintAmount * darkFactor);\nfloat aspect = resolution.x / resolution.y;\nvec2 aspectUv = symUv * vec2(aspect, 1.0);\nvec2 blobCenter = vec2(0.25 * aspect, 0.0)\n+ vec2(cos(time * blobMoveSpeed), sin(time * blobMoveSpeed)) * blobMoveRadius;\nfloat blobDist = distance(aspectUv, blobCenter);\nfloat blob = smoothstep(blobRadius, blobRadius + blobSoftness, blobDist);\ntinted.rgb = mix(blobColor, tinted.rgb, blob);\nvec4 finalColor = mix(tinted, wc, isEdge);\nfloat zoom = 1.0 + 0.6 * sin(time * 1.5);\nvec2 gridUv = vec2(abs(uv.x - 0.5), uv.y);\ngridUv = (gridUv - vec2(0.25, 0.5)) * zoom + vec2(0.25, 0.5);\ngridUv.y -= time * gridSpeed;\ngridUv += vec2(sin(gridUv.y * 15.0 + time), cos(gridUv.x * 15.0 + time)) * gridDistortion;\nfloat gridX = sin(gridUv.x * gridScale);\nfloat gridY = sin(gridUv.y * gridScale);\nfloat dots = (gridX * gridY) * 0.5 + 0.5;\nfloat dotSize = 0.5 + 0.45 * sin(time * 3.0);\nfloat moire = smoothstep(1.0 - dotSize, 1.0 - dotSize + 0.1, dots);\nfloat gridMask = mix(1.0 - gridIntensity, 1.0 + gridIntensity, moire);\nfinalColor.rgb *= gridMask;\nreturn finalColor;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 a = computeShaderA(tex, uv, time, resolution);\nvec4 b = computeShaderB(tex, uv, time, resolution);\nfloat dmask = diamondStripeMask(uv, time);\nvec3 rgb = mix(a.rgb, b.rgb, dmask);\nfloat alpha = mix(a.a, b.a, dmask);\nreturn vec4(rgb, alpha);\n}",
    "uniformValues": {
      "zoneWidth": 4.16,
      "zoneEdgeWidth": 1.3,
      "maxDepth": 100,
      "blackThreshold": 0.03,
      "whiteThreshold": 0.85,
      "trailSpeed": 50,
      "trailLength": 0.65,
      "trailDistance": 15,
      "scanSpeed": 0.4,
      "rangeWidth": 0.25,
      "hueScanSoftness": 0.06,
      "borderSoftness": 0.15,
      "borderBright": 1.2,
      "symmetrical": 1,
      "hueScanMode": 0,
      "edgeThreshold": 0.2,
      "edgeSoftness": 0.3,
      "tintAmount": 0.85,
      "edgeWidth": 1,
      "darkThreshold": 0.2,
      "wiggleAmp": 0.01,
      "wiggleFreq": 15,
      "wiggleSpeed": 3,
      "blobRadius": 0.2,
      "blobSoftness": 0.2,
      "blobMoveRadius": 0.2,
      "blobMoveSpeed": 2,
      "blobColor": [
        0,
        0,
        0
      ],
      "gridScale": 200,
      "gridIntensity": 0.6,
      "gridSpeed": 0.5,
      "gridDistortion": 0.05,
      "stripeFreq": 4.77,
      "stripeSpeed": -0.3,
      "stripeSoftness": 0.185,
      "stripeRotSpeed": 0
    }
  },
  {
    "id": "timeline-ddee6be5-aeb1-430c-95f2-e2d026163562",
    "name": "Zone Fractal + Hue Scanner",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Zone Fractal + Hue Scanner\nuniform float zoneWidth; // @min 1.0 @max 80.0 @default 15.0\nuniform float edgeWidth; // @min 0.0 @max 10.0 @default 1.5\nuniform float maxDepth; // @min 10.0 @max 200.0 @default 100.0\nuniform float blackThreshold; // @min 0.03 @max 0.6 @default 0.18\nuniform float whiteThreshold; // @min 0.4 @max 0.99 @default 0.85\nuniform float trailSpeed; // @min 0.0 @max 200.0 @default 50.0\nuniform float trailLength; // @min 0.01 @max 0.99 @default 0.65\nuniform float trailDistance; // @min 1.0 @max 80.0 @default 15.0\nuniform float scanSpeed; // @min -2.0 @max 2.0 @default 0.4\nuniform float rangeWidth; // @min 0.0 @max 1.0 @default 0.25\nuniform float edgeSoftness; // @min 0.001 @max 0.5 @default 0.06\nuniform float borderSoftness; // @min 0.001 @max 1.0 @default 0.15\nuniform float borderBright; // @min 0.0 @max 2.0 @default 1.2\nuniform float symmetrical; // @min 0.0 @max 1.0 @default 1.0\nvec3 rgb2hsv(vec3 c) {\nvec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\nvec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\nvec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));\nfloat d = q.x - min(q.w, q.y);\nfloat e = 1.0e-10;\nreturn vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\nbool isEdgePixel(vec4 sp, float blackT, float whiteT) {\nreturn sp.a < 0.3\n|| (sp.r < blackT && sp.g < blackT && sp.b < blackT)\n|| (sp.r > whiteT && sp.g > whiteT && sp.b > whiteT);\n}\nfloat marchRay(sampler2D tex, vec2 uv, vec2 dir, vec2 px,\nfloat minD, float blackT, float whiteT,\ninout vec2 nearVec) {\nfor (int j = 11; j <= 100; j++) {\nfloat fj = float(j);\nif (fj >= minD) break;\nvec2 s = uv + dir * px * fj;\nif (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) {\nif (fj < minD) { minD = fj; nearVec = dir; }\nbreak;\n}\nif (isEdgePixel(texture2D(tex, s), blackT, whiteT)) {\nif (fj < minD) { minD = fj; nearVec = dir; }\nbreak;\n}\n}\nreturn minD;\n}\nvec3 sampleZoneColor(sampler2D tex, vec2 uv,\nvec2 nearVec, vec2 px,\nfloat minD, float zoneW, float maxD,\nfloat blackT, float whiteT) {\nfloat zoneCenter = (floor(minD / zoneW) + 0.5) * zoneW;\nvec2 anchorUV = uv + nearVec * px * (minD - zoneCenter);\nvec3 accum = vec3(0.0);\nfloat weight = 0.0;\nfor (int dy = -1; dy <= 1; dy++) {\nfor (int dx = -1; dx <= 1; dx++) {\nvec2 s = anchorUV + vec2(float(dx), float(dy)) * px * 1.5;\nif (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) continue;\nvec4 sc = texture2D(tex, s);\nif (isEdgePixel(sc, blackT, whiteT)) continue;\nif (sc.r < blackT && sc.g < blackT && sc.b < blackT && sc.a > 0.3) continue;\naccum += sc.rgb;\nweight += 1.0;\n}\n}\nvec3 col = (weight > 0.0) ? accum / weight : vec3(0.3);\nfloat depthFade = 1.0 - (zoneCenter / maxD) * 0.6;\ncol *= depthFade * 0.65;\nreturn col;\n}\nvec2 hueScanMask(sampler2D tex, vec2 uv, float time) {\nvec2 maskUV = uv;\nif (symmetrical > 0.5)\nmaskUV.x = uv.x > 0.5 ? 1.0 - uv.x : uv.x;\nvec4 src = texture2D(tex, maskUV);\nvec3 hsv = rgb2hsv(src.rgb);\nfloat targetHue = fract(time * scanSpeed);\nfloat dist = abs(fract(hsv.x - targetHue + 0.5) - 0.5);\nfloat mask = smoothstep(rangeWidth * 0.5 + edgeSoftness, rangeWidth * 0.5, dist);\nfloat border = smoothstep(borderSoftness, 0.0, abs(dist - rangeWidth * 0.5));\nreturn vec2(mask, border);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 src = texture2D(tex, uv);\nbool srcIsBlack = src.r < blackThreshold && src.g < blackThreshold && src.b < blackThreshold && src.a > 0.3;\nbool srcIsBg = src.r > whiteThreshold && src.g > whiteThreshold && src.b > whiteThreshold;\nbool srcIsShape = src.a > 0.3 && !srcIsBlack && !srcIsBg;\nif (srcIsBlack) return vec4(0.0, 0.0, 0.0, 1.0);\nif (srcIsBg || !srcIsShape) return vec4(0.0, 0.0, 0.0, 0.0);\nvec2 mb = hueScanMask(tex, uv, time);\nfloat mask = mb.x;\nfloat border = mb.y;\nif (mask <= 0.0 && border <= 0.0) return vec4(0.0, 0.0, 0.0, 0.0);\nfloat aspect = resolution.x / resolution.y;\nvec2 px = vec2(0.001, 0.001 * aspect);\nfloat minD = maxDepth;\nvec2 nearVec = vec2(1.0, 0.0);\nfor (int dy = -10; dy <= 10; dy++) {\nfor (int dx = -10; dx <= 10; dx++) {\nfloat fdx = float(dx), fdy = float(dy);\nfloat d2 = fdx*fdx + fdy*fdy;\nif (d2 < 0.5 || d2 > 100.5) continue;\nvec2 s = uv + vec2(fdx, fdy) * px;\nfloat nd = sqrt(d2);\nif (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) {\nif (nd < minD) { minD = nd; nearVec = normalize(vec2(fdx, fdy)); }\ncontinue;\n}\nif (isEdgePixel(texture2D(tex, s), blackThreshold, whiteThreshold))\nif (nd < minD) { minD = nd; nearVec = normalize(vec2(fdx, fdy)); }\n}\n}\nif (minD > 10.0) {\nminD = marchRay(tex, uv, vec2( 1.0000, 0.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.9808, 0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.9239, 0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.8315, 0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.7071, 0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.5556, 0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.3827, 0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.1951, 0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.0000, 1.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.1951, 0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.3827, 0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.5556, 0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.7071, 0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.8315, 0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.9239, 0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.9808, 0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-1.0000, 0.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.9808,-0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.9239,-0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.8315,-0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.7071,-0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.5556,-0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.3827,-0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.1951,-0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.0000,-1.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.1951,-0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.3827,-0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.5556,-0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.7071,-0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.8315,-0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.9239,-0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.9808,-0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\n}\nfloat depFrac = mod(minD, zoneWidth);\nif (depFrac < edgeWidth || depFrac > zoneWidth - edgeWidth)\nreturn vec4(0.0, 0.0, 0.0, mask);\nfloat snapAngle = floor(atan(nearVec.y, nearVec.x) / 0.7854 + 0.5) * 0.7854;\nvec2 tangent = vec2(-sin(snapAngle), cos(snapAngle));\nvec3 col = sampleZoneColor(tex, uv, nearVec, px,\nminD, zoneWidth, maxDepth,\nblackThreshold, whiteThreshold);\nfloat zoneNum = floor(minD / zoneWidth);\nfloat isEven = mod(zoneNum, 2.0) < 0.5 ? 1.0 : 0.0;\nfloat zoneIdx = mod(zoneNum, 4.0);\nfloat speedMul;\nif (zoneIdx < 0.5) speedMul = 1.0;\nelse if (zoneIdx < 1.5) speedMul = -1.4;\nelse if (zoneIdx < 2.5) speedMul = 1.2;\nelse speedMul = -0.9;\nspeedMul *= isEven > 0.5 ? -1.0 : 1.0;\nvec2 uvPx = uv * vec2(1000.0, 1000.0 / aspect);\nfloat along = dot(uvPx, tangent);\nfloat phase = fract((along + time * trailSpeed * speedMul) / trailDistance);\nfloat headSize = 0.04;\nif (phase < headSize) {\ncol = mix(col, vec3(1.0), 0.95);\n} else if (phase < headSize + trailLength) {\nfloat t = (phase - headSize) / trailLength;\ncol = mix(col, vec3(1.0), 0.88 * (1.0 - t * t));\n}\nvec3 finalColor = col * mask + vec3(1.0) * border * borderBright;\nreturn vec4(clamp(finalColor, 0.0, 1.0), clamp(mask + border, 0.0, 1.0));\n}",
    "uniformValues": {
      "zoneWidth": 4.95,
      "edgeWidth": 1.6,
      "maxDepth": 86,
      "blackThreshold": 0.2751,
      "whiteThreshold": 0.99,
      "trailSpeed": 198,
      "trailLength": 0.6862,
      "trailDistance": 38.92,
      "scanSpeed": -0.96,
      "rangeWidth": 0.34,
      "edgeSoftness": 0.3503,
      "borderSoftness": 0.001,
      "borderBright": 2,
      "symmetrical": 0.06
    }
  },
  {
    "id": "timeline-a0270bcb-4361-49e5-8bcb-810872282a36",
    "name": "Zooming G2rid Blob Wiggle",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Zooming G2rid Blob Wiggle\nuniform float edgeThreshold; // @min 0.0 @max 2.0 @default 0.2\nuniform float edgeSoftness; // @min 0.01 @max 1.0 @default 0.3\nuniform float tintAmount; // @min 0.0 @max 1.0 @default 0.85\nuniform float edgeWidth; // @min 0.5 @max 5.0 @default 1.0\nuniform float darkThreshold; // @min 0.0 @max 1.0 @default 0.2\nuniform float wiggleAmp; // @min 0.0 @max 0.1 @default 0.01\nuniform float wiggleFreq; // @min 1.0 @max 50.0 @default 15.0\nuniform float wiggleSpeed; // @min 0.0 @max 10.0 @default 3.0\nuniform float blobRadius; // @min 0.0 @max 1.0 @default 0.2\nuniform float blobSoftness; // @min 0.01 @max 1.0 @default 0.2\nuniform float blobMoveRadius; // @min 0.0 @max 1.0 @default 0.2\nuniform float blobMoveSpeed; // @min 0.0 @max 10.0 @default 2.0\nuniform vec3 blobColor; // @default 0.0,0.0,0.0\nuniform float gridScale; // @min 10.0 @max 500.0 @default 200.0\nuniform float gridIntensity; // @min 0.0 @max 1.0 @default 0.6\nuniform float gridSpeed; // @min 0.0 @max 5.0 @default 0.5\nuniform float gridDistortion; // @min 0.0 @max 0.5 @default 0.05\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 texel = edgeWidth / resolution;\nvec4 c = texture2D(tex, uv);\nvec2 symUv = vec2(abs(uv.x - 0.5), uv.y - 0.5);\nvec2 wiggleOffset = vec2(\nsin(symUv.y * wiggleFreq + time * wiggleSpeed),\ncos(symUv.x * wiggleFreq + time * wiggleSpeed)\n) * wiggleAmp;\nif (uv.x > 0.5) wiggleOffset.x = -wiggleOffset.x;\nvec2 wUv = uv + wiggleOffset;\nvec4 wc = texture2D(tex, wUv);\nvec4 n = texture2D(tex, wUv + vec2(0.0, texel.y));\nvec4 s = texture2D(tex, wUv - vec2(0.0, texel.y));\nvec4 e = texture2D(tex, wUv + vec2(texel.x, 0.0));\nvec4 w = texture2D(tex, wUv - vec2(texel.x, 0.0));\nvec4 diff = abs(wc - n) + abs(wc - s) + abs(wc - e) + abs(wc - w);\nfloat edge = length(diff.rgb) + diff.a;\nfloat isEdge = smoothstep(edgeThreshold, edgeThreshold + edgeSoftness, edge);\nfloat lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));\nfloat darkFactor = smoothstep(0.0, darkThreshold, lum);\nfloat strobo = step(0.5, fract(time * 15.0));\nvec3 psychColor = mix(vec3(1.0, 0.4, 0.0), vec3(0.7, 0.0, 1.0), strobo);\nfloat swirl = sin(uv.x * 15.0 + time * 5.0) * cos(uv.y * 15.0 - time * 4.0);\npsychColor = clamp(psychColor + swirl * 0.3, 0.0, 1.0);\nvec4 tinted = mix(c, vec4(psychColor, c.a), tintAmount * darkFactor);\nvec2 aspectUv = symUv * vec2(resolution.x / resolution.y, 1.0);\nvec2 blobCenter = vec2(0.25 * (resolution.x / resolution.y), 0.0) + vec2(cos(time * blobMoveSpeed), sin(time * blobMoveSpeed)) * blobMoveRadius;\nfloat dist = distance(aspectUv, blobCenter);\nfloat blob = smoothstep(blobRadius, blobRadius + blobSoftness, dist);\ntinted.rgb = mix(blobColor, tinted.rgb, blob);\nvec4 finalColor = mix(tinted, wc, isEdge);\nfloat zoom = 1.0 + 0.6 * sin(time * 1.5);\nvec2 gridUv = vec2(abs(uv.x - 0.5), uv.y);\ngridUv = (gridUv - vec2(0.25, 0.5)) * zoom + vec2(0.25, 0.5);\ngridUv.y -= time * gridSpeed;\ngridUv += vec2(sin(gridUv.y * 15.0 + time), cos(gridUv.x * 15.0 + time)) * gridDistortion;\nfloat gridX = sin(gridUv.x * gridScale);\nfloat gridY = sin(gridUv.y * gridScale);\nfloat dots = (gridX * gridY) * 0.5 + 0.5;\nfloat dotSize = 0.5 + 0.45 * sin(time * 3.0);\nfloat moire = smoothstep(1.0 - dotSize, 1.0 - dotSize + 0.1, dots);\nfloat mask = mix(1.0 - gridIntensity, 1.0 + gridIntensity, moire);\nfinalColor.rgb *= mask;\nreturn finalColor;\n}",
    "uniformValues": {
      "edgeThreshold": 0.2,
      "edgeSoftness": 0.3,
      "tintAmount": 0.85,
      "edgeWidth": 1,
      "darkThreshold": 0.2,
      "wiggleAmp": 0.01,
      "wiggleFreq": 15,
      "wiggleSpeed": 3,
      "blobRadius": 0.2,
      "blobSoftness": 0.2,
      "blobMoveRadius": 0.2,
      "blobMoveSpeed": 2,
      "blobColor": [
        0,
        0,
        0
      ],
      "gridScale": 200,
      "gridIntensity": 0.6,
      "gridSpeed": 0.5,
      "gridDistortion": 0.05
    }
  },
  {
    "id": "timeline-aa50480f-e0a3-4b89-822f-22d6b9e8ab0f",
    "name": "Zooming Grid Blob Wiggle",
    "template": "stage",
    "group": "Recovered Online",
    "description": "Recovered from online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Zooming Grid Blob Wiggle\nuniform float edgeThreshold; // @min 0.0 @max 2.0 @default 0.2\nuniform float edgeSoftness; // @min 0.01 @max 1.0 @default 0.3\nuniform float tintAmount; // @min 0.0 @max 1.0 @default 0.85\nuniform float edgeWidth; // @min 0.5 @max 5.0 @default 1.0\nuniform float darkThreshold; // @min 0.0 @max 1.0 @default 0.2\nuniform float wiggleAmp; // @min 0.0 @max 0.1 @default 0.01\nuniform float wiggleFreq; // @min 1.0 @max 50.0 @default 15.0\nuniform float wiggleSpeed; // @min 0.0 @max 10.0 @default 3.0\nuniform float blobRadius; // @min 0.0 @max 1.0 @default 0.2\nuniform float blobSoftness; // @min 0.01 @max 1.0 @default 0.2\nuniform float blobMoveRadius; // @min 0.0 @max 1.0 @default 0.2\nuniform float blobMoveSpeed; // @min 0.0 @max 10.0 @default 2.0\nuniform vec3 blobColor; // @default 0.0,0.0,0.0\nuniform float gridScale; // @min 10.0 @max 500.0 @default 200.0\nuniform float gridIntensity; // @min 0.0 @max 1.0 @default 0.6\nuniform float gridSpeed; // @min 0.0 @max 5.0 @default 0.5\nuniform float gridDistortion; // @min 0.0 @max 0.5 @default 0.05\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 texel = edgeWidth / resolution;\nvec4 c = texture2D(tex, uv);\nvec2 symUv = vec2(abs(uv.x - 0.5), uv.y - 0.5);\nvec2 wiggleOffset = vec2(\nsin(symUv.y * wiggleFreq + time * wiggleSpeed),\ncos(symUv.x * wiggleFreq + time * wiggleSpeed)\n) * wiggleAmp;\nif (uv.x > 0.5) wiggleOffset.x = -wiggleOffset.x;\nvec2 wUv = uv + wiggleOffset;\nvec4 wc = texture2D(tex, wUv);\nvec4 n = texture2D(tex, wUv + vec2(0.0, texel.y));\nvec4 s = texture2D(tex, wUv - vec2(0.0, texel.y));\nvec4 e = texture2D(tex, wUv + vec2(texel.x, 0.0));\nvec4 w = texture2D(tex, wUv - vec2(texel.x, 0.0));\nvec4 diff = abs(wc - n) + abs(wc - s) + abs(wc - e) + abs(wc - w);\nfloat edge = length(diff.rgb) + diff.a;\nfloat isEdge = smoothstep(edgeThreshold, edgeThreshold + edgeSoftness, edge);\nfloat lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));\nfloat darkFactor = smoothstep(0.0, darkThreshold, lum);\nfloat strobo = step(0.5, fract(time * 15.0));\nvec3 psychColor = mix(vec3(1.0, 0.4, 0.0), vec3(0.7, 0.0, 1.0), strobo);\nfloat swirl = sin(uv.x * 15.0 + time * 5.0) * cos(uv.y * 15.0 - time * 4.0);\npsychColor = clamp(psychColor + swirl * 0.3, 0.0, 1.0);\nvec4 tinted = mix(c, vec4(psychColor, c.a), tintAmount * darkFactor);\nvec2 aspectUv = symUv * vec2(resolution.x / resolution.y, 1.0);\nvec2 blobCenter = vec2(0.25 * (resolution.x / resolution.y), 0.0) + vec2(cos(time * blobMoveSpeed), sin(time * blobMoveSpeed)) * blobMoveRadius;\nfloat dist = distance(aspectUv, blobCenter);\nfloat blob = smoothstep(blobRadius, blobRadius + blobSoftness, dist);\ntinted.rgb = mix(blobColor, tinted.rgb, blob);\nvec4 finalColor = mix(tinted, wc, isEdge);\nfloat zoom = 1.0 + 0.6 * sin(time * 1.5);\nvec2 gridUv = vec2(abs(uv.x - 0.5), uv.y);\ngridUv = (gridUv - vec2(0.25, 0.5)) * zoom + vec2(0.25, 0.5);\ngridUv.y -= time * gridSpeed;\ngridUv += vec2(sin(gridUv.y * 15.0 + time), cos(gridUv.x * 15.0 + time)) * gridDistortion;\nfloat gridX = sin(gridUv.x * gridScale);\nfloat gridY = sin(gridUv.y * gridScale);\nfloat dots = (gridX * gridY) * 0.5 + 0.5;\nfloat dotSize = 0.5 + 0.45 * sin(time * 3.0);\nfloat moire = smoothstep(1.0 - dotSize, 1.0 - dotSize + 0.1, dots);\nfloat mask = mix(1.0 - gridIntensity, 1.0 + gridIntensity, moire);\nfinalColor.rgb *= mask;\nreturn finalColor;\n}",
    "uniformValues": {
      "edgeThreshold": 0.2,
      "edgeSoftness": 0.3,
      "tintAmount": 0.85,
      "edgeWidth": 0.5,
      "darkThreshold": 0.71,
      "wiggleAmp": 0.004,
      "wiggleFreq": 49.02,
      "wiggleSpeed": 3,
      "blobRadius": 0.63,
      "blobSoftness": 0.8515,
      "blobMoveRadius": 0.86,
      "blobMoveSpeed": 6.8,
      "blobColor": [
        0,
        0,
        0
      ],
      "gridScale": 200,
      "gridIntensity": 0.6,
      "gridSpeed": 0.5,
      "gridDistortion": 0.05
    }
  },
  {
    "id": "timeline-e3d3e72c-3383-4b36-a65d-bf5e48535071",
    "name": "5ustomizable Multiverse Aliens",
    "template": "stage",
    "group": "Saved",
    "description": "Saved from the timeline editor.",
    "code": "// NAME: 5ustomizable Multiverse Aliens\nuniform float lightHeight; // @min 0.01 @max 1.0 @default 0.15\nuniform float lightIntensity; // @min 0.0 @max 5.0 @default 2.5\nuniform float ambient; // @min 0.0 @max 1.0 @default 0.15\nuniform float shininess; // @min 1.0 @max 100.0 @default 40.0\nuniform float detail; // @min 0.1 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float colorSpeed; // @min 0.0 @max 5.0 @default 1.0\nuniform float alienCount; // @min 1.0 @max 7.0 @default 3.0\nuniform float alienSpread; // @min 0.5 @max 4.0 @default 1.5\nuniform float alienSize; // @min 0.1 @max 2.0 @default 0.8\n\n// Head Shape Parameters\nuniform float headWidth; // @min 0.5 @max 2.0 @default 1.0\nuniform float headHeight; // @min 0.5 @max 2.0 @default 1.2\nuniform float headDepth; // @min 0.5 @max 2.0 @default 1.0\n\n// Feature Parameters\nuniform float neckCone; // @min 0.0 @max 1.0 @default 0.3\nuniform float neckLength; // @min 0.1 @max 2.0 @default 0.6\nuniform float noseSize; // @min 0.0 @max 1.0 @default 0.5\nuniform float eyeSize; // @min 0.5 @max 2.0 @default 1.0\nuniform float eyeInclination; // @min -1.0 @max 1.0 @default 0.0\nuniform float antenna; // @min 0.0 @max 1.0 @default 0.3\nuniform float dance; // @min 0.0 @max 1.0 @default 0.5\n\n// --- 3D UTILITIES ---\nfloat smin(float a, float b, float k) {\n    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);\n    return mix(b, a, h) - k * h * (1.0 - h);\n}\n\nfloat sdEllipsoid(vec3 p, vec3 r) {\n    float k0 = length(p/r);\n    float k1 = length(p/(r*r));\n    return k0*(k0-1.0)/k1;\n}\n\n// --- ALIEN SDF ---\nvec2 singleAlien(vec3 p, float time, float idOffset) {\n    p /= alienSize;\n    p.y = -p.y; // Upside down\n    \n    float t = time * 3.0 + idOffset;\n    float sway = sin(t) * 0.25 * dance;\n    float tilt = cos(t * 0.8) * 0.2 * dance;\n    \n    // 1. Cone Neck\n    float neckShape = mix(0.1, 0.1 + neckCone, clamp((-p.y - 0.2), 0.0, 1.0));\n    float neck = length(p.xz) - neckShape;\n    neck = max(neck, p.y - 0.3);\n    neck = max(neck, -p.y - (1.0 * neckLength));\n    \n    // Head transformation\n    vec3 hp = p;\n    hp.y -= 0.2;\n    float s = sin(sway); float c = cos(sway);\n    hp.xy *= mat2(c, -s, s, c);\n    hp.x += tilt;\n    \n    // 2. Head Shape (Cranium + Jaw)\n    vec3 headScale = vec3(0.4 * headWidth, 0.5 * headHeight, 0.4 * headDepth);\n    float cranium = sdEllipsoid(hp - vec3(0.0, 0.2, 0.0), headScale);\n    float jaw = sdEllipsoid(hp - vec3(0.0, -0.1, 0.05), headScale * 0.7);\n    float skull = smin(cranium, jaw, 0.2);\n    \n    // 3. Antenna\n    vec3 ap = hp - vec3(0.0, 0.5 * headHeight + 0.1, 0.0);\n    float ant = max(length(ap.xz) - 0.015, ap.y);\n    ant = max(ant, -ap.y - antenna);\n    float tip = length(ap - vec3(0.0, antenna, 0.0)) - 0.04;\n    \n    skull = smin(skull, min(ant, tip), 0.1);\n    skull = smin(skull, neck, 0.1);\n    \n    // 4. Eyes (Configurable Size and Inclination)\n    vec3 ep = hp;\n    ep.x = abs(ep.x) - 0.18 * headWidth;\n    ep.y -= 0.15; ep.z -= 0.3 * headDepth;\n    \n    // Calculate custom rotation matrix based on eyeInclination parameter\n    float eyeAngle = -0.4 + (eyeInclination * 0.8);\n    float cs = cos(eyeAngle), sn = sin(eyeAngle);\n    mat2 erot = mat2(cs, -sn, sn, cs);\n    \n    ep.xy *= erot;\n    float eyes = sdEllipsoid(ep, vec3(0.2, 0.1, 0.1) * eyeSize);\n    \n    // 5. Nostrils (Two tiny vertical slits styled as ' ')\n    vec3 np = hp;\n    np.x = abs(np.x) - 0.02 - (noseSize * 0.02); // Distance between nostrils\n    np.y -= -0.02; // Positioning down towards the jaw\n    np.z -= 0.32 * headDepth; // Pushed outward\n    \n    // Slight outward tilt for the nostrils\n    float nAngle = 0.15;\n    float ncs = cos(nAngle), nsn = sin(nAngle);\n    mat2 nrot = mat2(ncs, -nsn, nsn, ncs);\n    np.xy *= nrot;\n    \n    float nostrils = sdEllipsoid(np, vec3(0.008, 0.03, 0.015) * (noseSize * 1.5 + 0.5));\n    \n    // Combine features to apply the black \"void\" texture map\n    float blackFeatures = min(eyes, nostrils);\n    \n    if (blackFeatures < skull) return vec2(blackFeatures * alienSize, 1.0);\n    return vec2(skull * alienSize, 0.0);\n}\n\nvec2 map(vec3 p, float time) {\n    vec2 res = vec2(1e10, 0.0);\n    float count = floor(alienCount);\n    \n    for(float i = 0.0; i < 7.0; i++) {\n        if (i >= count) break;\n        float xOffset = (i - (count - 1.0) * 0.5) * alienSpread;\n        vec2 d = singleAlien(p - vec3(xOffset, 0.0, 0.0), time, i * 1.5);\n        if (d.x < res.x) res = d;\n    }\n    return res;\n}\n\nvec3 getNormal(vec3 p, float t) {\n    vec2 e = vec2(0.002, 0.0);\n    return normalize(vec3(\n        map(p + e.xyy, t).x - map(p - e.xyy, t).x,\n        map(p + e.yxy, t).x - map(p - e.yxy, t).x,\n        map(p + e.yyx, t).x - map(p - e.yyx, t).x\n    ));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 base = texture2D(tex, uv);\n    float isNotBlack = smoothstep(blackThreshold, blackThreshold + 0.05, max(max(base.r, base.g), base.b));\n    \n    if (isNotBlack < 0.01) return vec4(0.0, 0.0, 0.0, base.a);\n\n    vec2 p = (uv - 0.5) * 2.0;\n    p.x *= resolution.x / resolution.y;\n    vec3 ro = vec3(0.0, 0.0, 3.5); \n    vec3 rd = normalize(vec3(p, -2.5));\n    \n    float tDist = 0.0;\n    vec2 res;\n    for(int i = 0; i < 50; i++) {\n        res = map(ro + rd * tDist, time);\n        if(res.x < 0.001 || tDist > 8.0) break;\n        tDist += res.x;\n    }\n    \n    if(res.x < 0.001) {\n        vec3 pos = ro + rd * tDist;\n        vec3 normal = getNormal(pos, time);\n        \n        vec3 lp1 = vec3(0.5 + 0.5 * sin(time), 0.5 + 0.5 * cos(time), lightHeight);\n        vec3 lp2 = vec3(0.5 + 0.5 * cos(time * 0.7), 0.5 + 0.5 * sin(time * 0.7), lightHeight);\n        vec3 l1 = normalize(lp1 - vec3(uv, 0.0));\n        vec3 l2 = normalize(lp2 - vec3(uv, 0.0));\n        \n        float diff = max(dot(normal, l1), 0.0) + max(dot(normal, l2), 0.0);\n        float spec = pow(max(dot(normal, normalize(l1 + vec3(0,0,1))), 0.0), shininess);\n        \n        vec3 animCol = vec3(0.5 + 0.5 * sin(time * colorSpeed), 0.5 + 0.5 * sin(time * colorSpeed + 2.1), 0.5 + 0.5 * sin(time * colorSpeed + 4.2));\n        vec3 matCol = (res.y > 0.5) ? vec3(0.0) : vec3(0.45);\n        vec3 finalCol = (matCol * ambient) + (matCol * diff * animCol * lightIntensity) + (spec * animCol * lightIntensity);\n        \n        return vec4(finalCol * isNotBlack, base.a);\n    }\n\n    return vec4(0.0, 0.0, 0.0, base.a);\n}",
    "uniformValues": {
      "lightHeight": 0.2971,
      "lightIntensity": 3.5,
      "ambient": 0.79,
      "shininess": 120,
      "detail": 9.109,
      "blackThreshold": 0.21,
      "colorSpeed": 2.9,
      "alienCount": 5.92,
      "alienSpread": 1.06,
      "alienSize": 0.841,
      "headWidth": 0.605,
      "headHeight": 0.5,
      "headDepth": 1,
      "neckCone": 0.18,
      "neckLength": 1.468,
      "noseSize": 0.61,
      "eyeSize": 0.77,
      "eyeInclination": 0,
      "antenna": 0.11,
      "dance": 0.5
    }
  },
  {
    "id": "timeline-94bbde88-c92d-4254-ac3b-b1b1e8651707",
    "name": "Animated Soft Psychedelic Halo8",
    "template": "stage",
    "group": "Saved",
    "description": "Saved from the timeline editor.",
    "code": "// NAME: Animated Soft Psychedelic Halo\nuniform float intensity; // @min 0.0 @max 5.0 @default 2.5\nuniform vec3 tint; // @default 0.1,0.5,0.9\nuniform float haloSize; // @min 0.0 @max 1.0 @default 0.6\nuniform float haloSoftness; // @min 0.01 @max 1.0 @default 0.5\nuniform float warp; // @min 0.0 @max 5.0 @default 1.5\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 original = texture2D(tex, fract(uv));\n    vec2 off = 2.0 / max(resolution, vec2(1.0));\n    \n    float lum = dot(original.rgb, vec3(0.299, 0.587, 0.114));\n    lum += dot(texture2D(tex, fract(uv + vec2(off.x, off.y))).rgb, vec3(0.299, 0.587, 0.114));\n    lum += dot(texture2D(tex, fract(uv + vec2(-off.x, off.y))).rgb, vec3(0.299, 0.587, 0.114));\n    lum += dot(texture2D(tex, fract(uv + vec2(off.x, -off.y))).rgb, vec3(0.299, 0.587, 0.114));\n    lum += dot(texture2D(tex, fract(uv + vec2(-off.x, -off.y))).rgb, vec3(0.299, 0.587, 0.114));\n    lum *= 0.2;\n    \n    float dynamicHaloSize = clamp(haloSize, 0.01, 0.99);\n    float darkHaloMask = smoothstep(max(0.0, dynamicHaloSize - haloSoftness), dynamicHaloSize, lum) *\n                         (1.0 - smoothstep(dynamicHaloSize, dynamicHaloSize + haloSoftness, lum));\n\n    // Use seamless trigonometric functions and animate with time\n    vec2 uvWrap = uv * 6.28318530718;\n    float t = time * speed;\n    \n    vec2 flow = vec2(\n        sin(uvWrap.x * 2.0 + cos(uvWrap.y * 2.0 + t)),\n        cos(uvWrap.y * 2.0 + sin(uvWrap.x * 2.0 - t))\n    ) * warp * 0.25;\n    \n    float blobNoise = sin(uvWrap.x * 3.0 + flow.x * 5.0 + t * 1.5) * cos(uvWrap.y * 3.0 + flow.y * 5.0 - t * 1.2);\n    float phase = lum + blobNoise * 0.5 + flow.x * 0.5 + flow.y * 0.5 - t * 0.5;\n    \n    vec3 psychColor = 0.5 + 0.5 * cos(6.28318530718 * (vec3(phase) + tint + vec3(0.02, 0.20, 0.38)));\n    \n    vec3 finalColor = clamp(psychColor * darkHaloMask * intensity, 0.0, 1.0);\n\n    return vec4(finalColor, original.a);\n}",
    "uniformValues": {
      "intensity": 5,
      "tint": [
        0.47058823529411764,
        0.5607843137254902,
        0.6470588235294118
      ],
      "haloSize": 0.57,
      "haloSoftness": 0.3268,
      "warp": 3.35,
      "speed": 1
    }
  },
  {
    "id": "timeline-a9f02937-9e0c-464e-a22d-a9e16d99b2f3",
    "name": "Dynamic Dual Light Spiral",
    "template": "stage",
    "group": "Saved",
    "description": "Saved from the timeline editor.",
    "code": "// NAME: Dynamic Dual Light Spiral\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float speed2; // @min -10.0 @max 10.0 @default 3.0\nuniform float lineLength; // @min 1.0 @max 10.0 @default 1.0\nuniform float delay; // @min 0.0 @max 5.0 @default 2.0\nuniform float distOffset; // @min 0.0 @max 20.0 @default 10.0\nuniform float centerBlur; // @min 0.0 @max 0.5 @default 0.1\nuniform float waveFreq; // @min 1.0 @max 50.0 @default 20.0\nuniform float blackSpotAmount; // @min 0.0 @max 1.0 @default 0.8\nuniform float spiralScale; // @min 5.0 @max 100.0 @default 40.0\nuniform float spiralSpeed; // @min -20.0 @max 20.0 @default 7.0\nuniform float spiralSize; // @min 0.05 @max 1.0 @default 0.3\nuniform float lsdGlowWidth; // @min 0.1 @max 2.0 @default 0.8\nuniform float prime1; // @min 1.0 @max 13.0 @default 2.0\nuniform float prime2; // @min 1.0 @max 13.0 @default 3.0\nuniform bool blackLinesInLight; // @default false\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 baseColor = texture2D(tex, uv);\n    \n    vec2 symUv = uv;\n    float dir = 1.0;\n    if (symUv.x > 0.5) {\n        symUv.x = 1.0 - symUv.x;\n        dir = -1.0;\n    }\n    \n    float blob = node_noise(symUv * 5.0);\n    float localTime = time;\n    if (blob > 0.0) {\n        localTime = time - delay;\n    }\n\n    vec2 off = 1.0 / resolution;\n    \n    float t00 = texture2D(tex, uv + vec2(-off.x, -off.y)).r;\n    float t10 = texture2D(tex, uv + vec2( 0.0,   -off.y)).r;\n    float t20 = texture2D(tex, uv + vec2( off.x, -off.y)).r;\n    float t01 = texture2D(tex, uv + vec2(-off.x,  0.0)).r;\n    float t21 = texture2D(tex, uv + vec2( off.x,  0.0)).r;\n    float t02 = texture2D(tex, uv + vec2(-off.x,  off.y)).r;\n    float t12 = texture2D(tex, uv + vec2( 0.0,    off.y)).r;\n    float t22 = texture2D(tex, uv + vec2( off.x,  off.y)).r;\n\n    float gx = (t00 + 2.0 * t01 + t02) - (t20 + 2.0 * t21 + t22);\n    float gy = (t00 + 2.0 * t10 + t20) - (t02 + 2.0 * t12 + t22);\n    \n    float edge = sqrt(gx * gx + gy * gy);\n    float angle = atan(gy, gx);\n    \n    float dist = distance(uv, vec2(0.5));\n    \n    float segment1 = sin(angle * lineLength + localTime * speed * dir - dist * distOffset);\n    float segment2 = sin(angle * lineLength - localTime * speed2 * dir - dist * distOffset * 0.7);\n    \n    float centerDist = abs(uv.x - 0.5);\n    float blurFactor = smoothstep(centerBlur + 0.001, 0.0, centerDist);\n    \n    float edgeMin = mix(0.7, 0.0, blurFactor);\n    float edgeMax = mix(0.95, 1.0, blurFactor);\n    segment1 = smoothstep(edgeMin, edgeMax, segment1);\n    segment2 = smoothstep(0.2, 0.8, segment2);\n    \n    vec3 softLight = baseColor.rgb * 0.4;\n    \n    vec3 dynWave1 = vec3(sin(time * 0.4), cos(time * 0.3), sin(time * 0.5)) * 0.5 + 0.5;\n    vec3 dynWave2 = vec3(cos(time * 0.5), sin(time * 0.6), cos(time * 0.4)) * 0.5 + 0.5;\n    vec3 dynWave3 = vec3(sin(time * 0.7), cos(time * 0.8), sin(time * 0.6)) * 0.5 + 0.5;\n    \n    float wave1 = sin(dist * waveFreq - time * speed) * 0.5 + 0.5;\n    vec3 lineColor1 = mix(dynWave1, dynWave2, wave1);\n    \n    float wave2 = sin(dist * waveFreq * 0.6 + time * speed2) * 0.5 + 0.5;\n    vec3 lineColor2 = mix(dynWave2, dynWave3, wave2);\n    \n    vec3 highlight1 = lineColor1 * edge * segment1 * 2.0;\n    vec3 highlight2 = lineColor2 * edge * segment2 * 1.5;\n    \n    vec3 finalColor = softLight + highlight1 + highlight2;\n    \n    vec2 centeredUv = symUv - vec2(0.5);\n    centeredUv.x *= resolution.x / resolution.y;\n    \n    float r = length(centeredUv);\n    float a = atan(centeredUv.y, centeredUv.x);\n    \n    float p1 = prime1;\n    float p2 = prime2;\n    float p3 = 5.0;\n    float p5 = 11.0;\n    \n    float scaledR = r * spiralScale;\n    float spiral = a * p3 + scaledR * p1 - time * spiralSpeed;\n    float mathBlob = sin(spiral) + cos(scaledR * p2 + a * p5) + sin(scaledR * p1 - time * p3);\n    \n    float borderMask = smoothstep(0.0, 0.15, uv.x) * smoothstep(1.0, 0.85, uv.x) * \n                       smoothstep(0.0, 0.15, uv.y) * smoothstep(1.0, 0.85, uv.y);\n    \n    float sizeMask = smoothstep(spiralSize, 0.05, r) * borderMask;\n    float spot = smoothstep(0.5, 1.5, mathBlob) * sizeMask;\n    float lsdEdge = smoothstep(lsdGlowWidth, 0.0, abs(mathBlob - 0.3)) * sizeMask;\n    \n    vec3 lsdColor = lineColor1;\n    \n    finalColor += lsdColor * lsdEdge * blackSpotAmount * 2.0;\n    finalColor = mix(finalColor, vec3(0.0), spot * blackSpotAmount);\n    \n    vec2 lightPos = vec2(\n        0.5 + 0.4 * sin(time * 1.1 + node_noise(vec2(time * 0.5, 0.0))),\n        0.5 + 0.4 * cos(time * 1.3 + node_noise(vec2(0.0, time * 0.5)))\n    );\n    \n    vec2 lightPos2 = vec2(\n        0.5 + 0.4 * cos(time * 0.7 + 2.0),\n        0.5 + 0.4 * sin(time * 0.9 + 1.0)\n    );\n    \n    vec2 lightUv = uv;\n    lightUv.x *= resolution.x / resolution.y;\n    \n    vec2 lightPosAspect = lightPos;\n    lightPosAspect.x *= resolution.x / resolution.y;\n    \n    vec2 lightPosAspect2 = lightPos2;\n    lightPosAspect2.x *= resolution.x / resolution.y;\n    \n    float lDist = distance(lightUv, lightPosAspect);\n    float lDist2 = distance(lightUv, lightPosAspect2);\n    \n    float illumination = pow(smoothstep(1.2, 0.0, lDist), 1.5);\n    \n    vec3 dynLightColor = vec3(sin(time * 0.2), cos(time * 0.25), sin(time * 0.3)) * 0.5 + 0.5;\n    \n    finalColor *= illumination * (1.0 + dynLightColor * 2.5);\n    \n    if (blackLinesInLight) {\n        float totalLines = clamp((edge * segment1 * 2.0) + (edge * segment2 * 1.5) + (lsdEdge * 2.0), 0.0, 1.0);\n        finalColor = mix(finalColor, vec3(0.0), totalLines * illumination);\n    }\n    \n    float luma = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));\n    float nonBlackMask = smoothstep(0.05, 0.2, luma);\n    \n    float illumination2 = pow(smoothstep(0.8, 0.0, lDist2), 2.0) * nonBlackMask;\n    vec3 invertedBase = vec3(1.0) - baseColor.rgb;\n    vec3 invertedLit = invertedBase * lineColor2 * 2.5;\n    \n    finalColor = mix(finalColor, invertedLit, illumination2);\n    \n    return vec4(finalColor, baseColor.a);\n}",
    "uniformValues": {
      "speed": 5,
      "speed2": 3,
      "lineLength": 1,
      "delay": 2,
      "distOffset": 10,
      "centerBlur": 0.1,
      "waveFreq": 20,
      "blackSpotAmount": 0.8,
      "spiralScale": 40,
      "spiralSpeed": 7,
      "spiralSize": 0.3,
      "lsdGlowWidth": 0.8,
      "prime1": 2,
      "prime2": 3,
      "blackLinesInLight": false
    }
  },
  {
    "id": "saved-e347a428-b038-4f67-aec5-857100594765",
    "name": "Horizontal Band Loop",
    "template": "stage",
    "group": "Saved",
    "description": "Saved from the current workspace state.",
    "code": "// NAME: Horizontal Band Loop\nuniform float bands; // @min 1.0 @max 100.0 @default 20.0\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    // Divide the image into horizontal bands (rows)\n    float bandIndex = floor(uv.y * bands);\n    \n    // Generate a pseudo-random value for each band to vary speed and direction\n    float randVal = node_rand(vec2(bandIndex, 1.0));\n    float direction = randVal > 0.5 ? 1.0 : -1.0;\n    \n    vec2 newUV = uv;\n    // Shift the x coordinate horizontally in a continuous loop\n    newUV.x = fract(newUV.x + time * speed * direction * randVal);\n    \n    return texture2D(tex, newUV);\n}",
    "uniformValues": {
      "bands": 20,
      "speed": 1
    }
  },
  {
    "id": "timeline-e44ab6e9-3ef9-4591-a3fc-6b6d1a6fba40",
    "name": "Normal Eyes High Contrast",
    "template": "stage",
    "group": "Saved",
    "description": "Saved from the timeline editor.",
    "code": "// NAME: Normal Eyes High Contrast\nuniform float tolerance; // @min -0.5 @max 1.0 @default 0.05\nuniform float pupilSize; // @min 0.0 @max 0.5 @default 0.10\nuniform float gridScale; // @min 1.0 @max 50.0 @default 12.0\nuniform float moveSpeed; // @min 0.0 @max 5.0 @default 2.0\nuniform float amountofmovement; // @min 0.0 @max 1.0 @default 0.5\nuniform float contrast; // @min -5.0 @max 5.0 @default 2.5\nuniform vec3 pupilColor; // @default 0.0,0.0,0.0\nuniform vec3 irisColor; // @default 0.2,0.5,0.8\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Apply contrast to the base image (can be negative to invert)\n    vec3 contrasted = clamp((source.rgb - 0.5) * contrast + 0.5, 0.0, 1.0);\n    \n    // Isolate green pixels to use as the eye mask\n    float greenness = source.g - max(source.r, source.b);\n    float mask = smoothstep(tolerance, tolerance + 0.1, greenness);\n    \n    // Simulate eyes looking around using offset sine waves\n    float t = time * moveSpeed;\n    vec2 lookOffset = vec2(\n        sin(t) * 0.3 + cos(t * 0.73) * 0.2,\n        cos(t * 1.1) * 0.3 + sin(t * 0.87) * 0.2\n    ) * amountofmovement;\n    \n    // Generate a moving grid for the eyes\n    vec2 gridUv = fract(uv * gridScale + lookOffset) - 0.5;\n    float dist = length(gridUv);\n    \n    // Create pupil and iris shapes\n    float pupil = 1.0 - smoothstep(pupilSize - 0.02, pupilSize + 0.02, dist);\n    float irisSize = pupilSize * 2.2;\n    float iris = 1.0 - smoothstep(irisSize - 0.02, irisSize + 0.02, dist);\n    \n    // Build the eye: White sclera -> Iris -> Pupil\n    vec3 eyeColor = mix(vec3(1.0), irisColor, iris);\n    eyeColor = mix(eyeColor, pupilColor, pupil);\n    \n    // Replace the green masked areas with the new eye, keep contrasted background elsewhere\n    vec3 finalColor = mix(contrasted, eyeColor, mask);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "tolerance": 0.205,
      "pupilSize": 0.125,
      "gridScale": 17.17,
      "moveSpeed": 5,
      "amountofmovement": 0.5,
      "contrast": -0.9,
      "pupilColor": [
        0.12941176470588237,
        0.12549019607843137,
        0.15294117647058825
      ],
      "irisColor": [
        0.2,
        0.5,
        0.8
      ]
    }
  },
  {
    "id": "saved-b64ab5b8-6c49-4ea8-8631-1476f3a7fe1e",
    "name": "Seamless Soft Psychedelic Halo",
    "template": "stage",
    "group": "Saved",
    "description": "Saved from the current workspace state.",
    "code": "// NAME: Seamless Soft Psychedelic Halo\nuniform float intensity; // @min 0.0 @max 5.0 @default 2.5\nuniform vec3 tint; // @default 0.1,0.5,0.9\nuniform float haloSize; // @min 0.0 @max 1.0 @default 0.6\nuniform float haloSoftness; // @min 0.01 @max 1.0 @default 0.5\nuniform float warp; // @min 0.0 @max 5.0 @default 1.5\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 original = texture2D(tex, fract(uv));\n    vec2 off = 2.0 / max(resolution, vec2(1.0));\n    \n    float lum = dot(original.rgb, vec3(0.299, 0.587, 0.114));\n    lum += dot(texture2D(tex, fract(uv + vec2(off.x, off.y))).rgb, vec3(0.299, 0.587, 0.114));\n    lum += dot(texture2D(tex, fract(uv + vec2(-off.x, off.y))).rgb, vec3(0.299, 0.587, 0.114));\n    lum += dot(texture2D(tex, fract(uv + vec2(off.x, -off.y))).rgb, vec3(0.299, 0.587, 0.114));\n    lum += dot(texture2D(tex, fract(uv + vec2(-off.x, -off.y))).rgb, vec3(0.299, 0.587, 0.114));\n    lum *= 0.2;\n    \n    float dynamicHaloSize = clamp(haloSize, 0.01, 0.99);\n    float darkHaloMask = smoothstep(max(0.0, dynamicHaloSize - haloSoftness), dynamicHaloSize, lum) *\n                         (1.0 - smoothstep(dynamicHaloSize, dynamicHaloSize + haloSoftness, lum));\n\n    // Use seamless trigonometric functions instead of node_noise to prevent seams\n    vec2 uvWrap = uv * 6.28318530718;\n    vec2 flow = vec2(\n        sin(uvWrap.x * 2.0 + cos(uvWrap.y * 2.0)),\n        cos(uvWrap.y * 2.0 + sin(uvWrap.x * 2.0))\n    ) * warp * 0.25;\n    \n    float blobNoise = sin(uvWrap.x * 3.0 + flow.x * 5.0) * cos(uvWrap.y * 3.0 + flow.y * 5.0);\n    float phase = lum + blobNoise * 0.5 + flow.x * 0.5 + flow.y * 0.5;\n    \n    vec3 psychColor = 0.5 + 0.5 * cos(6.28318530718 * (vec3(phase) + tint + vec3(0.02, 0.20, 0.38)));\n    \n    vec3 finalColor = clamp(psychColor * darkHaloMask * intensity, 0.0, 1.0);\n\n    return vec4(finalColor, original.a);\n}",
    "uniformValues": {
      "intensity": 5,
      "tint": [
        0.47058823529411764,
        0.5607843137254902,
        0.6470588235294118
      ],
      "haloSize": 0.57,
      "haloSoftness": 0.3565,
      "warp": 0
    }
  },
  {
    "id": "timeline-421517ae-3ca7-485a-be48-17d856080f11",
    "name": "Target Color Zone Trackers",
    "template": "stage",
    "group": "Saved",
    "description": "Saved from the timeline editor.",
    "code": "// NAME: Target Color Zone Trackers\nuniform float speed; // @min -10.0 @max 10.0 @default 3.0\nuniform float dotSize; // @min 0.1 @max 1.0 @default 0.4\nuniform float trailLength; // @min 0.0 @max 2.0 @default 1.0\nuniform float density; // @min 10.0 @max 100.0 @default 40.0\nuniform float lineThreshold; // @min 0.0 @max 0.6 @default 0.2\nuniform float edgeThickness; // @min 0.001 @max 0.02 @default 0.005\nuniform float trackOffset; // @min -3.0 @max 3.0 @default 0.5\nuniform float gapFrequency; // @min 0.05 @max 0.5 @default 0.15\n\n// NEW: Color Targeting Sliders (Defaulted to Green)\nuniform float targetR; // @min 0.0 @max 1.0 @default 0.3\nuniform float targetG; // @min 0.0 @max 1.0 @default 0.6\nuniform float targetB; // @min 0.0 @max 1.0 @default 0.2\nuniform float colorTolerance; // @min 0.05 @max 1.5 @default 0.45\n\nfloat getLuminance(vec3 color) {\n    return dot(color, vec3(0.299, 0.587, 0.114));\n}\n\nfloat hash(vec3 p) {\n    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.543))) * 43758.5453);\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 baseColor = texture2D(tex, uv);\n    vec3 finalColor = baseColor.rgb; \n    \n    // Protect the black lines from being painted over\n    float currentLum = getLuminance(baseColor.rgb);\n    bool isLine = currentLum < lineThreshold;\n\n    float aspect = resolution.x / resolution.y;\n    vec2 st = uv * vec2(aspect, 1.0);\n    vec2 off = vec2(edgeThickness / aspect, edgeThickness);\n\n    // Sobel Edge Detection\n    float t00 = getLuminance(texture2D(tex, uv + vec2(-off.x, -off.y)).rgb);\n    float t10 = getLuminance(texture2D(tex, uv + vec2( 0.0,   -off.y)).rgb);\n    float t20 = getLuminance(texture2D(tex, uv + vec2( off.x, -off.y)).rgb);\n    float t01 = getLuminance(texture2D(tex, uv + vec2(-off.x,  0.0)).rgb);\n    float t21 = getLuminance(texture2D(tex, uv + vec2( off.x,  0.0)).rgb);\n    float t02 = getLuminance(texture2D(tex, uv + vec2(-off.x,  off.y)).rgb);\n    float t12 = getLuminance(texture2D(tex, uv + vec2( 0.0,    off.y)).rgb);\n    float t22 = getLuminance(texture2D(tex, uv + vec2( off.x,  off.y)).rgb);\n\n    float gx = (t00 + 2.0 * t01 + t02) - (t20 + 2.0 * t21 + t22);\n    float gy = (t00 + 2.0 * t10 + t20) - (t02 + 2.0 * t12 + t22);\n    float edge = length(vec2(gx, gy));\n\n    float edgeZone = smoothstep(0.1, 0.4, edge);\n\n    vec2 tangent = normalize(vec2(-gy, gx) + 0.00001);\n    vec2 normal = normalize(vec2(gx, gy) + 0.00001);\n\n    // --- COLOR TARGETING LOGIC ---\n    // Look deeply inside the shape (along the normal) to find its actual color\n    vec2 insideUv = uv + normal * (edgeThickness * 4.0);\n    vec3 zoneColor = texture2D(tex, insideUv).rgb;\n\n    // Check how close the zone's color is to our Target RGB sliders\n    vec3 targetColor = vec3(targetR, targetG, targetB);\n    float colorDist = distance(zoneColor, targetColor);\n    bool inTargetZone = colorDist < colorTolerance;\n\n    // Only do the math to draw dots if we are actually inside the correct color zone\n    if (inTargetZone) {\n        // Group the colors to give each shape a unique random starting offset\n        vec3 zoneHashGroup = floor(zoneColor * 5.0) / 5.0;\n        float travelPos = dot(st, tangent) * density - (time * speed) + hash(zoneHashGroup) * 100.0;\n        \n        // Offset the track so dots sit perfectly inside the color, not exactly on the line\n        float crossPos = dot(st, normal) * density + trackOffset;\n\n        float threshold = 1.0 - (dotSize * 0.5);\n\n        float circleGrid = cos(travelPos) * cos(crossPos);\n        float head = smoothstep(threshold, threshold + 0.1, circleGrid);\n\n        float trailShape = cos(crossPos); \n        float trailMask = smoothstep(1.0 - trailLength, 1.0, cos(travelPos)) * smoothstep(0.0, 1.0, -sin(travelPos));\n        float trail = smoothstep(threshold, threshold + 0.1, trailShape) * trailMask * 0.6;\n\n        float sparsityMask = smoothstep(0.9, 1.0, cos(travelPos * gapFrequency));\n\n        float comet = max(head, trail) * sparsityMask;\n        float finalMask = comet * edgeZone;\n\n        // Draw the red trace, but never paint over a dark line\n        if (!isLine && finalMask > 0.01) {\n            finalColor = mix(finalColor, vec3(1.0, 0.0, 0.0), finalMask);\n        }\n    }\n\n    return vec4(finalColor, baseColor.a);\n}",
    "uniformValues": {
      "speed": 10,
      "dotSize": 0.973,
      "trailLength": 1.98,
      "density": 100,
      "lineThreshold": 0.6,
      "edgeThickness": 5,
      "trackOffset": 3,
      "gapFrequency": 0.4955,
      "targetR": 0.98,
      "targetG": 0.99,
      "targetB": 0.98,
      "colorTolerance": 0.45
    }
  },
  {
    "id": "timeline-5a961b7c-19c2-4e38-b835-2ba872b50727",
    "name": "Tri-State Wave Reveal",
    "template": "stage",
    "group": "Saved",
    "description": "Saved from the timeline editor.",
    "code": "// NAME: Tri-State Wave Reveal\nuniform float intensity; // @min 0.0 @max 5.0 @default 1.5\nuniform vec3 tint; // @default 0.1,0.5,0.9\nuniform float warp; // @min 0.0 @max 5.0 @default 1.5\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 original = texture2D(tex, uv);\n    float t = time * speed;\n    \n    // State 1: Inverted\n    vec3 c1 = 1.0 - original.rgb;\n    \n    // State 2: Dark Normal\n    vec3 c2 = original.rgb * 0.25;\n    \n    // State 3: Psychedelic\n    vec2 uvWrap = uv * 6.28318530718;\n    vec2 flow = vec2(\n        sin(uvWrap.x * 2.0 + cos(uvWrap.y * 2.0 + t)),\n        cos(uvWrap.y * 2.0 + sin(uvWrap.x * 2.0 - t))\n    ) * warp * 0.25;\n    float lum = dot(original.rgb, vec3(0.299, 0.587, 0.114));\n    float blobNoise = sin(uvWrap.x * 3.0 + flow.x * 5.0 + t * 1.5) * cos(uvWrap.y * 3.0 + flow.y * 5.0 - t * 1.2);\n    float phase = lum + blobNoise * 0.5 + flow.x * 0.5 + flow.y * 0.5 - t * 0.5;\n    vec3 c3 = 0.5 + 0.5 * cos(6.28318530718 * (vec3(phase) + tint + vec3(0.0, 0.33, 0.67)));\n    c3 *= intensity;\n    \n    // Random Wave Generation\n    float waveBase = sin(uv.x * 8.0 + t) + cos(uv.y * 7.0 - t * 1.1) + sin((uv.x - uv.y) * 5.0 + t * 0.8);\n    float noise = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);\n    float wave = mod((waveBase + 3.0) * 0.5 + noise * 0.5 + t * 0.5, 3.0);\n    \n    // Blend between the three states based on the wave\n    vec3 finalColor;\n    if (wave < 1.0) {\n        finalColor = mix(c3, c1, smoothstep(0.0, 1.0, wave));\n    } else if (wave < 2.0) {\n        finalColor = mix(c1, c2, smoothstep(1.0, 2.0, wave));\n    } else {\n        finalColor = mix(c2, c3, smoothstep(2.0, 3.0, wave));\n    }\n    \n    return vec4(clamp(finalColor, 0.0, 1.0), original.a);\n}",
    "uniformValues": {
      "intensity": 0.3,
      "tint": [
        0.47058823529411764,
        0.5607843137254902,
        0.6470588235294118
      ],
      "warp": 1.3,
      "speed": 0.45
    }
  },
  {
    "id": "timeline-6f2d5681-218c-48b8-87e4-d7e087e5565c",
    "name": "Zone Fractal",
    "template": "stage",
    "group": "Saved",
    "description": "Saved from the timeline editor.",
    "code": "// NAME: Zone Fractal\nuniform float zoneWidth;      // @min 1.0  @max 80.0  @default 15.0\nuniform float edgeWidth;      // @min 0.0  @max 10.0  @default 1.5\nuniform float maxDepth;       // @min 10.0 @max 200.0 @default 100.0\nuniform float blackThreshold; // @min 0.03 @max 0.6   @default 0.18\nuniform float whiteThreshold; // @min 0.4  @max 0.99  @default 0.85\nuniform float trailSpeed;     // @min 0.0  @max 200.0 @default 50.0\nuniform float trailLength;    // @min 0.01 @max 0.99  @default 0.65\nuniform float trailDistance;  // @min 1.0  @max 80.0  @default 15.0\nuniform float animSpeed;      // @min 0.0  @max 2.0   @default 0.3\nuniform float animRadius;     // @min 0.1  @max 5.0   @default 1.0\n\n// ── 1. isEdgePixel ────────────────────────────────────────────────────────────\nbool isEdgePixel(vec4 sp, float blackT, float whiteT) {\n    return sp.a < 0.3\n        || (sp.r < blackT && sp.g < blackT && sp.b < blackT)\n        || (sp.r > whiteT && sp.g > whiteT && sp.b > whiteT);\n}\n\n// ── 2. marchRay ───────────────────────────────────────────────────────────────\nfloat marchRay(sampler2D tex, vec2 uv, vec2 dir, vec2 px,\n               float minD, float blackT, float whiteT,\n               inout vec2 nearVec) {\n    for (int j = 11; j <= 100; j++) {\n        float fj = float(j);\n        if (fj >= minD) break;\n        vec2 s = uv + dir * px * fj;\n        if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) {\n            if (fj < minD) { minD = fj; nearVec = dir; }\n            break;\n        }\n        if (isEdgePixel(texture2D(tex, s), blackT, whiteT)) {\n            if (fj < minD) { minD = fj; nearVec = dir; }\n            break;\n        }\n    }\n    return minD;\n}\n\n// ── 3. sampleZoneColor ────────────────────────────────────────────────────────\nvec3 sampleZoneColor(sampler2D tex, vec2 uv,\n                     vec2 nearVec, vec2 px,\n                     float minD, float zoneW, float maxD,\n                     float blackT, float whiteT) {\n\n    float zoneCenter = (floor(minD / zoneW) + 0.5) * zoneW;\n    vec2  anchorUV   = uv + nearVec * px * (minD - zoneCenter);\n\n    vec3  accum  = vec3(0.0);\n    float weight = 0.0;\n\n    for (int dy = -1; dy <= 1; dy++) {\n        for (int dx = -1; dx <= 1; dx++) {\n            vec2 s = anchorUV + vec2(float(dx), float(dy)) * px * 1.5;\n            if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) continue;\n            vec4 sc = texture2D(tex, s);\n            if (isEdgePixel(sc, blackT, whiteT)) continue;\n            if (sc.r < blackT && sc.g < blackT && sc.b < blackT && sc.a > 0.3) continue;\n            accum  += sc.rgb;\n            weight += 1.0;\n        }\n    }\n\n    vec3  col       = (weight > 0.0) ? accum / weight : vec3(0.3);\n    float depthFade = 1.0 - (zoneCenter / maxD) * 0.6;\n    col *= depthFade * 0.65;\n    return col;\n}\n\n// ── 4. processColor ───────────────────────────────────────────────────────────\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n\n    vec4 src = texture2D(tex, uv);\n\n    bool srcIsBlack = src.r < blackThreshold && src.g < blackThreshold && src.b < blackThreshold && src.a > 0.3;\n    bool srcIsBg    = src.r > whiteThreshold  && src.g > whiteThreshold  && src.b > whiteThreshold;\n    bool srcIsShape = src.a > 0.3 && !srcIsBlack && !srcIsBg;\n\n    if (srcIsBlack)             return vec4(0.0, 0.0, 0.0, 1.0);\n    if (srcIsBg || !srcIsShape) return vec4(0.0, 0.0, 0.0, 0.0);\n\n    float aspect = resolution.x / resolution.y;\n    vec2  px     = vec2(0.001, 0.001 * aspect);\n\n    float minD    = maxDepth;\n    vec2  nearVec = vec2(1.0, 0.0);\n\n    // ── Phase 1: Euclidean search ±10 ────────────────────────────────────────\n    for (int dy = -10; dy <= 10; dy++) {\n        for (int dx = -10; dx <= 10; dx++) {\n            float fdx = float(dx), fdy = float(dy);\n            float d2  = fdx*fdx + fdy*fdy;\n            if (d2 < 0.5 || d2 > 100.5) continue;\n            vec2  s  = uv + vec2(fdx, fdy) * px;\n            float nd = sqrt(d2);\n            if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) {\n                if (nd < minD) { minD = nd; nearVec = normalize(vec2(fdx, fdy)); }\n                continue;\n            }\n            if (isEdgePixel(texture2D(tex, s), blackThreshold, whiteThreshold))\n                if (nd < minD) { minD = nd; nearVec = normalize(vec2(fdx, fdy)); }\n        }\n    }\n\n    // ── Phase 2: 32-direction ray-march ──────────────────────────────────────\n    if (minD > 10.0) {\n        minD = marchRay(tex, uv, vec2( 1.0000, 0.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.9808, 0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.9239, 0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.8315, 0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.7071, 0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.5556, 0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.3827, 0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.1951, 0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.0000, 1.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.1951, 0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.3827, 0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.5556, 0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.7071, 0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.8315, 0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.9239, 0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.9808, 0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-1.0000, 0.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.9808,-0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.9239,-0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.8315,-0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.7071,-0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.5556,-0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.3827,-0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.1951,-0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.0000,-1.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.1951,-0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.3827,-0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.5556,-0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.7071,-0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.8315,-0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.9239,-0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.9808,-0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\n    }\n\n    // ── Zone indices — shared by every pixel in the same strip ───────────────\n    float zoneNum  = floor(minD / zoneWidth);\n    float isEven   = mod(zoneNum, 2.0) < 0.5 ? 1.0 : 0.0;\n    float zoneIdx  = mod(zoneNum, 4.0);\n\n    // ── Reveal: wave front sweeps through zone numbers, not screen space ──────\n    // Every pixel with the same zoneNum gets identical visibility → whole strip\n    // fades in/out as one unit. animRadius controls transition softness in zones.\n    float visibility = 1.0;\n    if (animSpeed > 0.001) {\n        float maxZone   = maxDepth / zoneWidth;\n        // waveFront goes from maxZone down to 0, then loops\n        float waveFront = maxZone * (1.0 - fract(time * animSpeed * 0.05));\n        // distance of this zone from the wave front, in zone units\n        float zoneDist  = abs(zoneNum - waveFront);\n        visibility = 1.0 - smoothstep(animRadius * 0.5, animRadius, zoneDist);\n        if (visibility < 0.001) return vec4(0.0, 0.0, 0.0, 0.0);\n    }\n\n    // ── Zone border ───────────────────────────────────────────────────────────\n    float depFrac = mod(minD, zoneWidth);\n    if (depFrac < edgeWidth || depFrac > zoneWidth - edgeWidth)\n        return vec4(0.0, 0.0, 0.0, visibility);\n\n    // ── Snap nearVec to nearest 45° octant ────────────────────────────────────\n    float snapAngle = floor(atan(nearVec.y, nearVec.x) / 0.7854 + 0.5) * 0.7854;\n    vec2  tangent   = vec2(-sin(snapAngle), cos(snapAngle));\n\n    // ── Zone color ────────────────────────────────────────────────────────────\n    vec3 col = sampleZoneColor(tex, uv, nearVec, px,\n                               minD, zoneWidth, maxDepth,\n                               blackThreshold, whiteThreshold);\n\n    // ── Animated dot trail ────────────────────────────────────────────────────\n    float speedMul;\n    if      (zoneIdx < 0.5) speedMul =  1.0;\n    else if (zoneIdx < 1.5) speedMul = -1.4;\n    else if (zoneIdx < 2.5) speedMul =  1.2;\n    else                    speedMul = -0.9;\n\n    speedMul *= isEven > 0.5 ? -1.0 : 1.0;\n\n    vec2  uvPx  = uv * vec2(1000.0, 1000.0 / aspect);\n    float along = dot(uvPx, tangent);\n    float phase = fract((along + time * trailSpeed * speedMul) / trailDistance);\n    float headSize = 0.04;\n\n    if (phase < headSize) {\n        col = mix(col, vec3(1.0), 0.95);\n    } else if (phase < headSize + trailLength) {\n        float t = (phase - headSize) / trailLength;\n        col = mix(col, vec3(1.0), 0.88 * (1.0 - t * t));\n    }\n\n    return vec4(col, visibility);\n}",
    "uniformValues": {
      "zoneWidth": 4.16,
      "edgeWidth": 0.3,
      "maxDepth": 100,
      "blackThreshold": 0.2295,
      "whiteThreshold": 0.85,
      "trailSpeed": 50,
      "trailLength": 0.65,
      "trailDistance": 15,
      "animSpeed": 0.04,
      "animRadius": 0.149
    }
  },
  {
    "id": "recovered_metallic_3d_fluid_shadows_1",
    "name": "Metallic 3D Fluid Shadows",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from timeline-only shader timeline-fe5514ca-071f-40c1-854b-dcf365b3d367 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Metallic 3D Fluid Shadows\nuniform float patternScale; // @min 1.0 @max 50.0 @default 25.0\nuniform float speed; // @min 0.0 @max 2.0 @default 0.4\nuniform float colorIntensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float bgThreshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float edgeWidth; // @min -0.8 @max 0.8 @default 0.0\nuniform float dotSize; // @min 2.0 @max 30.0 @default 6.0\nuniform float noiseIntensity; // @min 0.0 @max 2.0 @default 0.6\nuniform float metallic; // @min 0.0 @max 2.0 @default 1.2\nuniform float glossiness; // @min 0.0 @max 1.0 @default 0.8\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Strict threshold to isolate the statue and keep the background pure black\n    float statueMask = smoothstep(bgThreshold, bgThreshold + 0.02, lum) * source.a;\n    \n    // Base coordinates for warping\n    vec2 p = uv * patternScale;\n    p *= (0.8 + 0.4 * lum);\n    \n    // Create a second set of coordinates for the opposite-oriented dots\n    vec2 p_inv = p;\n    \n    // Slowly rotate the colored pattern in random directions\n    float rotAngle = time * 0.1 + node_noise(vec2(time * 0.05, 0.0)) * 4.0;\n    mat2 rot = mat2(cos(rotAngle), -sin(rotAngle), sin(rotAngle), cos(rotAngle));\n    p = rot * p;\n    \n    // Iterative warping to create labyrinthine/coral Turing patterns\n    for(int i = 0; i < 6; i++) {\n        float t = time * speed;\n        \n        // Forward warp for the main colored pattern\n        p = vec2(\n            p.x + 0.65 * sin(p.y * 1.3 + t),\n            p.y + 0.65 * cos(p.x * 1.3 - t * 0.8)\n        );\n        \n        // Inverse warp for the dot noise (orienting it the opposite way)\n        p_inv = vec2(\n            p_inv.x - 0.65 * sin(p_inv.y * 1.3 + t),\n            p_inv.y - 0.65 * cos(p_inv.x * 1.3 - t * 0.8)\n        );\n    }\n    \n    // Calculate pattern value and its analytical derivatives for bump mapping\n    float val = sin(p.x) * cos(p.y);\n    float dx = cos(p.x) * cos(p.y);\n    float dy = -sin(p.x) * sin(p.y);\n    \n    float pattern = smoothstep(edgeWidth - 0.1, edgeWidth + 0.1, val);\n    \n    // Generate shifting psychedelic colors based on the pattern, time, and position\n    vec3 psychColor = vec3(\n        0.5 + 0.5 * sin(pattern * 3.14 + time * 1.5 + uv.x * 5.0),\n        0.5 + 0.5 * sin(pattern * 3.14 + time * 1.8 + uv.y * 5.0 + 2.0),\n        0.5 + 0.5 * sin(pattern * 3.14 + time * 1.2 + (uv.x + uv.y) * 5.0 + 4.0)\n    );\n    \n    // Create dark, intensive noise made of a pixel-based grid of dots using inversely warped coordinates\n    vec2 dotGridUv = (p_inv / patternScale) * (resolution.xy / dotSize);\n    vec2 dotGrid = fract(dotGridUv) - 0.5;\n    float dots = 1.0 - smoothstep(0.2, 0.35, length(dotGrid));\n    \n    // Add randomness to the dots (removed time from seed to prevent flashing/strobing)\n    float randomIntensity = node_rand(floor(dotGridUv));\n    dots *= 0.3 + 0.7 * randomIntensity;\n    \n    vec3 darkDotNoiseEffect = source.rgb * dots * noiseIntensity;\n    \n    // Base color mix\n    vec3 baseColor = mix(darkDotNoiseEffect, source.rgb * psychColor * 2.5, pattern * colorIntensity);\n    \n    // --- Metallic & Glossy Lighting Calculation ---\n    vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));\n    vec3 viewDir = vec3(0.0, 0.0, 1.0);\n    vec3 halfVector = normalize(lightDir + viewDir);\n    \n    // Create a pseudo-normal from the pattern derivatives\n    vec3 normal = normalize(vec3(dx, dy, 1.5 - min(metallic, 1.4)));\n    \n    // Self-shadowing based on pattern height differences towards the light source\n    vec2 lightOffset = lightDir.xy * 0.8;\n    float shadowVal = sin(p.x + lightOffset.x) * cos(p.y + lightOffset.y);\n    float shadow = smoothstep(-0.3, 0.7, val - shadowVal + 0.4);\n    \n    // Diffuse shading with shadow applied\n    float diffuse = max(dot(normal, lightDir), 0.0) * shadow;\n    \n    // Specular highlight (Glossiness) with shadow applied\n    float specPower = mix(5.0, 100.0, glossiness);\n    float specular = pow(max(dot(normal, halfVector), 0.0), specPower) * metallic * 1.5 * shadow;\n    \n    // Fake environment reflection\n    float envRefl = node_noise(normal.xy * 4.0 + time * 0.2);\n    vec3 reflection = vec3(envRefl) * metallic * 0.4;\n    \n    // Combine lighting with base color\n    vec3 statueEffect = baseColor * (0.2 + 0.8 * diffuse) + specular + (reflection * baseColor);\n    \n    // Blend the statue effect over a pure black background using the strict mask\n    vec3 finalColor = mix(vec3(0.0), statueEffect, statueMask);\n    \n    // Output final color, preserving original alpha for transparency\n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "patternScale": 1.98,
      "speed": 0.3,
      "colorIntensity": 1,
      "bgThreshold": 0.065,
      "edgeWidth": 0.368,
      "dotSize": 27.76,
      "noiseIntensity": 2,
      "metallic": 1.62,
      "glossiness": 0.92
    }
  },
  {
    "id": "recovered_metallic_3d_fluid_shadows_2",
    "name": "Metallic 3D Fluid Shadows 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from timeline-only shader timeline-0acf1595-225d-4aee-8fa7-b3b357a9c7ea in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Metallic 3D Fluid Shadows\nuniform float patternScale; // @min 5.0 @max 50.0 @default 25.0\nuniform float speed; // @min 0.0 @max 2.0 @default 0.4\nuniform float colorIntensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float bgThreshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float edgeWidth; // @min -0.8 @max 0.8 @default 0.0\nuniform float dotSize; // @min 2.0 @max 30.0 @default 6.0\nuniform float noiseIntensity; // @min 0.0 @max 2.0 @default 0.6\nuniform float metallic; // @min 0.0 @max 2.0 @default 1.2\nuniform float glossiness; // @min 0.0 @max 1.0 @default 0.8\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Strict threshold to isolate the statue and keep the background pure black\n    float statueMask = smoothstep(bgThreshold, bgThreshold + 0.02, lum) * source.a;\n    \n    // Base coordinates for warping\n    vec2 p = uv * patternScale;\n    p *= (0.8 + 0.4 * lum);\n    \n    // Create a second set of coordinates for the opposite-oriented dots\n    vec2 p_inv = p;\n    \n    // Slowly rotate the colored pattern in random directions\n    float rotAngle = time * 0.1 + node_noise(vec2(time * 0.05, 0.0)) * 4.0;\n    mat2 rot = mat2(cos(rotAngle), -sin(rotAngle), sin(rotAngle), cos(rotAngle));\n    p = rot * p;\n    \n    // Iterative warping to create labyrinthine/coral Turing patterns\n    for(int i = 0; i < 6; i++) {\n        float t = time * speed;\n        \n        // Forward warp for the main colored pattern\n        p = vec2(\n            p.x + 0.65 * sin(p.y * 1.3 + t),\n            p.y + 0.65 * cos(p.x * 1.3 - t * 0.8)\n        );\n        \n        // Inverse warp for the dot noise (orienting it the opposite way)\n        p_inv = vec2(\n            p_inv.x - 0.65 * sin(p_inv.y * 1.3 + t),\n            p_inv.y - 0.65 * cos(p_inv.x * 1.3 - t * 0.8)\n        );\n    }\n    \n    // Calculate pattern value and its analytical derivatives for bump mapping\n    float val = sin(p.x) * cos(p.y);\n    float dx = cos(p.x) * cos(p.y);\n    float dy = -sin(p.x) * sin(p.y);\n    \n    float pattern = smoothstep(edgeWidth - 0.1, edgeWidth + 0.1, val);\n    \n    // Generate shifting psychedelic colors based on the pattern, time, and position\n    vec3 psychColor = vec3(\n        0.5 + 0.5 * sin(pattern * 3.14 + time * 1.5 + uv.x * 5.0),\n        0.5 + 0.5 * sin(pattern * 3.14 + time * 1.8 + uv.y * 5.0 + 2.0),\n        0.5 + 0.5 * sin(pattern * 3.14 + time * 1.2 + (uv.x + uv.y) * 5.0 + 4.0)\n    );\n    \n    // Create dark, intensive noise made of a pixel-based grid of dots using inversely warped coordinates\n    vec2 dotGridUv = (p_inv / patternScale) * (resolution.xy / dotSize);\n    vec2 dotGrid = fract(dotGridUv) - 0.5;\n    float dots = 1.0 - smoothstep(0.2, 0.35, length(dotGrid));\n    \n    // Add randomness to the dots (removed time from seed to prevent flashing/strobing)\n    float randomIntensity = node_rand(floor(dotGridUv));\n    dots *= 0.3 + 0.7 * randomIntensity;\n    \n    vec3 darkDotNoiseEffect = source.rgb * dots * noiseIntensity;\n    \n    // Base color mix\n    vec3 baseColor = mix(darkDotNoiseEffect, source.rgb * psychColor * 2.5, pattern * colorIntensity);\n    \n    // --- Metallic & Glossy Lighting Calculation ---\n    vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));\n    vec3 viewDir = vec3(0.0, 0.0, 1.0);\n    vec3 halfVector = normalize(lightDir + viewDir);\n    \n    // Create a pseudo-normal from the pattern derivatives\n    vec3 normal = normalize(vec3(dx, dy, 1.5 - min(metallic, 1.4)));\n    \n    // Self-shadowing based on pattern height differences towards the light source\n    vec2 lightOffset = lightDir.xy * 0.8;\n    float shadowVal = sin(p.x + lightOffset.x) * cos(p.y + lightOffset.y);\n    float shadow = smoothstep(-0.3, 0.7, val - shadowVal + 0.4);\n    \n    // Diffuse shading with shadow applied\n    float diffuse = max(dot(normal, lightDir), 0.0) * shadow;\n    \n    // Specular highlight (Glossiness) with shadow applied\n    float specPower = mix(5.0, 100.0, glossiness);\n    float specular = pow(max(dot(normal, halfVector), 0.0), specPower) * metallic * 1.5 * shadow;\n    \n    // Fake environment reflection\n    float envRefl = node_noise(normal.xy * 4.0 + time * 0.2);\n    vec3 reflection = vec3(envRefl) * metallic * 0.4;\n    \n    // Combine lighting with base color\n    vec3 statueEffect = baseColor * (0.2 + 0.8 * diffuse) + specular + (reflection * baseColor);\n    \n    // Blend the statue effect over a pure black background using the strict mask\n    vec3 finalColor = mix(vec3(0.0), statueEffect, statueMask);\n    \n    // Output final color, preserving original alpha for transparency\n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "patternScale": 13.55,
      "speed": 1.96,
      "colorIntensity": 0.38,
      "bgThreshold": 0.165,
      "edgeWidth": 0.016,
      "dotSize": 2,
      "noiseIntensity": 0,
      "metallic": 0.32,
      "glossiness": 0
    }
  },
  {
    "id": "recovered_metallic_3d_fluid_shadows_3",
    "name": "Metallic 3D Fluid Shadows 3",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from timeline-only shader timeline-ba116dd2-6d26-4f67-a314-f615410053b4 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Metallic 3D Fluid Shadows\nuniform float patternScale; // @min 5.0 @max 50.0 @default 25.0\nuniform float speed; // @min 0.0 @max 2.0 @default 0.4\nuniform float colorIntensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float bgThreshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float edgeWidth; // @min -0.8 @max 0.8 @default 0.0\nuniform float dotSize; // @min 2.0 @max 30.0 @default 6.0\nuniform float noiseIntensity; // @min 0.0 @max 2.0 @default 0.6\nuniform float metallic; // @min 0.0 @max 2.0 @default 1.2\nuniform float glossiness; // @min 0.0 @max 1.0 @default 0.8\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Strict threshold to isolate the statue and keep the background pure black\n    float statueMask = smoothstep(bgThreshold, bgThreshold + 0.02, lum) * source.a;\n    \n    // Base coordinates for warping\n    vec2 p = uv * patternScale;\n    p *= (0.8 + 0.4 * lum);\n    \n    // Create a second set of coordinates for the opposite-oriented dots\n    vec2 p_inv = p;\n    \n    // Slowly rotate the colored pattern in random directions\n    float rotAngle = time * 0.1 + node_noise(vec2(time * 0.05, 0.0)) * 4.0;\n    mat2 rot = mat2(cos(rotAngle), -sin(rotAngle), sin(rotAngle), cos(rotAngle));\n    p = rot * p;\n    \n    // Iterative warping to create labyrinthine/coral Turing patterns\n    for(int i = 0; i < 6; i++) {\n        float t = time * speed;\n        \n        // Forward warp for the main colored pattern\n        p = vec2(\n            p.x + 0.65 * sin(p.y * 1.3 + t),\n            p.y + 0.65 * cos(p.x * 1.3 - t * 0.8)\n        );\n        \n        // Inverse warp for the dot noise (orienting it the opposite way)\n        p_inv = vec2(\n            p_inv.x - 0.65 * sin(p_inv.y * 1.3 + t),\n            p_inv.y - 0.65 * cos(p_inv.x * 1.3 - t * 0.8)\n        );\n    }\n    \n    // Calculate pattern value and its analytical derivatives for bump mapping\n    float val = sin(p.x) * cos(p.y);\n    float dx = cos(p.x) * cos(p.y);\n    float dy = -sin(p.x) * sin(p.y);\n    \n    float pattern = smoothstep(edgeWidth - 0.1, edgeWidth + 0.1, val);\n    \n    // Generate shifting psychedelic colors based on the pattern, time, and position\n    vec3 psychColor = vec3(\n        0.5 + 0.5 * sin(pattern * 3.14 + time * 1.5 + uv.x * 5.0),\n        0.5 + 0.5 * sin(pattern * 3.14 + time * 1.8 + uv.y * 5.0 + 2.0),\n        0.5 + 0.5 * sin(pattern * 3.14 + time * 1.2 + (uv.x + uv.y) * 5.0 + 4.0)\n    );\n    \n    // Create dark, intensive noise made of a pixel-based grid of dots using inversely warped coordinates\n    vec2 dotGridUv = (p_inv / patternScale) * (resolution.xy / dotSize);\n    vec2 dotGrid = fract(dotGridUv) - 0.5;\n    float dots = 1.0 - smoothstep(0.2, 0.35, length(dotGrid));\n    \n    // Add randomness to the dots (removed time from seed to prevent flashing/strobing)\n    float randomIntensity = node_rand(floor(dotGridUv));\n    dots *= 0.3 + 0.7 * randomIntensity;\n    \n    vec3 darkDotNoiseEffect = source.rgb * dots * noiseIntensity;\n    \n    // Base color mix\n    vec3 baseColor = mix(darkDotNoiseEffect, source.rgb * psychColor * 2.5, pattern * colorIntensity);\n    \n    // --- Metallic & Glossy Lighting Calculation ---\n    vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));\n    vec3 viewDir = vec3(0.0, 0.0, 1.0);\n    vec3 halfVector = normalize(lightDir + viewDir);\n    \n    // Create a pseudo-normal from the pattern derivatives\n    vec3 normal = normalize(vec3(dx, dy, 1.5 - min(metallic, 1.4)));\n    \n    // Self-shadowing based on pattern height differences towards the light source\n    vec2 lightOffset = lightDir.xy * 0.8;\n    float shadowVal = sin(p.x + lightOffset.x) * cos(p.y + lightOffset.y);\n    float shadow = smoothstep(-0.3, 0.7, val - shadowVal + 0.4);\n    \n    // Diffuse shading with shadow applied\n    float diffuse = max(dot(normal, lightDir), 0.0) * shadow;\n    \n    // Specular highlight (Glossiness) with shadow applied\n    float specPower = mix(5.0, 100.0, glossiness);\n    float specular = pow(max(dot(normal, halfVector), 0.0), specPower) * metallic * 1.5 * shadow;\n    \n    // Fake environment reflection\n    float envRefl = node_noise(normal.xy * 4.0 + time * 0.2);\n    vec3 reflection = vec3(envRefl) * metallic * 0.4;\n    \n    // Combine lighting with base color\n    vec3 statueEffect = baseColor * (0.2 + 0.8 * diffuse) + specular + (reflection * baseColor);\n    \n    // Blend the statue effect over a pure black background using the strict mask\n    vec3 finalColor = mix(vec3(0.0), statueEffect, statueMask);\n    \n    // Output final color, preserving original alpha for transparency\n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "patternScale": 13.55,
      "speed": 0,
      "colorIntensity": 0.45,
      "bgThreshold": 0.045,
      "edgeWidth": 0.656,
      "dotSize": 30,
      "noiseIntensity": 1.34,
      "metallic": 1.92,
      "glossiness": 0.72
    }
  },
  {
    "id": "recovered_metallic_3d_fluid_shadows_4",
    "name": "Metallic 3D Fluid Shadows 4",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from timeline-only shader timeline-74dc73b9-e19d-4434-b259-0f5c9531b3d1 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Metallic 3D Fluid Shadows\nuniform float patternScale; // @min 5.0 @max 50.0 @default 25.0\nuniform float speed; // @min 0.0 @max 2.0 @default 0.4\nuniform float colorIntensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float bgThreshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float edgeWidth; // @min -0.8 @max 0.8 @default 0.0\nuniform float dotSize; // @min 2.0 @max 30.0 @default 6.0\nuniform float noiseIntensity; // @min 0.0 @max 2.0 @default 0.6\nuniform float metallic; // @min 0.0 @max 2.0 @default 1.2\nuniform float glossiness; // @min 0.0 @max 1.0 @default 0.8\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Strict threshold to isolate the statue and keep the background pure black\n    float statueMask = smoothstep(bgThreshold, bgThreshold + 0.02, lum) * source.a;\n    \n    // Base coordinates for warping\n    vec2 p = uv * patternScale;\n    p *= (0.8 + 0.4 * lum);\n    \n    // Create a second set of coordinates for the opposite-oriented dots\n    vec2 p_inv = p;\n    \n    // Slowly rotate the colored pattern in random directions\n    float rotAngle = time * 0.1 + node_noise(vec2(time * 0.05, 0.0)) * 4.0;\n    mat2 rot = mat2(cos(rotAngle), -sin(rotAngle), sin(rotAngle), cos(rotAngle));\n    p = rot * p;\n    \n    // Iterative warping to create labyrinthine/coral Turing patterns\n    for(int i = 0; i < 6; i++) {\n        float t = time * speed;\n        \n        // Forward warp for the main colored pattern\n        p = vec2(\n            p.x + 0.65 * sin(p.y * 1.3 + t),\n            p.y + 0.65 * cos(p.x * 1.3 - t * 0.8)\n        );\n        \n        // Inverse warp for the dot noise (orienting it the opposite way)\n        p_inv = vec2(\n            p_inv.x - 0.65 * sin(p_inv.y * 1.3 + t),\n            p_inv.y - 0.65 * cos(p_inv.x * 1.3 - t * 0.8)\n        );\n    }\n    \n    // Calculate pattern value and its analytical derivatives for bump mapping\n    float val = sin(p.x) * cos(p.y);\n    float dx = cos(p.x) * cos(p.y);\n    float dy = -sin(p.x) * sin(p.y);\n    \n    float pattern = smoothstep(edgeWidth - 0.1, edgeWidth + 0.1, val);\n    \n    // Generate shifting psychedelic colors based on the pattern, time, and position\n    vec3 psychColor = vec3(\n        0.5 + 0.5 * sin(pattern * 3.14 + time * 1.5 + uv.x * 5.0),\n        0.5 + 0.5 * sin(pattern * 3.14 + time * 1.8 + uv.y * 5.0 + 2.0),\n        0.5 + 0.5 * sin(pattern * 3.14 + time * 1.2 + (uv.x + uv.y) * 5.0 + 4.0)\n    );\n    \n    // Create dark, intensive noise made of a pixel-based grid of dots using inversely warped coordinates\n    vec2 dotGridUv = (p_inv / patternScale) * (resolution.xy / dotSize);\n    vec2 dotGrid = fract(dotGridUv) - 0.5;\n    float dots = 1.0 - smoothstep(0.2, 0.35, length(dotGrid));\n    \n    // Add randomness to the dots (removed time from seed to prevent flashing/strobing)\n    float randomIntensity = node_rand(floor(dotGridUv));\n    dots *= 0.3 + 0.7 * randomIntensity;\n    \n    vec3 darkDotNoiseEffect = source.rgb * dots * noiseIntensity;\n    \n    // Base color mix\n    vec3 baseColor = mix(darkDotNoiseEffect, source.rgb * psychColor * 2.5, pattern * colorIntensity);\n    \n    // --- Metallic & Glossy Lighting Calculation ---\n    vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));\n    vec3 viewDir = vec3(0.0, 0.0, 1.0);\n    vec3 halfVector = normalize(lightDir + viewDir);\n    \n    // Create a pseudo-normal from the pattern derivatives\n    vec3 normal = normalize(vec3(dx, dy, 1.5 - min(metallic, 1.4)));\n    \n    // Self-shadowing based on pattern height differences towards the light source\n    vec2 lightOffset = lightDir.xy * 0.8;\n    float shadowVal = sin(p.x + lightOffset.x) * cos(p.y + lightOffset.y);\n    float shadow = smoothstep(-0.3, 0.7, val - shadowVal + 0.4);\n    \n    // Diffuse shading with shadow applied\n    float diffuse = max(dot(normal, lightDir), 0.0) * shadow;\n    \n    // Specular highlight (Glossiness) with shadow applied\n    float specPower = mix(5.0, 100.0, glossiness);\n    float specular = pow(max(dot(normal, halfVector), 0.0), specPower) * metallic * 1.5 * shadow;\n    \n    // Fake environment reflection\n    float envRefl = node_noise(normal.xy * 4.0 + time * 0.2);\n    vec3 reflection = vec3(envRefl) * metallic * 0.4;\n    \n    // Combine lighting with base color\n    vec3 statueEffect = baseColor * (0.2 + 0.8 * diffuse) + specular + (reflection * baseColor);\n    \n    // Blend the statue effect over a pure black background using the strict mask\n    vec3 finalColor = mix(vec3(0.0), statueEffect, statueMask);\n    \n    // Output final color, preserving original alpha for transparency\n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "patternScale": 5,
      "speed": 0.3,
      "colorIntensity": 0.29,
      "bgThreshold": 0.02,
      "edgeWidth": 0.368,
      "dotSize": 30,
      "noiseIntensity": 0.96,
      "metallic": 0,
      "glossiness": 1
    }
  },
  {
    "id": "recovered_timeline_49dd647c_7725_42f2_9c19_ac56bc12924f",
    "name": "Horizontal Symmetrical Hexagon",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-49dd647c-7725-42f2-9c19-ac56bc12924f in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Horizontal Symmetrical Hexagon\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\nuniform float intensity; // @min 0.0 @max 1.5 @default 0.5\nuniform float scale; // @min 0.1 @max 5.0 @default 0.3\nuniform float effectAmount; // @min 0.0 @max 1.0 @default 1.0\nuniform float blackLineScale; // @min 0.01 @max 1.0 @default 0.15\nuniform float blackLineThickness; // @min 0.01 @max 2.0 @default 0.1\nuniform float blackLineSpeed; // @min -5.0 @max 5.0 @default -1.0\nuniform float blackLineBlur; // @min 0.0 @max 2.0 @default 0.5\n\n#define R3 1.732051\n\nvec4 HexCoords(vec2 uv) {\n    vec2 s = vec2(1.0, R3);\n    vec2 h = 0.5 * s;\n    vec2 gv = s * uv;\n    vec2 a = mod(gv, s) - h;\n    vec2 b = mod(gv + h, s) - h;\n    vec2 ab = dot(a, a) < dot(b, b) ? a : b;\n    return vec4(ab, gv - ab);\n}\n\nfloat GetSize(vec2 id, float seed, float time) {\n    float d = length(id);\n    float t = time * 0.5;\n    return (sin(d * seed + t) + sin(d * seed * seed * 10.0 + t * 2.0)) / 2.0 + 0.5;\n}\n\nmat2 Rot(float a) {\n    float s = sin(a), c = cos(a);\n    return mat2(c, -s, s, c);\n}\n\nfloat Hexagon(vec2 uv, float r, float time, float thickness, float blur) {\n    uv *= Rot(mix(0.0, 3.1415, r));\n    r /= 0.7071;\n    uv = vec2(-uv.y, uv.x);\n    uv.x *= R3;\n    uv = abs(uv);\n    float d = dot(uv, normalize(vec2(1.0, 1.0))) - r;\n    d = max(d, uv.y - r * 0.707);\n    \n    float edge = smoothstep(0.06 * thickness + blur, 0.02 * thickness, abs(d));\n    float glow = smoothstep(0.25 * thickness + blur, 0.0, abs(d)) * 2.5;\n    \n    return edge + glow + smoothstep(0.1 * thickness + blur, 0.09 * thickness, abs(r - 0.5)) * sin(time);\n}\n\nfloat Layer(vec2 uv, float s, float time, float thickness, float blur) {\n    vec4 hu = HexCoords(uv * 2.0);\n    float d = Hexagon(hu.xy, GetSize(hu.zw, s, time), time, thickness, blur);\n    vec2 offs = vec2(1.0, 0.0);\n    d += Hexagon(hu.xy - offs, GetSize(hu.zw + offs, s, time), time, thickness, blur);\n    d += Hexagon(hu.xy + offs, GetSize(hu.zw - offs, s, time), time, thickness, blur);\n    offs = vec2(0.5, 0.8725);\n    d += Hexagon(hu.xy - offs, GetSize(hu.zw + offs, s, time), time, thickness, blur);\n    d += Hexagon(hu.xy + offs, GetSize(hu.zw - offs, s, time), time, thickness, blur);\n    offs = vec2(-0.5, 0.8725);\n    d += Hexagon(hu.xy - offs, GetSize(hu.zw + offs, s, time), time, thickness, blur);\n    d += Hexagon(hu.xy + offs, GetSize(hu.zw - offs, s, time), time, thickness, blur);\n    return d;\n}\n\nfloat N(float p) {\n    return fract(sin(p * 123.34) * 345.456);\n}\n\nvec3 Col(float p, float offs) {\n    float n = N(p) * 1234.34;\n    return sin(n * vec3(12.23, 45.23, 56.2) + offs * 3.0) * 0.5 + 0.5;\n}\n\nvec3 GetAnimColor(vec2 UV, float time, float duv, float thickness, float blur, float timeMult) {\n    float t = time * speed * timeMult * 0.5 + 5.0;\n    vec2 p_uv = UV * mix(1.0, 5.0, sin(t * 0.5) * 0.5 + 0.5) * scale;\n    p_uv *= Rot(t);\n    p_uv.x *= R3;\n    \n    vec3 col = vec3(0.0);\n    for(float i = 0.0; i < 1.0; i += 0.3333) {\n        float id = floor(i + t);\n        float ft = fract(i + t);\n        float z = mix(5.0, 0.1, ft);\n        float fade = smoothstep(0.0, 0.3, ft) * smoothstep(1.0, 0.7, ft);\n        col += fade * ft * Layer(p_uv * z, N(i + id), time, thickness, blur) * Col(id, duv);\n    }\n    return col;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    vec2 UV = uv - 0.5;\n    UV.x *= resolution.x / resolution.y;\n    float duv = dot(UV, UV);\n    \n    // Make the effect symmetrical only horizontally\n    UV.x = abs(UV.x);\n    \n    vec3 col1 = GetAnimColor(UV, time, duv, 1.0, 0.0, 1.0);\n    vec3 illuminatedColor = source.rgb * col1 * 2.0 * intensity;\n    float illumFactor = clamp(length(col1 * intensity), 0.0, 1.0);\n    \n    vec3 invertedSource = 1.0 - source.rgb;\n    float brightness = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    invertedSource *= smoothstep(0.05, 0.2, brightness);\n    \n    vec3 effectColor = mix(invertedSource, illuminatedColor, illumFactor);\n    vec3 finalColor = mix(source.rgb, effectColor, effectAmount);\n    \n    float whiteness = min(finalColor.r, min(finalColor.g, finalColor.b));\n    float mask = smoothstep(0.8, 1.0, whiteness);\n    \n    if (mask > 0.0) {\n        vec3 col2 = GetAnimColor(UV, time, duv, 1.0, 0.0, -1.0);\n        vec3 reverseIlluminated = source.rgb * col2 * 2.0 * intensity;\n        finalColor = mix(finalColor, reverseIlluminated, mask);\n    }\n    \n    vec3 col3 = GetAnimColor(UV * blackLineScale, time, duv, blackLineThickness, blackLineBlur, blackLineSpeed);\n    float blackMask = smoothstep(0.2, 0.8, length(col3));\n    finalColor = mix(finalColor, vec3(0.0), blackMask * effectAmount * 0.85);\n    \n    return vec4(clamp(finalColor, 0.0, 1.0), source.a);\n}",
    "uniformValues": {
      "speed": 3.15,
      "intensity": 0.855,
      "scale": 0.1,
      "effectAmount": 1,
      "blackLineScale": 0.6832,
      "blackLineThickness": 0.1493,
      "blackLineSpeed": -0.1,
      "blackLineBlur": 1.98
    }
  },
  {
    "id": "recovered_timeline_0aa3d150_0f06_48dc_99a4_4ea4c7da8067",
    "name": "Psych Wave Halo",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-0aa3d150-0f06-48dc-99a4-4ea4c7da8067 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psych Wave Halo\nuniform float intensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float waveSpacing; // @min 10.0 @max 150.0 @default 60.0\nuniform float waveSpeed; // @min 0.0 @max 100.0 @default 30.0\nuniform float invertThreshold; // @min 0.0 @max 1.0 @default 0.8\nuniform float verticalWave; // @min 0.0 @max 1.0 @default 0.0\nuniform float darkThreshold; // @min 0.0 @max 1.0 @default 0.05\n\nvec3 palette(float i) {\n    // High-frequency, clashing neon palette\n    return 0.5 + 0.5 * cos(6.28318 * (vec3(3.0, 2.0, 5.0) * i + vec3(0.0, 0.33, 0.67)));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    // Sample original unwarped pixel\n    vec4 origSource = texture2D(tex, uv);\n    float origMax = max(max(origSource.r, origSource.g), origSource.b);\n    float origMin = min(min(origSource.r, origSource.g), origSource.b);\n    float origChroma = origMax - origMin;\n    float origHue = 0.0;\n    \n    if (origChroma > 0.0) {\n        if (origMax == origSource.r) origHue = (origSource.g - origSource.b) / origChroma;\n        else if (origMax == origSource.g) origHue = 2.0 + (origSource.b - origSource.r) / origChroma;\n        else origHue = 4.0 + (origSource.r - origSource.g) / origChroma;\n        origHue *= 60.0;\n        if (origHue < 0.0) origHue += 360.0;\n    }\n    \n    bool isBlueOrViolet = origChroma > 0.05 && origHue >= 200.0 && origHue <= 330.0;\n    \n    // Reverse time for excluded colors to make the wave go in the opposite direction\n    float localTime = isBlueOrViolet ? -time : time;\n    \n    // Calculate wave coordinates\n    vec2 centerUv = uv - 0.5;\n    vec2 aspectUv = centerUv * vec2(resolution.x / resolution.y, 1.0);\n    float dist = length(aspectUv);\n    \n    // Blend between radial and vertical wave based on parameter\n    float waveDist = mix(dist, aspectUv.y, verticalWave);\n    float phase = waveDist * waveSpacing - localTime * waveSpeed;\n    float wave = sin(phase);\n    \n    vec2 warpDir = mix(centerUv, vec2(0.0, 1.0), verticalWave);\n    vec2 warp = uv + warpDir * wave * 0.04 * intensity;\n    \n    vec4 source = texture2D(tex, warp);\n    \n    // Psychedelic fractal generation\n    vec2 uv_c = centerUv * 2.0;\n    uv_c.x *= resolution.x / resolution.y;\n    \n    // Erratic space folding\n    for(int i = 0; i < 5; i++) {\n        uv_c = abs(uv_c) - 0.4;\n        float a = localTime * 3.0 + length(uv_c) * 8.0;\n        mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));\n        uv_c *= rot;\n        uv_c *= 1.6;\n    }\n    \n    // Intense color banding and feedback look\n    vec3 psychColor = palette(length(uv_c) - localTime * 5.0);\n    psychColor = fract(psychColor * 2.5); \n    \n    // Add chromatic aberration flash\n    float flash = abs(sin(localTime * 10.0));\n    psychColor += vec3(flash, 0.0, 1.0 - flash) * step(0.95, fract(uv_c.x * 10.0));\n    \n    vec4 finalColor = mix(source, vec4(psychColor, 1.0), intensity);\n    \n    // Invert color of random pixels in odd waves\n    float waveIndex = floor(phase / 3.14159);\n    if (mod(waveIndex, 2.0) != 0.0 && node_rand(uv + localTime) > invertThreshold) {\n        finalColor.rgb = 1.0 - finalColor.rgb;\n    }\n    \n    // Keep dark pixels strictly unaffected based on the darkThreshold slider\n    float blackMask = smoothstep(max(0.0, darkThreshold - 0.05), darkThreshold + 0.001, origMax);\n    \n    return mix(origSource, finalColor, blackMask);\n}",
    "uniformValues": {
      "intensity": 0.03,
      "waveSpacing": 38,
      "waveSpeed": 4,
      "invertThreshold": 0,
      "verticalWave": 1,
      "darkThreshold": 0.49
    }
  },
  {
    "id": "recovered_timeline_43e55825_075d_4d13_9ab7_2a69a573d204",
    "name": "3D Contrasted Radial Strobe Edge",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-43e55825-075d-4d13-9ab7-2a69a573d204 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Contrasted Radial Strobe Edge\nuniform float speed; // @min 0.0 @max 5.0 @default 1.5\nuniform float warp; // @min 0.0 @max 0.2 @default 0.05\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.85\nuniform float trippy; // @min 0.0 @max 5.0 @default 2.0\nuniform float radialSpeed; // @min 0.0 @max 10.0 @default 4.0\nuniform float radialDensity; // @min 1.0 @max 50.0 @default 15.0\nuniform float strobeSpeed; // @min 0.0 @max 100.0 @default 40.0\n\n#define TAU 6.28318530718\n\nfloat luma(vec3 c) {\n    return dot(c, vec3(0.2126, 0.7152, 0.0722));\n}\n\nvec3 palette(float t) {\n    vec3 a = vec3(0.5);\n    vec3 b = vec3(0.5);\n    vec3 c = vec3(1.0, 1.2, 1.5) * trippy;\n    vec3 d = vec3(0.00, 0.33, 0.67);\n    return a + b * cos(TAU * (c * t + d));\n}\n\nfloat inkAt(sampler2D tex, vec2 uv) {\n    uv = clamp(uv, 0.0, 1.0);\n    float lum = luma(texture2D(tex, uv).rgb);\n    return 1.0 - smoothstep(threshold - 0.15, threshold + 0.15, lum);\n}\n\nfloat blurInk(sampler2D tex, vec2 uv, vec2 px, float radiusPx) {\n    vec2 r = px * radiusPx;\n    float s = inkAt(tex, uv + vec2(1.0, 0.0)*r) + inkAt(tex, uv + vec2(-1.0, 0.0)*r) +\n              inkAt(tex, uv + vec2(0.0, 1.0)*r) + inkAt(tex, uv + vec2(0.0, -1.0)*r);\n    return s * 0.25;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 origColor = texture2D(tex, uv);\n    float origLum = luma(origColor.rgb);\n    \n    vec2 px = 1.0 / resolution.xy;\n    float t = time * speed * 0.62;\n    \n    float symX = abs(uv.x - 0.5);\n    float signX = sign(uv.x - 0.5);\n    vec2 warpedUv = uv + vec2(sin(uv.y * 15.0 + t * 3.0) * signX, cos(symX * 30.0 - t * 2.5)) * warp;\n    \n    vec2 p = warpedUv - 0.5;\n    p.x *= resolution.x / resolution.y;\n\n    float r = length(p);\n    float a = atan(p.y, p.x);\n\n    float ink = inkAt(tex, warpedUv);\n    float inkNear = blurInk(tex, warpedUv, px, 3.0);\n    float inkFar  = blurInk(tex, warpedUv, px, 9.0);\n\n    float halo = clamp(inkFar - ink * 0.5, 0.0, 1.0);\n    float filigree = clamp((inkNear - ink) * 2.0, 0.0, 1.0);\n\n    vec2 drift = vec2(sin(9.0 * p.y + t * 2.7), cos(11.0 * p.x - t * 2.5));\n    vec2 q = p + drift * 0.2;\n    float rq = length(q);\n    float aq = atan(q.y, q.x);\n\n    float field = 0.5 + 0.5 * sin(20.0 * aq - 12.0 * rq - t * 5.2);\n    float auraWave = 0.5 + 0.5 * sin(40.0 * r - 20.0 * a - t * 8.0);\n    \n    vec3 psyA = palette(t * 0.2 + field * 1.5 + auraWave * 0.5);\n    vec3 psyB = palette(t * 0.3 - field * 1.2 + sin(8.0 * a - t * 2.0));\n    vec3 psyC = palette(rq * 5.0 - t * 0.5 + aq * 2.0);\n\n    vec3 sourceColor = texture2D(tex, warpedUv).rgb;\n    vec3 color = sourceColor * mix(vec3(1.0), psyC * 2.0, 0.5 + 0.5 * sin(t + r * 10.0));\n\n    color += psyA * (0.3 + 0.7 * field) * (1.0 - ink);\n    color += psyB * pow(halo, 0.9) * (0.8 + 1.2 * auraWave);\n    color += psyC * pow(filigree, 1.1) * 1.5;\n\n    color *= 1.0 - ink;\n\n    float perfectR = length((uv - 0.5) * vec2(resolution.x / resolution.y, 1.0));\n    float radialWave = pow(sin(perfectR * radialDensity + time * radialSpeed) * 0.5 + 0.5, 2.0);\n    float strobe = step(0.5, sin(time * strobeSpeed));\n    \n    color += radialWave * strobe * psyA * origLum;\n\n    return vec4(clamp(color, 0.0, 1.0), origColor.a);\n}",
    "uniformValues": {
      "speed": 4.65,
      "warp": 0.012,
      "threshold": 0.73,
      "trippy": 1.95,
      "radialSpeed": 7.6,
      "radialDensity": 46.08,
      "strobeSpeed": 78
    }
  },
  {
    "id": "recovered_timeline_f21913b3_4831_4324_926a_76d3cc56aa77",
    "name": "Rounded Pixel Swirl",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-f21913b3-4831-4324-926a-76d3cc56aa77 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Rounded Pixel Swirl\n\nuniform float colorShift; // @min 0.0 @max 10.0 @default 3.0\nuniform float intensity; // @min 0.0 @max 1.0 @default 0.9\nuniform float blur; // @min 0.0 @max 1.0 @default 0.5\nuniform float pixelSize; // @min 1.0 @max 50.0 @default 15.0\nuniform float roundness; // @min 0.0 @max 1.0 @default 0.4\nuniform float spacing; // @min 0.0 @max 0.5 @default 0.1\n\nvec3 palette(float t){\n    return vec3(0.84, 0.49, 0.85) + vec3(0.52, 0.56, 0.88) * cos(6.28318 * (vec3(0.18, 0.40, 0.07) * t + vec3(0.28, 0.68, 0.30)));\n}\n\nvec2 swirl(vec2 p, float strength, float freq, float speed, float time) {\n    float r = length(p);\n    float a = atan(p.y, p.x);\n    float w = sin(speed * time + freq * r);\n    a += strength * r * w + strength * r * sin(speed * time + freq * r + 3.0 * a);\n    return (r + 0.06 * w) * vec2(cos(a), sin(a));\n}\n\nvec3 makeFlower(vec2 p, float level, float time, float b) {\n    float r = length(p);\n    vec2 cuv = vec2(atan(p.y, p.x) / 6.28318 + 0.5, r / 0.8);\n    float m = smoothstep(0.8 + b, 0.8 - b, r);\n    float stripe = 0.05 / (pow(0.5 + 0.5 * sin(6.28318 * (cuv.x * 8.0 + time)), 2.0) + b * 0.5 + 0.05);\n    return vec3(stripe) * palette(cuv.y * sin(time * 0.25) * 3.0 + level) * smoothstep(1.0, 0.4 - b * 0.2, cuv.y) * smoothstep(0.0, 0.4 + b * 0.2, cuv.y) * m;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 grid = resolution / max(1.0, pixelSize);\n    vec2 puv = (floor(uv * grid) + 0.5) / grid;\n    vec2 local = (fract(uv * grid) - 0.5) * 2.0;\n    \n    // Rounded corner mask logic\n    float r_limit = 1.0 - spacing;\n    vec2 d = abs(local) - (r_limit - roundness);\n    float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);\n    float mask = smoothstep(roundness, roundness - 0.05, dist);\n    \n    vec4 source = texture2D(tex, puv);\n    vec2 p = (puv * 2.0 - 1.0);\n    p.x *= resolution.x / resolution.y;\n    \n    float t_r = time + source.r * colorShift;\n    float t_g = time + source.g * colorShift;\n    float t_b = time + source.b * colorShift;\n    \n    p = swirl(p * (sin(time * 0.25) + 1.15), 0.15, 0.15, 0.1 + source.b * 0.3, t_r);\n    vec3 finalCol = makeFlower(p, 4.0 + source.g * colorShift, t_g, blur);\n    \n    p /= 8.0;\n    float r_len = length(mat2(1.0, 0.3, -0.2, 1.0) * p);\n    for (int i = 0; i < 2; i++) {\n        float fi = float(i);\n        vec2 p_loop = abs(fract(p * 2.0) - 0.5) * 2.0;\n        finalCol += makeFlower(p_loop * exp(-r_len), fi + source.r * colorShift, t_b, blur) / (fi + 0.5);\n    }\n    \n    vec3 blended = mix(source.rgb, finalCol, intensity * smoothstep(0.05, 0.4, dot(source.rgb, vec3(0.299, 0.587, 0.114))));\n    return vec4(blended * mask, source.a * mask);\n}",
    "uniformValues": {
      "colorShift": 6.7,
      "intensity": 0.61,
      "blur": 0.11,
      "pixelSize": 14.72,
      "roundness": 0.22,
      "spacing": 0.08
    }
  },
  {
    "id": "recovered_timeline_9f5c563a_82c0_4e68_9964_08e154a6fb6e",
    "name": "Rounded Pixel Swirl 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-9f5c563a-82c0-4e68-9964-08e154a6fb6e in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Rounded Pixel Swirl\n\nuniform float colorShift; // @min 0.0 @max 10.0 @default 3.0\nuniform float intensity; // @min 0.0 @max 1.0 @default 0.9\nuniform float blur; // @min 0.0 @max 1.0 @default 0.5\nuniform float pixelSize; // @min 1.0 @max 50.0 @default 15.0\nuniform float roundness; // @min 0.0 @max 1.0 @default 0.4\nuniform float spacing; // @min 0.0 @max 0.5 @default 0.1\n\nvec3 palette(float t){\n    return vec3(0.84, 0.49, 0.85) + vec3(0.52, 0.56, 0.88) * cos(6.28318 * (vec3(0.18, 0.40, 0.07) * t + vec3(0.28, 0.68, 0.30)));\n}\n\nvec2 swirl(vec2 p, float strength, float freq, float speed, float time) {\n    float r = length(p);\n    float a = atan(p.y, p.x);\n    float w = sin(speed * time + freq * r);\n    a += strength * r * w + strength * r * sin(speed * time + freq * r + 3.0 * a);\n    return (r + 0.06 * w) * vec2(cos(a), sin(a));\n}\n\nvec3 makeFlower(vec2 p, float level, float time, float b) {\n    float r = length(p);\n    vec2 cuv = vec2(atan(p.y, p.x) / 6.28318 + 0.5, r / 0.8);\n    float m = smoothstep(0.8 + b, 0.8 - b, r);\n    float stripe = 0.05 / (pow(0.5 + 0.5 * sin(6.28318 * (cuv.x * 8.0 + time)), 2.0) + b * 0.5 + 0.05);\n    return vec3(stripe) * palette(cuv.y * sin(time * 0.25) * 3.0 + level) * smoothstep(1.0, 0.4 - b * 0.2, cuv.y) * smoothstep(0.0, 0.4 + b * 0.2, cuv.y) * m;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 grid = resolution / max(1.0, pixelSize);\n    vec2 puv = (floor(uv * grid) + 0.5) / grid;\n    vec2 local = (fract(uv * grid) - 0.5) * 2.0;\n    \n    // Rounded corner mask logic\n    float r_limit = 1.0 - spacing;\n    vec2 d = abs(local) - (r_limit - roundness);\n    float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);\n    float mask = smoothstep(roundness, roundness - 0.05, dist);\n    \n    vec4 source = texture2D(tex, puv);\n    vec2 p = (puv * 2.0 - 1.0);\n    p.x *= resolution.x / resolution.y;\n    \n    float t_r = time + source.r * colorShift;\n    float t_g = time + source.g * colorShift;\n    float t_b = time + source.b * colorShift;\n    \n    p = swirl(p * (sin(time * 0.25) + 1.15), 0.15, 0.15, 0.1 + source.b * 0.3, t_r);\n    vec3 finalCol = makeFlower(p, 4.0 + source.g * colorShift, t_g, blur);\n    \n    p /= 8.0;\n    float r_len = length(mat2(1.0, 0.3, -0.2, 1.0) * p);\n    for (int i = 0; i < 2; i++) {\n        float fi = float(i);\n        vec2 p_loop = abs(fract(p * 2.0) - 0.5) * 2.0;\n        finalCol += makeFlower(p_loop * exp(-r_len), fi + source.r * colorShift, t_b, blur) / (fi + 0.5);\n    }\n    \n    vec3 blended = mix(source.rgb, finalCol, intensity * smoothstep(0.05, 0.4, dot(source.rgb, vec3(0.299, 0.587, 0.114))));\n    return vec4(blended * mask, source.a * mask);\n}",
    "uniformValues": {
      "colorShift": 0.7,
      "intensity": 0.73,
      "blur": 0.04,
      "pixelSize": 11.78,
      "roundness": 0.22,
      "spacing": 0.08
    }
  },
  {
    "id": "recovered_timeline_b64db472_5476_4824_80c6_8a6aaf12b775",
    "name": "Rounded Pixel Swirl 3",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-b64db472-5476-4824-80c6-8a6aaf12b775 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Rounded Pixel Swirl\n\nuniform float colorShift; // @min 0.0 @max 10.0 @default 3.0\nuniform float intensity; // @min 0.0 @max 1.0 @default 0.9\nuniform float blur; // @min 0.0 @max 1.0 @default 0.5\nuniform float pixelSize; // @min 1.0 @max 50.0 @default 15.0\nuniform float roundness; // @min 0.0 @max 1.0 @default 0.4\nuniform float spacing; // @min 0.0 @max 0.5 @default 0.1\nuniform float darkThreshold; // @min 0.0 @max 1.0 @default 0.05\n\nvec3 palette(float t){\n    return vec3(0.84, 0.49, 0.85) + vec3(0.52, 0.56, 0.88) * cos(6.28318 * (vec3(0.18, 0.40, 0.07) * t + vec3(0.28, 0.68, 0.30)));\n}\n\nvec2 swirl(vec2 p, float strength, float freq, float speed, float time) {\n    float r = length(p);\n    float a = atan(p.y, p.x);\n    float w = sin(speed * time + freq * r);\n    a += strength * r * w + strength * r * sin(speed * time + freq * r + 3.0 * a);\n    return (r + 0.06 * w) * vec2(cos(a), sin(a));\n}\n\nvec3 makeFlower(vec2 p, float level, float time, float b) {\n    float r = length(p);\n    vec2 cuv = vec2(atan(p.y, p.x) / 6.28318 + 0.5, r / 0.8);\n    float m = smoothstep(0.8 + b, 0.8 - b, r);\n    float stripe = 0.05 / (pow(0.5 + 0.5 * sin(6.28318 * (cuv.x * 8.0 + time)), 2.0) + b * 0.5 + 0.05);\n    return vec3(stripe) * palette(cuv.y * sin(time * 0.25) * 3.0 + level) * smoothstep(1.0, 0.4 - b * 0.2, cuv.y) * smoothstep(0.0, 0.4 + b * 0.2, cuv.y) * m;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 grid = resolution / max(1.0, pixelSize);\n    vec2 puv = (floor(uv * grid) + 0.5) / grid;\n    vec2 local = (fract(uv * grid) - 0.5) * 2.0;\n    \n    // Rounded corner mask logic\n    float r_limit = 1.0 - spacing;\n    vec2 d = abs(local) - (r_limit - roundness);\n    float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);\n    float mask = smoothstep(roundness, roundness - 0.05, dist);\n    \n    vec4 source = texture2D(tex, puv);\n    float brightness = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    float darkMask = smoothstep(darkThreshold - 0.01, darkThreshold + 0.01, brightness);\n    \n    vec2 p = (puv * 2.0 - 1.0);\n    p.x *= resolution.x / resolution.y;\n    \n    float t_r = time + source.r * colorShift;\n    float t_g = time + source.g * colorShift;\n    float t_b = time + source.b * colorShift;\n    \n    p = swirl(p * (sin(time * 0.25) + 1.15), 0.15, 0.15, 0.1 + source.b * 0.3, t_r);\n    vec3 finalCol = makeFlower(p, 4.0 + source.g * colorShift, t_g, blur);\n    \n    p /= 8.0;\n    float r_len = length(mat2(1.0, 0.3, -0.2, 1.0) * p);\n    for (int i = 0; i < 2; i++) {\n        float fi = float(i);\n        vec2 p_loop = abs(fract(p * 2.0) - 0.5) * 2.0;\n        finalCol += makeFlower(p_loop * exp(-r_len), fi + source.r * colorShift, t_b, blur) / (fi + 0.5);\n    }\n    \n    vec3 blended = mix(source.rgb, finalCol, intensity * smoothstep(0.05, 0.4, brightness));\n    return vec4(blended * mask * darkMask, source.a * mask * darkMask);\n}",
    "uniformValues": {
      "colorShift": 2.2,
      "intensity": 0.99,
      "blur": 0.05,
      "pixelSize": 10.31,
      "roundness": 1,
      "spacing": 0.06,
      "darkThreshold": 0.13
    }
  },
  {
    "id": "recovered_timeline_1067a459_168f_4b1b_8b52_6fd73a440d9a",
    "name": "Psychedelic Snakes with Blob",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-1067a459-168f-4b1b-8b52-6fd73a440d9a in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psychedelic Snakes with Blob\nuniform float linesCount; // @min 1.0 @max 50.0 @default 15.0\nuniform float snakeSpeed; // @min -10.0 @max 10.0 @default 5.0\nuniform float snakeTiling; // @min 1.0 @max 20.0 @default 3.0\nuniform float lineThickness; // @min 0.01 @max 0.5 @default 0.15\nuniform float zoneThreshold; // @min 0.0 @max 1.0 @default 0.8\nuniform float minZoneThreshold; // @min 0.0 @max 1.0 @default 0.2\nuniform float loopSpeed; // @min -5.0 @max 5.0 @default 1.0\nuniform float pixelSoftness; // @min 0.01 @max 3.0 @default 1.8\nuniform float colorSpeed; // @min 0.0 @max 10.0 @default 2.0\nuniform float psychedelicScale; // @min 1.0 @max 20.0 @default 5.0\nuniform bool showBackground; // @default true\nuniform float blobSize; // @min 0.1 @max 2.0 @default 0.6\nuniform float blobBlur; // @min 0.1 @max 2.0 @default 0.8\nuniform float darkThreshold; // @min 0.0 @max 1.0 @default 0.05\n\nfloat getMask(sampler2D tex, vec2 uv, vec2 res, float t, float lc, float lt, float ps, float zt, float st, float ss, float ls) {\n    vec3 lw = vec3(0.299, 0.587, 0.114);\n    float lum = dot(texture2D(tex, uv).rgb, lw);\n    vec2 eps = vec2(3.0) / res;\n    float lumX = dot(texture2D(tex, uv + vec2(eps.x, 0.0)).rgb, lw);\n    float lumY = dot(texture2D(tex, uv + vec2(0.0, eps.y)).rgb, lw);\n    vec2 grad = vec2(lumX - lum, lumY - lum);\n    float angle = atan(grad.y, grad.x + 0.0001);\n    \n    float iso = fract(lum * lc - t * ls);\n    float soft = lt * ps * 1.5;\n    float line = smoothstep(zt - soft, zt, iso) - smoothstep(zt, zt + soft, iso);\n    line *= smoothstep(0.001, 0.02, length(grad));\n    \n    float snake = sin(angle * st * 2.0 + t * ss);\n    return line * smoothstep(-1.2 * ps, 1.2, snake);\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    float currentZT = mix(minZoneThreshold, zoneThreshold, sin(time * loopSpeed) * 0.5 + 0.5);\n    \n    float m0 = getMask(tex, uv, resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\n    \n    vec2 eps = vec2(4.0) / resolution;\n    float mx = getMask(tex, uv + vec2(eps.x, 0.0), resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\n    float my = getMask(tex, uv + vec2(0.0, eps.y), resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\n    \n    vec3 n = normalize(vec3(m0 - mx, m0 - my, 0.25));\n    \n    vec3 lightDir = normalize(vec3(0.8, 0.8, 1.0));\n    float diff = max(dot(n, lightDir), 0.0);\n    float diffSoft = diff * 0.6 + 0.4; \n    \n    vec3 viewDir = vec3(0.0, 0.0, 1.0);\n    vec3 halfDir = normalize(lightDir + viewDir);\n    \n    float spec = pow(max(dot(n, halfDir), 0.0), 12.0) * m0 * 0.6;\n    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.5) * m0;\n    \n    vec3 darkGradient = vec3(0.02, 0.04, 0.08) * (1.5 - length(uv - 0.5) * 1.5);\n    vec3 bg = showBackground ? mix(source.rgb * 0.3, darkGradient, 0.5) : darkGradient;\n    \n    vec3 lw = vec3(0.299, 0.587, 0.114);\n    float lum = dot(source.rgb, lw);\n    vec2 epsGrad = vec2(3.0) / resolution;\n    float lumX = dot(texture2D(tex, uv + vec2(epsGrad.x, 0.0)).rgb, lw);\n    float lumY = dot(texture2D(tex, uv + vec2(0.0, epsGrad.y)).rgb, lw);\n    vec2 grad = vec2(lumX - lum, lumY - lum);\n    float angle = atan(grad.y, grad.x + 0.0001);\n    \n    float phase = angle * snakeTiling * 2.0 + time * snakeSpeed;\n    \n    float n1 = node_noise(uv * psychedelicScale + time);\n    float n2 = node_noise(uv * psychedelicScale * 2.0 - time * 0.5 + n1 * 3.0);\n    float r1 = node_rand(floor(uv * psychedelicScale * 5.0) + time * 0.1);\n    \n    vec3 trailColor = 0.5 + 0.5 * cos(phase * 0.5 - time * colorSpeed + n2 * 6.28 + vec3(0.0, 2.1, 4.2) + r1 * 1.5);\n    \n    vec3 finalColor = trailColor * diffSoft + spec + fresnel * vec3(0.8, 0.9, 1.0);\n    vec3 mixedColor = mix(bg, finalColor, m0);\n    \n    vec2 centered = uv - 0.5;\n    vec2 symUv = abs(centered);\n    float blobNoise = node_noise(symUv * 5.0 - time * 0.3);\n    float dist = length(centered) + blobNoise * 0.4;\n    float blobMask = smoothstep(blobSize, blobSize - blobBlur, dist);\n    \n    mixedColor = mix(mixedColor, vec3(0.0), blobMask);\n    \n    // Ensure dark pixels are not affected\n    float affectMask = smoothstep(max(0.0, darkThreshold - 0.05), darkThreshold + 0.05, lum);\n    mixedColor = mix(source.rgb, mixedColor, affectMask);\n    \n    return vec4(mixedColor, source.a);\n}",
    "uniformValues": {
      "linesCount": 28.93,
      "snakeSpeed": 10,
      "snakeTiling": 1,
      "lineThickness": 0.2305,
      "zoneThreshold": 0.95,
      "minZoneThreshold": 0.64,
      "loopSpeed": 4.1,
      "pixelSoftness": 1.6844,
      "colorSpeed": 8.3,
      "psychedelicScale": 4.23,
      "showBackground": true,
      "blobSize": 0.1,
      "blobBlur": 0.708,
      "darkThreshold": 0.28
    }
  },
  {
    "id": "recovered_timeline_31fca10c_9c6b_448d_8047_39be703dbe6a",
    "name": "Psychedelic Snakes with Blob 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-31fca10c-9c6b-448d-8047-39be703dbe6a in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psychedelic Snakes with Blob\nuniform float linesCount; // @min 1.0 @max 50.0 @default 15.0\nuniform float snakeSpeed; // @min -10.0 @max 10.0 @default 5.0\nuniform float snakeTiling; // @min 1.0 @max 20.0 @default 3.0\nuniform float lineThickness; // @min 0.01 @max 0.5 @default 0.15\nuniform float zoneThreshold; // @min 0.0 @max 1.0 @default 0.8\nuniform float minZoneThreshold; // @min 0.0 @max 1.0 @default 0.2\nuniform float loopSpeed; // @min -5.0 @max 5.0 @default 1.0\nuniform float pixelSoftness; // @min 0.01 @max 3.0 @default 1.8\nuniform float colorSpeed; // @min 0.0 @max 10.0 @default 2.0\nuniform float psychedelicScale; // @min 1.0 @max 20.0 @default 5.0\nuniform bool showBackground; // @default true\nuniform float blobSize; // @min 0.1 @max 2.0 @default 0.6\nuniform float blobBlur; // @min 0.1 @max 2.0 @default 0.8\nuniform float darkThreshold; // @min 0.0 @max 1.0 @default 0.05\n\nfloat getMask(sampler2D tex, vec2 uv, vec2 res, float t, float lc, float lt, float ps, float zt, float st, float ss, float ls) {\n    vec3 lw = vec3(0.299, 0.587, 0.114);\n    float lum = dot(texture2D(tex, uv).rgb, lw);\n    vec2 eps = vec2(3.0) / res;\n    float lumX = dot(texture2D(tex, uv + vec2(eps.x, 0.0)).rgb, lw);\n    float lumY = dot(texture2D(tex, uv + vec2(0.0, eps.y)).rgb, lw);\n    vec2 grad = vec2(lumX - lum, lumY - lum);\n    float angle = atan(grad.y, grad.x + 0.0001);\n    \n    float iso = fract(lum * lc - t * ls);\n    float soft = lt * ps * 1.5;\n    float line = smoothstep(zt - soft, zt, iso) - smoothstep(zt, zt + soft, iso);\n    line *= smoothstep(0.001, 0.02, length(grad));\n    \n    float snake = sin(angle * st * 2.0 + t * ss);\n    return line * smoothstep(-1.2 * ps, 1.2, snake);\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    float currentZT = mix(minZoneThreshold, zoneThreshold, sin(time * loopSpeed) * 0.5 + 0.5);\n    \n    float m0 = getMask(tex, uv, resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\n    \n    vec2 eps = vec2(4.0) / resolution;\n    float mx = getMask(tex, uv + vec2(eps.x, 0.0), resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\n    float my = getMask(tex, uv + vec2(0.0, eps.y), resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\n    \n    vec3 n = normalize(vec3(m0 - mx, m0 - my, 0.25));\n    \n    vec3 lightDir = normalize(vec3(0.8, 0.8, 1.0));\n    float diff = max(dot(n, lightDir), 0.0);\n    float diffSoft = diff * 0.6 + 0.4; \n    \n    vec3 viewDir = vec3(0.0, 0.0, 1.0);\n    vec3 halfDir = normalize(lightDir + viewDir);\n    \n    float spec = pow(max(dot(n, halfDir), 0.0), 12.0) * m0 * 0.6;\n    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.5) * m0;\n    \n    vec3 darkGradient = vec3(0.02, 0.04, 0.08) * (1.5 - length(uv - 0.5) * 1.5);\n    vec3 bg = showBackground ? mix(source.rgb * 0.3, darkGradient, 0.5) : darkGradient;\n    \n    vec3 lw = vec3(0.299, 0.587, 0.114);\n    float lum = dot(source.rgb, lw);\n    vec2 epsGrad = vec2(3.0) / resolution;\n    float lumX = dot(texture2D(tex, uv + vec2(epsGrad.x, 0.0)).rgb, lw);\n    float lumY = dot(texture2D(tex, uv + vec2(0.0, epsGrad.y)).rgb, lw);\n    vec2 grad = vec2(lumX - lum, lumY - lum);\n    float angle = atan(grad.y, grad.x + 0.0001);\n    \n    float phase = angle * snakeTiling * 2.0 + time * snakeSpeed;\n    \n    float n1 = node_noise(uv * psychedelicScale + time);\n    float n2 = node_noise(uv * psychedelicScale * 2.0 - time * 0.5 + n1 * 3.0);\n    float r1 = node_rand(floor(uv * psychedelicScale * 5.0) + time * 0.1);\n    \n    vec3 trailColor = 0.5 + 0.5 * cos(phase * 0.5 - time * colorSpeed + n2 * 6.28 + vec3(0.0, 2.1, 4.2) + r1 * 1.5);\n    \n    vec3 finalColor = trailColor * diffSoft + spec + fresnel * vec3(0.8, 0.9, 1.0);\n    vec3 mixedColor = mix(bg, finalColor, m0);\n    \n    vec2 centered = uv - 0.5;\n    vec2 symUv = abs(centered);\n    float blobNoise = node_noise(symUv * 5.0 - time * 0.3);\n    float dist = length(centered) + blobNoise * 0.4;\n    float blobMask = smoothstep(blobSize, blobSize - blobBlur, dist);\n    \n    mixedColor = mix(mixedColor, vec3(0.0), blobMask);\n    \n    // Ensure dark pixels are not affected\n    float affectMask = smoothstep(max(0.0, darkThreshold - 0.05), darkThreshold + 0.05, lum);\n    mixedColor = mix(source.rgb, mixedColor, affectMask);\n    \n    return vec4(mixedColor, source.a);\n}",
    "uniformValues": {
      "linesCount": 4.43,
      "snakeSpeed": -5.8,
      "snakeTiling": 9.55,
      "lineThickness": 0.0492,
      "zoneThreshold": 0.24,
      "minZoneThreshold": 0.29,
      "loopSpeed": -0.5,
      "pixelSoftness": 1.6844,
      "colorSpeed": 3.8,
      "psychedelicScale": 4.23,
      "showBackground": false,
      "blobSize": 0.1,
      "blobBlur": 0.708,
      "darkThreshold": 0.28
    }
  },
  {
    "id": "recovered_timeline_84d79e70_d838_435c_85ed_2928ed034b6b",
    "name": "Radial Delayed Soft Edge Blur",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-84d79e70-d838-435c-85ed-2928ed034b6b in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Radial Delayed Soft Edge Blur\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float lineLength; // @min 1.0 @max 10.0 @default 1.0\nuniform float delay; // @min 0.0 @max 5.0 @default 2.0\nuniform float distOffset; // @min 0.0 @max 20.0 @default 10.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    // Sample the original image for base color and soft light\n    vec4 baseColor = texture2D(tex, uv);\n    \n    // Random blob generation for time delay\n    float blob = node_noise(uv * 5.0);\n    float localTime = time;\n    if (blob > 0.0) {\n        localTime = time - delay;\n    }\n\n    vec2 off = 1.0 / resolution;\n    \n    // Sample 8 neighboring pixels for edge detection\n    float t00 = texture2D(tex, uv + vec2(-off.x, -off.y)).r;\n    float t10 = texture2D(tex, uv + vec2( 0.0,   -off.y)).r;\n    float t20 = texture2D(tex, uv + vec2( off.x, -off.y)).r;\n    float t01 = texture2D(tex, uv + vec2(-off.x,  0.0)).r;\n    float t21 = texture2D(tex, uv + vec2( off.x,  0.0)).r;\n    float t02 = texture2D(tex, uv + vec2(-off.x,  off.y)).r;\n    float t12 = texture2D(tex, uv + vec2( 0.0,    off.y)).r;\n    float t22 = texture2D(tex, uv + vec2( off.x,  off.y)).r;\n\n    // Apply Sobel operators\n    float gx = (t00 + 2.0 * t01 + t02) - (t20 + 2.0 * t21 + t22);\n    float gy = (t00 + 2.0 * t10 + t20) - (t02 + 2.0 * t12 + t22);\n    \n    // Calculate edge intensity and angle\n    float edge = sqrt(gx * gx + gy * gy);\n    float angle = atan(gy, gx);\n    \n    // Calculate distance from the center to offset the animation phase\n    float dist = distance(uv, vec2(0.5));\n    \n    // Create a moving segment using the local time and distance offset\n    float segment = sin(angle * lineLength + localTime * speed - dist * distOffset);\n    \n    // Soften the segment edges\n    segment = smoothstep(0.7, 0.95, segment);\n    \n    // Soft light base from the original image\n    vec3 softLight = baseColor.rgb * 0.4;\n    \n    // Highlight lines colored based on the original image color\n    vec3 highlight = baseColor.rgb * edge * segment * 2.0;\n    \n    // Combine soft light and animated edges\n    vec3 finalColor = softLight + highlight;\n    \n    return vec4(finalColor, baseColor.a);\n}",
    "uniformValues": {
      "speed": -3.6,
      "lineLength": 4.78,
      "delay": 1.7,
      "distOffset": 19.8
    }
  },
  {
    "id": "recovered_timeline_c362b988_cf7a_496c_8708_a72d39c15d4a",
    "name": "Dual Light Spiral Eye",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-c362b988-cf7a-496c-8708-a72d39c15d4a in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Dual Light Spiral Eye\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float speed2; // @min -10.0 @max 10.0 @default 3.0\nuniform float lineLength; // @min 1.0 @max 10.0 @default 1.0\nuniform float distOffset; // @min 0.0 @max 20.0 @default 10.0\nuniform vec3 waveColor1; // @default 1.0,0.2,0.5\nuniform vec3 waveColor2; // @default 0.2,0.8,1.0\nuniform vec3 waveColor3; // @default 0.5,1.0,0.2\nuniform float waveFreq; // @min 1.0 @max 50.0 @default 20.0\nuniform float spiralScale; // @min 5.0 @max 100.0 @default 40.0\nuniform float spiralSpeed; // @min -20.0 @max 20.0 @default 7.0\nuniform float spiralSize; // @min 0.05 @max 1.0 @default 0.3\nuniform float eyeRange; // @min 0.0 @max 0.4 @default 0.15\nuniform float eyeSize; // @min 0.05 @max 0.4 @default 0.2\nuniform vec3 secondLightColor; // @default 0.8,0.9,1.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 baseColor = texture2D(tex, uv);\n    vec2 aspect = vec2(resolution.x / resolution.y, 1.0);\n    vec2 centeredUv = (uv - 0.5) * aspect;\n    float dist = length(centeredUv);\n    float angle = atan(centeredUv.y, centeredUv.x);\n    \n    // Edge detection for line effects\n    vec2 off = 1.0 / resolution;\n    float t01 = texture2D(tex, uv + vec2(-off.x, 0.0)).r;\n    float t21 = texture2D(tex, uv + vec2(off.x, 0.0)).r;\n    float t10 = texture2D(tex, uv + vec2(0.0, -off.y)).r;\n    float t12 = texture2D(tex, uv + vec2(0.0, off.y)).r;\n    float edge = sqrt(pow(t01 - t21, 2.0) + pow(t10 - t12, 2.0)) * 5.0;\n    \n    // Spiral and Wave Logic\n    float dir = (uv.x > 0.5) ? -1.0 : 1.0;\n    float seg1 = smoothstep(0.7, 0.95, sin(angle * lineLength + time * speed * dir - dist * distOffset));\n    float seg2 = smoothstep(0.2, 0.8, sin(angle * lineLength - time * speed2 * dir - dist * distOffset * 0.7));\n    vec3 lineColor1 = mix(waveColor1, waveColor2, sin(dist * waveFreq - time * speed) * 0.5 + 0.5);\n    vec3 lineColor2 = mix(waveColor2, waveColor3, sin(dist * waveFreq * 0.6 + time * speed2) * 0.5 + 0.5);\n    vec3 finalColor = baseColor.rgb * 0.4 + (lineColor1 * edge * seg1 * 2.0) + (lineColor2 * edge * seg2 * 1.5);\n    \n    // Spiral Blob\n    float mathBlob = sin(angle * 5.0 + dist * spiralScale - time * spiralSpeed) + cos(dist * 3.0 + angle * 11.0);\n    float sizeMask = smoothstep(spiralSize, 0.05, dist) * smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x);\n    finalColor += lineColor1 * smoothstep(0.8, 0.0, abs(mathBlob - 0.3)) * sizeMask;\n\n    // Dual Dynamic Lights\n    vec2 lPos1 = (vec2(0.5) + vec2(sin(time * 1.1), cos(time * 1.3)) * 0.4) * aspect;\n    vec2 lPos2 = (vec2(0.5) + vec2(sin(time * 0.8), cos(time * 0.6)) * 0.4) * aspect;\n    float illu1 = pow(smoothstep(1.2, 0.0, distance(uv * aspect, lPos1)), 1.5);\n    float illu2 = pow(smoothstep(0.8, 0.0, distance(uv * aspect, lPos2)), 2.0);\n    finalColor *= illu1 * (1.0 + vec3(1.0, 0.9, 0.7) * 2.5);\n    finalColor = mix(finalColor, (1.0 - baseColor.rgb) * secondLightColor * 2.5, illu2 * 0.5);\n\n    // Spherical Eye\n    vec2 eyePos = (vec2(0.5) + vec2(sin(time * 0.7), cos(time * 0.9)) * eyeRange) * aspect;\n    float eyeDist = length(uv * aspect - eyePos);\n    float eyeMask = smoothstep(eyeSize, eyeSize - 0.02, eyeDist);\n    float pupilMask = smoothstep(eyeSize * 0.35, eyeSize * 0.35 - 0.02, eyeDist);\n    vec3 eyeRender = mix(baseColor.rgb * 2.5, vec3(0.02), pupilMask);\n    finalColor = mix(finalColor, eyeRender, eyeMask * clamp(illu1 + illu2, 0.0, 1.0));\n\n    return vec4(finalColor, baseColor.a);\n}",
    "uniformValues": {
      "speed": 10,
      "speed2": 10,
      "lineLength": 1,
      "distOffset": 1,
      "waveColor1": [
        0.14901960784313725,
        0.5019607843137255,
        0
      ],
      "waveColor2": [
        0.16470588235294117,
        0.3176470588235294,
        0.2
      ],
      "waveColor3": [
        0.03529411764705882,
        0.39215686274509803,
        0.027450980392156862
      ],
      "waveFreq": 50,
      "spiralScale": 100,
      "spiralSpeed": 20,
      "spiralSize": 0.3,
      "eyeRange": 0.4,
      "eyeSize": 0.05,
      "secondLightColor": [
        0,
        0,
        0
      ]
    }
  },
  {
    "id": "recovered_timeline_9a7773ce_3de6_43a9_9a04_e2bd71a0c018",
    "name": "Dark Masked Spiral Eye",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-9a7773ce-3de6-43a9-9a04-e2bd71a0c018 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Dark Masked Spiral Eye\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float speed2; // @min -10.0 @max 10.0 @default 3.0\nuniform float lineLength; // @min 1.0 @max 10.0 @default 1.0\nuniform float distOffset; // @min 0.0 @max 20.0 @default 10.0\nuniform vec3 waveColor1; // @default 1.0,0.2,0.5\nuniform vec3 waveColor2; // @default 0.2,0.8,1.0\nuniform vec3 waveColor3; // @default 0.5,1.0,0.2\nuniform float waveFreq; // @min 1.0 @max 50.0 @default 20.0\nuniform float spiralScale; // @min 5.0 @max 100.0 @default 40.0\nuniform float spiralSpeed; // @min -20.0 @max 20.0 @default 7.0\nuniform float spiralSize; // @min 0.05 @max 1.0 @default 0.3\nuniform float eyeRange; // @min 0.0 @max 0.4 @default 0.15\nuniform float eyeSize; // @min 0.05 @max 0.4 @default 0.2\nuniform vec3 secondLightColor; // @default 0.8,0.9,1.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 baseColor = texture2D(tex, uv);\n    float originalLum = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));\n    float darkMask = smoothstep(0.05, 0.25, originalLum);\n    \n    vec2 aspect = vec2(resolution.x / resolution.y, 1.0);\n    vec2 centeredUv = (uv - 0.5) * aspect;\n    float dist = length(centeredUv);\n    float angle = atan(centeredUv.y, centeredUv.x);\n    \n    // Edge detection for line effects\n    vec2 off = 1.0 / resolution;\n    float t01 = texture2D(tex, uv + vec2(-off.x, 0.0)).r;\n    float t21 = texture2D(tex, uv + vec2(off.x, 0.0)).r;\n    float t10 = texture2D(tex, uv + vec2(0.0, -off.y)).r;\n    float t12 = texture2D(tex, uv + vec2(0.0, off.y)).r;\n    float edge = sqrt(pow(t01 - t21, 2.0) + pow(t10 - t12, 2.0)) * 5.0;\n    \n    // Spiral and Wave Logic\n    float dir = (uv.x > 0.5) ? -1.0 : 1.0;\n    float seg1 = smoothstep(0.7, 0.95, sin(angle * lineLength + time * speed * dir - dist * distOffset));\n    float seg2 = smoothstep(0.2, 0.8, sin(angle * lineLength - time * speed2 * dir - dist * distOffset * 0.7));\n    vec3 lineColor1 = mix(waveColor1, waveColor2, sin(dist * waveFreq - time * speed) * 0.5 + 0.5);\n    vec3 lineColor2 = mix(waveColor2, waveColor3, sin(dist * waveFreq * 0.6 + time * speed2) * 0.5 + 0.5);\n    \n    // Apply darkMask to spiral lines\n    vec3 spiralLines = (lineColor1 * edge * seg1 * 2.0) + (lineColor2 * edge * seg2 * 1.5);\n    vec3 finalColor = baseColor.rgb * 0.4 + (spiralLines * darkMask);\n    \n    // Spiral Blob with darkMask\n    float mathBlob = sin(angle * 5.0 + dist * spiralScale - time * spiralSpeed) + cos(dist * 3.0 + angle * 11.0);\n    float sizeMask = smoothstep(spiralSize, 0.05, dist) * smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x);\n    finalColor += (lineColor1 * smoothstep(0.8, 0.0, abs(mathBlob - 0.3)) * sizeMask) * darkMask;\n\n    // Dual Dynamic Lights\n    vec2 lPos1 = (vec2(0.5) + vec2(sin(time * 1.1), cos(time * 1.3)) * 0.4) * aspect;\n    vec2 lPos2 = (vec2(0.5) + vec2(sin(time * 0.8), cos(time * 0.6)) * 0.4) * aspect;\n    float illu1 = pow(smoothstep(1.2, 0.0, distance(uv * aspect, lPos1)), 1.5);\n    float illu2 = pow(smoothstep(0.8, 0.0, distance(uv * aspect, lPos2)), 2.0);\n    \n    // Second light also respects dark spots\n    float secondLightMask = illu2 * 0.5 * darkMask;\n\n    finalColor *= illu1 * (1.0 + vec3(1.0, 0.9, 0.7) * 2.5);\n    finalColor = mix(finalColor, (1.0 - baseColor.rgb) * secondLightColor * 2.5, secondLightMask);\n\n    // Spherical Eye\n    vec2 eyePos = (vec2(0.5) + vec2(sin(time * 0.7), cos(time * 0.9)) * eyeRange) * aspect;\n    float eyeDist = length(uv * aspect - eyePos);\n    float eyeMask = smoothstep(eyeSize, eyeSize - 0.02, eyeDist);\n    float pupilMask = smoothstep(eyeSize * 0.35, eyeSize * 0.35 - 0.02, eyeDist);\n    vec3 eyeRender = mix(baseColor.rgb * 2.5, vec3(0.02), pupilMask);\n    finalColor = mix(finalColor, eyeRender, eyeMask * clamp(illu1 + illu2, 0.0, 1.0));\n\n    return vec4(finalColor, baseColor.a);\n}",
    "uniformValues": {
      "speed": -10,
      "speed2": 10,
      "lineLength": 1,
      "distOffset": 0,
      "waveColor1": [
        0.6549019607843137,
        0.5725490196078431,
        0.16470588235294117
      ],
      "waveColor2": [
        0.7803921568627451,
        0.9254901960784314,
        0.054901960784313725
      ],
      "waveColor3": [
        0.7294117647058823,
        0.30980392156862746,
        0.03137254901960784
      ],
      "waveFreq": 50,
      "spiralScale": 46.8,
      "spiralSpeed": -16,
      "spiralSize": 0.4965,
      "eyeRange": 0,
      "eyeSize": 0.05,
      "secondLightColor": [
        0.5333333333333333,
        0.0784313725490196,
        0.027450980392156862
      ]
    }
  },
  {
    "id": "recovered_timeline_1232f80d_bbb7_40cb_bb19_0447ad7f5628",
    "name": "4Customizable Multiverse Aliens (Random Saccade Edition)",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-1232f80d-bbb7-40cb-bb19-0447ad7f5628 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 4Customizable Multiverse Aliens (Random Saccade Edition)\nuniform float lightHeight; // @min 0.01 @max 1.0 @default 0.5\nuniform float lightIntensity; // @min 0.0 @max 10.0 @default 4.5\nuniform float ambient; // @min 0.0 @max 1.0 @default 0.1\nuniform float shininess; // @min 1.0 @max 200.0 @default 120.0\nuniform float detail; // @min 0.1 @max 10.0 @default 5.0\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float colorSpeed; // @min 0.0 @max 5.0 @default 0.8\nuniform float alienCount; // @min 1.0 @max 5.0 @default 1.0\nuniform float alienSpread; // @min 0.5 @max 4.0 @default 2.0\nuniform float alienSize; // @min 0.1 @max 3.0 @default 1.2\n\n// Position Parameters\nuniform float moveX; // @min -5.0 @max 5.0 @default 0.0\nuniform float moveY; // @min -5.0 @max 5.0 @default 0.0\n\n// Eye Geometry Parameters\nuniform float irisSize; // @min 0.2 @max 0.8 @default 0.45\nuniform float pupilSize; // @min 0.1 @max 0.5 @default 0.2\nuniform float eyeDilation; // @min 0.5 @max 1.5 @default 1.0\nuniform float veinIntensity; // @min 0.0 @max 1.0 @default 0.8\n\n// Random Frenetic Search Parameters\nuniform float lookDownAmount; // @min 0.0 @max 1.5 @default 0.6\nuniform float lookSideAmount; // @min 0.0 @max 1.5 @default 0.8\nuniform float freneticSpeed; // @min 0.0 @max 60.0 @default 35.0\nuniform float twitchIntensity; // @min 0.0 @max 0.5 @default 0.15\n\n// --- 3D UTILITIES ---\nmat2 rot(float a) {\n    float s = sin(a), c = cos(a);\n    return mat2(c, -s, s, c);\n}\n\nfloat sdSphere(vec3 p, float s) {\n    return length(p) - s;\n}\n\n// --- RANDOM MOVEMENT LOGIC ---\nfloat hash11(float p) {\n    p = fract(p * 0.1031);\n    p *= p + 33.33;\n    p *= p + p;\n    return fract(p);\n}\n\nvec2 getEyeRotation(float t, float speed, float sideAmt, float downAmt, float twitch) {\n    // 1. Saccades (Rapid eye darts)\n    float dartRate = max(1.0, speed * 0.08); \n    float seedTime = floor(t * dartRate);\n    float smoothT = smoothstep(0.0, 0.2, fract(t * dartRate)); \n    \n    // Random targets for X (Side-to-Side)\n    float prevX = (hash11(seedTime * 12.34) - 0.5) * 2.0;\n    float nextX = (hash11((seedTime + 1.0) * 12.34) - 0.5) * 2.0;\n    float curX = mix(prevX, nextX, smoothT);\n    \n    // Random targets for Y (Up-and-Down)\n    float prevY = (hash11(seedTime * 45.67) - 0.5) * 2.0;\n    float nextY = (hash11((seedTime + 1.0) * 45.67) - 0.5) * 2.0;\n    float curY = mix(prevY, nextY, smoothT);\n    \n    // 2. High-frequency micro twitches\n    float jX = sin(t * speed) * cos(t * speed * 0.61);\n    float jY = cos(t * speed * 0.83) * sin(t * speed * 1.27);\n    \n    float finalX = (curX * sideAmt) + (jX * twitch);\n    float finalY = (curY * downAmt) - (downAmt * 0.3) + (jY * twitch); \n    \n    return vec2(finalX, finalY);\n}\n\n// --- REALISTIC EYE SDF ---\nvec2 singleAlien(vec3 p, float time, float idOffset) {\n    p /= alienSize;\n    \n    // REVERSE UPSIDE DOWN\n    p.y = -p.y;\n    \n    float t = time + idOffset;\n    p.xy *= rot(sin(t * 0.5) * 0.05);\n\n    vec2 eyeRot = getEyeRotation(t, freneticSpeed, lookSideAmount, lookDownAmount, twitchIntensity);\n    p.xz *= rot(eyeRot.x);\n    p.yz *= rot(eyeRot.y);\n\n    float d = sdSphere(p, 1.0);\n    float mat = 0.0;\n\n    vec3 normP = normalize(p);\n    if (normP.z > 0.0) { \n        float r = length(normP.xy);\n        float pSize = pupilSize * (1.0 + sin(time * 2.0) * 0.05 * eyeDilation);\n        \n        if (r < pSize) {\n            mat = 2.0; // Pupil\n        } else if (r < irisSize) {\n            mat = 1.0; // Iris\n        }\n    }\n\n    return vec2(d * alienSize, mat);\n}\n\nvec2 map(vec3 p, float time) {\n    vec2 res = vec2(1e10, 0.0);\n    float count = floor(alienCount);\n    \n    // FIXED: Using standard integer for loop to prevent WebGL errors\n    for(int i = 0; i < 5; i++) {\n        if (float(i) >= count) break;\n        float xOffset = (float(i) - (count - 1.0) * 0.5) * alienSpread;\n        \n        // Apply Global Move X and Y here\n        vec3 objectPos = vec3(xOffset + moveX, moveY, 0.0);\n        \n        vec2 d = singleAlien(p - objectPos, time, float(i) * 4.0);\n        if (d.x < res.x) res = d;\n    }\n    return res;\n}\n\nvec3 getNormal(vec3 p, float t) {\n    vec2 e = vec2(0.001, 0.0);\n    return normalize(vec3(\n        map(p + e.xyy, t).x - map(p - e.xyy, t).x,\n        map(p + e.yxy, t).x - map(p - e.yxy, t).x,\n        map(p + e.yyx, t).x - map(p - e.yyx, t).x\n    ));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 base = texture2D(tex, uv);\n    float isNotBlack = smoothstep(blackThreshold, blackThreshold + 0.05, max(max(base.r, base.g), base.b));\n    if (isNotBlack < 0.01) return vec4(0.0, 0.0, 0.0, base.a);\n\n    vec2 p = (uv - 0.5) * 2.0;\n    p.x *= resolution.x / resolution.y;\n    \n    vec3 ro = vec3(0.0, 0.0, 4.0); \n    vec3 rd = normalize(vec3(p, -3.5));\n    \n    float tDist = 0.0;\n    vec2 res;\n    for(int i = 0; i < 64; i++) {\n        res = map(ro + rd * tDist, time);\n        if(res.x < 0.001 || tDist > 10.0) break;\n        tDist += res.x;\n    }\n    \n    if(res.x < 0.001) {\n        vec3 pos = ro + rd * tDist;\n        vec3 normal = getNormal(pos, time);\n        vec3 viewDir = -rd;\n        \n        // --- Reconstruct Local Position for Realistic Texturing ---\n        vec3 localPos = pos;\n        float closestI = 0.0;\n        float minDist = 100.0;\n        float count = floor(alienCount);\n        \n        // FIXED: Int loop for reconstruction\n        for(int i = 0; i < 5; i++) {\n            if (float(i) >= count) break;\n            float xOffset = (float(i) - (count - 1.0) * 0.5) * alienSpread;\n            vec3 objectPos = vec3(xOffset + moveX, moveY, 0.0);\n            float d = length(pos - objectPos);\n            if (d < minDist) { minDist = d; closestI = float(i); }\n        }\n        \n        float xOff = (closestI - (count - 1.0) * 0.5) * alienSpread;\n        // Shift local texture coordinates back by moveX and moveY to match geometry\n        localPos -= vec3(xOff + moveX, moveY, 0.0);\n        localPos /= alienSize;\n        localPos.y = -localPos.y; \n        \n        float t_loc = time + closestI * 4.0;\n        localPos.xy *= rot(sin(t_loc * 0.5) * 0.05);\n        \n        vec2 eyeRot = getEyeRotation(t_loc, freneticSpeed, lookSideAmount, lookDownAmount, twitchIntensity);\n        localPos.xz *= rot(eyeRot.x);\n        localPos.yz *= rot(eyeRot.y);\n        \n        vec3 localNorm = normalize(localPos);\n        float r = length(localNorm.xy);\n        float angle = atan(localNorm.y, localNorm.x);\n        // ----------------------------------------------------------\n\n        // Lighting Setup\n        vec3 lp = vec3(2.0 * sin(time), 3.0, 5.0 * lightHeight);\n        vec3 lDir = normalize(lp - pos);\n        \n        // Base Material Colors\n        vec3 col = vec3(0.92, 0.88, 0.88); \n        \n        if (res.y == 0.0) { // Sclera & Veins\n            \n            float warp1 = sin(localNorm.z * 15.0) * 0.15 + cos(localNorm.z * 25.0) * 0.05;\n            float warp2 = cos(localNorm.z * 20.0) * 0.25 - sin(localNorm.z * 40.0) * 0.1;\n            \n            float mainVeins = sin((angle + warp1) * 12.0);\n            mainVeins = smoothstep(0.95, 1.0, mainVeins); \n            \n            float secVeins = sin((angle + warp2) * 26.0);\n            secVeins = smoothstep(0.98, 1.0, secVeins); \n            \n            float veinMask = max(mainVeins, secVeins * 0.6);\n            \n            float breakup = smoothstep(0.0, 0.5, sin(localNorm.z * 50.0 + angle * 5.0) * 0.5 + 0.5);\n            veinMask *= mix(0.4, 1.0, breakup);\n\n            float veinFade = smoothstep(irisSize - 0.02, irisSize + 0.5, r);\n            vec3 bloodCol = vec3(0.7, 0.05, 0.05);\n            \n            col = mix(col, bloodCol, veinMask * veinFade * veinIntensity);\n            \n        } else if (res.y == 1.0) { // Iris\n            float f = abs(sin(angle * 20.0 + detail));\n            vec3 irisCol = vec3(0.2, 0.4, 0.8); \n            irisCol += 0.5 * sin(vec3(0.0, 1.0, 2.0) + time * colorSpeed);\n            col = mix(irisCol * 0.5, irisCol, f);\n            col *= smoothstep(irisSize, irisSize - 0.05, r);\n        } else if (res.y == 2.0) { // Pupil\n            col = vec3(0.02);\n        }\n        \n        // Lighting Calculations\n        float diff = max(dot(normal, lDir), 0.0);\n        float spec = pow(max(dot(normal, normalize(lDir + viewDir)), 0.0), shininess);\n        float glint = pow(max(dot(normal, normalize(vec3(1.0, 1.0, 1.0))), 0.0), 300.0) * 2.0;\n        \n        vec3 finalCol = col * (ambient + diff * lightIntensity * 0.5);\n        finalCol += (spec + glint) * lightIntensity * 0.3;\n        \n        return vec4(finalCol * isNotBlack, base.a);\n    }\n\n    return vec4(0.0, 0.0, 0.0, base.a);\n}",
    "uniformValues": {
      "lightHeight": 0.5,
      "lightIntensity": 4.5,
      "ambient": 0.56,
      "shininess": 120,
      "detail": 5,
      "blackThreshold": 0.05,
      "colorSpeed": 0.8,
      "alienCount": 3.28,
      "alienSpread": 1.725,
      "alienSize": 0.39,
      "moveX": 0,
      "moveY": 0,
      "irisSize": 0.584,
      "pupilSize": 0.372,
      "eyeDilation": 1.31,
      "veinIntensity": 0.57,
      "lookDownAmount": 0.225,
      "lookSideAmount": 0.405,
      "freneticSpeed": 4.8,
      "twitchIntensity": 0.08
    }
  },
  {
    "id": "recovered_timeline_5e36b310_7cf4_44a8_9cce_64af2b398f32",
    "name": "1dxCustomizable Multiverse Aliens (Random Saccade Edition)",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-5e36b310-7cf4-44a8-9cce-64af2b398f32 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 1dxCustomizable Multiverse Aliens (Random Saccade Edition)\nuniform float lightHeight; // @min 0.01 @max 1.0 @default 0.5\nuniform float lightIntensity; // @min 0.0 @max 10.0 @default 4.5\nuniform float ambient; // @min 0.0 @max 1.0 @default 0.1\nuniform float shininess; // @min 1.0 @max 200.0 @default 120.0\nuniform float detail; // @min 0.1 @max 10.0 @default 5.0\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float colorSpeed; // @min 0.0 @max 5.0 @default 0.8\nuniform float alienCount; // @min 1.0 @max 5.0 @default 1.0\nuniform float alienSpread; // @min 0.5 @max 4.0 @default 2.0\nuniform float alienSize; // @min 0.1 @max 3.0 @default 1.2\n\n// Position Parameters\nuniform float moveX; // @min -5.0 @max 5.0 @default 0.0\nuniform float moveY; // @min -5.0 @max 5.0 @default 0.0\n\n// Eye Geometry Parameters\nuniform float irisSize; // @min 0.2 @max 0.8 @default 0.45\nuniform float pupilSize; // @min 0.1 @max 0.5 @default 0.2\nuniform float eyeDilation; // @min 0.5 @max 1.5 @default 1.0\nuniform float veinIntensity; // @min 0.0 @max 1.0 @default 0.8\n\n// Random Frenetic Search Parameters\nuniform float lookDownAmount; // @min 0.0 @max 1.5 @default 0.6\nuniform float lookSideAmount; // @min 0.0 @max 1.5 @default 0.8\nuniform float freneticSpeed; // @min 0.0 @max 60.0 @default 35.0\nuniform float twitchIntensity; // @min 0.0 @max 0.5 @default 0.15\n\n// --- 3D UTILITIES ---\nmat2 rot(float a) {\n    float s = sin(a), c = cos(a);\n    return mat2(c, -s, s, c);\n}\n\nfloat sdSphere(vec3 p, float s) {\n    return length(p) - s;\n}\n\n// --- RANDOM MOVEMENT LOGIC ---\nfloat hash11(float p) {\n    p = fract(p * 0.1031);\n    p *= p + 33.33;\n    p *= p + p;\n    return fract(p);\n}\n\nvec2 getEyeRotation(float t, float speed, float sideAmt, float downAmt, float twitch) {\n    // 1. Saccades (Rapid eye darts)\n    float dartRate = max(1.0, speed * 0.08); \n    float seedTime = floor(t * dartRate);\n    float smoothT = smoothstep(0.0, 0.2, fract(t * dartRate)); \n    \n    // Random targets for X (Side-to-Side)\n    float prevX = (hash11(seedTime * 12.34) - 0.5) * 2.0;\n    float nextX = (hash11((seedTime + 1.0) * 12.34) - 0.5) * 2.0;\n    float curX = mix(prevX, nextX, smoothT);\n    \n    // Random targets for Y (Up-and-Down)\n    float prevY = (hash11(seedTime * 45.67) - 0.5) * 2.0;\n    float nextY = (hash11((seedTime + 1.0) * 45.67) - 0.5) * 2.0;\n    float curY = mix(prevY, nextY, smoothT);\n    \n    // 2. High-frequency micro twitches\n    float jX = sin(t * speed) * cos(t * speed * 0.61);\n    float jY = cos(t * speed * 0.83) * sin(t * speed * 1.27);\n    \n    float finalX = (curX * sideAmt) + (jX * twitch);\n    float finalY = (curY * downAmt) - (downAmt * 0.3) + (jY * twitch); \n    \n    return vec2(finalX, finalY);\n}\n\n// --- REALISTIC EYE SDF ---\nvec2 singleAlien(vec3 p, float time, float idOffset) {\n    p /= alienSize;\n    \n    // REVERSE UPSIDE DOWN\n    p.y = -p.y;\n    \n    float t = time + idOffset;\n    p.xy *= rot(sin(t * 0.5) * 0.05);\n\n    vec2 eyeRot = getEyeRotation(t, freneticSpeed, lookSideAmount, lookDownAmount, twitchIntensity);\n    p.xz *= rot(eyeRot.x);\n    p.yz *= rot(eyeRot.y);\n\n    float d = sdSphere(p, 1.0);\n    float mat = 0.0;\n\n    vec3 normP = normalize(p);\n    if (normP.z > 0.0) { \n        float r = length(normP.xy);\n        float pSize = pupilSize * (1.0 + sin(time * 2.0) * 0.05 * eyeDilation);\n        \n        if (r < pSize) {\n            mat = 2.0; // Pupil\n        } else if (r < irisSize) {\n            mat = 1.0; // Iris\n        }\n    }\n\n    return vec2(d * alienSize, mat);\n}\n\nvec2 map(vec3 p, float time) {\n    vec2 res = vec2(1e10, 0.0);\n    float count = floor(alienCount);\n    \n    // FIXED: Using standard integer for loop to prevent WebGL errors\n    for(int i = 0; i < 5; i++) {\n        if (float(i) >= count) break;\n        float xOffset = (float(i) - (count - 1.0) * 0.5) * alienSpread;\n        \n        // Apply Global Move X and Y here\n        vec3 objectPos = vec3(xOffset + moveX, moveY, 0.0);\n        \n        vec2 d = singleAlien(p - objectPos, time, float(i) * 4.0);\n        if (d.x < res.x) res = d;\n    }\n    return res;\n}\n\nvec3 getNormal(vec3 p, float t) {\n    vec2 e = vec2(0.001, 0.0);\n    return normalize(vec3(\n        map(p + e.xyy, t).x - map(p - e.xyy, t).x,\n        map(p + e.yxy, t).x - map(p - e.yxy, t).x,\n        map(p + e.yyx, t).x - map(p - e.yyx, t).x\n    ));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 base = texture2D(tex, uv);\n    float isNotBlack = smoothstep(blackThreshold, blackThreshold + 0.05, max(max(base.r, base.g), base.b));\n    if (isNotBlack < 0.01) return vec4(0.0, 0.0, 0.0, base.a);\n\n    vec2 p = (uv - 0.5) * 2.0;\n    p.x *= resolution.x / resolution.y;\n    \n    vec3 ro = vec3(0.0, 0.0, 4.0); \n    vec3 rd = normalize(vec3(p, -3.5));\n    \n    float tDist = 0.0;\n    vec2 res;\n    for(int i = 0; i < 64; i++) {\n        res = map(ro + rd * tDist, time);\n        if(res.x < 0.001 || tDist > 10.0) break;\n        tDist += res.x;\n    }\n    \n    if(res.x < 0.001) {\n        vec3 pos = ro + rd * tDist;\n        vec3 normal = getNormal(pos, time);\n        vec3 viewDir = -rd;\n        \n        // --- Reconstruct Local Position for Realistic Texturing ---\n        vec3 localPos = pos;\n        float closestI = 0.0;\n        float minDist = 100.0;\n        float count = floor(alienCount);\n        \n        // FIXED: Int loop for reconstruction\n        for(int i = 0; i < 5; i++) {\n            if (float(i) >= count) break;\n            float xOffset = (float(i) - (count - 1.0) * 0.5) * alienSpread;\n            vec3 objectPos = vec3(xOffset + moveX, moveY, 0.0);\n            float d = length(pos - objectPos);\n            if (d < minDist) { minDist = d; closestI = float(i); }\n        }\n        \n        float xOff = (closestI - (count - 1.0) * 0.5) * alienSpread;\n        // Shift local texture coordinates back by moveX and moveY to match geometry\n        localPos -= vec3(xOff + moveX, moveY, 0.0);\n        localPos /= alienSize;\n        localPos.y = -localPos.y; \n        \n        float t_loc = time + closestI * 4.0;\n        localPos.xy *= rot(sin(t_loc * 0.5) * 0.05);\n        \n        vec2 eyeRot = getEyeRotation(t_loc, freneticSpeed, lookSideAmount, lookDownAmount, twitchIntensity);\n        localPos.xz *= rot(eyeRot.x);\n        localPos.yz *= rot(eyeRot.y);\n        \n        vec3 localNorm = normalize(localPos);\n        float r = length(localNorm.xy);\n        float angle = atan(localNorm.y, localNorm.x);\n        // ----------------------------------------------------------\n\n        // Lighting Setup\n        vec3 lp = vec3(2.0 * sin(time), 3.0, 5.0 * lightHeight);\n        vec3 lDir = normalize(lp - pos);\n        \n        // Base Material Colors\n        vec3 col = vec3(0.92, 0.88, 0.88); \n        \n        if (res.y == 0.0) { // Sclera & Veins\n            \n            float warp1 = sin(localNorm.z * 15.0) * 0.15 + cos(localNorm.z * 25.0) * 0.05;\n            float warp2 = cos(localNorm.z * 20.0) * 0.25 - sin(localNorm.z * 40.0) * 0.1;\n            \n            float mainVeins = sin((angle + warp1) * 12.0);\n            mainVeins = smoothstep(0.95, 1.0, mainVeins); \n            \n            float secVeins = sin((angle + warp2) * 26.0);\n            secVeins = smoothstep(0.98, 1.0, secVeins); \n            \n            float veinMask = max(mainVeins, secVeins * 0.6);\n            \n            float breakup = smoothstep(0.0, 0.5, sin(localNorm.z * 50.0 + angle * 5.0) * 0.5 + 0.5);\n            veinMask *= mix(0.4, 1.0, breakup);\n\n            float veinFade = smoothstep(irisSize - 0.02, irisSize + 0.5, r);\n            vec3 bloodCol = vec3(0.7, 0.05, 0.05);\n            \n            col = mix(col, bloodCol, veinMask * veinFade * veinIntensity);\n            \n        } else if (res.y == 1.0) { // Iris\n            float f = abs(sin(angle * 20.0 + detail));\n            vec3 irisCol = vec3(0.2, 0.4, 0.8); \n            irisCol += 0.5 * sin(vec3(0.0, 1.0, 2.0) + time * colorSpeed);\n            col = mix(irisCol * 0.5, irisCol, f);\n            col *= smoothstep(irisSize, irisSize - 0.05, r);\n        } else if (res.y == 2.0) { // Pupil\n            col = vec3(0.02);\n        }\n        \n        // Lighting Calculations\n        float diff = max(dot(normal, lDir), 0.0);\n        float spec = pow(max(dot(normal, normalize(lDir + viewDir)), 0.0), shininess);\n        float glint = pow(max(dot(normal, normalize(vec3(1.0, 1.0, 1.0))), 0.0), 300.0) * 2.0;\n        \n        vec3 finalCol = col * (ambient + diff * lightIntensity * 0.5);\n        finalCol += (spec + glint) * lightIntensity * 0.3;\n        \n        return vec4(finalCol * isNotBlack, base.a);\n    }\n\n    return vec4(0.0, 0.0, 0.0, base.a);\n}",
    "uniformValues": {
      "lightHeight": 0.5,
      "lightIntensity": 4.5,
      "ambient": 0.56,
      "shininess": 120,
      "detail": 5,
      "blackThreshold": 0.05,
      "colorSpeed": 0.8,
      "alienCount": 1,
      "alienSpread": 1.41,
      "alienSize": 0.912,
      "moveX": 1.4,
      "moveY": -0.1,
      "irisSize": 0.584,
      "pupilSize": 0.372,
      "eyeDilation": 1.31,
      "veinIntensity": 0.57,
      "lookDownAmount": 0.225,
      "lookSideAmount": 0.405,
      "freneticSpeed": 4.8,
      "twitchIntensity": 0.08
    }
  },
  {
    "id": "recovered_timeline_dde8823e_5cc2_46a2_ba26_1e55c3b88e08",
    "name": "Psychedelic Edge Drive",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-dde8823e-5cc2-46a2-ba26-1e55c3b88e08 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psychedelic Edge Drive\nuniform float dark_distance; // @min 0.0 @max 10.0 @default 2.0\nuniform float colorrangeeffect; // @min 0.0 @max 1.0 @default 0.5\nuniform float fold_symmetry; // @min 3.0 @max 12.0 @default 8.0\nuniform float distortion_4d; // @min 0.0 @max 5.0 @default 1.5\nuniform float speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float psych_intensity; // @min 0.0 @max 5.0 @default 2.0\n\n#define PI 3.141592654\n\nmat2 rot(float x) {\n    return mat2(cos(x), sin(x), -sin(x), cos(x));\n}\n\nvec2 foldRotate(in vec2 p, in float s) {\n    float a = PI / s - atan(p.x, p.y);\n    float n = PI * 2.0 / s;\n    return p * rot(floor(a / n) * n);\n}\n\nfloat tex_func(vec2 p, float z, float t, float sym, float dist) {\n    p = foldRotate(p, sym);\n    p *= rot(length(p) * dist * 0.05 + t * 0.3);\n    vec2 q = (fract(p / 10.0) - 0.5) * 10.0;\n    for (int i = 0; i < 2; ++i) {\n        q = abs(q) - 0.25;\n        q *= rot(PI * 0.25 + dist * 0.15 * sin(t * 0.8 + length(q)));\n        q = abs(q) - vec2(1.0, 1.5);\n        q *= rot(PI * 0.25 * z);\n        q = foldRotate(q, 3.0);  \n    }\n    vec2 d = abs(q) - vec2(1.0);\n    float sd = min(max(d.x, d.y), 0.0) + length(max(d, 0.0));\n    return smoothstep(0.9, 1.0, 1.0 / (1.0 + abs(sd)));\n}\n\nvec3 hueShift(vec3 color, float hue) {\n    const vec3 k = vec3(0.57735, 0.57735, 0.57735);\n    float cosAngle = cos(hue);\n    return vec3(color * cosAngle + cross(k, color) * sin(hue) + k * dot(k, color) * (1.0 - cosAngle));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    vec2 texel = dark_distance / resolution;\n    \n    float color_diff = 0.0;\n    float min_lum = 1.0;\n    \n    for(int x = -1; x <= 1; x+=2) {\n        for(int y = -1; y <= 1; y+=2) {\n            vec4 s = texture2D(tex, uv + vec2(float(x), float(y)) * texel);\n            color_diff += length(s.rgb - source.rgb);\n            float lum = dot(s.rgb, vec3(0.299, 0.587, 0.114)) * s.a;\n            min_lum = min(min_lum, lum);\n        }\n    }\n    color_diff /= 4.0;\n    \n    float mask = smoothstep(0.1, 0.9, min_lum);\n    \n    vec2 p_uv = (uv * 2.0 - 1.0) * vec2(resolution.x / resolution.y, 1.0) * 2.0;\n    p_uv += vec2(sin(time * 2.0 + p_uv.y * 5.0), cos(time * 2.0 + p_uv.x * 5.0)) * color_diff * psych_intensity * 0.5;\n    \n    float INTERVAL = 3.0;\n    float t_scaled = time * speed;\n    \n    vec3 c1 = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.3, 0.3), colorrangeeffect);\n    vec3 c2 = mix(vec3(0.7, 0.5, 1.0), vec3(0.3, 1.0, 0.3), colorrangeeffect);\n    \n    vec3 col = vec3(0.0);\n    if (mask > 0.0) {\n        for(int i = 0; i < 4; i++) {\n            float ii = float(4 - i);\n            float t2 = ii * INTERVAL - mod(t_scaled + INTERVAL * 0.5, INTERVAL);\n            col = mix(col, vec3((12.0 - t2) / 12.0) * c1 * 1.3, tex_func(p_uv * max(0.0, t2), 4.45, t_scaled, fold_symmetry, distortion_4d));\n            \n            float t4 = ii * INTERVAL - mod(t_scaled, INTERVAL);\n            col = mix(col, vec3((12.0 - t4) / 12.0) * c2 * 1.3, tex_func(p_uv * max(0.0, t4), 4.45, t_scaled, fold_symmetry, distortion_4d));\n        }\n    }\n\n    vec4 final_col = mix(vec4(0.0, 0.0, 0.0, source.a), vec4(col, source.a), mask);\n    \n    vec3 psych_edge = hueShift(source.rgb, time * 5.0 + color_diff * 15.0);\n    final_col.rgb = mix(final_col.rgb, psych_edge, smoothstep(0.05, 0.4, color_diff) * clamp(psych_intensity, 0.0, 1.0));\n    \n    return final_col;\n}",
    "uniformValues": {
      "dark_distance": 2,
      "colorrangeeffect": 0.5,
      "fold_symmetry": 8,
      "distortion_4d": 1.5,
      "speed": 1,
      "psych_intensity": 2
    }
  },
  {
    "id": "recovered_timeline_6b03e9bc_4f4c_4e4b_9754_f5b6d5696dd7",
    "name": "Horizontal Symmetrical Hexagon 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-6b03e9bc-4f4c-4e4b-9754-f5b6d5696dd7 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Horizontal Symmetrical Hexagon\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\nuniform float intensity; // @min 0.0 @max 1.5 @default 0.5\nuniform float scale; // @min 0.1 @max 5.0 @default 0.3\nuniform float effectAmount; // @min 0.0 @max 1.0 @default 1.0\nuniform float blackLineScale; // @min 0.01 @max 1.0 @default 0.15\nuniform float blackLineThickness; // @min 0.01 @max 2.0 @default 0.1\nuniform float blackLineSpeed; // @min -5.0 @max 5.0 @default -1.0\nuniform float blackLineBlur; // @min 0.0 @max 2.0 @default 0.5\n\n#define R3 1.732051\n\nvec4 HexCoords(vec2 uv) {\n    vec2 s = vec2(1.0, R3);\n    vec2 h = 0.5 * s;\n    vec2 gv = s * uv;\n    vec2 a = mod(gv, s) - h;\n    vec2 b = mod(gv + h, s) - h;\n    vec2 ab = dot(a, a) < dot(b, b) ? a : b;\n    return vec4(ab, gv - ab);\n}\n\nfloat GetSize(vec2 id, float seed, float time) {\n    float d = length(id);\n    float t = time * 0.5;\n    return (sin(d * seed + t) + sin(d * seed * seed * 10.0 + t * 2.0)) / 2.0 + 0.5;\n}\n\nmat2 Rot(float a) {\n    float s = sin(a), c = cos(a);\n    return mat2(c, -s, s, c);\n}\n\nfloat Hexagon(vec2 uv, float r, float time, float thickness, float blur) {\n    uv *= Rot(mix(0.0, 3.1415, r));\n    r /= 0.7071;\n    uv = vec2(-uv.y, uv.x);\n    uv.x *= R3;\n    uv = abs(uv);\n    float d = dot(uv, normalize(vec2(1.0, 1.0))) - r;\n    d = max(d, uv.y - r * 0.707);\n    \n    float edge = smoothstep(0.06 * thickness + blur, 0.02 * thickness, abs(d));\n    float glow = smoothstep(0.25 * thickness + blur, 0.0, abs(d)) * 2.5;\n    \n    return edge + glow + smoothstep(0.1 * thickness + blur, 0.09 * thickness, abs(r - 0.5)) * sin(time);\n}\n\nfloat Layer(vec2 uv, float s, float time, float thickness, float blur) {\n    vec4 hu = HexCoords(uv * 2.0);\n    float d = Hexagon(hu.xy, GetSize(hu.zw, s, time), time, thickness, blur);\n    vec2 offs = vec2(1.0, 0.0);\n    d += Hexagon(hu.xy - offs, GetSize(hu.zw + offs, s, time), time, thickness, blur);\n    d += Hexagon(hu.xy + offs, GetSize(hu.zw - offs, s, time), time, thickness, blur);\n    offs = vec2(0.5, 0.8725);\n    d += Hexagon(hu.xy - offs, GetSize(hu.zw + offs, s, time), time, thickness, blur);\n    d += Hexagon(hu.xy + offs, GetSize(hu.zw - offs, s, time), time, thickness, blur);\n    offs = vec2(-0.5, 0.8725);\n    d += Hexagon(hu.xy - offs, GetSize(hu.zw + offs, s, time), time, thickness, blur);\n    d += Hexagon(hu.xy + offs, GetSize(hu.zw - offs, s, time), time, thickness, blur);\n    return d;\n}\n\nfloat N(float p) {\n    return fract(sin(p * 123.34) * 345.456);\n}\n\nvec3 Col(float p, float offs) {\n    float n = N(p) * 1234.34;\n    return sin(n * vec3(12.23, 45.23, 56.2) + offs * 3.0) * 0.5 + 0.5;\n}\n\nvec3 GetAnimColor(vec2 UV, float time, float duv, float thickness, float blur, float timeMult) {\n    float t = time * speed * timeMult * 0.5 + 5.0;\n    vec2 p_uv = UV * mix(1.0, 5.0, sin(t * 0.5) * 0.5 + 0.5) * scale;\n    p_uv *= Rot(t);\n    p_uv.x *= R3;\n    \n    vec3 col = vec3(0.0);\n    for(float i = 0.0; i < 1.0; i += 0.3333) {\n        float id = floor(i + t);\n        float ft = fract(i + t);\n        float z = mix(5.0, 0.1, ft);\n        float fade = smoothstep(0.0, 0.3, ft) * smoothstep(1.0, 0.7, ft);\n        col += fade * ft * Layer(p_uv * z, N(i + id), time, thickness, blur) * Col(id, duv);\n    }\n    return col;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    vec2 UV = uv - 0.5;\n    UV.x *= resolution.x / resolution.y;\n    float duv = dot(UV, UV);\n    \n    // Make the effect symmetrical only horizontally\n    UV.x = abs(UV.x);\n    \n    vec3 col1 = GetAnimColor(UV, time, duv, 1.0, 0.0, 1.0);\n    vec3 illuminatedColor = source.rgb * col1 * 2.0 * intensity;\n    float illumFactor = clamp(length(col1 * intensity), 0.0, 1.0);\n    \n    vec3 invertedSource = 1.0 - source.rgb;\n    float brightness = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    invertedSource *= smoothstep(0.05, 0.2, brightness);\n    \n    vec3 effectColor = mix(invertedSource, illuminatedColor, illumFactor);\n    vec3 finalColor = mix(source.rgb, effectColor, effectAmount);\n    \n    float whiteness = min(finalColor.r, min(finalColor.g, finalColor.b));\n    float mask = smoothstep(0.8, 1.0, whiteness);\n    \n    if (mask > 0.0) {\n        vec3 col2 = GetAnimColor(UV, time, duv, 1.0, 0.0, -1.0);\n        vec3 reverseIlluminated = source.rgb * col2 * 2.0 * intensity;\n        finalColor = mix(finalColor, reverseIlluminated, mask);\n    }\n    \n    vec3 col3 = GetAnimColor(UV * blackLineScale, time, duv, blackLineThickness, blackLineBlur, blackLineSpeed);\n    float blackMask = smoothstep(0.2, 0.8, length(col3));\n    finalColor = mix(finalColor, vec3(0.0), blackMask * effectAmount * 0.85);\n    \n    return vec4(clamp(finalColor, 0.0, 1.0), source.a);\n}",
    "uniformValues": {
      "speed": 5,
      "intensity": 1.32,
      "scale": 4.412,
      "effectAmount": 1,
      "blackLineScale": 0.0595,
      "blackLineThickness": 0.1493,
      "blackLineSpeed": -0.1,
      "blackLineBlur": 1.98
    }
  },
  {
    "id": "recovered_timeline_8c43cd0a_f0ae_4552_a894_03538bed98ab",
    "name": "Distorted Chromy Hue Scanner",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-8c43cd0a-f0ae-4552-a894-03538bed98ab in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Distorted Chromy Hue Scanner\nuniform float rangeWidth; // @min 0.0 @max 1.0 @default 0.2\nuniform float speed; // @min -2.0 @max 2.0 @default 0.5\nuniform float p; // @min 0.0 @max 10.0 @default 5.0\nuniform float dotGrid; // @min 1.0 @max 100.0 @default 10.0\nuniform float dotSize; // @min 0.0 @max 2.0 @default 1.0\nuniform float gridGrowth; // @min 0.0 @max 5.0 @default 1.0\nuniform float dotspeed; // @min 0.0 @max 1.0 @default 0.2\nuniform float distortion; // @min 0.0 @max 5.0 @default 1.5\n\nvec3 rgb2hsv(vec3 c) {\n    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\n    vec4 p_vec = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\n    vec4 q = mix(vec4(p_vec.xyw, c.r), vec4(c.r, p_vec.yzx), step(p_vec.x, c.r));\n    float d = q.x - min(q.w, q.y);\n    float e = 1.0e-10;\n    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    vec3 hsv = rgb2hsv(source.rgb);\n    \n    // Calculate the current hue target based on time and speed\n    float targetHue = fract(time * speed);\n    \n    // Calculate the shortest distance on the circular hue spectrum (0.0 to 1.0)\n    float dist = abs(fract(hsv.x - targetHue + 0.5) - 0.5);\n    \n    // Create a mask: 1.0 if within the range, 0.0 otherwise\n    float mask = step(dist, rangeWidth * 0.5);\n    \n    // Adjust UV for perfect circles and center it\n    vec2 aspect = vec2(resolution.x / resolution.y, 1.0);\n    vec2 centeredUv = (uv - 0.5) * aspect;\n    float distFromCenter = length(centeredUv);\n    \n    // Distort the grid as it goes far away from the center\n    float angle = distFromCenter * distortion * 3.0 - time;\n    float s = sin(angle);\n    float c = cos(angle);\n    vec2 distortedUv = centeredUv * mat2(c, s, -s, c);\n    \n    // Add radial wave distortion\n    distortedUv += normalize(centeredUv + 0.0001) * sin(distFromCenter * 15.0 - time * 4.0) * (distFromCenter * distFromCenter) * distortion * 0.5;\n    \n    // Make the grid shrink towards the center\n    float scale = exp(fract(time * gridGrowth) * 3.0);\n    vec2 gridUv = distortedUv * dotGrid * scale;\n    \n    // Apply dotspeed to animate the dots\n    vec2 dotUv = fract(gridUv + time * dotspeed * 0.1) - 0.5;\n    \n    // Make dots bigger further from the center\n    float currentDotSize = dotSize * distFromCenter * 3.0 + (1.0 - 1.0 / scale) * 0.5 + 0.2;\n    \n    // Blurred dots\n    float dots = 1.0 - smoothstep(0.0, currentDotSize * 2.0 + 0.1, length(dotUv));\n    \n    // Ensure black and dark pixels in the original image remain black\n    float brightness = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    float isNotBlack = smoothstep(0.05, 0.25, brightness);\n    dots *= isNotBlack;\n    \n    // Create soft chromy inverted color\n    vec3 invertedColor = 1.0 - source.rgb;\n    float invLum = dot(invertedColor, vec3(0.299, 0.587, 0.114));\n    vec3 chromyColor = 0.5 + 0.5 * sin(invLum * 12.0 + vec3(0.0, 2.0, 4.0));\n    \n    // Only show the effect where the mask and dots are active, otherwise stay black\n    vec3 finalColor = (chromyColor * dots) * mask;\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "rangeWidth": 0.03,
      "speed": -1.72,
      "p": 9.5,
      "dotGrid": 100,
      "dotSize": 1.96,
      "gridGrowth": 1.35,
      "dotspeed": 0.06,
      "distortion": 0
    }
  },
  {
    "id": "recovered_timeline_4742f4ce_1a77_4add_812c_759484511985",
    "name": "Psychedelic Snakes with Blob 3",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-4742f4ce-1a77-4add-812c-759484511985 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psychedelic Snakes with Blob\nuniform float linesCount; // @min 1.0 @max 50.0 @default 15.0\nuniform float snakeSpeed; // @min -10.0 @max 10.0 @default 5.0\nuniform float snakeTiling; // @min 1.0 @max 20.0 @default 3.0\nuniform float lineThickness; // @min 0.01 @max 0.5 @default 0.15\nuniform float zoneThreshold; // @min 0.0 @max 1.0 @default 0.8\nuniform float minZoneThreshold; // @min 0.0 @max 1.0 @default 0.2\nuniform float loopSpeed; // @min -5.0 @max 5.0 @default 1.0\nuniform float pixelSoftness; // @min 0.01 @max 3.0 @default 1.8\nuniform float colorSpeed; // @min 0.0 @max 10.0 @default 2.0\nuniform float psychedelicScale; // @min 1.0 @max 20.0 @default 5.0\nuniform bool showBackground; // @default true\nuniform float blobSize; // @min 0.1 @max 2.0 @default 0.6\nuniform float blobBlur; // @min 0.1 @max 2.0 @default 0.8\nuniform float darkThreshold; // @min 0.0 @max 1.0 @default 0.05\n\nfloat getMask(sampler2D tex, vec2 uv, vec2 res, float t, float lc, float lt, float ps, float zt, float st, float ss, float ls) {\n    vec3 lw = vec3(0.299, 0.587, 0.114);\n    float lum = dot(texture2D(tex, uv).rgb, lw);\n    vec2 eps = vec2(3.0) / res;\n    float lumX = dot(texture2D(tex, uv + vec2(eps.x, 0.0)).rgb, lw);\n    float lumY = dot(texture2D(tex, uv + vec2(0.0, eps.y)).rgb, lw);\n    vec2 grad = vec2(lumX - lum, lumY - lum);\n    float angle = atan(grad.y, grad.x + 0.0001);\n    \n    float iso = fract(lum * lc - t * ls);\n    float soft = lt * ps * 1.5;\n    float line = smoothstep(zt - soft, zt, iso) - smoothstep(zt, zt + soft, iso);\n    line *= smoothstep(0.001, 0.02, length(grad));\n    \n    float snake = sin(angle * st * 2.0 + t * ss);\n    return line * smoothstep(-1.2 * ps, 1.2, snake);\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    float currentZT = mix(minZoneThreshold, zoneThreshold, sin(time * loopSpeed) * 0.5 + 0.5);\n    \n    float m0 = getMask(tex, uv, resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\n    \n    vec2 eps = vec2(4.0) / resolution;\n    float mx = getMask(tex, uv + vec2(eps.x, 0.0), resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\n    float my = getMask(tex, uv + vec2(0.0, eps.y), resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\n    \n    vec3 n = normalize(vec3(m0 - mx, m0 - my, 0.25));\n    \n    vec3 lightDir = normalize(vec3(0.8, 0.8, 1.0));\n    float diff = max(dot(n, lightDir), 0.0);\n    float diffSoft = diff * 0.6 + 0.4; \n    \n    vec3 viewDir = vec3(0.0, 0.0, 1.0);\n    vec3 halfDir = normalize(lightDir + viewDir);\n    \n    float spec = pow(max(dot(n, halfDir), 0.0), 12.0) * m0 * 0.6;\n    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.5) * m0;\n    \n    vec3 darkGradient = vec3(0.02, 0.04, 0.08) * (1.5 - length(uv - 0.5) * 1.5);\n    vec3 bg = showBackground ? mix(source.rgb * 0.3, darkGradient, 0.5) : darkGradient;\n    \n    vec3 lw = vec3(0.299, 0.587, 0.114);\n    float lum = dot(source.rgb, lw);\n    vec2 epsGrad = vec2(3.0) / resolution;\n    float lumX = dot(texture2D(tex, uv + vec2(epsGrad.x, 0.0)).rgb, lw);\n    float lumY = dot(texture2D(tex, uv + vec2(0.0, epsGrad.y)).rgb, lw);\n    vec2 grad = vec2(lumX - lum, lumY - lum);\n    float angle = atan(grad.y, grad.x + 0.0001);\n    \n    float phase = angle * snakeTiling * 2.0 + time * snakeSpeed;\n    \n    float n1 = node_noise(uv * psychedelicScale + time);\n    float n2 = node_noise(uv * psychedelicScale * 2.0 - time * 0.5 + n1 * 3.0);\n    float r1 = node_rand(floor(uv * psychedelicScale * 5.0) + time * 0.1);\n    \n    vec3 trailColor = 0.5 + 0.5 * cos(phase * 0.5 - time * colorSpeed + n2 * 6.28 + vec3(0.0, 2.1, 4.2) + r1 * 1.5);\n    \n    vec3 finalColor = trailColor * diffSoft + spec + fresnel * vec3(0.8, 0.9, 1.0);\n    vec3 mixedColor = mix(bg, finalColor, m0);\n    \n    vec2 centered = uv - 0.5;\n    vec2 symUv = abs(centered);\n    float blobNoise = node_noise(symUv * 5.0 - time * 0.3);\n    float dist = length(centered) + blobNoise * 0.4;\n    float blobMask = smoothstep(blobSize, blobSize - blobBlur, dist);\n    \n    mixedColor = mix(mixedColor, vec3(0.0), blobMask);\n    \n    // Ensure dark pixels are not affected\n    float affectMask = smoothstep(max(0.0, darkThreshold - 0.05), darkThreshold + 0.05, lum);\n    mixedColor = mix(source.rgb, mixedColor, affectMask);\n    \n    return vec4(mixedColor, source.a);\n}",
    "uniformValues": {
      "linesCount": 2.47,
      "snakeSpeed": -7.2,
      "snakeTiling": 1,
      "lineThickness": 0.2648,
      "zoneThreshold": 0.06,
      "minZoneThreshold": 0.28,
      "loopSpeed": -0.5,
      "pixelSoftness": 1.0266,
      "colorSpeed": 3.8,
      "psychedelicScale": 1.76,
      "showBackground": true,
      "blobSize": 0.1,
      "blobBlur": 2,
      "darkThreshold": 0.2
    }
  },
  {
    "id": "recovered_timeline_f8a9f14f_b323_43e4_ba64_adc5945df6d3",
    "name": "Psychedelic Snakes with Blob 4",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-f8a9f14f-b323-43e4-ba64-adc5945df6d3 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psychedelic Snakes with Blob\nuniform float linesCount; // @min 1.0 @max 50.0 @default 15.0\nuniform float snakeSpeed; // @min -10.0 @max 10.0 @default 5.0\nuniform float snakeTiling; // @min 1.0 @max 20.0 @default 3.0\nuniform float lineThickness; // @min 0.01 @max 0.5 @default 0.15\nuniform float zoneThreshold; // @min 0.0 @max 1.0 @default 0.8\nuniform float minZoneThreshold; // @min 0.0 @max 1.0 @default 0.2\nuniform float loopSpeed; // @min -5.0 @max 5.0 @default 1.0\nuniform float pixelSoftness; // @min 0.01 @max 3.0 @default 1.8\nuniform float colorSpeed; // @min 0.0 @max 10.0 @default 2.0\nuniform float psychedelicScale; // @min 1.0 @max 20.0 @default 5.0\nuniform bool showBackground; // @default true\nuniform float blobSize; // @min 0.1 @max 2.0 @default 0.6\nuniform float blobBlur; // @min 0.1 @max 2.0 @default 0.8\nuniform float darkThreshold; // @min 0.0 @max 1.0 @default 0.05\n\nfloat getMask(sampler2D tex, vec2 uv, vec2 res, float t, float lc, float lt, float ps, float zt, float st, float ss, float ls) {\n    vec3 lw = vec3(0.299, 0.587, 0.114);\n    float lum = dot(texture2D(tex, uv).rgb, lw);\n    vec2 eps = vec2(3.0) / res;\n    float lumX = dot(texture2D(tex, uv + vec2(eps.x, 0.0)).rgb, lw);\n    float lumY = dot(texture2D(tex, uv + vec2(0.0, eps.y)).rgb, lw);\n    vec2 grad = vec2(lumX - lum, lumY - lum);\n    float angle = atan(grad.y, grad.x + 0.0001);\n    \n    float iso = fract(lum * lc - t * ls);\n    float soft = lt * ps * 1.5;\n    float line = smoothstep(zt - soft, zt, iso) - smoothstep(zt, zt + soft, iso);\n    line *= smoothstep(0.001, 0.02, length(grad));\n    \n    float snake = sin(angle * st * 2.0 + t * ss);\n    return line * smoothstep(-1.2 * ps, 1.2, snake);\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    float currentZT = mix(minZoneThreshold, zoneThreshold, sin(time * loopSpeed) * 0.5 + 0.5);\n    \n    float m0 = getMask(tex, uv, resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\n    \n    vec2 eps = vec2(4.0) / resolution;\n    float mx = getMask(tex, uv + vec2(eps.x, 0.0), resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\n    float my = getMask(tex, uv + vec2(0.0, eps.y), resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\n    \n    vec3 n = normalize(vec3(m0 - mx, m0 - my, 0.25));\n    \n    vec3 lightDir = normalize(vec3(0.8, 0.8, 1.0));\n    float diff = max(dot(n, lightDir), 0.0);\n    float diffSoft = diff * 0.6 + 0.4; \n    \n    vec3 viewDir = vec3(0.0, 0.0, 1.0);\n    vec3 halfDir = normalize(lightDir + viewDir);\n    \n    float spec = pow(max(dot(n, halfDir), 0.0), 12.0) * m0 * 0.6;\n    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.5) * m0;\n    \n    vec3 darkGradient = vec3(0.02, 0.04, 0.08) * (1.5 - length(uv - 0.5) * 1.5);\n    vec3 bg = showBackground ? mix(source.rgb * 0.3, darkGradient, 0.5) : darkGradient;\n    \n    vec3 lw = vec3(0.299, 0.587, 0.114);\n    float lum = dot(source.rgb, lw);\n    vec2 epsGrad = vec2(3.0) / resolution;\n    float lumX = dot(texture2D(tex, uv + vec2(epsGrad.x, 0.0)).rgb, lw);\n    float lumY = dot(texture2D(tex, uv + vec2(0.0, epsGrad.y)).rgb, lw);\n    vec2 grad = vec2(lumX - lum, lumY - lum);\n    float angle = atan(grad.y, grad.x + 0.0001);\n    \n    float phase = angle * snakeTiling * 2.0 + time * snakeSpeed;\n    \n    float n1 = node_noise(uv * psychedelicScale + time);\n    float n2 = node_noise(uv * psychedelicScale * 2.0 - time * 0.5 + n1 * 3.0);\n    float r1 = node_rand(floor(uv * psychedelicScale * 5.0) + time * 0.1);\n    \n    vec3 trailColor = 0.5 + 0.5 * cos(phase * 0.5 - time * colorSpeed + n2 * 6.28 + vec3(0.0, 2.1, 4.2) + r1 * 1.5);\n    \n    vec3 finalColor = trailColor * diffSoft + spec + fresnel * vec3(0.8, 0.9, 1.0);\n    vec3 mixedColor = mix(bg, finalColor, m0);\n    \n    vec2 centered = uv - 0.5;\n    vec2 symUv = abs(centered);\n    float blobNoise = node_noise(symUv * 5.0 - time * 0.3);\n    float dist = length(centered) + blobNoise * 0.4;\n    float blobMask = smoothstep(blobSize, blobSize - blobBlur, dist);\n    \n    mixedColor = mix(mixedColor, vec3(0.0), blobMask);\n    \n    // Ensure dark pixels are not affected\n    float affectMask = smoothstep(max(0.0, darkThreshold - 0.05), darkThreshold + 0.05, lum);\n    mixedColor = mix(source.rgb, mixedColor, affectMask);\n    \n    return vec4(mixedColor, source.a);\n}",
    "uniformValues": {
      "linesCount": 21.58,
      "snakeSpeed": 6.2,
      "snakeTiling": 1,
      "lineThickness": 0.5,
      "zoneThreshold": 0.13,
      "minZoneThreshold": 0.02,
      "loopSpeed": -4.9,
      "pixelSoftness": 0.8771,
      "colorSpeed": 7.7,
      "psychedelicScale": 19.05,
      "showBackground": false,
      "blobSize": 0.1,
      "blobBlur": 2,
      "darkThreshold": 0.08
    }
  },
  {
    "id": "recovered_timeline_3775f31c_e235_4108_8ea0_c9809c9e6949",
    "name": "3D Spotlight Tracer",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-3775f31c-e235-4108-8ea0-c9809c9e6949 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Spotlight Tracer\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float contrast; // @min 1.0 @max 5.0 @default 1.5\nuniform float depth; // @min 0.1 @max 5.0 @default 1.5\n\nvec3 hsv2rgb(vec3 c) {\n    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\n    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\n    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);\n}\n\nvec3 calcLight(vec3 lightPos, vec3 lightCol, vec3 normal, vec3 fragPos, vec3 viewDir) {\n    vec3 lightDir = normalize(lightPos - fragPos);\n    float diff = max(dot(normal, lightDir), 0.0);\n    vec3 reflectDir = reflect(-lightDir, normal);\n    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);\n    float dist = length(lightPos - fragPos);\n    float attenuation = 1.0 / (1.0 + 2.0 * dist * dist);\n    return lightCol * (diff * 0.8 + spec * 1.2) * attenuation;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 baseColor = texture2D(tex, uv);\n    vec2 off = 1.0 / resolution;\n    \n    // Sobel edge detection for normals\n    float t00 = texture2D(tex, uv + vec2(-off.x, -off.y)).r;\n    float t10 = texture2D(tex, uv + vec2( 0.0,   -off.y)).r;\n    float t20 = texture2D(tex, uv + vec2( off.x, -off.y)).r;\n    float t01 = texture2D(tex, uv + vec2(-off.x,  0.0)).r;\n    float t21 = texture2D(tex, uv + vec2( off.x,  0.0)).r;\n    float t02 = texture2D(tex, uv + vec2(-off.x,  off.y)).r;\n    float t12 = texture2D(tex, uv + vec2( 0.0,    off.y)).r;\n    float t22 = texture2D(tex, uv + vec2( off.x,  off.y)).r;\n\n    float gx = (t00 + 2.0 * t01 + t02) - (t20 + 2.0 * t21 + t22);\n    float gy = (t00 + 2.0 * t10 + t20) - (t02 + 2.0 * t12 + t22);\n    \n    // 3D Surface setup\n    vec3 normal = normalize(vec3(gx, gy, 1.0 / depth));\n    vec3 fragPos = vec3(uv * 2.0 - 1.0, 0.0);\n    vec3 viewDir = vec3(0.0, 0.0, 1.0);\n    \n    // 3 Colored Spotlights orbiting the center\n    vec3 lPos1 = vec3(sin(time * speed * 0.3) * 0.8, cos(time * speed * 0.3) * 0.8, 0.3);\n    vec3 lPos2 = vec3(cos(time * speed * 0.24) * 0.8, sin(time * speed * 0.24) * 0.8, 0.3);\n    vec3 lPos3 = vec3(sin(time * speed * 0.18 + 2.0) * 0.8, cos(time * speed * 0.18 + 2.0) * 0.8, 0.3);\n    \n    vec3 lCol1 = hsv2rgb(vec3(time * 0.1, 1.0, 1.0));\n    vec3 lCol2 = hsv2rgb(vec3(time * 0.1 + 0.33, 1.0, 1.0));\n    vec3 lCol3 = hsv2rgb(vec3(time * 0.1 + 0.66, 1.0, 1.0));\n    \n    vec3 lighting = calcLight(lPos1, lCol1, normal, fragPos, viewDir) +\n                    calcLight(lPos2, lCol2, normal, fragPos, viewDir) +\n                    calcLight(lPos3, lCol3, normal, fragPos, viewDir);\n                    \n    vec3 finalColor = baseColor.rgb * lighting * contrast;\n    return vec4(finalColor, baseColor.a);\n}",
    "uniformValues": {
      "speed": 10,
      "contrast": 1,
      "depth": 5
    }
  },
  {
    "id": "recovered_timeline_ef3d8260_b816_45d9_a448_0ae7fe0d8f70",
    "name": "Zooming Grid Blob Wiggle",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-ef3d8260-b816-45d9-a448-0ae7fe0d8f70 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Zooming Grid Blob Wiggle\nuniform float edgeThreshold; // @min 0.0 @max 2.0 @default 0.2\nuniform float edgeSoftness; // @min 0.01 @max 1.0 @default 0.3\nuniform float tintAmount; // @min 0.0 @max 1.0 @default 0.85\nuniform float edgeWidth; // @min 0.5 @max 5.0 @default 1.0\nuniform float darkThreshold; // @min 0.0 @max 1.0 @default 0.2\nuniform float wiggleAmp; // @min 0.0 @max 0.1 @default 0.01\nuniform float wiggleFreq; // @min 1.0 @max 50.0 @default 15.0\nuniform float wiggleSpeed; // @min 0.0 @max 10.0 @default 3.0\nuniform float blobRadius; // @min 0.0 @max 1.0 @default 0.2\nuniform float blobSoftness; // @min 0.01 @max 1.0 @default 0.2\nuniform float blobMoveRadius; // @min 0.0 @max 1.0 @default 0.2\nuniform float blobMoveSpeed; // @min 0.0 @max 10.0 @default 2.0\nuniform vec3 blobColor; // @default 0.0,0.0,0.0\nuniform float gridScale; // @min 10.0 @max 500.0 @default 200.0\nuniform float gridIntensity; // @min 0.0 @max 1.0 @default 0.6\nuniform float gridSpeed; // @min 0.0 @max 5.0 @default 0.5\nuniform float gridDistortion; // @min 0.0 @max 0.5 @default 0.05\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 texel = edgeWidth / resolution;\n    vec4 c = texture2D(tex, uv);\n    \n    vec2 symUv = vec2(abs(uv.x - 0.5), uv.y - 0.5);\n    vec2 wiggleOffset = vec2(\n        sin(symUv.y * wiggleFreq + time * wiggleSpeed),\n        cos(symUv.x * wiggleFreq + time * wiggleSpeed)\n    ) * wiggleAmp;\n    \n    if (uv.x > 0.5) wiggleOffset.x = -wiggleOffset.x;\n    \n    vec2 wUv = uv + wiggleOffset;\n    vec4 wc = texture2D(tex, wUv);\n    vec4 n = texture2D(tex, wUv + vec2(0.0, texel.y));\n    vec4 s = texture2D(tex, wUv - vec2(0.0, texel.y));\n    vec4 e = texture2D(tex, wUv + vec2(texel.x, 0.0));\n    vec4 w = texture2D(tex, wUv - vec2(texel.x, 0.0));\n\n    vec4 diff = abs(wc - n) + abs(wc - s) + abs(wc - e) + abs(wc - w);\n    float edge = length(diff.rgb) + diff.a;\n    float isEdge = smoothstep(edgeThreshold, edgeThreshold + edgeSoftness, edge);\n\n    float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));\n    float darkFactor = smoothstep(0.0, darkThreshold, lum);\n\n    float strobo = step(0.5, fract(time * 15.0));\n    vec3 psychColor = mix(vec3(1.0, 0.4, 0.0), vec3(0.7, 0.0, 1.0), strobo);\n    float swirl = sin(uv.x * 15.0 + time * 5.0) * cos(uv.y * 15.0 - time * 4.0);\n    psychColor = clamp(psychColor + swirl * 0.3, 0.0, 1.0);\n\n    vec4 tinted = mix(c, vec4(psychColor, c.a), tintAmount * darkFactor);\n    \n    vec2 aspectUv = symUv * vec2(resolution.x / resolution.y, 1.0);\n    vec2 blobCenter = vec2(0.25 * (resolution.x / resolution.y), 0.0) + vec2(cos(time * blobMoveSpeed), sin(time * blobMoveSpeed)) * blobMoveRadius;\n    float dist = distance(aspectUv, blobCenter);\n    float blob = smoothstep(blobRadius, blobRadius + blobSoftness, dist);\n    \n    tinted.rgb = mix(blobColor, tinted.rgb, blob);\n    \n    vec4 finalColor = mix(tinted, wc, isEdge);\n    \n    // Zooming, Distorted, Symmetrical Grid with Growing Dots\n    float zoom = 1.0 + 0.6 * sin(time * 1.5);\n    vec2 gridUv = vec2(abs(uv.x - 0.5), uv.y);\n    gridUv = (gridUv - vec2(0.25, 0.5)) * zoom + vec2(0.25, 0.5);\n    gridUv.y -= time * gridSpeed; \n    gridUv += vec2(sin(gridUv.y * 15.0 + time), cos(gridUv.x * 15.0 + time)) * gridDistortion; \n    \n    float gridX = sin(gridUv.x * gridScale);\n    float gridY = sin(gridUv.y * gridScale);\n    float dots = (gridX * gridY) * 0.5 + 0.5;\n    \n    float dotSize = 0.5 + 0.45 * sin(time * 3.0);\n    float moire = smoothstep(1.0 - dotSize, 1.0 - dotSize + 0.1, dots);\n    \n    float mask = mix(1.0 - gridIntensity, 1.0 + gridIntensity, moire);\n    finalColor.rgb *= mask;\n    \n    return finalColor;\n}",
    "uniformValues": {
      "edgeThreshold": 2,
      "edgeSoftness": 0.01,
      "tintAmount": 0.64,
      "edgeWidth": 0.95,
      "darkThreshold": 1,
      "wiggleAmp": 0,
      "wiggleFreq": 1,
      "wiggleSpeed": 0,
      "blobRadius": 0.63,
      "blobSoftness": 0.5743,
      "blobMoveRadius": 0.86,
      "blobMoveSpeed": 6.8,
      "blobColor": [
        0,
        0,
        0
      ],
      "gridScale": 200,
      "gridIntensity": 0.6,
      "gridSpeed": 0.5,
      "gridDistortion": 0.05
    }
  },
  {
    "id": "recovered_timeline_5baef16e_4655_4eb4_b20d_35435497ab14",
    "name": "Symmetrical Halo Swirl Masked",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-5baef16e-4655-4eb4-b20d-35435497ab14 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Symmetrical Halo Swirl Masked\nuniform float seed; // @min 0.0 @max 100.0 @default 0.0\nuniform float colorShift; // @min 0.0 @max 10.0 @default 3.0\nuniform float intensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float shine; // @min 0.0 @max 5.0 @default 1.5\nuniform float haloSize; // @min 0.0 @max 0.05 @default 0.01\nuniform float haloIntensity; // @min 0.0 @max 2.0 @default 0.6\nuniform float darkThreshold; // @min 0.0 @max 1.0 @default 0.05\n\nvec3 palette(float t) {\n    return vec3(0.5) + vec3(0.5) * cos(6.28318 * (vec3(0.18, 0.40, 0.07) * t + vec3(0.28, 0.68, 0.30)));\n}\n\nvec2 swirl(vec2 p, float strength, float freq, float speed, float time) {\n    float r = length(p);\n    float a = atan(p.y, p.x) + strength * r * sin(speed * time + freq * r);\n    return (r + 0.03 * sin(speed * time + freq * r)) * vec2(cos(a), sin(a));\n}\n\nvec3 makeFlower(vec2 p, float level, float time) {\n    float d = length(p);\n    float a = atan(p.y, p.x) / 6.28318 + 0.5;\n    float m = smoothstep(0.8, 0.7, d);\n    float stripe = 0.5 + 0.5 * sin(6.28318 * (a * 8.0 + time));\n    vec3 col = vec3(pow(stripe, 3.0) * 5.0) * palette(d * sin(time * 0.2) * 2.0 + level);\n    return col * (smoothstep(1.0, 0.3, d / 0.75) * smoothstep(0.0, 0.4, d / 0.75)) * m;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 trueSource = texture2D(tex, uv);\n    float trueLum = dot(trueSource.rgb, vec3(0.299, 0.587, 0.114));\n    float darkMask = smoothstep(darkThreshold * 0.5, darkThreshold + 0.0001, trueLum);\n\n    float stime = time + seed * 23.45;\n    vec2 uv_sym = vec2(0.5 + abs(uv.x - 0.5), uv.y);\n    vec4 source = texture2D(tex, uv_sym);\n    \n    vec2 p = (uv_sym * 2.0 - 1.0);\n    p.x *= resolution.x / resolution.y;\n    \n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    float t_r = stime + source.r * colorShift;\n    p = swirl(p * (sin(stime * 0.4) * 0.1 + 1.1), 0.12, 0.2, 0.2 + source.b * 0.3, t_r);\n    \n    vec3 finalCol = makeFlower(p, 4.0 + source.g * colorShift, stime + source.g * colorShift);\n    vec2 p_iter = p * 0.25;\n    for (int i = 0; i < 2; i++) {\n        p_iter = abs(fract(p_iter * 2.1) - 0.5) * 2.0;\n        float fade = smoothstep(1.0, 0.7, p_iter.x) * smoothstep(1.0, 0.7, p_iter.y);\n        finalCol += (makeFlower(p_iter * exp(-length(p * 0.25)), float(i) + source.r * colorShift, stime + source.b * colorShift) * fade / (float(i) + 1.5));\n    }\n    \n    vec3 blended = mix(source.rgb, finalCol, intensity * smoothstep(0.0, 0.4, lum));\n    blended += blended * (pow(lum, 3.0) * shine * 0.5 * (0.5 + 0.5 * sin(stime * 2.0)));\n    \n    // Halo Effect\n    vec3 halo = vec3(0.0);\n    halo += texture2D(tex, uv + vec2(haloSize, haloSize)).rgb;\n    halo += texture2D(tex, uv + vec2(-haloSize, haloSize)).rgb;\n    halo += texture2D(tex, uv + vec2(haloSize, -haloSize)).rgb;\n    halo += texture2D(tex, uv + vec2(-haloSize, -haloSize)).rgb;\n    blended += (halo * 0.25) * haloIntensity * (0.5 + 0.5 * sin(stime + lum * 10.0));\n\n    // Mask out the effect on dark backgrounds\n    blended = mix(trueSource.rgb, blended, darkMask);\n\n    return vec4(blended, trueSource.a);\n}",
    "uniformValues": {
      "seed": 79,
      "colorShift": 4.9,
      "intensity": 1,
      "shine": 3.15,
      "haloSize": 0.047,
      "haloIntensity": 0.48,
      "darkThreshold": 0.6
    }
  },
  {
    "id": "recovered_timeline_ee9698b3_8529_4dea_8f2d_2f62fd7730e9",
    "name": "Multi-Wave Psytrance",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-ee9698b3-8529-4dea-8f2d-2f62fd7730e9 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Multi-Wave Psytrance\nuniform float intensity; // @min 0.0 @max 5.0 @default 1.5\nuniform float edge_boost; // @min 0.0 @max 10.0 @default 4.0\nuniform float color_speed; // @min 0.0 @max 5.0 @default 2.0\nuniform float loop_speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float pulse_amount; // @min 0.0 @max 2.0 @default 0.5\nuniform float hue_shift; // @min 0.0 @max 10.0 @default 3.0\nuniform float num_waves; // @min 1.0 @max 20.0 @default 3.0\nuniform float black_tolerance; // @min 0.0 @max 0.5 @default 0.05\nuniform float black_spread; // @min 0.0 @max 10.0 @default 2.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 texel = 1.0 / resolution;\n\n    // Create a seamless looping variable using sine wave\n    float loop_var = sin(time * loop_speed * 3.14159265);\n    float loop_norm = loop_var * 0.5 + 0.5;\n\n    // Modulate parameters with the loop for a breathing animation\n    float current_edge_boost = edge_boost * (1.0 + loop_norm * pulse_amount);\n\n    // Base luminance for depth mapping and masking\n    vec4 center = texture2D(tex, uv);\n    vec3 luma_weights = vec3(0.299, 0.587, 0.114);\n    float lum = dot(center.rgb, luma_weights);\n\n    // Sample immediate neighbors to extract fake normals/depth\n    float l = dot(texture2D(tex, uv - vec2(texel.x, 0.0)).rgb, vec3(0.333));\n    float r = dot(texture2D(tex, uv + vec2(texel.x, 0.0)).rgb, vec3(0.333));\n    float u = dot(texture2D(tex, uv - vec2(0.0, texel.y)).rgb, vec3(0.333));\n    float d = dot(texture2D(tex, uv + vec2(0.0, texel.y)).rgb, vec3(0.333));\n\n    // Calculate gradients (fake 3D curvature)\n    float dx = r - l;\n    float dy = d - u;\n    float edge = length(vec2(dx, dy));\n\n    // Sample further neighbors to find nearby black pixels (dilate the black area)\n    float lum_l = dot(texture2D(tex, uv - vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\n    float lum_r = dot(texture2D(tex, uv + vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\n    float lum_u = dot(texture2D(tex, uv - vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\n    float lum_d = dot(texture2D(tex, uv + vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\n\n    // Find the minimum luminance in the expanded neighborhood\n    float min_lum = min(lum, min(min(lum_l, lum_r), min(lum_u, lum_d)));\n\n    // Psychedelic color cycling with multiple waves\n    vec3 phase = num_waves * (lum * 10.0 + uv.xyx * hue_shift);\n    vec3 psyColor = 0.5 + 0.5 * cos(phase + time * color_speed + vec3(0.0, 2.0, 4.0) + loop_var);\n\n    // Mask out pixels if they or their neighbors are below the black tolerance\n    float mask = smoothstep(black_tolerance, black_tolerance + 0.05, min_lum);\n\n    // Output ONLY the glowing psy colors on the edges, masked by the expanded black area\n    vec3 finalColor = psyColor * edge * current_edge_boost * mask * intensity;\n\n    // Multiply alpha by mask to completely remove the black and surrounding pixels\n    return vec4(finalColor, center.a * mask);\n}",
    "uniformValues": {
      "intensity": 3.35,
      "edge_boost": 10,
      "color_speed": 4.65,
      "loop_speed": 2.991,
      "pulse_amount": 0.08,
      "hue_shift": 10,
      "num_waves": 4.42,
      "black_tolerance": 0.07,
      "black_spread": 1.3
    }
  },
  {
    "id": "recovered_timeline_1cab9f8c_921c_47ca_afea_98cbebcb984d",
    "name": "Multi-Wave Psytrance 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-1cab9f8c-921c-47ca-afea-98cbebcb984d in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Multi-Wave Psytrance\nuniform float intensity; // @min 0.0 @max 5.0 @default 1.5\nuniform float edge_boost; // @min 0.0 @max 10.0 @default 4.0\nuniform float color_speed; // @min 0.0 @max 5.0 @default 2.0\nuniform float loop_speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float pulse_amount; // @min 0.0 @max 2.0 @default 0.5\nuniform float hue_shift; // @min 0.0 @max 10.0 @default 3.0\nuniform float num_waves; // @min 1.0 @max 20.0 @default 3.0\nuniform float black_tolerance; // @min 0.0 @max 0.5 @default 0.05\nuniform float black_spread; // @min 0.0 @max 10.0 @default 2.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 texel = 1.0 / resolution;\n\n    // Create a seamless looping variable using sine wave\n    float loop_var = sin(time * loop_speed * 3.14159265);\n    float loop_norm = loop_var * 0.5 + 0.5;\n\n    // Modulate parameters with the loop for a breathing animation\n    float current_edge_boost = edge_boost * (1.0 + loop_norm * pulse_amount);\n\n    // Base luminance for depth mapping and masking\n    vec4 center = texture2D(tex, uv);\n    vec3 luma_weights = vec3(0.299, 0.587, 0.114);\n    float lum = dot(center.rgb, luma_weights);\n\n    // Sample immediate neighbors to extract fake normals/depth\n    float l = dot(texture2D(tex, uv - vec2(texel.x, 0.0)).rgb, vec3(0.333));\n    float r = dot(texture2D(tex, uv + vec2(texel.x, 0.0)).rgb, vec3(0.333));\n    float u = dot(texture2D(tex, uv - vec2(0.0, texel.y)).rgb, vec3(0.333));\n    float d = dot(texture2D(tex, uv + vec2(0.0, texel.y)).rgb, vec3(0.333));\n\n    // Calculate gradients (fake 3D curvature)\n    float dx = r - l;\n    float dy = d - u;\n    float edge = length(vec2(dx, dy));\n\n    // Sample further neighbors to find nearby black pixels (dilate the black area)\n    float lum_l = dot(texture2D(tex, uv - vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\n    float lum_r = dot(texture2D(tex, uv + vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\n    float lum_u = dot(texture2D(tex, uv - vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\n    float lum_d = dot(texture2D(tex, uv + vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\n\n    // Find the minimum luminance in the expanded neighborhood\n    float min_lum = min(lum, min(min(lum_l, lum_r), min(lum_u, lum_d)));\n\n    // Psychedelic color cycling with multiple waves\n    vec3 phase = num_waves * (lum * 10.0 + uv.xyx * hue_shift);\n    vec3 psyColor = 0.5 + 0.5 * cos(phase + time * color_speed + vec3(0.0, 2.0, 4.0) + loop_var);\n\n    // Mask out pixels if they or their neighbors are below the black tolerance\n    float mask = smoothstep(black_tolerance, black_tolerance + 0.05, min_lum);\n\n    // Output ONLY the glowing psy colors on the edges, masked by the expanded black area\n    vec3 finalColor = psyColor * edge * current_edge_boost * mask * intensity;\n\n    // Multiply alpha by mask to completely remove the black and surrounding pixels\n    return vec4(finalColor, center.a * mask);\n}",
    "uniformValues": {
      "intensity": 4.95,
      "edge_boost": 2.8,
      "color_speed": 2.7,
      "loop_speed": 0.1,
      "pulse_amount": 0,
      "hue_shift": 0.9,
      "num_waves": 1.57,
      "black_tolerance": 0.07,
      "black_spread": 2.3
    }
  },
  {
    "id": "recovered_timeline_f40cd631_6806_43db_b7f5_9ff0273cbefd",
    "name": "Multi-Wave Psytrance 3",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-f40cd631-6806-43db-b7f5-9ff0273cbefd in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Multi-Wave Psytrance\nuniform float intensity; // @min 0.0 @max 5.0 @default 1.5\nuniform float edge_boost; // @min 0.0 @max 10.0 @default 4.0\nuniform float color_speed; // @min 0.0 @max 5.0 @default 2.0\nuniform float loop_speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float pulse_amount; // @min 0.0 @max 2.0 @default 0.5\nuniform float hue_shift; // @min 0.0 @max 10.0 @default 3.0\nuniform float num_waves; // @min 1.0 @max 20.0 @default 3.0\nuniform float black_tolerance; // @min 0.0 @max 0.5 @default 0.05\nuniform float black_spread; // @min 0.0 @max 10.0 @default 2.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 texel = 1.0 / resolution;\n\n    // Create a seamless looping variable using sine wave\n    float loop_var = sin(time * loop_speed * 3.14159265);\n    float loop_norm = loop_var * 0.5 + 0.5;\n\n    // Modulate parameters with the loop for a breathing animation\n    float current_edge_boost = edge_boost * (1.0 + loop_norm * pulse_amount);\n\n    // Base luminance for depth mapping and masking\n    vec4 center = texture2D(tex, uv);\n    vec3 luma_weights = vec3(0.299, 0.587, 0.114);\n    float lum = dot(center.rgb, luma_weights);\n\n    // Sample immediate neighbors to extract fake normals/depth\n    float l = dot(texture2D(tex, uv - vec2(texel.x, 0.0)).rgb, vec3(0.333));\n    float r = dot(texture2D(tex, uv + vec2(texel.x, 0.0)).rgb, vec3(0.333));\n    float u = dot(texture2D(tex, uv - vec2(0.0, texel.y)).rgb, vec3(0.333));\n    float d = dot(texture2D(tex, uv + vec2(0.0, texel.y)).rgb, vec3(0.333));\n\n    // Calculate gradients (fake 3D curvature)\n    float dx = r - l;\n    float dy = d - u;\n    float edge = length(vec2(dx, dy));\n\n    // Sample further neighbors to find nearby black pixels (dilate the black area)\n    float lum_l = dot(texture2D(tex, uv - vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\n    float lum_r = dot(texture2D(tex, uv + vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\n    float lum_u = dot(texture2D(tex, uv - vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\n    float lum_d = dot(texture2D(tex, uv + vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\n\n    // Find the minimum luminance in the expanded neighborhood\n    float min_lum = min(lum, min(min(lum_l, lum_r), min(lum_u, lum_d)));\n\n    // Psychedelic color cycling with multiple waves\n    vec3 phase = num_waves * (lum * 10.0 + uv.xyx * hue_shift);\n    vec3 psyColor = 0.5 + 0.5 * cos(phase + time * color_speed + vec3(0.0, 2.0, 4.0) + loop_var);\n\n    // Mask out pixels if they or their neighbors are below the black tolerance\n    float mask = smoothstep(black_tolerance, black_tolerance + 0.05, min_lum);\n\n    // Output ONLY the glowing psy colors on the edges, masked by the expanded black area\n    vec3 finalColor = psyColor * edge * current_edge_boost * mask * intensity;\n\n    // Multiply alpha by mask to completely remove the black and surrounding pixels\n    return vec4(finalColor, center.a * mask);\n}",
    "uniformValues": {
      "intensity": 5,
      "edge_boost": 0.4,
      "color_speed": 4.95,
      "loop_speed": 0.884,
      "pulse_amount": 2,
      "hue_shift": 10,
      "num_waves": 2.14,
      "black_tolerance": 0.1,
      "black_spread": 6.4
    }
  },
  {
    "id": "recovered_timeline_2fa29048_9151_432e_92bc_9a2e7700228f",
    "name": "Psytrance Border Snake 3D",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-2fa29048-9151-432e-92bc-9a2e7700228f in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psytrance Border Snake 3D\nuniform float intensity; // @min 0.0 @max 5.0 @default 1.5\nuniform float edge_boost; // @min 0.0 @max 10.0 @default 4.0\nuniform float color_speed; // @min 0.0 @max 5.0 @default 2.0\nuniform float loop_speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float pulse_amount; // @min 0.0 @max 2.0 @default 0.5\nuniform float hue_shift; // @min 0.0 @max 10.0 @default 3.0\nuniform float num_waves; // @min 1.0 @max 20.0 @default 3.0\nuniform float black_tolerance; // @min 0.0 @max 0.5 @default 0.05\nuniform float black_spread; // @min 0.0 @max 10.0 @default 2.0\nuniform float snake_speed; // @min 0.0 @max 20.0 @default 8.0\nuniform float snake_brightness; // @min 0.0 @max 10.0 @default 4.0\nuniform bool symmetrical; // @default false\nuniform float depth_level; // @min 0.0 @max 10.0 @default 1.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 texel = 1.0 / resolution;\n\n    // Create a seamless looping variable using sine wave\n    float loop_var = sin(time * loop_speed * 3.14159265);\n    float loop_norm = loop_var * 0.5 + 0.5;\n\n    // Modulate parameters with the loop for a breathing animation\n    float current_edge_boost = edge_boost * (1.0 + loop_norm * pulse_amount);\n\n    // Base luminance for depth mapping and masking\n    vec4 center = texture2D(tex, uv);\n    vec3 luma_weights = vec3(0.299, 0.587, 0.114);\n    float lum = dot(center.rgb, luma_weights);\n\n    // Sample immediate neighbors to extract fake normals/depth\n    float l = dot(texture2D(tex, uv - vec2(texel.x, 0.0)).rgb, vec3(0.333));\n    float r = dot(texture2D(tex, uv + vec2(texel.x, 0.0)).rgb, vec3(0.333));\n    float u = dot(texture2D(tex, uv - vec2(0.0, texel.y)).rgb, vec3(0.333));\n    float d = dot(texture2D(tex, uv + vec2(0.0, texel.y)).rgb, vec3(0.333));\n\n    // Calculate gradients (fake 3D curvature) scaled by depth_level\n    float dx = (r - l) * depth_level;\n    float dy = (d - u) * depth_level;\n    float edge = length(vec2(dx, dy));\n\n    // Sample further neighbors to find nearby black pixels (dilate the black area)\n    float lum_l = dot(texture2D(tex, uv - vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\n    float lum_r = dot(texture2D(tex, uv + vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\n    float lum_u = dot(texture2D(tex, uv - vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\n    float lum_d = dot(texture2D(tex, uv + vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\n\n    // Find the minimum luminance in the expanded neighborhood\n    float min_lum = min(lum, min(min(lum_l, lum_r), min(lum_u, lum_d)));\n\n    // Psychedelic color cycling with multiple waves\n    vec3 phase = num_waves * (lum * 10.0 + uv.xyx * hue_shift);\n    vec3 psyColor = 0.5 + 0.5 * cos(phase + time * color_speed + vec3(0.0, 2.0, 4.0) + loop_var);\n\n    // Mask out pixels if they or their neighbors are below the black tolerance\n    float mask = smoothstep(black_tolerance, black_tolerance + 0.05, min_lum);\n\n    // Calculate gradient angle for the snake effect\n    float angle = atan(dy, dx);\n    \n    // Create the snake border effect flowing along the edges (count fixed to 1)\n    float snake_val = sin(angle + lum * 20.0 - time * snake_speed);\n    \n    if (symmetrical) {\n        float snake_val2 = sin(-angle + lum * 20.0 - time * snake_speed);\n        snake_val = max(snake_val, snake_val2);\n    }\n    \n    float snake_mask = smoothstep(0.7, 0.95, snake_val);\n    vec3 snakeColor = vec3(1.0) * edge * snake_mask * snake_brightness;\n\n    // Combine psytrance waves with the new snake border layer\n    vec3 finalColor = (psyColor * edge * current_edge_boost + snakeColor) * mask * intensity;\n\n    // Multiply alpha by mask to completely remove the black and surrounding pixels\n    return vec4(finalColor, center.a * mask);\n}",
    "uniformValues": {
      "intensity": 0.25,
      "edge_boost": 0.7,
      "color_speed": 0.5,
      "loop_speed": 1.913,
      "pulse_amount": 0.1,
      "hue_shift": 2.1,
      "num_waves": 17.15,
      "black_tolerance": 0.05,
      "black_spread": 9.9,
      "snake_speed": 19.2,
      "snake_brightness": 7.5,
      "symmetrical": true,
      "depth_level": 6.9
    }
  },
  {
    "id": "recovered_timeline_bc907b8e_f19c_47c5_89d1_03cd415c9868",
    "name": "Multi-Wave Psytrance 4",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-bc907b8e-f19c-47c5-89d1-03cd415c9868 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Multi-Wave Psytrance\nuniform float intensity; // @min 0.0 @max 5.0 @default 1.5\nuniform float edge_boost; // @min 0.0 @max 10.0 @default 4.0\nuniform float color_speed; // @min 0.0 @max 5.0 @default 2.0\nuniform float loop_speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float pulse_amount; // @min 0.0 @max 2.0 @default 0.5\nuniform float hue_shift; // @min 0.0 @max 10.0 @default 3.0\nuniform float num_waves; // @min 1.0 @max 20.0 @default 3.0\nuniform float black_tolerance; // @min 0.0 @max 0.5 @default 0.05\nuniform float black_spread; // @min 0.0 @max 10.0 @default 2.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 texel = 1.0 / resolution;\n\n    // Create a seamless looping variable using sine wave\n    float loop_var = sin(time * loop_speed * 3.14159265);\n    float loop_norm = loop_var * 0.5 + 0.5;\n\n    // Modulate parameters with the loop for a breathing animation\n    float current_edge_boost = edge_boost * (1.0 + loop_norm * pulse_amount);\n\n    // Base luminance for depth mapping and masking\n    vec4 center = texture2D(tex, uv);\n    vec3 luma_weights = vec3(0.299, 0.587, 0.114);\n    float lum = dot(center.rgb, luma_weights);\n\n    // Sample immediate neighbors to extract fake normals/depth\n    float l = dot(texture2D(tex, uv - vec2(texel.x, 0.0)).rgb, vec3(0.333));\n    float r = dot(texture2D(tex, uv + vec2(texel.x, 0.0)).rgb, vec3(0.333));\n    float u = dot(texture2D(tex, uv - vec2(0.0, texel.y)).rgb, vec3(0.333));\n    float d = dot(texture2D(tex, uv + vec2(0.0, texel.y)).rgb, vec3(0.333));\n\n    // Calculate gradients (fake 3D curvature)\n    float dx = r - l;\n    float dy = d - u;\n    float edge = length(vec2(dx, dy));\n\n    // Sample further neighbors to find nearby black pixels (dilate the black area)\n    float lum_l = dot(texture2D(tex, uv - vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\n    float lum_r = dot(texture2D(tex, uv + vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\n    float lum_u = dot(texture2D(tex, uv - vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\n    float lum_d = dot(texture2D(tex, uv + vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\n\n    // Find the minimum luminance in the expanded neighborhood\n    float min_lum = min(lum, min(min(lum_l, lum_r), min(lum_u, lum_d)));\n\n    // Psychedelic color cycling with multiple waves\n    vec3 phase = num_waves * (lum * 10.0 + uv.xyx * hue_shift);\n    vec3 psyColor = 0.5 + 0.5 * cos(phase + time * color_speed + vec3(0.0, 2.0, 4.0) + loop_var);\n\n    // Mask out pixels if they or their neighbors are below the black tolerance\n    float mask = smoothstep(black_tolerance, black_tolerance + 0.05, min_lum);\n\n    // Output ONLY the glowing psy colors on the edges, masked by the expanded black area\n    vec3 finalColor = psyColor * edge * current_edge_boost * mask * intensity;\n\n    // Multiply alpha by mask to completely remove the black and surrounding pixels\n    return vec4(finalColor, center.a * mask);\n}",
    "uniformValues": {
      "intensity": 2.65,
      "edge_boost": 3.1,
      "color_speed": 5,
      "loop_speed": 0.688,
      "pulse_amount": 0.16,
      "hue_shift": 5.9,
      "num_waves": 2.52,
      "black_tolerance": 0.095,
      "black_spread": 4.2
    }
  },
  {
    "id": "recovered_timeline_4265ae1b_795d_48d9_a18f_266b1925bc32",
    "name": "Psytrance Border Snake 3D 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-4265ae1b-795d-48d9-a18f-266b1925bc32 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psytrance Border Snake 3D\nuniform float intensity; // @min 0.0 @max 5.0 @default 1.5\nuniform float edge_boost; // @min 0.0 @max 10.0 @default 4.0\nuniform float color_speed; // @min 0.0 @max 5.0 @default 2.0\nuniform float loop_speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float pulse_amount; // @min 0.0 @max 2.0 @default 0.5\nuniform float hue_shift; // @min 0.0 @max 10.0 @default 3.0\nuniform float num_waves; // @min 1.0 @max 20.0 @default 3.0\nuniform float black_tolerance; // @min 0.0 @max 0.5 @default 0.05\nuniform float black_spread; // @min 0.0 @max 10.0 @default 2.0\nuniform float snake_speed; // @min 0.0 @max 20.0 @default 8.0\nuniform float snake_brightness; // @min 0.0 @max 10.0 @default 4.0\nuniform bool symmetrical; // @default false\nuniform float depth_level; // @min 0.0 @max 10.0 @default 1.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 texel = 1.0 / resolution;\n\n    // Create a seamless looping variable using sine wave\n    float loop_var = sin(time * loop_speed * 3.14159265);\n    float loop_norm = loop_var * 0.5 + 0.5;\n\n    // Modulate parameters with the loop for a breathing animation\n    float current_edge_boost = edge_boost * (1.0 + loop_norm * pulse_amount);\n\n    // Base luminance for depth mapping and masking\n    vec4 center = texture2D(tex, uv);\n    vec3 luma_weights = vec3(0.299, 0.587, 0.114);\n    float lum = dot(center.rgb, luma_weights);\n\n    // Sample immediate neighbors to extract fake normals/depth\n    float l = dot(texture2D(tex, uv - vec2(texel.x, 0.0)).rgb, vec3(0.333));\n    float r = dot(texture2D(tex, uv + vec2(texel.x, 0.0)).rgb, vec3(0.333));\n    float u = dot(texture2D(tex, uv - vec2(0.0, texel.y)).rgb, vec3(0.333));\n    float d = dot(texture2D(tex, uv + vec2(0.0, texel.y)).rgb, vec3(0.333));\n\n    // Calculate gradients (fake 3D curvature) scaled by depth_level\n    float dx = (r - l) * depth_level;\n    float dy = (d - u) * depth_level;\n    float edge = length(vec2(dx, dy));\n\n    // Sample further neighbors to find nearby black pixels (dilate the black area)\n    float lum_l = dot(texture2D(tex, uv - vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\n    float lum_r = dot(texture2D(tex, uv + vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\n    float lum_u = dot(texture2D(tex, uv - vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\n    float lum_d = dot(texture2D(tex, uv + vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\n\n    // Find the minimum luminance in the expanded neighborhood\n    float min_lum = min(lum, min(min(lum_l, lum_r), min(lum_u, lum_d)));\n\n    // Psychedelic color cycling with multiple waves\n    vec3 phase = num_waves * (lum * 10.0 + uv.xyx * hue_shift);\n    vec3 psyColor = 0.5 + 0.5 * cos(phase + time * color_speed + vec3(0.0, 2.0, 4.0) + loop_var);\n\n    // Mask out pixels if they or their neighbors are below the black tolerance\n    float mask = smoothstep(black_tolerance, black_tolerance + 0.05, min_lum);\n\n    // Calculate gradient angle for the snake effect\n    float angle = atan(dy, dx);\n    \n    // Create the snake border effect flowing along the edges (count fixed to 1)\n    float snake_val = sin(angle + lum * 20.0 - time * snake_speed);\n    \n    if (symmetrical) {\n        float snake_val2 = sin(-angle + lum * 20.0 - time * snake_speed);\n        snake_val = max(snake_val, snake_val2);\n    }\n    \n    float snake_mask = smoothstep(0.7, 0.95, snake_val);\n    vec3 snakeColor = vec3(1.0) * edge * snake_mask * snake_brightness;\n\n    // Combine psytrance waves with the new snake border layer\n    vec3 finalColor = (psyColor * edge * current_edge_boost + snakeColor) * mask * intensity;\n\n    // Multiply alpha by mask to completely remove the black and surrounding pixels\n    return vec4(finalColor, center.a * mask);\n}",
    "uniformValues": {
      "intensity": 0.8,
      "edge_boost": 0,
      "color_speed": 0,
      "loop_speed": 0.1,
      "pulse_amount": 0,
      "hue_shift": 0.2,
      "num_waves": 1.95,
      "black_tolerance": 0.085,
      "black_spread": 1.4,
      "snake_speed": 5.8,
      "snake_brightness": 10,
      "symmetrical": false,
      "depth_level": 1
    }
  },
  {
    "id": "recovered_timeline_de42593d_1a19_48c5_86f2_dff5e77d44f2",
    "name": "Sharp Neon Grid Mapping",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-de42593d-1a19-48c5-86f2-dff5e77d44f2 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Sharp Neon Grid Mapping\nuniform float speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float gridScale; // @min 5.0 @max 50.0 @default 30.0\nuniform float intensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float wrapStrength; // @min 0.0 @max 2.0 @default 1.0\nuniform float coreThickness; // @min 0.01 @max 0.2 @default 0.03\nuniform float glowThickness; // @min 0.01 @max 0.5 @default 0.1\nuniform float bgThreshold; // @min 0.0 @max 0.5 @default 0.05\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    // Sample the base texture (the statue)\n    vec4 baseColor = texture2D(tex, uv);\n    vec3 lumCoeff = vec3(0.299, 0.587, 0.114);\n    float luma = dot(baseColor.rgb, lumCoeff);\n    \n    // Create a sharp mask to protect the black background\n    float bgMask = smoothstep(bgThreshold, bgThreshold + 0.02, luma);\n    \n    // Calculate pseudo-normals from luminance gradient to detect slopes\n    vec2 eps = vec2(2.0) / resolution;\n    float lumaR = dot(texture2D(tex, uv + vec2(eps.x, 0.0)).rgb, lumCoeff);\n    float lumaU = dot(texture2D(tex, uv + vec2(0.0, eps.y)).rgb, lumCoeff);\n    vec2 normalXY = vec2(lumaR - luma, lumaU - luma) * 15.0; // Amplify slope\n    \n    // Create a psychedelic gradient based purely on the 3D depth (luminance)\n    vec3 phase = vec3(0.0, 2.09, 4.18); // RGB phase offsets\n    vec3 psychColor = 0.5 + 0.5 * cos(time * speed + luma * 8.0 + phase);\n    \n    // 3D Wrapping Logic:\n    // 1. Bulge effect: push UVs outward where it's dark (edges of the sphere)\n    vec2 centeredUv = uv - 0.5;\n    vec2 wrappedUv = uv + centeredUv * (1.0 - luma) * wrapStrength * 0.5;\n    \n    // 2. Slope effect: bend the grid along the calculated surface normals\n    wrappedUv += normalXY * wrapStrength * 0.15;\n    \n    // Apply scale and scrolling\n    vec2 gridUv = wrappedUv * gridScale;\n    gridUv.y -= time * speed * 0.5;\n    \n    // Calculate distance to the nearest grid line\n    vec2 gridDist = abs(fract(gridUv + 0.5) - 0.5);\n    float dist = min(gridDist.x, gridDist.y);\n    \n    // Calculate anti-aliasing factor based on resolution for sharp, non-pixelated lines\n    float aa = (gridScale / resolution.y) * 1.5;\n    \n    // Create the black inner core and the neon outer border with sharp, anti-aliased edges\n    float core = 1.0 - smoothstep(max(0.0, coreThickness - aa), coreThickness + aa, dist);\n    float glow = 1.0 - smoothstep(max(0.0, coreThickness + glowThickness - aa * 2.0), coreThickness + glowThickness + aa * 2.0, dist);\n    float border = clamp(glow - core, 0.0, 1.0);\n    \n    // Blend the gradient into the statue's shadows/highlights\n    vec3 mappedColor = mix(baseColor.rgb, psychColor * luma * 2.0, intensity * 0.7);\n    \n    // Apply the neon border\n    mappedColor = mix(mappedColor, psychColor * 2.5, border * intensity);\n    \n    // Apply the black core of the grid\n    mappedColor = mix(mappedColor, vec3(0.0), core * intensity);\n    \n    // Mask out the background using the threshold\n    vec3 finalColor = mix(baseColor.rgb, mappedColor, bgMask);\n    \n    return vec4(finalColor, baseColor.a);\n}",
    "uniformValues": {
      "speed": 1.423,
      "gridScale": 6.8,
      "intensity": 0.96,
      "wrapStrength": 1.68,
      "coreThickness": 0.2,
      "glowThickness": 0.5,
      "bgThreshold": 0.105
    }
  },
  {
    "id": "recovered_timeline_94797026_2480_45fb_b342_2ac958345afd",
    "name": "Sharp Neon Grid Mapping 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-94797026-2480-45fb-b342-2ac958345afd in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Sharp Neon Grid Mapping\nuniform float speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float gridScale; // @min 5.0 @max 50.0 @default 30.0\nuniform float intensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float wrapStrength; // @min 0.0 @max 2.0 @default 1.0\nuniform float coreThickness; // @min 0.01 @max 0.2 @default 0.03\nuniform float glowThickness; // @min 0.01 @max 0.5 @default 0.1\nuniform float bgThreshold; // @min 0.0 @max 0.5 @default 0.05\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    // Sample the base texture (the statue)\n    vec4 baseColor = texture2D(tex, uv);\n    vec3 lumCoeff = vec3(0.299, 0.587, 0.114);\n    float luma = dot(baseColor.rgb, lumCoeff);\n    \n    // Create a sharp mask to protect the black background\n    float bgMask = smoothstep(bgThreshold, bgThreshold + 0.02, luma);\n    \n    // Calculate pseudo-normals from luminance gradient to detect slopes\n    vec2 eps = vec2(2.0) / resolution;\n    float lumaR = dot(texture2D(tex, uv + vec2(eps.x, 0.0)).rgb, lumCoeff);\n    float lumaU = dot(texture2D(tex, uv + vec2(0.0, eps.y)).rgb, lumCoeff);\n    vec2 normalXY = vec2(lumaR - luma, lumaU - luma) * 15.0; // Amplify slope\n    \n    // Create a psychedelic gradient based purely on the 3D depth (luminance)\n    vec3 phase = vec3(0.0, 2.09, 4.18); // RGB phase offsets\n    vec3 psychColor = 0.5 + 0.5 * cos(time * speed + luma * 8.0 + phase);\n    \n    // 3D Wrapping Logic:\n    // 1. Bulge effect: push UVs outward where it's dark (edges of the sphere)\n    vec2 centeredUv = uv - 0.5;\n    vec2 wrappedUv = uv + centeredUv * (1.0 - luma) * wrapStrength * 0.5;\n    \n    // 2. Slope effect: bend the grid along the calculated surface normals\n    wrappedUv += normalXY * wrapStrength * 0.15;\n    \n    // Apply scale and scrolling\n    vec2 gridUv = wrappedUv * gridScale;\n    gridUv.y -= time * speed * 0.5;\n    \n    // Calculate distance to the nearest grid line\n    vec2 gridDist = abs(fract(gridUv + 0.5) - 0.5);\n    float dist = min(gridDist.x, gridDist.y);\n    \n    // Calculate anti-aliasing factor based on resolution for sharp, non-pixelated lines\n    float aa = (gridScale / resolution.y) * 1.5;\n    \n    // Create the black inner core and the neon outer border with sharp, anti-aliased edges\n    float core = 1.0 - smoothstep(max(0.0, coreThickness - aa), coreThickness + aa, dist);\n    float glow = 1.0 - smoothstep(max(0.0, coreThickness + glowThickness - aa * 2.0), coreThickness + glowThickness + aa * 2.0, dist);\n    float border = clamp(glow - core, 0.0, 1.0);\n    \n    // Blend the gradient into the statue's shadows/highlights\n    vec3 mappedColor = mix(baseColor.rgb, psychColor * luma * 2.0, intensity * 0.7);\n    \n    // Apply the neon border\n    mappedColor = mix(mappedColor, psychColor * 2.5, border * intensity);\n    \n    // Apply the black core of the grid\n    mappedColor = mix(mappedColor, vec3(0.0), core * intensity);\n    \n    // Mask out the background using the threshold\n    vec3 finalColor = mix(baseColor.rgb, mappedColor, bgMask);\n    \n    return vec4(finalColor, baseColor.a);\n}",
    "uniformValues": {
      "speed": 4.853,
      "gridScale": 14.9,
      "intensity": 0.34,
      "wrapStrength": 0.48,
      "coreThickness": 0.181,
      "glowThickness": 0.0149,
      "bgThreshold": 0.09
    }
  },
  {
    "id": "recovered_timeline_a2b37be4_859c_457d_918c_abeeb94bb7bc",
    "name": "Psychedelic Dual Center Edges Clean",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-a2b37be4-859c-457d-918c-abeeb94bb7bc in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psychedelic Dual Center Edges Clean\nuniform float speed; // @min 0.0 @max 2.0 @default 0.5\nuniform float distortion; // @min 0.0 @max 0.2 @default 0.05\nuniform float scale; // @min 1.0 @max 10.0 @default 3.0\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.25\nuniform float centerY; // @min 0.0 @max 1.0 @default 0.5\nuniform float radialFreq; // @min 1.0 @max 30.0 @default 15.0\nuniform float symmFreq; // @min 1.0 @max 20.0 @default 6.0\nuniform float psychIntensity; // @min 0.0 @max 1.0 @default 0.8\nuniform bool mirrorX; // @default true\nuniform float edgeIntensity; // @min 0.0 @max 5.0 @default 2.0\nuniform float edgeThreshold; // @min 0.0 @max 1.0 @default 0.1\nuniform vec3 edgeColor; // @default 1.0,1.0,1.0\nuniform vec3 colorHigh; // @default 1.0,0.8,0.4\nuniform vec3 colorMid; // @default 0.2,0.6,0.8\nuniform vec3 colorLow; // @default 0.1,0.1,0.3\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 workUV = uv;\n    float flip = 1.0;\n    \n    // Horizontal symmetrical flip to create two centers\n    if (mirrorX && workUV.x > 0.5) {\n        workUV.x = 1.0 - workUV.x;\n        flip = -1.0;\n    }\n\n    vec2 p = workUV * (scale * 5.0);\n    float t = time * speed;\n    \n    // 1. Base fluid motion\n    vec2 q = vec2(0.0);\n    q.x = sin(p.x + t) + cos(p.y * 1.2 - t);\n    q.y = cos(p.x * 1.1 - t) + sin(p.y + t);\n    \n    vec2 r = vec2(0.0);\n    r.x = sin(p.x + q.x * 2.0 + t * 1.5) + cos(p.y + q.y * 1.5 - t);\n    r.y = cos(p.x + q.x * 1.5 - t * 1.2) + sin(p.y + q.y * 2.0 + t);\n    r = r * 0.25 + 0.5;\n\n    // 2. Radial symmetrical wave (Center can be moved)\n    vec2 centerPos = vec2(centerX, centerY);\n    vec2 center = workUV - centerPos;\n    float dist = length(center);\n    float angle = atan(center.y, center.x);\n    \n    float radial = sin(dist * scale * radialFreq - t * 4.0);\n    vec2 radialOffset = center * radial * distortion * 1.5;\n\n    // 3. Second symmetrical layer (Angular/Star-like wave)\n    float symm = cos(angle * symmFreq + dist * scale * 5.0 + t * 3.0);\n    vec2 symmOffset = vec2(cos(angle), sin(angle)) * symm * distortion * 0.8;\n\n    // 4. Psychedelic wave using similar trig noise mapped to polar coordinates\n    vec2 psychP = vec2(angle * 4.0, dist * scale * 8.0);\n    float psychNoise = sin(psychP.x + t * 2.0) * cos(psychP.y - t * 1.5);\n    vec2 psychOffset = vec2(cos(psychNoise * 6.28318), sin(psychNoise * 6.28318)) * distortion * psychIntensity;\n\n    // Combine all offsets\n    vec2 finalOffset = (r - 0.5) * distortion + radialOffset + symmOffset + psychOffset;\n    \n    // Flip the X offset back for the mirrored side to maintain true symmetry\n    finalOffset.x *= flip;\n    \n    vec2 offsetUV = uv + finalOffset;\n    \n    // Sample the original texture with the combined distortions\n    vec4 color = texture2D(tex, offsetUV);\n    \n    // Edge detection on the distorted texture\n    vec2 texel = 1.0 / resolution;\n    float l0 = dot(color.rgb, vec3(0.299, 0.587, 0.114));\n    float l1 = dot(texture2D(tex, offsetUV + vec2(texel.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));\n    float l2 = dot(texture2D(tex, offsetUV + vec2(0.0, texel.y)).rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Calculate edge strength with strict threshold to remove artifacts\n    float edgeRaw = length(vec2(l1 - l0, l2 - l0));\n    float edge = smoothstep(edgeThreshold * 0.2, edgeThreshold * 0.2 + 0.05, edgeRaw) * edgeIntensity;\n    \n    // Strictly mask out dark areas to prevent stray pixels\n    float notDark = smoothstep(0.15, 0.25, l0);\n    edge *= notDark;\n    \n    // Faux 3D shading based on the fluid gradients\n    float shade = (r.x - r.y) * 0.5 + 0.5;\n    vec3 grad = mix(colorLow, colorMid, smoothstep(0.0, 0.5, shade));\n    grad = mix(grad, colorHigh, smoothstep(0.5, 1.0, shade));\n    \n    // Psychedelic color blend based on the polar noise\n    vec3 psychColor = vec3(\n        sin(psychNoise * 3.14159 + t) * 0.5 + 0.5,\n        cos(psychNoise * 3.14159 + t * 1.2) * 0.5 + 0.5,\n        sin(psychNoise * 3.14159 - t * 0.8) * 0.5 + 0.5\n    );\n    \n    // Mix the base gradient with the psychedelic colors, pulsing with the radial wave\n    grad = mix(grad, psychColor, (0.3 + 0.2 * radial) * psychIntensity);\n    \n    // Add a highlight from the second symmetrical layer\n    grad += vec3(symm * 0.15);\n    \n    // Blend the gradient with the original color to give it a lit, trippy effect\n    color.rgb = mix(color.rgb, color.rgb * grad * 2.0, 0.85);\n    \n    // Add the detected edges over the non-dark areas\n    color.rgb = mix(color.rgb, edgeColor, clamp(edge, 0.0, 1.0));\n    \n    return color;\n}",
    "uniformValues": {
      "speed": 0.36,
      "distortion": 0.002,
      "scale": 1.81,
      "centerX": 0.42,
      "centerY": 0.44,
      "radialFreq": 15,
      "symmFreq": 18.29,
      "psychIntensity": 0.8,
      "mirrorX": true,
      "edgeIntensity": 4.5,
      "edgeThreshold": 0.46,
      "edgeColor": [
        0.1568627450980392,
        0.03529411764705882,
        0.00392156862745098
      ],
      "colorHigh": [
        0.1450980392156863,
        0.07450980392156863,
        0.09803921568627451
      ],
      "colorMid": [
        0.2823529411764706,
        0.27058823529411763,
        0.40784313725490196
      ],
      "colorLow": [
        0.9568627450980393,
        0.9568627450980393,
        0.9803921568627451
      ]
    }
  },
  {
    "id": "recovered_timeline_0f77abc0_5637_4f71_955a_94408586ece5",
    "name": "Psychedelic Dual Center Edges Clean 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-0f77abc0-5637-4f71-955a-94408586ece5 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psychedelic Dual Center Edges Clean\nuniform float speed; // @min 0.0 @max 2.0 @default 0.5\nuniform float distortion; // @min 0.0 @max 0.2 @default 0.05\nuniform float scale; // @min 1.0 @max 10.0 @default 3.0\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.25\nuniform float centerY; // @min 0.0 @max 1.0 @default 0.5\nuniform float radialFreq; // @min 1.0 @max 30.0 @default 15.0\nuniform float symmFreq; // @min 1.0 @max 20.0 @default 6.0\nuniform float psychIntensity; // @min 0.0 @max 1.0 @default 0.8\nuniform bool mirrorX; // @default true\nuniform float edgeIntensity; // @min 0.0 @max 5.0 @default 2.0\nuniform float edgeThreshold; // @min 0.0 @max 1.0 @default 0.1\nuniform vec3 edgeColor; // @default 1.0,1.0,1.0\nuniform vec3 colorHigh; // @default 1.0,0.8,0.4\nuniform vec3 colorMid; // @default 0.2,0.6,0.8\nuniform vec3 colorLow; // @default 0.1,0.1,0.3\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 workUV = uv;\n    float flip = 1.0;\n    \n    // Horizontal symmetrical flip to create two centers\n    if (mirrorX && workUV.x > 0.5) {\n        workUV.x = 1.0 - workUV.x;\n        flip = -1.0;\n    }\n\n    vec2 p = workUV * (scale * 5.0);\n    float t = time * speed;\n    \n    // 1. Base fluid motion\n    vec2 q = vec2(0.0);\n    q.x = sin(p.x + t) + cos(p.y * 1.2 - t);\n    q.y = cos(p.x * 1.1 - t) + sin(p.y + t);\n    \n    vec2 r = vec2(0.0);\n    r.x = sin(p.x + q.x * 2.0 + t * 1.5) + cos(p.y + q.y * 1.5 - t);\n    r.y = cos(p.x + q.x * 1.5 - t * 1.2) + sin(p.y + q.y * 2.0 + t);\n    r = r * 0.25 + 0.5;\n\n    // 2. Radial symmetrical wave (Center can be moved)\n    vec2 centerPos = vec2(centerX, centerY);\n    vec2 center = workUV - centerPos;\n    float dist = length(center);\n    float angle = atan(center.y, center.x);\n    \n    float radial = sin(dist * scale * radialFreq - t * 4.0);\n    vec2 radialOffset = center * radial * distortion * 1.5;\n\n    // 3. Second symmetrical layer (Angular/Star-like wave)\n    float symm = cos(angle * symmFreq + dist * scale * 5.0 + t * 3.0);\n    vec2 symmOffset = vec2(cos(angle), sin(angle)) * symm * distortion * 0.8;\n\n    // 4. Psychedelic wave using similar trig noise mapped to polar coordinates\n    vec2 psychP = vec2(angle * 4.0, dist * scale * 8.0);\n    float psychNoise = sin(psychP.x + t * 2.0) * cos(psychP.y - t * 1.5);\n    vec2 psychOffset = vec2(cos(psychNoise * 6.28318), sin(psychNoise * 6.28318)) * distortion * psychIntensity;\n\n    // Combine all offsets\n    vec2 finalOffset = (r - 0.5) * distortion + radialOffset + symmOffset + psychOffset;\n    \n    // Flip the X offset back for the mirrored side to maintain true symmetry\n    finalOffset.x *= flip;\n    \n    vec2 offsetUV = uv + finalOffset;\n    \n    // Sample the original texture with the combined distortions\n    vec4 color = texture2D(tex, offsetUV);\n    \n    // Edge detection on the distorted texture\n    vec2 texel = 1.0 / resolution;\n    float l0 = dot(color.rgb, vec3(0.299, 0.587, 0.114));\n    float l1 = dot(texture2D(tex, offsetUV + vec2(texel.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));\n    float l2 = dot(texture2D(tex, offsetUV + vec2(0.0, texel.y)).rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Calculate edge strength with strict threshold to remove artifacts\n    float edgeRaw = length(vec2(l1 - l0, l2 - l0));\n    float edge = smoothstep(edgeThreshold * 0.2, edgeThreshold * 0.2 + 0.05, edgeRaw) * edgeIntensity;\n    \n    // Strictly mask out dark areas to prevent stray pixels\n    float notDark = smoothstep(0.15, 0.25, l0);\n    edge *= notDark;\n    \n    // Faux 3D shading based on the fluid gradients\n    float shade = (r.x - r.y) * 0.5 + 0.5;\n    vec3 grad = mix(colorLow, colorMid, smoothstep(0.0, 0.5, shade));\n    grad = mix(grad, colorHigh, smoothstep(0.5, 1.0, shade));\n    \n    // Psychedelic color blend based on the polar noise\n    vec3 psychColor = vec3(\n        sin(psychNoise * 3.14159 + t) * 0.5 + 0.5,\n        cos(psychNoise * 3.14159 + t * 1.2) * 0.5 + 0.5,\n        sin(psychNoise * 3.14159 - t * 0.8) * 0.5 + 0.5\n    );\n    \n    // Mix the base gradient with the psychedelic colors, pulsing with the radial wave\n    grad = mix(grad, psychColor, (0.3 + 0.2 * radial) * psychIntensity);\n    \n    // Add a highlight from the second symmetrical layer\n    grad += vec3(symm * 0.15);\n    \n    // Blend the gradient with the original color to give it a lit, trippy effect\n    color.rgb = mix(color.rgb, color.rgb * grad * 2.0, 0.85);\n    \n    // Add the detected edges over the non-dark areas\n    color.rgb = mix(color.rgb, edgeColor, clamp(edge, 0.0, 1.0));\n    \n    return color;\n}",
    "uniformValues": {
      "speed": 0.36,
      "distortion": 0.002,
      "scale": 1.81,
      "centerX": 0.42,
      "centerY": 0.44,
      "radialFreq": 15,
      "symmFreq": 18.29,
      "psychIntensity": 0.8,
      "mirrorX": true,
      "edgeIntensity": 4.5,
      "edgeThreshold": 0.07,
      "edgeColor": [
        0.30196078431372547,
        0.29411764705882354,
        0.0784313725490196
      ],
      "colorHigh": [
        0.9529411764705882,
        0.5058823529411764,
        0.6627450980392157
      ],
      "colorMid": [
        0.13333333333333333,
        0.0784313725490196,
        0.2627450980392157
      ],
      "colorLow": [
        0.9568627450980393,
        0.9568627450980393,
        0.9803921568627451
      ]
    }
  },
  {
    "id": "recovered_timeline_86a55801_270a_4b66_be23_482d895ae43c",
    "name": "3D Falling Cubes Morphed",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-86a55801-270a-4b66-be23-482d895ae43c in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Falling Cubes Morphed\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.1\nuniform float pixelSize; // @min 8.0 @max 64.0 @default 24.0\nuniform float speed; // @min 0.1 @max 3.0 @default 1.0\nuniform float morphAmount; // @min 0.0 @max 1.0 @default 0.3\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    // 1. Extract the original shape mask and luminance\n    vec4 orig = texture2D(tex, uv);\n    float brightness = dot(orig.rgb, vec3(0.299, 0.587, 0.114));\n    float mask = step(threshold, brightness) * orig.a;\n\n    // 2. Morph the UV coordinates based on the luminance (3D-ness)\n    vec2 distortedUV = uv;\n    distortedUV.y -= brightness * morphAmount;\n    distortedUV.x += (uv.x - 0.5) * 2.0 * brightness * morphAmount * 0.2;\n\n    // 3. Grid and column calculations using distorted UV\n    vec2 gridUv = distortedUV * resolution / pixelSize;\n    vec2 cell = floor(gridUv);\n    vec2 local = fract(gridUv);\n    \n    // 4. Column-based falling animation\n    float colRand = node_rand(vec2(cell.x, 1.0));\n    float fallOffset = time * speed * (0.5 + colRand * 1.5);\n    float row = floor(gridUv.y - fallOffset);\n    \n    // 5. Block activation and shading\n    float blockRand = node_rand(vec2(cell.x, row));\n    float activeBlock = step(0.4, blockRand) * mask;\n    \n    // Simple pseudo-3D edge shading\n    float edgeX = smoothstep(0.0, 0.15, local.x) * smoothstep(1.0, 0.85, local.x);\n    float edgeY = smoothstep(0.0, 0.15, local.y) * smoothstep(1.0, 0.85, local.y);\n    float shading = edgeX * edgeY * (0.6 + 0.4 * blockRand);\n    \n    vec3 finalColor = orig.rgb * shading;\n    \n    return vec4(finalColor * activeBlock, orig.a * activeBlock);\n}",
    "uniformValues": {
      "threshold": 0.33,
      "pixelSize": 12.48,
      "speed": 2.855,
      "morphAmount": 0.09
    }
  },
  {
    "id": "recovered_timeline_df7a88bf_385a_4175_9264_f3259a78d7fe",
    "name": "Dual Center Trippy",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-df7a88bf-385a-4175-9264-f3259a78d7fe in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Dual Center Trippy\nuniform float intensity; // @min 0.0 @max 3.0 @default 1.5\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.25\nuniform float centerY; // @min -1.0 @max 1.0 @default 0.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    vec3 c = vec3(0.0);\n    float l = 0.0;\n    float z = time;\n    \n    for(int i = 0; i < 3; i++) {\n        vec2 p = uv;\n        p -= 0.5;\n        \n        // Layer of duplication (mirroring X) and offset\n        p.x = abs(p.x) - centerX;\n        p.y -= centerY;\n        \n        p.x *= resolution.x / resolution.y;\n        \n        vec2 uv_effect = p;\n        z += 0.07;\n        l = length(p);\n        \n        // Avoid division by zero\n        float lenP = max(l, 0.0001); \n        \n        uv_effect += p / lenP * (sin(z) + 1.0) * abs(sin(lenP * 9.0 - z - z));\n        float val = 0.01 / max(length(mod(uv_effect, 1.0) - 0.5), 0.0001);\n        \n        // WebGL 1.0 safe vector indexing\n        if (i == 0) c.r = val;\n        else if (i == 1) c.g = val;\n        else c.b = val;\n    }\n    \n    vec3 effectColor = c / max(l, 0.0001);\n    \n    // Multiply the effect by the source color to map it onto the surface\n    vec3 finalColor = source.rgb * effectColor * intensity;\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "intensity": 0.33,
      "centerX": 0.31,
      "centerY": 0.28
    }
  },
  {
    "id": "recovered_timeline_1308b45d_6ac1_4d1a_928e_d2c932f7101f",
    "name": "3D Lit Ripple Masked",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-1308b45d-6ac1-4d1a-928e-d2c932f7101f in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Lit Ripple Masked\nuniform float speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float rippleStrength; // @min 0.0 @max 0.1 @default 0.02\nuniform float shadowStrength; // @min 0.0 @max 1.0 @default 0.6\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float contrast; // @min 0.0 @max 3.0 @default 1.2\nuniform float luminosity; // @min -1.0 @max 1.0 @default 0.0\nuniform vec3 lightDir; // @default 0.5,0.5,0.8\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    // Sample original texture to create a mask for the black background\n    vec4 origColor = texture2D(tex, uv);\n    float origLuma = dot(origColor.rgb, vec3(0.299, 0.587, 0.114));\n    float mask = step(blackThreshold, origLuma);\n\n    vec2 aspect = vec2(resolution.x / resolution.y, 1.0);\n    vec2 p = (uv - 0.5) * aspect;\n    \n    // Bouncing position logic\n    float t = time * speed;\n    vec2 move = vec2(\n        abs(fract(t * 0.3) * 2.0 - 1.0) - 0.5,\n        abs(fract(t * 0.43) * 2.0 - 1.0) - 0.5\n    ) * aspect * 0.8;\n    \n    float dist = length(p - move);\n    vec2 dir = dist > 0.0 ? (p - move) / dist : vec2(0.0);\n    \n    // Ripple effect radiating from the bouncing point\n    float rippleEnvelope = exp(-dist * 4.0);\n    float phase = dist * 30.0 - time * 10.0;\n    float ripple = sin(phase) * rippleEnvelope;\n    float rippleSlope = cos(phase) * rippleEnvelope; // Derivative for normal calculation\n    \n    // Displace UVs\n    vec2 displacedUV = uv + dir * ripple * rippleStrength;\n    vec4 texColor = texture2D(tex, displacedUV);\n    \n    // Calculate 3D Normals from the ripple slope to give depth to white surfaces\n    vec3 N = normalize(vec3(-dir * rippleSlope * 100.0 * rippleStrength, 1.0));\n    vec3 L = normalize(lightDir);\n    \n    // Diffuse and Specular Lighting\n    float diff = max(dot(N, L), 0.0);\n    vec3 viewDir = vec3(0.0, 0.0, 1.0);\n    vec3 halfDir = normalize(L + viewDir);\n    float spec = pow(max(dot(N, halfDir), 0.0), 32.0) * rippleEnvelope;\n    \n    // Apply lighting (shadows and highlights) to the texture\n    // This ensures pure white surfaces still show the 3D ripple effect\n    float ambient = 1.0 - shadowStrength;\n    texColor.rgb = texColor.rgb * (diff * shadowStrength + ambient);\n    texColor.rgb += spec * 0.6; // Add specular shine\n    \n    // Apply Contrast and Luminosity\n    texColor.rgb = (texColor.rgb - 0.5) * contrast + 0.5 + luminosity;\n    \n    // Add a colorful glow at the bounce location\n    vec3 highlight = vec3(\n        0.5 + 0.5 * sin(time * 2.0), \n        0.5 + 0.5 * cos(time * 1.3), \n        0.5 + 0.5 * sin(time * 0.7 + 2.0)\n    );\n    float glow = smoothstep(0.15, 0.0, dist);\n    float currentLuma = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));\n    texColor.rgb += highlight * glow * currentLuma * 1.5;\n    \n    // Apply the mask to ensure the original black background stays dark\n    texColor.rgb *= mask;\n    texColor.a = origColor.a;\n    \n    return texColor;\n}",
    "uniformValues": {
      "speed": 0.1,
      "rippleStrength": 0.014,
      "shadowStrength": 1,
      "blackThreshold": 0.21,
      "contrast": 1.62,
      "luminosity": 0.22,
      "lightDir": [
        0.9411764705882353,
        0.9372549019607843,
        0.9372549019607843
      ]
    }
  },
  {
    "id": "recovered_timeline_ac43730a_ce14_4ba4_9d8e_6152cae6eb36",
    "name": "Dual Center Trippy 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-ac43730a-ce14-4ba4-9d8e-6152cae6eb36 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Dual Center Trippy\nuniform float intensity; // @min 0.0 @max 3.0 @default 1.5\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.25\nuniform float centerY; // @min -1.0 @max 1.0 @default 0.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    vec3 c = vec3(0.0);\n    float l = 0.0;\n    float z = time;\n    \n    for(int i = 0; i < 3; i++) {\n        vec2 p = uv;\n        p -= 0.5;\n        \n        // Layer of duplication (mirroring X) and offset\n        p.x = abs(p.x) - centerX;\n        p.y -= centerY;\n        \n        p.x *= resolution.x / resolution.y;\n        \n        vec2 uv_effect = p;\n        z += 0.07;\n        l = length(p);\n        \n        // Avoid division by zero\n        float lenP = max(l, 0.0001); \n        \n        uv_effect += p / lenP * (sin(z) + 1.0) * abs(sin(lenP * 9.0 - z - z));\n        float val = 0.01 / max(length(mod(uv_effect, 1.0) - 0.5), 0.0001);\n        \n        // WebGL 1.0 safe vector indexing\n        if (i == 0) c.r = val;\n        else if (i == 1) c.g = val;\n        else c.b = val;\n    }\n    \n    vec3 effectColor = c / max(l, 0.0001);\n    \n    // Multiply the effect by the source color to map it onto the surface\n    vec3 finalColor = source.rgb * effectColor * intensity;\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "intensity": 2.67,
      "centerX": 0.08,
      "centerY": -0.06
    }
  },
  {
    "id": "recovered_timeline_a3740bd1_563b_4407_a63e_04c40f5dde72",
    "name": "Luma Trippy Automata",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-a3740bd1-563b-4407-a63e-04c40f5dde72 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Luma Trippy Automata\nuniform float intensity; // @min 0.0 @max 3.0 @default 1.5\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.25\nuniform float centerY; // @min -1.0 @max 1.0 @default 0.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Calculate luminance to map the 3D structure\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Threshold mask: only affect pixels that are not completely black\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    \n    if (mask <= 0.0) {\n        return source;\n    }\n\n    vec3 c = vec3(0.0);\n    float l = 0.0;\n    float z = time * speed;\n    \n    for(int i = 0; i < 3; i++) {\n        vec2 p = uv;\n        p -= 0.5;\n        \n        // Layer of duplication (mirroring X) and offset\n        p.x = abs(p.x) - centerX;\n        p.y -= centerY;\n        \n        p.x *= resolution.x / resolution.y;\n        \n        // Morph and distort coordinates based on the image's luminance and noise\n        // This makes the trippy effect wrap around the 3D surface of the subject\n        float noiseVal = node_noise(p * 5.0 + z + lum * 2.0);\n        p += vec2(cos(noiseVal * 6.2831), sin(noiseVal * 6.2831)) * lum * 0.15;\n        \n        vec2 uv_effect = p;\n        z += 0.07;\n        l = length(p);\n        \n        // Avoid division by zero\n        float lenP = max(l, 0.0001); \n        \n        uv_effect += p / lenP * (sin(z) + 1.0) * abs(sin(lenP * 9.0 - z - z));\n        float val = 0.01 / max(length(mod(uv_effect, 1.0) - 0.5), 0.0001);\n        \n        // WebGL 1.0 safe vector indexing\n        if (i == 0) c.r = val;\n        else if (i == 1) c.g = val;\n        else c.b = val;\n    }\n    \n    vec3 effectColor = c / max(l, 0.0001);\n    \n    // Multiply the effect by the source color to map it onto the surface\n    vec3 mappedEffect = source.rgb * effectColor * intensity;\n    \n    // Blend the effect with the original image based on the threshold mask\n    vec3 finalColor = mix(source.rgb, mappedEffect, mask);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "intensity": 1.44,
      "centerX": 0.41,
      "centerY": -0.26,
      "threshold": 0.1,
      "speed": 0.8
    }
  },
  {
    "id": "recovered_timeline_61ec0631_02ec_4ddc_9ea5_7125b7507b9d",
    "name": "Relief Luma Automata",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-61ec0631-02ec-4ddc-9ea5-7125b7507b9d in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Relief Luma Automata\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nuniform float distortion; // @min 0.0 @max 0.1 @default 0.02\nuniform float heightScale; // @min 1.0 @max 20.0 @default 10.0\nuniform vec3 lightColor; // @default 0.85,0.80,0.70\nuniform float animSpeed; // @min 0.0 @max 10.0 @default 2.0\n\nfloat getHeight(sampler2D tex, vec2 uv) {\n    vec4 c = texture2D(tex, uv);\n    return dot(c.rgb, vec3(0.299, 0.587, 0.114));\n}\n\nvec3 getNormal(sampler2D tex, vec2 uv, vec2 res, float hScale) {\n    vec2 e = vec2(1.0 / res.x, 1.0 / res.y);\n    float hx = getHeight(tex, uv + vec2(e.x, 0.0)) - getHeight(tex, uv - vec2(e.x, 0.0));\n    float hy = getHeight(tex, uv + vec2(0.0, e.y)) - getHeight(tex, uv - vec2(0.0, e.y));\n    return normalize(vec3(-hx * hScale, -hy * hScale, 1.0));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    if (mask <= 0.0) {\n        return source;\n    }\n\n    vec3 nor = getNormal(tex, uv, resolution, heightScale);\n    vec2 distUv = uv + nor.xy * distortion * sin(time * animSpeed);\n    \n    vec2 p = distUv * scale;\n    float t = time * speed;\n\n    float n = 0.0;\n    vec2 q = p;\n    mat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\n    float amp = 1.0;\n    float sumAmp = 0.0;\n\n    for(int i = 0; i < 4; i++) {\n        vec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\n        float noiseVal = node_noise(q + tOffset + lum * 1.5);\n        float angle = noiseVal * 6.2831;\n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        q = rot * q * 1.3; \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    n /= sumAmp;\n\n    float branch = smoothstep(0.3, 0.7, n);\n    float topo = sin((lum * 2.0 + n) * lineDensity) * 0.5 + 0.5;\n    \n    vec3 color = mix(blobColor, branchColor, branch) * topo;\n    \n    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));\n    float diff = max(dot(nor, lightDir), 0.0);\n    color += lightColor * diff * 0.5;\n    \n    return mix(source, vec4(color, source.a), mask);\n}",
    "uniformValues": {
      "speed": 0.8,
      "scale": 6.14,
      "threshold": 0.15,
      "lineDensity": 20,
      "blobColor": [
        0.803921568627451,
        0.8352941176470589,
        0.8196078431372549
      ],
      "branchColor": [
        0.403921568627451,
        0.3607843137254902,
        0.23529411764705882
      ],
      "distortion": 0.016,
      "heightScale": 20,
      "lightColor": [
        0.85,
        0.8,
        0.7
      ],
      "animSpeed": 10
    }
  },
  {
    "id": "recovered_timeline_4576ac76_bc57_40fb_a7a0_ef31989a214f",
    "name": "Follow Light B&W Threshold",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-4576ac76-bc57-40fb-a7a0-ef31989a214f in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Follow Light B&W Threshold\n\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float speed; // @min 0.0 @max 10.0 @default 4.0\nuniform float tunnelRadius; // @min 1.0 @max 10.0 @default 4.0\nuniform float orbSize; // @min 0.0 @max 2.0 @default 0.01\nuniform float colorIntensity; // @min 0.1 @max 5.0 @default 1.0\nuniform float bwBlend; // @min 0.0 @max 1.0 @default 0.8\n\nvec3 getPathPosition(float z) {\n    return vec3(12.0 * cos(z * vec2(0.1, 0.12)), z);\n}\n\nvec3 safe_tanh(vec3 x) {\n    vec3 e2x = exp(-2.0 * x);\n    return (1.0 - e2x) / (1.0 + e2x);\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Exclude black background based on threshold\n    if (length(source.rgb) <= blackThreshold) {\n        return source;\n    }\n    \n    // Normalize screen coordinates\n    vec2 p = (uv - 0.5) * resolution / resolution.y;\n    \n    // T = animTime\n    float animTime = time * speed + 5.0 + 5.0 * sin(time * 0.3);\n    \n    // Setup Camera\n    vec3 rayOrigin = getPathPosition(animTime);\n    vec3 lookTarget = getPathPosition(animTime + 4.0);\n    \n    vec3 forward = normalize(lookTarget - rayOrigin);\n    vec3 right = normalize(vec3(-forward.z, 0.0, forward.x)); \n    vec3 up = cross(forward, right);\n    vec3 rayDir = normalize(p.x * right + p.y * up + forward);\n\n    float stepDist = 1.0; \n    float totalDist = 0.0;\n    float orbDist = 1.0;  \n    vec3 accumulatedColor = vec3(0.0);\n    vec3 rayPos = rayOrigin; \n\n    // Raymarching Loop\n    for (int i = 1; i <= 28; i++) {\n        if (totalDist >= 30.0) break;\n        \n        float fi = float(i);\n        \n        // 1. March Ray Forward\n        rayPos += rayDir * stepDist;\n        \n        // 2. Get path center and time vars\n        vec3 pathCenter = getPathPosition(rayPos.z);\n        float sineTime = sin(time);\n        \n        // 3. Orb Geometry\n        vec3 orbCenter = vec3(\n            pathCenter.x + sineTime,\n            pathCenter.y + sineTime * 2.0,\n            6.0 + animTime + sineTime * 2.0\n        );\n        orbDist = length(rayPos - orbCenter) - orbSize;\n        \n        // 4. Tunnel Wall Geometry\n        float baseRadius = cos(rayPos.z * 0.6) * 2.0 + tunnelRadius;\n        \n        float tunnelStructure = min(\n            length(rayPos.xy - pathCenter.x - 6.0),\n            length((rayPos - pathCenter).xy)\n        );\n        \n        float largeScoops = abs(dot(sin(0.4 * rayPos), vec3(0.25))) / 0.1;\n        float detailTexture = abs(dot(sin(animTime + 16.0 * rayPos), vec3(0.22))) / 2.0;\n        \n        float tunnelDist = baseRadius - tunnelStructure + largeScoops + detailTexture;\n        \n        // 5. Update Distances\n        stepDist = min(orbDist, 0.01 + 0.3 * abs(tunnelDist));\n        totalDist += stepDist;\n        \n        // 6. Accumulate Color\n        vec3 palette = 1.0 + cos(fi * 0.7 + vec3(6.0, 1.0, 2.0));\n        accumulatedColor += (palette / stepDist + 10.0 * palette / max(orbDist, 0.6)) / fi;\n    }\n    \n    // Tonemapping\n    vec3 finalColor = safe_tanh(accumulatedColor * accumulatedColor * colorIntensity / 2000.0);\n    \n    // Calculate Grayscale (Black & White) of original image\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    vec3 bw = vec3(lum);\n    \n    // Overlay blend mode to keep shadows black and highlights white\n    vec3 overlay = mix(2.0 * finalColor * bw, 1.0 - 2.0 * (1.0 - finalColor) * (1.0 - bw), step(0.5, finalColor));\n    \n    // Mix the overlay based on the original image's alpha and the blend uniform\n    finalColor = mix(finalColor, overlay, source.a * bwBlend);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "blackThreshold": 0.12,
      "speed": 1.1,
      "tunnelRadius": 10,
      "orbSize": 0,
      "colorIntensity": 0.296,
      "bwBlend": 0.8
    }
  },
  {
    "id": "recovered_timeline_17f48c94_4678_40a5_b950_c22993b24dc2",
    "name": "3D Tunnel Inside Image",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-17f48c94-4678-40a5-b950-c22993b24dc2 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Tunnel Inside Image\n\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.01\nuniform float speed; // @min 0.0 @max 10.0 @default 4.0\nuniform float tunnelRadius; // @min 1.0 @max 10.0 @default 4.0\nuniform float orbSize; // @min 0.0 @max 2.0 @default 0.01\nuniform float colorIntensity; // @min 0.1 @max 5.0 @default 1.0\nuniform vec3 gradientStart; // @default 1.0,0.2,0.5\nuniform vec3 gradientEnd; // @default 0.2,0.6,1.0\n\nvec3 getPathPosition(float z) {\n    return vec3(12.0 * cos(z * vec2(0.1, 0.12)), z);\n}\n\nvec3 safe_tanh(vec3 x) {\n    vec3 e2x = exp(-2.0 * x);\n    return (1.0 - e2x) / (1.0 + e2x);\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Normalize screen coordinates\n    vec2 p = (uv - 0.5) * resolution / resolution.y;\n    \n    // T = animTime\n    float animTime = time * speed + 5.0 + 5.0 * sin(time * 0.3);\n    \n    // Setup Camera\n    vec3 rayOrigin = getPathPosition(animTime);\n    vec3 lookTarget = getPathPosition(animTime + 4.0);\n    \n    vec3 forward = normalize(lookTarget - rayOrigin);\n    vec3 right = normalize(vec3(-forward.z, 0.0, forward.x)); \n    vec3 up = cross(forward, right);\n    vec3 rayDir = normalize(p.x * right + p.y * up + forward);\n\n    float stepDist = 1.0; \n    float totalDist = 0.0;\n    float orbDist = 1.0;  \n    vec3 accumulatedColor = vec3(0.0);\n    vec3 rayPos = rayOrigin; \n\n    // Raymarching Loop\n    for (int i = 1; i <= 28; i++) {\n        if (totalDist >= 30.0) break;\n        \n        float fi = float(i);\n        rayPos += rayDir * stepDist;\n        \n        vec3 pathCenter = getPathPosition(rayPos.z);\n        float sineTime = sin(time);\n        \n        vec3 orbCenter = vec3(\n            pathCenter.x + sineTime,\n            pathCenter.y + sineTime * 2.0,\n            6.0 + animTime + sineTime * 2.0\n        );\n        orbDist = length(rayPos - orbCenter) - orbSize;\n        \n        float baseRadius = cos(rayPos.z * 0.6) * 2.0 + tunnelRadius;\n        \n        float tunnelStructure = min(\n            length(rayPos.xy - pathCenter.x - 6.0),\n            length((rayPos - pathCenter).xy)\n        );\n        \n        float largeScoops = abs(dot(sin(0.4 * rayPos), vec3(0.25))) / 0.1;\n        float detailTexture = abs(dot(sin(animTime + 16.0 * rayPos), vec3(0.22))) / 2.0;\n        \n        float carvedDist = baseRadius - tunnelStructure + largeScoops + detailTexture;\n        \n        vec3 fluidPos = rayPos;\n        for (int j = 1; j <= 5; j++) {\n            float fj = float(j);\n            fluidPos += sin(fluidPos.yzx * fj + time + 0.5 * fi) / fj;\n        }\n        \n        float fluidTunnelDist = 0.4 * length(vec4(0.3 * cos(fluidPos) - 0.3, carvedDist));\n        \n        stepDist = min(orbDist, fluidTunnelDist);\n        totalDist += stepDist;\n        \n        vec3 palette = 1.0 + cos(fluidPos.y + fi * 0.4 + vec3(6.0, 1.0, 2.0));\n        accumulatedColor += (2.5 * palette / stepDist + 10.0 * palette / max(orbDist, 0.6)) / fi;\n    }\n    \n    vec3 tunnelColor = safe_tanh(accumulatedColor * accumulatedColor * colorIntensity / 1500.0);\n    \n    // Gradient overlay\n    vec3 grad = mix(gradientStart, gradientEnd, uv.y);\n    \n    // 3D Inner Shadow (Vignette)\n    float shadow = smoothstep(1.2, 0.2, length(uv - 0.5) * 1.5);\n    \n    // Blend original image with the 3D tunnel, gradient, and shadow\n    vec3 insideEffect = source.rgb * tunnelColor * grad * shadow * 3.0;\n    \n    // Mask based on luminance to keep the effect inside the bright parts of the original image\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    float mask = smoothstep(blackThreshold, blackThreshold + 0.1, lum) * source.a;\n    \n    vec3 finalColor = mix(source.rgb, insideEffect, mask);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "blackThreshold": 0,
      "speed": 2.8,
      "tunnelRadius": 8.74,
      "orbSize": 0.01,
      "colorIntensity": 1.619,
      "gradientStart": [
        0.7215686274509804,
        1,
        0.2
      ],
      "gradientEnd": [
        0.6509803921568628,
        0.12549019607843137,
        0.09019607843137255
      ]
    }
  },
  {
    "id": "recovered_timeline_703f4cb1_b1bc_4111_8f9e_8c06b958d9d5",
    "name": "Gold Wandering Light Relief",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-703f4cb1-b1bc-4111-8f9e-8c06b958d9d5 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Gold Wandering Light Relief\nuniform float distortion; // @min 0.0 @max 0.1 @default 0.02\nuniform float heightScale; // @min 1.0 @max 20.0 @default 10.0\nuniform vec3 lightColor; // @default 0.85,0.80,0.70\nuniform float animSpeed; // @min 0.0 @max 10.0 @default 2.0\nuniform float lightDepth; // @min 0.1 @max 5.0 @default 1.0\n\nfloat getHeight(sampler2D tex, vec2 uv) {\n    vec4 c = texture2D(tex, uv);\n    return dot(c.rgb, vec3(0.299, 0.587, 0.114));\n}\n\nvec3 getNormal(sampler2D tex, vec2 uv, vec2 res) {\n    vec2 e = vec2(1.0 / res.x, 1.0 / res.y);\n    float hx = getHeight(tex, uv + vec2(e.x, 0.0)) - getHeight(tex, uv - vec2(e.x, 0.0));\n    float hy = getHeight(tex, uv + vec2(0.0, e.y)) - getHeight(tex, uv - vec2(0.0, e.y));\n    return normalize(vec3(-hx * heightScale, -hy * heightScale, 1.0));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float luma = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Affect only non-dark pixels\n    if (luma < 0.05) {\n        return source;\n    }\n    \n    vec3 nor = getNormal(tex, uv, resolution);\n    \n    // Distort UV based on normal and time\n    vec2 distUv = uv + nor.xy * distortion * sin(time * animSpeed);\n    vec4 distColor = texture2D(tex, distUv);\n    \n    // Base Shading constants\n    vec3 LP = vec3(-0.6, 0.7, -0.3);\n    vec3 LC = lightColor;\n    vec3 HC1 = vec3(0.5, 0.4, 0.3);\n    vec3 HC2 = vec3(0.05, 0.05, 0.3);\n    vec3 HLD = vec3(0.0, 1.0, 0.0);\n    \n    vec3 pos = vec3(uv * 2.0 - 1.0, 0.0);\n    vec3 l = normalize(LP - pos);\n    vec3 camRd = normalize(vec3(0.0, 0.0, -1.0));\n    \n    float d = clamp(dot(nor, l), 0.0, 1.0);\n    float f = pow(clamp(1.0 + dot(nor, camRd), 0.0, 1.0), 2.0) * 0.3;\n    \n    vec3 c = vec3(0.0);\n    c += d * LC;\n    c += mix(HC1, HC2, dot(nor, HLD)) * 0.5;\n    c += f * vec3(1.3, 1.2, 1.0);\n    \n    // New Gold Wandering Light\n    vec3 goldLightPos = vec3(sin(time * 1.3) * 0.8, cos(time * 0.9) * 0.8, lightDepth);\n    vec3 goldLightDir = normalize(goldLightPos - pos);\n    float goldDist = length(goldLightPos - pos);\n    float goldAtten = 1.0 / (1.0 + goldDist * goldDist * 1.5);\n    \n    float goldDiff = clamp(dot(nor, goldLightDir), 0.0, 1.0);\n    vec3 halfVector = normalize(goldLightDir + camRd);\n    float goldSpec = pow(clamp(dot(nor, halfVector), 0.0, 1.0), 16.0);\n    \n    vec3 goldIllum = vec3(1.0, 0.8, 0.2) * (goldDiff + goldSpec) * goldAtten * 2.5;\n    \n    // Mix distorted color with base shading and add gold illumination\n    vec3 finalColor = distColor.rgb * c * 1.5 + goldIllum * distColor.rgb;\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "distortion": 0.1,
      "heightScale": 20,
      "lightColor": [
        0.6392156862745098,
        0.3254901960784314,
        0.7568627450980392
      ],
      "animSpeed": 8.4,
      "lightDepth": 0.247
    }
  },
  {
    "id": "recovered_timeline_09f0f894_d2d5_4426_9b59_0d34f0d57c5f",
    "name": "3D Voronoi Distances",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-09f0f894-d2d5-4426-9b59-0d34f0d57c5f in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Voronoi Distances\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float scale; // @min 1.0 @max 20.0 @default 8.0\nuniform float morphAmount; // @min 0.0 @max 1.0 @default 0.3\n\nvec2 hash2(vec2 p) {\n    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);\n}\n\nvec3 voronoi(in vec2 x, float time) {\n    vec2 ip = floor(x);\n    vec2 fp = fract(x);\n\n    vec2 mg, mr;\n    float md = 8.0;\n    \n    for(int j = -1; j <= 1; j++) {\n        for(int i = -1; i <= 1; i++) {\n            vec2 g = vec2(float(i), float(j));\n            vec2 o = hash2(ip + g);\n            o = 0.5 + 0.5 * sin(time + 6.2831 * o);\n            vec2 r = g + o - fp;\n            float d = dot(r, r);\n\n            if(d < md) {\n                md = d;\n                mr = r;\n                mg = g;\n            }\n        }\n    }\n\n    md = 8.0;\n    for(int j = -2; j <= 2; j++) {\n        for(int i = -2; i <= 2; i++) {\n            vec2 g = mg + vec2(float(i), float(j));\n            vec2 o = hash2(ip + g);\n            o = 0.5 + 0.5 * sin(time + 6.2831 * o);\n            vec2 r = g + o - fp;\n\n            if(dot(mr - r, mr - r) > 0.00001) {\n                md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));\n            }\n        }\n    }\n\n    return vec3(md, mr);\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float luma = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Morph the UV coordinates based on the luminance (3D-ness) of the image\n    vec2 distortedUV = uv;\n    distortedUV.y -= luma * morphAmount;\n    distortedUV.x += (uv.x - 0.5) * 2.0 * luma * morphAmount * 0.2;\n    \n    if (luma > threshold) {\n        vec2 p = distortedUV * vec2(resolution.x / resolution.y, 1.0);\n        vec3 c = voronoi(scale * p, time);\n\n        vec3 col = c.x * (0.5 + 0.5 * sin(64.0 * c.x)) * vec3(1.0);\n        col = mix(source.rgb, col, smoothstep(0.04, 0.07, c.x));\n        \n        float dd = length(c.yz);\n        col = mix(source.rgb, col, smoothstep(0.0, 0.12, dd));\n        col += source.rgb * (1.0 - smoothstep(0.0, 0.04, dd));\n\n        // Apply the black and white shadow of the original image on top\n        col *= luma;\n\n        return vec4(col, source.a);\n    }\n    \n    return source;\n}",
    "uniformValues": {
      "threshold": 0,
      "scale": 11.07,
      "morphAmount": 0.06
    }
  },
  {
    "id": "recovered_timeline_5aa3c029_a19e_4cbb_a95a_bf9bb43fa8b5",
    "name": "Light Trip Masked",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-5aa3c029-a19e-4cbb-a95a-bf9bb43fa8b5 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Light Trip Masked\nuniform float warpAmount; // @min 0.0 @max 0.1 @default 0.02\nuniform float colorShift; // @min 0.0 @max 5.0 @default 1.0\nuniform float speed; // @min 0.0 @max 15.0 @default 1.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 orig = texture2D(tex, uv);\n    \n    // Ensure original black pixels stay black based on threshold\n    if (length(orig.rgb) < threshold) {\n        return orig;\n    }\n    \n    vec2 center = vec2(0.5);\n    vec2 delta = uv - center;\n    float dist = length(delta);\n    \n    float t = time * speed;\n    float breath = sin(t - dist * 6.0) * warpAmount;\n    float wave = sin(uv.y * 10.0 + t) * cos(uv.x * 10.0 - t) * warpAmount * 0.5;\n    \n    vec2 warpedUV = uv + delta * breath + vec2(wave, -wave);\n    \n    float shift = colorShift * 0.005;\n    vec2 rUV = warpedUV + vec2(shift * sin(t), shift * cos(t));\n    vec2 gUV = warpedUV;\n    vec2 bUV = warpedUV - vec2(shift * sin(t * 1.2), shift * cos(t * 1.2));\n    \n    float r = texture2D(tex, rUV).r;\n    float g = texture2D(tex, gUV).g;\n    float b = texture2D(tex, bUV).b;\n    float a = texture2D(tex, warpedUV).a;\n    \n    vec3 col = vec3(r, g, b);\n    \n    vec3 colorWave = vec3(\n        sin(t + dist * 10.0),\n        cos(t * 1.1 + dist * 8.0),\n        sin(t * 0.9 + dist * 12.0)\n    ) * 0.05 * colorShift;\n    \n    col += colorWave;\n    col = smoothstep(0.05, 0.95, col);\n    \n    return vec4(col, a);\n}",
    "uniformValues": {
      "warpAmount": 0,
      "colorShift": 5,
      "speed": 4.95,
      "threshold": 0.11
    }
  },
  {
    "id": "recovered_timeline_8f3ff811_3b4d_47f7_bdf2_7ccd9b497f9f",
    "name": "3D Matrix Letters Reversed",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-8f3ff811-3b4d-47f7-bdf2-7ccd9b497f9f in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Matrix Letters Reversed\nuniform float morphAmount; // @min 0.0 @max 1.0 @default 0.3\nuniform float speed; // @min 0.1 @max 5.0 @default 1.0\nuniform vec3 matrixColor; // @default 0.0,1.0,0.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float scale; // @min 0.1 @max 5.0 @default 1.0\nuniform float brightness; // @min 0.0 @max 5.0 @default 1.8\nuniform float trailLength; // @min 1.0 @max 10.0 @default 4.0\n\nfloat fallerSpeed(float col) {\n    return node_rand(vec2(col, 0.0)) * 0.8 + 0.2;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Morph the UV coordinates based on the luminance (3D-ness) of the image\n    vec2 distortedUV = uv;\n    distortedUV.y -= lum * morphAmount;\n    // Make the horizontal morph symmetric from the center\n    distortedUV.x += (uv.x - 0.5) * 2.0 * lum * morphAmount * 0.2;\n    \n    vec2 cells = vec2(64.0, 30.0) * scale;\n    vec2 pix = mod(distortedUV, 1.0 / cells);\n    vec2 cell = floor(distortedUV * cells);\n    \n    // Generate random 3x5 pixel glyphs (letters)\n    vec2 localUV = pix * cells;\n    vec2 subGrid = floor(localUV * vec2(3.0, 5.0));\n    float bitIndex = subGrid.y * 3.0 + subGrid.x;\n    \n    // Create a random 15-bit integer for each cell to act as a character mask\n    float charSeed = node_rand(cell + floor(time * speed * 4.0));\n    float charId = floor(charSeed * 32768.0); \n    float isGlyphPixel = mod(floor(charId / exp2(bitIndex)), 2.0);\n    \n    // Add margins so the letters don't touch each other and are clear\n    float margin = step(0.15, localUV.x) * step(localUV.x, 0.85) * step(0.1, localUV.y) * step(localUV.y, 0.9);\n    float c = isGlyphPixel * margin;\n    \n    // Calculate rising up logic (inverted verse)\n    // As time increases, the 0-point of fract moves upwards (higher cell.y)\n    float drop = fract(cell.y / cells.y - time * speed * fallerSpeed(cell.x));\n    \n    // Create a sharp trail and a bright head\n    float b = pow(1.0 - drop, trailLength); \n    if (drop < 0.05) {\n        b += 1.5; // Bright head\n    }\n    \n    // Combine matrix effect with original shading, boosted for clarity\n    vec3 matrixEffect = matrixColor * c * b * (lum + 0.4) * brightness;\n    \n    // Mask out black/background pixels using the threshold\n    float mask = smoothstep(threshold, threshold + 0.05, lum);\n    \n    vec3 finalColor = mix(source.rgb, matrixEffect, mask);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "morphAmount": 0.38,
      "speed": 2.305,
      "matrixColor": [
        0,
        1,
        0
      ],
      "threshold": 0.07,
      "scale": 1.129,
      "brightness": 1.9,
      "trailLength": 2.98
    }
  },
  {
    "id": "recovered_timeline_3ee01e09_580e_446b_bb3e_1f832e9d26e3",
    "name": "Hexagon Gray-Scott Waves",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-3ee01e09-580e-446b-bb3e-1f832e9d26e3 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Hexagon Gray-Scott Waves\nuniform float scale; // @min 1.0 @max 20.0 @default 8.0\nuniform float speed; // @min 0.0 @max 2.0 @default 0.5\nuniform float blend; // @min 0.0 @max 1.0 @default 0.8\nuniform float bump; // @min 0.0 @max 20.0 @default 5.0\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float smoothing; // @min 0.0 @max 0.2 @default 0.02\nuniform float rdScale; // @min 1.0 @max 20.0 @default 5.0\nuniform vec3 color1; // @default 0.1,0.8,0.6\nuniform vec3 color2; // @default 0.9,0.2,0.3\n\nfloat hash1(vec2 p) { \n    float n = dot(p, vec2(127.1, 311.7)); \n    return fract(sin(n) * 43758.5453); \n}\n\nfloat noise3(vec3 x) {\n    vec3 p = floor(x);\n    vec3 f = fract(x);\n    f = f * f * (3.0 - 2.0 * f);\n    float n = p.x + p.y * 157.0 + 113.0 * p.z;\n    vec4 v1 = fract(sin(vec4(n, n + 1.0, n + 157.0, n + 158.0)) * 43758.5453);\n    vec4 v2 = fract(sin(vec4(n + 113.0, n + 114.0, n + 270.0, n + 271.0)) * 43758.5453);\n    vec4 res = mix(v1, v2, f.z);\n    vec2 res2 = mix(res.xz, res.yw, f.x);\n    return mix(res2.x, res2.y, f.y);\n}\n\nfloat grayScott(vec2 p, float t) {\n    vec2 q = p;\n    float v = 0.0;\n    float amp = 1.0;\n    for(int i = 0; i < 4; i++) {\n        q += 0.3 * vec2(sin(t + q.y * 3.0), cos(t + q.x * 3.0));\n        v += amp * abs(sin(q.x * 4.0) * cos(q.y * 4.0));\n        q *= 1.6;\n        amp *= 0.6;\n    }\n    // Thresholding to create reaction-diffusion like blobs\n    return smoothstep(0.3, 0.5, v);\n}\n\nvec4 hexagon(vec2 p) {\n    vec2 q = vec2(p.x * 1.1547005, p.y + p.x * 0.5773503);\n    vec2 pi = floor(q);\n    vec2 pf = fract(q);\n    float v = mod(pi.x + pi.y, 3.0);\n    float ca = step(1.0, v);\n    float cb = step(2.0, v);\n    vec2 ma = step(pf.xy, pf.yx);\n    float e = dot(ma, 1.0 - pf.yx + ca * (pf.x + pf.y - 1.0) + cb * (pf.yx - 2.0 * pf.xy));\n    p = vec2(q.x + floor(0.5 + p.y / 1.5), 4.0 * p.y / 3.0) * 0.5 + 0.5;\n    float f = length((fract(p) - 0.5) * vec2(1.0, 0.8660254));\n    return vec4(pi + ca - cb * ma, e, f);\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    float mask = smoothstep(blackThreshold - smoothing, blackThreshold + smoothing + 0.001, lum);\n\n    vec2 eps = vec2(2.0 / resolution.x, 0.0);\n    float lumX = dot(texture2D(tex, uv + eps.xy).rgb, vec3(0.299, 0.587, 0.114));\n    float lumY = dot(texture2D(tex, uv + eps.yx).rgb, vec3(0.299, 0.587, 0.114));\n    vec2 grad = vec2(lumX - lum, lumY - lum);\n\n    vec2 pos = (-resolution.xy + 2.0 * (uv * resolution.xy)) / resolution.y;\n    \n    pos += grad * bump;\n    pos *= 1.2 + 0.15 * length(pos);\n\n    float aa = max(smoothing, 1.5 / resolution.y * scale);\n\n    vec4 h = hexagon(scale * pos + speed * time);\n    \n    // Generate Gray-Scott waves offset by hexagon ID\n    float gs = grayScott(pos * rdScale + h.xy * 0.05, time * speed);\n    vec3 gsColor = mix(color1, color2, gs);\n    \n    vec3 col = source.rgb * gsColor * (0.5 + 0.5 * hash1(h.xy + 1.2));\n    col *= smoothstep(0.10 - aa, 0.10 + aa, h.z);\n    col *= smoothstep(0.10 - aa, 0.10 + aa, h.w);\n    col *= 1.0 + 0.15 * sin(40.0 * h.z);\n\n    h = hexagon((scale * 0.75) * (pos + 0.1 * vec2(-1.3, 1.0)) + (speed * 1.2) * time);\n    col *= 1.0 - 0.8 * smoothstep(0.45 - aa, 0.45 + aa, noise3(vec3(0.3 * h.xy + time * 0.1, 0.5 * time)));\n\n    h = hexagon((scale * 0.75) * pos + (speed * 1.2) * time);\n    float n = noise3(vec3(0.3 * h.xy + time * 0.1, 0.5 * time));\n    \n    float gs2 = grayScott(pos * rdScale * 1.5 + h.xy * 0.05, time * speed * 1.2);\n    vec3 colb = source.rgb * mix(color2, color1, gs2);\n    colb *= smoothstep(0.10 - aa, 0.10 + aa, h.z);\n    colb *= 1.0 + 0.15 * sin(40.0 * h.z);\n\n    col = mix(col, colb, smoothstep(0.45 - aa, 0.45 + aa, n));\n    col *= 2.5 / (2.0 + col);\n    \n    col -= (grad.x + grad.y) * bump * 0.5;\n    col = clamp(col, 0.0, 1.0);\n\n    vec4 finalColor = mix(source, vec4(col, source.a), blend);\n    \n    return mix(source, finalColor, mask);\n}",
    "uniformValues": {
      "scale": 8.22,
      "speed": 0.48,
      "blend": 1,
      "bump": 1,
      "blackThreshold": 0.03,
      "smoothing": 0.034,
      "rdScale": 7.46,
      "color1": [
        0.8392156862745098,
        0.803921568627451,
        0.6235294117647059
      ],
      "color2": [
        0.6352941176470588,
        0.5215686274509804,
        0.6588235294117647
      ]
    }
  },
  {
    "id": "recovered_timeline_af542a9f_1712_481a_8145_ad13158cd53b",
    "name": "Moving 3D Luma Automata",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-af542a9f-1712-481a-8145-ad13158cd53b in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Moving 3D Luma Automata\nuniform float depth; // @min 0.1 @max 10.0 @default 5.0\nuniform float lightIntensity; // @min 0.0 @max 10.0 @default 3.0\nuniform vec3 lightColor; // @default 1.0,1.0,1.0\nuniform float ambientLight; // @min 0.0 @max 1.0 @default 0.05\nuniform float lightZ; // @min 0.01 @max 2.0 @default 0.15\nuniform float specularStrength; // @min 0.0 @max 5.0 @default 1.5\nuniform float lightSpeed; // @min 0.0 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nuniform float blackout; // @min 0.0 @max 1.0 @default 1.0\nuniform float moveSpeed; // @min 0.0 @max 5.0 @default 1.0\n\nfloat getLuma(sampler2D tex, vec2 uv) {\n    return dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    vec3 bgCol = mix(source.rgb, vec3(0.0), blackout);\n    \n    vec2 q = uv * scale;\n    float n = 0.0, amp = 1.0, sumAmp = 0.0;\n    mat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\n\n    // Dynamic automata segmentation logic\n    for(int i = 0; i < 4; i++) {\n        vec2 tOffset = vec2(sin(float(i) + time * moveSpeed), cos(float(i) + time * moveSpeed));\n        float noiseVal = node_noise(q + tOffset + lum * 1.5 - time * moveSpeed * 0.2);\n        float angle = noiseVal * 6.2831 + time * moveSpeed * 0.5;\n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        q = rot * q * 1.3; \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    n /= sumAmp;\n\n    float branch = smoothstep(0.3, 0.7, n);\n    float lines = smoothstep(0.8, 0.95, sin((lum * 2.0 + n) * lineDensity - time * moveSpeed * 2.0));\n    vec3 effectCol = mix(blobColor, branchColor, branch) + vec3(1.0) * lines * lum * 1.5;\n    vec3 segColor = mix(bgCol, effectCol, mask * branch);\n\n    // Normal map generation from original image luma\n    vec2 eps = 1.0 / resolution;\n    float l = getLuma(tex, uv - vec2(eps.x, 0.0));\n    float r = getLuma(tex, uv + vec2(eps.x, 0.0));\n    float d = getLuma(tex, uv - vec2(0.0, eps.y));\n    float u = getLuma(tex, uv + vec2(0.0, eps.y));\n    vec3 normal = normalize(vec3((r - l) * depth, (u - d) * depth, 1.0));\n    \n    // 3D Lighting\n    vec3 lightPos = vec3(0.5 + sin(time * lightSpeed) * 0.5, 0.5 + cos(time * lightSpeed) * 0.5, lightZ);\n    vec3 lightDir = normalize(lightPos - vec3(uv, 0.0));\n    vec3 viewDir = vec3(0.0, 0.0, 1.0);\n    vec3 halfDir = normalize(lightDir + viewDir);\n    \n    float diff = max(dot(normal, lightDir), 0.0);\n    float spec = pow(max(dot(normal, halfDir), 0.0), 32.0) * specularStrength;\n    \n    vec3 finalLight = vec3(ambientLight) + lightColor * lightIntensity * (diff + spec);\n    vec3 finalColor = segColor * finalLight;\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "depth": 9.703,
      "lightIntensity": 2,
      "lightColor": [
        0.23921568627450981,
        0,
        0.4
      ],
      "ambientLight": 0.98,
      "lightZ": 1.9403,
      "specularStrength": 4,
      "lightSpeed": 0.4,
      "scale": 5.6,
      "threshold": 0.345,
      "lineDensity": 26.15,
      "blobColor": [
        0.6980392156862745,
        0.5882352941176471,
        0.1803921568627451
      ],
      "branchColor": [
        0.8941176470588236,
        0.22745098039215686,
        0.6705882352941176
      ],
      "blackout": 1,
      "moveSpeed": 1
    }
  },
  {
    "id": "recovered_timeline_d86c2b79_874c_47cd_921a_a67394781b18",
    "name": "3D Fractal Automata",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-d86c2b79-874c-47cd-921a-a67394781b18 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Fractal Automata\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.1\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\n\nvec3 JuliaFractal(vec2 c, vec2 c2, float animparam, float anim2) {\t\n    vec2 z = c;\n    float mean = 0.0;\n    \n    for(int i = 0; i < 32; i++) {\n        vec2 a = vec2(z.x, abs(z.y));\n        float b = atan(a.y * (0.99 + animparam * 9.0), a.x + 0.110765 + animparam);\n        \n        if(b > 0.0) {\n            b -= 6.3034 + (animparam * 3.1513);\n        }\n        \n        z = vec2(log(length(a * (0.98899 - (animparam * 2.70 * anim2)))), b) + c2;\n\n        if (i > 0) {\n            mean += length(z / a * b);\n        }\n\n        mean += a.x - (b * 77.0 / length(a * b));\n    }\n    \n    mean = clamp(mean, 111.0, 99999.0) / 131.21;\n    float ci = 1.0 - fract(log2(0.5 * log2(mean / (0.5789 - abs(animparam * 141.0)))));\n\n    return vec3(\n        0.5 + 0.5 * cos(6.0 * ci),\n        0.5 + 0.75 * cos(6.0 * ci + 0.14),\n        0.5 + 0.5 * cos(6.0 * ci + 0.7)\n    );\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Static segmentation logic based on luminance\n    vec2 p = uv * scale;\n    float n = 0.0;\n    vec2 q = p;\n    mat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\n    float amp = 1.0;\n    float sumAmp = 0.0;\n\n    for(int i = 0; i < 4; i++) {\n        float noiseVal = node_noise(q + lum * 1.5);\n        float angle = noiseVal * 6.2831;\n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        q = rot * q * 1.3; \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    n /= sumAmp;\n\n    float branch = smoothstep(0.3, 0.7, n);\n    float topo = sin((lum * 2.0 + n) * lineDensity);\n    float lines = smoothstep(0.8, 0.95, topo);\n\n    // Fractal logic\n    float t = time * speed;\n    float animWings = 0.004 * cos(t * 0.5);\n    float animFlap = 0.011 * sin(t * 1.0);    \n    \n    // Displace UV for fractal using the segmentation noise to give a 3D feel\n    vec2 displacedUV = uv + (n - 0.5) * 0.1 * lum;\n    \n    vec2 f_uv = (displacedUV - 0.5) / (1.5113 * abs(sin(36.3199)));\n    f_uv.y -= animWings * 5.0; \n    \n    vec2 tuv = f_uv * 125.0;\n    f_uv = vec2(-tuv.y, 1.05 * tuv.x);\n    \n    float yCoord = max(displacedUV.y * resolution.y, 1.0);\n    float juliax = tan(36.3199) * 0.011 + 0.02 / (yCoord * 0.19531 * (1.0 - animFlap));\n    float juliay = cos(36.3199 * 0.213) * (0.022 + animFlap) + 5.66752 - (juliax * 1.5101);\n    \n    vec3 fractalColor = JuliaFractal(f_uv, vec2(juliax, juliay), animWings, animFlap);\n    fractalColor = vec3(1.0) - fractalColor.zyx;\n\n    // Mix fractal with source based on branch segmentation\n    vec3 effectCol = mix(source.rgb, fractalColor, branch);\n    \n    // Add 3D topographical lines\n    effectCol += vec3(1.0) * lines * lum * 1.5;\n\n    // Final mask based on luminance threshold\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    vec3 finalCol = mix(source.rgb, effectCol, mask);\n\n    return vec4(finalCol, source.a);\n}",
    "uniformValues": {
      "threshold": 0.445,
      "speed": 1,
      "scale": 10,
      "lineDensity": 20
    }
  },
  {
    "id": "recovered_timeline_a442302e_be1e_4f95_8c59_58e6e08c5c95",
    "name": "Time-Lit Animated HURA Hex Grid",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-a442302e-be1e-4f95-8c59-58e6e08c5c95 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Time-Lit Animated HURA Hex Grid\nuniform float scale; // @min 5.0 @max 50.0 @default 21.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.5\nuniform float morph3D; // @min 0.0 @max 1.0 @default 1.0\nuniform float animSpeed; // @min 0.0 @max 5.0 @default 2.0\n\nvec4 hexagon(in vec2 p) {\n    vec2 q = vec2(p.x * 1.1547006, p.y + p.x * 0.5773503);\n    vec2 pi = floor(q), pf = fract(q);\n    float v = mod(pi.x + pi.y, 3.0);\n    float ca = step(1.0, v), cb = step(2.0, v);\n    vec2 ma = step(pf.xy, pf.yx);\n    float e = dot(ma, 1.0 - pf.yx + ca * (pf.x + pf.y - 1.0) + cb * (pf.yx - 2.0 * pf.xy));\n    p = vec2(q.x + floor(0.5 + p.y / 1.5), 4.0 * p.y / 3.0) * 0.5 + 0.5;\n    float f = length((fract(p) - 0.5) * vec2(1.0, 0.85));\t\t\t\n    return vec4(pi + ca - cb * ma, e, f);\n}\n\nfloat URA(in vec2 p) {\n    float v = 151.0;\n    float r = 32.0;\n    float l = mod(p.y + r * p.x, v);\n    float rz = 1.0;\n    for(int i = 1; i < 76; i++) {\n        if (mod(float(i) * float(i), v) == l) rz = 0.0;\n    }\n    return rz;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    vec2 p = uv * 2.0 - 1.0;\n    p.x *= resolution.x / resolution.y;\n    \n    vec4 h = hexagon(p * scale);\n    vec3 col = vec3(URA(h.xy));\n    \n    // Morphable 3D bevel effect\n    float edge = smoothstep(-0.2, 0.13, h.z);\n    float bevel = mix(1.0, edge, morph3D);\n    \n    if (dot(col, vec3(1.0)) > 1.0) {\n        col *= bevel;\n    } else {\n        col = 1.0 - (1.0 - col) * bevel;\n    }\n    \n    // Calculate the center UV of the current hexagon to sample a single luma value per hex\n    vec2 centerP = vec2(h.x * 0.8660254, h.y - h.x * 0.5) / scale;\n    centerP.x *= resolution.y / resolution.x;\n    vec2 centerUV = centerP * 0.5 + 0.5;\n    \n    vec4 hexSource = texture2D(tex, centerUV);\n    float hexLuma = dot(hexSource.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Continuous linear sweep to avoid pausing at the peaks\n    float sweep = threshold + (abs(fract(time * animSpeed * 0.2) * 2.0 - 1.0) - 0.5) * 0.8;\n    float activeHex = step(sweep, hexLuma);\n    \n    // Calculate how \"deep\" into the lit state the hexagon is\n    float litDepth = max(0.0, hexLuma - sweep);\n    \n    // Generate a color based on the lit depth and time\n    vec3 timeColor = 0.5 + 0.5 * cos(litDepth * 15.0 - time * 3.0 + vec3(0.0, 2.0, 4.0));\n    \n    // Light up taken hexagons entirely, rest dark\n    vec3 finalColor = mix(vec3(0.0), col * timeColor * 1.5, activeHex);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "scale": 28.85,
      "threshold": 0.63,
      "morph3D": 1,
      "animSpeed": 0.85
    }
  },
  {
    "id": "recovered_timeline_69c4bbcb_2f7e_412f_8445_16b4eb13aa7c",
    "name": "Inverted Psy Spirals 3D",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-69c4bbcb-2f7e-412f-8445-16b4eb13aa7c in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Inverted Psy Spirals 3D\nuniform float scale; // @min 5.0 @max 50.0 @default 21.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.5\nuniform float morph3D; // @min 0.0 @max 2.0 @default 1.0\nuniform float animSpeed; // @min 0.0 @max 10.0 @default 5.0\n\nvec4 hexagon(in vec2 p) {\n    vec2 q = vec2(p.x * 1.1547006, p.y + p.x * 0.5773503);\n    vec2 pi = floor(q), pf = fract(q);\n    float v = mod(pi.x + pi.y, 3.0);\n    float ca = step(1.0, v), cb = step(2.0, v);\n    vec2 ma = step(pf.xy, pf.yx);\n    float e = dot(ma, 1.0 - pf.yx + ca * (pf.x + pf.y - 1.0) + cb * (pf.yx - 2.0 * pf.xy));\n    p = vec2(q.x + floor(0.5 + p.y / 1.5), 4.0 * p.y / 3.0) * 0.5 + 0.5;\n    float f = length((fract(p) - 0.5) * vec2(1.0, 0.85));\t\t\t\n    return vec4(pi + ca - cb * ma, e, f);\n}\n\nfloat URA(in vec2 p) {\n    float v = 151.0;\n    float r = 32.0;\n    float l = mod(p.y + r * p.x, v);\n    float rz = 1.0;\n    for(int i = 1; i < 76; i++) {\n        if (mod(float(i) * float(i), v) == l) rz = 0.0;\n    }\n    return rz;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    vec2 p = uv * 2.0 - 1.0;\n    p.x *= resolution.x / resolution.y;\n    \n    vec4 h = hexagon(p * scale);\n    vec3 col = vec3(URA(h.xy));\n    \n    // Calculate the center UV of the current hexagon\n    vec2 centerP = vec2(h.x * 0.8660254, h.y - h.x * 0.5) / scale;\n    vec2 centerP_aspect = centerP;\n    centerP_aspect.x *= resolution.y / resolution.x;\n    vec2 centerUV = centerP_aspect * 0.5 + 0.5;\n    \n    vec4 hexSource = texture2D(tex, centerUV);\n    float hexLuma = dot(hexSource.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Morphable 3D bevel effect driven by image luma\n    float edge = smoothstep(-0.2, 0.13, h.z);\n    float bevel = mix(1.0, edge, morph3D * hexLuma * 1.5);\n    \n    if (dot(col, vec3(1.0)) > 1.0) {\n        col *= bevel;\n    } else {\n        col = 1.0 - (1.0 - col) * bevel;\n    }\n    \n    float angle = atan(centerP.y, centerP.x);\n    float radius = length(centerP);\n    \n    // Offset centers for spirals to place them in different locations\n    vec2 offset1 = vec2(0.5, 0.3);\n    vec2 offset2 = vec2(-0.4, -0.6);\n    \n    float a1 = atan(centerP.y - offset1.y, centerP.x - offset1.x);\n    float r1 = length(centerP - offset1);\n    \n    float a2 = atan(centerP.y - offset2.y, centerP.x - offset2.x);\n    float r2 = length(centerP - offset2);\n    \n    // Multiple interacting spirals in different places\n    float sp1 = a1 * 3.0 - r1 * 15.0 - time * animSpeed;\n    float sp2 = a2 * -5.0 - r2 * 22.0 + time * animSpeed * 1.3;\n    float sp3 = angle * 8.0 + radius * 8.0 - time * animSpeed * 0.7;\n    \n    // Create interference pattern between the spirals\n    float interference = sin(sp1) * cos(sp2) + sin(sp3) * 0.5;\n    \n    // Animated threshold detection loop using the interacting spirals\n    float sweep = threshold + interference * 0.6;\n    \n    // Ensure black pixels stay black by forcing activeHex to 0 if luma is very low\n    float activeHex = step(sweep, hexLuma) * step(0.02, hexLuma);\n    \n    // Inverted color of the original image\n    vec3 invertedPalette = 1.0 - hexSource.rgb;\n    \n    // Light up taken hexagons entirely with inverted colors, rest dark\n    vec3 finalColor = mix(vec3(0.0), col * invertedPalette * 1.8, activeHex);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "scale": 46.85,
      "threshold": 1,
      "morph3D": 2,
      "animSpeed": 0.2
    }
  },
  {
    "id": "recovered_timeline_89887183_5939_4ac9_882b_e0157117766f",
    "name": "Animated HURA Hex Grid",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-89887183-5939-4ac9-882b-e0157117766f in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Animated HURA Hex Grid\nuniform float scale; // @min 5.0 @max 50.0 @default 21.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.5\nuniform float morph3D; // @min 0.0 @max 1.0 @default 1.0\nuniform float animSpeed; // @min 0.0 @max 5.0 @default 2.0\n\nvec4 hexagon(in vec2 p) {\n    vec2 q = vec2(p.x * 1.1547006, p.y + p.x * 0.5773503);\n    vec2 pi = floor(q), pf = fract(q);\n    float v = mod(pi.x + pi.y, 3.0);\n    float ca = step(1.0, v), cb = step(2.0, v);\n    vec2 ma = step(pf.xy, pf.yx);\n    float e = dot(ma, 1.0 - pf.yx + ca * (pf.x + pf.y - 1.0) + cb * (pf.yx - 2.0 * pf.xy));\n    p = vec2(q.x + floor(0.5 + p.y / 1.5), 4.0 * p.y / 3.0) * 0.5 + 0.5;\n    float f = length((fract(p) - 0.5) * vec2(1.0, 0.85));\t\t\t\n    return vec4(pi + ca - cb * ma, e, f);\n}\n\nfloat URA(in vec2 p) {\n    float v = 151.0;\n    float r = 32.0;\n    float l = mod(p.y + r * p.x, v);\n    float rz = 1.0;\n    for(int i = 1; i < 76; i++) {\n        if (mod(float(i) * float(i), v) == l) rz = 0.0;\n    }\n    return rz;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    vec2 p = uv * 2.0 - 1.0;\n    p.x *= resolution.x / resolution.y;\n    \n    vec4 h = hexagon(p * scale);\n    vec3 col = vec3(URA(h.xy));\n    \n    // Morphable 3D bevel effect\n    float edge = smoothstep(-0.2, 0.13, h.z);\n    float bevel = mix(1.0, edge, morph3D);\n    \n    if (dot(col, vec3(1.0)) > 1.0) {\n        col *= bevel;\n    } else {\n        col = 1.0 - (1.0 - col) * bevel;\n    }\n    \n    // Calculate the center UV of the current hexagon to sample a single luma value per hex\n    vec2 centerP = vec2(h.x * 0.8660254, h.y - h.x * 0.5) / scale;\n    centerP.x *= resolution.y / resolution.x;\n    vec2 centerUV = centerP * 0.5 + 0.5;\n    \n    vec4 hexSource = texture2D(tex, centerUV);\n    float hexLuma = dot(hexSource.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Continuous linear sweep to avoid pausing at the peaks\n    float sweep = threshold + (abs(fract(time * animSpeed * 0.2) * 2.0 - 1.0) - 0.5) * 0.8;\n    float activeHex = step(sweep, hexLuma);\n    \n    // Light up taken hexagons entirely, rest dark\n    vec3 finalColor = mix(vec3(0.0), col * source.rgb * 1.5, activeHex);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "scale": 42.8,
      "threshold": 0.51,
      "morph3D": 1,
      "animSpeed": 0.2
    }
  },
  {
    "id": "recovered_timeline_d35d9984_16b5_4e70_adf3_2f0da56bfd9f",
    "name": "Hex Automata Morph",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-d35d9984-16b5-4e70-adf3-2f0da56bfd9f in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Hex Automata Morph\nuniform float hexScale; // @min 5.0 @max 50.0 @default 21.0\nuniform float autoScale; // @min 2.0 @max 20.0 @default 10.0\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.5\nuniform float morph3D; // @min 0.0 @max 1.0 @default 1.0\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\n\nvec4 hexagon(in vec2 p) {\n    vec2 q = vec2(p.x * 1.1547006, p.y + p.x * 0.5773503);\n    vec2 pi = floor(q), pf = fract(q);\n    float v = mod(pi.x + pi.y, 3.0);\n    float ca = step(1.0, v), cb = step(2.0, v);\n    vec2 ma = step(pf.xy, pf.yx);\n    float e = dot(ma, 1.0 - pf.yx + ca * (pf.x + pf.y - 1.0) + cb * (pf.yx - 2.0 * pf.xy));\n    p = vec2(q.x + floor(0.5 + p.y / 1.5), 4.0 * p.y / 3.0) * 0.5 + 0.5;\n    float f = length((fract(p) - 0.5) * vec2(1.0, 0.85));\t\t\t\n    return vec4(pi + ca - cb * ma, e, f);\n}\n\nfloat URA(in vec2 p) {\n    float v = 151.0;\n    float r = 32.0;\n    float l = mod(p.y + r * p.x, v);\n    float rz = 1.0;\n    for(int i = 1; i < 76; i++) {\n        if (mod(float(i) * float(i), v) == l) rz = 0.0;\n    }\n    return rz;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // --- Hex Grid Structure ---\n    vec2 p = uv * 2.0 - 1.0;\n    p.x *= resolution.x / resolution.y;\n    \n    vec4 h = hexagon(p * hexScale);\n    vec3 hexCol = vec3(URA(h.xy));\n    \n    float edge = smoothstep(-0.2, 0.13, h.z);\n    float bevel = mix(1.0, edge, morph3D);\n    \n    if (dot(hexCol, vec3(1.0)) > 1.0) {\n        hexCol *= bevel;\n    } else {\n        hexCol = 1.0 - (1.0 - hexCol) * bevel;\n    }\n    \n    vec2 centerP = vec2(h.x * 0.8660254, h.y - h.x * 0.5) / hexScale;\n    centerP.x *= resolution.y / resolution.x;\n    vec2 centerUV = centerP * 0.5 + 0.5;\n    \n    vec4 hexSource = texture2D(tex, centerUV);\n    float hexLuma = dot(hexSource.rgb, vec3(0.299, 0.587, 0.114));\n    \n    float t = time * speed;\n    float waveNoise = node_noise(centerUV * 4.0 + vec2(t * 0.5, t * 0.3));\n    float sweep = threshold + (waveNoise - 0.5) * 1.5;\n    float activeHex = step(sweep, hexLuma);\n\n    // --- Seamless Luma Automata ---\n    vec2 pAuto = uv * autoScale;\n    float n = 0.0;\n    vec2 q = pAuto;\n    mat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\n    float amp = 1.0;\n    float sumAmp = 0.0;\n\n    for(int i = 0; i < 4; i++) {\n        vec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\n        float noiseVal = node_noise(q + tOffset + lum * 1.5);\n        float angle = noiseVal * 6.2831;\n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        q = rot * q * 1.3; \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    n /= sumAmp;\n\n    float branch = smoothstep(0.3, 0.7, n);\n    float topo = sin((lum * 2.0 + n) * lineDensity - t * 4.0);\n    float lines = smoothstep(0.8, 0.95, topo);\n\n    vec3 effectCol = mix(blobColor, branchColor, branch);\n    effectCol += vec3(1.0) * lines * lum * 1.5;\n\n    // --- Blend Automata onto 3D Hex Structure ---\n    // The automata wraps over the 3D beveled hexes, only appearing on active cells\n    vec3 morphedEffect = effectCol * hexCol * 1.5;\n    vec3 finalCol = mix(source.rgb, morphedEffect, activeHex * branch);\n\n    return vec4(finalCol, source.a);\n}",
    "uniformValues": {
      "hexScale": 46.4,
      "autoScale": 2,
      "speed": 2.13,
      "threshold": 1,
      "morph3D": 0.93,
      "lineDensity": 50,
      "blobColor": [
        0.2901960784313726,
        0.19607843137254902,
        0.5058823529411764
      ],
      "branchColor": [
        0.15294117647058825,
        0.00784313725490196,
        0.1411764705882353
      ]
    }
  },
  {
    "id": "recovered_timeline_bc2dbad2_a444_404d_8ae0_05659f25141e",
    "name": "Animated HURA Hex Grid 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-bc2dbad2-a444-404d-8ae0-05659f25141e in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Animated HURA Hex Grid\nuniform float scale; // @min 5.0 @max 50.0 @default 21.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.5\nuniform float morph3D; // @min 0.0 @max 1.0 @default 1.0\nuniform float animSpeed; // @min 0.0 @max 5.0 @default 2.0\n\nvec4 hexagon(in vec2 p) {\n    vec2 q = vec2(p.x * 1.1547006, p.y + p.x * 0.5773503);\n    vec2 pi = floor(q), pf = fract(q);\n    float v = mod(pi.x + pi.y, 3.0);\n    float ca = step(1.0, v), cb = step(2.0, v);\n    vec2 ma = step(pf.xy, pf.yx);\n    float e = dot(ma, 1.0 - pf.yx + ca * (pf.x + pf.y - 1.0) + cb * (pf.yx - 2.0 * pf.xy));\n    p = vec2(q.x + floor(0.5 + p.y / 1.5), 4.0 * p.y / 3.0) * 0.5 + 0.5;\n    float f = length((fract(p) - 0.5) * vec2(1.0, 0.85));\t\t\t\n    return vec4(pi + ca - cb * ma, e, f);\n}\n\nfloat URA(in vec2 p) {\n    float v = 151.0;\n    float r = 32.0;\n    float l = mod(p.y + r * p.x, v);\n    float rz = 1.0;\n    for(int i = 1; i < 76; i++) {\n        if (mod(float(i) * float(i), v) == l) rz = 0.0;\n    }\n    return rz;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    vec2 p = uv * 2.0 - 1.0;\n    p.x *= resolution.x / resolution.y;\n    \n    vec4 h = hexagon(p * scale);\n    vec3 col = vec3(URA(h.xy));\n    \n    // Morphable 3D bevel effect\n    float edge = smoothstep(-0.2, 0.13, h.z);\n    float bevel = mix(1.0, edge, morph3D);\n    \n    if (dot(col, vec3(1.0)) > 1.0) {\n        col *= bevel;\n    } else {\n        col = 1.0 - (1.0 - col) * bevel;\n    }\n    \n    // Calculate the center UV of the current hexagon to sample a single luma value per hex\n    vec2 centerP = vec2(h.x * 0.8660254, h.y - h.x * 0.5) / scale;\n    centerP.x *= resolution.y / resolution.x;\n    vec2 centerUV = centerP * 0.5 + 0.5;\n    \n    vec4 hexSource = texture2D(tex, centerUV);\n    float hexLuma = dot(hexSource.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Animated threshold detection loop\n    float sweep = threshold + sin(time * animSpeed) * 0.4;\n    float activeHex = step(sweep, hexLuma);\n    \n    // Light up taken hexagons entirely, rest dark\n    vec3 finalColor = mix(vec3(0.0), col * source.rgb * 1.5, activeHex);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "scale": 47.75,
      "threshold": 0.63,
      "morph3D": 1,
      "animSpeed": 0.85
    }
  },
  {
    "id": "recovered_timeline_41edc862_febf_4231_bd9d_dfa0f2b49000",
    "name": "Automata Halftone",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-41edc862-febf-4231-bd9d-dfa0f2b49000 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Automata Halftone\nuniform float gridSize; // @min 10.0 @max 60.0 @default 60.0\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.3\nuniform float lightSpeed; // @min 0.0 @max 5.0 @default 2.0\nuniform float lightFocus; // @min 1.0 @max 10.0 @default 3.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    // Adjust UV for aspect ratio to keep dots perfectly circular\n    vec2 aspect = vec2(resolution.x / resolution.y, 1.0);\n    vec2 scaledUV = uv * aspect * gridSize;\n    \n    // Find the center of the current grid cell\n    vec2 cellCenter = floor(scaledUV) + 0.5;\n    \n    // Convert cell center back to normalized UV space to sample the texture\n    vec2 sampleUV = cellCenter / (aspect * gridSize);\n    \n    // Clamp sampleUV to prevent edge seams from out-of-bounds sampling\n    sampleUV = clamp(sampleUV, 0.001, 0.999);\n    \n    // Sample the original image at the cell center\n    vec4 imgColor = texture2D(tex, sampleUV);\n    \n    // Calculate luminance\n    float luminance = dot(imgColor.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Apply black threshold to increase black areas\n    float lumAdjusted = smoothstep(blackThreshold, blackThreshold + 0.2, luminance);\n    \n    // 3D Point Light traveling in space\n    vec3 lightPos = vec3(\n        0.5 + 0.4 * sin(time * lightSpeed),\n        0.5 + 0.4 * cos(time * lightSpeed * 0.73),\n        0.3 + 0.2 * sin(time * lightSpeed * 1.1)\n    );\n    \n    // Calculate 3D distance from the invisible light to the current cell\n    vec3 surfacePos = vec3(sampleUV, 0.0);\n    float dist3D = length(lightPos - surfacePos);\n    \n    // Create a pointy, sharp light falloff\n    float lightIntensity = pow(max(0.0, 1.2 - dist3D * 1.5), lightFocus * 2.0);\n    \n    // Calculate distance from the current pixel to the cell center\n    float dist = length(scaledUV - cellCenter);\n    \n    // Determine dot radius\n    float radius = min(0.5, lumAdjusted * 0.5 * lightIntensity);\n    \n    // Create a smooth anti-aliased circle\n    float edge = 0.05;\n    float mask = 1.0 - smoothstep(max(0.0, radius - edge), radius + edge, dist);\n    \n    // Ensure areas below threshold or outside light have absolutely no dots\n    mask *= step(0.001, radius);\n    \n    // Automata-like procedural color choosing\n    float t = floor(time * 4.0);\n    float cx = floor(cellCenter.x);\n    float cy = floor(cellCenter.y);\n    \n    // Create a pseudo-cellular automata pattern using spatial math and time\n    float state = mod(cx * cy + cx + cy + t + floor(node_noise(vec2(cx, cy) * 0.15) * 3.0), 4.0);\n    \n    vec3 dotColor;\n    if (state < 1.0) {\n        dotColor = vec3(1.0, 0.2, 0.3); // Red/Pink\n    } else if (state < 2.0) {\n        dotColor = vec3(0.2, 0.8, 0.4); // Green\n    } else if (state < 3.0) {\n        dotColor = vec3(0.1, 0.6, 1.0); // Blue\n    } else {\n        dotColor = vec3(0.9, 0.8, 0.1); // Yellow\n    }\n    \n    // Mix pure black background with the automata dot color\n    vec3 finalColor = mix(vec3(0.0), dotColor, mask);\n    \n    return vec4(finalColor, 1.0);\n}",
    "uniformValues": {
      "gridSize": 52.5,
      "blackThreshold": 0.28,
      "lightSpeed": 1.3,
      "lightFocus": 2.53
    }
  },
  {
    "id": "recovered_timeline_0066d2f6_a6bd_40ae_8435_d8a5abb63839",
    "name": "Time Colored Halftone",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-0066d2f6-a6bd-40ae-8435-d8a5abb63839 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Time Colored Halftone\nuniform float gridSize; // @min 10.0 @max 200.0 @default 60.0\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.3\nuniform float lightSpeed; // @min 0.0 @max 5.0 @default 2.0\nuniform float lightFocus; // @min 1.0 @max 10.0 @default 3.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    // Adjust UV for aspect ratio to keep dots perfectly circular\n    vec2 aspect = vec2(resolution.x / resolution.y, 1.0);\n    vec2 scaledUV = uv * aspect * gridSize;\n    \n    // Find the center of the current grid cell\n    vec2 cellCenter = floor(scaledUV) + 0.5;\n    \n    // Convert cell center back to normalized UV space to sample the texture\n    vec2 sampleUV = cellCenter / (aspect * gridSize);\n    \n    // Clamp sampleUV to prevent edge seams from out-of-bounds sampling\n    sampleUV = clamp(sampleUV, 0.001, 0.999);\n    \n    // Sample the original image at the cell center\n    vec4 imgColor = texture2D(tex, sampleUV);\n    \n    // Calculate luminance\n    float luminance = dot(imgColor.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Apply black threshold to increase black areas\n    float lumAdjusted = smoothstep(blackThreshold, blackThreshold + 0.2, luminance);\n    \n    // 3D Point Light traveling in space\n    vec3 lightPos = vec3(\n        0.5 + 0.4 * sin(time * lightSpeed),\n        0.5 + 0.4 * cos(time * lightSpeed * 0.73),\n        0.3 + 0.2 * sin(time * lightSpeed * 1.1) // Z depth movement\n    );\n    \n    // Calculate 3D distance from the invisible light to the current cell\n    vec3 surfacePos = vec3(sampleUV, 0.0);\n    float dist3D = length(lightPos - surfacePos);\n    \n    // Create a pointy, sharp light falloff\n    float lightIntensity = pow(max(0.0, 1.2 - dist3D * 1.5), lightFocus * 2.0);\n    \n    // Calculate distance from the current pixel to the cell center\n    float dist = length(scaledUV - cellCenter);\n    \n    // Determine dot radius based on adjusted luminance and 3D light intensity\n    // Increased multiplier from 0.5 to 0.9 to make dots bigger\n    float radius = lumAdjusted * 0.9 * lightIntensity;\n    \n    // Create a smooth anti-aliased circle\n    float edge = 0.05;\n    float mask = 1.0 - smoothstep(max(0.0, radius - edge), radius + edge, dist);\n    \n    // Ensure areas below threshold or outside light have absolutely no dots\n    mask *= step(0.001, radius);\n    \n    // Generate a dynamic color based on time\n    vec3 timeColor = 0.5 + 0.5 * cos(time * 2.0 + vec3(0.0, 2.0, 4.0));\n    \n    // Mix pure black background with the time-based dot color\n    vec3 finalColor = mix(vec3(0.0), timeColor, mask);\n    \n    return vec4(finalColor, 1.0);\n}",
    "uniformValues": {
      "gridSize": 135.4,
      "blackThreshold": 0.36,
      "lightSpeed": 4.2,
      "lightFocus": 4.15
    }
  },
  {
    "id": "recovered_timeline_a49fa85b_9600_48bf_88e6_18bfdcea46d2",
    "name": "Halftone Tribadelica",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-a49fa85b-9600-48bf-88e6-18bfdcea46d2 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Halftone Tribadelica\nuniform float gridSize; // @min 20.0 @max 250.0 @default 80.0\nuniform float zoom; // @min 0.5 @max 5.0 @default 1.0\nuniform float breathIntensity; // @min 0.0 @max 2.0 @default 0.60\nuniform float breathChaos; // @min 0.0 @max 20.0 @default 6.0\n\n// 2D Simplex Noise for organic breathing\nvec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }\nfloat snoise(vec2 v){\n    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);\n    vec2 i  = floor(v + dot(v, C.yy) );\n    vec2 x0 = v -   i + dot(i, C.xx);\n    vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);\n    vec4 x12 = x0.xyxy + C.xxzz;\n    x12.xy -= i1;\n    i = mod(i, 289.0);\n    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));\n    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);\n    m = m*m; m = m*m;\n    vec3 x = 2.0 * fract(p * C.www) - 1.0;\n    vec3 h = abs(x) - 0.5;\n    vec3 ox = floor(x + 0.5);\n    vec3 a0 = x - ox;\n    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );\n    vec3 g;\n    g.x  = a0.x  * x0.x  + h.x  * x0.y;\n    g.yz = a0.yz * x12.xz + h.yz * x12.yw;\n    return 130.0 * dot(m, g);\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    // Aspect correction for circular dots\n    vec2 aspect = vec2(resolution.x / resolution.y, 1.0);\n    vec2 scaledUV = uv * aspect * gridSize;\n    \n    // Grid Logic\n    vec2 cellCenter = floor(scaledUV) + 0.5;\n    vec2 sampleUV = cellCenter / (aspect * gridSize);\n    \n    // Apply zoom to sampling\n    vec2 zoomedSampleUV = (sampleUV - 0.5) * zoom + 0.5;\n    vec4 texColor = texture2D(tex, zoomedSampleUV);\n    float b = (texColor.r + texColor.g + texColor.b) / 3.0; // Use luminance as density\n    \n    // Breathing Height at cell center\n    float n1 = snoise(sampleUV * 8.0 + time * 0.2);\n    float breath = sin(time * 3.5 + n1 * breathChaos) * 0.5 + 0.5;\n    float height = b + (b * breath * breathIntensity);\n\n    // 3D Point Light (sweeping through space)\n    vec3 lightPos = vec3(\n        0.5 + 0.4 * sin(time * 1.5),\n        0.5 + 0.4 * cos(time * 1.1),\n        0.2 + 0.2 * sin(time * 2.0)\n    );\n    vec3 surfacePos = vec3(sampleUV, height * 0.1);\n    float dist3D = length(lightPos - surfacePos);\n    \n    // Light falloff logic\n    float lightIntensity = pow(max(0.0, 1.2 - dist3D * 1.8), 6.0);\n    \n    // Halftone Radius Calculation\n    float dist = length(scaledUV - cellCenter);\n    float radius = smoothstep(0.05, 0.25, b) * 0.8 * lightIntensity;\n    \n    // Dot mask with antialiasing\n    float mask = 1.0 - smoothstep(radius - 0.05, radius + 0.05, dist);\n    mask *= step(0.005, radius); // Clean cutoff for very small dots\n\n    // Dynamic Time-Based Color\n    vec3 timeColor = 0.5 + 0.5 * cos(time * 1.2 + b * 2.0 + vec3(0.0, 2.0, 4.0));\n    \n    // Final composite: Colored dots on a black background\n    vec3 finalColor = mix(vec3(0.0), timeColor, mask);\n    \n    return vec4(finalColor, 1.0);\n}",
    "uniformValues": {
      "gridSize": 164.9,
      "zoom": 1.13,
      "breathIntensity": 1.9,
      "breathChaos": 1
    }
  },
  {
    "id": "recovered_timeline_6fd2b35c_8ffe_4548_b7d0_9e608dda317c",
    "name": "Emboss Light Pro",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-6fd2b35c-8ffe-4548-b7d0-9e608dda317c in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Emboss Light Pro\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.1\nuniform float lightIntensity; // @min 0.0 @max 5.0 @default 1.0\nuniform float lightSpeed; // @min 0.0 @max 5.0 @default 1.0\nuniform float dispStrength; // @min 0.0 @max 20.0 @default 8.0\nuniform vec3 lightColor; // @default 1.0,0.75,0.25\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float luma = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n\n    // Apply only to non-black pixels based on threshold\n    if (luma <= threshold) {\n        return source;\n    }\n\n    vec2 pixelSize = 1.0 / resolution;\n    vec2 aspect = vec2(1.0, resolution.y / resolution.x);\n    vec2 lightSize = vec2(4.0);\n\n    // Get the gradients from the image\n    vec2 d = pixelSize * 2.0;\n    vec4 dx = (texture2D(tex, uv + vec2(1.0, 0.0) * d) - texture2D(tex, uv - vec2(1.0, 0.0) * d)) * 0.5;\n    vec4 dy = (texture2D(tex, uv + vec2(0.0, 1.0) * d) - texture2D(tex, uv - vec2(0.0, 1.0) * d)) * 0.5;\n\n    // Add tighter pixel gradients\n    d = pixelSize * 1.0;\n    dx += texture2D(tex, uv + vec2(1.0, 0.0) * d) - texture2D(tex, uv - vec2(1.0, 0.0) * d);\n    dy += texture2D(tex, uv + vec2(0.0, 1.0) * d) - texture2D(tex, uv - vec2(0.0, 1.0) * d);\n\n    vec2 displacement = vec2(dx.x, dy.x) * lightSize; \n    \n    // Animate light position with adjustable speed\n    vec2 lightPos = vec2(0.5) + vec2(sin(time * lightSpeed), cos(time * lightSpeed)) * 0.3;\n\n    float dist = distance(0.5 + (uv - 0.5) * aspect * lightSize + displacement, \n                          0.5 + (lightPos - 0.5) * aspect * lightSize);\n    float light = pow(max(1.0 - dist, 0.0), 4.0) * lightIntensity;\n\n    // Recolor the red channel with adjustable displacement strength\n    vec2 dispUv = uv + vec2(dx.x, dy.x) * pixelSize * dispStrength;\n    float dispR = texture2D(tex, dispUv).x;\n    vec4 rd = vec4(dispR) * vec4(0.7, 1.5, 2.0, 1.0) - vec4(0.3, 1.0, 1.0, 1.0);\n\n    // Add the light map with custom color\n    vec4 finalColor = mix(rd, vec4(lightColor * 8.0, 1.0), light * 0.75 * (1.0 - dispR));\n    \n    // Preserve original alpha\n    return vec4(clamp(finalColor.rgb, 0.0, 1.0), source.a);\n}",
    "uniformValues": {
      "threshold": 0.08,
      "lightIntensity": 4.45,
      "lightSpeed": 1.35,
      "dispStrength": 3,
      "lightColor": [
        0.4392156862745098,
        0.39215686274509803,
        0.2980392156862745
      ]
    }
  },
  {
    "id": "recovered_timeline_9cfdae90_6a09_4e2a_9a0c_3c52ffdee7fe",
    "name": "Seamless Luma Automata",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-9cfdae90-6a09-4e2a-9a0c-3c52ffdee7fe in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Seamless Luma Automata\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Calculate luminance (the \"3Dness\" or shadow/highlight map of the image)\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Threshold mask: only affect pixels that are not completely black\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    \n    // Early exit for black pixels to save performance and keep them untouched\n    if (mask <= 0.0) {\n        return source;\n    }\n\n    vec2 p = uv * scale;\n    float t = time * speed;\n\n    float n = 0.0;\n    vec2 q = p;\n    \n    // Rotation matrix to break up noise grid seams and prevent horizontal/vertical artifacts\n    mat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\n    float amp = 1.0;\n    float sumAmp = 0.0;\n\n    // Automata growth influenced by the image's luminance\n    for(int i = 0; i < 4; i++) {\n        // Circular time offset to avoid linear sliding seams\n        vec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\n        \n        // Luminance drives the flow\n        float noiseVal = node_noise(q + tOffset + lum * 1.5);\n        float angle = noiseVal * 6.2831;\n        \n        // The shadow/light of the image influences the spread of the automata\n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        \n        // Rotate and scale coordinates to completely hide underlying noise grids\n        q = rot * q * 1.3; \n        \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    \n    // Normalize noise\n    n /= sumAmp;\n\n    // Isolate branching structures\n    float branch = smoothstep(0.3, 0.7, n);\n\n    // Lines flowing through the \"3Dness\" (luminance + noise displacement)\n    // This creates topographical contour lines that follow the image depth\n    float topo = sin((lum * 2.0 + n) * lineDensity - t * 4.0);\n    float lines = smoothstep(0.8, 0.95, topo);\n\n    // Color mixing based on the automata branches\n    vec3 effectCol = mix(blobColor, branchColor, branch);\n    \n    // Add glowing lines that pop more in the brighter areas of the original image\n    effectCol += vec3(1.0) * lines * lum * 1.5;\n\n    // Blend the effect with the original image based on the threshold mask and growth\n    vec3 finalCol = mix(source.rgb, effectCol, mask * branch);\n\n    return vec4(finalCol, source.a);\n}",
    "uniformValues": {
      "speed": 0.8,
      "scale": 10,
      "threshold": 0.305,
      "lineDensity": 20,
      "blobColor": [
        0.2,
        0.9,
        0.6
      ],
      "branchColor": [
        0.8,
        0.3,
        0.7
      ]
    }
  },
  {
    "id": "recovered_timeline_ceefaa6f_a2dd_4ad8_b42a_0f1c36fe031f",
    "name": "Festival Fluid Relief V2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-ceefaa6f-a2dd-4ad8-b42a-0f1c36fe031f in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Festival Fluid Relief V2\nuniform float distortion; // @min 0.0 @max 0.2 @default 0.05\nuniform float distFreq; // @min 1.0 @max 20.0 @default 6.28\nuniform float distSpeed; // @min 0.0 @max 10.0 @default 2.5\nuniform float heightScale; // @min 1.0 @max 20.0 @default 8.0\nuniform float lightDepth; // @min 0.1 @max 5.0 @default 0.8\nuniform float imageWeight; // @min 0.0 @max 1.0 @default 0.6\n\nfloat getHeight(sampler2D tex, vec2 uv) {\n    return dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n}\n\nvec3 getNormal(sampler2D tex, vec2 uv, vec2 res) {\n    vec2 e = vec2(1.0 / res.x, 1.0 / res.y);\n    float hx = getHeight(tex, uv + vec2(e.x, 0.0)) - getHeight(tex, uv - vec2(e.x, 0.0));\n    float hy = getHeight(tex, uv + vec2(0.0, e.y)) - getHeight(tex, uv - vec2(0.0, e.y));\n    return normalize(vec3(-hx * heightScale, -hy * heightScale, 1.0));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    if (getHeight(tex, uv) < 0.05) {\n        return source;\n    }\n    \n    vec3 nor = getNormal(tex, uv, resolution);\n    \n    // Customizable Fluid UV distortion\n    vec2 distUv = uv + nor.xy * distortion * sin(time * distSpeed + uv.y * distFreq);\n    vec4 distColor = texture2D(tex, distUv);\n    \n    vec3 pos = vec3(uv * 2.0 - 1.0, 0.0);\n    vec3 camRd = normalize(vec3(0.0, 0.0, -1.0));\n    \n    // Dynamic Festival Colors\n    float t = time * 2.5;\n    vec3 col1 = vec3(0.6 + 0.4 * sin(t), 0.1, 0.7 + 0.3 * cos(t * 1.3));\n    vec3 col2 = vec3(0.1, 0.6 + 0.4 * sin(t * 1.1), 0.8 + 0.2 * cos(t * 0.8));\n    \n    // Light 1 (Wandering)\n    vec3 lp1 = vec3(sin(t * 0.7) * 0.8, cos(t * 0.5) * 0.8, lightDepth);\n    vec3 ld1 = normalize(lp1 - pos);\n    float dist1 = length(lp1 - pos);\n    float att1 = 1.0 / (1.0 + dist1 * dist1 * 2.0);\n    float diff1 = max(dot(nor, ld1), 0.0);\n    float spec1 = pow(max(dot(nor, normalize(ld1 + camRd)), 0.0), 32.0);\n    \n    // Light 2 (Counter-Wandering)\n    vec3 lp2 = vec3(cos(t * 0.6) * 0.8, sin(t * 0.9) * 0.8, lightDepth);\n    vec3 ld2 = normalize(lp2 - pos);\n    float dist2 = length(lp2 - pos);\n    float att2 = 1.0 / (1.0 + dist2 * dist2 * 2.0);\n    float diff2 = max(dot(nor, ld2), 0.0);\n    float spec2 = pow(max(dot(nor, normalize(ld2 + camRd)), 0.0), 32.0);\n    \n    // Combine lighting (Edge/rim lighting removed to fix border glow)\n    vec3 illum = (col1 * (diff1 + spec1) * att1) + (col2 * (diff2 + spec2) * att2);\n    \n    // Mix base color with vibrant illumination, keeping more of the original image\n    vec3 finalColor = mix(illum * distColor.rgb * 2.0, distColor.rgb, imageWeight);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "distortion": 0.1,
      "distFreq": 6.28,
      "distSpeed": 2.5,
      "heightScale": 20,
      "lightDepth": 0.1,
      "imageWeight": 0.96
    }
  },
  {
    "id": "recovered_timeline_8cd13d99_c0a0_4c78_af53_a0ad97e4a283",
    "name": "3D Topo Glass",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-8cd13d99-c0a0-4c78-af53-a0ad97e4a283 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Topo Glass\nuniform float speed; // @min 0.0 @max 3.0 @default 0.5\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float distortion; // @min 0.0 @max 0.2 @default 0.05\nuniform float specularity; // @min 0.0 @max 2.0 @default 1.2\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\n\nfloat getHeight(sampler2D tex, vec2 uv, float t, float scale, float lineDensity) {\n    float lum = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n    vec2 p = uv * scale;\n    float n = 0.0;\n    vec2 q = p;\n    mat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\n    float amp = 1.0;\n    float sumAmp = 0.0;\n    \n    for(int i = 0; i < 3; i++) {\n        float noiseVal = node_noise(q + lum * 1.5);\n        float angle = noiseVal * 6.2831;\n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        q = rot * q * 1.3; \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    n /= sumAmp;\n    \n    // Topographical segmentation based on luminance and noise\n    float topo = sin((lum * 2.0 + n) * lineDensity - t * 2.0);\n    return topo * 0.1;\n}\n\nvec3 getNormal(sampler2D tex, vec2 uv, float t, float scale, float lineDensity) {\n    vec2 e = vec2(0.002, 0.0);\n    float h = getHeight(tex, uv, t, scale, lineDensity);\n    float hx = getHeight(tex, uv + e.xy, t, scale, lineDensity);\n    float hy = getHeight(tex, uv + e.yx, t, scale, lineDensity);\n    return normalize(vec3(hx - h, hy - h, 0.01));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 originalColor = texture2D(tex, uv);\n    \n    float luma = dot(originalColor.rgb, vec3(0.299, 0.587, 0.114));\n    float mask = smoothstep(threshold - 0.05, threshold + 0.05, luma);\n    \n    float t = time * speed;\n    vec3 n = getNormal(tex, uv, t, scale, lineDensity);\n    \n    // Refraction based on the topographical surface normal\n    vec2 refractedUV = uv - n.xy * distortion;\n    vec4 effectColor = texture2D(tex, refractedUV);\n    \n    // 3D Lighting setup\n    vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));\n    vec3 viewDir = vec3(0.0, 0.0, 1.0);\n    vec3 halfVector = normalize(lightDir + viewDir);\n    \n    // Specular highlights (glass reflection)\n    float spec = pow(max(dot(n, halfVector), 0.0), 64.0) * specularity;\n    \n    // Fresnel effect for edges\n    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0) * 0.4;\n    \n    vec3 finalEffectColor = effectColor.rgb + vec3(spec) + vec3(fresnel);\n    \n    // Blend original and effect based on the luminance mask\n    vec3 finalColor = mix(originalColor.rgb, finalEffectColor, mask);\n    \n    return vec4(finalColor, originalColor.a);\n}",
    "uniformValues": {
      "speed": 2.13,
      "scale": 10,
      "distortion": 0.028,
      "specularity": 0.28,
      "lineDensity": 20,
      "threshold": 0.15
    }
  },
  {
    "id": "recovered_timeline_42a47a9a_f4e3_4a97_b974_93b24bb920cd",
    "name": "Pastel Child Drawing",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-42a47a9a-f4e3-4a97-b974-93b24bb920cd in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Pastel Child Drawing\nuniform float wobbleAmount; // @min 0.0 @max 0.02 @default 0.005\nuniform float wobbleSpeed; // @min 0.0 @max 10.0 @default 3.0\nuniform bool radialWobble; // @default false\nuniform float edgeIntensity; // @min 0.0 @max 5.0 @default 2.0\nuniform float pixelation; // @min 1.0 @max 10.0 @default 2.0\nuniform float contrast; // @min 0.0 @max 5.0 @default 1.5\nuniform float darkWobbleThreshold; // @min 0.0 @max 1.0 @default 0.3\nuniform float bgBlackThreshold; // @min 0.0 @max 1.0 @default 0.05\n\nfloat getLuma(vec3 color) {\n    return dot(color, vec3(0.299, 0.587, 0.114));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 origColor = texture2D(tex, uv);\n    float luma = getLuma(origColor.rgb);\n    float contrastedLuma = clamp((luma - 0.5) * contrast + 0.5, 0.0, 1.0);\n    \n    vec2 wobbleUv = uv;\n    \n    // Wobble logic applied only to dark spots based on threshold\n    if (contrastedLuma < darkWobbleThreshold) {\n        if (radialWobble) {\n            vec2 toCenter = uv - 0.5;\n            float dist = length(toCenter);\n            vec2 dir = dist > 0.0001 ? toCenter / dist : vec2(0.0);\n            wobbleUv += dir * sin(dist * 30.0 - time * wobbleSpeed) * wobbleAmount;\n        } else {\n            wobbleUv += vec2(\n                sin(uv.y * 30.0 + time * wobbleSpeed),\n                cos(uv.x * 30.0 + time * wobbleSpeed)\n            ) * wobbleAmount;\n        }\n    }\n    \n    // Slight pixelation for the chunky crayon/pastel feel\n    vec2 resPix = resolution / pixelation;\n    vec2 sampleUv = floor(wobbleUv * resPix) / resPix;\n    \n    vec2 texel = 1.0 / resolution;\n    \n    // Edge detection on wobbled and pixelated UV\n    float hx = getLuma(texture2D(tex, sampleUv + vec2(texel.x, 0.0)).rgb) - getLuma(texture2D(tex, sampleUv - vec2(texel.x, 0.0)).rgb);\n    float hy = getLuma(texture2D(tex, sampleUv + vec2(0.0, texel.y)).rgb) - getLuma(texture2D(tex, sampleUv - vec2(0.0, texel.y)).rgb);\n    float edge = length(vec2(hx, hy)) * edgeIntensity;\n    \n    // Paper grain noise to make it look like pencil/pastel on paper\n    float grain = fract(sin(dot(sampleUv, vec2(12.9898, 78.233))) * 43758.5453) * 0.1;\n    \n    vec4 finalColor = texture2D(tex, sampleUv);\n    finalColor.rgb = clamp((finalColor.rgb - 0.5) * contrast + 0.5, 0.0, 1.0);\n    finalColor.rgb -= edge;\n    finalColor.rgb -= grain;\n    \n    // Preserve original black background\n    float bgMask = step(luma, bgBlackThreshold);\n    finalColor.rgb = mix(finalColor.rgb, origColor.rgb, bgMask);\n    \n    return vec4(finalColor.rgb, origColor.a);\n}",
    "uniformValues": {
      "wobbleAmount": 0.0154,
      "wobbleSpeed": 2.2,
      "radialWobble": true,
      "edgeIntensity": 5,
      "pixelation": 10,
      "contrast": 1.45,
      "darkWobbleThreshold": 0.66,
      "bgBlackThreshold": 0
    }
  },
  {
    "id": "recovered_timeline_69fe5e13_61dd_4e4f_b168_673cdb2e02dd",
    "name": "Festival Fluid Relief V2 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-69fe5e13-61dd-4e4f-b168-673cdb2e02dd in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Festival Fluid Relief V2\nuniform float distortion; // @min 0.0 @max 0.2 @default 0.05\nuniform float distFreq; // @min 1.0 @max 20.0 @default 6.28\nuniform float distSpeed; // @min 0.0 @max 10.0 @default 2.5\nuniform float heightScale; // @min 1.0 @max 20.0 @default 8.0\nuniform float lightDepth; // @min 0.1 @max 5.0 @default 0.8\nuniform float imageWeight; // @min 0.0 @max 1.0 @default 0.6\n\nfloat getHeight(sampler2D tex, vec2 uv) {\n    return dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n}\n\nvec3 getNormal(sampler2D tex, vec2 uv, vec2 res) {\n    vec2 e = vec2(1.0 / res.x, 1.0 / res.y);\n    float hx = getHeight(tex, uv + vec2(e.x, 0.0)) - getHeight(tex, uv - vec2(e.x, 0.0));\n    float hy = getHeight(tex, uv + vec2(0.0, e.y)) - getHeight(tex, uv - vec2(0.0, e.y));\n    return normalize(vec3(-hx * heightScale, -hy * heightScale, 1.0));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    if (getHeight(tex, uv) < 0.05) {\n        return source;\n    }\n    \n    vec3 nor = getNormal(tex, uv, resolution);\n    \n    // Customizable Fluid UV distortion\n    vec2 distUv = uv + nor.xy * distortion * sin(time * distSpeed + uv.y * distFreq);\n    vec4 distColor = texture2D(tex, distUv);\n    \n    vec3 pos = vec3(uv * 2.0 - 1.0, 0.0);\n    vec3 camRd = normalize(vec3(0.0, 0.0, -1.0));\n    \n    // Dynamic Festival Colors\n    float t = time * 2.5;\n    vec3 col1 = vec3(0.6 + 0.4 * sin(t), 0.1, 0.7 + 0.3 * cos(t * 1.3));\n    vec3 col2 = vec3(0.1, 0.6 + 0.4 * sin(t * 1.1), 0.8 + 0.2 * cos(t * 0.8));\n    \n    // Light 1 (Wandering)\n    vec3 lp1 = vec3(sin(t * 0.7) * 0.8, cos(t * 0.5) * 0.8, lightDepth);\n    vec3 ld1 = normalize(lp1 - pos);\n    float dist1 = length(lp1 - pos);\n    float att1 = 1.0 / (1.0 + dist1 * dist1 * 2.0);\n    float diff1 = max(dot(nor, ld1), 0.0);\n    float spec1 = pow(max(dot(nor, normalize(ld1 + camRd)), 0.0), 32.0);\n    \n    // Light 2 (Counter-Wandering)\n    vec3 lp2 = vec3(cos(t * 0.6) * 0.8, sin(t * 0.9) * 0.8, lightDepth);\n    vec3 ld2 = normalize(lp2 - pos);\n    float dist2 = length(lp2 - pos);\n    float att2 = 1.0 / (1.0 + dist2 * dist2 * 2.0);\n    float diff2 = max(dot(nor, ld2), 0.0);\n    float spec2 = pow(max(dot(nor, normalize(ld2 + camRd)), 0.0), 32.0);\n    \n    // Combine lighting (Edge/rim lighting removed to fix border glow)\n    vec3 illum = (col1 * (diff1 + spec1) * att1) + (col2 * (diff2 + spec2) * att2);\n    \n    // Mix base color with vibrant illumination, keeping more of the original image\n    vec3 finalColor = mix(illum * distColor.rgb * 2.0, distColor.rgb, imageWeight);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "distortion": 0.2,
      "distFreq": 5.56,
      "distSpeed": 1.6,
      "heightScale": 5.94,
      "lightDepth": 0.786,
      "imageWeight": 0.07
    }
  },
  {
    "id": "recovered_timeline_40ed00c5_94d9_4f43_8cb3_7eaf55bfe2aa",
    "name": "3D Luma Automata Lights",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-40ed00c5-94d9-4f43-8cb3-7eaf55bfe2aa in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Luma Automata Lights\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float bump; // @min 0.1 @max 5.0 @default 1.5\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\n\nfloat getLum(sampler2D tex, vec2 uv) {\n    vec3 col = texture2D(tex, uv).rgb;\n    return dot(col, vec3(0.299, 0.587, 0.114));\n}\n\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\n    float lum = getLum(tex, uv);\n    vec2 p = uv * s;\n    float t = time * spd;\n    float n = 0.0;\n    vec2 q = p;\n    \n    mat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\n    float amp = 1.0;\n    float sumAmp = 0.0;\n\n    for(int i = 0; i < 3; i++) {\n        vec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\n        float noiseVal = node_noise(q + tOffset + lum * 1.5);\n        float angle = noiseVal * 6.2831;\n        \n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        q = rot * q * 1.3; \n        \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    return n / sumAmp;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    \n    if (mask <= 0.0) {\n        return source;\n    }\n\n    float eps = 0.01;\n    \n    // Calculate 3D normal from the automata height map\n    float h0 = getHeight(tex, uv, time, scale, speed);\n    float hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\n    float hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\n    \n    vec3 normal = normalize(vec3(h0 - hx, h0 - hy, eps * 2.0 / bump));\n    vec3 surfacePos = vec3(uv, h0 * bump * 0.05);\n    \n    vec3 totalLight = vec3(0.0);\n    \n    // 15 invisible lights of different colors moving in 3D space\n    for(int i = 0; i < 15; i++) {\n        float fi = float(i);\n        \n        vec3 lPos = vec3(\n            0.5 + 0.8 * sin(time * 0.3 + fi * 2.1),\n            0.5 + 0.8 * cos(time * 0.4 + fi * 1.7),\n            0.3 + 0.4 * sin(time * 0.5 + fi * 0.8)\n        );\n        \n        vec3 lCol = vec3(\n            0.5 + 0.5 * sin(fi * 1.3),\n            0.5 + 0.5 * sin(fi * 2.4 + 2.0),\n            0.5 + 0.5 * sin(fi * 3.1 + 4.0)\n        );\n        \n        vec3 lDir = lPos - surfacePos;\n        float dist = length(lDir);\n        lDir = normalize(lDir);\n        \n        float diff = max(dot(normal, lDir), 0.0);\n        float atten = 1.0 / (1.0 + dist * dist * 8.0);\n        \n        totalLight += lCol * diff * atten * 0.5;\n    }\n    \n    // Combine the 3D illumination with the original texture\n    vec3 finalColor = mix(source.rgb, source.rgb * totalLight * 2.0, mask);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "speed": 2.942,
      "scale": 2,
      "bump": 5,
      "threshold": 0.05
    }
  },
  {
    "id": "recovered_timeline_169bf921_3562_46c1_8210_b7f07bf727c0",
    "name": "Concentric 3D Lights Mirrored X",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-169bf921-3562-46c1-8210-b7f07bf727c0 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Concentric 3D Lights Mirrored X\nuniform float scale; // @min 10.0 @max 100.0 @default 40.0\nuniform float bump; // @min 0.1 @max 5.0 @default 1.5\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.5\nuniform float centerY; // @min 0.0 @max 1.0 @default 0.5\nuniform bool mirror; // @default false\nuniform float mirrorX; // @min 0.0 @max 1.0 @default 0.5\n\nfloat getH(vec2 p, vec2 c, vec2 aspect, float t, float s, bool m, float mX) {\n    float d = length((p - c) * aspect);\n    if (m) {\n        // Calculate the reflected center across the vertical line at mirrorX\n        vec2 c2 = vec2(2.0 * mX - c.x, c.y);\n        float d2 = length((p - c2) * aspect);\n        d = min(d, d2);\n    }\n    return sin(d * s - t);\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    float eps = 0.01;\n    float t = time * 4.0;\n    vec2 aspect = vec2(resolution.x / resolution.y, 1.0);\n    vec2 center = vec2(centerX, centerY);\n    \n    // Calculate distances from center(s) for normal estimation\n    float h0 = getH(uv, center, aspect, t, scale, mirror, mirrorX);\n    float hx = getH(uv + vec2(eps, 0.0), center, aspect, t, scale, mirror, mirrorX);\n    float hy = getH(uv + vec2(0.0, eps), center, aspect, t, scale, mirror, mirrorX);\n    \n    // Calculate 3D normal from the smooth ripple height map\n    vec3 normal = normalize(vec3(h0 - hx, h0 - hy, eps * 2.0 / bump));\n    vec3 surfacePos = vec3(uv, h0 * bump * 0.05);\n    \n    vec3 totalLight = vec3(0.0);\n    \n    // 20 invisible lights of different colors moving in 3D space\n    for(int i = 0; i < 20; i++) {\n        float fi = float(i);\n        \n        vec3 lPos = vec3(\n            0.5 + 0.8 * sin(time * 0.3 + fi * 2.1),\n            0.5 + 0.8 * cos(time * 0.4 + fi * 1.7),\n            0.3 + 0.4 * sin(time * 0.5 + fi * 0.8)\n        );\n        \n        vec3 lCol = vec3(\n            0.5 + 0.5 * sin(fi * 1.3),\n            0.5 + 0.5 * sin(fi * 2.4 + 2.0),\n            0.5 + 0.5 * sin(fi * 3.1 + 4.0)\n        );\n        \n        vec3 lDir = lPos - surfacePos;\n        float dist = length(lDir);\n        lDir = normalize(lDir);\n        \n        float diff = max(dot(normal, lDir), 0.0);\n        float atten = 1.0 / (1.0 + dist * dist * 8.0);\n        \n        totalLight += lCol * diff * atten * 0.4;\n    }\n    \n    // Mask out black areas of the source image\n    float mask = clamp(dot(source.rgb, vec3(1.0)) * 10.0, 0.0, 1.0);\n    \n    // Combine the 3D illumination with the original texture, affected by source color\n    vec3 finalColor = mix(source.rgb, source.rgb * totalLight * 2.0, mask);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "scale": 100,
      "bump": 5,
      "centerX": 0.43,
      "centerY": 0.45,
      "mirror": true,
      "mirrorX": 0.51
    }
  },
  {
    "id": "recovered_timeline_febc5b14_145a_43b8_a16e_2a09b25ead67",
    "name": "Mirrored 3D Scanline Grid with Chroma",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-febc5b14-145a-43b8-a16e-2a09b25ead67 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Mirrored 3D Scanline Grid with Chroma\nuniform float bump; // @min 0.1 @max 10.0 @default 2.0\nuniform float lightIntensity; // @min 0.0 @max 5.0 @default 2.0\nuniform vec3 scanColor; // @default 0.0,1.0,0.8\nuniform float scanSpeed; // @min 0.1 @max 3.0 @default 0.5\nuniform float gridScale; // @min 1.0 @max 20.0 @default 8.0\nuniform float scanIntensity; // @min 0.0 @max 5.0 @default 1.0\nuniform float chromaDiff; // @min 0.0 @max 0.1 @default 0.02\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    // Chromatic difference using opposite colors (Red vs Cyan/GB)\n    vec2 offset = (uv - 0.5) * chromaDiff;\n    float r = texture2D(tex, uv + offset).r;\n    float g = texture2D(tex, uv - offset).g;\n    float b = texture2D(tex, uv - offset).b;\n    vec4 source = vec4(r, g, b, texture2D(tex, uv).a);\n    \n    // Use luminance as a height map\n    float luma = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    vec2 eps = vec2(1.0 / resolution.x, 1.0 / resolution.y);\n    float lumaX = dot(texture2D(tex, uv + vec2(eps.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));\n    float lumaY = dot(texture2D(tex, uv + vec2(0.0, eps.y)).rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Calculate 3D normal from the luminance gradient\n    vec3 normal = normalize(vec3((luma - lumaX) * bump, (luma - lumaY) * bump, 0.05));\n    vec3 surfacePos = vec3(uv, luma * 0.15);\n    \n    vec3 totalLight = vec3(0.0);\n    \n    // 3 moving lights\n    for(int i = 0; i < 3; i++) {\n        float fi = float(i);\n        vec3 lPos = vec3(\n            0.5 + 0.6 * sin(time * 0.5 + fi * 2.1),\n            0.5 + 0.6 * cos(time * 0.6 + fi * 1.7),\n            0.2 + 0.2 * sin(time * 0.7 + fi)\n        );\n        vec3 lCol = vec3(\n            0.5 + 0.5 * sin(fi * 2.0),\n            0.5 + 0.5 * sin(fi * 3.0 + 2.0),\n            0.5 + 0.5 * sin(fi * 4.0 + 4.0)\n        );\n        \n        vec3 lDir = lPos - surfacePos;\n        float dist = length(lDir);\n        lDir = normalize(lDir);\n        \n        float diff = max(dot(normal, lDir), 0.0);\n        float atten = 1.0 / (1.0 + dist * dist * 5.0);\n        \n        // Specular highlight for extra complexity\n        vec3 viewDir = normalize(vec3(0.5, 0.5, 1.0) - surfacePos);\n        vec3 halfDir = normalize(lDir + viewDir);\n        float spec = pow(max(dot(normal, halfDir), 0.0), 16.0);\n        \n        totalLight += lCol * (diff + spec * 0.5) * atten;\n    }\n    \n    // Mirror the UV horizontally for the scan effect\n    vec2 mirroredUV = vec2(abs(uv.x - 0.5) * 2.0, uv.y);\n    \n    // 3D Grid effect interacting with the height (luma)\n    vec2 gridUV = fract(mirroredUV * gridScale - time * scanSpeed + luma * 0.3);\n    vec2 gridDist = abs(gridUV - 0.5);\n    \n    // Minimum distance to either the vertical or horizontal center of the cell\n    float lineDist = min(gridDist.x, gridDist.y);\n    \n    float scanCore = smoothstep(0.02, 0.0, lineDist);\n    float scanGlow = 0.002 / (lineDist + 0.001);\n    \n    // Mask the grid so it primarily affects the bright/raised parts of the image\n    vec3 scanEffect = scanColor * (scanCore + scanGlow) * smoothstep(0.05, 0.2, luma) * scanIntensity;\n    \n    // Combine lighting, source, and grid\n    vec3 finalColor = source.rgb * totalLight * lightIntensity + scanEffect;\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "bump": 1.585,
      "lightIntensity": 3.9,
      "scanColor": [
        0.7686274509803922,
        0.3843137254901961,
        0.12941176470588237
      ],
      "scanSpeed": 2.217,
      "gridScale": 8.41,
      "scanIntensity": 0.5,
      "chromaDiff": 0.02
    }
  },
  {
    "id": "recovered_timeline_5f5dcfa8_8054_44d4_b2d1_43c035172743",
    "name": "Seamless Luma Automata 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-5f5dcfa8-8054-44d4-b2d1-43c035172743 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Seamless Luma Automata\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Calculate luminance (the \"3Dness\" or shadow/highlight map of the image)\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Threshold mask: only affect pixels that are not completely black\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    \n    // Early exit for black pixels to save performance and keep them untouched\n    if (mask <= 0.0) {\n        return source;\n    }\n\n    vec2 p = uv * scale;\n    float t = time * speed;\n\n    float n = 0.0;\n    vec2 q = p;\n    \n    // Rotation matrix to break up noise grid seams and prevent horizontal/vertical artifacts\n    mat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\n    float amp = 1.0;\n    float sumAmp = 0.0;\n\n    // Automata growth influenced by the image's luminance\n    for(int i = 0; i < 4; i++) {\n        // Circular time offset to avoid linear sliding seams\n        vec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\n        \n        // Luminance drives the flow\n        float noiseVal = node_noise(q + tOffset + lum * 1.5);\n        float angle = noiseVal * 6.2831;\n        \n        // The shadow/light of the image influences the spread of the automata\n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        \n        // Rotate and scale coordinates to completely hide underlying noise grids\n        q = rot * q * 1.3; \n        \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    \n    // Normalize noise\n    n /= sumAmp;\n\n    // Isolate branching structures\n    float branch = smoothstep(0.3, 0.7, n);\n\n    // Lines flowing through the \"3Dness\" (luminance + noise displacement)\n    // This creates topographical contour lines that follow the image depth\n    float topo = sin((lum * 2.0 + n) * lineDensity - t * 4.0);\n    float lines = smoothstep(0.8, 0.95, topo);\n\n    // Color mixing based on the automata branches\n    vec3 effectCol = mix(blobColor, branchColor, branch);\n    \n    // Add glowing lines that pop more in the brighter areas of the original image\n    effectCol += vec3(1.0) * lines * lum * 1.5;\n\n    // Blend the effect with the original image based on the threshold mask and growth\n    vec3 finalCol = mix(source.rgb, effectCol, mask * branch);\n\n    return vec4(finalCol, source.a);\n}",
    "uniformValues": {
      "speed": 2.536,
      "scale": 2.36,
      "threshold": 0.4,
      "lineDensity": 35.6,
      "blobColor": [
        0,
        0,
        0
      ],
      "branchColor": [
        0.40784313725490196,
        0.30196078431372547,
        0.796078431372549
      ]
    }
  },
  {
    "id": "recovered_timeline_4e1cc927_2d8e_4110_bcaa_5af5e4e7e96d",
    "name": "Luma Noise Automata",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-4e1cc927-2d8e-4110-bcaa-5af5e4e7e96d in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Luma Noise Automata\nuniform float scale; // @min 1.0 @max 30.0 @default 6.0\nuniform float speed; // @min 0.0 @max 5.0 @default 0.5\nuniform float warp_amount; // @min 0.0 @max 5.0 @default 1.5\nuniform float edge_glow; // @min 0.0 @max 5.0 @default 2.0\nuniform float black_threshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 tentacle_color; // @default 0.1,0.8,0.6\nuniform vec3 glow_color; // @default 0.9,1.0,1.0\nuniform vec3 bg_color; // @default 0.05,0.05,0.1\nuniform float shading_strength; // @min 0.0 @max 3.0 @default 2.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 base = texture2D(tex, uv);\n    \n    // Extract luminance from the original image to preserve 3D volume\n    float lum = dot(base.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Threshold mask: only affect pixels that are not completely black\n    float mask = smoothstep(black_threshold * 0.5, black_threshold + 0.001, lum) * base.a;\n    \n    // Early exit for black pixels to save performance\n    if (mask <= 0.0) {\n        return base;\n    }\n    \n    vec2 p = uv * scale;\n    float t = time * speed;\n    \n    // Warp coordinates using trigonometry and luminance\n    p += warp_amount * vec2(sin(p.y + t + lum), cos(p.x + t - lum));\n    p += (warp_amount * 0.5) * vec2(sin(p.y * 2.0 - t), cos(p.x * 2.0 - t));\n    \n    // SINGLE big noise map evaluation\n    float f = node_noise(p);\n    \n    // Automata growing effect\n    float val = sin(f * 15.0 - t * 3.0) * 0.5 + 0.5;\n    \n    // Organic blobs (tentacle bodies)\n    float pattern = smoothstep(0.45, 0.55, val);\n    \n    // White splash / glow at the boundaries\n    float edge = smoothstep(0.35, 0.5, val) - smoothstep(0.5, 0.65, val);\n    \n    // Topographical contour lines that follow the image depth\n    float topo = sin((lum * 2.0 + f) * lineDensity - t * 4.0);\n    float lines = smoothstep(0.8, 0.95, topo);\n    \n    // Granular background texture\n    float grain = node_rand(uv * 1000.0);\n    vec3 granular_bg = bg_color * (0.6 + 0.5 * grain);\n    \n    // Mix colors\n    vec3 col = mix(granular_bg, tentacle_color, pattern);\n    col += glow_color * (edge * edge_glow);\n    \n    // Add glowing lines that pop more in the brighter areas\n    col += vec3(1.0) * lines * lum * 1.5;\n    \n    // Apply shading based on original luminance\n    vec3 shaded_col = col * (lum * shading_strength + 0.1);\n    \n    return vec4(mix(base.rgb, shaded_col, mask), base.a);\n}",
    "uniformValues": {
      "scale": 2.45,
      "speed": 0.1,
      "warp_amount": 0.7,
      "edge_glow": 3.65,
      "black_threshold": 0.26,
      "lineDensity": 11.3,
      "tentacle_color": [
        0.24313725490196078,
        0.1843137254901961,
        0.054901960784313725
      ],
      "glow_color": [
        0.7372549019607844,
        0.7215686274509804,
        0.20392156862745098
      ],
      "bg_color": [
        0.2549019607843137,
        0.21568627450980393,
        0.023529411764705882
      ],
      "shading_strength": 2.4
    }
  },
  {
    "id": "recovered_timeline_3f118a43_a58b_403a_81c9_16fcef26ed98",
    "name": "Moving Mold Tentacles",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-3f118a43-a58b-403a-81c9-16fcef26ed98 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Moving Mold Tentacles\nuniform float scale; // @min 1.0 @max 30.0 @default 3.0\nuniform float black_threshold; // @min 0.0 @max 1.0 @default 0.05\nuniform vec3 mold_color; // @default 0.2,0.6,0.3\nuniform vec3 tip_color; // @default 0.8,0.9,0.4\nuniform float shading_strength; // @min 0.0 @max 3.0 @default 2.0\nuniform float growth_spread; // @min 0.0 @max 1.0 @default 0.5\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\n\nfloat getMold(vec2 p, float t) {\n    float n1 = node_noise(p + t * 0.1);\n    float n2 = node_noise(p + vec2(5.2, 1.3) - t * 0.15);\n    vec2 q = vec2(n1, n2);\n    \n    float n3 = node_noise(p + 3.0 * q + vec2(1.7, 9.2) + t * 0.2);\n    float n4 = node_noise(p + 3.0 * q + vec2(8.3, 2.8) - t * 0.2);\n    vec2 r = vec2(n3, n4);\n    \n    // Sharpen the noise to look like veins/tentacles\n    float f = node_noise(p + 4.0 * r + t * 0.3);\n    return abs(f * 2.0 - 1.0); // Ridge-like structure\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 base = texture2D(tex, uv);\n    \n    vec2 p = (gl_FragCoord.xy / resolution.xy) * scale;\n    p.x *= resolution.x / resolution.y;\n    \n    float t = time * speed;\n    \n    // Calculate height map for mold\n    float h = getMold(p, t);\n    \n    // Calculate normals for 3D bump effect\n    float eps = 0.02;\n    float hx = getMold(p + vec2(eps, 0.0), t);\n    float hy = getMold(p + vec2(0.0, eps), t);\n    vec3 normal = normalize(vec3(hx - h, hy - h, 0.1));\n    \n    // Lighting\n    vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));\n    float diff = max(dot(normal, lightDir), 0.0);\n    vec3 viewDir = vec3(0.0, 0.0, 1.0);\n    vec3 halfDir = normalize(lightDir + viewDir);\n    float spec = pow(max(dot(normal, halfDir), 0.0), 16.0) * 0.3;\n    \n    // Colorize mold\n    vec3 col = mix(mold_color, tip_color, smoothstep(0.2, 0.8, h));\n    col = col * (diff * 0.8 + 0.2) + spec;\n    \n    // Extract luminance from the original image to preserve 3D volume of the statue\n    float lum = dot(base.rgb, vec3(0.299, 0.587, 0.114));\n    vec3 shaded_col = col * (lum * shading_strength + 0.1);\n    \n    // Determine where mold grows, animate spread slightly\n    float current_spread = clamp(growth_spread + sin(t * 0.5) * 0.15, 0.0, 1.0);\n    float mask = smoothstep(1.0 - current_spread, 1.0 - current_spread + 0.2, 1.0 - h);\n    \n    float intensity = length(base.rgb);\n    float uv_edge = smoothstep(0.0, 0.02, uv.x) * smoothstep(1.0, 0.98, uv.x) *\n                    smoothstep(0.0, 0.02, uv.y) * smoothstep(1.0, 0.98, uv.y);\n                    \n    float edge_blend = smoothstep(black_threshold, black_threshold + 0.1, intensity) * base.a * uv_edge * mask;\n    \n    return vec4(mix(base.rgb, shaded_col, edge_blend), base.a);\n}",
    "uniformValues": {
      "scale": 14.92,
      "black_threshold": 0.08,
      "mold_color": [
        0.3686274509803922,
        0.32941176470588235,
        0.12941176470588237
      ],
      "tip_color": [
        0.7803921568627451,
        0.6980392156862745,
        0.1607843137254902
      ],
      "shading_strength": 0.27,
      "growth_spread": 1,
      "speed": 1
    }
  },
  {
    "id": "recovered_timeline_3bd1713a_4a65_4573_b692_049423ee5923",
    "name": "Seamless Luma Automata 3",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-3bd1713a-4a65-4573-b692-049423ee5923 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Seamless Luma Automata\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Calculate luminance (the \"3Dness\" or shadow/highlight map of the image)\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Threshold mask: only affect pixels that are not completely black\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    \n    // Early exit for black pixels to save performance and keep them untouched\n    if (mask <= 0.0) {\n        return source;\n    }\n\n    vec2 p = uv * scale;\n    float t = time * speed;\n\n    float n = 0.0;\n    vec2 q = p;\n    \n    // Rotation matrix to break up noise grid seams and prevent horizontal/vertical artifacts\n    mat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\n    float amp = 1.0;\n    float sumAmp = 0.0;\n\n    // Automata growth influenced by the image's luminance\n    for(int i = 0; i < 4; i++) {\n        // Circular time offset to avoid linear sliding seams\n        vec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\n        \n        // Luminance drives the flow\n        float noiseVal = node_noise(q + tOffset + lum * 1.5);\n        float angle = noiseVal * 6.2831;\n        \n        // The shadow/light of the image influences the spread of the automata\n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        \n        // Rotate and scale coordinates to completely hide underlying noise grids\n        q = rot * q * 1.3; \n        \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    \n    // Normalize noise\n    n /= sumAmp;\n\n    // Isolate branching structures\n    float branch = smoothstep(0.3, 0.7, n);\n\n    // Lines flowing through the \"3Dness\" (luminance + noise displacement)\n    // This creates topographical contour lines that follow the image depth\n    float topo = sin((lum * 2.0 + n) * lineDensity - t * 4.0);\n    float lines = smoothstep(0.8, 0.95, topo);\n\n    // Color mixing based on the automata branches\n    vec3 effectCol = mix(blobColor, branchColor, branch);\n    \n    // Add glowing lines that pop more in the brighter areas of the original image\n    effectCol += vec3(1.0) * lines * lum * 1.5;\n\n    // Blend the effect with the original image based on the threshold mask and growth\n    vec3 finalCol = mix(source.rgb, effectCol, mask * branch);\n\n    return vec4(finalCol, source.a);\n}",
    "uniformValues": {
      "speed": 0.506,
      "scale": 2.36,
      "threshold": 0.4,
      "lineDensity": 5,
      "blobColor": [
        0.2235294117647059,
        0.12156862745098039,
        0.4196078431372549
      ],
      "branchColor": [
        0.24705882352941178,
        0.30196078431372547,
        0.37254901960784315
      ]
    }
  },
  {
    "id": "recovered_timeline_a80f8f55_994d_4a20_8872_69d41a6342b2",
    "name": "Seamless Luma Automata 4",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-a80f8f55-994d-4a20-8872-69d41a6342b2 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Seamless Luma Automata\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nuniform float blackout; // @min 0.0 @max 1.0 @default 1.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Calculate luminance (the \"3Dness\" or shadow/highlight map of the image)\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Threshold mask: only affect pixels that are not completely black\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    \n    // Background color based on blackout slider\n    vec4 bgCol = mix(source, vec4(0.0, 0.0, 0.0, source.a), blackout);\n    \n    // Early exit for black pixels to save performance\n    if (mask <= 0.0) {\n        return bgCol;\n    }\n\n    vec2 p = uv * scale;\n    float t = time * speed;\n\n    float n = 0.0;\n    vec2 q = p;\n    \n    // Rotation matrix to break up noise grid seams and prevent horizontal/vertical artifacts\n    mat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\n    float amp = 1.0;\n    float sumAmp = 0.0;\n\n    // Automata growth influenced by the image's luminance\n    for(int i = 0; i < 4; i++) {\n        // Circular time offset to avoid linear sliding seams\n        vec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\n        \n        // Luminance drives the flow\n        float noiseVal = node_noise(q + tOffset + lum * 1.5);\n        float angle = noiseVal * 6.2831;\n        \n        // The shadow/light of the image influences the spread of the automata\n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        \n        // Rotate and scale coordinates to completely hide underlying noise grids\n        q = rot * q * 1.3; \n        \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    \n    // Normalize noise\n    n /= sumAmp;\n\n    // Isolate branching structures\n    float branch = smoothstep(0.3, 0.7, n);\n\n    // Lines flowing through the \"3Dness\" (luminance + noise displacement)\n    // This creates topographical contour lines that follow the image depth\n    float topo = sin((lum * 2.0 + n) * lineDensity - t * 4.0);\n    float lines = smoothstep(0.8, 0.95, topo);\n\n    // Color mixing based on the automata branches\n    vec3 effectCol = mix(blobColor, branchColor, branch);\n    \n    // Add glowing lines that pop more in the brighter areas of the original image\n    effectCol += vec3(1.0) * lines * lum * 1.5;\n\n    // Blend the effect with the background based on the threshold mask and growth\n    vec3 finalCol = mix(bgCol.rgb, effectCol, mask * branch);\n\n    return vec4(finalCol, source.a);\n}",
    "uniformValues": {
      "speed": 2.594,
      "scale": 5.6,
      "threshold": 0.4,
      "lineDensity": 44.6,
      "blobColor": [
        0.42745098039215684,
        0.403921568627451,
        0.39215686274509803
      ],
      "branchColor": [
        0.4470588235294118,
        0.42745098039215684,
        0.396078431372549
      ],
      "blackout": 1
    }
  },
  {
    "id": "recovered_timeline_2c09491a_a584_41a1_af79_63f37c3d1918",
    "name": "Seamless Luma Automata 5",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-2c09491a-a584-41a1-af79-63f37c3d1918 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Seamless Luma Automata\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Calculate luminance (the \"3Dness\" or shadow/highlight map of the image)\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Threshold mask: only affect pixels that are not completely black\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    \n    // Early exit for black pixels to save performance and keep them untouched\n    if (mask <= 0.0) {\n        return source;\n    }\n\n    vec2 p = uv * scale;\n    float t = time * speed;\n\n    float n = 0.0;\n    vec2 q = p;\n    \n    // Rotation matrix to break up noise grid seams and prevent horizontal/vertical artifacts\n    mat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\n    float amp = 1.0;\n    float sumAmp = 0.0;\n\n    // Automata growth influenced by the image's luminance\n    for(int i = 0; i < 4; i++) {\n        // Circular time offset to avoid linear sliding seams\n        vec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\n        \n        // Luminance drives the flow\n        float noiseVal = node_noise(q + tOffset + lum * 1.5);\n        float angle = noiseVal * 6.2831;\n        \n        // The shadow/light of the image influences the spread of the automata\n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        \n        // Rotate and scale coordinates to completely hide underlying noise grids\n        q = rot * q * 1.3; \n        \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    \n    // Normalize noise\n    n /= sumAmp;\n\n    // Isolate branching structures\n    float branch = smoothstep(0.3, 0.7, n);\n\n    // Lines flowing through the \"3Dness\" (luminance + noise displacement)\n    // This creates topographical contour lines that follow the image depth\n    float topo = sin((lum * 2.0 + n) * lineDensity - t * 4.0);\n    float lines = smoothstep(0.8, 0.95, topo);\n\n    // Color mixing based on the automata branches\n    vec3 effectCol = mix(blobColor, branchColor, branch);\n    \n    // Add glowing lines that pop more in the brighter areas of the original image\n    effectCol += vec3(1.0) * lines * lum * 1.5;\n\n    // Blend the effect with the original image based on the threshold mask and growth\n    vec3 finalCol = mix(source.rgb, effectCol, mask * branch);\n\n    return vec4(finalCol, source.a);\n}",
    "uniformValues": {
      "speed": 0.738,
      "scale": 2.36,
      "threshold": 0.4,
      "lineDensity": 19.85,
      "blobColor": [
        0.9137254901960784,
        0.7372549019607844,
        0.10980392156862745
      ],
      "branchColor": [
        0.5568627450980392,
        0.3686274509803922,
        0.043137254901960784
      ]
    }
  },
  {
    "id": "recovered_timeline_91a5d9d8_cc19_4cb1_9753_2800de72f380",
    "name": "Seamless Luma Automata 6",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-91a5d9d8-cc19-4cb1-9753-2800de72f380 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Seamless Luma Automata\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nuniform float blackout; // @min 0.0 @max 1.0 @default 1.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Calculate luminance (the \"3Dness\" or shadow/highlight map of the image)\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Threshold mask: only affect pixels that are not completely black\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    \n    // Background color based on blackout slider\n    vec4 bgCol = mix(source, vec4(0.0, 0.0, 0.0, source.a), blackout);\n    \n    // Early exit for black pixels to save performance\n    if (mask <= 0.0) {\n        return bgCol;\n    }\n\n    vec2 p = uv * scale;\n    float t = time * speed;\n\n    float n = 0.0;\n    vec2 q = p;\n    \n    // Rotation matrix to break up noise grid seams and prevent horizontal/vertical artifacts\n    mat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\n    float amp = 1.0;\n    float sumAmp = 0.0;\n\n    // Automata growth influenced by the image's luminance\n    for(int i = 0; i < 4; i++) {\n        // Circular time offset to avoid linear sliding seams\n        vec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\n        \n        // Luminance drives the flow\n        float noiseVal = node_noise(q + tOffset + lum * 1.5);\n        float angle = noiseVal * 6.2831;\n        \n        // The shadow/light of the image influences the spread of the automata\n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        \n        // Rotate and scale coordinates to completely hide underlying noise grids\n        q = rot * q * 1.3; \n        \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    \n    // Normalize noise\n    n /= sumAmp;\n\n    // Isolate branching structures\n    float branch = smoothstep(0.3, 0.7, n);\n\n    // Lines flowing through the \"3Dness\" (luminance + noise displacement)\n    // This creates topographical contour lines that follow the image depth\n    float topo = sin((lum * 2.0 + n) * lineDensity - t * 4.0);\n    float lines = smoothstep(0.8, 0.95, topo);\n\n    // Color mixing based on the automata branches\n    vec3 effectCol = mix(blobColor, branchColor, branch);\n    \n    // Add glowing lines that pop more in the brighter areas of the original image\n    effectCol += vec3(1.0) * lines * lum * 1.5;\n\n    // Blend the effect with the background based on the threshold mask and growth\n    vec3 finalCol = mix(bgCol.rgb, effectCol, mask * branch);\n\n    return vec4(finalCol, source.a);\n}",
    "uniformValues": {
      "speed": 0.506,
      "scale": 2.36,
      "threshold": 0.4,
      "lineDensity": 19.85,
      "blobColor": [
        0.40784313725490196,
        0.22745098039215686,
        0.13333333333333333
      ],
      "branchColor": [
        0.5568627450980392,
        0.3686274509803922,
        0.043137254901960784
      ],
      "blackout": 1
    }
  },
  {
    "id": "recovered_timeline_47c6bea9_0914_4f00_9fb5_afe23db49c4d",
    "name": "Entrapped in Glass",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-47c6bea9-0914-4f00-9fb5-afe23db49c4d in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Entrapped in Glass\nuniform float speed; // @min 0.0 @max 2.0 @default 0.2\nuniform float scale; // @min 1.0 @max 15.0 @default 5.0\nuniform float bump; // @min 0.1 @max 5.0 @default 2.0\nuniform float refraction; // @min 0.01 @max 0.2 @default 0.08\nuniform float chromatic; // @min 0.0 @max 0.05 @default 0.015\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\n\nfloat getLum(vec3 col) {\n    return dot(col, vec3(0.299, 0.587, 0.114));\n}\n\nfloat getGlassHeight(vec2 uv, float time, float lum) {\n    vec2 p = uv * scale;\n    float t = time * speed;\n    \n    // Domain warping for shard-like structures\n    vec2 warp = vec2(node_noise(p + t * 0.4), node_noise(p - t * 0.3)) * 2.0;\n    \n    // Sharp ridges using absolute noise\n    float n1 = 1.0 - abs(node_noise(p + warp) * 2.0 - 1.0);\n    float n2 = 1.0 - abs(node_noise(p * 1.5 - warp * 0.8 + t * 0.2) * 2.0 - 1.0);\n    float n3 = 1.0 - abs(node_noise(p * 2.5 + warp * 1.2 - t * 0.1) * 2.0 - 1.0);\n    \n    // Combine and square to sharpen the facets\n    float h = (n1 * 0.5 + n2 * 0.3 + n3 * 0.2);\n    return h * h * (0.5 + lum * 0.5);\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = getLum(source.rgb);\n    float mask = smoothstep(threshold * 0.5, threshold + 0.01, lum);\n    \n    if (mask <= 0.0) {\n        return source;\n    }\n\n    float eps = 0.005;\n    float h0 = getGlassHeight(uv, time, lum);\n    float hx = getGlassHeight(uv + vec2(eps, 0.0), time, lum);\n    float hy = getGlassHeight(uv + vec2(0.0, eps), time, lum);\n    \n    // Calculate surface normal\n    vec3 normal = normalize(vec3(h0 - hx, h0 - hy, eps * 2.0 / bump));\n    \n    // Lighting Setup\n    vec3 viewDir = vec3(0.0, 0.0, 1.0);\n    vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));\n    vec3 lightDir2 = normalize(vec3(-0.5, -0.2, 0.8));\n    \n    // Sharp specular highlights for glass\n    vec3 halfDir = normalize(lightDir + viewDir);\n    vec3 halfDir2 = normalize(lightDir2 + viewDir);\n    float spec = pow(max(dot(normal, halfDir), 0.0), 64.0) * 2.0;\n    spec += pow(max(dot(normal, halfDir2), 0.0), 32.0) * 0.8;\n    \n    // Fresnel edge reflection\n    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);\n    \n    // Refraction with Chromatic Aberration\n    vec2 distUv = uv - normal.xy * refraction;\n    float r = texture2D(tex, distUv + normal.xy * chromatic).r;\n    float g = texture2D(tex, distUv).g;\n    float b = texture2D(tex, distUv - normal.xy * chromatic).b;\n    vec3 distSource = vec3(r, g, b);\n    \n    // Combine lighting (glass tint, specular, fresnel)\n    vec3 glassTint = vec3(0.85, 0.95, 1.0);\n    vec3 finalColor = distSource * (1.0 - fresnel * 0.3) + spec + glassTint * fresnel * 0.8;\n    \n    return vec4(mix(source.rgb, finalColor, mask), source.a);\n}",
    "uniformValues": {
      "speed": 0.46,
      "scale": 1.14,
      "bump": 1.57,
      "refraction": 0.0708,
      "chromatic": 0.005,
      "threshold": 0.105
    }
  },
  {
    "id": "recovered_timeline_1fefae82_d782_4c0b_8136_71ba5a590554",
    "name": "3D Luma Automata Lights 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-1fefae82-d782-4c0b-8136-71ba5a590554 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Luma Automata Lights\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float bump; // @min 0.1 @max 5.0 @default 1.5\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\n\nfloat getLum(sampler2D tex, vec2 uv) {\n    vec3 col = texture2D(tex, uv).rgb;\n    return dot(col, vec3(0.299, 0.587, 0.114));\n}\n\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\n    float lum = getLum(tex, uv);\n    vec2 p = uv * s;\n    float t = time * spd;\n    float n = 0.0;\n    vec2 q = p;\n    \n    mat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\n    float amp = 1.0;\n    float sumAmp = 0.0;\n\n    for(int i = 0; i < 3; i++) {\n        vec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\n        float noiseVal = node_noise(q + tOffset + lum * 1.5);\n        float angle = noiseVal * 6.2831;\n        \n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        q = rot * q * 1.3; \n        \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    return n / sumAmp;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    \n    if (mask <= 0.0) {\n        return source;\n    }\n\n    float eps = 0.01;\n    \n    // Calculate 3D normal from the automata height map\n    float h0 = getHeight(tex, uv, time, scale, speed);\n    float hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\n    float hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\n    \n    vec3 normal = normalize(vec3(h0 - hx, h0 - hy, eps * 2.0 / bump));\n    vec3 surfacePos = vec3(uv, h0 * bump * 0.05);\n    \n    vec3 totalLight = vec3(0.0);\n    \n    // 15 invisible lights of different colors moving in 3D space\n    for(int i = 0; i < 15; i++) {\n        float fi = float(i);\n        \n        vec3 lPos = vec3(\n            0.5 + 0.8 * sin(time * 0.3 + fi * 2.1),\n            0.5 + 0.8 * cos(time * 0.4 + fi * 1.7),\n            0.3 + 0.4 * sin(time * 0.5 + fi * 0.8)\n        );\n        \n        vec3 lCol = vec3(\n            0.5 + 0.5 * sin(fi * 1.3),\n            0.5 + 0.5 * sin(fi * 2.4 + 2.0),\n            0.5 + 0.5 * sin(fi * 3.1 + 4.0)\n        );\n        \n        vec3 lDir = lPos - surfacePos;\n        float dist = length(lDir);\n        lDir = normalize(lDir);\n        \n        float diff = max(dot(normal, lDir), 0.0);\n        float atten = 1.0 / (1.0 + dist * dist * 8.0);\n        \n        totalLight += lCol * diff * atten * 0.5;\n    }\n    \n    // Combine the 3D illumination with the original texture\n    vec3 finalColor = mix(source.rgb, source.rgb * totalLight * 2.0, mask);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "speed": 0.216,
      "scale": 4.88,
      "bump": 4.902,
      "threshold": 0.035
    }
  },
  {
    "id": "recovered_timeline_3c19df3f_b9af_42bd_bdbf_05ddfb8c0bdc",
    "name": "Realistic 3D Luma Lights",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-3c19df3f-b9af-42bd-bdbf-05ddfb8c0bdc in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Realistic 3D Luma Lights\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float depth; // @min -5.0 @max 5.0 @default 1.5\nuniform float movement_form; // @min 0.0 @max 5.0 @default 1.5\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float roughness; // @min 0.01 @max 0.5 @default 0.1\nuniform float ambient; // @min 0.0 @max 1.0 @default 0.15\n\nfloat getLum(sampler2D tex, vec2 uv) {\n    return dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n}\n\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\n    float lum = getLum(tex, uv);\n    vec2 q = uv * s;\n    float t = time * spd;\n    float n = 0.0, amp = 1.0, sumAmp = 0.0;\n    mat2 rot = mat2(0.737, -0.675, 0.675, 0.737);\n\n    for(int i = 0; i < 3; i++) {\n        vec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\n        float noiseVal = node_noise(q + tOffset + lum * movement_form);\n        float angle = noiseVal * 6.2831;\n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        q = rot * q * 1.3; \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    return n / sumAmp;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    \n    if (mask <= 0.0) {\n        return source;\n    }\n\n    float eps = 0.005;\n    float h0 = getHeight(tex, uv, time, scale, speed);\n    float hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\n    float hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\n    \n    vec3 normal = normalize(vec3((h0 - hx) * depth * 100.0, (h0 - hy) * depth * 100.0, 1.0));\n    vec3 surfacePos = vec3(uv, h0 * depth * 0.05);\n    \n    vec3 totalDiffuse = vec3(ambient);\n    vec3 totalSpecular = vec3(0.0);\n    \n    for(int i = 0; i < 3; i++) {\n        float fi = float(i);\n        vec3 lPos = vec3(\n            0.5 + 0.8 * sin(time * 0.3 + fi * 2.1),\n            0.5 + 0.8 * cos(time * 0.4 + fi * 1.7),\n            0.2 + 0.3 * sin(time * 0.5 + fi * 0.8)\n        );\n        vec3 lCol = vec3(\n            0.5 + 0.5 * sin(fi * 1.3),\n            0.5 + 0.5 * sin(fi * 2.4 + 2.0),\n            0.5 + 0.5 * sin(fi * 3.1 + 4.0)\n        );\n        \n        vec3 lDir = lPos - surfacePos;\n        float dist = length(lDir);\n        lDir = normalize(lDir);\n        \n        float diff = max(dot(normal, lDir), 0.0);\n        float atten = 1.0 / (1.0 + dist * dist * 5.0);\n        \n        vec3 halfVector = normalize(lDir + vec3(0.0, 0.0, 1.0));\n        float spec = pow(max(dot(normal, halfVector), 0.0), 1.0 / roughness);\n        \n        totalDiffuse += diff * lCol * atten;\n        totalSpecular += spec * lCol * atten;\n    }\n    \n    vec3 finalColor = mix(source.rgb, source.rgb * totalDiffuse + totalSpecular, mask);\n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "speed": 1.144,
      "scale": 2.54,
      "depth": -1.2,
      "movement_form": 4.7,
      "threshold": 0.135,
      "roughness": 0.3187,
      "ambient": 0.07
    }
  },
  {
    "id": "recovered_timeline_849de127_1c38_496c_bf40_8ec3d78b35d2",
    "name": "Liquid Metal Flow",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-849de127-1c38-496c-bf40-8ec3d78b35d2 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Liquid Metal Flow\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 1.0 @max 15.0 @default 4.0\nuniform float bump; // @min 0.1 @max 5.0 @default 2.5\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float metalness; // @min 0.0 @max 1.0 @default 0.9\n\nfloat getLum(vec3 col) {\n    return dot(col, vec3(0.299, 0.587, 0.114));\n}\n\nfloat getFluidHeight(vec2 uv, float time, float lum) {\n    vec2 p = uv * scale;\n    float t = time * speed;\n    \n    // Fluid domain warping for natural liquid flow\n    vec2 q = p + vec2(t * 0.2, t * 0.3);\n    float n1 = node_noise(q);\n    \n    q += vec2(node_noise(q + t * 0.5), node_noise(q - t * 0.4)) * 2.0;\n    float n2 = node_noise(q * 1.5 - t * 0.3);\n    \n    return (n1 * 0.6 + n2 * 0.4) * (0.5 + lum * 0.5);\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = getLum(source.rgb);\n    float mask = smoothstep(threshold * 0.5, threshold + 0.01, lum);\n    \n    if (mask <= 0.0) {\n        return source;\n    }\n\n    float eps = 0.005;\n    float h0 = getFluidHeight(uv, time, lum);\n    float hx = getFluidHeight(uv + vec2(eps, 0.0), time, lum);\n    float hy = getFluidHeight(uv + vec2(0.0, eps), time, lum);\n    \n    // Calculate surface normal\n    vec3 normal = normalize(vec3(h0 - hx, h0 - hy, eps * 2.0 / bump));\n    \n    // Liquid Metal / Mercury Shading Setup\n    vec3 viewDir = vec3(0.0, 0.0, 1.0);\n    vec3 lightDir = normalize(vec3(0.8, 0.6, 1.0));\n    \n    // Fake environment reflection (Chrome/Mercury look)\n    vec3 ref = reflect(-viewDir, normal);\n    float sky = smoothstep(-0.2, 0.5, ref.y);\n    float ground = smoothstep(0.2, -0.5, ref.y);\n    vec3 envColor = mix(vec3(0.15, 0.15, 0.2), vec3(0.85, 0.9, 1.0), sky);\n    envColor += vec3(0.2, 0.15, 0.1) * ground;\n    \n    // Sharp specular highlight for liquid metal\n    vec3 halfDir = normalize(lightDir + viewDir);\n    float spec = pow(max(dot(normal, halfDir), 0.0), 64.0) * 2.5;\n    \n    // Fresnel edge rim\n    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);\n    \n    // Combine lighting\n    vec3 baseColor = mix(source.rgb, vec3(0.95), metalness);\n    vec3 finalColor = baseColor * envColor + spec + fresnel * 0.6;\n    \n    // Add slight refraction distortion to the underlying image\n    vec2 distUv = uv - normal.xy * 0.05 * (1.0 - metalness);\n    vec3 distSource = texture2D(tex, distUv).rgb;\n    \n    finalColor = mix(distSource, finalColor, metalness * 0.8 + 0.2);\n    \n    return vec4(mix(source.rgb, finalColor, mask), source.a);\n}",
    "uniformValues": {
      "speed": 2.072,
      "scale": 1.42,
      "bump": 2.158,
      "threshold": 0.08,
      "metalness": 0
    }
  },
  {
    "id": "recovered_timeline_9cd946ac_8937_4c4c_8bdd_82b85ecae9ce",
    "name": "Smooth Dark Metallic Waves",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-9cd946ac-8937-4c4c-8bdd-82b85ecae9ce in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Smooth Dark Metallic Waves\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float depth; // @min -5.0 @max 5.0 @default 1.5\nuniform float movement_form; // @min 0.0 @max 5.0 @default 1.5\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float roughness; // @min 0.01 @max 0.5 @default 0.1\nuniform float ambient; // @min 0.0 @max 1.0 @default 0.15\n\n// Anti-aliasing / smoothing sample to avoid pixelation\nvec4 sampleSmooth(sampler2D tex, vec2 uv, vec2 res) {\n    vec2 e = 1.0 / res;\n    vec4 c = texture2D(tex, uv);\n    c += texture2D(tex, uv + vec2(e.x, 0.0));\n    c += texture2D(tex, uv + vec2(0.0, e.y));\n    c += texture2D(tex, uv - vec2(e.x, 0.0));\n    c += texture2D(tex, uv - vec2(0.0, e.y));\n    return c * 0.2;\n}\n\nfloat getLum(sampler2D tex, vec2 uv, vec2 res) {\n    vec3 c = sampleSmooth(tex, uv, res).rgb;\n    return dot(c, vec3(0.299, 0.587, 0.114));\n}\n\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd, vec2 res) {\n    float lum = getLum(tex, uv, res);\n    vec2 q = uv * s;\n    float t = time * spd;\n    float n = 0.0, amp = 1.0, sumAmp = 0.0;\n    mat2 rot = mat2(0.737, -0.675, 0.675, 0.737);\n\n    for(int i = 0; i < 3; i++) {\n        vec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\n        float noiseVal = node_noise(q + tOffset + lum * movement_form);\n        float angle = noiseVal * 6.2831;\n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        q = rot * q * 1.3; \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    return n / sumAmp;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = sampleSmooth(tex, uv, resolution);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    \n    // Darken the original image significantly\n    vec3 darkSource = source.rgb * 0.15;\n    \n    if (mask <= 0.0) {\n        return vec4(darkSource, source.a);\n    }\n\n    // Resolution-dependent epsilon to avoid pixelated normals\n    vec2 eps = max(1.0 / resolution, vec2(0.002));\n    \n    float h0 = getHeight(tex, uv, time, scale, speed, resolution);\n    float hx = getHeight(tex, uv + vec2(eps.x, 0.0), time, scale, speed, resolution);\n    float hy = getHeight(tex, uv + vec2(0.0, eps.y), time, scale, speed, resolution);\n    \n    vec3 normal = normalize(vec3((h0 - hx) * depth * 100.0, (h0 - hy) * depth * 100.0, 1.0));\n    vec3 surfacePos = vec3(uv, h0 * depth * 0.05);\n    \n    vec3 totalDiffuse = vec3(ambient);\n    vec3 totalSpecular = vec3(0.0);\n    \n    // Make it much more glossy by reducing roughness impact\n    float specPower = 1.0 / max(roughness * 0.05, 0.001);\n    \n    for(int i = 0; i < 20; i++) {\n        float fi = float(i);\n        \n        float r1 = fract(sin(fi * 12.9898) * 43758.5453);\n        float r2 = fract(sin(fi * 78.233) * 43758.5453);\n        float r3 = fract(sin(fi * 39.346) * 43758.5453);\n        \n        vec3 lPos = vec3(\n            0.5 + 0.9 * sin(time * (0.2 + r1 * 0.8) + r2 * 6.28),\n            0.5 + 0.9 * cos(time * (0.2 + r2 * 0.8) + r3 * 6.28),\n            0.1 + 0.4 * r3\n        );\n        \n        vec3 lCol = vec3(\n            0.5 + 0.5 * sin(fi * 0.61),\n            0.5 + 0.5 * sin(fi * 0.73 + 2.0),\n            0.5 + 0.5 * sin(fi * 0.89 + 4.0)\n        );\n        \n        vec3 lDir = lPos - surfacePos;\n        float dist = length(lDir);\n        lDir = normalize(lDir);\n        \n        float diff = max(dot(normal, lDir), 0.0);\n        float atten = 0.15 / (1.0 + dist * dist * 8.0);\n        \n        vec3 halfVector = normalize(lDir + vec3(0.0, 0.0, 1.0));\n        float spec = pow(max(dot(normal, halfVector), 0.0), specPower);\n        \n        totalDiffuse += diff * lCol * atten;\n        \n        // 10x more metallic/specular, tinting with base color for metallic feel\n        vec3 metallicTint = mix(vec3(1.0), source.rgb, 0.5);\n        totalSpecular += spec * lCol * atten * 10.0 * metallicTint;\n    }\n    \n    vec3 finalColor = mix(darkSource, darkSource * totalDiffuse + totalSpecular, mask);\n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "speed": 2.42,
      "scale": 3.98,
      "depth": 0.4,
      "movement_form": 3.85,
      "threshold": 0.16,
      "roughness": 0.2991,
      "ambient": 0.07
    }
  },
  {
    "id": "recovered_timeline_5e93ac76_637f_4612_9fd8_db73b5701c3d",
    "name": "Still Water Flow",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-5e93ac76-637f-4612-9fd8-db73b5701c3d in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Still Water Flow\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 1.0 @max 15.0 @default 4.0\nuniform float bump; // @min 0.1 @max 5.0 @default 2.5\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\n\nfloat getLum(vec3 col) {\n    return dot(col, vec3(0.299, 0.587, 0.114));\n}\n\nfloat getFluidHeight(vec2 uv, float time, float lum) {\n    vec2 p = uv * scale;\n    float t = time * speed;\n    \n    // In-place fluid domain warping (no sliding plane)\n    vec2 warp = vec2(node_noise(p + t * 0.4), node_noise(p - t * 0.3)) * 1.5;\n    \n    float n1 = node_noise(p + warp);\n    float n2 = node_noise(p * 1.5 - warp * 0.8 + t * 0.2);\n    \n    return (n1 * 0.6 + n2 * 0.4) * (0.5 + lum * 0.5);\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = getLum(source.rgb);\n    float mask = smoothstep(threshold * 0.5, threshold + 0.01, lum);\n    \n    if (mask <= 0.0) {\n        return source;\n    }\n\n    float eps = 0.005;\n    float h0 = getFluidHeight(uv, time, lum);\n    float hx = getFluidHeight(uv + vec2(eps, 0.0), time, lum);\n    float hy = getFluidHeight(uv + vec2(0.0, eps), time, lum);\n    \n    // Calculate surface normal\n    vec3 normal = normalize(vec3(h0 - hx, h0 - hy, eps * 2.0 / bump));\n    \n    // Water Shading Setup\n    vec3 viewDir = vec3(0.0, 0.0, 1.0);\n    vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));\n    \n    // Sharp specular highlight for water\n    vec3 halfDir = normalize(lightDir + viewDir);\n    float spec = pow(max(dot(normal, halfDir), 0.0), 48.0) * 1.5;\n    \n    // Fresnel edge rim\n    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);\n    \n    // Refraction distortion to the underlying image\n    vec2 distUv = uv - normal.xy * 0.05;\n    vec3 distSource = texture2D(tex, distUv).rgb;\n    \n    // Combine lighting (pure water, no metalness)\n    vec3 finalColor = distSource + spec + vec3(0.8, 0.9, 1.0) * fresnel * 0.4;\n    \n    return vec4(mix(source.rgb, finalColor, mask), source.a);\n}",
    "uniformValues": {
      "speed": 2.072,
      "scale": 1.42,
      "bump": 1.178,
      "threshold": 0.105
    }
  },
  {
    "id": "recovered_timeline_be0f64b2_e62d_4a9e_8564_b6b2dec63686",
    "name": "Entrapped in Glass 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-be0f64b2-e62d-4a9e-8564-b6b2dec63686 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Entrapped in Glass\nuniform float speed; // @min 0.0 @max 2.0 @default 0.2\nuniform float scale; // @min 1.0 @max 15.0 @default 5.0\nuniform float bump; // @min 0.1 @max 5.0 @default 2.0\nuniform float refraction; // @min 0.01 @max 0.2 @default 0.08\nuniform float chromatic; // @min 0.0 @max 0.05 @default 0.015\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\n\nfloat getLum(vec3 col) {\n    return dot(col, vec3(0.299, 0.587, 0.114));\n}\n\nfloat getGlassHeight(vec2 uv, float time, float lum) {\n    vec2 p = uv * scale;\n    float t = time * speed;\n    \n    // Domain warping for shard-like structures\n    vec2 warp = vec2(node_noise(p + t * 0.4), node_noise(p - t * 0.3)) * 2.0;\n    \n    // Sharp ridges using absolute noise\n    float n1 = 1.0 - abs(node_noise(p + warp) * 2.0 - 1.0);\n    float n2 = 1.0 - abs(node_noise(p * 1.5 - warp * 0.8 + t * 0.2) * 2.0 - 1.0);\n    float n3 = 1.0 - abs(node_noise(p * 2.5 + warp * 1.2 - t * 0.1) * 2.0 - 1.0);\n    \n    // Combine and square to sharpen the facets\n    float h = (n1 * 0.5 + n2 * 0.3 + n3 * 0.2);\n    return h * h * (0.5 + lum * 0.5);\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = getLum(source.rgb);\n    float mask = smoothstep(threshold * 0.5, threshold + 0.01, lum);\n    \n    if (mask <= 0.0) {\n        return source;\n    }\n\n    float eps = 0.005;\n    float h0 = getGlassHeight(uv, time, lum);\n    float hx = getGlassHeight(uv + vec2(eps, 0.0), time, lum);\n    float hy = getGlassHeight(uv + vec2(0.0, eps), time, lum);\n    \n    // Calculate surface normal\n    vec3 normal = normalize(vec3(h0 - hx, h0 - hy, eps * 2.0 / bump));\n    \n    // Lighting Setup\n    vec3 viewDir = vec3(0.0, 0.0, 1.0);\n    vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));\n    vec3 lightDir2 = normalize(vec3(-0.5, -0.2, 0.8));\n    \n    // Sharp specular highlights for glass\n    vec3 halfDir = normalize(lightDir + viewDir);\n    vec3 halfDir2 = normalize(lightDir2 + viewDir);\n    float spec = pow(max(dot(normal, halfDir), 0.0), 64.0) * 2.0;\n    spec += pow(max(dot(normal, halfDir2), 0.0), 32.0) * 0.8;\n    \n    // Fresnel edge reflection\n    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);\n    \n    // Refraction with Chromatic Aberration\n    vec2 distUv = uv - normal.xy * refraction;\n    float r = texture2D(tex, distUv + normal.xy * chromatic).r;\n    float g = texture2D(tex, distUv).g;\n    float b = texture2D(tex, distUv - normal.xy * chromatic).b;\n    vec3 distSource = vec3(r, g, b);\n    \n    // Combine lighting (glass tint, specular, fresnel)\n    vec3 glassTint = vec3(0.85, 0.95, 1.0);\n    vec3 finalColor = distSource * (1.0 - fresnel * 0.3) + spec + glassTint * fresnel * 0.8;\n    \n    return vec4(mix(source.rgb, finalColor, mask), source.a);\n}",
    "uniformValues": {
      "speed": 0.46,
      "scale": 1,
      "bump": 0.492,
      "refraction": 0.2,
      "chromatic": 0.015,
      "threshold": 0.105
    }
  },
  {
    "id": "recovered_timeline_a925ad8a_d4e0_41b2_8104_8a400305ab4e",
    "name": "Entrapped in Glass 3",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-a925ad8a-d4e0-41b2-8104-8a400305ab4e in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Entrapped in Glass\nuniform float speed; // @min 0.0 @max 2.0 @default 0.2\nuniform float scale; // @min 1.0 @max 15.0 @default 5.0\nuniform float bump; // @min 0.1 @max 5.0 @default 2.0\nuniform float refraction; // @min 0.01 @max 0.2 @default 0.08\nuniform float chromatic; // @min 0.0 @max 0.05 @default 0.015\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\n\nfloat getLum(vec3 col) {\n    return dot(col, vec3(0.299, 0.587, 0.114));\n}\n\nfloat getGlassHeight(vec2 uv, float time, float lum) {\n    vec2 p = uv * scale;\n    float t = time * speed;\n    \n    // Domain warping for shard-like structures\n    vec2 warp = vec2(node_noise(p + t * 0.4), node_noise(p - t * 0.3)) * 2.0;\n    \n    // Sharp ridges using absolute noise\n    float n1 = 1.0 - abs(node_noise(p + warp) * 2.0 - 1.0);\n    float n2 = 1.0 - abs(node_noise(p * 1.5 - warp * 0.8 + t * 0.2) * 2.0 - 1.0);\n    float n3 = 1.0 - abs(node_noise(p * 2.5 + warp * 1.2 - t * 0.1) * 2.0 - 1.0);\n    \n    // Combine and square to sharpen the facets\n    float h = (n1 * 0.5 + n2 * 0.3 + n3 * 0.2);\n    return h * h * (0.5 + lum * 0.5);\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = getLum(source.rgb);\n    float mask = smoothstep(threshold * 0.5, threshold + 0.01, lum);\n    \n    if (mask <= 0.0) {\n        return source;\n    }\n\n    float eps = 0.005;\n    float h0 = getGlassHeight(uv, time, lum);\n    float hx = getGlassHeight(uv + vec2(eps, 0.0), time, lum);\n    float hy = getGlassHeight(uv + vec2(0.0, eps), time, lum);\n    \n    // Calculate surface normal\n    vec3 normal = normalize(vec3(h0 - hx, h0 - hy, eps * 2.0 / bump));\n    \n    // Lighting Setup\n    vec3 viewDir = vec3(0.0, 0.0, 1.0);\n    vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));\n    vec3 lightDir2 = normalize(vec3(-0.5, -0.2, 0.8));\n    \n    // Sharp specular highlights for glass\n    vec3 halfDir = normalize(lightDir + viewDir);\n    vec3 halfDir2 = normalize(lightDir2 + viewDir);\n    float spec = pow(max(dot(normal, halfDir), 0.0), 64.0) * 2.0;\n    spec += pow(max(dot(normal, halfDir2), 0.0), 32.0) * 0.8;\n    \n    // Fresnel edge reflection\n    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);\n    \n    // Refraction with Chromatic Aberration\n    vec2 distUv = uv - normal.xy * refraction;\n    float r = texture2D(tex, distUv + normal.xy * chromatic).r;\n    float g = texture2D(tex, distUv).g;\n    float b = texture2D(tex, distUv - normal.xy * chromatic).b;\n    vec3 distSource = vec3(r, g, b);\n    \n    // Combine lighting (glass tint, specular, fresnel)\n    vec3 glassTint = vec3(0.85, 0.95, 1.0);\n    vec3 finalColor = distSource * (1.0 - fresnel * 0.3) + spec + glassTint * fresnel * 0.8;\n    \n    return vec4(mix(source.rgb, finalColor, mask), source.a);\n}",
    "uniformValues": {
      "speed": 0.46,
      "scale": 2.12,
      "bump": 5,
      "refraction": 0.0119,
      "chromatic": 0.05,
      "threshold": 0.105
    }
  },
  {
    "id": "recovered_timeline_324e3e70_3088_4eee_926f_39c55a6fbafe",
    "name": "3D Surface Morph Spirals",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-324e3e70-3088-4eee-926f-39c55a6fbafe in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Surface Morph Spirals\nuniform float twists; // @min 1.0 @max 50.0 @default 15.0\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float arms; // @min 1.0 @max 10.0 @default 4.0\nuniform float posX; // @min -0.5 @max 0.5 @default 0.0\nuniform float posY; // @min -0.5 @max 0.5 @default 0.0\nuniform float spiralDist; // @min 0.0 @max 1.0 @default 0.25\nuniform float colorShift; // @min 0.0 @max 6.28 @default 0.0\nuniform float colorFreq; // @min 0.1 @max 10.0 @default 3.0\nuniform vec3 spiralColor; // @default 1.0,1.0,1.0\nuniform float morphDepth; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.0 @max 1.73 @default 0.05\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Check if the pixel is above the black threshold\n    if (length(source.rgb) > blackThreshold) {\n        \n        // Extract luminance to act as the 3D surface height of the image\n        float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n        \n        // Create a continuous mirrored space for exactly 2 spirals\n        float mirrorX = abs(uv.x - 0.5 - posX) - spiralDist;\n        vec2 delta = vec2(mirrorX, uv.y - 0.5 - posY);\n        \n        float r = length(delta);\n        float a = atan(delta.y, delta.x);\n        \n        // Create a 3D tunnel/depth effect, morphing symmetrically along the image's 3D surface\n        float z = 0.2 / (r + 0.02) + lum * morphDepth;\n        \n        // Generate 3D spiral pattern\n        float spiral = sin(a * arms + z * twists - time * speed);\n        \n        // Super colorful psytrance palette using phase-shifted cosines, colorFreq, and colorShift\n        vec3 psyColor = 0.5 + 0.5 * cos(time * 2.0 + z * colorFreq - a * 2.0 + vec3(0.0, 0.33, 0.67) * 6.28318 + colorShift);\n        \n        // Apply custom spiral color tint\n        psyColor *= spiralColor;\n        \n        // Add a glowing center\n        float glow = exp(-r * 4.0) * 2.0;\n        \n        // Combine spiral, color, and glow\n        vec3 fx = psyColor * (spiral * 0.5 + 0.5) * (1.0 + glow);\n        \n        // Blend intensely with the original non-black pixel\n        source.rgb = mix(source.rgb, fx + source.rgb * psyColor, 0.85);\n    }\n    \n    return source;\n}",
    "uniformValues": {
      "twists": 7.37,
      "speed": 1.6,
      "arms": 1.63,
      "posX": 0,
      "posY": -0.05,
      "spiralDist": 0.07,
      "colorShift": 0.2512,
      "colorFreq": 10,
      "spiralColor": [
        0.23921568627450981,
        0.11372549019607843,
        0.24313725490196078
      ],
      "morphDepth": 5.9,
      "blackThreshold": 0.1038
    }
  },
  {
    "id": "recovered_timeline_40c6e4e9_b0e3_48e2_a06e_5784f113ed4a",
    "name": "LSD Trip Continuous",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-40c6e4e9-b0e3-48e2-a06e-5784f113ed4a in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: LSD Trip Continuous\nuniform float spread; // @min 1.0 @max 10.0 @default 4.0\nuniform float sharpness; // @min 0.0 @max 10.0 @default 3.0\nuniform float repulsion; // @min 0.0 @max 5.0 @default 1.5\nuniform float tripSpeed; // @min 0.1 @max 5.0 @default 1.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 px = 1.0 / resolution;\n    vec4 finalColor = vec4(0.0);\n    vec4 original = texture2D(tex, uv);\n    \n    vec2 off[8];\n    off[0] = vec2(1.0, 0.0);\n    off[1] = vec2(-1.0, 0.0);\n    off[2] = vec2(0.0, 1.0);\n    off[3] = vec2(0.0, -1.0);\n    off[4] = vec2(0.707, 0.707);\n    off[5] = vec2(-0.707, 0.707);\n    off[6] = vec2(0.707, -0.707);\n    off[7] = vec2(-0.707, -0.707);\n    \n    float t = time * tripSpeed;\n    float totalWeight = 0.0;\n    \n    // Loop the diffusion process with a continuous phase to avoid reversing\n    for(int j = 0; j < 3; j++) {\n        float fj = float(j);\n        \n        // Continuous phase from 0.0 to 1.0\n        float phase = fract(t * 0.3 + fj / 3.0);\n        // Smooth fade in and out to hide the loop reset\n        float weight = sin(phase * 3.14159265);\n        \n        float currentSpread = spread + phase * (spread * 0.5);\n        \n        // Continuous zoom effect instead of breathing\n        vec2 currentUv = uv + (uv - 0.5) * (phase * 0.15);\n        vec4 centerIter = texture2D(tex, currentUv);\n        \n        vec4 near = vec4(0.0);\n        vec4 far = vec4(0.0);\n        \n        for(int i = 0; i < 8; i++) {\n            near += texture2D(tex, currentUv + off[i] * px);\n            far += texture2D(tex, currentUv + off[i] * px * currentSpread);\n        }\n        \n        near /= 8.0;\n        far /= 8.0;\n        \n        vec4 diff = near - far;\n        vec4 iterColor = centerIter + (diff * sharpness) - ((centerIter - near) * repulsion);\n        \n        // Psychedelic color tinting per layer\n        vec3 tint = 0.5 + 0.5 * cos(phase * 6.28318 + vec3(0.0, 2.0, 4.0));\n        finalColor += vec4(iterColor.rgb * tint, centerIter.a) * weight;\n        totalWeight += weight;\n    }\n    \n    finalColor /= totalWeight + 0.0001;\n    \n    // Calculate luminance of the original image to use as a mask\n    float lum = dot(original.rgb, vec3(0.299, 0.587, 0.114));\n    // Smoothly mask out the effect in dark areas\n    float mask = smoothstep(0.05, 0.3, lum);\n    \n    vec3 blendedColor = mix(original.rgb, finalColor.rgb, mask);\n    \n    return vec4(clamp(blendedColor, 0.0, 1.0), original.a);\n}",
    "uniformValues": {
      "spread": 10,
      "sharpness": 10,
      "repulsion": 5,
      "tripSpeed": 5
    }
  },
  {
    "id": "recovered_timeline_8de56499_5d2f_4f83_8025_ce57a1146166",
    "name": "Wavy Noise HURA Hex Grid 3D",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-8de56499-5d2f-4f83-8025-ce57a1146166 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Wavy Noise HURA Hex Grid 3D\nuniform float scale; // @min 5.0 @max 50.0 @default 21.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.5\nuniform float morph3D; // @min 0.0 @max 1.0 @default 1.0\nuniform float animSpeed; // @min 0.0 @max 5.0 @default 2.0\nuniform float morphAmount; // @min 0.0 @max 1.0 @default 0.3\n\nvec4 hexagon(in vec2 p) {\n    vec2 q = vec2(p.x * 1.1547006, p.y + p.x * 0.5773503);\n    vec2 pi = floor(q), pf = fract(q);\n    float v = mod(pi.x + pi.y, 3.0);\n    float ca = step(1.0, v), cb = step(2.0, v);\n    vec2 ma = step(pf.xy, pf.yx);\n    float e = dot(ma, 1.0 - pf.yx + ca * (pf.x + pf.y - 1.0) + cb * (pf.yx - 2.0 * pf.xy));\n    p = vec2(q.x + floor(0.5 + p.y / 1.5), 4.0 * p.y / 3.0) * 0.5 + 0.5;\n    float f = length((fract(p) - 0.5) * vec2(1.0, 0.85));\t\t\t\n    return vec4(pi + ca - cb * ma, e, f);\n}\n\nfloat URA(in vec2 p) {\n    float v = 151.0;\n    float r = 32.0;\n    float l = mod(p.y + r * p.x, v);\n    float rz = 1.0;\n    for(int i = 1; i < 76; i++) {\n        if (mod(float(i) * float(i), v) == l) rz = 0.0;\n    }\n    return rz;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Removed the global UV distortion that was shrinking the sculpture\n    vec2 p = uv * 2.0 - 1.0;\n    p.x *= resolution.x / resolution.y;\n    \n    vec4 h = hexagon(p * scale);\n    vec3 col = vec3(URA(h.xy));\n    \n    // Calculate the center UV of the current hexagon to sample a single luma value per hex\n    vec2 centerP = vec2(h.x * 0.8660254, h.y - h.x * 0.5) / scale;\n    centerP.x *= resolution.y / resolution.x;\n    vec2 centerUV = centerP * 0.5 + 0.5;\n    \n    vec4 hexSource = texture2D(tex, centerUV);\n    float hexLuma = dot(hexSource.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Morphable 3D bevel effect, now using morphAmount to enhance depth locally without shrinking\n    float edge = smoothstep(-0.2, 0.13, h.z);\n    float bevel = mix(1.0, edge, clamp(morph3D + hexLuma * morphAmount, 0.0, 1.0));\n    \n    if (dot(col, vec3(1.0)) > 1.0) {\n        col *= bevel;\n    } else {\n        col = 1.0 - (1.0 - col) * bevel;\n    }\n    \n    // Continuous wave noise sweep\n    float waveNoise = node_noise(centerUV * 4.0 + vec2(time * animSpeed * 0.5, time * animSpeed * 0.3));\n    float sweep = threshold + (waveNoise - 0.5) * 1.5;\n    \n    float activeHex = step(sweep, hexLuma);\n    \n    // Calculate how \"deep\" into the lit state the hexagon is\n    float litDepth = max(0.0, hexLuma - sweep);\n    \n    // Generate a color based on the lit depth and time\n    vec3 timeColor = 0.5 + 0.5 * cos(litDepth * 15.0 - time * 3.0 + vec3(0.0, 2.0, 4.0));\n    \n    // Light up taken hexagons entirely, rest dark\n    vec3 finalColor = mix(vec3(0.0), col * timeColor * 1.5, activeHex);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "scale": 47.75,
      "threshold": 0.92,
      "morph3D": 1,
      "animSpeed": 0.85,
      "morphAmount": 0.07
    }
  },
  {
    "id": "recovered_timeline_e2d8bdac_7061_4dd9_a4fe_741cab075e47",
    "name": "Luma Trippy Automata 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-e2d8bdac-7061-4dd9-a4fe-741cab075e47 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Luma Trippy Automata\nuniform float intensity; // @min 0.0 @max 3.0 @default 1.5\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.25\nuniform float centerY; // @min -1.0 @max 1.0 @default 0.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Calculate luminance to map the 3D structure\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Threshold mask: only affect pixels that are not completely black\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    \n    if (mask <= 0.0) {\n        return source;\n    }\n\n    vec3 c = vec3(0.0);\n    float l = 0.0;\n    float z = time * speed;\n    \n    for(int i = 0; i < 3; i++) {\n        vec2 p = uv;\n        p -= 0.5;\n        \n        // Layer of duplication (mirroring X) and offset\n        p.x = abs(p.x) - centerX;\n        p.y -= centerY;\n        \n        p.x *= resolution.x / resolution.y;\n        \n        // Morph and distort coordinates based on the image's luminance and noise\n        // This makes the trippy effect wrap around the 3D surface of the subject\n        float noiseVal = node_noise(p * 5.0 + z + lum * 2.0);\n        p += vec2(cos(noiseVal * 6.2831), sin(noiseVal * 6.2831)) * lum * 0.15;\n        \n        vec2 uv_effect = p;\n        z += 0.07;\n        l = length(p);\n        \n        // Avoid division by zero\n        float lenP = max(l, 0.0001); \n        \n        uv_effect += p / lenP * (sin(z) + 1.0) * abs(sin(lenP * 9.0 - z - z));\n        float val = 0.01 / max(length(mod(uv_effect, 1.0) - 0.5), 0.0001);\n        \n        // WebGL 1.0 safe vector indexing\n        if (i == 0) c.r = val;\n        else if (i == 1) c.g = val;\n        else c.b = val;\n    }\n    \n    vec3 effectColor = c / max(l, 0.0001);\n    \n    // Multiply the effect by the source color to map it onto the surface\n    vec3 mappedEffect = source.rgb * effectColor * intensity;\n    \n    // Blend the effect with the original image based on the threshold mask\n    vec3 finalColor = mix(source.rgb, mappedEffect, mask);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "intensity": 3,
      "centerX": 0,
      "centerY": -0.16,
      "threshold": 0,
      "speed": 0.1
    }
  },
  {
    "id": "recovered_timeline_71a1df62_599c_46a6_b27a_87397d162cdf",
    "name": "Luma Trippy Automata 3",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-71a1df62-599c-46a6-b27a-87397d162cdf in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Luma Trippy Automata\nuniform float intensity; // @min 0.0 @max 3.0 @default 1.5\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.25\nuniform float centerY; // @min -1.0 @max 1.0 @default 0.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Calculate luminance to map the 3D structure\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Threshold mask: only affect pixels that are not completely black\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    \n    if (mask <= 0.0) {\n        return source;\n    }\n\n    vec3 c = vec3(0.0);\n    float l = 0.0;\n    float z = time * speed;\n    \n    for(int i = 0; i < 3; i++) {\n        vec2 p = uv;\n        p -= 0.5;\n        \n        // Layer of duplication (mirroring X) and offset\n        p.x = abs(p.x) - centerX;\n        p.y -= centerY;\n        \n        p.x *= resolution.x / resolution.y;\n        \n        // Morph and distort coordinates based on the image's luminance and noise\n        // This makes the trippy effect wrap around the 3D surface of the subject\n        float noiseVal = node_noise(p * 5.0 + z + lum * 2.0);\n        p += vec2(cos(noiseVal * 6.2831), sin(noiseVal * 6.2831)) * lum * 0.15;\n        \n        vec2 uv_effect = p;\n        z += 0.07;\n        l = length(p);\n        \n        // Avoid division by zero\n        float lenP = max(l, 0.0001); \n        \n        uv_effect += p / lenP * (sin(z) + 1.0) * abs(sin(lenP * 9.0 - z - z));\n        float val = 0.01 / max(length(mod(uv_effect, 1.0) - 0.5), 0.0001);\n        \n        // WebGL 1.0 safe vector indexing\n        if (i == 0) c.r = val;\n        else if (i == 1) c.g = val;\n        else c.b = val;\n    }\n    \n    vec3 effectColor = c / max(l, 0.0001);\n    \n    // Multiply the effect by the source color to map it onto the surface\n    vec3 mappedEffect = source.rgb * effectColor * intensity;\n    \n    // Blend the effect with the original image based on the threshold mask\n    vec3 finalColor = mix(source.rgb, mappedEffect, mask);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "intensity": 0.42,
      "centerX": 0.16,
      "centerY": 0.2,
      "threshold": 0.06,
      "speed": 1.898
    }
  },
  {
    "id": "recovered_timeline_19b303a0_cd36_4556_9fa7_c46b38c34a14",
    "name": "Luma Trippy Automata 4",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-19b303a0-cd36-4556-9fa7-c46b38c34a14 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Luma Trippy Automata\nuniform float intensity; // @min 0.0 @max 3.0 @default 1.5\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.25\nuniform float centerY; // @min -1.0 @max 1.0 @default 0.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Calculate luminance to map the 3D structure\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Threshold mask: only affect pixels that are not completely black\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    \n    if (mask <= 0.0) {\n        return source;\n    }\n\n    vec3 c = vec3(0.0);\n    float l = 0.0;\n    float z = time * speed;\n    \n    for(int i = 0; i < 3; i++) {\n        vec2 p = uv;\n        p -= 0.5;\n        \n        // Layer of duplication (mirroring X) and offset\n        p.x = abs(p.x) - centerX;\n        p.y -= centerY;\n        \n        p.x *= resolution.x / resolution.y;\n        \n        // Morph and distort coordinates based on the image's luminance and noise\n        // This makes the trippy effect wrap around the 3D surface of the subject\n        float noiseVal = node_noise(p * 5.0 + z + lum * 2.0);\n        p += vec2(cos(noiseVal * 6.2831), sin(noiseVal * 6.2831)) * lum * 0.15;\n        \n        vec2 uv_effect = p;\n        z += 0.07;\n        l = length(p);\n        \n        // Avoid division by zero\n        float lenP = max(l, 0.0001); \n        \n        uv_effect += p / lenP * (sin(z) + 1.0) * abs(sin(lenP * 9.0 - z - z));\n        float val = 0.01 / max(length(mod(uv_effect, 1.0) - 0.5), 0.0001);\n        \n        // WebGL 1.0 safe vector indexing\n        if (i == 0) c.r = val;\n        else if (i == 1) c.g = val;\n        else c.b = val;\n    }\n    \n    vec3 effectColor = c / max(l, 0.0001);\n    \n    // Multiply the effect by the source color to map it onto the surface\n    vec3 mappedEffect = source.rgb * effectColor * intensity;\n    \n    // Blend the effect with the original image based on the threshold mask\n    vec3 finalColor = mix(source.rgb, mappedEffect, mask);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "intensity": 2.85,
      "centerX": 0.34,
      "centerY": 0.2,
      "threshold": 0.06,
      "speed": 1.898
    }
  },
  {
    "id": "recovered_timeline_829d4574_7fc9_4004_9618_f5dce950596f",
    "name": "Luma Trippy Automata 5",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-829d4574-7fc9-4004-9618-f5dce950596f in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Luma Trippy Automata\nuniform float intensity; // @min 0.0 @max 3.0 @default 1.5\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.25\nuniform float centerY; // @min -1.0 @max 1.0 @default 0.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Calculate luminance to map the 3D structure\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Threshold mask: only affect pixels that are not completely black\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    \n    if (mask <= 0.0) {\n        return source;\n    }\n\n    vec3 c = vec3(0.0);\n    float l = 0.0;\n    float z = time * speed;\n    \n    for(int i = 0; i < 3; i++) {\n        vec2 p = uv;\n        p -= 0.5;\n        \n        // Layer of duplication (mirroring X) and offset\n        p.x = abs(p.x) - centerX;\n        p.y -= centerY;\n        \n        p.x *= resolution.x / resolution.y;\n        \n        // Morph and distort coordinates based on the image's luminance and noise\n        // This makes the trippy effect wrap around the 3D surface of the subject\n        float noiseVal = node_noise(p * 5.0 + z + lum * 2.0);\n        p += vec2(cos(noiseVal * 6.2831), sin(noiseVal * 6.2831)) * lum * 0.15;\n        \n        vec2 uv_effect = p;\n        z += 0.07;\n        l = length(p);\n        \n        // Avoid division by zero\n        float lenP = max(l, 0.0001); \n        \n        uv_effect += p / lenP * (sin(z) + 1.0) * abs(sin(lenP * 9.0 - z - z));\n        float val = 0.01 / max(length(mod(uv_effect, 1.0) - 0.5), 0.0001);\n        \n        // WebGL 1.0 safe vector indexing\n        if (i == 0) c.r = val;\n        else if (i == 1) c.g = val;\n        else c.b = val;\n    }\n    \n    vec3 effectColor = c / max(l, 0.0001);\n    \n    // Multiply the effect by the source color to map it onto the surface\n    vec3 mappedEffect = source.rgb * effectColor * intensity;\n    \n    // Blend the effect with the original image based on the threshold mask\n    vec3 finalColor = mix(source.rgb, mappedEffect, mask);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "intensity": 1.74,
      "centerX": 0.06,
      "centerY": -0.02,
      "threshold": 0,
      "speed": 0.274
    }
  },
  {
    "id": "recovered_timeline_814b7d19_5ffe_4da5_971c_555da77ec977",
    "name": "Luma Trippy Automata 6",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-814b7d19-5ffe-4da5-971c-555da77ec977 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Luma Trippy Automata\nuniform float intensity; // @min 0.0 @max 3.0 @default 1.5\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.25\nuniform float centerY; // @min -1.0 @max 1.0 @default 0.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Calculate luminance to map the 3D structure\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Threshold mask: only affect pixels that are not completely black\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    \n    if (mask <= 0.0) {\n        return source;\n    }\n\n    vec3 c = vec3(0.0);\n    float l = 0.0;\n    float z = time * speed;\n    \n    for(int i = 0; i < 3; i++) {\n        vec2 p = uv;\n        p -= 0.5;\n        \n        // Layer of duplication (mirroring X) and offset\n        p.x = abs(p.x) - centerX;\n        p.y -= centerY;\n        \n        p.x *= resolution.x / resolution.y;\n        \n        // Morph and distort coordinates based on the image's luminance and noise\n        // This makes the trippy effect wrap around the 3D surface of the subject\n        float noiseVal = node_noise(p * 5.0 + z + lum * 2.0);\n        p += vec2(cos(noiseVal * 6.2831), sin(noiseVal * 6.2831)) * lum * 0.15;\n        \n        vec2 uv_effect = p;\n        z += 0.17;\n        l = length(p);\n        \n        // Avoid division by zero\n        float lenP = max(l, 0.0001); \n        \n        uv_effect += p / lenP * (sin(z) + 1.0) * abs(sin(lenP * 9.0 - z - z));\n        float val = 0.01 / max(length(mod(uv_effect, 1.0) - 0.5), 0.0001);\n        \n        // WebGL 1.0 safe vector indexing\n        if (i == 0) c.r = val;\n        else if (i == 1) c.g = val;\n        else c.b = val;\n    }\n    \n    vec3 effectColor = c / max(l, 0.0001);\n    \n    // Multiply the effect by the source color to map it onto the surface\n    vec3 mappedEffect = source.rgb * effectColor * intensity;\n    \n    // Blend the effect with the original image based on the threshold mask\n    vec3 finalColor = mix(source.rgb, mappedEffect, mask);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "intensity": 3,
      "centerX": 0,
      "centerY": 0.8,
      "threshold": 0,
      "speed": 0.216
    }
  },
  {
    "id": "recovered_timeline_a324ce5d_f56c_4587_9a08_8d2b85db68fd",
    "name": "Round Luma Automata",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-a324ce5d-f56c-4587-9a08-8d2b85db68fd in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Round Luma Automata\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float pixelSize; // @min 8.0 @max 64.0 @default 24.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 orig = texture2D(tex, uv);\n    float lum = dot(orig.rgb, vec3(0.299, 0.587, 0.114));\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum) * orig.a;\n    \n    // Automata logic driven by luminance\n    vec2 p = uv * scale;\n    float t = time * speed;\n    float n = 0.0;\n    vec2 q = p;\n    mat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\n    float amp = 1.0;\n    float sumAmp = 0.0;\n\n    for(int i = 0; i < 4; i++) {\n        vec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\n        float noiseVal = node_noise(q + tOffset + lum * 1.5);\n        float angle = noiseVal * 6.2831;\n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        q = rot * q * 1.3; \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    n /= sumAmp;\n    float branch = smoothstep(0.3, 0.7, n);\n\n    // Grid and column calculations\n    vec2 gridUv = (uv + branch * 0.05) * resolution / pixelSize;\n    vec2 cell = floor(gridUv);\n    vec2 local = fract(gridUv);\n    \n    float colRand = node_rand(vec2(cell.x, 1.0));\n    \n    // Fall offset influenced by automata branch and time\n    float fallOffset = time * speed * 2.0 * (0.5 + colRand * 1.5) + branch * 5.0;\n    float row = floor(gridUv.y - fallOffset);\n    \n    float blockRand = node_rand(vec2(cell.x, row));\n    float activeBlock = step(0.4, blockRand) * mask;\n    \n    // Make the pixel actually more round\n    float dist = length(local - 0.5);\n    float circle = smoothstep(0.5, 0.4, dist);\n    \n    // Change color to the branch one based on time\n    float colorMix = sin(time * 2.0 + branch * 6.28) * 0.5 + 0.5;\n    vec3 timeColor = mix(blobColor, branchColor, colorMix);\n    \n    // Add slight shading variation to the round pixels\n    vec3 effectCol = timeColor * (0.7 + 0.3 * blockRand);\n    \n    // The other part of the shader that are not colored should be low on luminosity\n    vec3 bgCol = orig.rgb * 0.15; \n    \n    // Combine the active block and the round shape\n    float shapeMask = activeBlock * circle;\n    \n    // Blend the effect with the darkened original image\n    vec3 finalCol = mix(bgCol, effectCol, shapeMask);\n    \n    return vec4(finalCol, orig.a);\n}",
    "uniformValues": {
      "speed": 2.855,
      "scale": 3.08,
      "threshold": 0.33,
      "pixelSize": 8,
      "blobColor": [
        0.10588235294117647,
        0.21176470588235294,
        0.10980392156862745
      ],
      "branchColor": [
        0.796078431372549,
        0.5411764705882353,
        0.30196078431372547
      ]
    }
  },
  {
    "id": "recovered_timeline_1713064c_159d_439d_bb82_688383284719",
    "name": "Luma Trippy Automata 7",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-1713064c-159d-439d-bb82-688383284719 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Luma Trippy Automata\nuniform float intensity; // @min 0.0 @max 3.0 @default 1.5\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.25\nuniform float centerY; // @min -1.0 @max 1.0 @default 0.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Calculate luminance to map the 3D structure\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Threshold mask: only affect pixels that are not completely black\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    \n    if (mask <= 0.0) {\n        return source;\n    }\n\n    vec3 c = vec3(0.0);\n    float l = 0.0;\n    float z = time * speed;\n    \n    for(int i = 0; i < 3; i++) {\n        vec2 p = uv;\n        p -= 0.5;\n        \n        // Layer of duplication (mirroring X) and offset\n        p.x = abs(p.x) - centerX;\n        p.y -= centerY;\n        \n        p.x *= resolution.x / resolution.y;\n        \n        // Morph and distort coordinates based on the image's luminance and noise\n        // This makes the trippy effect wrap around the 3D surface of the subject\n        float noiseVal = node_noise(p * 5.0 + z + lum * 2.0);\n        p += vec2(cos(noiseVal * 6.2831), sin(noiseVal * 6.2831)) * lum * 0.15;\n        \n        vec2 uv_effect = p;\n        z += 0.08;\n        l = length(p);\n        \n        // Avoid division by zero\n        float lenP = max(l, 0.0001); \n        \n        uv_effect += p / lenP * (sin(z) + 1.0) * abs(sin(lenP * 9.0 - z - z));\n        float val = 0.01 / max(length(mod(uv_effect, 1.0) - 0.5), 0.0001);\n        \n        // WebGL 1.0 safe vector indexing\n        if (i == 0) c.r = val;\n        else if (i == 1) c.g = val;\n        else c.b = val;\n    }\n    \n    vec3 effectColor = c / max(l, 0.0001);\n    \n    // Multiply the effect by the source color to map it onto the surface\n    vec3 mappedEffect = source.rgb * effectColor * intensity;\n    \n    // Blend the effect with the original image based on the threshold mask\n    vec3 finalColor = mix(source.rgb, mappedEffect, mask);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "intensity": 0.39,
      "centerX": 0.11,
      "centerY": 0,
      "threshold": 0,
      "speed": 2.507
    }
  },
  {
    "id": "recovered_timeline_d78e5564_d7ba_436a_9bba_b1d41178be40",
    "name": "3D Surface Morph Spirals 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-d78e5564-d7ba-436a-9bba-b1d41178be40 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Surface Morph Spirals\nuniform float twists; // @min 1.0 @max 50.0 @default 15.0\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float arms; // @min 1.0 @max 10.0 @default 4.0\nuniform float posX; // @min -0.5 @max 0.5 @default 0.0\nuniform float posY; // @min -0.5 @max 0.5 @default 0.0\nuniform float spiralDist; // @min 0.0 @max 1.0 @default 0.25\nuniform float colorShift; // @min 0.0 @max 6.28 @default 0.0\nuniform float morphDepth; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.0 @max 1.73 @default 0.05\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Check if the pixel is above the black threshold\n    if (length(source.rgb) > blackThreshold) {\n        \n        // Extract luminance to act as the 3D surface height of the image\n        float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n        \n        // Create a continuous mirrored space for exactly 2 spirals\n        float mirrorX = abs(uv.x - 0.5 - posX) - spiralDist;\n        vec2 delta = vec2(mirrorX, uv.y - 0.5 - posY);\n        \n        float r = length(delta);\n        float a = atan(delta.y, delta.x);\n        \n        // Create a 3D tunnel/depth effect, morphing symmetrically along the image's 3D surface\n        float z = 0.2 / (r + 0.02) + lum * morphDepth;\n        \n        // Generate 3D spiral pattern\n        float spiral = sin(a * arms + z * twists - time * speed);\n        \n        // Super colorful psytrance palette using phase-shifted cosines and colorShift slider\n        vec3 psyColor = 0.5 + 0.5 * cos(time * 2.0 + z * 3.0 - a * 2.0 + vec3(0.0, 0.33, 0.67) * 6.28318 + colorShift);\n        \n        // Add a glowing center\n        float glow = exp(-r * 4.0) * 2.0;\n        \n        // Combine spiral, color, and glow\n        vec3 fx = psyColor * (spiral * 0.5 + 0.5) * (1.0 + glow);\n        \n        // Blend intensely with the original non-black pixel\n        source.rgb = mix(source.rgb, fx + source.rgb * psyColor, 0.85);\n    }\n    \n    return source;\n}",
    "uniformValues": {
      "twists": 22.56,
      "speed": -8.2,
      "arms": 1.63,
      "posX": 0,
      "posY": -0.05,
      "spiralDist": 0.07,
      "colorShift": 6.2172,
      "morphDepth": 3,
      "blackThreshold": 0.1038
    }
  },
  {
    "id": "recovered_timeline_c66e0916_d8f3_4355_8970_56ba50729b1c",
    "name": "3D Surface Morph Spirals 3",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-c66e0916-d8f3-4355-8970-56ba50729b1c in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Surface Morph Spirals\nuniform float twists; // @min 1.0 @max 50.0 @default 15.0\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float arms; // @min 1.0 @max 10.0 @default 4.0\nuniform float posX; // @min -0.5 @max 0.5 @default 0.0\nuniform float posY; // @min -0.5 @max 0.5 @default 0.0\nuniform float spiralDist; // @min 0.0 @max 1.0 @default 0.25\nuniform float colorShift; // @min 0.0 @max 6.28 @default 0.0\nuniform float colorFreq; // @min 0.1 @max 10.0 @default 3.0\nuniform vec3 spiralColor; // @default 1.0,1.0,1.0\nuniform float morphDepth; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.0 @max 1.73 @default 0.05\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Check if the pixel is above the black threshold\n    if (length(source.rgb) > blackThreshold) {\n        \n        // Extract luminance to act as the 3D surface height of the image\n        float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n        \n        // Create a continuous mirrored space for exactly 2 spirals\n        float mirrorX = abs(uv.x - 0.5 - posX) - spiralDist;\n        vec2 delta = vec2(mirrorX, uv.y - 0.5 - posY);\n        \n        float r = length(delta);\n        float a = atan(delta.y, delta.x);\n        \n        // Create a 3D tunnel/depth effect, morphing symmetrically along the image's 3D surface\n        float z = 0.2 / (r + 0.02) + lum * morphDepth;\n        \n        // Generate 3D spiral pattern\n        float spiral = sin(a * arms + z * twists - time * speed);\n        \n        // Super colorful psytrance palette using phase-shifted cosines, colorFreq, and colorShift\n        vec3 psyColor = 0.5 + 0.5 * cos(time * 2.0 + z * colorFreq - a * 2.0 + vec3(0.0, 0.33, 0.67) * 6.28318 + colorShift);\n        \n        // Apply custom spiral color tint\n        psyColor *= spiralColor;\n        \n        // Add a glowing center\n        float glow = exp(-r * 4.0) * 2.0;\n        \n        // Combine spiral, color, and glow\n        vec3 fx = psyColor * (spiral * 0.5 + 0.5) * (1.0 + glow);\n        \n        // Blend intensely with the original non-black pixel\n        source.rgb = mix(source.rgb, fx + source.rgb * psyColor, 0.85);\n    }\n    \n    return source;\n}",
    "uniformValues": {
      "twists": 4.43,
      "speed": -8.4,
      "arms": 1.63,
      "posX": 0,
      "posY": -0.05,
      "spiralDist": 0.07,
      "colorShift": 0.3768,
      "colorFreq": 9.01,
      "spiralColor": [
        0.09019607843137255,
        0.054901960784313725,
        0.011764705882352941
      ],
      "morphDepth": 1.4,
      "blackThreshold": 0.1038
    }
  },
  {
    "id": "recovered_timeline_a9cefb2d_7232_4542_a899_480aaeff89a3",
    "name": "3D Surface Morph Spirals 4",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-a9cefb2d-7232-4542-a899-480aaeff89a3 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Surface Morph Spirals\nuniform float twists; // @min 1.0 @max 50.0 @default 15.0\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float arms; // @min 1.0 @max 10.0 @default 4.0\nuniform float posX; // @min -0.5 @max 0.5 @default 0.0\nuniform float posY; // @min -0.5 @max 0.5 @default 0.0\nuniform float spiralDist; // @min 0.0 @max 1.0 @default 0.25\nuniform float colorShift; // @min 0.0 @max 6.28 @default 0.0\nuniform float colorFreq; // @min 0.1 @max 10.0 @default 3.0\nuniform vec3 spiralColor; // @default 1.0,1.0,1.0\nuniform float morphDepth; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.0 @max 1.73 @default 0.05\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Check if the pixel is above the black threshold\n    if (length(source.rgb) > blackThreshold) {\n        \n        // Extract luminance to act as the 3D surface height of the image\n        float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n        \n        // Create a continuous mirrored space for exactly 2 spirals\n        float mirrorX = abs(uv.x - 0.5 - posX) - spiralDist;\n        vec2 delta = vec2(mirrorX, uv.y - 0.5 - posY);\n        \n        float r = length(delta);\n        float a = atan(delta.y, delta.x);\n        \n        // Create a 3D tunnel/depth effect, morphing symmetrically along the image's 3D surface\n        float z = 0.2 / (r + 0.02) + lum * morphDepth;\n        \n        // Generate 3D spiral pattern\n        float spiral = sin(a * arms + z * twists - time * speed);\n        \n        // Super colorful psytrance palette using phase-shifted cosines, colorFreq, and colorShift\n        vec3 psyColor = 0.5 + 0.5 * cos(time * 2.0 + z * colorFreq - a * 2.0 + vec3(0.0, 0.33, 0.67) * 6.28318 + colorShift);\n        \n        // Apply custom spiral color tint\n        psyColor *= spiralColor;\n        \n        // Add a glowing center\n        float glow = exp(-r * 4.0) * 2.0;\n        \n        // Combine spiral, color, and glow\n        vec3 fx = psyColor * (spiral * 0.5 + 0.5) * (1.0 + glow);\n        \n        // Blend intensely with the original non-black pixel\n        source.rgb = mix(source.rgb, fx + source.rgb * psyColor, 0.85);\n    }\n    \n    return source;\n}",
    "uniformValues": {
      "twists": 24.52,
      "speed": 7.6,
      "arms": 1.63,
      "posX": 0.36,
      "posY": 0.5,
      "spiralDist": 0.65,
      "colorShift": 5.2752,
      "colorFreq": 0.991,
      "spiralColor": [
        0.09019607843137255,
        0.07450980392156863,
        0.047058823529411764
      ],
      "morphDepth": 4.2,
      "blackThreshold": 0.1903
    }
  },
  {
    "id": "recovered_timeline_e704beaf_2f7f_499a_ae66_fb68d8f201af",
    "name": "3D Surface Morph Spirals 5",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-e704beaf-2f7f-499a-ae66-fb68d8f201af in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Surface Morph Spirals\nuniform float twists; // @min 1.0 @max 50.0 @default 15.0\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float arms; // @min 1.0 @max 10.0 @default 4.0\nuniform float posX; // @min -0.5 @max 0.5 @default 0.0\nuniform float posY; // @min -0.5 @max 0.5 @default 0.0\nuniform float spiralDist; // @min 0.0 @max 1.0 @default 0.25\nuniform float colorShift; // @min 0.0 @max 6.28 @default 0.0\nuniform float colorFreq; // @min 0.1 @max 10.0 @default 3.0\nuniform vec3 spiralColor; // @default 1.0,1.0,1.0\nuniform float morphDepth; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.0 @max 1.73 @default 0.05\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Check if the pixel is above the black threshold\n    if (length(source.rgb) > blackThreshold) {\n        \n        // Extract luminance to act as the 3D surface height of the image\n        float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n        \n        // Create a continuous mirrored space for exactly 2 spirals, using a smoothed absolute value to hide the seam\n        float dx = uv.x - 0.5 - posX;\n        float mirrorX = sqrt(dx * dx + 0.02) - spiralDist;\n        vec2 delta = vec2(mirrorX, uv.y - 0.5 - posY);\n        \n        float r = length(delta);\n        float a = atan(delta.y, delta.x);\n        \n        // Create a 3D tunnel/depth effect, morphing symmetrically along the image's 3D surface\n        float z = 0.2 / (r + 0.02) + lum * morphDepth;\n        \n        // Generate 3D spiral pattern\n        float spiral = sin(a * arms + z * twists - time * speed);\n        \n        // Super colorful psytrance palette using phase-shifted cosines, colorFreq, and colorShift\n        vec3 psyColor = 0.5 + 0.5 * cos(time * 2.0 + z * colorFreq - a * 2.0 + vec3(0.0, 0.33, 0.67) * 6.28318 + colorShift);\n        \n        // Apply custom spiral color tint\n        psyColor *= spiralColor;\n        \n        // Add a glowing center\n        float glow = exp(-r * 4.0) * 2.0;\n        \n        // Combine spiral, color, and glow\n        vec3 fx = psyColor * (spiral * 0.5 + 0.5) * (1.0 + glow);\n        \n        // Blend intensely with the original non-black pixel\n        source.rgb = mix(source.rgb, fx + source.rgb * psyColor, 0.85);\n    }\n    \n    return source;\n}",
    "uniformValues": {
      "twists": 4.43,
      "speed": 6,
      "arms": 8.38,
      "posX": 0,
      "posY": -0.25,
      "spiralDist": 0.13,
      "colorShift": 3.454,
      "colorFreq": 9.01,
      "spiralColor": [
        0.3686274509803922,
        0.2784313725490196,
        0.14901960784313725
      ],
      "morphDepth": 0.7,
      "blackThreshold": 0.1038
    }
  },
  {
    "id": "recovered_timeline_a5885cdc_8851_4407_9905_4c03ae8aa1d6",
    "name": "3D Surface Morph Spirals 6",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-a5885cdc-8851-4407-9905-4c03ae8aa1d6 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Surface Morph Spirals\nuniform float twists; // @min 1.0 @max 50.0 @default 15.0\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float arms; // @min 1.0 @max 10.0 @default 4.0\nuniform float posX; // @min -0.5 @max 0.5 @default 0.0\nuniform float posY; // @min -0.5 @max 0.5 @default 0.0\nuniform float spiralDist; // @min 0.0 @max 1.0 @default 0.25\nuniform float colorShift; // @min 0.0 @max 6.28 @default 0.0\nuniform float colorFreq; // @min 0.1 @max 10.0 @default 3.0\nuniform vec3 spiralColor; // @default 1.0,1.0,1.0\nuniform float morphDepth; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.0 @max 1.73 @default 0.05\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Check if the pixel is above the black threshold\n    if (length(source.rgb) > blackThreshold) {\n        \n        // Extract luminance to act as the 3D surface height of the image\n        float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n        \n        // Create a continuous mirrored space for exactly 2 spirals, using a smoothed absolute value to hide the seam\n        float dx = uv.x - 0.5 - posX;\n        float mirrorX = sqrt(dx * dx + 0.02) - spiralDist;\n        vec2 delta = vec2(mirrorX, uv.y - 0.5 - posY);\n        \n        float r = length(delta);\n        float a = atan(delta.y, delta.x);\n        \n        // Create a 3D tunnel/depth effect, morphing symmetrically along the image's 3D surface\n        float z = 0.2 / (r + 0.02) + lum * morphDepth;\n        \n        // Generate 3D spiral pattern\n        float spiral = sin(a * arms + z * twists - time * speed);\n        \n        // Super colorful psytrance palette using phase-shifted cosines, colorFreq, and colorShift\n        vec3 psyColor = 0.5 + 0.5 * cos(time * 2.0 + z * colorFreq - a * 2.0 + vec3(0.0, 0.33, 0.67) * 6.28318 + colorShift);\n        \n        // Apply custom spiral color tint\n        psyColor *= spiralColor;\n        \n        // Add a glowing center\n        float glow = exp(-r * 4.0) * 2.0;\n        \n        // Combine spiral, color, and glow\n        vec3 fx = psyColor * (spiral * 0.5 + 0.5) * (1.0 + glow);\n        \n        // Blend intensely with the original non-black pixel\n        source.rgb = mix(source.rgb, fx + source.rgb * psyColor, 0.85);\n    }\n    \n    return source;\n}",
    "uniformValues": {
      "twists": 42.16,
      "speed": -9.8,
      "arms": 2.44,
      "posX": 0.45,
      "posY": 0.04,
      "spiralDist": 0.06,
      "colorShift": 0.5024,
      "colorFreq": 0.397,
      "spiralColor": [
        0.32941176470588235,
        0.011764705882352941,
        0.011764705882352941
      ],
      "morphDepth": 10,
      "blackThreshold": 0.1038
    }
  },
  {
    "id": "recovered_timeline_3dadcd1d_0015_4398_acec_77c550ea7de9",
    "name": "3D Surface Morph Spirals 7",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-3dadcd1d-0015-4398-acec-77c550ea7de9 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Surface Morph Spirals\nuniform float twists; // @min 1.0 @max 50.0 @default 15.0\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float arms; // @min 1.0 @max 10.0 @default 4.0\nuniform float posX; // @min -0.5 @max 0.5 @default 0.0\nuniform float posY; // @min -0.5 @max 0.5 @default 0.0\nuniform float spiralDist; // @min 0.0 @max 1.0 @default 0.25\nuniform float colorShift; // @min 0.0 @max 6.28 @default 0.0\nuniform float colorFreq; // @min 0.1 @max 10.0 @default 3.0\nuniform vec3 spiralColor; // @default 1.0,1.0,1.0\nuniform float morphDepth; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.0 @max 1.73 @default 0.05\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Check if the pixel is above the black threshold\n    if (length(source.rgb) > blackThreshold) {\n        \n        // Extract luminance to act as the 3D surface height of the image\n        float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n        \n        // Create a continuous mirrored space for exactly 2 spirals, using a smoothed absolute value to hide the seam\n        float dx = uv.x - 0.5 - posX;\n        float mirrorX = sqrt(dx * dx + 0.02) - spiralDist;\n        vec2 delta = vec2(mirrorX, uv.y - 0.5 - posY);\n        \n        float r = length(delta);\n        float a = atan(delta.y, delta.x);\n        \n        // Create a 3D tunnel/depth effect, morphing symmetrically along the image's 3D surface\n        float z = 0.2 / (r + 0.02) + lum * morphDepth;\n        \n        // Generate 3D spiral pattern\n        float spiral = sin(a * arms + z * twists - time * speed);\n        \n        // Super colorful psytrance palette using phase-shifted cosines, colorFreq, and colorShift\n        vec3 psyColor = 0.5 + 0.5 * cos(time * 2.0 + z * colorFreq - a * 2.0 + vec3(0.0, 0.33, 0.67) * 6.28318 + colorShift);\n        \n        // Apply custom spiral color tint\n        psyColor *= spiralColor;\n        \n        // Add a glowing center\n        float glow = exp(-r * 4.0) * 2.0;\n        \n        // Combine spiral, color, and glow\n        vec3 fx = psyColor * (spiral * 0.5 + 0.5) * (1.0 + glow);\n        \n        // Blend intensely with the original non-black pixel\n        source.rgb = mix(source.rgb, fx + source.rgb * psyColor, 0.85);\n    }\n    \n    return source;\n}",
    "uniformValues": {
      "twists": 2.96,
      "speed": -8.8,
      "arms": 1.72,
      "posX": 0,
      "posY": -0.15,
      "spiralDist": 0.13,
      "colorShift": 3.454,
      "colorFreq": 5.941,
      "spiralColor": [
        0.2196078431372549,
        0.13333333333333333,
        0.058823529411764705
      ],
      "morphDepth": 0.4,
      "blackThreshold": 0.1038
    }
  },
  {
    "id": "recovered_timeline_1d7e1953_8d5f_4267_bddb_c21d3a4573c3",
    "name": "3D Surface Morph Spirals 8",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-1d7e1953-8d5f-4267-bddb-c21d3a4573c3 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Surface Morph Spirals\nuniform float twists; // @min 1.0 @max 50.0 @default 15.0\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float arms; // @min 1.0 @max 10.0 @default 4.0\nuniform float posX; // @min -0.5 @max 0.5 @default 0.0\nuniform float posY; // @min -0.5 @max 0.5 @default 0.0\nuniform float spiralDist; // @min 0.0 @max 1.0 @default 0.25\nuniform float colorShift; // @min 0.0 @max 6.28 @default 0.0\nuniform float colorFreq; // @min 0.1 @max 10.0 @default 3.0\nuniform vec3 spiralColor; // @default 1.0,1.0,1.0\nuniform float morphDepth; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.0 @max 1.73 @default 0.05\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Check if the pixel is above the black threshold\n    if (length(source.rgb) > blackThreshold) {\n        \n        // Extract luminance to act as the 3D surface height of the image\n        float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n        \n        // Create a continuous mirrored space for exactly 2 spirals, using a smoothed absolute value to hide the seam\n        float dx = uv.x - 0.5 - posX;\n        float mirrorX = sqrt(dx * dx + 0.02) - spiralDist;\n        vec2 delta = vec2(mirrorX, uv.y - 0.5 - posY);\n        \n        float r = length(delta);\n        float a = atan(delta.y, delta.x);\n        \n        // Create a 3D tunnel/depth effect, morphing symmetrically along the image's 3D surface\n        float z = 0.2 / (r + 0.02) + lum * morphDepth;\n        \n        // Generate 3D spiral pattern\n        float spiral = sin(a * arms + z * twists - time * speed);\n        \n        // Super colorful psytrance palette using phase-shifted cosines, colorFreq, and colorShift\n        vec3 psyColor = 0.5 + 0.5 * cos(time * 2.0 + z * colorFreq - a * 2.0 + vec3(0.0, 0.33, 0.67) * 6.28318 + colorShift);\n        \n        // Apply custom spiral color tint\n        psyColor *= spiralColor;\n        \n        // Add a glowing center\n        float glow = exp(-r * 4.0) * 2.0;\n        \n        // Combine spiral, color, and glow\n        vec3 fx = psyColor * (spiral * 0.5 + 0.5) * (1.0 + glow);\n        \n        // Blend intensely with the original non-black pixel\n        source.rgb = mix(source.rgb, fx + source.rgb * psyColor, 0.85);\n    }\n    \n    return source;\n}",
    "uniformValues": {
      "twists": 5.41,
      "speed": -9.8,
      "arms": 2.44,
      "posX": 0.01,
      "posY": -0.19,
      "spiralDist": 0.13,
      "colorShift": 3.454,
      "colorFreq": 5.941,
      "spiralColor": [
        0.27058823529411763,
        0.24313725490196078,
        0.27450980392156865
      ],
      "morphDepth": 8.7,
      "blackThreshold": 0.1038
    }
  },
  {
    "id": "recovered_timeline_ca5bada9_08c4_4bc8_b345_49c5a25fa90c",
    "name": "3D Surface Morph Spirals 9",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-ca5bada9-08c4-4bc8-b345-49c5a25fa90c in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Surface Morph Spirals\nuniform float twists; // @min 1.0 @max 50.0 @default 15.0\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float arms; // @min 1.0 @max 10.0 @default 4.0\nuniform float posX; // @min -0.5 @max 0.5 @default 0.0\nuniform float posY; // @min -0.5 @max 0.5 @default 0.0\nuniform float spiralDist; // @min 0.0 @max 1.0 @default 0.25\nuniform float colorShift; // @min 0.0 @max 6.28 @default 0.0\nuniform float colorFreq; // @min 0.1 @max 10.0 @default 3.0\nuniform vec3 spiralColor; // @default 1.0,1.0,1.0\nuniform float morphDepth; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.0 @max 1.73 @default 0.05\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Check if the pixel is above the black threshold\n    if (length(source.rgb) > blackThreshold) {\n        \n        // Extract luminance to act as the 3D surface height of the image\n        float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n        \n        // Create a continuous mirrored space for exactly 2 spirals, using a smoothed absolute value to hide the seam\n        float dx = uv.x - 0.5 - posX;\n        float mirrorX = sqrt(dx * dx + 0.02) - spiralDist;\n        vec2 delta = vec2(mirrorX, uv.y - 0.5 - posY);\n        \n        float r = length(delta);\n        float a = atan(delta.y, delta.x);\n        \n        // Create a 3D tunnel/depth effect, morphing symmetrically along the image's 3D surface\n        float z = 0.2 / (r + 0.02) + lum * morphDepth;\n        \n        // Generate 3D spiral pattern\n        float spiral = sin(a * arms + z * twists - time * speed);\n        \n        // Super colorful psytrance palette using phase-shifted cosines, colorFreq, and colorShift\n        vec3 psyColor = 0.5 + 0.5 * cos(time * 2.0 + z * colorFreq - a * 2.0 + vec3(0.0, 0.33, 0.67) * 6.28318 + colorShift);\n        \n        // Apply custom spiral color tint\n        psyColor *= spiralColor;\n        \n        // Add a glowing center\n        float glow = exp(-r * 4.0) * 2.0;\n        \n        // Combine spiral, color, and glow\n        vec3 fx = psyColor * (spiral * 0.5 + 0.5) * (1.0 + glow);\n        \n        // Blend intensely with the original non-black pixel\n        source.rgb = mix(source.rgb, fx + source.rgb * psyColor, 0.85);\n    }\n    \n    return source;\n}",
    "uniformValues": {
      "twists": 5.41,
      "speed": -9.2,
      "arms": 2.44,
      "posX": 0.41,
      "posY": -0.19,
      "spiralDist": 0.13,
      "colorShift": 3.454,
      "colorFreq": 5.941,
      "spiralColor": [
        0.10588235294117647,
        0.15294117647058825,
        0.12156862745098039
      ],
      "morphDepth": 8.7,
      "blackThreshold": 0.1038
    }
  },
  {
    "id": "recovered_timeline_51edd1fa_eacf_4c0d_ba63_660ab202cf21",
    "name": "Glossy Complementary Lights",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-51edd1fa-eacf-4c0d-ba63-660ab202cf21 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Glossy Complementary Lights\nuniform float bump; // @min 0.1 @max 10.0 @default 3.0\nuniform float lightIntensity; // @min 0.0 @max 10.0 @default 4.0\nuniform float shininess; // @min 1.0 @max 100.0 @default 32.0\nuniform float glossIntensity; // @min 0.0 @max 5.0 @default 2.0\nuniform float ambient; // @min 0.0 @max 1.0 @default 0.05\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    vec3 lumaWeights = vec3(0.299, 0.587, 0.114);\n    float luma = dot(source.rgb, lumaWeights);\n    \n    vec2 eps = 1.0 / resolution;\n    \n    float lumaL = dot(texture2D(tex, uv - vec2(eps.x, 0.0)).rgb, lumaWeights);\n    float lumaR = dot(texture2D(tex, uv + vec2(eps.x, 0.0)).rgb, lumaWeights);\n    float lumaD = dot(texture2D(tex, uv - vec2(0.0, eps.y)).rgb, lumaWeights);\n    float lumaU = dot(texture2D(tex, uv + vec2(0.0, eps.y)).rgb, lumaWeights);\n    \n    vec3 normal = normalize(vec3((lumaL - lumaR) * bump, (lumaD - lumaU) * bump, 0.15));\n    vec3 surfacePos = vec3(uv, luma * 0.05);\n    \n    vec3 viewDir = normalize(vec3(0.5, 0.5, 1.5) - surfacePos);\n    \n    vec3 totalDiffuse = vec3(ambient);\n    vec3 totalSpecular = vec3(0.0);\n    \n    // Make brighter parts of the texture glossier\n    float localShininess = shininess * (0.2 + luma * 1.8);\n    float localGloss = glossIntensity * smoothstep(0.1, 0.9, luma);\n    \n    for(int i = 0; i < 4; i++) {\n        float fi = float(i);\n        \n        vec3 lPos = vec3(\n            0.5 + 0.7 * sin(time * 2.5 + fi * 2.1),\n            0.5 + 0.7 * cos(time * 3.2 + fi * 1.7),\n            0.2 + 0.3 * sin(time * 4.0 + fi * 1.3)\n        );\n        \n        vec3 lCol = vec3(0.0);\n        if (i == 0) lCol = vec3(1.0, 0.3, 0.1);\n        else if (i == 1) lCol = vec3(0.1, 0.7, 1.0);\n        else if (i == 2) lCol = vec3(0.8, 0.1, 1.0);\n        else if (i == 3) lCol = vec3(0.2, 0.9, 0.0);\n        \n        vec3 lDir = lPos - surfacePos;\n        float dist = length(lDir);\n        lDir = normalize(lDir);\n        \n        float diff = max(dot(normal, lDir), 0.0);\n        \n        vec3 halfDir = normalize(lDir + viewDir);\n        float spec = pow(max(dot(normal, halfDir), 0.0), localShininess) * diff * localGloss;\n        \n        float atten = 1.0 / (1.0 + dist * dist * 5.0);\n        \n        totalDiffuse += lCol * diff * atten;\n        totalSpecular += lCol * spec * atten;\n    }\n    \n    vec3 finalColor = (source.rgb * totalDiffuse + totalSpecular) * lightIntensity;\n    \n    finalColor = finalColor / (finalColor + vec3(1.0));\n    finalColor = pow(finalColor, vec3(1.0 / 2.2));\n    \n    float mask = smoothstep(max(0.0, threshold - 0.02), min(1.0, threshold + 0.02), luma);\n    finalColor = mix(source.rgb, finalColor, mask);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "bump": 3.268,
      "lightIntensity": 4,
      "shininess": 97.03,
      "glossIntensity": 5,
      "ambient": 0.05,
      "threshold": 0.24
    }
  },
  {
    "id": "recovered_timeline_393fc5cd_1b95_4ce0_b587_39ab207fcdbc",
    "name": "Concentric 3D Lights Mirrored X 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-393fc5cd-1b95-4ce0-b587-39ab207fcdbc in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Concentric 3D Lights Mirrored X\nuniform float scale; // @min 10.0 @max 100.0 @default 40.0\nuniform float bump; // @min 0.1 @max 5.0 @default 1.5\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.5\nuniform float centerY; // @min 0.0 @max 1.0 @default 0.5\nuniform bool mirror; // @default false\nuniform float mirrorX; // @min 0.0 @max 1.0 @default 0.5\n\nfloat getH(vec2 p, vec2 c, vec2 aspect, float t, float s, bool m, float mX) {\n    float d = length((p - c) * aspect);\n    if (m) {\n        // Calculate the reflected center across the vertical line at mirrorX\n        vec2 c2 = vec2(2.0 * mX - c.x, c.y);\n        float d2 = length((p - c2) * aspect);\n        d = min(d, d2);\n    }\n    return sin(d * s - t);\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    float eps = 0.01;\n    float t = time * 4.0;\n    vec2 aspect = vec2(resolution.x / resolution.y, 1.0);\n    vec2 center = vec2(centerX, centerY);\n    \n    // Calculate distances from center(s) for normal estimation\n    float h0 = getH(uv, center, aspect, t, scale, mirror, mirrorX);\n    float hx = getH(uv + vec2(eps, 0.0), center, aspect, t, scale, mirror, mirrorX);\n    float hy = getH(uv + vec2(0.0, eps), center, aspect, t, scale, mirror, mirrorX);\n    \n    // Calculate 3D normal from the smooth ripple height map\n    vec3 normal = normalize(vec3(h0 - hx, h0 - hy, eps * 2.0 / bump));\n    vec3 surfacePos = vec3(uv, h0 * bump * 0.05);\n    \n    vec3 totalLight = vec3(0.0);\n    \n    // 20 invisible lights of different colors moving in 3D space\n    for(int i = 0; i < 20; i++) {\n        float fi = float(i);\n        \n        vec3 lPos = vec3(\n            0.5 + 0.8 * sin(time * 0.3 + fi * 2.1),\n            0.5 + 0.8 * cos(time * 0.4 + fi * 1.7),\n            0.3 + 0.4 * sin(time * 0.5 + fi * 0.8)\n        );\n        \n        vec3 lCol = vec3(\n            0.5 + 0.5 * sin(fi * 1.3),\n            0.5 + 0.5 * sin(fi * 2.4 + 2.0),\n            0.5 + 0.5 * sin(fi * 3.1 + 4.0)\n        );\n        \n        vec3 lDir = lPos - surfacePos;\n        float dist = length(lDir);\n        lDir = normalize(lDir);\n        \n        float diff = max(dot(normal, lDir), 0.0);\n        float atten = 1.0 / (1.0 + dist * dist * 8.0);\n        \n        totalLight += lCol * diff * atten * 0.4;\n    }\n    \n    // Mask out black areas of the source image\n    float mask = clamp(dot(source.rgb, vec3(1.0)) * 10.0, 0.0, 1.0);\n    \n    // Combine the 3D illumination with the original texture, affected by source color\n    vec3 finalColor = mix(source.rgb, source.rgb * totalLight * 2.0, mask);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "scale": 100,
      "bump": 0.541,
      "centerX": 0.5,
      "centerY": 0.25,
      "mirror": true,
      "mirrorX": 0.5
    }
  },
  {
    "id": "recovered_timeline_aecde05a_5cad_4e3c_bed9_e91fb727dd41",
    "name": "Grid Traveling Glow Noise",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-aecde05a-5cad-4e3c-bed9-e91fb727dd41 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Grid Traveling Glow Noise\nuniform float bump; // @min 0.1 @max 10.0 @default 2.0\nuniform float lightIntensity; // @min 0.0 @max 5.0 @default 2.0\nuniform float scanSpeed; // @min 0.1 @max 3.0 @default 0.5\nuniform float gridScale; // @min 1.0 @max 20.0 @default 8.0\nuniform float scanIntensity; // @min 0.0 @max 5.0 @default 1.0\nuniform float scanDirection; // @min 0.0 @max 360.0 @default 0.0\n\n// Traveling Glow Parameters\nuniform float glowSpeed; // @min 0.0 @max 10.0 @default 2.0\nuniform float glowSize; // @min 0.1 @max 10.0 @default 2.0\nuniform float glowIntensity; // @min 0.0 @max 10.0 @default 5.0\nuniform vec3 glowColor; // @default 1.0,0.8,0.2\n\n// 7 Color Sliders\nuniform vec3 color1; // @default 1.0,0.2,0.2\nuniform vec3 color2; // @default 0.2,1.0,0.2\nuniform vec3 color3; // @default 0.2,0.2,1.0\nuniform vec3 color4; // @default 0.0,1.0,0.8\nuniform vec3 color5; // @default 0.1,0.1,0.1\nuniform vec3 color6; // @default 1.0,1.0,1.0\nuniform vec3 color7; // @default 0.8,0.2,1.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    // Mirror the base image horizontally\n    vec2 baseUV = vec2(uv.x < 0.5 ? uv.x : 1.0 - uv.x, uv.y);\n    vec4 source = texture2D(tex, baseUV);\n    \n    // Use luminance as a height map\n    float luma = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    vec2 eps = vec2(1.0 / resolution.x, 1.0 / resolution.y);\n    float lumaX = dot(texture2D(tex, baseUV + vec2(eps.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));\n    float lumaY = dot(texture2D(tex, baseUV + vec2(0.0, eps.y)).rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Calculate 3D normal from the luminance gradient\n    vec3 normal = normalize(vec3((luma - lumaX) * bump, (luma - lumaY) * bump, 0.05));\n    vec3 surfacePos = vec3(uv, luma * 0.15);\n    \n    // Ambient light from color5\n    vec3 totalLight = color5;\n    \n    // 3 moving lights using color1, color2, color3\n    for(int i = 0; i < 3; i++) {\n        float fi = float(i);\n        vec3 lPos = vec3(\n            0.5 + 0.6 * sin(time * 0.5 + fi * 2.1),\n            0.5 + 0.6 * cos(time * 0.6 + fi * 1.7),\n            0.2 + 0.2 * sin(time * 0.7 + fi)\n        );\n        \n        vec3 lCol = color1;\n        if(i == 1) lCol = color2;\n        if(i == 2) lCol = color3;\n        \n        vec3 lDir = lPos - surfacePos;\n        float dist = length(lDir);\n        lDir = normalize(lDir);\n        \n        float diff = max(dot(normal, lDir), 0.0);\n        float atten = 1.0 / (1.0 + dist * dist * 5.0);\n        \n        // Specular highlight tinted by color6\n        vec3 viewDir = normalize(vec3(0.5, 0.5, 1.0) - surfacePos);\n        vec3 halfDir = normalize(lDir + viewDir);\n        float spec = pow(max(dot(normal, halfDir), 0.0), 16.0);\n        \n        totalLight += lCol * (diff + spec * color6 * 0.5) * atten;\n    }\n    \n    // Calculate scan direction vector\n    float rad = scanDirection * 3.14159265 / 180.0;\n    vec2 dir = vec2(cos(rad), sin(rad));\n    \n    // Traveling glow pulse logic\n    float pulseDist = dot(uv, dir) * (10.0 / glowSize) - time * glowSpeed;\n    float pulse = max(0.0, sin(pulseDist));\n    pulse = pow(pulse, 8.0);\n    \n    // 3D Grid effect interacting with the height (luma)\n    vec2 gridUV = fract(uv * gridScale - dir * time * scanSpeed + luma * 0.3);\n    vec2 gridDist = abs(gridUV - 0.5);\n    float lineDist = min(gridDist.x, gridDist.y);\n    \n    // Increase grid width based on pulse\n    float lineWidth = 0.02 + pulse * 0.06;\n    float scanCore = smoothstep(lineWidth, lineWidth * 0.2, lineDist);\n    float scanGlow = (0.002 + pulse * 0.008) / (lineDist + 0.001);\n    \n    // Noise map for illumination\n    float nMap = node_noise(uv * 10.0 + time * 0.5);\n    float noiseIllum = 0.5 + max(0.0, nMap) * 2.5;\n    \n    // Mix color4 and color7 for a dynamic dual-color scan effect\n    vec3 currentScanColor = mix(color4, color7, sin(uv.x * 10.0 + time * 2.0) * 0.5 + 0.5);\n    \n    vec3 baseGrid = currentScanColor * scanIntensity * noiseIllum;\n    vec3 travelingGlow = glowColor * pulse * glowIntensity * noiseIllum;\n    \n    // Mask the grid so it primarily affects the bright/raised parts of the image\n    vec3 scanEffect = (baseGrid + travelingGlow) * (scanCore + scanGlow) * smoothstep(0.05, 0.2, luma);\n    \n    // Combine lighting, source, and grid\n    vec3 finalColor = source.rgb * totalLight * lightIntensity + scanEffect;\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "bump": 0.595,
      "lightIntensity": 2,
      "scanSpeed": 0.274,
      "gridScale": 13.92,
      "scanIntensity": 3.25,
      "scanDirection": 216,
      "glowSpeed": 0.3,
      "glowSize": 9.604,
      "glowIntensity": 10,
      "glowColor": [
        1,
        0.8,
        0.2
      ],
      "color1": [
        0.09019607843137255,
        0.011764705882352941,
        0.011764705882352941
      ],
      "color2": [
        0.7176470588235294,
        0.5725490196078431,
        0.5215686274509804
      ],
      "color3": [
        1,
        0.5607843137254902,
        0.2
      ],
      "color4": [
        0.0784313725490196,
        0.06666666666666667,
        0.043137254901960784
      ],
      "color5": [
        0.03137254901960784,
        0.011764705882352941,
        0.011764705882352941
      ],
      "color6": [
        1,
        1,
        1
      ],
      "color7": [
        0.34901960784313724,
        0.17254901960784313,
        0.40784313725490196
      ]
    }
  },
  {
    "id": "recovered_timeline_24b4b70b_b8f8_4cad_9f91_9bd51b8da4f2",
    "name": "Alien Noise Automata",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-24b4b70b-b8f8-4cad-9f91-9bd51b8da4f2 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Alien Noise Automata\nuniform float intensity; // @min 0.0 @max 0.2 @default 0.05\nuniform float waveSpeed; // @min 0.0 @max 5.0 @default 1.0\nuniform float chromatic; // @min 0.0 @max 0.05 @default 0.01\nuniform float autoSpeed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 orig = texture2D(tex, uv);\n    float origLuma = dot(orig.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Threshold mask to ensure black background is not influenced\n    float mask1 = smoothstep(threshold * 0.5, threshold + 0.01, origLuma);\n    \n    // Noise-based morphing map\n    float nx = node_noise(uv * scale + time * waveSpeed);\n    float ny = node_noise(uv * scale - time * waveSpeed + vec2(12.34));\n    vec2 morphOffset = (vec2(nx, ny) - 0.5) * 2.0 * intensity;\n    \n    // Apply mask to offset so the background remains static\n    morphOffset *= mask1;\n\n    vec2 distortedUv = uv + morphOffset;\n\n    float r = texture2D(tex, distortedUv + vec2(chromatic * morphOffset.x, chromatic * morphOffset.y)).r;\n    float g = texture2D(tex, distortedUv).g;\n    float b = texture2D(tex, distortedUv - vec2(chromatic * morphOffset.x, chromatic * morphOffset.y)).b;\n\n    vec4 waterColor = mix(orig, vec4(r, g, b, orig.a), mask1);\n\n    // --- Seamless Luma Automata Overlay ---\n    float lum = dot(waterColor.rgb, vec3(0.299, 0.587, 0.114));\n    float mask2 = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    \n    if (mask2 <= 0.0) {\n        return waterColor;\n    }\n\n    vec2 p = distortedUv * scale;\n    float t = time * autoSpeed;\n\n    float n = 0.0;\n    vec2 q = p;\n    \n    mat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\n    float amp = 1.0;\n    float sumAmp = 0.0;\n\n    for(int i = 0; i < 4; i++) {\n        vec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\n        float noiseVal = node_noise(q + tOffset + lum * 1.5);\n        float angle = noiseVal * 6.2831;\n        \n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        q = rot * q * 1.3; \n        \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    \n    n /= sumAmp;\n\n    float branch = smoothstep(0.3, 0.7, n);\n    float topo = sin((lum * 2.0 + n) * lineDensity - t * 4.0);\n    float lines = smoothstep(0.8, 0.95, topo);\n\n    vec3 effectCol = mix(blobColor, branchColor, branch);\n    effectCol += vec3(1.0) * lines;\n    \n    vec3 finalColor = mix(waterColor.rgb, effectCol, mask2 * 0.5);\n    return vec4(finalColor, waterColor.a);\n}",
    "uniformValues": {
      "intensity": 0.012,
      "waveSpeed": 3.15,
      "chromatic": 0.0465,
      "autoSpeed": 1.202,
      "scale": 2.9,
      "threshold": 0.11,
      "lineDensity": 27.5,
      "blobColor": [
        0.027450980392156862,
        0.3176470588235294,
        0.6901960784313725
      ],
      "branchColor": [
        0.4,
        0.9411764705882353,
        0.9058823529411765
      ]
    }
  },
  {
    "id": "recovered_timeline_902506bd_be78_4068_9b44_bf3c0e976abb",
    "name": "Dark Metallic Waves",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-902506bd-be78-4068-9b44-bf3c0e976abb in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Dark Metallic Waves\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float depth; // @min -5.0 @max 5.0 @default 1.5\nuniform float movement_form; // @min 0.0 @max 5.0 @default 1.5\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float roughness; // @min 0.01 @max 0.5 @default 0.1\nuniform float ambient; // @min 0.0 @max 1.0 @default 0.15\n\nfloat getLum(sampler2D tex, vec2 uv) {\n    return dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n}\n\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\n    float lum = getLum(tex, uv);\n    vec2 q = uv * s;\n    float t = time * spd;\n    float n = 0.0, amp = 1.0, sumAmp = 0.0;\n    mat2 rot = mat2(0.737, -0.675, 0.675, 0.737);\n\n    for(int i = 0; i < 3; i++) {\n        vec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\n        float noiseVal = node_noise(q + tOffset + lum * movement_form);\n        float angle = noiseVal * 6.2831;\n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        q = rot * q * 1.3; \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    return n / sumAmp;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    \n    // Darken the original image significantly\n    vec3 darkSource = source.rgb * 0.15;\n    \n    if (mask <= 0.0) {\n        return vec4(darkSource, source.a);\n    }\n\n    float eps = 0.005;\n    float h0 = getHeight(tex, uv, time, scale, speed);\n    float hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\n    float hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\n    \n    vec3 normal = normalize(vec3((h0 - hx) * depth * 100.0, (h0 - hy) * depth * 100.0, 1.0));\n    vec3 surfacePos = vec3(uv, h0 * depth * 0.05);\n    \n    vec3 totalDiffuse = vec3(ambient);\n    vec3 totalSpecular = vec3(0.0);\n    \n    // Make it much more glossy by reducing roughness impact\n    float specPower = 1.0 / max(roughness * 0.05, 0.001);\n    \n    for(int i = 0; i < 20; i++) {\n        float fi = float(i);\n        \n        float r1 = fract(sin(fi * 12.9898) * 43758.5453);\n        float r2 = fract(sin(fi * 78.233) * 43758.5453);\n        float r3 = fract(sin(fi * 39.346) * 43758.5453);\n        \n        vec3 lPos = vec3(\n            0.5 + 0.9 * sin(time * (0.2 + r1 * 0.8) + r2 * 6.28),\n            0.5 + 0.9 * cos(time * (0.2 + r2 * 0.8) + r3 * 6.28),\n            0.1 + 0.4 * r3\n        );\n        \n        vec3 lCol = vec3(\n            0.5 + 0.5 * sin(fi * 0.61),\n            0.5 + 0.5 * sin(fi * 0.73 + 2.0),\n            0.5 + 0.5 * sin(fi * 0.89 + 4.0)\n        );\n        \n        vec3 lDir = lPos - surfacePos;\n        float dist = length(lDir);\n        lDir = normalize(lDir);\n        \n        float diff = max(dot(normal, lDir), 0.0);\n        float atten = 0.15 / (1.0 + dist * dist * 8.0);\n        \n        vec3 halfVector = normalize(lDir + vec3(0.0, 0.0, 1.0));\n        float spec = pow(max(dot(normal, halfVector), 0.0), specPower);\n        \n        totalDiffuse += diff * lCol * atten;\n        \n        // 10x more metallic/specular, tinting with base color for metallic feel\n        vec3 metallicTint = mix(vec3(1.0), source.rgb, 0.5);\n        totalSpecular += spec * lCol * atten * 10.0 * metallicTint;\n    }\n    \n    vec3 finalColor = mix(darkSource, darkSource * totalDiffuse + totalSpecular, mask);\n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "speed": 1.55,
      "scale": 2.36,
      "depth": 0.1,
      "movement_form": 1.65,
      "threshold": 0.18,
      "roughness": 0.5,
      "ambient": 0.08
    }
  },
  {
    "id": "recovered_timeline_582581f5_f5dc_427d_9111_6341e51a73fe",
    "name": "Neon Liquid Metal",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-582581f5-f5dc-427d-9111-6341e51a73fe in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Neon Liquid Metal\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 8.0\nuniform float depth; // @min 0.1 @max 5.0 @default 2.0\nuniform float roughness; // @min 0.01 @max 0.5 @default 0.05\nuniform vec3 tintColor; // @default 1.0,1.0,1.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\n\n// Cosine based palette for vibrant, harmonious neon colors\nvec3 palette(float t) {\n    vec3 a = vec3(0.5, 0.5, 0.5);\n    vec3 b = vec3(0.5, 0.5, 0.5);\n    vec3 c = vec3(1.0, 1.0, 1.0);\n    vec3 d = vec3(0.263, 0.416, 0.557);\n    return a + b * cos(6.28318 * (c * t + d));\n}\n\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\n    float lum = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n    vec2 q = uv * s;\n    float t = time * spd;\n    float n = 0.0, amp = 1.0, sum = 0.0;\n    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);\n    \n    for(int i = 0; i < 4; i++) {\n        q += vec2(sin(t + q.y), cos(t + q.x)) * 0.5;\n        float noise = node_noise(q + lum * 2.0);\n        n += noise * amp;\n        sum += amp;\n        amp *= 0.5;\n        q = rot * q * 1.5;\n    }\n    return n / sum;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Threshold to hide black background\n    float sourceLum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    if (sourceLum < threshold) {\n        return vec4(0.0);\n    }\n    \n    float eps = 0.005;\n    float h0 = getHeight(tex, uv, time, scale, speed);\n    float hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\n    float hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\n    \n    // Calculate sharp, fluid normals\n    vec3 normal = normalize(vec3((h0 - hx) * depth * 50.0, (h0 - hy) * depth * 50.0, 1.0));\n    vec3 surfacePos = vec3(uv, h0 * depth * 0.1);\n    \n    vec3 colorAcc = vec3(0.0);\n    float specPower = 1.0 / max(roughness, 0.001);\n    \n    // 12 highly optimized neon lights\n    for(int i = 0; i < 12; i++) {\n        float fi = float(i);\n        \n        // Slower orbital movement\n        vec3 lPos = vec3(\n            0.5 + 0.8 * sin(time * 2.0 + fi * 2.14),\n            0.5 + 0.8 * cos(time * 2.3 + fi * 3.72),\n            0.1 + 0.3 * sin(time * 1.5 + fi)\n        );\n        \n        // Shifting vibrant colors tinted by the new color slider\n        vec3 lCol = palette(fi * 0.15 + time * 0.5) * tintColor;\n        \n        vec3 lDir = lPos - surfacePos;\n        float dist = length(lDir);\n        lDir = normalize(lDir);\n        \n        float diff = max(dot(normal, lDir), 0.0);\n        float atten = 1.0 / (1.0 + dist * dist * 20.0);\n        \n        vec3 halfVector = normalize(lDir + vec3(0.0, 0.0, 1.0));\n        float spec = pow(max(dot(normal, halfVector), 0.0), specPower);\n        \n        // Combine soft diffuse with intense, piercing specular highlights\n        colorAcc += (diff * 0.4 + spec * 8.0) * lCol * atten;\n    }\n    \n    // Deep metallic base tinted slightly by the original image\n    vec3 baseColor = source.rgb * 0.05;\n    vec3 metallicTint = mix(vec3(1.0), source.rgb, 0.4);\n    \n    vec3 finalColor = baseColor + colorAcc * metallicTint;\n    \n    // Subtle bloom/glow mapping\n    finalColor += colorAcc * 0.2;\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "speed": 3.04,
      "scale": 3.26,
      "depth": 3.3,
      "roughness": 0.1472,
      "tintColor": [
        0.396078431372549,
        0.2823529411764706,
        0.2823529411764706
      ],
      "threshold": 0.08
    }
  },
  {
    "id": "recovered_timeline_5fa1a59c_2e0a_4669_bdf7_298ec79365ad",
    "name": "Neon Liquid Metal 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-5fa1a59c-2e0a-4669-bdf7-298ec79365ad in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Neon Liquid Metal\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 8.0\nuniform float depth; // @min 0.1 @max 5.0 @default 2.0\nuniform float roughness; // @min 0.01 @max 0.5 @default 0.05\nuniform vec3 tintColor; // @default 1.0,1.0,1.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\n\n// Cosine based palette for vibrant, harmonious neon colors\nvec3 palette(float t) {\n    vec3 a = vec3(0.5, 0.5, 0.5);\n    vec3 b = vec3(0.5, 0.5, 0.5);\n    vec3 c = vec3(1.0, 1.0, 1.0);\n    vec3 d = vec3(0.263, 0.416, 0.557);\n    return a + b * cos(6.28318 * (c * t + d));\n}\n\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\n    float lum = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n    vec2 q = uv * s;\n    float t = time * spd;\n    float n = 0.0, amp = 1.0, sum = 0.0;\n    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);\n    \n    for(int i = 0; i < 4; i++) {\n        q += vec2(sin(t + q.y), cos(t + q.x)) * 0.5;\n        float noise = node_noise(q + lum * 2.0);\n        n += noise * amp;\n        sum += amp;\n        amp *= 0.5;\n        q = rot * q * 1.5;\n    }\n    return n / sum;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Threshold to hide black background\n    float sourceLum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    if (sourceLum < threshold) {\n        return vec4(0.0);\n    }\n    \n    float eps = 0.005;\n    float h0 = getHeight(tex, uv, time, scale, speed);\n    float hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\n    float hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\n    \n    // Calculate sharp, fluid normals\n    vec3 normal = normalize(vec3((h0 - hx) * depth * 50.0, (h0 - hy) * depth * 50.0, 1.0));\n    vec3 surfacePos = vec3(uv, h0 * depth * 0.1);\n    \n    vec3 colorAcc = vec3(0.0);\n    float specPower = 1.0 / max(roughness, 0.001);\n    \n    // 12 highly optimized neon lights\n    for(int i = 0; i < 12; i++) {\n        float fi = float(i);\n        \n        // Slower orbital movement\n        vec3 lPos = vec3(\n            0.5 + 0.8 * sin(time * 2.0 + fi * 2.14),\n            0.5 + 0.8 * cos(time * 2.3 + fi * 3.72),\n            0.1 + 0.3 * sin(time * 1.5 + fi)\n        );\n        \n        // Shifting vibrant colors tinted by the new color slider\n        vec3 lCol = palette(fi * 0.15 + time * 0.5) * tintColor;\n        \n        vec3 lDir = lPos - surfacePos;\n        float dist = length(lDir);\n        lDir = normalize(lDir);\n        \n        float diff = max(dot(normal, lDir), 0.0);\n        float atten = 1.0 / (1.0 + dist * dist * 20.0);\n        \n        vec3 halfVector = normalize(lDir + vec3(0.0, 0.0, 1.0));\n        float spec = pow(max(dot(normal, halfVector), 0.0), specPower);\n        \n        // Combine soft diffuse with intense, piercing specular highlights\n        colorAcc += (diff * 0.4 + spec * 8.0) * lCol * atten;\n    }\n    \n    // Deep metallic base tinted slightly by the original image\n    vec3 baseColor = source.rgb * 0.05;\n    vec3 metallicTint = mix(vec3(1.0), source.rgb, 0.4);\n    \n    vec3 finalColor = baseColor + colorAcc * metallicTint;\n    \n    // Subtle bloom/glow mapping\n    finalColor += colorAcc * 0.2;\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "speed": 3.628,
      "scale": 3.26,
      "depth": 3.3,
      "roughness": 0.1472,
      "tintColor": [
        0.396078431372549,
        0.2823529411764706,
        0.2823529411764706
      ],
      "threshold": 0.08
    }
  },
  {
    "id": "recovered_timeline_784e3954_79aa_499f_b582_57387e44592d",
    "name": "Violent Shaken Mercury",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-784e3954-79aa-499f-b582-57387e44592d in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Violent Shaken Mercury\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 8.0\nuniform float depth; // @min 0.1 @max 5.0 @default 2.0\nuniform float roughness; // @min 0.01 @max 0.5 @default 0.05\nuniform vec3 tintColor; // @default 1.0,1.0,1.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float violence; // @min 0.1 @max 5.0 @default 2.0\n\n// Cosine based palette for vibrant, harmonious neon colors\nvec3 palette(float t) {\n    vec3 a = vec3(0.5, 0.5, 0.5);\n    vec3 b = vec3(0.5, 0.5, 0.5);\n    vec3 c = vec3(1.0, 1.0, 1.0);\n    vec3 d = vec3(0.263, 0.416, 0.557);\n    return a + b * cos(6.28318 * (c * t + d));\n}\n\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\n    float lum = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n    vec2 q = uv * s;\n    float t = time * spd;\n    float n = 0.0, amp = 1.0, sum = 0.0;\n    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);\n    \n    for(int i = 0; i < 4; i++) {\n        q += vec2(sin(t + q.y), cos(t + q.x)) * (0.5 * violence);\n        float noise = node_noise(q + lum * 2.0);\n        n += noise * amp;\n        sum += amp;\n        amp *= 0.5;\n        q = rot * q * (1.5 + violence * 0.05);\n    }\n    return n / sum;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Threshold to hide black background\n    float sourceLum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    if (sourceLum < threshold) {\n        return vec4(0.0);\n    }\n    \n    float eps = 0.005;\n    float h0 = getHeight(tex, uv, time, scale, speed);\n    float hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\n    float hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\n    \n    // Calculate sharp, fluid normals\n    vec3 normal = normalize(vec3((h0 - hx) * depth * 50.0, (h0 - hy) * depth * 50.0, 1.0));\n    vec3 surfacePos = vec3(uv, h0 * depth * 0.1);\n    \n    vec3 colorAcc = vec3(0.0);\n    float specPower = 1.0 / max(roughness, 0.001);\n    \n    // 12 highly optimized neon lights\n    for(int i = 0; i < 12; i++) {\n        float fi = float(i);\n        \n        // Slower orbital movement\n        vec3 lPos = vec3(\n            0.5 + 0.8 * sin(time * 2.0 + fi * 2.14),\n            0.5 + 0.8 * cos(time * 2.3 + fi * 3.72),\n            0.1 + 0.3 * sin(time * 1.5 + fi)\n        );\n        \n        // Distort light position by the surface normal to make it follow the liquid curves\n        lPos.xy -= normal.xy * 0.25;\n        \n        // Shifting vibrant colors tinted by the new color slider\n        vec3 lCol = palette(fi * 0.15 + time * 0.5) * tintColor;\n        \n        vec3 lDir = lPos - surfacePos;\n        float dist = length(lDir);\n        lDir = normalize(lDir);\n        \n        float diff = max(dot(normal, lDir), 0.0);\n        float atten = 1.0 / (1.0 + dist * dist * 20.0);\n        \n        vec3 halfVector = normalize(lDir + vec3(0.0, 0.0, 1.0));\n        float spec = pow(max(dot(normal, halfVector), 0.0), specPower);\n        \n        // Combine soft diffuse with intense, piercing specular highlights\n        colorAcc += (diff * 0.4 + spec * 8.0) * lCol * atten;\n    }\n    \n    // Deep metallic base tinted slightly by the original image\n    vec3 baseColor = source.rgb * 0.05;\n    vec3 metallicTint = mix(vec3(1.0), source.rgb, 0.4);\n    \n    vec3 finalColor = baseColor + colorAcc * metallicTint;\n    \n    // Subtle bloom/glow mapping\n    finalColor += colorAcc * 0.2;\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "speed": 0.296,
      "scale": 2,
      "depth": 2.991,
      "roughness": 0.05,
      "tintColor": [
        0.396078431372549,
        0.2823529411764706,
        0.2823529411764706
      ],
      "threshold": 0.09,
      "violence": 0.1
    }
  },
  {
    "id": "recovered_timeline_a8c4c6c7_e951_4da2_b718_78f871a40dc5",
    "name": "Shaken Mercury",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-a8c4c6c7-e951-4da2-b718-78f871a40dc5 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Shaken Mercury\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 8.0\nuniform float depth; // @min 0.1 @max 5.0 @default 2.0\nuniform float roughness; // @min 0.01 @max 0.5 @default 0.05\nuniform vec3 tintColor; // @default 1.0,1.0,1.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\n\n// Cosine based palette for vibrant, harmonious neon colors\nvec3 palette(float t) {\n    vec3 a = vec3(0.5, 0.5, 0.5);\n    vec3 b = vec3(0.5, 0.5, 0.5);\n    vec3 c = vec3(1.0, 1.0, 1.0);\n    vec3 d = vec3(0.263, 0.416, 0.557);\n    return a + b * cos(6.28318 * (c * t + d));\n}\n\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\n    float lum = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n    vec2 q = uv * s;\n    float t = time * spd;\n    float n = 0.0, amp = 1.0, sum = 0.0;\n    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);\n    \n    for(int i = 0; i < 4; i++) {\n        q += vec2(sin(t + q.y), cos(t + q.x)) * 0.5;\n        float noise = node_noise(q + lum * 2.0);\n        n += noise * amp;\n        sum += amp;\n        amp *= 0.5;\n        q = rot * q * 1.5;\n    }\n    return n / sum;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Threshold to hide black background\n    float sourceLum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    if (sourceLum < threshold) {\n        return vec4(0.0);\n    }\n    \n    float eps = 0.005;\n    float h0 = getHeight(tex, uv, time, scale, speed);\n    float hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\n    float hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\n    \n    // Calculate sharp, fluid normals\n    vec3 normal = normalize(vec3((h0 - hx) * depth * 50.0, (h0 - hy) * depth * 50.0, 1.0));\n    vec3 surfacePos = vec3(uv, h0 * depth * 0.1);\n    \n    vec3 colorAcc = vec3(0.0);\n    float specPower = 1.0 / max(roughness, 0.001);\n    \n    // 12 highly optimized neon lights\n    for(int i = 0; i < 12; i++) {\n        float fi = float(i);\n        \n        // Slower orbital movement\n        vec3 lPos = vec3(\n            0.5 + 0.8 * sin(time * 2.0 + fi * 2.14),\n            0.5 + 0.8 * cos(time * 2.3 + fi * 3.72),\n            0.1 + 0.3 * sin(time * 1.5 + fi)\n        );\n        \n        // Distort light position by the surface normal to make it follow the liquid curves\n        lPos.xy -= normal.xy * 0.25;\n        \n        // Shifting vibrant colors tinted by the new color slider\n        vec3 lCol = palette(fi * 0.15 + time * 0.5) * tintColor;\n        \n        vec3 lDir = lPos - surfacePos;\n        float dist = length(lDir);\n        lDir = normalize(lDir);\n        \n        float diff = max(dot(normal, lDir), 0.0);\n        float atten = 1.0 / (1.0 + dist * dist * 20.0);\n        \n        vec3 halfVector = normalize(lDir + vec3(0.0, 0.0, 1.0));\n        float spec = pow(max(dot(normal, halfVector), 0.0), specPower);\n        \n        // Combine soft diffuse with intense, piercing specular highlights\n        colorAcc += (diff * 0.4 + spec * 8.0) * lCol * atten;\n    }\n    \n    // Deep metallic base tinted slightly by the original image\n    vec3 baseColor = source.rgb * 0.05;\n    vec3 metallicTint = mix(vec3(1.0), source.rgb, 0.4);\n    \n    vec3 finalColor = baseColor + colorAcc * metallicTint;\n    \n    // Subtle bloom/glow mapping\n    finalColor += colorAcc * 0.2;\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "speed": 3.04,
      "scale": 3.26,
      "depth": 3.3,
      "roughness": 0.0639,
      "tintColor": [
        0.3568627450980392,
        0.3411764705882353,
        0.1607843137254902
      ],
      "threshold": 0.08
    }
  },
  {
    "id": "recovered_timeline_c38dab8a_46cd_4a4a_ae65_f24adf97c99c",
    "name": "Violent Shaken Mercury 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-c38dab8a-46cd-4a4a-ae65-f24adf97c99c in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Violent Shaken Mercury\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 8.0\nuniform float depth; // @min 0.1 @max 5.0 @default 2.0\nuniform float roughness; // @min 0.01 @max 0.5 @default 0.05\nuniform vec3 tintColor; // @default 1.0,1.0,1.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float violence; // @min 0.1 @max 5.0 @default 2.0\n\n// Cosine based palette for vibrant, harmonious neon colors\nvec3 palette(float t) {\n    vec3 a = vec3(0.5, 0.5, 0.5);\n    vec3 b = vec3(0.5, 0.5, 0.5);\n    vec3 c = vec3(1.0, 1.0, 1.0);\n    vec3 d = vec3(0.263, 0.416, 0.557);\n    return a + b * cos(6.28318 * (c * t + d));\n}\n\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\n    float lum = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n    vec2 q = uv * s;\n    float t = time * spd;\n    float n = 0.0, amp = 1.0, sum = 0.0;\n    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);\n    \n    for(int i = 0; i < 4; i++) {\n        q += vec2(sin(t + q.y), cos(t + q.x)) * (0.5 * violence);\n        float noise = node_noise(q + lum * 2.0);\n        n += noise * amp;\n        sum += amp;\n        amp *= 0.5;\n        q = rot * q * (1.5 + violence * 0.05);\n    }\n    return n / sum;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Threshold to hide black background\n    float sourceLum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    if (sourceLum < threshold) {\n        return vec4(0.0);\n    }\n    \n    float eps = 0.005;\n    float h0 = getHeight(tex, uv, time, scale, speed);\n    float hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\n    float hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\n    \n    // Calculate sharp, fluid normals\n    vec3 normal = normalize(vec3((h0 - hx) * depth * 50.0, (h0 - hy) * depth * 50.0, 1.0));\n    vec3 surfacePos = vec3(uv, h0 * depth * 0.1);\n    \n    vec3 colorAcc = vec3(0.0);\n    float specPower = 1.0 / max(roughness, 0.001);\n    \n    // 12 highly optimized neon lights\n    for(int i = 0; i < 12; i++) {\n        float fi = float(i);\n        \n        // Slower orbital movement\n        vec3 lPos = vec3(\n            0.5 + 0.8 * sin(time * 2.0 + fi * 2.14),\n            0.5 + 0.8 * cos(time * 2.3 + fi * 3.72),\n            0.1 + 0.3 * sin(time * 1.5 + fi)\n        );\n        \n        // Distort light position by the surface normal to make it follow the liquid curves\n        lPos.xy -= normal.xy * 0.25;\n        \n        // Shifting vibrant colors tinted by the new color slider\n        vec3 lCol = palette(fi * 0.15 + time * 0.5) * tintColor;\n        \n        vec3 lDir = lPos - surfacePos;\n        float dist = length(lDir);\n        lDir = normalize(lDir);\n        \n        float diff = max(dot(normal, lDir), 0.0);\n        float atten = 1.0 / (1.0 + dist * dist * 20.0);\n        \n        vec3 halfVector = normalize(lDir + vec3(0.0, 0.0, 1.0));\n        float spec = pow(max(dot(normal, halfVector), 0.0), specPower);\n        \n        // Combine soft diffuse with intense, piercing specular highlights\n        colorAcc += (diff * 0.4 + spec * 8.0) * lCol * atten;\n    }\n    \n    // Deep metallic base tinted slightly by the original image\n    vec3 baseColor = source.rgb * 0.05;\n    vec3 metallicTint = mix(vec3(1.0), source.rgb, 0.4);\n    \n    vec3 finalColor = baseColor + colorAcc * metallicTint;\n    \n    // Subtle bloom/glow mapping\n    finalColor += colorAcc * 0.2;\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "speed": 4.902,
      "scale": 2,
      "depth": 2.991,
      "roughness": 0.451,
      "tintColor": [
        0.396078431372549,
        0.2823529411764706,
        0.2823529411764706
      ],
      "threshold": 0.09,
      "violence": 0.345
    }
  },
  {
    "id": "recovered_timeline_ae26c48a_100e_4de3_80d7_5fda335ee997",
    "name": "Violent Luma Automata",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-ae26c48a-100e-4de3-80d7-5fda335ee997 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Violent Luma Automata\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 8.0\nuniform float depth; // @min 0.1 @max 5.0 @default 2.0\nuniform float roughness; // @min 0.01 @max 0.5 @default 0.05\nuniform vec3 tintColor; // @default 1.0,1.0,1.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float violence; // @min 0.1 @max 5.0 @default 2.0\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\n\nvec3 palette(float t) {\n    vec3 a = vec3(0.5, 0.5, 0.5);\n    vec3 b = vec3(0.5, 0.5, 0.5);\n    vec3 c = vec3(1.0, 1.0, 1.0);\n    vec3 d = vec3(0.263, 0.416, 0.557);\n    return a + b * cos(6.28318 * (c * t + d));\n}\n\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\n    float lum = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n    vec2 q = uv * s;\n    float t = time * spd;\n    float n = 0.0, amp = 1.0, sum = 0.0;\n    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);\n    \n    for(int i = 0; i < 4; i++) {\n        q += vec2(sin(t + q.y), cos(t + q.x)) * (0.5 * violence);\n        float noise = node_noise(q + lum * 2.0);\n        n += noise * amp;\n        sum += amp;\n        amp *= 0.5;\n        q = rot * q * (1.5 + violence * 0.05);\n    }\n    return n / sum;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    if (lum < threshold) {\n        return vec4(0.0);\n    }\n    \n    // --- Mercury Base ---\n    float eps = 0.005;\n    float h0 = getHeight(tex, uv, time, scale, speed);\n    float hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\n    float hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\n    \n    vec3 normal = normalize(vec3((h0 - hx) * depth * 50.0, (h0 - hy) * depth * 50.0, 1.0));\n    vec3 surfacePos = vec3(uv, h0 * depth * 0.1);\n    \n    vec3 colorAcc = vec3(0.0);\n    float specPower = 1.0 / max(roughness, 0.001);\n    \n    for(int i = 0; i < 8; i++) {\n        float fi = float(i);\n        vec3 lPos = vec3(\n            0.5 + 0.8 * sin(time * 2.0 + fi * 2.14),\n            0.5 + 0.8 * cos(time * 2.3 + fi * 3.72),\n            0.1 + 0.3 * sin(time * 1.5 + fi)\n        );\n        lPos.xy -= normal.xy * 0.25;\n        vec3 lCol = palette(fi * 0.15 + time * 0.5) * tintColor;\n        vec3 lDir = lPos - surfacePos;\n        float dist = length(lDir);\n        lDir = normalize(lDir);\n        float diff = max(dot(normal, lDir), 0.0);\n        float atten = 1.0 / (1.0 + dist * dist * 20.0);\n        vec3 halfVector = normalize(lDir + vec3(0.0, 0.0, 1.0));\n        float spec = pow(max(dot(normal, halfVector), 0.0), specPower);\n        colorAcc += (diff * 0.4 + spec * 8.0) * lCol * atten;\n    }\n    \n    vec3 baseColor = source.rgb * 0.05;\n    vec3 metallicTint = mix(vec3(1.0), source.rgb, 0.4);\n    vec3 mercuryCol = baseColor + colorAcc * metallicTint;\n    mercuryCol += colorAcc * 0.2;\n    \n    // --- Automata Overlay ---\n    vec2 p = uv * scale;\n    float t = time * speed;\n    float n = 0.0;\n    vec2 q = p;\n    mat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\n    float amp = 1.0;\n    float sumAmp = 0.0;\n\n    for(int i = 0; i < 4; i++) {\n        vec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\n        float noiseVal = node_noise(q + tOffset + lum * 1.5);\n        float angle = noiseVal * 6.2831;\n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        q = rot * q * 1.3; \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    n /= sumAmp;\n\n    float branch = smoothstep(0.3, 0.7, n);\n    float topo = sin((lum * 2.0 + n) * lineDensity - t * 4.0);\n    float lines = smoothstep(0.8, 0.95, topo);\n\n    vec3 automataCol = mix(blobColor, branchColor, branch);\n    \n    vec3 finalCol = mix(mercuryCol, automataCol, lines * lum);\n    return vec4(finalCol, source.a);\n}",
    "uniformValues": {
      "speed": 0.296,
      "scale": 3.08,
      "depth": 2.991,
      "roughness": 0.2354,
      "tintColor": [
        0.396078431372549,
        0.3843137254901961,
        0.3803921568627451
      ],
      "threshold": 0.11,
      "violence": 0.394,
      "lineDensity": 11.3,
      "blobColor": [
        0.2980392156862745,
        0.20392156862745098,
        0.20392156862745098
      ],
      "branchColor": [
        0.9098039215686274,
        0.8901960784313725,
        0.9058823529411765
      ]
    }
  },
  {
    "id": "recovered_timeline_1584ecb1_c347_4ba0_bfee_b5be88e326c7",
    "name": "Violent Shaken Mercury 3",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-1584ecb1-c347-4ba0-bfee-b5be88e326c7 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Violent Shaken Mercury\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 8.0\nuniform float depth; // @min 0.1 @max 5.0 @default 2.0\nuniform float roughness; // @min 0.01 @max 0.5 @default 0.05\nuniform vec3 tintColor; // @default 1.0,1.0,1.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float violence; // @min 0.1 @max 5.0 @default 2.0\n\n// Cosine based palette for vibrant, harmonious neon colors\nvec3 palette(float t) {\n    vec3 a = vec3(0.5, 0.5, 0.5);\n    vec3 b = vec3(0.5, 0.5, 0.5);\n    vec3 c = vec3(1.0, 1.0, 1.0);\n    vec3 d = vec3(0.263, 0.416, 0.557);\n    return a + b * cos(6.28318 * (c * t + d));\n}\n\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\n    float lum = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n    vec2 q = uv * s;\n    float t = time * spd;\n    float n = 0.0, amp = 1.0, sum = 0.0;\n    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);\n    \n    for(int i = 0; i < 4; i++) {\n        q += vec2(sin(t + q.y), cos(t + q.x)) * (0.5 * violence);\n        float noise = node_noise(q + lum * 2.0);\n        n += noise * amp;\n        sum += amp;\n        amp *= 0.5;\n        q = rot * q * (1.5 + violence * 0.05);\n    }\n    return n / sum;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Threshold to hide black background\n    float sourceLum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    if (sourceLum < threshold) {\n        return vec4(0.0);\n    }\n    \n    float eps = 0.005;\n    float h0 = getHeight(tex, uv, time, scale, speed);\n    float hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\n    float hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\n    \n    // Calculate sharp, fluid normals\n    vec3 normal = normalize(vec3((h0 - hx) * depth * 50.0, (h0 - hy) * depth * 50.0, 1.0));\n    vec3 surfacePos = vec3(uv, h0 * depth * 0.1);\n    \n    vec3 colorAcc = vec3(0.0);\n    float specPower = 1.0 / max(roughness, 0.001);\n    \n    // 12 highly optimized neon lights\n    for(int i = 0; i < 12; i++) {\n        float fi = float(i);\n        \n        // Slower orbital movement\n        vec3 lPos = vec3(\n            0.5 + 0.8 * sin(time * 2.0 + fi * 2.14),\n            0.5 + 0.8 * cos(time * 2.3 + fi * 3.72),\n            0.1 + 0.3 * sin(time * 1.5 + fi)\n        );\n        \n        // Distort light position by the surface normal to make it follow the liquid curves\n        lPos.xy -= normal.xy * 0.25;\n        \n        // Shifting vibrant colors tinted by the new color slider\n        vec3 lCol = palette(fi * 0.15 + time * 0.5) * tintColor;\n        \n        vec3 lDir = lPos - surfacePos;\n        float dist = length(lDir);\n        lDir = normalize(lDir);\n        \n        float diff = max(dot(normal, lDir), 0.0);\n        float atten = 1.0 / (1.0 + dist * dist * 20.0);\n        \n        vec3 halfVector = normalize(lDir + vec3(0.0, 0.0, 1.0));\n        float spec = pow(max(dot(normal, halfVector), 0.0), specPower);\n        \n        // Combine soft diffuse with intense, piercing specular highlights\n        colorAcc += (diff * 0.4 + spec * 8.0) * lCol * atten;\n    }\n    \n    // Deep metallic base tinted slightly by the original image\n    vec3 baseColor = source.rgb * 0.05;\n    vec3 metallicTint = mix(vec3(1.0), source.rgb, 0.4);\n    \n    vec3 finalColor = baseColor + colorAcc * metallicTint;\n    \n    // Subtle bloom/glow mapping\n    finalColor += colorAcc * 0.2;\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "speed": 2.697,
      "scale": 2.72,
      "depth": 2.648,
      "roughness": 0.1619,
      "tintColor": [
        0.2196078431372549,
        0.2196078431372549,
        0.2196078431372549
      ],
      "threshold": 0.1,
      "violence": 2.207
    }
  },
  {
    "id": "recovered_timeline_8b2d0a70_0eeb_4d40_a136_80262726d646",
    "name": "Violent Shaken Mercury 4",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-8b2d0a70-0eeb-4d40-a136-80262726d646 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Violent Shaken Mercury\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 8.0\nuniform float depth; // @min 0.1 @max 5.0 @default 2.0\nuniform float roughness; // @min 0.01 @max 0.5 @default 0.05\nuniform vec3 tintColor; // @default 1.0,1.0,1.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float violence; // @min 0.1 @max 5.0 @default 2.0\n\n// Cosine based palette for vibrant, harmonious neon colors\nvec3 palette(float t) {\n    vec3 a = vec3(0.5, 0.5, 0.5);\n    vec3 b = vec3(0.5, 0.5, 0.5);\n    vec3 c = vec3(1.0, 1.0, 1.0);\n    vec3 d = vec3(0.263, 0.416, 0.557);\n    return a + b * cos(6.28318 * (c * t + d));\n}\n\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\n    float lum = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n    vec2 q = uv * s;\n    float t = time * spd;\n    float n = 0.0, amp = 1.0, sum = 0.0;\n    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);\n    \n    for(int i = 0; i < 4; i++) {\n        q += vec2(sin(t + q.y), cos(t + q.x)) * (0.5 * violence);\n        float noise = node_noise(q + lum * 2.0);\n        n += noise * amp;\n        sum += amp;\n        amp *= 0.5;\n        q = rot * q * (1.5 + violence * 0.05);\n    }\n    return n / sum;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Threshold to hide black background\n    float sourceLum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    if (sourceLum < threshold) {\n        return vec4(0.0);\n    }\n    \n    float eps = 0.005;\n    float h0 = getHeight(tex, uv, time, scale, speed);\n    float hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\n    float hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\n    \n    // Calculate sharp, fluid normals\n    vec3 normal = normalize(vec3((h0 - hx) * depth * 50.0, (h0 - hy) * depth * 50.0, 1.0));\n    vec3 surfacePos = vec3(uv, h0 * depth * 0.1);\n    \n    vec3 colorAcc = vec3(0.0);\n    float specPower = 1.0 / max(roughness, 0.001);\n    \n    // 12 highly optimized neon lights\n    for(int i = 0; i < 12; i++) {\n        float fi = float(i);\n        \n        // Slower orbital movement\n        vec3 lPos = vec3(\n            0.5 + 0.8 * sin(time * 2.0 + fi * 2.14),\n            0.5 + 0.8 * cos(time * 2.3 + fi * 3.72),\n            0.1 + 0.3 * sin(time * 1.5 + fi)\n        );\n        \n        // Distort light position by the surface normal to make it follow the liquid curves\n        lPos.xy -= normal.xy * 0.25;\n        \n        // Shifting vibrant colors tinted by the new color slider\n        vec3 lCol = palette(fi * 0.15 + time * 0.5) * tintColor;\n        \n        vec3 lDir = lPos - surfacePos;\n        float dist = length(lDir);\n        lDir = normalize(lDir);\n        \n        float diff = max(dot(normal, lDir), 0.0);\n        float atten = 1.0 / (1.0 + dist * dist * 20.0);\n        \n        vec3 halfVector = normalize(lDir + vec3(0.0, 0.0, 1.0));\n        float spec = pow(max(dot(normal, halfVector), 0.0), specPower);\n        \n        // Combine soft diffuse with intense, piercing specular highlights\n        colorAcc += (diff * 0.4 + spec * 8.0) * lCol * atten;\n    }\n    \n    // Deep metallic base tinted slightly by the original image\n    vec3 baseColor = source.rgb * 0.05;\n    vec3 metallicTint = mix(vec3(1.0), source.rgb, 0.4);\n    \n    vec3 finalColor = baseColor + colorAcc * metallicTint;\n    \n    // Subtle bloom/glow mapping\n    finalColor += colorAcc * 0.2;\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "speed": 4.951,
      "scale": 2.36,
      "depth": 2.991,
      "roughness": 0.451,
      "tintColor": [
        0.28627450980392155,
        0.23921568627450981,
        0.23529411764705882
      ],
      "threshold": 0.09,
      "violence": 0.345
    }
  },
  {
    "id": "recovered_timeline_660c5838_9a06_4890_857a_eb53303e453f",
    "name": "Luma Noise Automata 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-660c5838-9a06-4890-857a-eb53303e453f in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Luma Noise Automata\nuniform float scale; // @min 1.0 @max 30.0 @default 6.0\nuniform float speed; // @min 0.0 @max 5.0 @default 0.5\nuniform float warp_amount; // @min 0.0 @max 5.0 @default 1.5\nuniform float edge_glow; // @min 0.0 @max 5.0 @default 2.0\nuniform float black_threshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 tentacle_color; // @default 0.1,0.8,0.6\nuniform vec3 glow_color; // @default 0.9,1.0,1.0\nuniform vec3 bg_color; // @default 0.05,0.05,0.1\nuniform float shading_strength; // @min 0.0 @max 3.0 @default 2.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 base = texture2D(tex, uv);\n    \n    // Extract luminance from the original image to preserve 3D volume\n    float lum = dot(base.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Threshold mask: only affect pixels that are not completely black\n    float mask = smoothstep(black_threshold * 0.5, black_threshold + 0.001, lum) * base.a;\n    \n    // Early exit for black pixels to save performance\n    if (mask <= 0.0) {\n        return base;\n    }\n    \n    vec2 p = uv * scale;\n    float t = time * speed;\n    \n    // Warp coordinates using trigonometry and luminance\n    p += warp_amount * vec2(sin(p.y + t + lum), cos(p.x + t - lum));\n    p += (warp_amount * 0.5) * vec2(sin(p.y * 2.0 - t), cos(p.x * 2.0 - t));\n    \n    // SINGLE big noise map evaluation\n    float f = node_noise(p);\n    \n    // Automata growing effect\n    float val = sin(f * 15.0 - t * 3.0) * 0.5 + 0.5;\n    \n    // Organic blobs (tentacle bodies)\n    float pattern = smoothstep(0.45, 0.55, val);\n    \n    // White splash / glow at the boundaries\n    float edge = smoothstep(0.35, 0.5, val) - smoothstep(0.5, 0.65, val);\n    \n    // Topographical contour lines that follow the image depth\n    float topo = sin((lum * 2.0 + f) * lineDensity - t * 4.0);\n    float lines = smoothstep(0.8, 0.95, topo);\n    \n    // Granular background texture\n    float grain = node_rand(uv * 1000.0);\n    vec3 granular_bg = bg_color * (0.6 + 0.5 * grain);\n    \n    // Mix colors\n    vec3 col = mix(granular_bg, tentacle_color, pattern);\n    col += glow_color * (edge * edge_glow);\n    \n    // Add glowing lines that pop more in the brighter areas\n    col += vec3(1.0) * lines * lum * 1.5;\n    \n    // Apply shading based on original luminance\n    vec3 shaded_col = col * (lum * shading_strength + 0.1);\n    \n    return vec4(mix(base.rgb, shaded_col, mask), base.a);\n}",
    "uniformValues": {
      "scale": 1,
      "speed": 0.7,
      "warp_amount": 2.25,
      "edge_glow": 3.65,
      "black_threshold": 0.26,
      "lineDensity": 11.3,
      "tentacle_color": [
        0.2823529411764706,
        0.058823529411764705,
        0.058823529411764705
      ],
      "glow_color": [
        0.5607843137254902,
        0.2235294117647059,
        0.0392156862745098
      ],
      "bg_color": [
        0.9137254901960784,
        0.9294117647058824,
        0.9294117647058824
      ],
      "shading_strength": 2.4
    }
  },
  {
    "id": "recovered_timeline_9e308c31_b4e9_44c2_9a3d_13d727bfea23",
    "name": "3D Surface Morph Spirals 10",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-9e308c31-b4e9-44c2-9a3d-13d727bfea23 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Surface Morph Spirals\nuniform float twists; // @min 1.0 @max 50.0 @default 15.0\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float arms; // @min 1.0 @max 10.0 @default 4.0\nuniform float posX; // @min -0.5 @max 0.5 @default 0.0\nuniform float posY; // @min -0.5 @max 0.5 @default 0.0\nuniform float spiralDist; // @min 0.0 @max 1.0 @default 0.25\nuniform float colorShift; // @min 0.0 @max 6.28 @default 0.0\nuniform float colorFreq; // @min 0.1 @max 10.0 @default 3.0\nuniform vec3 spiralColor; // @default 1.0,1.0,1.0\nuniform float morphDepth; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.0 @max 1.73 @default 0.05\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Check if the pixel is above the black threshold\n    if (length(source.rgb) > blackThreshold) {\n        \n        // Extract luminance to act as the 3D surface height of the image\n        float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n        \n        // Create a continuous mirrored space for exactly 2 spirals, using a smoothed absolute value to hide the seam\n        float dx = uv.x - 0.5 - posX;\n        float mirrorX = sqrt(dx * dx + 0.02) - spiralDist;\n        vec2 delta = vec2(mirrorX, uv.y - 0.5 - posY);\n        \n        float r = length(delta);\n        float a = atan(delta.y, delta.x);\n        \n        // Create a 3D tunnel/depth effect, morphing symmetrically along the image's 3D surface\n        float z = 0.2 / (r + 0.02) + lum * morphDepth;\n        \n        // Generate 3D spiral pattern\n        float spiral = sin(a * arms + z * twists - time * speed);\n        \n        // Super colorful psytrance palette using phase-shifted cosines, colorFreq, and colorShift\n        vec3 psyColor = 0.5 + 0.5 * cos(time * 2.0 + z * colorFreq - a * 2.0 + vec3(0.0, 0.33, 0.67) * 6.28318 + colorShift);\n        \n        // Apply custom spiral color tint\n        psyColor *= spiralColor;\n        \n        // Add a glowing center\n        float glow = exp(-r * 4.0) * 2.0;\n        \n        // Combine spiral, color, and glow\n        vec3 fx = psyColor * (spiral * 0.5 + 0.5) * (1.0 + glow);\n        \n        // Blend intensely with the original non-black pixel\n        source.rgb = mix(source.rgb, fx + source.rgb * psyColor, 0.85);\n    }\n    \n    return source;\n}",
    "uniformValues": {
      "twists": 42.16,
      "speed": -9.8,
      "arms": 2.44,
      "posX": -0.42,
      "posY": 0.04,
      "spiralDist": 0.06,
      "colorShift": 5.4636,
      "colorFreq": 0.397,
      "spiralColor": [
        0.32941176470588235,
        0.011764705882352941,
        0.011764705882352941
      ],
      "morphDepth": 10,
      "blackThreshold": 0.1211
    }
  },
  {
    "id": "recovered_timeline_96067366_b7cc_494f_8d83_ffbec38729d1",
    "name": "Psychedelic 3D Automata",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-96067366-b7cc-494f-8d83-ffbec38729d1 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psychedelic 3D Automata\nuniform float depth; // @min 0.1 @max 10.0 @default 5.0\nuniform float lightIntensity; // @min 0.0 @max 10.0 @default 3.0\nuniform vec3 lightColor; // @default 1.0,1.0,1.0\nuniform float ambientLight; // @min 0.0 @max 1.0 @default 0.05\nuniform float lightZ; // @min 0.01 @max 2.0 @default 0.15\nuniform float specularStrength; // @min 0.0 @max 5.0 @default 1.5\nuniform float lightSpeed; // @min 0.0 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform float blackout; // @min 0.0 @max 1.0 @default 1.0\nuniform float psychSpeed; // @min 0.1 @max 5.0 @default 2.0\n\nfloat getLuma(sampler2D tex, vec2 uv) {\n    return dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    vec3 bgCol = mix(source.rgb, vec3(0.0), blackout);\n    \n    // Moving and growing effect\n    float dynamicScale = scale * (1.0 + sin(time * 0.5) * 0.4);\n    vec2 q = uv * dynamicScale + vec2(sin(time * 0.3), cos(time * 0.4));\n    \n    float n = 0.0, amp = 1.0, sumAmp = 0.0;\n    mat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\n\n    // Dynamic automata segmentation logic\n    for(int i = 0; i < 4; i++) {\n        vec2 tOffset = vec2(sin(float(i)), cos(float(i)));\n        float noiseVal = node_noise(q + tOffset + lum * 1.5 + time * 0.5);\n        float angle = noiseVal * 6.2831 + time * 0.2;\n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        q = rot * q * 1.3; \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    n /= sumAmp;\n\n    float branch = smoothstep(0.3, 0.7, n);\n    float lines = smoothstep(0.8, 0.95, sin((lum * 2.0 + n) * lineDensity - time * 3.0));\n    \n    // Super psychedelic color palette\n    vec3 psychColor = 0.5 + 0.5 * cos(time * psychSpeed + uv.xyx * 3.0 + vec3(0.0, 2.0, 4.0) + n * 10.0);\n    vec3 effectCol = psychColor + vec3(1.0) * lines * lum * 1.5;\n    vec3 segColor = mix(bgCol, effectCol, mask * branch);\n\n    // Normal map generation from original image luma\n    vec2 eps = 1.0 / resolution;\n    float l = getLuma(tex, uv - vec2(eps.x, 0.0));\n    float r = getLuma(tex, uv + vec2(eps.x, 0.0));\n    float d = getLuma(tex, uv - vec2(0.0, eps.y));\n    float u = getLuma(tex, uv + vec2(0.0, eps.y));\n    vec3 normal = normalize(vec3((r - l) * depth, (u - d) * depth, 1.0));\n    \n    // 3D Lighting\n    vec3 lightPos = vec3(0.5 + sin(time * lightSpeed) * 0.5, 0.5 + cos(time * lightSpeed) * 0.5, lightZ);\n    vec3 lightDir = normalize(lightPos - vec3(uv, 0.0));\n    vec3 viewDir = vec3(0.0, 0.0, 1.0);\n    vec3 halfDir = normalize(lightDir + viewDir);\n    \n    float diff = max(dot(normal, lightDir), 0.0);\n    float spec = pow(max(dot(normal, halfDir), 0.0), 32.0) * specularStrength;\n    \n    vec3 finalLight = vec3(ambientLight) + lightColor * lightIntensity * (diff + spec);\n    vec3 finalColor = segColor * finalLight;\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "depth": 8.416,
      "lightIntensity": 0,
      "lightColor": [
        1,
        1,
        1
      ],
      "ambientLight": 0.81,
      "lightZ": 1.5025,
      "specularStrength": 3.9,
      "lightSpeed": 1.5,
      "scale": 5.6,
      "threshold": 0.35,
      "lineDensity": 5,
      "blackout": 0.76,
      "psychSpeed": 5
    }
  },
  {
    "id": "recovered_timeline_8e55de83_7749_42a4_a7f6_ae9687f75bea",
    "name": "Zone Fractal + Hue Scanner",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-8e55de83-7749-42a4-a7f6-ae9687f75bea in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Zone Fractal + Hue Scanner\nuniform float zoneWidth;      // @min 1.0  @max 80.0  @default 15.0\nuniform float edgeWidth;      // @min 0.0  @max 10.0  @default 1.5\nuniform float maxDepth;       // @min 10.0 @max 200.0 @default 100.0\nuniform float blackThreshold; // @min 0.03 @max 0.6   @default 0.18\nuniform float whiteThreshold; // @min 0.4  @max 0.99  @default 0.85\nuniform float trailSpeed;     // @min 0.0  @max 200.0 @default 50.0\nuniform float trailLength;    // @min 0.01 @max 0.99  @default 0.65\nuniform float trailDistance;  // @min 1.0  @max 80.0  @default 15.0\nuniform float scanSpeed;      // @min -2.0 @max 2.0   @default 0.4\nuniform float rangeWidth;     // @min 0.0  @max 1.0   @default 0.25\nuniform float edgeSoftness;   // @min 0.001 @max 0.5  @default 0.06\nuniform float borderSoftness; // @min 0.001 @max 1.0  @default 0.15\nuniform float borderBright;   // @min 0.0  @max 2.0   @default 1.2\nuniform float symmetrical;    // @min 0.0  @max 1.0   @default 1.0\n\n// ── rgb2hsv / hsv2rgb ─────────────────────────────────────────────────────────\nvec3 rgb2hsv(vec3 c) {\n    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\n    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\n    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));\n    float d = q.x - min(q.w, q.y);\n    float e = 1.0e-10;\n    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\n\n// ── 1. isEdgePixel ────────────────────────────────────────────────────────────\nbool isEdgePixel(vec4 sp, float blackT, float whiteT) {\n    return sp.a < 0.3\n        || (sp.r < blackT && sp.g < blackT && sp.b < blackT)\n        || (sp.r > whiteT && sp.g > whiteT && sp.b > whiteT);\n}\n\n// ── 2. marchRay ───────────────────────────────────────────────────────────────\nfloat marchRay(sampler2D tex, vec2 uv, vec2 dir, vec2 px,\n               float minD, float blackT, float whiteT,\n               inout vec2 nearVec) {\n    for (int j = 11; j <= 100; j++) {\n        float fj = float(j);\n        if (fj >= minD) break;\n        vec2 s = uv + dir * px * fj;\n        if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) {\n            if (fj < minD) { minD = fj; nearVec = dir; }\n            break;\n        }\n        if (isEdgePixel(texture2D(tex, s), blackT, whiteT)) {\n            if (fj < minD) { minD = fj; nearVec = dir; }\n            break;\n        }\n    }\n    return minD;\n}\n\n// ── 3. sampleZoneColor ────────────────────────────────────────────────────────\nvec3 sampleZoneColor(sampler2D tex, vec2 uv,\n                     vec2 nearVec, vec2 px,\n                     float minD, float zoneW, float maxD,\n                     float blackT, float whiteT) {\n\n    float zoneCenter = (floor(minD / zoneW) + 0.5) * zoneW;\n    vec2  anchorUV   = uv + nearVec * px * (minD - zoneCenter);\n\n    vec3  accum  = vec3(0.0);\n    float weight = 0.0;\n\n    for (int dy = -1; dy <= 1; dy++) {\n        for (int dx = -1; dx <= 1; dx++) {\n            vec2 s = anchorUV + vec2(float(dx), float(dy)) * px * 1.5;\n            if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) continue;\n            vec4 sc = texture2D(tex, s);\n            if (isEdgePixel(sc, blackT, whiteT)) continue;\n            if (sc.r < blackT && sc.g < blackT && sc.b < blackT && sc.a > 0.3) continue;\n            accum  += sc.rgb;\n            weight += 1.0;\n        }\n    }\n\n    vec3  col       = (weight > 0.0) ? accum / weight : vec3(0.3);\n    float depthFade = 1.0 - (zoneCenter / maxD) * 0.6;\n    col *= depthFade * 0.65;\n    return col;\n}\n\n// ── 4. hueScanMask ────────────────────────────────────────────────────────────\n// Returns (mask, border) using the source pixel's hue and a sweeping target hue.\n// If symmetrical > 0.5, the UV is mirrored on x before sampling for the mask.\nvec2 hueScanMask(sampler2D tex, vec2 uv, float time) {\n    vec2 maskUV = uv;\n    if (symmetrical > 0.5)\n        maskUV.x = uv.x > 0.5 ? 1.0 - uv.x : uv.x;\n\n    vec4 src = texture2D(tex, maskUV);\n    vec3 hsv = rgb2hsv(src.rgb);\n\n    float targetHue = fract(time * scanSpeed);\n    float dist = abs(fract(hsv.x - targetHue + 0.5) - 0.5);\n\n    float mask   = smoothstep(rangeWidth * 0.5 + edgeSoftness, rangeWidth * 0.5, dist);\n    float border = smoothstep(borderSoftness, 0.0, abs(dist - rangeWidth * 0.5));\n\n    return vec2(mask, border);\n}\n\n// ── 5. processColor ───────────────────────────────────────────────────────────\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n\n    vec4 src = texture2D(tex, uv);\n\n    bool srcIsBlack = src.r < blackThreshold && src.g < blackThreshold && src.b < blackThreshold && src.a > 0.3;\n    bool srcIsBg    = src.r > whiteThreshold  && src.g > whiteThreshold  && src.b > whiteThreshold;\n    bool srcIsShape = src.a > 0.3 && !srcIsBlack && !srcIsBg;\n\n    if (srcIsBlack)             return vec4(0.0, 0.0, 0.0, 1.0);\n    if (srcIsBg || !srcIsShape) return vec4(0.0, 0.0, 0.0, 0.0);\n\n    // ── Hue scan mask ─────────────────────────────────────────────────────────\n    vec2 mb     = hueScanMask(tex, uv, time);\n    float mask  = mb.x;\n    float border = mb.y;\n\n    // If fully outside the scan window and no border glow, skip entirely\n    if (mask <= 0.0 && border <= 0.0) return vec4(0.0, 0.0, 0.0, 0.0);\n\n    float aspect = resolution.x / resolution.y;\n    vec2  px     = vec2(0.001, 0.001 * aspect);\n\n    float minD    = maxDepth;\n    vec2  nearVec = vec2(1.0, 0.0);\n\n    // ── Phase 1: Euclidean search ±10 ────────────────────────────────────────\n    for (int dy = -10; dy <= 10; dy++) {\n        for (int dx = -10; dx <= 10; dx++) {\n            float fdx = float(dx), fdy = float(dy);\n            float d2  = fdx*fdx + fdy*fdy;\n            if (d2 < 0.5 || d2 > 100.5) continue;\n            vec2  s  = uv + vec2(fdx, fdy) * px;\n            float nd = sqrt(d2);\n            if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) {\n                if (nd < minD) { minD = nd; nearVec = normalize(vec2(fdx, fdy)); }\n                continue;\n            }\n            if (isEdgePixel(texture2D(tex, s), blackThreshold, whiteThreshold))\n                if (nd < minD) { minD = nd; nearVec = normalize(vec2(fdx, fdy)); }\n        }\n    }\n\n    // ── Phase 2: 32-direction ray-march ──────────────────────────────────────\n    if (minD > 10.0) {\n        minD = marchRay(tex, uv, vec2( 1.0000, 0.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.9808, 0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.9239, 0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.8315, 0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.7071, 0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.5556, 0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.3827, 0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.1951, 0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.0000, 1.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.1951, 0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.3827, 0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.5556, 0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.7071, 0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.8315, 0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.9239, 0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.9808, 0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-1.0000, 0.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.9808,-0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.9239,-0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.8315,-0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.7071,-0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.5556,-0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.3827,-0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.1951,-0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.0000,-1.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.1951,-0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.3827,-0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.5556,-0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.7071,-0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.8315,-0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.9239,-0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.9808,-0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\n    }\n\n    // ── Zone border ───────────────────────────────────────────────────────────\n    float depFrac = mod(minD, zoneWidth);\n    if (depFrac < edgeWidth || depFrac > zoneWidth - edgeWidth)\n        return vec4(0.0, 0.0, 0.0, mask);\n\n    // ── Snap nearVec to nearest 45° octant ────────────────────────────────────\n    float snapAngle = floor(atan(nearVec.y, nearVec.x) / 0.7854 + 0.5) * 0.7854;\n    vec2  tangent   = vec2(-sin(snapAngle), cos(snapAngle));\n\n    // ── Zone color ────────────────────────────────────────────────────────────\n    vec3 col = sampleZoneColor(tex, uv, nearVec, px,\n                               minD, zoneWidth, maxDepth,\n                               blackThreshold, whiteThreshold);\n\n    // ── Animated dot trail ────────────────────────────────────────────────────\n    float zoneNum  = floor(minD / zoneWidth);\n    float isEven   = mod(zoneNum, 2.0) < 0.5 ? 1.0 : 0.0;\n    float zoneIdx  = mod(zoneNum, 4.0);\n\n    float speedMul;\n    if      (zoneIdx < 0.5) speedMul =  1.0;\n    else if (zoneIdx < 1.5) speedMul = -1.4;\n    else if (zoneIdx < 2.5) speedMul =  1.2;\n    else                    speedMul = -0.9;\n\n    speedMul *= isEven > 0.5 ? -1.0 : 1.0;\n\n    vec2  uvPx  = uv * vec2(1000.0, 1000.0 / aspect);\n    float along = dot(uvPx, tangent);\n    float phase = fract((along + time * trailSpeed * speedMul) / trailDistance);\n    float headSize = 0.04;\n\n    if (phase < headSize) {\n        col = mix(col, vec3(1.0), 0.95);\n    } else if (phase < headSize + trailLength) {\n        float t = (phase - headSize) / trailLength;\n        col = mix(col, vec3(1.0), 0.88 * (1.0 - t * t));\n    }\n\n    // ── Apply hue scan mask + soft border highlight ───────────────────────────\n    vec3 finalColor = col * mask + vec3(1.0) * border * borderBright;\n\n    return vec4(clamp(finalColor, 0.0, 1.0), clamp(mask + border, 0.0, 1.0));\n}\n",
    "uniformValues": {
      "zoneWidth": 6.53,
      "edgeWidth": 2.9,
      "maxDepth": 200,
      "blackThreshold": 0.2523,
      "whiteThreshold": 0.99,
      "trailSpeed": 200,
      "trailLength": 0.794,
      "trailDistance": 80,
      "scanSpeed": 0.88,
      "rangeWidth": 0.99,
      "edgeSoftness": 0.39022,
      "borderSoftness": 0.62038,
      "borderBright": 0,
      "symmetrical": 0.97
    }
  },
  {
    "id": "recovered_timeline_c4abbedd_0e5c_44e1_8ac8_428e1cf7a1ff",
    "name": "Zone Fractal + Hue Scanner 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-c4abbedd-0e5c-44e1-8ac8-428e1cf7a1ff in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Zone Fractal + Hue Scanner\nuniform float zoneWidth;      // @min 1.0  @max 80.0  @default 15.0\nuniform float edgeWidth;      // @min 0.0  @max 10.0  @default 1.5\nuniform float maxDepth;       // @min 10.0 @max 200.0 @default 100.0\nuniform float blackThreshold; // @min 0.03 @max 0.6   @default 0.18\nuniform float whiteThreshold; // @min 0.4  @max 0.99  @default 0.85\nuniform float trailSpeed;     // @min 0.0  @max 200.0 @default 50.0\nuniform float trailLength;    // @min 0.01 @max 0.99  @default 0.65\nuniform float trailDistance;  // @min 1.0  @max 80.0  @default 15.0\nuniform float scanSpeed;      // @min -2.0 @max 2.0   @default 0.4\nuniform float rangeWidth;     // @min 0.0  @max 1.0   @default 0.25\nuniform float edgeSoftness;   // @min 0.001 @max 0.5  @default 0.06\nuniform float borderSoftness; // @min 0.001 @max 1.0  @default 0.15\nuniform float borderBright;   // @min 0.0  @max 2.0   @default 1.2\nuniform float symmetrical;    // @min 0.0  @max 1.0   @default 1.0\n\n// ── rgb2hsv / hsv2rgb ─────────────────────────────────────────────────────────\nvec3 rgb2hsv(vec3 c) {\n    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\n    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\n    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));\n    float d = q.x - min(q.w, q.y);\n    float e = 1.0e-10;\n    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\n\n// ── 1. isEdgePixel ────────────────────────────────────────────────────────────\nbool isEdgePixel(vec4 sp, float blackT, float whiteT) {\n    return sp.a < 0.3\n        || (sp.r < blackT && sp.g < blackT && sp.b < blackT)\n        || (sp.r > whiteT && sp.g > whiteT && sp.b > whiteT);\n}\n\n// ── 2. marchRay ───────────────────────────────────────────────────────────────\nfloat marchRay(sampler2D tex, vec2 uv, vec2 dir, vec2 px,\n               float minD, float blackT, float whiteT,\n               inout vec2 nearVec) {\n    for (int j = 11; j <= 100; j++) {\n        float fj = float(j);\n        if (fj >= minD) break;\n        vec2 s = uv + dir * px * fj;\n        if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) {\n            if (fj < minD) { minD = fj; nearVec = dir; }\n            break;\n        }\n        if (isEdgePixel(texture2D(tex, s), blackT, whiteT)) {\n            if (fj < minD) { minD = fj; nearVec = dir; }\n            break;\n        }\n    }\n    return minD;\n}\n\n// ── 3. sampleZoneColor ────────────────────────────────────────────────────────\nvec3 sampleZoneColor(sampler2D tex, vec2 uv,\n                     vec2 nearVec, vec2 px,\n                     float minD, float zoneW, float maxD,\n                     float blackT, float whiteT) {\n\n    float zoneCenter = (floor(minD / zoneW) + 0.5) * zoneW;\n    vec2  anchorUV   = uv + nearVec * px * (minD - zoneCenter);\n\n    vec3  accum  = vec3(0.0);\n    float weight = 0.0;\n\n    for (int dy = -1; dy <= 1; dy++) {\n        for (int dx = -1; dx <= 1; dx++) {\n            vec2 s = anchorUV + vec2(float(dx), float(dy)) * px * 1.5;\n            if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) continue;\n            vec4 sc = texture2D(tex, s);\n            if (isEdgePixel(sc, blackT, whiteT)) continue;\n            if (sc.r < blackT && sc.g < blackT && sc.b < blackT && sc.a > 0.3) continue;\n            accum  += sc.rgb;\n            weight += 1.0;\n        }\n    }\n\n    vec3  col       = (weight > 0.0) ? accum / weight : vec3(0.3);\n    float depthFade = 1.0 - (zoneCenter / maxD) * 0.6;\n    col *= depthFade * 0.65;\n    return col;\n}\n\n// ── 4. hueScanMask ────────────────────────────────────────────────────────────\n// Returns (mask, border) using the source pixel's hue and a sweeping target hue.\n// If symmetrical > 0.5, the UV is mirrored on x before sampling for the mask.\nvec2 hueScanMask(sampler2D tex, vec2 uv, float time) {\n    vec2 maskUV = uv;\n    if (symmetrical > 0.5)\n        maskUV.x = uv.x > 0.5 ? 1.0 - uv.x : uv.x;\n\n    vec4 src = texture2D(tex, maskUV);\n    vec3 hsv = rgb2hsv(src.rgb);\n\n    float targetHue = fract(time * scanSpeed);\n    float dist = abs(fract(hsv.x - targetHue + 0.5) - 0.5);\n\n    float mask   = smoothstep(rangeWidth * 0.5 + edgeSoftness, rangeWidth * 0.5, dist);\n    float border = smoothstep(borderSoftness, 0.0, abs(dist - rangeWidth * 0.5));\n\n    return vec2(mask, border);\n}\n\n// ── 5. processColor ───────────────────────────────────────────────────────────\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n\n    vec4 src = texture2D(tex, uv);\n\n    bool srcIsBlack = src.r < blackThreshold && src.g < blackThreshold && src.b < blackThreshold && src.a > 0.3;\n    bool srcIsBg    = src.r > whiteThreshold  && src.g > whiteThreshold  && src.b > whiteThreshold;\n    bool srcIsShape = src.a > 0.3 && !srcIsBlack && !srcIsBg;\n\n    if (srcIsBlack)             return vec4(0.0, 0.0, 0.0, 1.0);\n    if (srcIsBg || !srcIsShape) return vec4(0.0, 0.0, 0.0, 0.0);\n\n    // ── Hue scan mask ─────────────────────────────────────────────────────────\n    vec2 mb     = hueScanMask(tex, uv, time);\n    float mask  = mb.x;\n    float border = mb.y;\n\n    // If fully outside the scan window and no border glow, skip entirely\n    if (mask <= 0.0 && border <= 0.0) return vec4(0.0, 0.0, 0.0, 0.0);\n\n    float aspect = resolution.x / resolution.y;\n    vec2  px     = vec2(0.001, 0.001 * aspect);\n\n    float minD    = maxDepth;\n    vec2  nearVec = vec2(1.0, 0.0);\n\n    // ── Phase 1: Euclidean search ±10 ────────────────────────────────────────\n    for (int dy = -10; dy <= 10; dy++) {\n        for (int dx = -10; dx <= 10; dx++) {\n            float fdx = float(dx), fdy = float(dy);\n            float d2  = fdx*fdx + fdy*fdy;\n            if (d2 < 0.5 || d2 > 100.5) continue;\n            vec2  s  = uv + vec2(fdx, fdy) * px;\n            float nd = sqrt(d2);\n            if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) {\n                if (nd < minD) { minD = nd; nearVec = normalize(vec2(fdx, fdy)); }\n                continue;\n            }\n            if (isEdgePixel(texture2D(tex, s), blackThreshold, whiteThreshold))\n                if (nd < minD) { minD = nd; nearVec = normalize(vec2(fdx, fdy)); }\n        }\n    }\n\n    // ── Phase 2: 32-direction ray-march ──────────────────────────────────────\n    if (minD > 10.0) {\n        minD = marchRay(tex, uv, vec2( 1.0000, 0.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.9808, 0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.9239, 0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.8315, 0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.7071, 0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.5556, 0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.3827, 0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.1951, 0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.0000, 1.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.1951, 0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.3827, 0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.5556, 0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.7071, 0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.8315, 0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.9239, 0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.9808, 0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-1.0000, 0.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.9808,-0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.9239,-0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.8315,-0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.7071,-0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.5556,-0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.3827,-0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2(-0.1951,-0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.0000,-1.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.1951,-0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.3827,-0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.5556,-0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.7071,-0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.8315,-0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.9239,-0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\n        minD = marchRay(tex, uv, vec2( 0.9808,-0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\n    }\n\n    // ── Zone border ───────────────────────────────────────────────────────────\n    float depFrac = mod(minD, zoneWidth);\n    if (depFrac < edgeWidth || depFrac > zoneWidth - edgeWidth)\n        return vec4(0.0, 0.0, 0.0, mask);\n\n    // ── Snap nearVec to nearest 45° octant ────────────────────────────────────\n    float snapAngle = floor(atan(nearVec.y, nearVec.x) / 0.7854 + 0.5) * 0.7854;\n    vec2  tangent   = vec2(-sin(snapAngle), cos(snapAngle));\n\n    // ── Zone color ────────────────────────────────────────────────────────────\n    vec3 col = sampleZoneColor(tex, uv, nearVec, px,\n                               minD, zoneWidth, maxDepth,\n                               blackThreshold, whiteThreshold);\n\n    // ── Animated dot trail ────────────────────────────────────────────────────\n    float zoneNum  = floor(minD / zoneWidth);\n    float isEven   = mod(zoneNum, 2.0) < 0.5 ? 1.0 : 0.0;\n    float zoneIdx  = mod(zoneNum, 4.0);\n\n    float speedMul;\n    if      (zoneIdx < 0.5) speedMul =  1.0;\n    else if (zoneIdx < 1.5) speedMul = -1.4;\n    else if (zoneIdx < 2.5) speedMul =  1.2;\n    else                    speedMul = -0.9;\n\n    speedMul *= isEven > 0.5 ? -1.0 : 1.0;\n\n    vec2  uvPx  = uv * vec2(1000.0, 1000.0 / aspect);\n    float along = dot(uvPx, tangent);\n    float phase = fract((along + time * trailSpeed * speedMul) / trailDistance);\n    float headSize = 0.04;\n\n    if (phase < headSize) {\n        col = mix(col, vec3(1.0), 0.95);\n    } else if (phase < headSize + trailLength) {\n        float t = (phase - headSize) / trailLength;\n        col = mix(col, vec3(1.0), 0.88 * (1.0 - t * t));\n    }\n\n    // ── Apply hue scan mask + soft border highlight ───────────────────────────\n    vec3 finalColor = col * mask + vec3(1.0) * border * borderBright;\n\n    return vec4(clamp(finalColor, 0.0, 1.0), clamp(mask + border, 0.0, 1.0));\n}\n",
    "uniformValues": {
      "zoneWidth": 17.59,
      "edgeWidth": 3,
      "maxDepth": 200,
      "blackThreshold": 0.2523,
      "whiteThreshold": 0.8897,
      "trailSpeed": 44,
      "trailLength": 0.794,
      "trailDistance": 80,
      "scanSpeed": 0.88,
      "rangeWidth": 0.99,
      "edgeSoftness": 0.39022,
      "borderSoftness": 0.62038,
      "borderBright": 0,
      "symmetrical": 0.01
    }
  },
  {
    "id": "recovered_timeline_3a1338dd_7a28_42de_91e0_c4f504c193d1",
    "name": "Psychedelic 5-Color Pixels",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-3a1338dd-7a28-42de-91e0-c4f504c193d1 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psychedelic 5-Color Pixels\nuniform float speed; // @min 0.1 @max 5.0 @default 2.0\nuniform float pixelSize; // @min 4.0 @max 64.0 @default 24.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 orig = texture2D(tex, uv);\n    float lum = dot(orig.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Grid setup\n    vec2 gridUv = uv * resolution / pixelSize;\n    vec2 cell = floor(gridUv);\n    vec2 local = fract(gridUv);\n    \n    // 5 Color Palette\n    vec3 c1 = vec3(1.0, 0.1, 0.6); // Neon Pink\n    vec3 c2 = vec3(0.1, 0.9, 1.0); // Cyan\n    vec3 c3 = vec3(1.0, 0.9, 0.0); // Yellow\n    vec3 c4 = vec3(0.2, 1.0, 0.3); // Lime Green\n    vec3 c5 = vec3(1.0, 0.4, 0.0); // Orange\n    \n    // Alternating color logic based on time and cell position\n    float t = time * speed + node_noise(cell * 0.2) * 10.0;\n    float cycle = mod(t, 5.0);\n    \n    vec3 col = c1;\n    col = mix(col, c2, clamp(cycle, 0.0, 1.0));\n    col = mix(col, c3, clamp(cycle - 1.0, 0.0, 1.0));\n    col = mix(col, c4, clamp(cycle - 2.0, 0.0, 1.0));\n    col = mix(col, c5, clamp(cycle - 3.0, 0.0, 1.0));\n    col = mix(col, c1, clamp(cycle - 4.0, 0.0, 1.0));\n    \n    // Psychedelic white pattern inside the pixel\n    float noiseVal = node_noise(uv * 5.0 + time);\n    float psych = sin(local.x * 20.0 + time * 5.0 + noiseVal * 6.28) * cos(local.y * 20.0 - time * 3.0);\n    float whiteMask = smoothstep(0.5, 0.8, psych);\n    col = mix(col, vec3(1.0), whiteMask);\n    \n    // Round pixel shape\n    float dist = length(local - 0.5);\n    float circle = smoothstep(0.5, 0.4, dist);\n    \n    // Only apply effect where the original image has some brightness\n    float activePixel = smoothstep(0.05, 0.15, lum);\n    \n    // Background is darkened original\n    vec3 bgCol = orig.rgb * 0.15;\n    \n    // Combine\n    vec3 finalCol = mix(bgCol, col, circle * activePixel);\n    \n    return vec4(finalCol, orig.a);\n}",
    "uniformValues": {
      "speed": 4.51,
      "pixelSize": 18.4
    }
  },
  {
    "id": "recovered_timeline_0767f777_b318_4034_95de_e4f11c21702d",
    "name": "Animated Luma Grid with Source Adjust",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-0767f777-b318-4034-95de-e4f11c21702d in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Animated Luma Grid with Source Adjust\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.1\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\nuniform float origContrast; // @min 0.0 @max 3.0 @default 1.0\nuniform float origLuminosity; // @min -1.0 @max 1.0 @default 0.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Adjust original image contrast and luminosity\n    vec3 adjSource = (source.rgb - 0.5) * origContrast + 0.5 + origLuminosity;\n    adjSource = clamp(adjSource, 0.0, 1.0);\n    \n    // Calculate luminance for 3D depth mapping (using unaltered source so the shader effect is unaffected)\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Create a mask based on the threshold\n    float mask = smoothstep(blackThreshold, blackThreshold + 0.05, lum);\n    \n    // If completely below threshold, return transparent black immediately\n    if (mask <= 0.0) {\n        return vec4(0.0);\n    }\n    \n    vec2 p = uv * scale;\n    float t = time * speed;\n\n    // Animated noise plane driven by luminance and time\n    float n = node_noise(p + lum * 2.0 - t * 0.5);\n\n    // Isolate branching structures\n    float branch = smoothstep(0.3, 0.7, n);\n\n    // Topographical grid lines (X and Y axes for 90-degree grid)\n    float topoX = sin((lum * 2.5 + n + uv.x * 5.0 - t) * lineDensity);\n    float topoY = sin((lum * 2.5 + n + uv.y * 5.0 - t) * lineDensity);\n    float lines = clamp(smoothstep(0.8, 0.95, topoX) + smoothstep(0.8, 0.95, topoY), 0.0, 1.0);\n\n    // Mix colors based on branches\n    vec3 effectCol = mix(blobColor, branchColor, branch);\n    \n    // Add glowing lines that highlight the 3D contours\n    effectCol += vec3(1.0) * lines * (lum + 0.3);\n\n    // Apply the effect fully across the image, blending with the adjusted original\n    vec3 finalCol = mix(adjSource, effectCol, branch * 0.7 + lines * 0.6);\n\n    // Calculate final alpha\n    float finalAlpha = source.a * mask;\n\n    // Premultiply RGB by alpha to ensure the black background becomes truly transparent\n    return vec4(finalCol * finalAlpha, finalAlpha);\n}",
    "uniformValues": {
      "scale": 3.98,
      "lineDensity": 9.05,
      "blobColor": [
        0.8549019607843137,
        0.4470588235294118,
        0.06274509803921569
      ],
      "branchColor": [
        0.2823529411764706,
        0.1568627450980392,
        0.0392156862745098
      ],
      "blackThreshold": 0.18,
      "speed": 0.3,
      "origContrast": 0.09,
      "origLuminosity": -0.98
    }
  },
  {
    "id": "recovered_timeline_89ca6d14_53be_47ba_b486_31697c70d7fd",
    "name": "Morphed Automata Grid",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-89ca6d14-53be-47ba-b486-31697c70d7fd in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Morphed Automata Grid\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.1\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\nuniform float morphAmount; // @min 0.0 @max 0.2 @default 0.05\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    // Sample the original unmorphed texture to create the mask\n    vec4 origSource = texture2D(tex, uv);\n    float origLum = dot(origSource.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Hard threshold based on the original pixel\n    float mask = smoothstep(blackThreshold, blackThreshold + 0.02, origLum);\n    if (mask <= 0.0) {\n        // Return pitch black for pixels that were originally black\n        return vec4(0.0, 0.0, 0.0, origSource.a);\n    }\n\n    vec2 p = uv * scale;\n    float t = time * speed;\n\n    // Calculate curvature/noise to morph the UV coordinates\n    float morphNx = node_noise(p - t * 0.3);\n    float morphNy = node_noise(p + vec2(13.37) + t * 0.3);\n    vec2 morphOffset = (vec2(morphNx, morphNy) - 0.5) * 2.0 * morphAmount;\n    \n    // Apply the morph to the UVs\n    vec2 morphedUV = uv + morphOffset;\n    vec4 source = texture2D(tex, morphedUV);\n    \n    // Calculate luminance of the morphed image\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Create a mask for the morphed pixel to prevent drawing effects on distorted black areas\n    float morphedMask = smoothstep(blackThreshold, blackThreshold + 0.02, lum);\n    \n    vec2 dir = vec2(1.0, 1.0);\n    vec2 mp = morphedUV * scale;\n\n    // Automata noise, incorporating the unified direction and morphed UVs\n    float n = node_noise(mp + lum * 2.0 * dir - t * 0.5);\n    \n    // Isolate branching structures for the automata look\n    float branch = smoothstep(0.3, 0.7, n);\n\n    // Create the 90-degree grid, moving uniformly in one direction\n    float topoX = sin((mp.x + lum * 1.5 * dir.x + n) * lineDensity - t);\n    float topoY = sin((mp.y + lum * 1.5 * dir.y + n) * lineDensity - t);\n    \n    float lineX = smoothstep(0.8, 0.95, topoX);\n    float lineY = smoothstep(0.8, 0.95, topoY);\n    \n    // Combine X and Y to form the grid\n    float lines = clamp(lineX + lineY, 0.0, 1.0);\n\n    // Mix colors based on the automata branches\n    vec3 effectCol = mix(blobColor, branchColor, branch);\n    \n    // Add glowing grid lines that highlight the contours\n    effectCol += vec3(1.0) * lines * (lum + 0.3);\n\n    // Blend the automata and grid over the morphed image\n    vec3 finalCol = mix(source.rgb, effectCol, branch * 0.7 + lines * 0.6);\n\n    // Apply the morphed mask to hide effects on distorted black pixels\n    finalCol *= morphedMask;\n\n    // Apply the original mask to ensure smooth transition to pitch black at the edges\n    finalCol *= mask;\n\n    return vec4(finalCol, origSource.a);\n}",
    "uniformValues": {
      "scale": 4.34,
      "lineDensity": 50,
      "blobColor": [
        0.3607843137254902,
        0.11764705882352941,
        0.24705882352941178
      ],
      "branchColor": [
        0.21568627450980393,
        0.06666666666666667,
        0.1843137254901961
      ],
      "blackThreshold": 0.16,
      "speed": 2.35,
      "morphAmount": 0.024
    }
  },
  {
    "id": "recovered_timeline_c7702eee_0b9b_48a8_8b58_95a92d5b29b0",
    "name": "Animated Luma Grid with Source Adjust 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-c7702eee-0b9b-48a8-8b58-95a92d5b29b0 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Animated Luma Grid with Source Adjust\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.1\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\nuniform float origContrast; // @min 0.0 @max 3.0 @default 1.0\nuniform float origLuminosity; // @min -1.0 @max 1.0 @default 0.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Adjust original image contrast and luminosity\n    vec3 adjSource = (source.rgb - 0.5) * origContrast + 0.5 + origLuminosity;\n    adjSource = clamp(adjSource, 0.0, 1.0);\n    \n    // Calculate luminance for 3D depth mapping (using unaltered source so the shader effect is unaffected)\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Create a mask based on the threshold\n    float mask = smoothstep(blackThreshold, blackThreshold + 0.05, lum);\n    \n    // If completely below threshold, return transparent black immediately\n    if (mask <= 0.0) {\n        return vec4(0.0);\n    }\n    \n    vec2 p = uv * scale;\n    float t = time * speed;\n\n    // Animated noise plane driven by luminance and time\n    float n = node_noise(p + lum * 2.0 - t * 0.5);\n\n    // Isolate branching structures\n    float branch = smoothstep(0.3, 0.7, n);\n\n    // Topographical grid lines (X and Y axes for 90-degree grid)\n    float topoX = sin((lum * 2.5 + n + uv.x * 5.0 - t) * lineDensity);\n    float topoY = sin((lum * 2.5 + n + uv.y * 5.0 - t) * lineDensity);\n    float lines = clamp(smoothstep(0.8, 0.95, topoX) + smoothstep(0.8, 0.95, topoY), 0.0, 1.0);\n\n    // Mix colors based on branches\n    vec3 effectCol = mix(blobColor, branchColor, branch);\n    \n    // Add glowing lines that highlight the 3D contours\n    effectCol += vec3(1.0) * lines * (lum + 0.3);\n\n    // Apply the effect fully across the image, blending with the adjusted original\n    vec3 finalCol = mix(adjSource, effectCol, branch * 0.7 + lines * 0.6);\n\n    // Calculate final alpha\n    float finalAlpha = source.a * mask;\n\n    // Premultiply RGB by alpha to ensure the black background becomes truly transparent\n    return vec4(finalCol * finalAlpha, finalAlpha);\n}",
    "uniformValues": {
      "scale": 3.98,
      "lineDensity": 9.05,
      "blobColor": [
        0.03529411764705882,
        0.054901960784313725,
        0.3254901960784314
      ],
      "branchColor": [
        0.023529411764705882,
        0.29411764705882354,
        0.2784313725490196
      ],
      "blackThreshold": 0.18,
      "speed": 0.3,
      "origContrast": 1.8,
      "origLuminosity": -0.42
    }
  },
  {
    "id": "recovered_timeline_7b504049_02fd_49bb_8ac7_117d484a12a7",
    "name": "3D Bump Automata",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-7b504049-02fd-49bb-8ac7-117d484a12a7 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: 3D Bump Automata\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.1\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\nuniform float morphAmount; // @min 0.0 @max 0.2 @default 0.05\nuniform float bumpStrength; // @min 0.0 @max 50.0 @default 15.0\nuniform vec3 lightColor; // @default 1.0,0.9,0.8\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 origSource = texture2D(tex, uv);\n    vec3 lumWeights = vec3(0.299, 0.587, 0.114);\n    float origLum = dot(origSource.rgb, lumWeights);\n    \n    // Hard threshold based on the original pixel\n    float mask = smoothstep(blackThreshold, blackThreshold + 0.02, origLum);\n    if (mask <= 0.0) {\n        return vec4(0.0, 0.0, 0.0, origSource.a);\n    }\n\n    // 3D Bump Mapping based on original luminance\n    vec2 eps = 1.0 / resolution;\n    float hx = dot(texture2D(tex, uv + vec2(eps.x, 0.0)).rgb, lumWeights);\n    float hy = dot(texture2D(tex, uv + vec2(0.0, eps.y)).rgb, lumWeights);\n    vec3 normal = normalize(vec3((origLum - hx) * bumpStrength, (origLum - hy) * bumpStrength, 1.0));\n    \n    // Lighting calculations\n    vec3 lightDir = normalize(vec3(sin(time), cos(time), 1.5));\n    float diffuse = max(dot(normal, lightDir), 0.2); // 0.2 ambient\n    vec3 viewDir = vec3(0.0, 0.0, 1.0);\n    vec3 halfVector = normalize(lightDir + viewDir);\n    float specular = pow(max(dot(normal, halfVector), 0.0), 32.0);\n\n    vec2 p = uv * scale;\n    float t = time * speed;\n\n    // Calculate curvature/noise to morph the UV coordinates\n    float morphNx = node_noise(p - t * 0.3);\n    float morphNy = node_noise(p + vec2(13.37) + t * 0.3);\n    vec2 morphOffset = (vec2(morphNx, morphNy) - 0.5) * 2.0 * morphAmount;\n    \n    vec2 morphedUV = uv + morphOffset;\n    vec4 source = texture2D(tex, morphedUV);\n    float lum = dot(source.rgb, lumWeights);\n    \n    vec2 mp = morphedUV * scale;\n    float n = node_noise(mp + lum * 2.0 - t * 0.5);\n    float branch = smoothstep(0.3, 0.7, n);\n\n    // Create the 90-degree grid\n    float topoX = sin((mp.x + lum * 1.5 + n) * lineDensity - t);\n    float topoY = sin((mp.y + lum * 1.5 + n) * lineDensity - t);\n    float lines = clamp(smoothstep(0.8, 0.95, topoX) + smoothstep(0.8, 0.95, topoY), 0.0, 1.0);\n\n    // Mix colors based on the automata branches\n    vec3 effectCol = mix(blobColor, branchColor, branch);\n    effectCol += vec3(1.0) * lines * (lum + 0.3);\n\n    // Blend the automata and grid over the morphed image\n    vec3 finalCol = mix(source.rgb, effectCol, branch * 0.7 + lines * 0.6);\n\n    // Apply 3D lighting to the effect\n    finalCol = finalCol * diffuse * lightColor + specular * lightColor;\n\n    return vec4(finalCol, origSource.a);\n}",
    "uniformValues": {
      "scale": 4.34,
      "lineDensity": 5,
      "blobColor": [
        0.27450980392156865,
        0.047058823529411764,
        0.1607843137254902
      ],
      "branchColor": [
        0.28627450980392155,
        0.16862745098039217,
        0.3137254901960784
      ],
      "blackThreshold": 0.07,
      "speed": 1.1,
      "morphAmount": 0.012,
      "bumpStrength": 14.5,
      "lightColor": [
        1,
        0.9,
        0.8
      ]
    }
  },
  {
    "id": "recovered_timeline_76e605f9_8103_468f_9cfe_1012e1e9fae8",
    "name": "Priority Flipping Cubes Masked",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-76e605f9-8103-468f-9cfe-1012e1e9fae8 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Priority Flipping Cubes Masked\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float waveFreq; // @min 0.1 @max 2.0 @default 0.4\nuniform float zoom; // @min 0.09 @max 0.9 @default 0.9\nuniform vec3 planeColor; // @default 0.1,0.1,0.15\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 orig = texture2D(tex, uv);\n    \n    // Mask: if the original pixel is black, do not affect it\n    if (length(orig.rgb) < 0.01) {\n        return orig;\n    }\n\n    vec2 p = uv * 10.0 * zoom;\n    vec2 id = floor(p);\n    vec2 f = fract(p) - 0.5;\n    \n    float localTime = time * speed - length(id - vec2(5.0 * zoom)) * 0.3;\n    float phase = fract(localTime * waveFreq);\n    float flipProgress = smoothstep(0.0, 0.5, phase);\n    float angle = (floor(localTime * waveFreq) + flipProgress) * 3.14159265;\n    \n    float s = sin(angle), c = cos(angle);\n    mat2 rot = mat2(c, -s, s, c);\n    \n    vec2 rotatedF = rot * f;\n    \n    if (abs(rotatedF.x) < 0.45 && abs(rotatedF.y) < 0.45) {\n        vec2 sampleUV = (id + rotatedF + 0.5) / (10.0 * zoom);\n        vec4 col = texture2D(tex, fract(sampleUV));\n        col.rgb *= 0.7 + 0.3 * cos(angle);\n        return col;\n    }\n    \n    return vec4(planeColor, 1.0);\n}",
    "uniformValues": {
      "speed": 1.668,
      "waveFreq": 0.176,
      "zoom": 4.02,
      "planeColor": [
        0.0392156862745098,
        0.0392156862745098,
        0.043137254901960784
      ]
    }
  },
  {
    "id": "recovered_timeline_a0b3ee90_a0f9_480a_8092_eb79d0273de0",
    "name": "Tinted Arc Flipping Cubes",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-a0b3ee90-a0f9-480a-8092-eb79d0273de0 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Tinted Arc Flipping Cubes\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float waveFreq; // @min 0.1 @max 2.0 @default 0.4\nuniform float waveSpread; // @min 0.1 @max 2.0 @default 0.3\nuniform float jumpHeight; // @min 0.0 @max 3.0 @default 1.2\nuniform float gridSize; // @min 1.0 @max 50.0 @default 13.0\nuniform vec3 planeColor; // @default 0.1,0.1,0.15\nuniform float contrast; // @min 0.0 @max 3.0 @default 1.0\nuniform float luminosity; // @min -1.0 @max 1.0 @default 0.0\n\nmat2 rot(float a) { \n    return mat2(cos(a), -sin(a), sin(a), cos(a)); \n}\n\nvec2 map(vec3 p, float time) {\n    vec2 id = floor(p.xz + 0.5);\n    vec3 q = p;\n    q.x = fract(p.x + 0.5) - 0.5; \n    q.z = fract(p.z + 0.5) - 0.5;\n    float localTime = time * speed - length(id) * waveSpread;\n    float phase = fract(localTime * waveFreq);\n    float flipProgress = smoothstep(0.0, 0.25, phase);\n    float angle = (floor(localTime * waveFreq) + flipProgress) * 3.14159;\n    float activeFlip = sin(flipProgress * 3.14159);\n    float dir = (id.x >= 0.0) ? -1.0 : 1.0;\n    q.x -= activeFlip * jumpHeight * 1.5 * dir;\n    q.y -= activeFlip * jumpHeight;\n    q.xy = rot(angle * dir) * q.xy;\n    vec3 d = abs(q) - vec3(0.48 - activeFlip * 0.2, 0.15, 0.48 - activeFlip * 0.2);\n    float tiles = min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, vec3(0.0)));\n    return (tiles < p.y + 0.6) ? vec2(tiles, 1.0) : vec2(p.y + 0.6, 0.0);\n}\n\nvec3 getNormal(vec3 p, float time) {\n    vec2 e = vec2(0.01, 0.0);\n    return normalize(vec3(\n        map(p + e.xyy, time).x - map(p - e.xyy, time).x,\n        map(p + e.yxy, time).x - map(p - e.yxy, time).x,\n        map(p + e.yyx, time).x - map(p - e.yyx, time).x\n    ));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 p = (uv - 0.5) * 2.0;\n    p.x *= resolution.x / resolution.y;\n    \n    float zoom = 0.9;\n    p /= zoom;\n    \n    vec3 ro = vec3(0.0, gridSize, 0.001);\n    vec3 rd = normalize(vec3(p.x, -2.2, p.y));\n    float t = 0.0, maxDist = gridSize * 3.0;\n    vec2 res = vec2(0.0);\n    \n    for(int i = 0; i < 40; i++) {\n        res = map(ro + rd * t, time);\n        if(res.x < 0.005 || t > maxDist) break;\n        t += res.x * 0.8;\n    }\n    \n    if(t >= maxDist) return vec4(0.0, 0.0, 0.0, 1.0);\n    \n    vec3 pos = ro + rd * t;\n    vec3 nor = getNormal(pos, time);\n    float dif = max(dot(nor, normalize(vec3(0.6, 1.0, -0.4))), 0.0);\n    vec3 col = planeColor;\n    \n    if (res.y > 0.5) {\n        vec2 id = floor(pos.xz + 0.5);\n        vec2 finalUV = (id + (pos.xz - id)) / gridSize;\n        finalUV.x /= (resolution.x / resolution.y);\n        vec3 texCol = texture2D(tex, finalUV + 0.5).rgb;\n        \n        // Apply contrast and luminosity\n        texCol = clamp((texCol - 0.5) * contrast + 0.5 + luminosity, 0.0, 1.0);\n        \n        float localTime = time * speed - length(id) * waveSpread;\n        float phase = fract(localTime * waveFreq);\n        float angle = (floor(localTime * waveFreq) + smoothstep(0.0, 0.25, phase)) * 3.14159;\n        float dir = (id.x >= 0.0) ? -1.0 : 1.0;\n        float flipIndex = floor((localTime * waveFreq + 0.5) * 0.5);\n        vec3 tint = vec3(node_rand(vec2(flipIndex, 1.1)), node_rand(vec2(flipIndex, 2.2)), node_rand(vec2(flipIndex, 3.3)));\n        vec2 localNorXY = rot(angle * dir) * nor.xy;\n        \n        // Softened and darkened tinting\n        col = mix(texCol * (tint * 0.8 + 0.1), texCol, smoothstep(0.5, 0.9, localNorXY.y));\n    }\n    \n    // Softened and darkened lighting\n    col *= (dif * 0.5 + max(dot(nor, rd), 0.0) * 0.4 + 0.2);\n    return vec4(mix(col, vec3(0.0), smoothstep(maxDist * 0.5, maxDist, t)), 1.0);\n}",
    "uniformValues": {
      "speed": 0.443,
      "waveFreq": 0.271,
      "waveSpread": 0.157,
      "jumpHeight": 0.03,
      "gridSize": 9.33,
      "planeColor": [
        0.027450980392156862,
        0.027450980392156862,
        0.03137254901960784
      ],
      "contrast": 1.98,
      "luminosity": 0.06
    }
  },
  {
    "id": "recovered_timeline_4c303084_1609_4be2_bb1f_c286953e2133",
    "name": "Tinted Arc Flipping Cubes 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-4c303084-1609-4be2-bb1f-c286953e2133 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Tinted Arc Flipping Cubes\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float waveFreq; // @min 0.1 @max 2.0 @default 0.4\nuniform float waveSpread; // @min 0.1 @max 2.0 @default 0.3\nuniform float jumpHeight; // @min 0.0 @max 3.0 @default 1.2\nuniform float gridSize; // @min 1.0 @max 50.0 @default 13.0\nuniform vec3 planeColor; // @default 0.1,0.1,0.15\n\nmat2 rot(float a) { \n    return mat2(cos(a), -sin(a), sin(a), cos(a)); \n}\n\nvec2 map(vec3 p, float time) {\n    vec2 id = floor(p.xz + 0.5);\n    vec3 q = p;\n    q.x = fract(p.x + 0.5) - 0.5; \n    q.z = fract(p.z + 0.5) - 0.5;\n    float localTime = time * speed - length(id) * waveSpread;\n    float phase = fract(localTime * waveFreq);\n    float flipProgress = smoothstep(0.0, 0.25, phase);\n    float angle = (floor(localTime * waveFreq) + flipProgress) * 3.14159;\n    float activeFlip = sin(flipProgress * 3.14159);\n    float dir = (id.x >= 0.0) ? -1.0 : 1.0;\n    q.x -= activeFlip * jumpHeight * 1.5 * dir;\n    q.y -= activeFlip * jumpHeight;\n    q.xy = rot(angle * dir) * q.xy;\n    vec3 d = abs(q) - vec3(0.48 - activeFlip * 0.2, 0.15, 0.48 - activeFlip * 0.2);\n    float tiles = min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, vec3(0.0)));\n    return (tiles < p.y + 0.6) ? vec2(tiles, 1.0) : vec2(p.y + 0.6, 0.0);\n}\n\nvec3 getNormal(vec3 p, float time) {\n    vec2 e = vec2(0.01, 0.0);\n    return normalize(vec3(\n        map(p + e.xyy, time).x - map(p - e.xyy, time).x,\n        map(p + e.yxy, time).x - map(p - e.yxy, time).x,\n        map(p + e.yyx, time).x - map(p - e.yyx, time).x\n    ));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 p = (uv - 0.5) * 2.0;\n    p.x *= resolution.x / resolution.y;\n    p /= 0.9;\n    vec3 ro = vec3(0.0, gridSize, 0.001);\n    vec3 rd = normalize(vec3(p.x, -2.2, p.y));\n    float t = 0.0;\n    float maxDist = gridSize * 3.0;\n    vec2 res = vec2(0.0);\n    for(int i = 0; i < 40; i++) {\n        res = map(ro + rd * t, time);\n        if(res.x < 0.005 || t > maxDist) break;\n        t += res.x * 0.8;\n    }\n    if(t >= maxDist) return vec4(0.0, 0.0, 0.0, 1.0);\n    vec3 pos = ro + rd * t;\n    vec3 nor = getNormal(pos, time);\n    float dif = max(dot(nor, normalize(vec3(0.6, 1.0, -0.4))), 0.0);\n    vec3 col = planeColor;\n    if (res.y > 0.5) {\n        vec2 id = floor(pos.xz + 0.5);\n        vec2 finalUV = (id + (pos.xz - id)) / gridSize;\n        finalUV.x /= (resolution.x / resolution.y);\n        vec3 texCol = texture2D(tex, finalUV + 0.5).rgb;\n        float localTime = time * speed - length(id) * waveSpread;\n        float phase = fract(localTime * waveFreq);\n        float flipIndex = floor(localTime * waveFreq) - (phase < 0.25 ? 1.0 : 0.0);\n        vec3 tint = vec3(node_rand(vec2(flipIndex, 1.1)), node_rand(vec2(flipIndex, 2.2)), node_rand(vec2(flipIndex, 3.3)));\n        \n        // Use world normal Y so the top face is always the active image face, \n        // and the physical face changes when the cube flips.\n        col = mix(texCol * (tint * 1.5 + 0.2), texCol, smoothstep(0.5, 0.9, nor.y));\n    }\n    col *= (dif * 0.7 + max(dot(nor, rd), 0.0) * 0.6 + 0.3);\n    return vec4(mix(col, vec3(0.0), smoothstep(maxDist * 0.5, maxDist, t)), 1.0);\n}",
    "uniformValues": {
      "speed": 0.59,
      "waveFreq": 0.176,
      "waveSpread": 0.195,
      "jumpHeight": 0,
      "gridSize": 22.07,
      "planeColor": [
        0.0392156862745098,
        0.0392156862745098,
        0.043137254901960784
      ]
    }
  },
  {
    "id": "recovered_timeline_43e35479_e42c_4329_ba4f_af4e9c848932",
    "name": "Smooth Flip & Rotate Hexagons 3D",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-43e35479-e42c-4329-ba4f-af4e9c848932 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Smooth Flip & Rotate Hexagons 3D\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float waveFreq; // @min 0.1 @max 2.0 @default 0.4\nuniform float waveSpread; // @min 0.1 @max 2.0 @default 0.3\nuniform float jumpHeight; // @min 0.0 @max 3.0 @default 0.0\nuniform float gridSize; // @min 1.0 @max 50.0 @default 13.0\nuniform float roundness; // @min 0.0 @max 0.2 @default 0.08\nuniform vec3 planeColor; // @default 0.1,0.1,0.15\n\nmat2 rot(float a) { \n    return mat2(cos(a), -sin(a), sin(a), cos(a)); \n}\n\nvec4 hexGrid(vec2 p) {\n    vec2 r = vec2(1.0, 1.7320508);\n    vec2 h = r * 0.5;\n    vec2 a = mod(p, r) - h;\n    vec2 b = mod(p - h, r) - h;\n    return dot(a, a) < dot(b, b) ? vec4(a, p - a) : vec4(b, p - b);\n}\n\nvec2 map(vec3 p, float time) {\n    vec4 hg = hexGrid(p.xz);\n    vec2 id = hg.zw;\n    vec3 q = vec3(hg.x, p.y, hg.y);\n    \n    float localTime = time * speed - length(id) * waveSpread;\n    float phase = fract(localTime * waveFreq);\n    float flip = smoothstep(0.0, 0.25, phase);\n    float angle = (floor(localTime * waveFreq) + flip) * 3.14159;\n    float activeFlip = sin(flip * 3.14159);\n    \n    float dir = sign(id.x + 0.0001);\n    if (dir == 0.0) dir = 1.0;\n    \n    q.x -= activeFlip * jumpHeight * 1.5 * dir;\n    q.y -= activeFlip * jumpHeight;\n    \n    // Flip over\n    q.xy = rot(angle * dir) * q.xy;\n    // Rotate around vertical axis\n    q.xz = rot(angle * dir * 2.0) * q.xz;\n    \n    vec3 absq = abs(q);\n    float r = roundness;\n    float d1 = max(absq.z * 0.866025 + absq.x * 0.5, absq.x) - (0.48 - activeFlip * 0.2) + r;\n    float d2 = absq.y - 0.15 + r;\n    float tiles = min(max(d1, d2), 0.0) + length(max(vec2(d1, d2), 0.0)) - r;\n    \n    return (tiles < p.y + 0.6) ? vec2(tiles, 1.0) : vec2(p.y + 0.6, 0.0);\n}\n\nvec3 getNormal(vec3 p, float time) {\n    vec2 e = vec2(0.01, 0.0);\n    return normalize(vec3(\n        map(p + e.xyy, time).x - map(p - e.xyy, time).x,\n        map(p + e.yxy, time).x - map(p - e.yxy, time).x,\n        map(p + e.yyx, time).x - map(p - e.yyx, time).x\n    ));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 p = (uv - 0.5) * 2.0;\n    p.x *= resolution.x / resolution.y;\n    p /= 0.9; // Hardcoded zoom value\n    \n    vec3 ro = vec3(0.0, gridSize, 0.001);\n    vec3 rd = normalize(vec3(p.x, -2.2, p.y));\n    float t = 0.0, maxDist = gridSize * 3.0;\n    vec2 res = vec2(0.0);\n    \n    for(int i = 0; i < 40; i++) {\n        res = map(ro + rd * t, time);\n        if(res.x < 0.005 || t > maxDist) break;\n        t += res.x * 0.8;\n    }\n    \n    if(t >= maxDist) return vec4(0.0, 0.0, 0.0, 1.0);\n    \n    vec3 pos = ro + rd * t;\n    vec3 nor = getNormal(pos, time);\n    float dif = max(dot(nor, normalize(vec3(0.6, 1.0, -0.4))), 0.0);\n    vec3 col = planeColor;\n    \n    if (res.y > 0.5) {\n        vec4 hg = hexGrid(pos.xz);\n        vec2 id = hg.zw;\n        vec2 finalUV = (id + hg.xy) / gridSize;\n        finalUV.x /= (resolution.x / resolution.y);\n        vec3 texCol = texture2D(tex, finalUV + 0.5).rgb;\n        \n        float localTime = time * speed - length(id) * waveSpread;\n        float phase = fract(localTime * waveFreq);\n        float angle = (floor(localTime * waveFreq) + smoothstep(0.0, 0.25, phase)) * 3.14159;\n        \n        float dir = sign(id.x + 0.0001);\n        if (dir == 0.0) dir = 1.0;\n        \n        vec2 localNorXY = rot(angle * dir) * nor.xy;\n        col = mix(texCol * 0.4, texCol, smoothstep(0.5, 0.9, localNorXY.y));\n    }\n    \n    col *= (dif * 0.7 + max(dot(nor, rd), 0.0) * 0.6 + 0.3);\n    return vec4(mix(col, vec3(0.0), smoothstep(maxDist * 0.5, maxDist, t)), 1.0);\n}",
    "uniformValues": {
      "speed": 1.5,
      "waveFreq": 0.4,
      "waveSpread": 0.3,
      "jumpHeight": 0.9,
      "gridSize": 32.36,
      "roundness": 0.08,
      "planeColor": [
        0.1,
        0.1,
        0.15
      ]
    }
  },
  {
    "id": "recovered_timeline_c5a7d912_d516_4fc9_a50a_d0c874d873f1",
    "name": "Flipping Hexagons",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-c5a7d912-d516-4fc9-a50a-d0c874d873f1 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Flipping Hexagons\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float waveFreq; // @min 0.1 @max 2.0 @default 0.4\nuniform float waveSpread; // @min 0.1 @max 2.0 @default 0.3\nuniform float jumpHeight; // @min 0.0 @max 3.0 @default 1.2\nuniform float gridSize; // @min 1.0 @max 50.0 @default 13.0\nuniform vec3 planeColor; // @default 0.1,0.1,0.15\nuniform float contrast; // @min 0.0 @max 3.0 @default 1.0\nuniform float luminosity; // @min -1.0 @max 1.0 @default 0.0\n\nmat2 rot(float a) { \n    return mat2(cos(a), -sin(a), sin(a), cos(a)); \n}\n\nvec4 hexGrid(vec2 p) {\n    vec2 r = vec2(1.0, 1.7320508);\n    vec2 h = r * 0.5;\n    vec2 a = mod(p, r) - h;\n    vec2 b = mod(p - h, r) - h;\n    if (dot(a, a) < dot(b, b)) return vec4(a, p - a);\n    return vec4(b, p - b);\n}\n\nvec2 map(vec3 p, float time) {\n    vec4 hg = hexGrid(p.xz);\n    vec2 id = hg.zw;\n    vec3 q = p;\n    q.x = hg.x;\n    q.z = hg.y;\n    \n    float localTime = time * speed - length(id) * waveSpread;\n    float phase = fract(localTime * waveFreq);\n    float flipProgress = smoothstep(0.0, 0.25, phase);\n    float angle = (floor(localTime * waveFreq) + flipProgress) * 3.14159;\n    float activeFlip = sin(flipProgress * 3.14159);\n    \n    // Use -0.25 to avoid floating point precision issues exactly at x = 0.0\n    float dir = (id.x > -0.25) ? -1.0 : 1.0;\n    q.x -= activeFlip * jumpHeight * 1.5 * dir;\n    q.y -= activeFlip * jumpHeight;\n    q.xy = rot(angle * dir) * q.xy;\n    \n    vec3 absq = abs(q);\n    float d1 = max(absq.z * 0.866025 + absq.x * 0.5, absq.x) - (0.48 - activeFlip * 0.2);\n    float d2 = absq.y - 0.15;\n    float tiles = min(max(d1, d2), 0.0) + length(max(vec2(d1, d2), 0.0));\n    \n    return (tiles < p.y + 0.6) ? vec2(tiles, 1.0) : vec2(p.y + 0.6, 0.0);\n}\n\nvec3 getNormal(vec3 p, float time) {\n    vec2 e = vec2(0.01, 0.0);\n    return normalize(vec3(\n        map(p + e.xyy, time).x - map(p - e.xyy, time).x,\n        map(p + e.yxy, time).x - map(p - e.yxy, time).x,\n        map(p + e.yyx, time).x - map(p - e.yyx, time).x\n    ));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 p = (uv - 0.5) * 2.0;\n    p.x *= resolution.x / resolution.y;\n    p /= 0.9;\n    \n    vec3 ro = vec3(0.0, gridSize, 0.001);\n    vec3 rd = normalize(vec3(p.x, -2.2, p.y));\n    float t = 0.0, maxDist = gridSize * 3.0;\n    vec2 res = vec2(0.0);\n    \n    for(int i = 0; i < 40; i++) {\n        res = map(ro + rd * t, time);\n        if(res.x < 0.005 || t > maxDist) break;\n        t += res.x * 0.8;\n    }\n    \n    if(t >= maxDist) return vec4(0.0, 0.0, 0.0, 1.0);\n    \n    vec3 pos = ro + rd * t;\n    vec3 nor = getNormal(pos, time);\n    float dif = max(dot(nor, normalize(vec3(0.6, 1.0, -0.4))), 0.0);\n    vec3 col = planeColor;\n    \n    if (res.y > 0.5) {\n        vec4 hg = hexGrid(pos.xz);\n        vec2 id = hg.zw;\n        vec2 finalUV = (id + hg.xy) / gridSize;\n        finalUV.x /= (resolution.x / resolution.y);\n        vec3 texCol = texture2D(tex, finalUV + 0.5).rgb;\n        \n        texCol = clamp((texCol - 0.5) * contrast + 0.5 + luminosity, 0.0, 1.0);\n        \n        float localTime = time * speed - length(id) * waveSpread;\n        float phase = fract(localTime * waveFreq);\n        float angle = (floor(localTime * waveFreq) + smoothstep(0.0, 0.25, phase)) * 3.14159;\n        \n        // Use -0.25 to avoid floating point precision issues exactly at x = 0.0\n        float dir = (id.x > -0.25) ? -1.0 : 1.0;\n        \n        float flipIndex = floor((localTime * waveFreq + 0.5) * 0.5);\n        vec3 tint = vec3(node_rand(vec2(flipIndex, 1.1)), node_rand(vec2(flipIndex, 2.2)), node_rand(vec2(flipIndex, 3.3)));\n        vec2 localNorXY = rot(angle * dir) * nor.xy;\n        col = mix(texCol * (tint * 1.5 + 0.2), texCol, smoothstep(0.5, 0.9, localNorXY.y));\n    }\n    \n    col *= (dif * 0.7 + max(dot(nor, rd), 0.0) * 0.6 + 0.3);\n    return vec4(mix(col, vec3(0.0), smoothstep(maxDist * 0.5, maxDist, t)), 1.0);\n}",
    "uniformValues": {
      "speed": 0.247,
      "waveFreq": 1.183,
      "waveSpread": 1.069,
      "jumpHeight": 0.03,
      "gridSize": 25.01,
      "planeColor": [
        0.0392156862745098,
        0.0392156862745098,
        0.0392156862745098
      ],
      "contrast": 1,
      "luminosity": 0
    }
  },
  {
    "id": "recovered_timeline_e162f45a_cb0e_492a_a56a_f9a98a372eb0",
    "name": "Flip & Rotate Hexagons 3D",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-e162f45a-cb0e-492a-a56a-f9a98a372eb0 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Flip & Rotate Hexagons 3D\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float waveFreq; // @min 0.1 @max 2.0 @default 0.4\nuniform float waveSpread; // @min 0.1 @max 2.0 @default 0.3\nuniform float jumpHeight; // @min 0.0 @max 3.0 @default 1.2\nuniform float gridSize; // @min 1.0 @max 50.0 @default 13.0\nuniform vec3 planeColor; // @default 0.1,0.1,0.15\n\nmat2 rot(float a) { \n    return mat2(cos(a), -sin(a), sin(a), cos(a)); \n}\n\nvec4 hexGrid(vec2 p) {\n    vec2 r = vec2(1.0, 1.7320508);\n    vec2 h = r * 0.5;\n    vec2 a = mod(p, r) - h;\n    vec2 b = mod(p - h, r) - h;\n    return dot(a, a) < dot(b, b) ? vec4(a, p - a) : vec4(b, p - b);\n}\n\nvec2 map(vec3 p, float time) {\n    vec4 hg = hexGrid(p.xz);\n    vec2 id = hg.zw;\n    vec3 q = vec3(hg.x, p.y, hg.y);\n    \n    float localTime = time * speed - length(id) * waveSpread;\n    float phase = fract(localTime * waveFreq);\n    float flip = smoothstep(0.0, 0.25, phase);\n    float angle = (floor(localTime * waveFreq) + flip) * 3.14159;\n    float activeFlip = sin(flip * 3.14159);\n    \n    float dir = sign(id.x + 0.0001);\n    if (dir == 0.0) dir = 1.0;\n    \n    q.x -= activeFlip * jumpHeight * 1.5 * dir;\n    q.y -= activeFlip * jumpHeight;\n    \n    // Flip over\n    q.xy = rot(angle * dir) * q.xy;\n    // Rotate around vertical axis\n    q.xz = rot(angle * dir * 2.0) * q.xz;\n    \n    vec3 absq = abs(q);\n    float d1 = max(absq.z * 0.866025 + absq.x * 0.5, absq.x) - (0.48 - activeFlip * 0.2);\n    float d2 = absq.y - 0.15;\n    float tiles = min(max(d1, d2), 0.0) + length(max(vec2(d1, d2), 0.0));\n    \n    return (tiles < p.y + 0.6) ? vec2(tiles, 1.0) : vec2(p.y + 0.6, 0.0);\n}\n\nvec3 getNormal(vec3 p, float time) {\n    vec2 e = vec2(0.01, 0.0);\n    return normalize(vec3(\n        map(p + e.xyy, time).x - map(p - e.xyy, time).x,\n        map(p + e.yxy, time).x - map(p - e.yxy, time).x,\n        map(p + e.yyx, time).x - map(p - e.yyx, time).x\n    ));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 p = (uv - 0.5) * 2.0;\n    p.x *= resolution.x / resolution.y;\n    p /= 0.9; // Hardcoded zoom value\n    \n    vec3 ro = vec3(0.0, gridSize, 0.001);\n    vec3 rd = normalize(vec3(p.x, -2.2, p.y));\n    float t = 0.0, maxDist = gridSize * 3.0;\n    vec2 res = vec2(0.0);\n    \n    for(int i = 0; i < 40; i++) {\n        res = map(ro + rd * t, time);\n        if(res.x < 0.005 || t > maxDist) break;\n        t += res.x * 0.8;\n    }\n    \n    if(t >= maxDist) return vec4(0.0, 0.0, 0.0, 1.0);\n    \n    vec3 pos = ro + rd * t;\n    vec3 nor = getNormal(pos, time);\n    float dif = max(dot(nor, normalize(vec3(0.6, 1.0, -0.4))), 0.0);\n    vec3 col = planeColor;\n    \n    if (res.y > 0.5) {\n        vec4 hg = hexGrid(pos.xz);\n        vec2 id = hg.zw;\n        vec2 finalUV = (id + hg.xy) / gridSize;\n        finalUV.x /= (resolution.x / resolution.y);\n        vec3 texCol = texture2D(tex, finalUV + 0.5).rgb;\n        \n        float localTime = time * speed - length(id) * waveSpread;\n        float phase = fract(localTime * waveFreq);\n        float angle = (floor(localTime * waveFreq) + smoothstep(0.0, 0.25, phase)) * 3.14159;\n        \n        float dir = sign(id.x + 0.0001);\n        if (dir == 0.0) dir = 1.0;\n        \n        vec2 localNorXY = rot(angle * dir) * nor.xy;\n        col = mix(texCol * 0.4, texCol, smoothstep(0.5, 0.9, localNorXY.y));\n    }\n    \n    col *= (dif * 0.7 + max(dot(nor, rd), 0.0) * 0.6 + 0.3);\n    return vec4(mix(col, vec3(0.0), smoothstep(maxDist * 0.5, maxDist, t)), 1.0);\n}",
    "uniformValues": {
      "speed": 0.541,
      "waveFreq": 0.1,
      "waveSpread": 0.3,
      "jumpHeight": 0,
      "gridSize": 25.01,
      "planeColor": [
        0.00784313725490196,
        0.00784313725490196,
        0.011764705882352941
      ]
    }
  },
  {
    "id": "recovered_timeline_f9abab5a_10eb_45f1_9024_753401ce3fe8",
    "name": "Smooth Flip & Rotate Hexagons 3D 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-f9abab5a-10eb-45f1-9024-753401ce3fe8 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Smooth Flip & Rotate Hexagons 3D\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float waveFreq; // @min 0.1 @max 2.0 @default 0.4\nuniform float waveSpread; // @min 0.1 @max 2.0 @default 0.3\nuniform float jumpHeight; // @min 0.0 @max 3.0 @default 1.2\nuniform float gridSize; // @min 1.0 @max 50.0 @default 13.0\nuniform float roundness; // @min 0.0 @max 0.2 @default 0.08\nuniform vec3 planeColor; // @default 0.1,0.1,0.15\n\nmat2 rot(float a) { \n    return mat2(cos(a), -sin(a), sin(a), cos(a)); \n}\n\nvec4 hexGrid(vec2 p) {\n    vec2 r = vec2(1.0, 1.7320508);\n    vec2 h = r * 0.5;\n    vec2 a = mod(p, r) - h;\n    vec2 b = mod(p - h, r) - h;\n    return dot(a, a) < dot(b, b) ? vec4(a, p - a) : vec4(b, p - b);\n}\n\nvec2 map(vec3 p, float time) {\n    vec4 hg = hexGrid(p.xz);\n    vec2 id = hg.zw;\n    vec3 q = vec3(hg.x, p.y, hg.y);\n    \n    float localTime = time * speed - length(id) * waveSpread;\n    float phase = fract(localTime * waveFreq);\n    float flip = smoothstep(0.0, 0.25, phase);\n    float angle = (floor(localTime * waveFreq) + flip) * 3.14159;\n    float activeFlip = sin(flip * 3.14159);\n    \n    float dir = sign(id.x + 0.0001);\n    if (dir == 0.0) dir = 1.0;\n    \n    q.x -= activeFlip * jumpHeight * 1.5 * dir;\n    q.y -= activeFlip * jumpHeight;\n    \n    // Flip over\n    q.xy = rot(angle * dir) * q.xy;\n    // Rotate around vertical axis\n    q.xz = rot(angle * dir * 2.0) * q.xz;\n    \n    vec3 absq = abs(q);\n    float r = roundness;\n    float d1 = max(absq.z * 0.866025 + absq.x * 0.5, absq.x) - (0.48 - activeFlip * 0.2) + r;\n    float d2 = absq.y - 0.15 + r;\n    float tiles = min(max(d1, d2), 0.0) + length(max(vec2(d1, d2), 0.0)) - r;\n    \n    return (tiles < p.y + 0.6) ? vec2(tiles, 1.0) : vec2(p.y + 0.6, 0.0);\n}\n\nvec3 getNormal(vec3 p, float time) {\n    vec2 e = vec2(0.01, 0.0);\n    return normalize(vec3(\n        map(p + e.xyy, time).x - map(p - e.xyy, time).x,\n        map(p + e.yxy, time).x - map(p - e.yxy, time).x,\n        map(p + e.yyx, time).x - map(p - e.yyx, time).x\n    ));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 p = (uv - 0.5) * 2.0;\n    p.x *= resolution.x / resolution.y;\n    \n    float zoom = 0.9;\n    p /= zoom;\n    \n    vec3 ro = vec3(0.0, gridSize, 0.001);\n    vec3 rd = normalize(vec3(p.x, -2.2, p.y));\n    float t = 0.0, maxDist = gridSize * 3.0;\n    vec2 res = vec2(0.0);\n    \n    for(int i = 0; i < 40; i++) {\n        res = map(ro + rd * t, time);\n        if(res.x < 0.005 || t > maxDist) break;\n        t += res.x * 0.8;\n    }\n    \n    if(t >= maxDist) return vec4(0.0, 0.0, 0.0, 1.0);\n    \n    vec3 pos = ro + rd * t;\n    vec3 nor = getNormal(pos, time);\n    float dif = max(dot(nor, normalize(vec3(0.6, 1.0, -0.4))), 0.0);\n    vec3 col = planeColor;\n    \n    if (res.y > 0.5) {\n        vec4 hg = hexGrid(pos.xz);\n        vec2 id = hg.zw;\n        vec2 finalUV = (id + hg.xy) / gridSize;\n        finalUV.x /= (resolution.x / resolution.y);\n        vec3 texCol = texture2D(tex, finalUV + 0.5).rgb;\n        \n        float localTime = time * speed - length(id) * waveSpread;\n        float phase = fract(localTime * waveFreq);\n        float angle = (floor(localTime * waveFreq) + smoothstep(0.0, 0.25, phase)) * 3.14159;\n        \n        float dir = sign(id.x + 0.0001);\n        if (dir == 0.0) dir = 1.0;\n        \n        vec2 localNorXY = rot(angle * dir) * nor.xy;\n        col = mix(texCol * 0.4, texCol, smoothstep(0.5, 0.9, localNorXY.y));\n    }\n    \n    col *= (dif * 0.7 + max(dot(nor, rd), 0.0) * 0.6 + 0.3);\n    return vec4(mix(col, vec3(0.0), smoothstep(maxDist * 0.5, maxDist, t)), 1.0);\n}",
    "uniformValues": {
      "speed": 0.296,
      "waveFreq": 1.905,
      "waveSpread": 1.069,
      "jumpHeight": 0,
      "gridSize": 17.66,
      "roundness": 0.186,
      "planeColor": [
        0.011764705882352941,
        0.011764705882352941,
        0.011764705882352941
      ]
    }
  },
  {
    "id": "recovered_timeline_3787fb89_0fac_4ab3_9369_d74ed21689b0",
    "name": "Flipping Hexagons 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-3787fb89-0fac-4ab3-9369-d74ed21689b0 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Flipping Hexagons\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float waveFreq; // @min 0.1 @max 2.0 @default 0.4\nuniform float waveSpread; // @min 0.1 @max 2.0 @default 0.3\nuniform float jumpHeight; // @min 0.0 @max 3.0 @default 1.2\nuniform float gridSize; // @min 1.0 @max 50.0 @default 13.0\nuniform vec3 planeColor; // @default 0.1,0.1,0.15\nuniform float contrast; // @min 0.0 @max 3.0 @default 1.0\nuniform float luminosity; // @min -1.0 @max 1.0 @default 0.0\n\nmat2 rot(float a) { \n    return mat2(cos(a), -sin(a), sin(a), cos(a)); \n}\n\nvec4 hexGrid(vec2 p) {\n    vec2 r = vec2(1.0, 1.7320508);\n    vec2 h = r * 0.5;\n    vec2 a = mod(p, r) - h;\n    vec2 b = mod(p - h, r) - h;\n    if (dot(a, a) < dot(b, b)) return vec4(a, p - a);\n    return vec4(b, p - b);\n}\n\nvec2 map(vec3 p, float time) {\n    vec4 hg = hexGrid(p.xz);\n    vec2 id = hg.zw;\n    vec3 q = p;\n    q.x = hg.x;\n    q.z = hg.y;\n    \n    float localTime = time * speed - length(id) * waveSpread;\n    float phase = fract(localTime * waveFreq);\n    float flipProgress = smoothstep(0.0, 0.25, phase);\n    float angle = (floor(localTime * waveFreq) + flipProgress) * 3.14159;\n    float activeFlip = sin(flipProgress * 3.14159);\n    \n    // Use -0.25 to avoid floating point precision issues exactly at x = 0.0\n    float dir = (id.x > -0.25) ? -1.0 : 1.0;\n    q.x -= activeFlip * jumpHeight * 1.5 * dir;\n    q.y -= activeFlip * jumpHeight;\n    q.xy = rot(angle * dir) * q.xy;\n    \n    vec3 absq = abs(q);\n    float d1 = max(absq.z * 0.866025 + absq.x * 0.5, absq.x) - (0.48 - activeFlip * 0.2);\n    float d2 = absq.y - 0.15;\n    float tiles = min(max(d1, d2), 0.0) + length(max(vec2(d1, d2), 0.0));\n    \n    return (tiles < p.y + 0.6) ? vec2(tiles, 1.0) : vec2(p.y + 0.6, 0.0);\n}\n\nvec3 getNormal(vec3 p, float time) {\n    vec2 e = vec2(0.01, 0.0);\n    return normalize(vec3(\n        map(p + e.xyy, time).x - map(p - e.xyy, time).x,\n        map(p + e.yxy, time).x - map(p - e.yxy, time).x,\n        map(p + e.yyx, time).x - map(p - e.yyx, time).x\n    ));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 p = (uv - 0.5) * 2.0;\n    p.x *= resolution.x / resolution.y;\n    p /= 0.9;\n    \n    vec3 ro = vec3(0.0, gridSize, 0.001);\n    vec3 rd = normalize(vec3(p.x, -2.2, p.y));\n    float t = 0.0, maxDist = gridSize * 3.0;\n    vec2 res = vec2(0.0);\n    \n    for(int i = 0; i < 40; i++) {\n        res = map(ro + rd * t, time);\n        if(res.x < 0.005 || t > maxDist) break;\n        t += res.x * 0.8;\n    }\n    \n    if(t >= maxDist) return vec4(0.0, 0.0, 0.0, 1.0);\n    \n    vec3 pos = ro + rd * t;\n    vec3 nor = getNormal(pos, time);\n    float dif = max(dot(nor, normalize(vec3(0.6, 1.0, -0.4))), 0.0);\n    vec3 col = planeColor;\n    \n    if (res.y > 0.5) {\n        vec4 hg = hexGrid(pos.xz);\n        vec2 id = hg.zw;\n        vec2 finalUV = (id + hg.xy) / gridSize;\n        finalUV.x /= (resolution.x / resolution.y);\n        vec3 texCol = texture2D(tex, finalUV + 0.5).rgb;\n        \n        texCol = clamp((texCol - 0.5) * contrast + 0.5 + luminosity, 0.0, 1.0);\n        \n        float localTime = time * speed - length(id) * waveSpread;\n        float phase = fract(localTime * waveFreq);\n        float angle = (floor(localTime * waveFreq) + smoothstep(0.0, 0.25, phase)) * 3.14159;\n        \n        // Use -0.25 to avoid floating point precision issues exactly at x = 0.0\n        float dir = (id.x > -0.25) ? -1.0 : 1.0;\n        \n        float flipIndex = floor((localTime * waveFreq + 0.5) * 0.5);\n        vec3 tint = vec3(node_rand(vec2(flipIndex, 1.1)), node_rand(vec2(flipIndex, 2.2)), node_rand(vec2(flipIndex, 3.3)));\n        vec2 localNorXY = rot(angle * dir) * nor.xy;\n        col = mix(texCol * (tint * 1.5 + 0.2), texCol, smoothstep(0.5, 0.9, localNorXY.y));\n    }\n    \n    col *= (dif * 0.7 + max(dot(nor, rd), 0.0) * 0.6 + 0.3);\n    return vec4(mix(col, vec3(0.0), smoothstep(maxDist * 0.5, maxDist, t)), 1.0);\n}",
    "uniformValues": {
      "speed": 0.247,
      "waveFreq": 1.183,
      "waveSpread": 1.069,
      "jumpHeight": 0.03,
      "gridSize": 25.01,
      "planeColor": [
        0.23921568627450981,
        0.0196078431372549,
        0.0196078431372549
      ],
      "contrast": 1,
      "luminosity": 0
    }
  },
  {
    "id": "recovered_timeline_6c17a77d_43e4_4bec_bccc_3a27687d8d4b",
    "name": "Curvature Blob Inversion",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-6c17a77d-43e4-4bec-bccc-3a27687d8d4b in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Curvature Blob Inversion\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform float distortion; // @min 0.0 @max 0.1 @default 0.02\nuniform float heightScale; // @min 1.0 @max 20.0 @default 10.0\nuniform vec3 tint; // @default 0.1,0.5,0.9\nuniform float blobIntensity; // @min 0.0 @max 5.0 @default 1.5\nuniform float colorSpeed; // @min 0.0 @max 5.0 @default 1.0\nuniform float hideTolerance; // @min 0.0 @max 1.0 @default 0.2\n\nfloat getHeight(sampler2D tex, vec2 uv) {\n    vec4 c = texture2D(tex, uv);\n    return dot(c.rgb, vec3(0.299, 0.587, 0.114));\n}\n\nvec3 getNormal(sampler2D tex, vec2 uv, vec2 res, float hScale) {\n    vec2 e = vec2(1.0 / res.x, 1.0 / res.y);\n    float hx = getHeight(tex, uv + vec2(e.x, 0.0)) - getHeight(tex, uv - vec2(e.x, 0.0));\n    float hy = getHeight(tex, uv + vec2(0.0, e.y)) - getHeight(tex, uv - vec2(0.0, e.y));\n    return normalize(vec3(-hx * hScale, -hy * hScale, 1.0));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    vec3 nor = getNormal(tex, uv, resolution, heightScale);\n    vec2 distUv = uv + nor.xy * distortion * sin(time * 2.0);\n    \n    vec2 p = distUv * scale;\n    float t = time * speed;\n    float n = 0.0;\n    vec2 q = p;\n    mat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\n    float amp = 1.0;\n    float sumAmp = 0.0;\n\n    for(int i = 0; i < 3; i++) {\n        vec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\n        float noiseVal = node_noise(q + tOffset + lum * 1.5);\n        float angle = noiseVal * 6.2831;\n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        q = rot * q * 1.3; \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    n /= sumAmp;\n\n    float branch = smoothstep(0.3, 0.7, n);\n    float topo = sin((lum * 2.0 + n) * lineDensity) * 0.5 + 0.5;\n    vec3 reliefColor = mix(vec3(0.2, 0.9, 0.6), vec3(0.8, 0.3, 0.7), branch) * topo;\n    \n    float diff = max(dot(nor, normalize(vec3(1.0, 1.0, 1.0))), 0.0);\n    reliefColor += vec3(0.85, 0.80, 0.70) * diff * 0.5;\n\n    vec2 symUv = abs(distUv - 0.5);\n    vec2 uvWrap = symUv * 12.56637;\n    vec2 flow = vec2(sin(uvWrap.x * 2.0 + cos(uvWrap.y * 2.0 + t)), cos(uvWrap.y * 2.0 + sin(uvWrap.x * 2.0 - t))) * 0.375;\n    \n    float blobNoise = sin(uvWrap.x * 3.0 + flow.x * 5.0 + t * 1.5) * cos(uvWrap.y * 3.0 + flow.y * 5.0 - t * 1.2);\n    float phase = lum + blobNoise * 0.5 + flow.x * 0.5 + flow.y * 0.5 - t * 0.5;\n    \n    vec3 psychColor = 0.5 + 0.5 * cos(6.28318 * (vec3(phase) + tint + vec3(0.02, 0.20, 0.38)));\n    vec3 psychColor2 = 0.5 + 0.5 * cos(6.28318 * (vec3(phase) + tint + vec3(0.38, 0.20, 0.02)));\n    \n    vec2 blobPos = vec2(sin(t * 0.8) * 0.25, cos(t * 0.9) * 0.25);\n    vec2 symY = vec2(abs(distUv.x - 0.5), distUv.y - 0.5) - blobPos;\n    float blobMask = smoothstep(0.4, 0.0, length(symY));\n    \n    vec2 blobPos2 = vec2(sin(t * 0.7 + 3.14) * 0.3, cos(t * 0.8 + 3.14) * 0.3);\n    vec2 symY2 = vec2(abs(distUv.x - 0.5), distUv.y - 0.5) - blobPos2;\n    float blobMask2 = smoothstep(0.4, 0.0, length(symY2));\n    \n    float isNotDark = smoothstep(0.05, 0.2, lum);\n    vec3 softInvert = mix(reliefColor, 1.0 - reliefColor, 0.8);\n    \n    vec3 invertedAreaColor = softInvert + psychColor2 * blobMask2 * blobIntensity;\n    vec3 normalAreaColor = reliefColor + psychColor * blobMask * blobIntensity;\n    \n    vec3 effectColor = mix(invertedAreaColor, normalAreaColor, blobMask);\n    vec3 finalColor = mix(source.rgb, effectColor, isNotDark);\n    \n    vec3 targetColor = 0.5 + 0.5 * cos(time * colorSpeed + vec3(0.0, 2.094, 4.188));\n    float colorDist = distance(source.rgb, targetColor);\n    float hideMask = smoothstep(hideTolerance, hideTolerance + 0.15, colorDist);\n    \n    return vec4(clamp(finalColor, 0.0, 1.0) * hideMask, source.a * hideMask);\n}",
    "uniformValues": {
      "speed": 0.8,
      "scale": 6.14,
      "lineDensity": 20,
      "distortion": 0.016,
      "heightScale": 20,
      "tint": [
        0.30980392156862746,
        0.15294117647058825,
        0.29411764705882354
      ],
      "blobIntensity": 1.5,
      "colorSpeed": 1,
      "hideTolerance": 0.2
    }
  },
  {
    "id": "recovered_timeline_25097c40_7668_41ee_b129_5f404f2b48ec",
    "name": "Psych Gold Relief & Inversion",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-25097c40-7668-41ee-b129-5f404f2b48ec in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psych Gold Relief & Inversion\nuniform float distortion; // @min 0.0 @max 0.1 @default 0.02\nuniform float heightScale; // @min 1.0 @max 20.0 @default 10.0\nuniform float animSpeed; // @min 0.0 @max 5.0 @default 1.0\nuniform float blobIntensity; // @min 0.0 @max 5.0 @default 1.5\nuniform float hideTolerance; // @min 0.0 @max 1.0 @default 0.2\nuniform vec3 tint; // @default 0.1,0.5,0.9\n\nfloat getHeight(sampler2D tex, vec2 uv) {\n    return dot(texture2D(tex, fract(uv)).rgb, vec3(0.299, 0.587, 0.114));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, fract(uv));\n    float luma = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    if (luma < 0.05) {\n        return source;\n    }\n    \n    vec2 e = vec2(1.0 / max(resolution.x, 1.0), 1.0 / max(resolution.y, 1.0));\n    float hx = getHeight(tex, uv + vec2(e.x, 0.0)) - getHeight(tex, uv - vec2(e.x, 0.0));\n    float hy = getHeight(tex, uv + vec2(0.0, e.y)) - getHeight(tex, uv - vec2(0.0, e.y));\n    vec3 nor = normalize(vec3(-hx * heightScale, -hy * heightScale, 1.0));\n    \n    float t = time * animSpeed;\n    vec2 distUv = uv + nor.xy * distortion * sin(t);\n    vec4 distColor = texture2D(tex, fract(distUv));\n    \n    vec3 pos = vec3(uv * 2.0 - 1.0, 0.0);\n    \n    // Blob 1: Psych Light Source\n    vec3 blob1Pos = vec3(sin(t * 1.3) * 0.8, cos(t * 0.9) * 0.8, 1.0);\n    vec3 l1 = normalize(blob1Pos - pos);\n    float dist1 = length(blob1Pos - pos);\n    float atten1 = 1.0 / (1.0 + dist1 * dist1 * 2.0);\n    \n    float diff1 = clamp(dot(nor, l1), 0.0, 1.0);\n    vec3 halfVec = normalize(l1 + vec3(0.0, 0.0, -1.0));\n    float spec1 = pow(clamp(dot(nor, halfVec), 0.0, 1.0), 16.0);\n    \n    vec3 psychColor = 0.5 + 0.5 * cos(6.28318 * (vec3(luma - t * 0.5) + tint));\n    vec3 illum1 = psychColor * (diff1 + spec1) * atten1 * blobIntensity * 2.5;\n    \n    // Blob 2: Inversion Field\n    vec2 blob2Pos = vec2(sin(t * 0.7 + 3.14) * 0.6, cos(t * 0.8 + 3.14) * 0.6);\n    float blob2Mask = smoothstep(0.7, 0.0, length(pos.xy - blob2Pos));\n    \n    // Base Shading\n    vec3 baseLightDir = normalize(vec3(-0.6, 0.7, 0.5));\n    vec3 baseColor = distColor.rgb * (0.3 + 0.7 * clamp(dot(nor, baseLightDir), 0.0, 1.0));\n    \n    vec3 normalArea = baseColor + illum1 * distColor.rgb;\n    vec3 invertedArea = (1.0 - baseColor) + (1.0 - psychColor) * blob2Mask * blobIntensity;\n    \n    vec3 finalColor = mix(normalArea, invertedArea, blob2Mask);\n    \n    // Color Hide Logic\n    vec3 targetColor = 0.5 + 0.5 * cos(t + vec3(0.0, 2.094, 4.188));\n    float hideMask = smoothstep(hideTolerance, hideTolerance + 0.15, distance(source.rgb, targetColor));\n    \n    return vec4(clamp(finalColor, 0.0, 1.0) * hideMask, source.a * hideMask);\n}",
    "uniformValues": {
      "distortion": 0.1,
      "heightScale": 19.62,
      "animSpeed": 0.55,
      "blobIntensity": 1.05,
      "hideTolerance": 0.56,
      "tint": [
        0.023529411764705882,
        0.14901960784313725,
        0.27450980392156865
      ]
    }
  },
  {
    "id": "recovered_timeline_f34f5260_caa9_47f5_ab31_adc8ad67a04f",
    "name": "Moving 3D Luma Automata 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-f34f5260-caa9-47f5-ab31-adc8ad67a04f in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Moving 3D Luma Automata\nuniform float depth; // @min 0.1 @max 10.0 @default 5.0\nuniform float lightIntensity; // @min 0.0 @max 10.0 @default 3.0\nuniform vec3 lightColor; // @default 1.0,1.0,1.0\nuniform float ambientLight; // @min 0.0 @max 1.0 @default 0.05\nuniform float lightZ; // @min 0.01 @max 2.0 @default 0.15\nuniform float specularStrength; // @min 0.0 @max 5.0 @default 1.5\nuniform float lightSpeed; // @min 0.0 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nuniform float blackout; // @min 0.0 @max 1.0 @default 1.0\nuniform float moveSpeed; // @min 0.0 @max 5.0 @default 1.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    vec3 lumaWeights = vec3(0.299, 0.587, 0.114);\n    float lum = dot(source.rgb, lumaWeights);\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    vec3 bgCol = mix(source.rgb, vec3(0.0), blackout);\n    \n    vec2 q = uv * scale;\n    float n = 0.0, amp = 1.0, sumAmp = 0.0;\n    mat2 rot = mat2(0.737, -0.675, 0.675, 0.737);\n\n    for(int i = 0; i < 4; i++) {\n        vec2 tOffset = vec2(sin(float(i) + time * moveSpeed), cos(float(i) + time * moveSpeed));\n        float noiseVal = node_noise(q + tOffset + lum * 1.5 - time * moveSpeed * 0.2);\n        float angle = noiseVal * 6.2831 + time * moveSpeed * 0.5;\n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        q = rot * q * 1.3; \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    n /= sumAmp;\n\n    float branch = smoothstep(0.3, 0.7, n);\n    float lines = smoothstep(0.8, 0.95, sin((lum * 2.0 + n) * lineDensity - time * moveSpeed * 2.0));\n    vec3 effectCol = mix(blobColor, branchColor, branch) + vec3(1.0) * lines * lum * 1.5;\n    vec3 segColor = mix(bgCol, effectCol, mask * branch);\n\n    vec2 eps = 1.0 / resolution;\n    float l = dot(texture2D(tex, uv - vec2(eps.x, 0.0)).rgb, lumaWeights);\n    float r = dot(texture2D(tex, uv + vec2(eps.x, 0.0)).rgb, lumaWeights);\n    float d = dot(texture2D(tex, uv - vec2(0.0, eps.y)).rgb, lumaWeights);\n    float u = dot(texture2D(tex, uv + vec2(0.0, eps.y)).rgb, lumaWeights);\n    vec3 normal = normalize(vec3((r - l) * depth, (u - d) * depth, 1.0));\n    \n    vec3 lightPos = vec3(0.5 + sin(time * lightSpeed) * 0.5, 0.5 + cos(time * lightSpeed) * 0.5, lightZ);\n    vec3 lightDir = normalize(lightPos - vec3(uv, 0.0));\n    vec3 halfDir = normalize(lightDir + vec3(0.0, 0.0, 1.0));\n    \n    float diff = max(dot(normal, lightDir), 0.0);\n    float spec = pow(max(dot(normal, halfDir), 0.0), 32.0) * specularStrength;\n    \n    vec3 finalLight = vec3(ambientLight) + lightColor * lightIntensity * (diff + spec);\n    return vec4(segColor * finalLight, source.a);\n}",
    "uniformValues": {
      "depth": 9.604,
      "lightIntensity": 2.1,
      "lightColor": [
        0.23921568627450981,
        0,
        0.4
      ],
      "ambientLight": 0.31,
      "lightZ": 0.5871,
      "specularStrength": 5,
      "lightSpeed": 1.4,
      "scale": 3.62,
      "threshold": 0.5,
      "lineDensity": 36.05,
      "blobColor": [
        0.8705882352941177,
        0.13725490196078433,
        0.8823529411764706
      ],
      "branchColor": [
        0.9058823529411765,
        0.8745098039215686,
        0.8941176470588236
      ],
      "blackout": 0.78,
      "moveSpeed": 0.95
    }
  },
  {
    "id": "recovered_timeline_d86c7739_2378_4af9_afc4_2e2ae66df976",
    "name": "Psychedelic 3D Automata 2",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-d86c7739-2378-4af9-afc4-2e2ae66df976 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psychedelic 3D Automata\nuniform float depth; // @min 0.1 @max 10.0 @default 5.0\nuniform float lightIntensity; // @min 0.0 @max 10.0 @default 3.0\nuniform vec3 lightColor; // @default 1.0,1.0,1.0\nuniform float ambientLight; // @min 0.0 @max 1.0 @default 0.05\nuniform float lightZ; // @min 0.01 @max 2.0 @default 0.15\nuniform float specularStrength; // @min 0.0 @max 5.0 @default 1.5\nuniform float lightSpeed; // @min 0.0 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform float blackout; // @min 0.0 @max 1.0 @default 1.0\nuniform float psychSpeed; // @min 0.1 @max 5.0 @default 2.0\n\nfloat getLuma(sampler2D tex, vec2 uv) {\n    return dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    vec3 bgCol = mix(source.rgb, vec3(0.0), blackout);\n    \n    // Moving and growing effect\n    float dynamicScale = scale * (1.0 + sin(time * 0.5) * 0.4);\n    vec2 q = uv * dynamicScale + vec2(sin(time * 0.3), cos(time * 0.4));\n    \n    float n = 0.0, amp = 1.0, sumAmp = 0.0;\n    mat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\n\n    // Dynamic automata segmentation logic\n    for(int i = 0; i < 4; i++) {\n        vec2 tOffset = vec2(sin(float(i)), cos(float(i)));\n        float noiseVal = node_noise(q + tOffset + lum * 1.5 + time * 0.5);\n        float angle = noiseVal * 6.2831 + time * 0.2;\n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        q = rot * q * 1.3; \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    n /= sumAmp;\n\n    float branch = smoothstep(0.3, 0.7, n);\n    float lines = smoothstep(0.8, 0.95, sin((lum * 2.0 + n) * lineDensity - time * 3.0));\n    \n    // Super psychedelic color palette\n    vec3 psychColor = 0.5 + 0.5 * cos(time * psychSpeed + uv.xyx * 3.0 + vec3(0.0, 2.0, 4.0) + n * 10.0);\n    vec3 effectCol = psychColor + vec3(1.0) * lines * lum * 1.5;\n    vec3 segColor = mix(bgCol, effectCol, mask * branch);\n\n    // Normal map generation from original image luma\n    vec2 eps = 1.0 / resolution;\n    float l = getLuma(tex, uv - vec2(eps.x, 0.0));\n    float r = getLuma(tex, uv + vec2(eps.x, 0.0));\n    float d = getLuma(tex, uv - vec2(0.0, eps.y));\n    float u = getLuma(tex, uv + vec2(0.0, eps.y));\n    vec3 normal = normalize(vec3((r - l) * depth, (u - d) * depth, 1.0));\n    \n    // 3D Lighting\n    vec3 lightPos = vec3(0.5 + sin(time * lightSpeed) * 0.5, 0.5 + cos(time * lightSpeed) * 0.5, lightZ);\n    vec3 lightDir = normalize(lightPos - vec3(uv, 0.0));\n    vec3 viewDir = vec3(0.0, 0.0, 1.0);\n    vec3 halfDir = normalize(lightDir + viewDir);\n    \n    float diff = max(dot(normal, lightDir), 0.0);\n    float spec = pow(max(dot(normal, halfDir), 0.0), 32.0) * specularStrength;\n    \n    vec3 finalLight = vec3(ambientLight) + lightColor * lightIntensity * (diff + spec);\n    vec3 finalColor = segColor * finalLight;\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "depth": 8.416,
      "lightIntensity": 0,
      "lightColor": [
        1,
        1,
        1
      ],
      "ambientLight": 0.81,
      "lightZ": 1.5025,
      "specularStrength": 3.9,
      "lightSpeed": 1.5,
      "scale": 5.6,
      "threshold": 0.35,
      "lineDensity": 50,
      "blackout": 0.54,
      "psychSpeed": 0.1
    }
  },
  {
    "id": "recovered_timeline_7b93099d_b5f7_4341_a231_c84817e3988f",
    "name": "Psychedelic 3D Automata 3",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-7b93099d-b5f7-4341-a231-c84817e3988f in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Psychedelic 3D Automata\nuniform float depth; // @min 0.1 @max 10.0 @default 5.0\nuniform float lightIntensity; // @min 0.0 @max 10.0 @default 3.0\nuniform vec3 lightColor; // @default 1.0,1.0,1.0\nuniform float ambientLight; // @min 0.0 @max 1.0 @default 0.05\nuniform float lightZ; // @min 0.01 @max 2.0 @default 0.15\nuniform float specularStrength; // @min 0.0 @max 5.0 @default 1.5\nuniform float lightSpeed; // @min 0.0 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform float blackout; // @min 0.0 @max 1.0 @default 1.0\nuniform float psychSpeed; // @min 0.1 @max 5.0 @default 2.0\n\nfloat getLuma(sampler2D tex, vec2 uv) {\n    return dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    float mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\n    vec3 bgCol = mix(source.rgb, vec3(0.0), blackout);\n    \n    // Moving and growing effect\n    float dynamicScale = scale * (1.0 + sin(time * 0.5) * 0.4);\n    vec2 q = uv * dynamicScale + vec2(sin(time * 0.3), cos(time * 0.4));\n    \n    float n = 0.0, amp = 1.0, sumAmp = 0.0;\n    mat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\n\n    // Dynamic automata segmentation logic\n    for(int i = 0; i < 4; i++) {\n        vec2 tOffset = vec2(sin(float(i)), cos(float(i)));\n        float noiseVal = node_noise(q + tOffset + lum * 1.5 + time * 0.5);\n        float angle = noiseVal * 6.2831 + time * 0.2;\n        q += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\n        q = rot * q * 1.3; \n        n += noiseVal * amp;\n        sumAmp += amp;\n        amp *= 0.5;\n    }\n    n /= sumAmp;\n\n    float branch = smoothstep(0.3, 0.7, n);\n    float lines = smoothstep(0.8, 0.95, sin((lum * 2.0 + n) * lineDensity - time * 3.0));\n    \n    // Super psychedelic color palette\n    vec3 psychColor = 0.5 + 0.5 * cos(time * psychSpeed + uv.xyx * 3.0 + vec3(0.0, 2.0, 4.0) + n * 10.0);\n    vec3 effectCol = psychColor + vec3(1.0) * lines * lum * 1.5;\n    vec3 segColor = mix(bgCol, effectCol, mask * branch);\n\n    // Normal map generation from original image luma\n    vec2 eps = 1.0 / resolution;\n    float l = getLuma(tex, uv - vec2(eps.x, 0.0));\n    float r = getLuma(tex, uv + vec2(eps.x, 0.0));\n    float d = getLuma(tex, uv - vec2(0.0, eps.y));\n    float u = getLuma(tex, uv + vec2(0.0, eps.y));\n    vec3 normal = normalize(vec3((r - l) * depth, (u - d) * depth, 1.0));\n    \n    // 3D Lighting - Fixed movement to be more pronounced and ensure it updates with time\n    float actualLightSpeed = max(lightSpeed, 0.5); // Ensure it always moves even if uniform is 0\n    vec3 lightPos = vec3(0.5 + sin(time * actualLightSpeed) * 0.8, 0.5 + cos(time * actualLightSpeed) * 0.8, lightZ);\n    vec3 lightDir = normalize(lightPos - vec3(uv, 0.0));\n    vec3 viewDir = vec3(0.0, 0.0, 1.0);\n    vec3 halfDir = normalize(lightDir + viewDir);\n    \n    float diff = max(dot(normal, lightDir), 0.0);\n    float spec = pow(max(dot(normal, halfDir), 0.0), 32.0) * specularStrength;\n    \n    vec3 finalLight = vec3(ambientLight) + lightColor * lightIntensity * (diff + spec);\n    vec3 finalColor = segColor * finalLight;\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "depth": 0.1,
      "lightIntensity": 1.1,
      "lightColor": [
        0.4470588235294118,
        0.43529411764705883,
        0.03137254901960784
      ],
      "ambientLight": 0.62,
      "lightZ": 1.5025,
      "specularStrength": 0.05,
      "lightSpeed": 5,
      "scale": 2,
      "threshold": 0.35,
      "lineDensity": 50,
      "blackout": 0.54,
      "psychSpeed": 4.265
    }
  },
  {
    "id": "recovered_timeline_38d0893a_6542_405d_afbf_ab621f5c788c",
    "name": "Wavy Noise HURA Hex Grid",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-38d0893a-6542-405d-afbf-ab621f5c788c in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Wavy Noise HURA Hex Grid\nuniform float scale; // @min 5.0 @max 50.0 @default 21.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.5\nuniform float morph3D; // @min 0.0 @max 1.0 @default 1.0\nuniform float animSpeed; // @min 0.0 @max 5.0 @default 2.0\n\nvec4 hexagon(in vec2 p) {\n    vec2 q = vec2(p.x * 1.1547006, p.y + p.x * 0.5773503);\n    vec2 pi = floor(q), pf = fract(q);\n    float v = mod(pi.x + pi.y, 3.0);\n    float ca = step(1.0, v), cb = step(2.0, v);\n    vec2 ma = step(pf.xy, pf.yx);\n    float e = dot(ma, 1.0 - pf.yx + ca * (pf.x + pf.y - 1.0) + cb * (pf.yx - 2.0 * pf.xy));\n    p = vec2(q.x + floor(0.5 + p.y / 1.5), 4.0 * p.y / 3.0) * 0.5 + 0.5;\n    float f = length((fract(p) - 0.5) * vec2(1.0, 0.85));\t\t\t\n    return vec4(pi + ca - cb * ma, e, f);\n}\n\nfloat URA(in vec2 p) {\n    float v = 151.0;\n    float r = 32.0;\n    float l = mod(p.y + r * p.x, v);\n    float rz = 1.0;\n    for(int i = 1; i < 76; i++) {\n        if (mod(float(i) * float(i), v) == l) rz = 0.0;\n    }\n    return rz;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    vec2 p = uv * 2.0 - 1.0;\n    p.x *= resolution.x / resolution.y;\n    \n    vec4 h = hexagon(p * scale);\n    vec3 col = vec3(URA(h.xy));\n    \n    // Morphable 3D bevel effect\n    float edge = smoothstep(-0.2, 0.13, h.z);\n    float bevel = mix(1.0, edge, morph3D);\n    \n    if (dot(col, vec3(1.0)) > 1.0) {\n        col *= bevel;\n    } else {\n        col = 1.0 - (1.0 - col) * bevel;\n    }\n    \n    // Calculate the center UV of the current hexagon to sample a single luma value per hex\n    vec2 centerP = vec2(h.x * 0.8660254, h.y - h.x * 0.5) / scale;\n    centerP.x *= resolution.y / resolution.x;\n    vec2 centerUV = centerP * 0.5 + 0.5;\n    \n    vec4 hexSource = texture2D(tex, centerUV);\n    float hexLuma = dot(hexSource.rgb, vec3(0.299, 0.587, 0.114));\n    \n    // Continuous wave noise sweep\n    float waveNoise = node_noise(centerUV * 4.0 + vec2(time * animSpeed * 0.5, time * animSpeed * 0.3));\n    float sweep = threshold + (waveNoise - 0.5) * 1.5;\n    \n    float activeHex = step(sweep, hexLuma);\n    \n    // Calculate how \"deep\" into the lit state the hexagon is\n    float litDepth = max(0.0, hexLuma - sweep);\n    \n    // Generate a color based on the lit depth and time\n    vec3 timeColor = 0.5 + 0.5 * cos(litDepth * 15.0 - time * 3.0 + vec3(0.0, 2.0, 4.0));\n    \n    // Light up taken hexagons entirely, rest dark\n    vec3 finalColor = mix(vec3(0.0), col * timeColor * 1.5, activeHex);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "scale": 47.75,
      "threshold": 0.82,
      "morph3D": 1,
      "animSpeed": 0.85
    }
  },
  {
    "id": "recovered_timeline_691d5ad0_2cec_4e73_900e_ed1f16c3add9",
    "name": "Flipping Hexagons 3",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-691d5ad0-2cec-4e73-900e-ed1f16c3add9 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Flipping Hexagons\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float gridSize; // @min 1.0 @max 50.0 @default 10.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 p = (uv - 0.5) * 2.0;\n    p.x *= resolution.x / resolution.y;\n    \n    vec2 r = vec2(1.0, 1.7320508);\n    vec2 h = r * 0.5;\n    vec2 p_scaled = p * gridSize;\n    \n    vec2 a = mod(p_scaled, r) - h;\n    vec2 b = mod(p_scaled - h, r) - h;\n    vec2 hex = dot(a, a) < dot(b, b) ? a : b;\n    vec2 id = p_scaled - hex;\n    \n    float localTime = time * speed - length(id) * 0.2;\n    float phase = fract(localTime);\n    float flip = smoothstep(0.0, 0.4, phase);\n    \n    float angle = (floor(localTime) + flip) * 3.14159;\n    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));\n    \n    vec2 flippedHex = rot * hex;\n    \n    vec2 finalUV = (id + flippedHex) / gridSize;\n    finalUV.x /= (resolution.x / resolution.y);\n    finalUV = finalUV * 0.5 + 0.5;\n    \n    vec4 col = texture2D(tex, finalUV);\n    \n    float shade = mix(1.0, 0.5, sin(flip * 3.14159));\n    col.rgb *= shade;\n    \n    float d = max(abs(flippedHex.x) * 0.866025 + abs(flippedHex.y) * 0.5, abs(flippedHex.y));\n    col.rgb *= smoothstep(0.48, 0.45, d);\n    \n    return col;\n}",
    "uniformValues": {
      "speed": 0.443,
      "gridSize": 8.35
    }
  },
  {
    "id": "recovered_timeline_f3dd7960_67da_461e_b632_3dbc8c40ac57",
    "name": "Flipping Hexagons 4",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-f3dd7960-67da-461e-b632-3dbc8c40ac57 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Flipping Hexagons\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float waveFreq; // @min 0.1 @max 2.0 @default 0.4\nuniform float waveSpread; // @min 0.1 @max 2.0 @default 0.3\nuniform float jumpHeight; // @min 0.0 @max 3.0 @default 1.2\nuniform float gridSize; // @min 1.0 @max 50.0 @default 13.0\nuniform vec3 planeColor; // @default 0.1,0.1,0.15\nuniform float contrast; // @min 0.0 @max 3.0 @default 1.0\nuniform float luminosity; // @min -1.0 @max 1.0 @default 0.0\n\nmat2 rot(float a) { \n    return mat2(cos(a), -sin(a), sin(a), cos(a)); \n}\n\nvec4 hexGrid(vec2 p) {\n    vec2 r = vec2(1.0, 1.7320508);\n    vec2 h = r * 0.5;\n    vec2 a = mod(p, r) - h;\n    vec2 b = mod(p - h, r) - h;\n    if (dot(a, a) < dot(b, b)) return vec4(a, p - a);\n    return vec4(b, p - b);\n}\n\nvec2 map(vec3 p, float time) {\n    vec4 hg = hexGrid(p.xz);\n    vec2 id = hg.zw;\n    vec3 q = p;\n    q.x = hg.x;\n    q.z = hg.y;\n    \n    float localTime = time * speed - length(id) * waveSpread;\n    float phase = fract(localTime * waveFreq);\n    float flipProgress = smoothstep(0.0, 0.25, phase);\n    float angle = (floor(localTime * waveFreq) + flipProgress) * 3.14159;\n    float activeFlip = sin(flipProgress * 3.14159);\n    \n    // Use -0.25 to avoid floating point precision issues exactly at x = 0.0\n    float dir = (id.x > -0.25) ? -1.0 : 1.0;\n    q.x -= activeFlip * jumpHeight * 1.5 * dir;\n    q.y -= activeFlip * jumpHeight;\n    q.xy = rot(angle * dir) * q.xy;\n    \n    vec3 absq = abs(q);\n    float d1 = max(absq.z * 0.866025 + absq.x * 0.5, absq.x) - (0.48 - activeFlip * 0.2);\n    float d2 = absq.y - 0.15;\n    float tiles = min(max(d1, d2), 0.0) + length(max(vec2(d1, d2), 0.0));\n    \n    return (tiles < p.y + 0.6) ? vec2(tiles, 1.0) : vec2(p.y + 0.6, 0.0);\n}\n\nvec3 getNormal(vec3 p, float time) {\n    vec2 e = vec2(0.01, 0.0);\n    return normalize(vec3(\n        map(p + e.xyy, time).x - map(p - e.xyy, time).x,\n        map(p + e.yxy, time).x - map(p - e.yxy, time).x,\n        map(p + e.yyx, time).x - map(p - e.yyx, time).x\n    ));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec2 p = (uv - 0.5) * 2.0;\n    p.x *= resolution.x / resolution.y;\n    p /= 0.9;\n    \n    vec3 ro = vec3(0.0, gridSize, 0.001);\n    vec3 rd = normalize(vec3(p.x, -2.2, p.y));\n    float t = 0.0, maxDist = gridSize * 3.0;\n    vec2 res = vec2(0.0);\n    \n    for(int i = 0; i < 40; i++) {\n        res = map(ro + rd * t, time);\n        if(res.x < 0.005 || t > maxDist) break;\n        t += res.x * 0.8;\n    }\n    \n    if(t >= maxDist) return vec4(0.0, 0.0, 0.0, 1.0);\n    \n    vec3 pos = ro + rd * t;\n    vec3 nor = getNormal(pos, time);\n    float dif = max(dot(nor, normalize(vec3(0.6, 1.0, -0.4))), 0.0);\n    vec3 col = planeColor;\n    \n    if (res.y > 0.5) {\n        vec4 hg = hexGrid(pos.xz);\n        vec2 id = hg.zw;\n        vec2 finalUV = (id + hg.xy) / gridSize;\n        finalUV.x /= (resolution.x / resolution.y);\n        vec3 texCol = texture2D(tex, finalUV + 0.5).rgb;\n        \n        texCol = clamp((texCol - 0.5) * contrast + 0.5 + luminosity, 0.0, 1.0);\n        \n        float localTime = time * speed - length(id) * waveSpread;\n        float phase = fract(localTime * waveFreq);\n        float angle = (floor(localTime * waveFreq) + smoothstep(0.0, 0.25, phase)) * 3.14159;\n        \n        // Use -0.25 to avoid floating point precision issues exactly at x = 0.0\n        float dir = (id.x > -0.25) ? -1.0 : 1.0;\n        \n        float flipIndex = floor((localTime * waveFreq + 0.5) * 0.5);\n        vec3 tint = vec3(node_rand(vec2(flipIndex, 1.1)), node_rand(vec2(flipIndex, 2.2)), node_rand(vec2(flipIndex, 3.3)));\n        vec2 localNorXY = rot(angle * dir) * nor.xy;\n        col = mix(texCol * (tint * 1.5 + 0.2), texCol, smoothstep(0.5, 0.9, localNorXY.y));\n    }\n    \n    col *= (dif * 0.7 + max(dot(nor, rd), 0.0) * 0.6 + 0.3);\n    return vec4(mix(col, vec3(0.0), smoothstep(maxDist * 0.5, maxDist, t)), 1.0);\n}",
    "uniformValues": {
      "speed": 0.933,
      "waveFreq": 0.67,
      "waveSpread": 0.3,
      "jumpHeight": 0,
      "gridSize": 18.15,
      "planeColor": [
        0.00784313725490196,
        0.00784313725490196,
        0.03529411764705882
      ],
      "contrast": 1,
      "luminosity": 0
    }
  },
  {
    "id": "recovered_timeline_66f6b301_80fa_40b8_b856_627d93c52aae",
    "name": "Gravity Shatter Collision",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-66f6b301-80fa-40b8-b856-627d93c52aae in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Gravity Shatter Collision\nuniform float complexity; // @min 5.0 @max 20.0 @default 12.0\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float floorY; // @min 0.0 @max 0.5 @default 0.05\nuniform float gravity; // @min 1.0 @max 10.0 @default 4.0\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    // Keep the floor intact as a collision box\n    if (uv.y < floorY) {\n        return texture2D(tex, uv);\n    }\n    \n    float cols = floor(complexity);\n    float rows = floor(complexity);\n    \n    // Determine which column this pixel belongs to\n    float cellX = floor(uv.x * cols);\n    \n    // Loop through all possible pieces in this column to see if they fell here\n    for (int i = 0; i < 20; i++) {\n        if (float(i) >= rows) break;\n        float cellY = float(i);\n        \n        // Generate a random offset for each cell\n        float r = node_rand(vec2(cellX, cellY));\n        \n        // Calculate falling time cycle\n        float t = fract(time * speed + r);\n        \n        // Gravity displacement (d = 0.5 * g * t^2)\n        float drop = 0.5 * gravity * t * t;\n        \n        // Calculate the maximum drop distance before hitting the floor collision box\n        float maxDrop = max(0.0, (cellY / rows) - floorY);\n        float actualDrop = min(drop, maxDrop);\n        \n        // Calculate the current bounds of this falling piece\n        float currentBottom = (cellY / rows) - actualDrop;\n        float currentTop = ((cellY + 1.0) / rows) - actualDrop;\n        \n        // If the current pixel is inside this fallen piece, render it\n        if (uv.y >= currentBottom && uv.y < currentTop) {\n            vec2 sampleUv = vec2(uv.x, uv.y + actualDrop);\n            return texture2D(tex, sampleUv);\n        }\n    }\n    \n    // Empty space where pieces have already fallen from\n    return vec4(0.0);\n}",
    "uniformValues": {
      "complexity": 19.43,
      "speed": 1.325,
      "floorY": 0.05,
      "gravity": 4
    }
  },
  {
    "id": "recovered_timeline_b98745de_0ae4_445d_b763_c93b915ac2e0",
    "name": "Raymarch Tunnel Blend",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-b98745de-0ae4-445d-b763-c93b915ac2e0 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Raymarch Tunnel Blend\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\nuniform float rotSpeed; // @min 0.0 @max 1.0 @default 0.15\nuniform float repSize; // @min 1.0 @max 10.0 @default 4.0\nuniform float stepSize; // @min 0.1 @max 1.0 @default 0.3\nuniform vec3 colorOffset; // @default 0.0,2.0,4.0\nuniform float threshold; // @min 0.0 @max 1.75 @default 0.01\nuniform float effectBlend; // @min 0.0 @max 1.0 @default 0.75\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    \n    // Only apply on pixels above the black threshold\n    if (length(source.rgb) <= threshold) {\n        return source;\n    }\n\n    vec4 O = vec4(0.0);\n    float t = 0.0;\n    float v = 0.0;\n    \n    vec2 I = uv * resolution;\n    vec3 rayDir = normalize(vec3(2.0 * I - resolution, resolution.y));\n\n    for (int j = 0; j < 50; j++) {\n        vec3 p = t * rayDir;\n        \n        // Rotation of xy coordinates based on distance travelled\n        vec4 c = cos(t * rotSpeed + vec4(0.0, 11.0, 33.0, 0.0));\n        p.xy *= mat2(c.x, c.y, c.z, c.w);\n        \n        // Move forward\n        p.z -= time * speed;\n        \n        // Coordinate repetition\n        p = mod(p, repSize) - (repSize * 0.5);\n        \n        // Density from mix between sphere and line sdf based on distance travelled\n        v = mix(abs(length(p) - 1.0), length(p.xz), 0.5 - 0.5 * cos(t)) + 0.01;\n        \n        // Travel forwards based on density\n        t += v * stepSize;\n        \n        // Color accumulation based on density and distance travelled\n        O += exp(sin(t + vec4(colorOffset, 0.0))) / v;\n    }\n    \n    // Tone mapping (safe approximation of tanh for positive values)\n    O = 1.0 - exp(-O / 200.0);\n    \n    // Multiply the raymarch effect by the original image to preserve its features\n    vec3 finalColor = mix(source.rgb, source.rgb * O.rgb * 2.5, effectBlend);\n    \n    // Preserve original alpha\n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "speed": 3.8,
      "rotSpeed": 0.03,
      "repSize": 9.01,
      "stepSize": 0.964,
      "colorOffset": [
        0.9686274509803922,
        0.6666666666666666,
        0.00784313725490196
      ],
      "threshold": 0.2625,
      "effectBlend": 0.75
    }
  },
  {
    "id": "recovered_timeline_4f6c2849_4b14_499f_9ef7_4147e9c5dd22",
    "name": "Infinite Strangler Vines",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-4f6c2849-4b14-499f-9ef7-4147e9c5dd22 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Infinite Strangler Vines\nuniform float timeScale; // @default 1.0\nuniform float vineDensity; // @min 1.0 @max 10.0 @default 4.0\nuniform vec3 vineColor; // @default 0.4,0.5,0.3\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.0\nuniform float morphIntensity; // @min 0.0 @max 5.0 @default 2.0\n\n#define PI 3.14159\n#define TAU (2.0*PI)\n\nmat2 rot(float a) { \n    float c=cos(a), s=sin(a); \n    return mat2(c,-s,s,c); \n}\n\nfloat cyl(vec2 p, float r) { \n    return length(p)-r; \n}\n\nfloat smin(float a, float b, float r) {\n    float h = clamp(0.5+0.5*(b-a)/r, 0.0, 1.0);\n    return mix(b,a,h) - r*h*(1.0-h);\n}\n\nvec3 moda(vec2 p, float count) {\n    float an = TAU/count;\n    float a = atan(p.y, p.x) + an*0.5;\n    float c = floor(a/an);\n    a = mod(a, an) - an*0.5;\n    c = mix(c, abs(c), step(count*0.5, abs(c)));\n    return vec3(vec2(cos(a), sin(a))*length(p), c);\n}\n\nfloat root(vec3 p, float count, float torsade, float width, float scale) {\n    p.xz *= rot(torsade);\n    vec3 p1 = moda(p.xz, count);\n    p1.x -= width + 0.2*sin(p1.z);\n    p.xz = p1.xy;\n    return cyl(p.xz, scale);\n}\n\nfloat map(vec3 p, float t, sampler2D tex, vec2 resolution) {\n    vec3 op = p;\n    \n    float aspect = resolution.x / resolution.y;\n    vec2 suv = op.xy * vec2(0.2 / aspect, 0.2) + 0.5;\n    \n    float lum = 0.0;\n    if(suv.x >= 0.0 && suv.x <= 1.0 && suv.y >= 0.0 && suv.y <= 1.0) {\n        vec4 c = texture2D(tex, suv);\n        lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));\n    }\n    \n    // Reduced Z curving so vines stay closer to the camera and fill the screen\n    p.z += dot(op.xy, op.xy) * 0.3 - lum * morphIntensity * 0.5;\n    \n    // Infinite repetition on the X axis to fill the canvas horizontally\n    p.x = mod(p.x + 0.8, 1.6) - 0.8;\n    \n    float trunkWidth = 0.25 + lum * 0.2 * morphIntensity;\n    float blendRoots = 0.5; \n    \n    float roots = root(p, vineDensity, t + p.y*0.5, trunkWidth, 0.1);\n    roots = smin(roots, root(p, vineDensity + 2.0, -t - p.y*0.3, trunkWidth + 0.1, 0.08), blendRoots);\n    roots = smin(roots, root(p, vineDensity + 1.0, t*1.5 + p.y*0.2, trunkWidth - 0.05, 0.12), blendRoots);\n    \n    vec3 lp = p;\n    lp.y = mod(lp.y - t*0.5, 0.4) - 0.2;\n    float r = length(lp.xz) - trunkWidth - 0.15;\n    float a = atan(lp.z, lp.x);\n    a = mod(a, 0.8) - 0.4;\n    float leaves = length(vec3(r, lp.y*2.0, a*2.0)) - 0.08;\n    \n    return smin(roots, leaves, 0.05) * 0.6;\n}\n\nvec3 calcNormal(vec3 p, float t, sampler2D tex, vec2 resolution) {\n    vec2 e = vec2(0.01, 0.0);\n    return normalize(vec3(\n        map(p+e.xyy, t, tex, resolution) - map(p-e.xyy, t, tex, resolution),\n        map(p+e.yxy, t, tex, resolution) - map(p-e.yxy, t, tex, resolution),\n        map(p+e.yyx, t, tex, resolution) - map(p-e.yyx, t, tex, resolution)\n    ));\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 bg = texture2D(tex, uv);\n    \n    float bgLum = dot(bg.rgb, vec3(0.299, 0.587, 0.114));\n    if (bgLum < blackThreshold) {\n        return vec4(0.0);\n    }\n    \n    vec2 p_uv = (uv - 0.5) * 2.0;\n    float aspect = resolution.x / resolution.y;\n    p_uv.x *= aspect;\n    \n    vec3 eye = vec3(0.0, 0.0, -2.5);\n    vec3 ray = normalize(vec3(p_uv, 1.0));\n    vec3 pos = eye;\n    \n    float t = time * timeScale * 0.5;\n    float dist = 0.0;\n    int steps = 0;\n    \n    for(int i = 0; i < 60; i++) {\n        dist = map(pos, t, tex, resolution);\n        if(dist < 0.005 || pos.z > 10.0) break;\n        pos += ray * dist;\n        steps = i;\n    }\n    \n    if(dist < 0.01) {\n        vec3 n = calcNormal(pos, t, tex, resolution);\n        vec3 lightDir = normalize(vec3(1.0, 1.0, -1.0));\n        float diff = max(dot(n, lightDir), 0.0);\n        float spec = pow(max(dot(reflect(-lightDir, n), -ray), 0.0), 16.0);\n        float ao = 1.0 - float(steps) / 60.0;\n        vec3 col = vineColor * diff * ao + vec3(1.0) * spec * 0.5;\n        return vec4(col, 1.0);\n    }\n    \n    return vec4(0.0);\n}",
    "uniformValues": {
      "timeScale": 0.89,
      "vineDensity": 1.09,
      "vineColor": [
        0.984313725490196,
        0.8666666666666667,
        0.09411764705882353
      ],
      "blackThreshold": 0.25,
      "morphIntensity": 4.45
    }
  },
  {
    "id": "recovered_timeline_9b40f842_50a9_43fe_8eb6_d9e751056684",
    "name": "Animated Fractal Vines",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-9b40f842-50a9-43fe-8eb6-d9e751056684 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Animated Fractal Vines\nuniform float growthSpeed; // @min 0.0 @max 5.0 @default 1.0\nuniform vec3 plantColor; // @default 0.15,0.4,0.1\nuniform float vineDensity; // @min 50.0 @max 250.0 @default 120.0\nuniform float curvature; // @min 0.0 @max 1.0 @default 0.3\nuniform float seed; // @min 0.0 @max 1000.0 @default 0.0\nuniform float mossDensity; // @min 0.0 @max 1.0 @default 0.6\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float leafAmount; // @min 0.0 @max 2.0 @default 1.0\nuniform float leafSize; // @min 0.1 @max 3.0 @default 1.0\nuniform float leafShape; // @min 0.1 @max 5.0 @default 1.0\nuniform vec3 leafColor1; // @default 0.2,0.6,0.2\nuniform vec3 leafColor2; // @default 0.6,0.8,0.2\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    float luma = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    \n    float validArea = smoothstep(blackThreshold, blackThreshold + 0.01, luma);\n    \n    // --- Effect 2: Seamless Mossy Vines (Bottom Layer) ---\n    float cycleTime = time * growthSpeed * 0.05;\n    float cycle = floor(cycleTime + 0.5);\n    float s = seed + cycle * 13.37;\n    vec2 eps = vec2(1.0) / max(resolution, vec2(1.0));\n    vec2 safeUV = clamp(uv, eps * 2.0, 1.0 - eps * 2.0);\n    \n    float lR = dot(texture2D(tex, safeUV + vec2(eps.x, 0.0)).rgb, vec3(0.333));\n    float lL = dot(texture2D(tex, safeUV - vec2(eps.x, 0.0)).rgb, vec3(0.333));\n    float lT = dot(texture2D(tex, safeUV + vec2(0.0, eps.y)).rgb, vec3(0.333));\n    float lB = dot(texture2D(tex, safeUV - vec2(0.0, eps.y)).rgb, vec3(0.333));\n    vec2 grad = vec2(lR - lL, lT - lB);\n    \n    // Animate noise warp for organic movement\n    vec2 noiseWarp = vec2(node_noise(uv * 5.0 + vec2(s + time * 0.2)), node_noise(uv * 5.0 + vec2(3.14 + s - time * 0.15))) * 0.05;\n    vec2 warpedUV = uv + grad * 1.5 + noiseWarp;\n    vec2 vineUV = vec2(warpedUV.x * 25.0 + time * 0.5, warpedUV.y * 5.0 - time * 0.3);\n    \n    float n1 = node_noise(vineUV + vec2(s * 10.0));\n    float vineDist = abs(n1 - 0.5) * 2.0;\n    float vines2 = smoothstep(0.6, 0.2, vineDist);\n    \n    float mossNoise = node_noise(uv * 60.0 + vec2(s * 5.0 + time * 0.1)) * node_noise(uv * 120.0 - vec2(s));\n    float mossBase = smoothstep(1.0 - mossDensity, 1.0, node_noise(uv * 10.0 + vec2(s * 2.0)));\n    float moss = mossBase * smoothstep(0.2, 0.8, mossNoise) * 1.5;\n    \n    float progress = abs(fract(cycleTime) * 2.0 - 1.0) * 2.0 - 0.5;\n    // Animate growth mask noise\n    float organicShape = node_noise(uv * 3.0 + vec2(s + time * 0.3, time * 0.2)) * 0.6;\n    float growthMask2 = smoothstep(progress + 0.5, progress, (1.0 - uv.y) + organicShape * 0.5);\n    \n    float combinedPlant = clamp(vines2 + moss, 0.0, 1.0);\n    float plantMask2 = combinedPlant * growthMask2 * validArea;\n    vec3 plant2 = plantColor * (luma * 0.6 + 0.2);\n    vec3 colorAfterMoss = mix(vec3(0.0), plant2, plantMask2);\n    \n    // --- Effect 1: Seamless Organic Vines (Top Layer) ---\n    float loopTime = time * growthSpeed / 6.0;\n    float loopSeed = node_rand(vec2(floor(loopTime + 0.5), seed + 1.0)) * 100.0;\n    \n    float currentGrowth = abs(fract(loopTime) * 2.0 - 1.0) * 3.0 - 0.5;\n    // Animate top layer noise\n    float n = node_noise(uv * 12.0 + vec2(loopSeed + time * 0.4, time * 0.25));\n    float distortX = uv.x + luma * curvature + n * 0.05;\n    \n    // Move the vines continuously\n    float vX = distortX * vineDensity + time * 1.2;\n    float vY = uv.y * 12.0 - time * 2.0;\n    \n    float strand1 = sin(vX + vY + loopSeed * 13.0);\n    float strand2 = sin(vX - vY + loopSeed * 17.0);\n    float thickness = mix(0.98, 0.92, luma);\n    float topVines = smoothstep(thickness, 1.0, strand1) + smoothstep(thickness, 1.0, strand2);\n    \n    // 3D Fractal Leaves - Scaled up 3x and improved shape\n    vec2 leafUV = uv * 5.0 / leafSize + vec2(loopSeed + time * 0.1);\n    float fbm = 0.0;\n    float amp = 0.5;\n    vec2 p = leafUV;\n    for(int i = 0; i < 3; i++) {\n        fbm += node_noise(p) * amp;\n        p = p * 2.0 + vec2(loopSeed);\n        amp *= 0.5;\n    }\n    \n    // Lower frequency for larger leaves\n    float freqX = (2.0 + leafShape * fbm) * 0.333;\n    float freqY = (3.0 + leafShape * fbm) * 0.333;\n    \n    float wX = sin(vX * freqX + fbm * 3.0);\n    float wY = cos(vY * freqY + fbm * 3.0 + loopSeed);\n    \n    // Pinched leaf shape\n    float leafWave = wX * wY;\n    leafWave = sign(leafWave) * pow(abs(leafWave), 0.6);\n    \n    float leafDepth = fbm * leafWave;\n    float leafThreshold = mix(0.2, 0.7, fbm);\n    float leaves = smoothstep(leafThreshold, leafThreshold + 0.15, leafWave) * smoothstep(0.4, 1.0, max(strand1, strand2)) * leafAmount;\n    \n    topVines = clamp(topVines + leaves * 1.5, 0.0, 1.0);\n    float topMask = topVines * smoothstep(currentGrowth + 0.5, currentGrowth, (1.0 - uv.y) + n * 0.3) * validArea;\n    \n    vec3 mixedLeafColor = mix(leafColor1, leafColor2, fbm);\n    vec3 topPlantColor = mix(plantColor * (luma * 0.8 + 0.2), mixedLeafColor * (0.5 + leafDepth * 0.5), clamp(leaves, 0.0, 1.0));\n    vec3 finalColor = mix(colorAfterMoss, topPlantColor, topMask);\n    \n    return vec4(finalColor, source.a);\n}",
    "uniformValues": {
      "growthSpeed": 0.25,
      "plantColor": [
        0.10588235294117647,
        0.5019607843137255,
        0.0392156862745098
      ],
      "vineDensity": 160,
      "curvature": 0.3,
      "seed": 0,
      "mossDensity": 0.6,
      "blackThreshold": 0.05,
      "leafAmount": 1,
      "leafSize": 1,
      "leafShape": 1,
      "leafColor1": [
        0.2,
        0.6,
        0.2
      ],
      "leafColor2": [
        0.6,
        0.8,
        0.2
      ]
    }
  },
  {
    "id": "recovered_timeline_0b863768_39e0_4718_a3c6_03248f065176",
    "name": "Realistic Multi-Bubbles",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-0b863768-39e0-4718-a3c6-03248f065176 in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Realistic Multi-Bubbles\nuniform float bubbleSize; // @min 0.05 @max 0.5 @default 0.2\nuniform float wobbleSpeed; // @min 0.0 @max 5.0 @default 1.0\nuniform float iridescence; // @min 0.0 @max 1.0 @default 0.8\nuniform float refraction; // @min 0.0 @max 0.5 @default 0.1\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.05\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 original = texture2D(tex, uv);\n    \n    // Calculate luminance to use as a black mask\n    float lum = dot(original.rgb, vec3(0.299, 0.587, 0.114));\n    if (lum <= blackThreshold) {\n        return original;\n    }\n\n    vec4 finalColor = original;\n    float aspect = resolution.x / resolution.y;\n    vec2 uvAspect = uv;\n    uvAspect.x *= aspect;\n\n    // Render multiple bubbles\n    for (int i = 0; i < 5; i++) {\n        float fi = float(i);\n        \n        // Unique drifting path for each bubble\n        vec2 center = vec2(\n            0.5 + 0.4 * sin(time * wobbleSpeed * 0.4 + fi * 2.3),\n            0.5 + 0.4 * cos(time * wobbleSpeed * 0.3 + fi * 1.7)\n        );\n        center.x *= aspect;\n\n        vec2 p = uvAspect - center;\n        float dist = length(p);\n\n        // Subtle organic wobble on the radius\n        float angle = atan(p.y, p.x);\n        float radius = bubbleSize * (0.6 + 0.1 * fi) + sin(angle * 4.0 + time * 3.0) * 0.005;\n\n        if (dist < radius) {\n            // Spherical normal\n            float z = sqrt(radius * radius - dist * dist);\n            vec3 normal = normalize(vec3(p.x, p.y, z));\n            float NdotV = max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0);\n\n            // Realistic thin-shell refraction (stronger at edges)\n            vec2 distortedUV = uv - normal.xy * refraction * (1.0 - NdotV);\n            vec4 bg = texture2D(tex, distortedUV);\n\n            // Fresnel effect for realistic edge reflections\n            float fresnel = pow(1.0 - NdotV, 2.5);\n            \n            // Soap film iridescence mapped to fresnel\n            vec3 iriColor = 0.5 + 0.5 * cos(time * 0.5 + fresnel * 15.0 + vec3(0.0, 2.0, 4.0));\n\n            // Sharp primary and soft secondary specular highlights\n            vec3 lightDir = normalize(vec3(0.7, 0.7, 1.0));\n            float spec = pow(max(dot(normal, lightDir), 0.0), 100.0) * 1.5;\n            float spec2 = pow(max(dot(normal, normalize(vec3(-0.7, -0.3, 1.0))), 0.0), 50.0) * 0.4;\n\n            // Combine background, iridescence, and highlights\n            vec3 bubbleColor = mix(bg.rgb, iriColor, iridescence * fresnel);\n            bubbleColor += spec + spec2;\n            \n            finalColor = vec4(bubbleColor, bg.a);\n        }\n    }\n\n    return finalColor;\n}",
    "uniformValues": {
      "bubbleSize": 0.2525,
      "wobbleSpeed": 2,
      "iridescence": 0.8,
      "refraction": 0.15,
      "blackThreshold": 0.05
    }
  },
  {
    "id": "recovered_timeline_439fb249_bb13_4bd3_b8fa_3495de9b193b",
    "name": "Basic Pass",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-439fb249-bb13-4bd3-b8fa-3495de9b193b in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Basic Pass\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    vec4 source = texture2D(tex, uv);\n    return source;\n}",
    "uniformValues": {}
  },
  {
    "id": "recovered_timeline_2897a5b7_5cf1_4214_9781_bde97499658e",
    "name": "Shadow DMT Morph",
    "template": "stage",
    "group": "Recovered Timeline",
    "description": "Recovered from temporary timeline shader timeline-2897a5b7-5cf1-4214-9781-bde97499658e in online Mapshroom project \"Untitled Project\".",
    "code": "// NAME: Shadow DMT Morph\nuniform float speed; // @min 0.1 @max 3.0 @default 1.0\nuniform float distortion; // @min 0.0 @max 5.0 @default 2.0\nuniform float morphAmount; // @min 0.0 @max 1.0 @default 0.8\nuniform float shadowLevel; // @min 0.0 @max 1.0 @default 0.6\nuniform float blackThreshold; // @min 0.0 @max 0.5 @default 0.05\n\nfloat map(vec3 p, float time, float dist) {\n    vec3 q = p;\n    float scale = 1.0;\n    for (int i = 0; i < 4; i++) {\n        q += sin(q.zxy * (2.0 + dist) + time) * 0.2;\n        q = abs(q) - 0.3;\n        \n        float c = cos(time * 0.2 + float(i) * 0.5);\n        float s = sin(time * 0.2 + float(i) * 0.5);\n        q.xy = mat2(c, -s, s, c) * q.xy;\n        q.yz = mat2(c, -s, s, c) * q.yz;\n        \n        q *= 1.5;\n        scale *= 1.5;\n    }\n    return (length(q) - 0.2) / scale;\n}\n\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\n    float t_mod = time * speed;\n    vec4 source = texture2D(tex, uv);\n    \n    // Calculate shadow areas to drive the morph\n    float brightness = dot(source.rgb, vec3(0.299, 0.587, 0.114));\n    float shadow = 1.0 - brightness;\n    \n    // Mask out pure black pixels so they remain black\n    float blackMask = smoothstep(0.0, blackThreshold, brightness);\n    float blend = smoothstep(shadowLevel - 0.3, shadowLevel + 0.3, shadow) * morphAmount * blackMask;\n    \n    if (blend <= 0.01) {\n        return source; // Skip expensive raymarching for non-shadow or pure black areas\n    }\n\n    vec2 uvWarp = uv;\n    uvWarp.x += sin(uv.y * 15.0 + t_mod) * 0.01 * distortion;\n    uvWarp.y += cos(uv.x * 15.0 - t_mod) * 0.01 * distortion;\n    \n    vec2 p2 = uvWarp - 0.5;\n    p2.x *= resolution.x / resolution.y;\n    p2 += sin(p2.yx * 5.0 + t_mod) * 0.1 * distortion;\n    \n    vec3 ro = vec3(0.0, 0.0, -2.0);\n    vec3 rd = normalize(vec3(p2, 1.0));\n    \n    float t = 0.0;\n    float d = 0.0;\n    vec3 p;\n    \n    for(int i = 0; i < 35; i++) {\n        p = ro + rd * t;\n        d = map(p, t_mod, distortion);\n        if(d < 0.002 || t > 4.0) break;\n        t += d;\n    }\n    \n    vec3 dmtCol = texture2D(tex, uvWarp).rgb;\n    \n    if(t < 4.0) {\n        vec2 e = vec2(0.01, 0.0);\n        vec3 n = normalize(vec3(\n            map(p + e.xyy, t_mod, distortion) - map(p - e.xyy, t_mod, distortion),\n            map(p + e.yxy, t_mod, distortion) - map(p - e.yxy, t_mod, distortion),\n            map(p + e.yyx, t_mod, distortion) - map(p - e.yyx, t_mod, distortion)\n        ));\n        \n        vec3 c = 0.5 + 0.5 * cos(t_mod * 3.0 + p.zxy * 8.0 + n * 3.0 + vec3(0.0, 2.0, 4.0));\n        c = mix(c, sin(c * 15.0) * 0.5 + 0.5, 0.4);\n        \n        float diff = max(dot(n, normalize(vec3(1.0, 2.0, -1.0))), 0.0);\n        dmtCol = c * (diff * 0.8 + 0.4);\n        dmtCol += vec3(0.8, 0.2, 0.5) * pow(max(1.0 - t / 4.0, 0.0), 3.0);\n    } else {\n        dmtCol *= 0.6 + 0.4 * sin(t_mod * 5.0 + uv.xyx * 20.0 + distortion);\n    }\n    \n    // Morph the original image shadows into the DMT realm\n    vec3 finalCol = mix(source.rgb, dmtCol, blend);\n    return vec4(finalCol, source.a);\n}",
    "uniformValues": {
      "speed": 0.187,
      "distortion": 0,
      "morphAmount": 1,
      "shadowLevel": 0.17,
      "blackThreshold": 0.405
    }
  }
];

export const onlineRecoveredStagePresetList: ShaderPresetDefinition[] =
  onlineRecoveredStagePresetListSource.map((preset) => ({
    ...preset,
    template: 'sculpture',
  }));
