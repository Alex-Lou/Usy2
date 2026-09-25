import { isNativeApp } from "./lib/native";

// Registers the service worker so the app is installable ("Ajouter à l'écran
// d'accueil") and has an offline shell. Production only — in dev a SW would
// cache the Vite dev server and get in the way. Failures are non-fatal.
// Not inside the Android app (Tauri): it ships its own files, and web push
// does not exist there.
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator) || isNativeApp()) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support is best-effort */
    });
  });
}
