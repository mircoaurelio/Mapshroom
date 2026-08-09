import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// This isolated config intentionally excludes deployment plugins. The shader
// compatibility test must remain deterministic and runnable offline.
export default defineConfig({
  clearScreen: false,
  plugins: [react()],
  optimizeDeps: {
    entries: ['index.html', 'shader-smoke-test.html'],
  },
});
