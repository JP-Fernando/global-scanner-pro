/** App-shell registration shared by the desktop and Android entry points. */
export async function registerAppServiceWorker(
  basePath: string = (import.meta as any).env?.VITE_BASE_PATH ?? '/',
  onUpdate?: (registration: ServiceWorkerRegistration) => void
): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register(`${basePath}sw.js`);
    if (registration.waiting && navigator.serviceWorker.controller) onUpdate?.(registration);
    registration.addEventListener('updatefound', () => {
      registration.installing?.addEventListener('statechange', () => {
        if (registration.waiting && navigator.serviceWorker.controller) onUpdate?.(registration);
      });
    });
    await navigator.serviceWorker.ready;
  } catch (error: unknown) {
    console.warn('Service worker registration failed:', error instanceof Error ? error.message : error);
  }
}
