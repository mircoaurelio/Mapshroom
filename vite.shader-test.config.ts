import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// This isolated config intentionally excludes deployment plugins. The shader
// compatibility test must remain deterministic and runnable offline.
export default defineConfig({
  clearScreen: false,
  plugins: [react()],
  optimizeDeps: {
    entries: ['index.html', 'shader-smoke-test.html', 'depth-lab-eval.html'],
  },
  build: {
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'index.html'),
        shaderSmoke: resolve(__dirname, 'shader-smoke-test.html'),
        depthLabEval: resolve(__dirname, 'depth-lab-eval.html'),
      },
    },
  },
});
