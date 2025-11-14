/**
 * Register Service Worker for background sync
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Workers are not supported in this browser");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/service-worker.js", {
      scope: "/"
    });

    console.log("Service Worker registered:", registration.scope);

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    console.log("Service Worker ready");

    // Listen for updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("New Service Worker installed, reload to activate");
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error("Service Worker registration failed:", error);
    return null;
  }
}

/**
 * Check if Background Sync API is supported
 */
export function isBackgroundSyncSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "sync" in ServiceWorkerRegistration.prototype
  );
}


