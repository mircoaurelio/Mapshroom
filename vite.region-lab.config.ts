import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: resolve(import.meta.dirname, 'region-lab'),
  base: './',
  server: { host: '127.0.0.1', port: 5187, strictPort: true },
  build: { outDir: '../dist-region-lab', emptyOutDir: true, target: 'es2022' },
});
