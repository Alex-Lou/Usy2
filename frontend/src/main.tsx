import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AppThemeProvider } from "./app/theme";
import { CompanionProvider } from "./app/companion";
import { AuthProvider } from "./features/auth/AuthContext";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppThemeProvider>
      <CompanionProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </CompanionProvider>
    </AppThemeProvider>
  </React.StrictMode>,
);
