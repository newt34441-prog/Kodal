import { registerSW } from 'virtual:pwa-register';

export const APP_NAME_BN = 'কোদালপুর মানবিক ফাউন্ডেশন';

export interface AppUpdateState {
  appName: string;
  updateAvailable: boolean;
  latestVersion: string | null;
  latestVersionNumber: string | null;
  currentVersion: string;
  currentVersionNumber: string;
  buildTime: string;
  lastCheckedAt: string | null;
  isOnline: boolean;
  checking: boolean;
  updating: boolean;
  source: 'sw' | 'version' | null;
  isApkMode: boolean;
}

type UpdateListener = (state: AppUpdateState) => void;

const CURRENT_VERSION =
  typeof __APP_BUILD_VERSION__ !== 'undefined' ? __APP_BUILD_VERSION__ : 'dev';
const CURRENT_VERSION_NUMBER =
  typeof __APP_VERSION_NUMBER__ !== 'undefined' ? __APP_VERSION_NUMBER__ : 'v2.0.0';
const BUILD_TIME =
  typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : new Date().toISOString();

const SYNC_CHANNEL_NAME = 'kmf-pwa-update-sync';
const SYNC_STORAGE_KEY = 'kmf_pwa_sync_event';

export function isApkOrStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.startsWith('android-app://')
  );
}

export function formatBengaliBuildDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

let updateState: AppUpdateState = {
  appName: APP_NAME_BN,
  updateAvailable: false,
  latestVersion: null,
  latestVersionNumber: null,
  currentVersion: CURRENT_VERSION,
  currentVersionNumber: CURRENT_VERSION_NUMBER,
  buildTime: BUILD_TIME,
  lastCheckedAt: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  checking: false,
  updating: false,
  source: null,
  isApkMode: isApkOrStandaloneMode(),
};

const listeners = new Set<UpdateListener>();
let updateSWInstance: ((reloadPage?: boolean) => Promise<void>) | null = null;
let swRegistration: ServiceWorkerRegistration | null = null;
let syncChannel: BroadcastChannel | null = null;
let initialized = false;
let isReloadingForUpdate = false;

function getSnapshot(): AppUpdateState {
  return {
    ...updateState,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : updateState.isOnline,
    isApkMode: isApkOrStandaloneMode(),
  };
}

function notifyListeners() {
  const snapshot = getSnapshot();
  listeners.forEach((listener) => listener(snapshot));
}

function broadcastSyncEvent(
  type: 'UPDATE_DETECTED' | 'UPDATE_APPLYING',
  payload?: { latestVersion?: string | null; latestVersionNumber?: string | null }
) {
  const message = {
    type,
    latestVersion: payload?.latestVersion ?? updateState.latestVersion,
    latestVersionNumber: payload?.latestVersionNumber ?? updateState.latestVersionNumber,
    ts: Date.now(),
  };
  try {
    syncChannel?.postMessage(message);
  } catch {
    // Ignore BroadcastChannel errors
  }
  try {
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(message));
  } catch {
    // Ignore localStorage quota/privacy errors
  }
}

function setUpdateAvailable(
  source: 'sw' | 'version',
  latestVersion?: string | null,
  latestVersionNumber?: string | null,
  fromRemoteBroadcast = false
) {
  const nextVersion = latestVersion || updateState.latestVersion;
  const nextVersionNumber = latestVersionNumber || updateState.latestVersionNumber;
  const changed =
    !updateState.updateAvailable ||
    nextVersion !== updateState.latestVersion ||
    nextVersionNumber !== updateState.latestVersionNumber;

  updateState = {
    ...updateState,
    updateAvailable: true,
    latestVersion: nextVersion || null,
    latestVersionNumber: nextVersionNumber || null,
    source: updateState.source || source,
    isApkMode: isApkOrStandaloneMode(),
  };

  if (changed) {
    notifyListeners();
    sendBrowserUpdateNotification(nextVersion || nextVersionNumber || 'new-build');
    if (!fromRemoteBroadcast) {
      broadcastSyncEvent('UPDATE_DETECTED', {
        latestVersion: nextVersion,
        latestVersionNumber: nextVersionNumber,
      });
    }
  }
}

export function subscribeAppUpdate(listener: UpdateListener): () => void {
  listeners.add(listener);
  listener(getSnapshot());
  return () => {
    listeners.delete(listener);
  };
}

export function getAppUpdateState(): AppUpdateState {
  return getSnapshot();
}

/**
 * Sends a native Android/Desktop notification if the user has granted permission.
 * Deduplicated per version so the user is not notified repeatedly for the same build.
 */
