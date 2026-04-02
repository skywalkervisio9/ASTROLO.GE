/**
 * Resolves when prototype-runtime.js has fully loaded and all
 * window functions (hydrateReading, startLoading, etc.) are available.
 *
 * - If runtime already loaded (script was cached / fast connection): resolves instantly
 * - Otherwise: waits for the 'astrolo:runtime-ready' event
 */
export function whenRuntimeReady(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as unknown as Record<string, unknown>).__runtimeReady) {
      resolve();
      return;
    }
    window.addEventListener('astrolo:runtime-ready', () => resolve(), { once: true });
  });
}
