import React, { useMemo, useState } from "react";
import { Activity, Banknote, ChevronDown, Gauge, Hand, LayoutDashboard, Menu, PanelLeftOpen, Smartphone, X } from "lucide-react";

import { AppNavBar } from "../../components/layout/AppNavBar";
import { RapportBilanVisualV1 } from "../../components/bilan/RapportBilanVisualV1";
import { KpiCard } from "../../components/ui/KpiCard";
import { Modal } from "../../components/ui/Modal";
import { PermissionsContext } from "../../contexts/PermissionsContext";
import type { PermissionsContextType } from "../../contexts/PermissionsContext";
import { DarkModeProvider, useDarkMode, type AppTheme } from "../../contexts/DarkModeContext";
import type { NavItem } from "../../hooks/useNavigation";
import type { TabId } from "../../types/ui";
import { getMobileLabRoute, type MobileLabRoute } from "./mobileLabRouting";

import "./mobile-lab.css";

type DeviceKey = "iphone-15" | "iphone-se" | "pixel-8" | "galaxy-s24";

interface DevicePreset {
  key: DeviceKey;
  label: string;
  width: number;
  height: number;
  safeTop: number;
  safeBottom: number;
}

const DEVICE_PRESETS: DevicePreset[] = [
  { key: "iphone-15", label: "iPhone 15", width: 393, height: 852, safeTop: 47, safeBottom: 34 },
  { key: "iphone-se", label: "iPhone SE", width: 375, height: 667, safeTop: 20, safeBottom: 0 },
  { key: "pixel-8", label: "Pixel 8", width: 412, height: 915, safeTop: 28, safeBottom: 16 },
  { key: "galaxy-s24", label: "Galaxy S24", width: 384, height: 854, safeTop: 30, safeBottom: 18 },
];

const LAB_ROUTES: Array<{ id: MobileLabRoute; label: string; path: string }> = [
  { id: "overview", label: "Overview", path: "/mobile-lab" },
  { id: "navbar", label: "Navbar", path: "/mobile-lab/navbar" },
  { id: "drawer", label: "Drawer", path: "/mobile-lab/drawer" },
  { id: "modals", label: "Modals", path: "/mobile-lab/modals" },
  { id: "banque-heures", label: "Banque", path: "/mobile-lab/banque-heures" },
  { id: "rapport-bilan", label: "Bilan V1", path: "/mobile-lab/rapport-bilan" },
];

const permissions: PermissionsContextType = {
  contract: {
    source: { mode: "pro", isPro: true },
    isViewer: false,
    contractType: "interim",
    hoursPerWeek: 8,
    surplusRule: "payable",
    surplusSplitPct: 50,
    weeklyQuotaHours: 8,
    reserveEnabled: true,
    payableRule: "capped_quota",
    overflowRule: "ignore",
    visibility: {
      suivi: { showReserveTab: true },
      bilan: { showOvertimeKpi: true, showPayableHoursKpi: true, showReserveKpi: true },
    },
  },
  isViewer: false,
  viewerPatronId: null,
  isAdmin: true,
  isPro: true,
  canBilanMois: true,
  canBilanAnnee: true,
  canExportPDF: true,
  canExportExcel: true,
  canExportCSV: true,
  canKilometrage: true,
  canAgenda: true,
  canFacture: true,
  canDashboard: true,
};

const proNavItems: NavItem[] = [
  { key: "saisie", label: "Saisie", icon: "S", activeClass: "from-[var(--color-accent-violet)] to-[var(--color-accent-fuchsia)]" },
  { key: "dashboard", label: "Board", icon: "D", activeClass: "from-[var(--color-accent-fuchsia)] to-[var(--color-accent-violet)]" },
  { key: "suivi", label: "Suivi", icon: "B", activeClass: "from-[var(--color-accent-cyan)] to-[var(--color-accent-violet)]" },
  { key: "agenda", label: "Agenda", icon: "A", activeClass: "from-[var(--color-accent-green)] to-[var(--color-accent-cyan)]" },
  { key: "parametres", label: "Prefs", icon: "P", activeClass: "from-[var(--color-accent-orange)] to-[var(--color-accent-fuchsia)]" },
];