export function sendBrowserUpdateNotification(versionKey: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notifiedKey = 'kmf_notified_update_version';
    if (localStorage.getItem(notifiedKey) === versionKey) return;
    localStorage.setItem(notifiedKey, versionKey);

    const notification = new Notification(`${APP_NAME_BN} — নতুন আপডেট`, {
      body: 'নতুন আপডেট পাওয়া গেছে। সর্বশেষ সুবিধা পেতে অ্যাপটি আপডেট করুন।',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'kmf-app-update',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (err) {
    console.debug('[PWA] Browser notification skipped:', err);
  }
}

export async function requestUpdateNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    if (Notification.permission === 'granted') return 'granted';
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return Notification.permission;
  }
}

function reloadWithCacheBust() {
  if (isReloadingForUpdate) return;
  isReloadingForUpdate = true;

  try {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('_v', String(Date.now()));
    window.location.replace(nextUrl.toString());
  } catch {
    window.location.reload();
  }
}

function attachUpdateFoundListener(registration: ServiceWorkerRegistration) {
  if ((registration as ServiceWorkerRegistration & { _kmfListenerAttached?: boolean })._kmfListenerAttached) {
    return;
  }
  (registration as ServiceWorkerRegistration & { _kmfListenerAttached?: boolean })._kmfListenerAttached = true;

  registration.addEventListener('updatefound', () => {
    const installing = registration.installing;
    if (!installing) return;
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed' && navigator.serviceWorker.controller) {
        setUpdateAvailable('sw');
      }
    });
  });
}

/**
 * Checks both Service Worker registration and server /version.json
 * to reliably detect updates in APK/Standalone mode and web browsers.
 * Skips network requests gracefully when offline so cached app keeps running smoothly.
 */
export async function checkForAppUpdate(manual = false): Promise<{
  updateAvailable: boolean;
  upToDate: boolean;
  offline?: boolean;
}> {
  if (typeof window === 'undefined') {
    return { updateAvailable: false, upToDate: true };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    updateState = { ...updateState, isOnline: false, checking: false };
    notifyListeners();
    return {
      updateAvailable: updateState.updateAvailable,
      upToDate: !updateState.updateAvailable,
      offline: true,
    };
  }

  if (manual) {
    updateState = { ...updateState, checking: true, isOnline: true };
    notifyListeners();
  }

  let detected = updateState.updateAvailable;

  try {
    // 1. Check Service Worker update
    if (swRegistration) {
      attachUpdateFoundListener(swRegistration);
      await swRegistration.update().catch(() => {});
      if (swRegistration.waiting) {
        detected = true;
        setUpdateAvailable('sw');
      }
    } else if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations().catch(() => []);
      for (const reg of regs) {
        attachUpdateFoundListener(reg);
        await reg.update().catch(() => {});
        if (reg.waiting) {
          detected = true;
          setUpdateAvailable('sw');
        }
      }
    }

    // 2. Check server version.json directly from network (bypassing SW/HTTP cache)
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });

    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = (await response.json()) as {
          version?: string;
          versionNumber?: string;
          buildTime?: string;
        };
        const serverVersion = data?.version;
        const serverVersionNumber = data?.versionNumber || null;

        const recentTarget = sessionStorage.getItem('kmf_updated_target_version');
        const recentAt = Number(sessionStorage.getItem('kmf_updated_at') || '0');
        const isJustUpdatedSameTarget =
          recentTarget === serverVersion && Date.now() - recentAt < 15000;

        if (
          serverVersion &&
          CURRENT_VERSION &&
          serverVersion !== CURRENT_VERSION &&
          !isJustUpdatedSameTarget
        ) {
          detected = true;
          setUpdateAvailable('version', serverVersion, serverVersionNumber);
        }
      }
    }

    updateState = {
      ...updateState,
      isOnline: true,
      lastCheckedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.debug('[PWA] Version check note:', err);
  } finally {
    if (manual) {
      updateState = { ...updateState, checking: false };
    }
    notifyListeners();
  }

  return {
    updateAvailable: detected,
    upToDate: !detected,
  };
}

/**
 * Applies the pending update by clearing outdated caches, activating waiting SW,
 * coordinating open tabs/windows, and reloading cleanly into the latest build.
 */
