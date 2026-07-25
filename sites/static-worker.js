const HTML_ACCEPT_HEADER = 'text/html';

export default {
  async fetch(request, env) {
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return assetResponse;
    }

    const acceptedTypes = request.headers.get('accept') ?? '';
    if (!acceptedTypes.includes(HTML_ACCEPT_HEADER)) {
      return assetResponse;
    }

    const fallbackUrl = new URL('/index.html', request.url);
    return env.ASSETS.fetch(new Request(fallbackUrl, request));
  },
};
