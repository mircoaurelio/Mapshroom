import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ command }) => {
  // Custom domain (mapshroom.dev) and Cloudflare Pages serve from root.
  // Override with BASE_PATH=/Mapshroom/ only if you still need GitHub Pages.
  const base = command === 'build' ? (process.env.BASE_PATH || '/') : '/';

  return {
    plugins: [react(), cloudflare()],
    base,
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          slicer: resolve(__dirname, 'slicer/index.html'),
          segmentation: resolve(__dirname, 'segmentation/index.html'),
          depthmap: resolve(__dirname, 'depthmap/index.html'),
        },
      },
    },
  };
});