import assert from 'node:assert/strict';
import test from 'node:test';

import { collectNestedTimelineSamplerSources } from '../src/lib/timelineSamplerBindings.ts';
import { buildTimelineTransitionShaderCode } from '../src/lib/timelineShader.ts';

test('nested timeline transitions retain a distinct source for every namespaced sampler', () => {
  const bindings = collectNestedTimelineSamplerSources(
    {
      transitionInputSources: {
        from: 'primary-from',
        to: 'primary-to',
      },
      transitionOverlaySources: {
        from: 'primary-from-overlay',
        to: 'primary-to-overlay',
      },
    },
    {
      transitionInputSources: {
        from: 'secondary-from',
        to: 'secondary-to',
      },
      transitionOverlaySources: {
        from: 'secondary-from-overlay',
        to: 'secondary-to-overlay',
      },
    },
  );

  assert.deepEqual(bindings, {
    timeline_from_u_timeline_from_image: 'primary-from',
    timeline_from_u_timeline_to_image: 'primary-to',
    timeline_from_u_timeline_from_overlay_image: 'primary-from-overlay',
    timeline_from_u_timeline_to_overlay_image: 'primary-to-overlay',
    timeline_to_u_timeline_from_image: 'secondary-from',
    timeline_to_u_timeline_to_image: 'secondary-to',
    timeline_to_u_timeline_from_overlay_image: 'secondary-from-overlay',
    timeline_to_u_timeline_to_overlay_image: 'secondary-to-overlay',
  });
});

test('nested sampler bindings preserve existing bindings and static overlay inputs', () => {
  const bindings = collectNestedTimelineSamplerSources(
    {
      overlaySource: 'primary-overlay',
      samplerSources: {
        nested_sampler: 'primary-nested',
      },
    },
    {
      overlaySource: 'secondary-overlay',
    },
  );

  assert.deepEqual(bindings, {
    timeline_from_nested_sampler: 'primary-nested',
    timeline_from_u_timeline_overlay_image: 'primary-overlay',
    timeline_to_u_timeline_overlay_image: 'secondary-overlay',
  });
});

test('nested sampler binding names match the sampler uniforms emitted by the GLSL builder', () => {
  const shaderBody = (color: string) => `
vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
  return texture(tex, uv) * vec4(${color}, 1.0);
}`;
  const primaryTransition = buildTimelineTransitionShaderCode({
    fromCode: shaderBody('1.0, 0.0, 0.0'),
    toCode: shaderBody('0.0, 1.0, 0.0'),
    effect: 'mix',
  });
  const secondaryTransition = buildTimelineTransitionShaderCode({
    fromCode: shaderBody('0.0, 0.0, 1.0'),
    toCode: shaderBody('1.0, 1.0, 0.0'),
    effect: 'wipe',
  });
  const nestedShader = buildTimelineTransitionShaderCode({
    fromCode: primaryTransition,
    toCode: secondaryTransition,
    effect: 'noise',
  });
  const bindings = collectNestedTimelineSamplerSources(
    {
      transitionInputSources: { from: 'primary-from', to: 'primary-to' },
      transitionOverlaySources: {
        from: 'primary-from-overlay',
        to: 'primary-to-overlay',
      },
    },
    {
      transitionInputSources: { from: 'secondary-from', to: 'secondary-to' },
      transitionOverlaySources: {
        from: 'secondary-from-overlay',
        to: 'secondary-to-overlay',
      },
    },
  );
  const declaredSamplerNames = new Set(
    Array.from(
      nestedShader.matchAll(/\buniform\s+sampler2D\s+([A-Za-z_][A-Za-z0-9_]*)\s*;/g),
      (match) => match[1],
    ),
  );

  assert.deepEqual(
    Object.keys(bindings).filter((uniformName) => !declaredSamplerNames.has(uniformName)),
    [],
  );
});