export async function applyAppUpdate(fromRemoteTab = false): Promise<void> {
  if (typeof window === 'undefined') return;

  updateState = { ...updateState, updating: true };
  notifyListeners();

  try {
    sessionStorage.setItem('kmf_app_just_updated', 'true');
    if (updateState.latestVersion) {
      sessionStorage.setItem('kmf_updated_target_version', updateState.latestVersion);
      sessionStorage.setItem('kmf_updated_at', String(Date.now()));
    }

    if (!fromRemoteTab) {
      broadcastSyncEvent('UPDATE_APPLYING');
    }

    // Clear outdated app caches (preserve Google Fonts caches)
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        if (!name.includes('google-fonts') && !name.includes('gstatic')) {
          await caches.delete(name);
        }
      }
    }

    // Activate waiting SW via vite-plugin-pwa helper (false = we handle cache-busted reload)
    if (updateSWInstance) {
      await updateSWInstance(false).catch(() => {});
    }

    // Ensure any waiting registration skips waiting
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    }

    // Brief pause so SKIP_WAITING takes control before navigation
    await new Promise((resolve) => setTimeout(resolve, 180));
  } catch (err) {
    console.debug('[PWA] Apply update error:', err);
  }

  reloadWithCacheBust();
}

/**
 * Initializes PWA Service Worker, multi-tab sync, offline/online listeners,
 * and periodic version manifest polling.
 */
export function initPWAAutoUpdate(onUpdated?: () => void) {
  if (typeof window === 'undefined' || initialized) {
    return;
  }
  initialized = true;

  // Clean temporary cache-buster query param after reload
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has('_v')) {
      url.searchParams.delete('_v');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  } catch {
    // ignore URL cleanup error
  }

  // Multi-tab & installed-app update coordination via BroadcastChannel
  if ('BroadcastChannel' in window) {
    try {
      syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      syncChannel.onmessage = (event) => {
        const msg = event.data as {
          type?: string;
          latestVersion?: string | null;
          latestVersionNumber?: string | null;
        };
        if (msg?.type === 'UPDATE_DETECTED') {
          setUpdateAvailable('version', msg.latestVersion, msg.latestVersionNumber, true);
        } else if (msg?.type === 'UPDATE_APPLYING') {
          applyAppUpdate(true);
        }
      };
    } catch {
      // ignore if BroadcastChannel unsupported
    }
  }

  // Fallback cross-tab coordination via storage event
  window.addEventListener('storage', (event) => {
    if (event.key !== SYNC_STORAGE_KEY || !event.newValue) return;
    try {
      const msg = JSON.parse(event.newValue) as {
        type?: string;
        latestVersion?: string | null;
        latestVersionNumber?: string | null;
      };
      if (msg?.type === 'UPDATE_DETECTED') {
        setUpdateAvailable('version', msg.latestVersion, msg.latestVersionNumber, true);
      } else if (msg?.type === 'UPDATE_APPLYING') {
        applyAppUpdate(true);
      }
    } catch {
      // ignore malformed storage event
    }
  });

  // Automatically recover if a stale chunk preload fails after a new deploy
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    applyAppUpdate();
  });

  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (updateState.updating) {
          sessionStorage.setItem('kmf_app_just_updated', 'true');
          reloadWithCacheBust();
        }
      });

      updateSWInstance = registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('[PWA] New app version detected, prompting user to update.');
          setUpdateAvailable('sw');
          if (onUpdated) onUpdated();
        },
        onOfflineReady() {
          console.log('[PWA] App is cached and ready to run offline.');
        },
        onRegisteredSW(_swUrl, registration) {
          if (!registration) return;
          swRegistration = registration;
          attachUpdateFoundListener(registration);

          if (registration.waiting) {
            setUpdateAvailable('sw');
          }

          // Check periodically every 90 seconds while online
          setInterval(() => {
            checkForAppUpdate(false);
          }, 90 * 1000);
        },
      });
    }

    // Initial check shortly after startup
    setTimeout(() => {
      checkForAppUpdate(false);
    }, 2000);

    // Check whenever user opens or returns to the installed APK/app
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForAppUpdate(false);
      }
    });

    window.addEventListener('focus', () => {
      checkForAppUpdate(false);
    });

    // Track online/offline transitions and auto-check immediately when internet returns
    window.addEventListener('online', () => {
      updateState = { ...updateState, isOnline: true };
      notifyListeners();
      checkForAppUpdate(false);
    });

    window.addEventListener('offline', () => {
      updateState = { ...updateState, isOnline: false, checking: false };
      notifyListeners();
    });
  } catch (err) {
    console.debug('[PWA] Initialization error:', err);
  }
}

/**
 * Hard cache purge and force reload:
 * Clears old cacheStorage caches and forces a network fetch of latest assets.
 */
export async function forcePurgeCacheAndReload(): Promise<void> {
  await applyAppUpdate();
}
