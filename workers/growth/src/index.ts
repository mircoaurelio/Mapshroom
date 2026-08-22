import type { GrowthEnv } from './types';
import { withCors } from './http';
import { handleApiRequest, handleScheduled } from './routes/api';

export default {
  async fetch(request: Request, env: GrowthEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      const response = await handleApiRequest(request, env);
      return withCors(response, request);
    }

    return new Response('Mapshroom growth API. Use /api/* routes.', { status: 404 });
  },

  async scheduled(_controller: ScheduledController, env: GrowthEnv): Promise<void> {
    await handleScheduled(env);
  },
};