function MobileLabShell() {
  const route = getMobileLabRoute(window.location.pathname);
  const { theme, setTheme } = useDarkMode();
  const [deviceKey, setDeviceKey] = useState<DeviceKey>("iphone-15");
  const [isLandscape, setIsLandscape] = useState(false);
  const [showReach, setShowReach] = useState(true);
  const device = DEVICE_PRESETS.find((item) => item.key === deviceKey) ?? DEVICE_PRESETS[0];
  const frameSize = useMemo(
    () => ({
      width: isLandscape ? device.height : device.width,
      height: isLandscape ? device.width : device.height,
    }),
    [device, isLandscape]
  );

  return (
    <PermissionsContext.Provider value={permissions}>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-5 px-4 py-5 lg:flex-row lg:px-6">
          <aside className="lg:w-72 lg:shrink-0">
            <section className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-modal backdrop-blur-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-surface-hover)] text-[var(--color-primary)]">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h1 className="text-sm font-black uppercase tracking-wider">Mobile Lab</h1>
                  <p className="text-xs text-[var(--color-text-dim)]">DEV only UX sandbox</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <LabSelect label="Viewport" value={deviceKey} onChange={(value) => setDeviceKey(value as DeviceKey)}>
                  {DEVICE_PRESETS.map((item) => (
                    <option key={item.key} value={item.key}>{item.label}</option>
                  ))}
                </LabSelect>

                <LabSelect label="Theme" value={theme} onChange={(value) => setTheme(value as AppTheme)}>
                  <option value="neon">Neon</option>
                  <option value="oled">OLED</option>
                  <option value="emerald">Emerald</option>
                  <option value="arctic">Arctic</option>
                </LabSelect>

                <button type="button" className="lab-button w-full" onClick={() => setIsLandscape((value) => !value)}>
                  <Activity size={16} />
                  {isLandscape ? "Portrait" : "Landscape"}
                </button>

                <button type="button" className="lab-button w-full" onClick={() => setShowReach((value) => !value)}>
                  <Hand size={16} />
                  Thumb reach
                </button>
              </div>

              <nav className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-1">
                {LAB_ROUTES.map((item) => (
                  <a
                    key={item.id}
                    href={item.path}
                    className={
                      "rounded-[var(--radius-lg)] px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors " +
                      (route === item.id
                        ? "bg-[var(--color-primary)] text-[var(--color-bg)]"
                        : "bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]")
                    }
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </section>
          </aside>

          <main className="flex min-w-0 flex-1 items-start justify-center">
            <div
              className="mobile-lab-device"
              style={{
                width: `${frameSize.width}px`,
                height: `${frameSize.height}px`,
                ["--mobile-lab-safe-top" as string]: `${device.safeTop}px`,
                ["--mobile-lab-safe-bottom" as string]: `${device.safeBottom}px`,
              }}
            >
              <div className="mobile-lab-screen">
                <LabPhoneContent route={route} showReach={showReach} />
              </div>
            </div>
          </main>
        </div>
      </div>
    </PermissionsContext.Provider>
  );
}

function LabSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 py-2 pr-9 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-border-primary)]"
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={16} />
      </span>
    </label>
  );
}

function LabPhoneContent({ route, showReach }: { route: MobileLabRoute; showReach: boolean }) {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [drawerOpen, setDrawerOpen] = useState(route === "drawer");
  const [modalOpen, setModalOpen] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);

  const handlePointerUp = (x: number) => {
    if (dragStart === null) return;
    const delta = x - dragStart;
    if (delta > 72) setDrawerOpen(true);
    if (delta < -72) setDrawerOpen(false);
    setDragStart(null);
  };

  return (
    <div
      className="relative min-h-full overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]"
      onPointerDown={(event) => setDragStart(event.clientX)}
      onPointerUp={(event) => handlePointerUp(event.clientX)}
    >
      <div className="pointer-events-none absolute inset-0 bg-[var(--color-primary)]/[0.02]" />
      <div className="relative z-10 px-4 pb-28 pt-[calc(var(--mobile-lab-safe-top)+14px)]">
        <LabHeader onMenu={() => setDrawerOpen(true)} />
        {(route === "overview" || route === "navbar") && <DashboardPreview />}
        {route === "drawer" && <DrawerPreview onOpen={() => setDrawerOpen(true)} />}
        {route === "modals" && <ModalPreview onOpen={() => setModalOpen(true)} />}
        {route === "banque-heures" && <BanqueHeuresPreview />}
        {route === "rapport-bilan" && (
          <RapportBilanVisualV1
            title="Semaine 19"
            subtitle="5 mai - 11 mai 2025"
            onBack={() => {
              window.history.pushState(null, "", "/mobile-lab");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
          />
        )}
      </div>

      {showReach && route !== "rapport-bilan" && <ThumbReachOverlay />}
      <FutureDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <Modal show={modalOpen} onClose={() => setModalOpen(false)} title="Ajuster banque" size="sm">
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-muted)]">Simulation tactile d'une modale basse avec safe-area et overlay glass.</p>
          <button type="button" className="lab-button w-full justify-center" onClick={() => setModalOpen(false)}>Valider</button>
        </div>
      </Modal>
      <AppNavBar activeTab={activeTab} setActiveTab={setActiveTab} proNavItems={proNavItems} />
    </div>
  );
}

