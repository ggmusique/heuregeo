import { useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

const LS_CURRENT_VERSION = "pwa-current-version";
const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "?";

export function UpdatePrompt() {
  const [state, setState] = useState(null); // 'update-ready' | 'just-updated' | null
  const waitingWorkerRef = useRef(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const storedVersion = localStorage.getItem(LS_CURRENT_VERSION);
    if (storedVersion && storedVersion !== APP_VERSION) {
      localStorage.setItem(LS_CURRENT_VERSION, APP_VERSION);
      setState("just-updated");
      const t = setTimeout(() => setState(null), 4000);
      return () => clearTimeout(t);
  // 'update-ready' | 'just-updated' | null
  const [state, setState] = useState(null);
  const hideTimerRef = useRef(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const interval = setInterval(() => {
        registration.update().catch(() => {});
      }, 60 * 1000);
      window.addEventListener(
        "beforeunload",
        () => clearInterval(interval),
        { once: true }
      );
    },
  });

  useEffect(() => {
    const storedVersion = localStorage.getItem(LS_CURRENT_VERSION);

    if (storedVersion && storedVersion !== APP_VERSION) {
      localStorage.setItem(LS_CURRENT_VERSION, APP_VERSION);
      setState("just-updated");
      hideTimerRef.current = setTimeout(() => setState(null), 4000);
      return () => {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      };
    }

    if (!storedVersion) {
      localStorage.setItem(LS_CURRENT_VERSION, APP_VERSION);
    }

    let cancelled = false;
    let interval = null;

    const showUpdateBanner = (worker) => {
      if (cancelled) return;
      waitingWorkerRef.current = worker;
      setState("update-ready");
    };

    const watchInstallingWorker = (registration) => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      const onStateChange = () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller &&
          !cancelled
        ) {
          showUpdateBanner(newWorker);
        }

        if (newWorker.state === "installed" || newWorker.state === "redundant") {
          newWorker.removeEventListener("statechange", onStateChange);
        }
      };

      newWorker.addEventListener("statechange", onStateChange);
    };

    navigator.serviceWorker.ready.then((registration) => {
      if (cancelled) return;

      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateBanner(registration.waiting);
      }

      registration.addEventListener("updatefound", () => watchInstallingWorker(registration));

      interval = setInterval(() => {
        registration.update().catch(() => {});
      }, 60 * 1000);
    });

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, []);

  const handleUpdate = () => {
    const doUpdate = (worker) => {
      setState(null);
      worker.postMessage({ type: "SKIP_WAITING" });
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => window.location.reload(),
        { once: true }
      );
    };

    if (waitingWorkerRef.current) {
      doUpdate(waitingWorkerRef.current);
      return;
    }

    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) doUpdate(registration.waiting);
    });
  };

    return undefined;
  }, []);

  useEffect(() => {
    if (needRefresh) {
      setState("update-ready");
    }
  }, [needRefresh]);

  const handleUpdate = async () => {
    setNeedRefresh(false);
    setState(null);
    await updateServiceWorker(true);
  };

  if (state === "just-updated") {
    return (
      <div className="fixed top-4 left-4 right-4 z-[2000]">
        <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 border border-emerald-500/50 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-white font-bold text-sm">Mise à jour appliquée</p>
              <p className="text-white/60 text-xs">v{APP_VERSION} — L'app est à jour</p>
            </div>
          </div>
          <button onClick={() => setState(null)} className="text-white/40 text-xl px-2">
            ✕
          </button>
        </div>
      </div>
    );
  }

  if (state === "update-ready") {
    return (
      <div className="fixed top-4 left-4 right-4 z-[2000]">
        <div className="bg-gradient-to-r from-[#0A1628] to-[#020818] border border-yellow-600/50 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔄</span>
            <div>
              <p className="text-white font-bold text-sm">Mise à jour disponible</p>
              <p className="text-white/50 text-xs">Nouvelle version prête à installer</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => {
                setNeedRefresh(false);
                setState(null);
              }}
              className="px-3 py-2 rounded-xl text-white/40 text-xs font-medium border border-white/10 active:scale-95"
            >
              Plus tard
            </button>
            <button
              onClick={handleUpdate}
              className="px-4 py-2 rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#A07830] text-white text-xs font-black uppercase tracking-wider active:scale-95 shadow-lg"
            >
              Mettre à jour
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
