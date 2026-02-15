// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
registerSW({ immediate: true });


import App from "./App.jsx";
import AuthGate from "./components/auth/AuthGate.jsx";

// ✅ Tailwind + styles globaux
import "./styles.css";

// ✅ PWA: enregistre le service worker + auto update
registerSW({
  immediate: true,
  onOfflineReady() {
      },
  onNeedRefresh() {
        window.location.reload();
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root #root introuvable dans index.html");

createRoot(rootElement).render(
  <StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </StrictMode>
);
