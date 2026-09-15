import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';
import { getShaderChatResults } from '../src/lib/shaderChatResults.ts';
import type { AiSettings, ShaderChatTurn } from '../src/types.ts';

const shader = `// NAME: API chat result
uniform float speed; // @min -2 @max 2 @default 0.25
uniform float glow; // @min 0 @max 3 @default 1
uniform vec3 warmColor; // @default 1,0.4,0.1
vec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {
  return texture(tex, uv) * vec4(warmColor * (glow + speed * 0.0), 1.0);
}`;

test('cloud replies and API errors stay in the shader chat, including a stale chat runtime', async (t) => {
  const server = await createServer({
    configFile: false,
    appType: 'custom',
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, watch: null, hmr: false },
  });
  try {
    const { requestShaderMutation } = await server.ssrLoadModule(
      '/src/lib/shaderGeneration.ts',
    );
    for (const provider of ['openai', 'anthropic', 'google'] as const) {
      await t.test(provider, async (caseContext) => {
        const settings: AiSettings = {
          openaiApiKey: 'test-only-key',
          anthropicApiKey: 'test-only-key',
          googleApiKey: 'test-only-key',
          runwayApiKey: '',
          openaiShaderModel: 'test-model',
          anthropicShaderModel: 'test-model',
          googleShaderModel: 'test-model',
          shaderProvider: provider,
          shaderRuntime: 'chat',
          localShaderModel: '',
          visionEnabled: false,
          videoGenProvider: 'runway',
        };
        const requests: Array<{ url: string; body: string }> = [];
        let failure = false;
        caseContext.mock.method(
          globalThis,
          'fetch',
          async (input: string | URL | Request, init?: RequestInit) => {
            requests.push({
              url: String(input instanceof Request ? input.url : input),
              body: String(init?.body ?? ''),
            });
            if (failure)
              return Response.json(
                {
                  error: {
                    message: 'Test API key rejected',
                    code: 401,
                    status: 'UNAUTHENTICATED',
                  },
                },
                { status: 401 },
              );
            return Response.json(
              provider === 'openai'
                ? { output_text: shader }
                : provider === 'anthropic'
                  ? { content: [{ type: 'text', text: shader }] }
                  : {
                      candidates: [
                        {
                          content: { role: 'model', parts: [{ text: shader }] },
                          finishReason: 'STOP',
                        },
                      ],
                    },
            );
          },
        );
        const firstPrompt = 'Use warm colors';
        const first = await requestShaderMutation({
          settings,
          prompt: firstPrompt,
          currentCode: shader,
        });
        assert.match(first, /API chat result/);
        const history: ShaderChatTurn[] = [
          { role: 'user', text: firstPrompt },
          { role: 'model', text: first },
        ];
        const version = {
          id: 'api-result',
          name: 'API chat result',
          prompt: firstPrompt,
          code: first,
          createdAt: new Date().toISOString(),
        };
        assert.deepEqual(getShaderChatResults([version], history), [version]);
        await requestShaderMutation({
          settings,
          prompt: 'Now make it brighter',
          currentCode: first,
          chatHistory: history,
        });
        assert.equal(requests.length, 2);
        assert.ok(
          requests.every((request) =>
            request.url.includes(
              provider === 'google'
                ? 'generativelanguage.googleapis.com'
                : `api.${provider}.com`,
            ),
          ),
        );
        assert.match(requests[1].body, /Use warm colors/);
        assert.match(requests[1].body, /Now make it brighter/);
        failure = true;
        await assert.rejects(
          requestShaderMutation({
            settings,
            prompt: 'Try again',
            currentCode: first,
          }),
          /Test API key rejected/,
        );
        assert.equal(
          requests.length,
          3,
          'an API failure must not retry with another provider',
        );
      });
    }
  } finally {
    await server.close();
  }
});
