// src/main.tsx
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import AuthGate from "./components/auth/AuthGate";
import { AcceptInvitePage } from "./pages/AcceptInvitePage";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { initMonitoring, monitoring } from "./lib/monitoring";
import { shouldRenderMobileLab } from "./dev/mobile-lab/mobileLabRouting";

// ✅ Tailwind + styles globaux
import "./styles.css";

// ── Initialisation du monitoring (Sentry) ────────────────────────────────────
initMonitoring();

// ── Capture globale des erreurs non gérées (Promise rejections, etc.) ────────
window.addEventListener("unhandledrejection", (event) => {
  monitoring.captureError(event.reason, {
    route: window.location.pathname,
    context: "unhandledrejection",
  });
});

window.addEventListener("error", (event) => {
  monitoring.captureError(event.error ?? event.message, {
    route: window.location.pathname,
    context: "window.onerror",
  });
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root #root introuvable dans index.html");

// Détection de la route /accept-invite avant tout rendu applicatif
const searchParams = new URLSearchParams(window.location.search);
const inviteToken = searchParams.get("token");
const isAcceptInvite =
  window.location.pathname.includes("accept-invite") && Boolean(inviteToken);
const isMobileLab = shouldRenderMobileLab(window.location.pathname, import.meta.env.DEV);
const MobileLab = isMobileLab ? lazy(() => import("./dev/mobile-lab/MobileLab")) : null;

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary context="root">
      {MobileLab ? (
        <Suspense fallback={null}>
          <MobileLab />
        </Suspense>
      ) : isAcceptInvite ? (
        <AcceptInvitePage token={inviteToken as string} />
      ) : (
        <AuthGate>
          <App />
        </AuthGate>
      )}
    </ErrorBoundary>
  </StrictMode>
);