function LabHeader({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="mb-5 flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Tracko mobile</p>
        <h2 className="text-2xl font-black leading-tight">Aujourd'hui</h2>
      </div>
      <button type="button" aria-label="Ouvrir le drawer" className="lab-icon-button" onClick={onMenu}>
        <Menu size={18} />
      </button>
    </header>
  );
}

function DashboardPreview() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Heures" value="7h45" sub="Mission matin" icon={<Gauge size={17} />} />
        <KpiCard label="Banque" value="+12h" sub="Solde courant" icon={<Banknote size={17} />} trending="up" />
      </div>
      <section className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 backdrop-blur-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider">Dashboard compact</h3>
          <LayoutDashboard className="text-[var(--color-primary)]" size={18} />
        </div>
        <div className="space-y-3">
          {["Saisie rapide", "Pause", "Frais km"].map((label, index) => (
            <div key={label} className="flex items-center justify-between rounded-[var(--radius-lg)] bg-[var(--color-surface-hover)] px-3 py-3">
              <span className="text-sm font-bold">{label}</span>
              <span className="text-xs font-black text-[var(--color-text-muted)]">{index === 0 ? "09:00" : index === 1 ? "00:30" : "18 km"}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function DrawerPreview({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 backdrop-blur-card">
      <div className="mb-4 flex items-center gap-3">
        <PanelLeftOpen className="text-[var(--color-primary)]" size={20} />
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider">Future drawer</h3>
          <p className="text-xs text-[var(--color-text-dim)]">Swipe depuis le bord gauche ou bouton menu.</p>
        </div>
      </div>
      <button type="button" className="lab-button w-full justify-center" onClick={onOpen}>Ouvrir le drawer</button>
    </section>
  );
}

function ModalPreview({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 backdrop-blur-card">
      <h3 className="mb-2 text-sm font-black uppercase tracking-wider">Modals tactiles</h3>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">Validation du bottom sheet, overlay, blur et fermeture tactile.</p>
      <button type="button" className="lab-button w-full justify-center" onClick={onOpen}>Ouvrir une modale</button>
    </section>
  );
}

function BanqueHeuresPreview() {
  return (
    <div className="space-y-4">
      <KpiCard label="Banque d'heures" value="+12h30" sub="Objectif mensuel: +8h" icon={<Banknote size={17} />} trending="up" />
      <section className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 backdrop-blur-card">
        <h3 className="mb-4 text-sm font-black uppercase tracking-wider">Solde mobile</h3>
        <div className="space-y-3">
          {[
            ["Semaine 21", "+4h15"],
            ["Semaine 20", "-1h00"],
            ["Semaine 19", "+2h45"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between border-b border-[var(--color-divider)] pb-3 last:border-b-0 last:pb-0">
              <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
              <span className="text-sm font-black">{value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FutureDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div className={"mobile-lab-drawer-layer " + (open ? "is-open" : "")} aria-hidden={!open}>
      <button type="button" className="mobile-lab-drawer-scrim" onClick={onClose} aria-label="Fermer le drawer" />
      <aside className="mobile-lab-drawer">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Navigation</p>
            <h3 className="text-lg font-black">Mobile drawer</h3>
          </div>
          <button type="button" className="lab-icon-button" onClick={onClose} aria-label="Fermer">
            <X size={16} />
          </button>
        </div>
        {["Banque d'heures", "Agenda", "Dashboard", "Parametres"].map((label) => (
          <button key={label} type="button" className="mb-2 w-full rounded-[var(--radius-lg)] bg-[var(--color-surface-hover)] px-3 py-3 text-left text-sm font-bold text-[var(--color-text)] transition-colors hover:text-[var(--color-primary)]">
            {label}
          </button>
        ))}
      </aside>
    </div>
  );
}

function ThumbReachOverlay() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[45%]">
      <div className="absolute bottom-0 right-0 h-full w-[78%] rounded-tl-full border-l border-t border-[var(--color-border-primary)] bg-[var(--color-primary)]/[0.08]" />
      <div className="absolute bottom-24 right-5 rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] backdrop-blur-card">
        Thumb reach
      </div>
    </div>
  );
}

export default function MobileLab() {
  return (
    <DarkModeProvider>
      <MobileLabShell />
    </DarkModeProvider>
  );
}
