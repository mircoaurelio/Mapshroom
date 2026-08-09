export const legacyBlankShaderTemplate = `// NAME: New Shader
vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture2D(tex, uv);
    return source;
}`;

export const blankShaderTemplate = `// NAME: New Shader
uniform float intensity; // @min 0.0 @max 2.0 @default 1.0

vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture(tex, uv);
    return vec4(source.rgb * intensity, source.a);
}`;
