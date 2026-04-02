export const blankShaderTemplate = `// NAME: New Shader
vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
    vec4 source = texture2D(tex, uv);
    return source;
}`;
