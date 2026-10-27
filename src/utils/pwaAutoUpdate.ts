import { registerSW } from 'virtual:pwa-register';

let updateSWInstance: ((reloadPage?: boolean) => Promise<void>) | null = null;

/**
 * Initializes PWA Service Worker with aggressive automatic updates:
 * 1. Checks for new code/assets whenever the user opens or refocuses the app.
 * 2. Listens to controllerchange to reload immediately when a new SW activates.
 * 3. Periodically polls for updates every 5 minutes.
 * 4. Shows a subtle user-friendly confirmation that the app is running the latest version.
 */
export function initPWAAutoUpdate(onUpdated?: () => void) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    // Listen for new controller taking over -> auto reload
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('[PWA] New controller activated, reloading page...');
        sessionStorage.setItem('kmf_app_just_updated', 'true');
        window.location.reload();
      }
    });

    updateSWInstance = registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('[PWA] New version detected, updating installed app...');
        sessionStorage.setItem('kmf_app_just_updated', 'true');
        if (updateSWInstance) {
          updateSWInstance(true).then(() => {
            if (onUpdated) onUpdated();
          });
        } else {
          window.location.reload();
        }
      },
      onOfflineReady() {
        console.log('[PWA] App is cached and ready to run offline.');
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;

        // Periodic update check every 5 minutes
        setInterval(() => {
          registration.update().catch((err) => {
            console.debug('[PWA] Periodic update check silent error:', err);
          });
        }, 5 * 60 * 1000);

        // Check for updates whenever user switches back to the app on Android/iOS
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch((err) => {
              console.debug('[PWA] Visibility update check silent error:', err);
            });
          }
        });

        // Check for updates when internet connection is restored
        window.addEventListener('online', () => {
          registration.update().catch((err) => {
            console.debug('[PWA] Online update check silent error:', err);
          });
        });
      },
    });
  } catch (err) {
    console.debug('[PWA] Service worker registration error:', err);
  }
}

/**
 * Hard cache purge and force reload:
 * Clears old cacheStorage caches and forces a network fetch of latest assets.
 */
export async function forcePurgeCacheAndReload(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem('kmf_app_just_updated', 'true');

    // 1. Update/kick service worker
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.update();
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    }

    // 2. Clear application caches (HTML, JS, CSS)
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        if (!name.includes('google-fonts') && !name.includes('gstatic')) {
          await caches.delete(name);
        }
      }
    }
  } catch (err) {
    console.debug('[PWA] Cache purge error:', err);
  }

  // 3. Force reload
  window.location.reload();
}
