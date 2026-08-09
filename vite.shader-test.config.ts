import { defineConfig } from 'vite';

// This isolated config intentionally excludes deployment plugins. The shader
// compatibility test must remain deterministic and runnable offline.
export default defineConfig({
  clearScreen: false,
  optimizeDeps: {
    noDiscovery: true,
  },
});
