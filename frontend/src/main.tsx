import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AppThemeProvider } from "./app/theme";
import { NotificationsProvider } from "./app/notifications";
import { AuthProvider } from "./features/auth/AuthContext";
import { openExternalLinksNatively } from "./lib/native";
import { registerServiceWorker } from "./registerSW";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <NotificationsProvider>
            <App />
          </NotificationsProvider>
        </AuthProvider>
      </BrowserRouter>
    </AppThemeProvider>
  </React.StrictMode>,
);

registerServiceWorker();
openExternalLinksNatively();

// After a new release, an open tab may ask for a page file that no longer exists: reload once to get the new ones.
window.addEventListener("vite:preloadError", (event) => {
  const last = Number(sessionStorage.getItem("memocat.reloadedAt") ?? 0);
  if (Date.now() - last < 10_000) return; // already tried: let the error show, no reload loop
  event.preventDefault();
  sessionStorage.setItem("memocat.reloadedAt", String(Date.now()));
  window.location.reload();
});
