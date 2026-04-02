export const monochromeBleedShader = {
  id: 'default_monochrome_bleed',
  name: 'Monochrome Bleed',
  description: 'Expands dark lines into a soft analog bleed, useful for projection surfaces with texture.',
  group: 'Glow',
  code: `// NAME: Monochrome Bleed
uniform float bleed; // @min 0.5 @max 4.0 @default 1.5
uniform float softness; // @min 0.0 @max 1.0 @default 0.45
uniform vec3 inkColor; // @default 0.08,0.08,0.10

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec2 px = bleed / max(resolution, vec2(1.0));
    float center = 1.0 - smoothstep(0.72, 0.94, dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114)));
    float surround = 0.0;
    surround += 1.0 - smoothstep(0.72, 0.94, dot(texture2D(tex, uv + vec2(px.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114)));
    surround += 1.0 - smoothstep(0.72, 0.94, dot(texture2D(tex, uv - vec2(px.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114)));
    surround += 1.0 - smoothstep(0.72, 0.94, dot(texture2D(tex, uv + vec2(0.0, px.y)).rgb, vec3(0.299, 0.587, 0.114)));
    surround += 1.0 - smoothstep(0.72, 0.94, dot(texture2D(tex, uv - vec2(0.0, px.y)).rgb, vec3(0.299, 0.587, 0.114)));
    surround += 1.0 - smoothstep(0.72, 0.94, dot(texture2D(tex, uv + px).rgb, vec3(0.299, 0.587, 0.114)));
    surround += 1.0 - smoothstep(0.72, 0.94, dot(texture2D(tex, uv - px).rgb, vec3(0.299, 0.587, 0.114)));
    surround *= 0.1667;

    float bleedMask = smoothstep(0.08, 0.9, surround) * softness;
    vec3 result = mix(vec3(1.0), inkColor, clamp(center + bleedMask * 0.7, 0.0, 1.0));
    return vec4(result, 1.0);
}`,
};
