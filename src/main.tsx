// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import AuthGate from "./components/auth/AuthGate";
import { AcceptInvitePage } from "./pages/AcceptInvitePage";

// ✅ Tailwind + styles globaux
import "./styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root #root introuvable dans index.html");

// Détection de la route /accept-invite avant tout rendu applicatif
const searchParams = new URLSearchParams(window.location.search);
const inviteToken = searchParams.get("token");
const isAcceptInvite =
  window.location.pathname.includes("accept-invite") && Boolean(inviteToken);

createRoot(rootElement).render(
  <StrictMode>
    {isAcceptInvite ? (
      <AcceptInvitePage token={inviteToken as string} />
    ) : (
      <AuthGate>
        <App />
      </AuthGate>
    )}
  </StrictMode>
);
