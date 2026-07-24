import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command }) => {
  // Custom domain (mapshroom.dev) and Cloudflare Pages serve from root.
  // Override with BASE_PATH=/Mapshroom/ only if you still need GitHub Pages.
  const base = command === 'build' ? (process.env.BASE_PATH || '/') : '/';
  const offlineBuildId =
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    `local-${new Date().toISOString()}`;

  return {
    plugins: [
      react(),
      {
        name: 'mapshroom-offline-build-marker',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'offline-ready.json',
            source: JSON.stringify({
              schemaVersion: 1,
              buildId: offlineBuildId,
            }),
          });
        },
      },
      VitePWA({
        registerType: 'autoUpdate',
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
              src: 'assets/icons/mapshroom-pwa-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'assets/icons/mapshroom-pwa-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'assets/icons/mapshroom-pwa-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          // Include the complete editor shell and its bundled media/tools in the offline install.
          maximumFileSizeToCacheInBytes: 32 * 1024 * 1024,
          globPatterns: [
            '**/*.{js,css,html,ico,png,jpg,jpeg,webp,avif,svg,woff,woff2,json,mp4,webm,ogg,wav,wasm,onnx,data,bin,obj,mtl,gltf,glb}',
          ],
          // Manifest icons are added by vite-plugin-pwa with content revisions.
          // Exclude their copied files from the glob to avoid conflicting precache keys.
          globIgnores: [
            'assets/icons/mapshroom-pwa-192.png',
            'assets/icons/mapshroom-pwa-512.png',
          ],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/a(?:\/|$)/],
          runtimeCaching: [
            {
              // Keep editor media and local model files available after they are first requested.
              urlPattern:
                /\.(?:png|jpe?g|webp|avif|svg|mp4|webm|ogg|wav|wasm|onnx|data|bin|obj|mtl|gltf|glb)(?:\?.*)?$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'mapshroom-runtime-assets',
                expiration: {
                  maxEntries: 160,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
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
    define: {
      __MAPSHROOM_BUILD_ID__: JSON.stringify(offlineBuildId),
    },
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
