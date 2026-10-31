/** App-shell registration shared by the desktop and Android entry points. */
export async function registerAppServiceWorker(
  basePath: string = (import.meta as any).env?.VITE_BASE_PATH ?? '/'
): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register(`${basePath}sw.js`);
    await navigator.serviceWorker.ready;
  } catch (error: unknown) {
    console.warn('Service worker registration failed:', error instanceof Error ? error.message : error);
  }
}
