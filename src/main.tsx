// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import AuthGate from "./components/auth/AuthGate";

// ✅ Tailwind + styles globaux
import "./styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root #root introuvable dans index.html");

createRoot(rootElement).render(
  <StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </StrictMode>
);
