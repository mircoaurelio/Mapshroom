// Keep large installer downloads resumable without buffering them in Worker memory.
export async function desktopDownload(
  request: Request,
  bucket: R2Bucket,
  key: string,
): Promise<Response> {
  const metadata = await bucket.head(key);
  if (!metadata) {
    return Response.json({ ok: false, error: { code: 'download_unavailable', message: 'The Windows installer is temporarily unavailable. Please try again shortly.' } }, { status: 503 });
  }
  const headers = new Headers();
  metadata.writeHttpMetadata(headers);
  headers.set('Content-Type', 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="${key.split('/').pop()}"`);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('ETag', metadata.httpEtag);
  headers.set('Content-Length', String(metadata.size));
  headers.set('X-Content-Type-Options', 'nosniff');
  if (request.method === 'HEAD') return new Response(null, { headers });

  const ifRange = request.headers.get('if-range');
  const range = !ifRange || ifRange === metadata.httpEtag
    ? parseDownloadRange(request.headers.get('range'), metadata.size)
    : null;
  if (range === 'unsatisfiable') {
    headers.set('Content-Range', `bytes */${metadata.size}`);
    headers.delete('Content-Length');
    return new Response(null, { status: 416, headers });
  }
  const object = await bucket.get(key, range ? { range } : undefined);
  if (!object) return new Response('Installer unavailable. Please try again.', { status: 503 });
  if (range) {
    headers.set('Content-Range', `bytes ${range.offset}-${range.offset + range.length - 1}/${metadata.size}`);
    headers.set('Content-Length', String(range.length));
  }
  return new Response(object.body, { status: range ? 206 : 200, headers });
}

export function parseDownloadRange(header: string | null, size: number): { offset: number; length: number } | 'unsatisfiable' | null {
  if (!header) return null;
  // Ignore unsupported multipart or malformed ranges and serve the whole file.
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) return 'unsatisfiable';
  return { offset: start, length: end - start + 1 };
}
