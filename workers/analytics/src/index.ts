/**
 * First-party PostHog EU reverse proxy for mapshroom.dev/a/*
 * Based on https://posthog.com/docs/advanced/proxy/cloudflare
 *
 * Country comes from PostHog geoIP via X-Forwarded-For (CF-Connecting-IP).
 * Raw IPs are not written into event properties by this Worker.
 */

const API_HOST = 'eu.i.posthog.com';
const ASSET_HOST = 'eu-assets.i.posthog.com';
const PATH_PREFIX = '/a';

function stripPrefix(pathname: string): string {
  if (pathname === PATH_PREFIX) {
    return '/';
  }
  if (pathname.startsWith(`${PATH_PREFIX}/`)) {
    return pathname.slice(PATH_PREFIX.length) || '/';
  }
  return pathname;
}

function addCorsHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', '*');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function retrieveAsset(
  request: Request,
  pathname: string,
  ctx: ExecutionContext,
): Promise<Response> {
  const cacheRequest = new Request(new URL(pathname, request.url).toString(), request);
  let response = await caches.default.match(cacheRequest);
  if (!response) {
    response = await fetch(`https://${ASSET_HOST}${pathname}`);
    ctx.waitUntil(caches.default.put(cacheRequest, response.clone()));
  }
  return response;
}

async function forwardRequest(request: Request, pathWithSearch: string): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const originHeaders = new Headers(request.headers);
  originHeaders.delete('cookie');
  originHeaders.set('X-Forwarded-For', ip);

  // Prefer PostHog geoIP from the real client IP; also pass country hint when present.
  const country = (request as Request & { cf?: { country?: string } }).cf?.country;
  if (country) {
    originHeaders.set('X-Mapshroom-Country', country);
  }

  const originRequest = new Request(`https://${API_HOST}${pathWithSearch}`, {
    method: request.method,
    headers: originHeaders,
    body:
      request.method !== 'GET' && request.method !== 'HEAD'
        ? await request.arrayBuffer()
        : null,
    redirect: 'follow',
  });

  return fetch(originRequest);
}

async function handleRequest(request: Request, ctx: ExecutionContext): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return addCorsHeaders(new Response(null, { status: 204 }));
  }

  const url = new URL(request.url);
  const pathname = stripPrefix(url.pathname);
  const pathWithParams = pathname + url.search;

  const response =
    pathname.startsWith('/static/') || pathname.startsWith('/array/')
      ? await retrieveAsset(request, pathWithParams, ctx)
      : await forwardRequest(request, pathWithParams);

  return addCorsHeaders(response);
}

export default {
  async fetch(request: Request, _env: unknown, ctx: ExecutionContext): Promise<Response> {
    return handleRequest(request, ctx);
  },
};
