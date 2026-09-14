import type { ShaderUniformMap, ShaderUniformValueMap } from '../types';

/** Return only unlocked numeric/color changes, leaving switches and locked values intact. */
export function randomizeUniformValues(
  definitions: ShaderUniformMap,
  lockedUniforms: ReadonlySet<string>,
  random: () => number = Math.random,
): ShaderUniformValueMap {
  const changes: ShaderUniformValueMap = {};
  for (const [name, definition] of Object.entries(definitions)) {
    if (lockedUniforms.has(name)) continue;
    if (definition.type === 'vec3') {
      changes[name] = [random(), random(), random()];
    } else if (definition.type === 'int') {
      const min = Math.ceil(definition.min);
      const max = Math.floor(definition.max);
      changes[name] = min >= max ? min : min + Math.floor(random() * (max - min + 1));
    } else if (definition.type === 'float') {
      const range = definition.max - definition.min;
      changes[name] = !Number.isFinite(range) || range <= 0
        ? definition.min
        : Number((definition.min + range * Math.floor(random() * 101) / 100).toPrecision(12));
    }
  }
  return changes;
}
