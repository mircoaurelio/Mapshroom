import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

function normalizeShaderLabUrl() {
  return {
    name: 'normalize-shader-lab-url',
    configureServer(server: { middlewares: { use: (handler: (
      request: { url?: string },
      response: { statusCode: number; setHeader: (name: string, value: string) => void; end: () => void },
      next: () => void,
    ) => void) => void } }) {
      server.middlewares.use((request, response, next) => {
        const rawUrl = request.url;
        if (!rawUrl) {
          next();
          return;
        }

        const queryIndex = rawUrl.indexOf('?');
        const rawPath = queryIndex >= 0 ? rawUrl.slice(0, queryIndex) : rawUrl;
        const query = queryIndex >= 0 ? rawUrl.slice(queryIndex) : '';
        let decodedPath = rawPath;
        try {
          decodedPath = decodeURIComponent(rawPath);
        } catch {
          next();
          return;
        }

        if (/^\/shader-lab\/[\s\u00a0]*$/u.test(decodedPath) && decodedPath !== '/shader-lab/') {
          response.statusCode = 308;
          response.setHeader('Location', `/shader-lab/${query}`);
          response.end();
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ command }) => {
  // Custom domain (mapshroom.dev) and Cloudflare Pages serve from root.
  // Override with BASE_PATH=/Mapshroom/ only if you still need GitHub Pages.
  // Desktop/Tauri builds always use root and skip the Cloudflare plugin.
  const isDesktop =
    Boolean(process.env.TAURI_ENV_PLATFORM) || process.env.MAPSHROOM_DESKTOP === '1';
  const base = command === 'build' ? (process.env.BASE_PATH || '/') : '/';

  return {
    plugins: [
      normalizeShaderLabUrl(),
      react(),
      ...(isDesktop ? [] : [cloudflare()]),
    ],
    clearScreen: false,
    base,
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        // Local growth API Worker (`cd workers/growth && npx wrangler dev --port 8788`)
        '/api': {
          target: 'http://127.0.0.1:8788',
          changeOrigin: true,
        },
      },
    },
    envPrefix: ['VITE_', 'TAURI_'],
    build: {
      // Tauri uses Chromium on Windows; keep modern syntax for smaller bundles.
      target: isDesktop ? 'chrome105' : undefined,
      minify: process.env.TAURI_DEBUG ? false : true,
      sourcemap: Boolean(process.env.TAURI_DEBUG),
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          slicer: resolve(__dirname, 'slicer/index.html'),
          depthmap: resolve(__dirname, 'depthmap/index.html'),
          depthLabEval: resolve(__dirname, 'depth-lab-eval.html'),
          tutorial: resolve(__dirname, 'tutorial/index.html'),
          why: resolve(__dirname, 'why/index.html'),
          shader: resolve(__dirname, 'shader/index.html'),
          shaderLab: resolve(__dirname, 'shader-lab/index.html'),
          shaderVersionBenchmark: resolve(__dirname, 'shader-version-benchmark/index.html'),
          creatorchallenge: resolve(__dirname, 'creatorchallenge/index.html'),
        },
      },
    },
  };
});
