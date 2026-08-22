import type { GrowthEnv } from '../types';
import { nowIso } from './validation';

export async function consumeRateLimit(
  env: GrowthEnv,
  bucketKey: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const row = await env.DB.prepare(
    'SELECT count, window_start FROM rate_limits WHERE bucket_key = ?',
  )
    .bind(bucketKey)
    .first<{ count: number; window_start: string }>();

  if (!row) {
    await env.DB.prepare(
      'INSERT INTO rate_limits (bucket_key, count, window_start) VALUES (?, 1, ?)',
    )
      .bind(bucketKey, nowIso(new Date(now)))
      .run();
    return { allowed: true, remaining: limit - 1 };
  }

  const windowStart = new Date(row.window_start).getTime();
  if (now - windowStart >= windowMs) {
    await env.DB.prepare(
      'UPDATE rate_limits SET count = 1, window_start = ? WHERE bucket_key = ?',
    )
      .bind(nowIso(new Date(now)), bucketKey)
      .run();
    return { allowed: true, remaining: limit - 1 };
  }

  if (row.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  await env.DB.prepare('UPDATE rate_limits SET count = count + 1 WHERE bucket_key = ?')
    .bind(bucketKey)
    .run();
  return { allowed: true, remaining: limit - row.count - 1 };
}
