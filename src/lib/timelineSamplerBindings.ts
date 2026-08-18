export interface TimelineSamplerSourcePair<T> {
  from: T | null;
  to: T | null;
}

export interface TimelineSamplerSourceLayer<T> {
  overlaySource?: T | null;
  transitionInputSources?: TimelineSamplerSourcePair<T> | null;
  transitionOverlaySources?: TimelineSamplerSourcePair<T> | null;
  samplerSources?: Readonly<Record<string, T | null>>;
}

function namespaceTimelineSamplerSources<T>(
  layer: TimelineSamplerSourceLayer<T>,
  namespace: string,
): Record<string, T | null> {
  const directSources: Record<string, T | null> = {
    ...(layer.samplerSources ?? {}),
  };

  if (layer.transitionInputSources) {
    directSources.u_timeline_from_image = layer.transitionInputSources.from;
    directSources.u_timeline_to_image = layer.transitionInputSources.to;
  }

  if (layer.transitionOverlaySources) {
    directSources.u_timeline_from_overlay_image = layer.transitionOverlaySources.from;
    directSources.u_timeline_to_overlay_image = layer.transitionOverlaySources.to;
  } else if (layer.overlaySource !== undefined && layer.overlaySource !== null) {
    directSources.u_timeline_overlay_image = layer.overlaySource;
  }

  return Object.fromEntries(
    Object.entries(directSources).map(([uniformName, source]) => [
      `${namespace}_${uniformName}`,
      source,
    ]),
  );
}

/**
 * A timeline transition namespaces both child shader bodies. Any sampler
 * declared inside either child must be namespaced in exactly the same way so
 * the renderer can keep its texture source attached after transitions are
 * nested by Double mode.
 */
export function collectNestedTimelineSamplerSources<T>(
  fromLayer: TimelineSamplerSourceLayer<T>,
  toLayer: TimelineSamplerSourceLayer<T>,
): Record<string, T | null> {
  return {
    ...namespaceTimelineSamplerSources(fromLayer, 'timeline_from'),
    ...namespaceTimelineSamplerSources(toLayer, 'timeline_to'),
  };
}
