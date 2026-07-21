import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command }) => {
  // Custom domain (mapshroom.dev) and Cloudflare Pages serve from root.
  // Override with BASE_PATH=/Mapshroom/ only if you still need GitHub Pages.
  const base = command === 'build' ? (process.env.BASE_PATH || '/') : '/';

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'assets/icons/mapshroom-mark.svg',
          'assets/icons/mapshroom-maskable.svg',
          'browserconfig.xml',
        ],
        manifest: {
          name: 'Mapshroom Pocket',
          short_name: 'Mapshroom',
          id: base,
          description: 'Mapshroom Pocket - AI-powered projection mapping studio',
          start_url: base,
          scope: base,
          display: 'standalone',
          background_color: '#09090b',
          theme_color: '#09090b',
          orientation: 'any',
          icons: [
            {
              src: 'assets/icons/mapshroom-maskable.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
            {
              src: 'assets/icons/mapshroom-maskable.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any',
            },
            {
              src: 'assets/icons/mapshroom-maskable.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any',
            },
            {
              src: 'assets/icons/mapshroom-maskable.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          // Default stage assets are large; raise the precache ceiling so offline install includes them.
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff2,json,webmanifest}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          // Enable with `npm run build && npm run preview` to test install/offline.
          enabled: false,
        },
      }),
    ],
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
