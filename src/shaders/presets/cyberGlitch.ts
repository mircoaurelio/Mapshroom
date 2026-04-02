export const cyberGlitchShader = {
  id: 'default_cyber',
  name: 'Cyber Glitch Aberration',
  code: `// NAME: Cyber Glitch Aberration
uniform float glitchAmount; // @min 0.0 @max 0.2 @default 0.04
uniform float speed; // @min 0.1 @max 5.0 @default 1.0
uniform bool scanlines; // @default true

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    float t = time * speed;
    float glitch = step(0.95, sin(t * 8.0)) * glitchAmount * node_rand(vec2(t, uv.y));

    vec4 r = texture2D(tex, uv + vec2(glitch, 0.0));
    vec4 g = texture2D(tex, uv);
    vec4 b = texture2D(tex, uv - vec2(glitch, 0.0));

    float scan = 0.0;
    if (scanlines) {
        scan = sin(uv.y * 300.0 - t * 20.0) * 0.08;
    }
    return vec4(r.r - scan, g.g - scan, b.b - scan, 1.0);
}`,
};
