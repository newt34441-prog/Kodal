import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const STARTUP_DATE = new Date();
const pad2 = (n: number) => String(n).padStart(2, '0');
const STARTUP_TIMESTAMP = STARTUP_DATE.toISOString();
const STARTUP_VERSION_NUMBER = `v2.0.${STARTUP_DATE.getFullYear()}${pad2(
  STARTUP_DATE.getMonth() + 1
)}${pad2(STARTUP_DATE.getDate())}.${pad2(STARTUP_DATE.getHours())}${pad2(STARTUP_DATE.getMinutes())}`;
const DEV_SESSION_VERSION = `dev-${STARTUP_DATE.getTime()}`;

function kmfVersionManifestPlugin(
  activeVersion: string,
  versionNumber: string,
  buildTime: string,
  isBuild: boolean
): Plugin {
  return {
    name: 'kmf-version-manifest',
    configureServer(server) {
      server.middlewares.use('/version.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.end(
          JSON.stringify({
            appName: 'কোদালপুর মানবিক ফাউন্ডেশন',
            version: activeVersion,
            versionNumber,
            buildTime,
          })
        );
      });
    },
    generateBundle() {
      if (isBuild) {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify(
            {
              appName: 'কোদালপুর মানবিক ফাউন্ডেশন',
              version: activeVersion,
              versionNumber,
              buildTime,
            },
            null,
            2
          ),
        });
      }
    },
  };
}

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';
  const buildDate = new Date();
  const buildTime = isBuild ? buildDate.toISOString() : STARTUP_TIMESTAMP;
  const versionNumber = isBuild
    ? `v2.0.${buildDate.getFullYear()}${pad2(buildDate.getMonth() + 1)}${pad2(
        buildDate.getDate()
      )}.${pad2(buildDate.getHours())}${pad2(buildDate.getMinutes())}`
    : STARTUP_VERSION_NUMBER;
  const activeVersion = isBuild ? buildTime : DEV_SESSION_VERSION;

  return {
    define: {
      __APP_BUILD_VERSION__: JSON.stringify(activeVersion),
      __APP_VERSION_NUMBER__: JSON.stringify(versionNumber),
      __APP_BUILD_TIME__: JSON.stringify(buildTime),
    },
    plugins: [
      react(),
      tailwindcss(),
      kmfVersionManifestPlugin(activeVersion, versionNumber, buildTime, isBuild),
      VitePWA({
        registerType: 'prompt',
        includeAssets: [],
        includeManifestIcons: false,
        manifest: {
          id: '/',
          name: 'কোদালপুর মানবিক ফাউন্ডেশন',
          short_name: 'কোদালপুর',
          description: 'কোদালপুর মানবিক ফাউন্ডেশন এর অফিসিয়াল অ্যান্ড্রয়েড অ্যাপ - সেবা, অনুদান, রক্তদাতা ও সদস্য ব্যবস্থাপনা।',
          theme_color: '#0B376B',
          background_color: '#F4F8FC',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          cacheId: 'kmf-pwa',
          // Exclude HTML from precache so NetworkFirst always delivers the newest index.html to installed APKs
          globPatterns: ['**/*.{js,css,ico,png,svg,woff,woff2}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          navigateFallback: undefined,
          runtimeCaching: [
            {
              // Always fetch version.json directly from the network so installed APKs detect updates immediately
              urlPattern: /\/version\.json/i,
              handler: 'NetworkOnly',
            },
            {
              // Navigation requests (HTML documents) use NetworkFirst with short timeout so deployed updates are fetched immediately
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'html-pages-cache',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 7,
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
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
          enabled: true,
          type: 'module',
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
