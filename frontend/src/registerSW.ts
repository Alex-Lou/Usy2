// Registers the service worker so the app is installable ("Ajouter à l'écran
// d'accueil") and has an offline shell. Production only — in dev a SW would
// cache the Vite dev server and get in the way. Failures are non-fatal.
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support is best-effort */
    });
  });
}
