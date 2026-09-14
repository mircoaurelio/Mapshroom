/** Keep render diagnostics available across the hash router's canonical redirect. */
export function canonicalWorkspaceUrl(pathname: string, routePath: string, routeSearch: string, search: string) {
  const incoming = new URLSearchParams(search);
  const retained = new URLSearchParams();
  for (const key of ['performance', 'quality']) {
    if (incoming.has(key)) retained.set(key, incoming.get(key)!);
  }
  const query = retained.toString();
  return `${pathname}${query ? `?${query}` : ''}#${routePath}${routeSearch}`;
}

export function readRenderRuntimeOptions(location: { search: string; hash: string }) {
  const root = new URLSearchParams(location.search);
  const route = new URLSearchParams(location.hash.split('?')[1] ?? '');
  return {
    diagnostics: route.has('performance') || root.has('performance'),
    experimentalQuality: (route.has('quality') ? route.get('quality') : root.get('quality')) === 'adaptive',
  };
}
