import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RapportBilanVisualV1 } from "../../components/bilan/RapportBilanVisualV1";
import { PermissionsContext } from "../../contexts/PermissionsContext";
import type { PermissionsContextType } from "../../contexts/PermissionsContext";
import { SuiviTab } from "../../pages/SuiviTab";

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
  isAdmin: false,
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

const permissionsNoPro: PermissionsContextType = {
  ...permissions,
  contract: {
    source: { mode: "free", isPro: false },
    isViewer: false,
    contractType: "other",
    hoursPerWeek: 8,
    surplusRule: "payable",
    surplusSplitPct: 50,
    weeklyQuotaHours: 8,
    reserveEnabled: false,
    payableRule: "capped_quota",
    overflowRule: "ignore",
    visibility: {
      suivi: { showReserveTab: false },
      bilan: { showOvertimeKpi: false, showPayableHoursKpi: false, showReserveKpi: false },
    },
  },
  isPro: false,
};

describe("Rapport bilan visual V1", () => {
  it("renders the mock KPI cards and reserve block", () => {
    render(
      <RapportBilanVisualV1
        title="Semaine 19"
        subtitle="5 mai - 11 mai 2025"
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText("Heure semaine")).toBeInTheDocument();
    expect(screen.getByText("Heure supplémentaire")).toBeInTheDocument();
    expect(screen.getByText("Heure payable")).toBeInTheDocument();
    expect(screen.getByText("Total brut")).toBeInTheDocument();
    expect(screen.getByText("+3h en réserve")).toBeInTheDocument();
  });

  it("renders payable hours from contract calculations", () => {
    render(
      <RapportBilanVisualV1
        title="Semaine 19"
        subtitle="5 mai - 11 mai 2025"
        onBack={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Heure payable 5h")).toBeInTheDocument();
  });

  it("affiche les 2 lignes séparées heures contractuelles (source externe) et heures supplémentaires", () => {
    render(
      <RapportBilanVisualV1
        title="Semaine 19"
        subtitle="5 mai - 11 mai 2025"
        onBack={vi.fn()}
        contractMetrics={{
          workedHours: 32,
          quotaHours: 20,
          payableHours: 12,
          reserveHours: 0,
          overtimeHours: 12,
          quotaOverflowHours: 12,
        }}
        isProContractEnabled={true}
      />
    );

    expect(screen.getByText(/Heures contractuelles: 20h \(source externe\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Heures supplémentaires: 12h \(gérées par l'app\)/i)).toBeInTheDocument();
  });

  it("shows a premium period selector with week, month and year", () => {
    render(
      <RapportBilanVisualV1
        title="Semaine 19"
        subtitle="5 mai - 11 mai 2025"
        onBack={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /changer la période/i }));
    expect(screen.getByRole("button", { name: "Semaine 19" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mai 2025" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Année 2025" })).toBeInTheDocument();
  });

  it("renders conditional business KPI/actions and keeps payment workflow", () => {
    const onMarquerCommePaye = vi.fn();
    const onExportExcel = vi.fn();
    const onExportPDF = vi.fn();
    const onExportWhatsAppSecure = vi.fn();
    const onExportCSV = vi.fn();

    render(
      <RapportBilanVisualV1
        title="Semaine 19"
        subtitle="5 mai - 11 mai 2025"
        onBack={vi.fn()}
        bilanPaye={false}
        onMarquerCommePaye={onMarquerCommePaye}
        canExportExcel={true}
        canExportPDF={true}
        canExportCSV={true}
        onExportExcel={onExportExcel}
        onExportPDF={onExportPDF}
        onExportWhatsAppSecure={onExportWhatsAppSecure}
        onExportCSV={onExportCSV}
        bilanContent={{
          titre: "Semaine 19",
          totalE: 320,
          totalH: 18.5,
          filteredData: [],
          groupedData: [],
          totalFrais: 0,
          fraisDivers: [],
          impayePrecedent: 0,
          resteCettePeriode: 120,
          resteAPercevoir: 120,
          soldeAcomptesAvant: 0,
          soldeAcomptesApres: 0,
          acomptesDansPeriode: 0,
          totalAcomptes: 0,
          acompteConsommePeriode: 0,
          selectedPatronId: null,
          selectedPatronNom: "Tous les patrons (Global)",
          fraisKilometriques: { items: [], totalKm: 0, totalAmount: 0 },
        }}
      />,
    );

    expect(screen.getAllByText("Reste à percevoir").length).toBeGreaterThan(0);
    expect(screen.queryByText("Frais", { selector: "p" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /marquer comme payé/i }));
    fireEvent.click(screen.getByRole("button", { name: /excel/i }));
    fireEvent.click(screen.getByRole("button", { name: /pdf/i }));
    fireEvent.click(screen.getByRole("button", { name: /whatsapp sécurisé/i }));
    fireEvent.click(screen.getByRole("button", { name: /csv missions/i }));

    expect(onMarquerCommePaye).toHaveBeenCalledOnce();
    expect(onExportExcel).toHaveBeenCalledOnce();
    expect(onExportPDF).toHaveBeenCalledOnce();
    expect(onExportWhatsAppSecure).toHaveBeenCalledOnce();
    expect(onExportCSV).toHaveBeenCalledOnce();
  });

  it("renders premium pause/weather and keeps mission cards non-financial", () => {
    render(
      <RapportBilanVisualV1
        title="Semaine 19"
        subtitle="5 mai - 11 mai 2025"
        onBack={vi.fn()}
        sortedMissions={[
          {
            id: "m-1",
            date_iso: "2026-05-05",
            client: "Client A",
            lieu: "Tours",
            debut: "08:00",
            fin: "12:00",
            duree: 4,
            montant: 120,
            pause: 30,
            weather: { icon: "01d", desc: "Ensoleille", tempMin: 16, tempMax: 20 },
          } as any,
          {
            id: "m-2",
            date_iso: "2026-05-06",
            client: "Client B",
            lieu: "Blois",
            debut: "13:00",
            fin: "17:00",
            duree: 4,
            montant: 140,
            pause: 0,
            weather: null,
          } as any,
        ]}
        bilanContent={{
          titre: "Semaine 19",
          totalE: 260,
          totalH: 8,
          filteredData: [],
          groupedData: [],
          totalFrais: 0,
          fraisDivers: [],
          impayePrecedent: 0,
          resteCettePeriode: 0,
          resteAPercevoir: 0,
          soldeAcomptesAvant: 0,
          soldeAcomptesApres: 0,
          acomptesDansPeriode: 0,
          totalAcomptes: 0,
          acompteConsommePeriode: 0,
          selectedPatronId: null,
          selectedPatronNom: "Tous les patrons (Global)",
          fraisKilometriques: { items: [], totalKm: 0, totalAmount: 0 },
        }}
      />,
    );

    expect(screen.getByText("Pause · 30 min")).toBeInTheDocument();
    expect(screen.getByText("Aucune pause")).toBeInTheDocument();
    expect(screen.queryByText(/non renseignée/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/frais liés/i)).not.toBeInTheDocument();
    expect(screen.getByText(/18°C/i)).toBeInTheDocument();
    expect(screen.getByText(/Ensoleille/i)).toBeInTheDocument();
  });

  it("places acompte/frais cards above missions and keeps human acompte labels", () => {
    render(
      <RapportBilanVisualV1
        title="Semaine 19"
        subtitle="5 mai - 11 mai 2025"
        onBack={vi.fn()}
        bilanPeriodType="semaine"
        canExportCSV={true}
        bilanContent={{
          titre: "Semaine 19",
          totalE: 320,
          totalH: 18.5,
          filteredData: [],
          groupedData: [],
          totalFrais: 45,
          fraisDivers: [
            {
              id: "f-1",
              date_frais: "2026-05-05",
              description: "Parking",
              montant: 45,
            } as any,
          ],
          impayePrecedent: 0,
          resteCettePeriode: 0,
          resteAPercevoir: 0,
          soldeAcomptesAvant: 100,
          soldeAcomptesApres: 20,
          acomptesDansPeriode: 253.75,
          totalAcomptes: 253.75,
          acompteConsommePeriode: 233.75,
          selectedPatronId: null,
          selectedPatronNom: "Tous les patrons (Global)",
          fraisKilometriques: { items: [], totalKm: 0, totalAmount: 0 },
        }}
      />,
    );

    const acompte = screen.getByTestId("section-acompte-card");
    const frais = screen.getByTestId("section-frais-card");
    const missions = screen.getByTestId("section-missions");

    const acompteBeforeMissions = Boolean(acompte.compareDocumentPosition(missions) & Node.DOCUMENT_POSITION_FOLLOWING);
    const fraisBeforeMissions = Boolean(frais.compareDocumentPosition(missions) & Node.DOCUMENT_POSITION_FOLLOWING);

    expect(acompteBeforeMissions).toBe(true);
    expect(fraisBeforeMissions).toBe(true);

    expect(screen.getByText("💳 Acompte disponible précédent")).toBeInTheDocument();
    expect(screen.getByText("📥 Reçus cette période")).toBeInTheDocument();
    expect(screen.getByText("✂️ Consommé cette période")).toBeInTheDocument();
    expect(screen.getByText("Solde restant à reporter")).toBeInTheDocument();
  });

  it("hides acompte and frais cards when no financial data exists", () => {
    render(
      <RapportBilanVisualV1
        title="Semaine 19"
        subtitle="5 mai - 11 mai 2025"
        onBack={vi.fn()}
        bilanPeriodType="semaine"
        bilanContent={{
          titre: "Semaine 19",
          totalE: 120,
          totalH: 8,
          filteredData: [],
          groupedData: [],
          totalFrais: 0,
          fraisDivers: [],
          impayePrecedent: 0,
          resteCettePeriode: 0,
          resteAPercevoir: 0,
          soldeAcomptesAvant: 0,
          soldeAcomptesApres: 0,
          acomptesDansPeriode: 0,
          totalAcomptes: 0,
          acompteConsommePeriode: 0,
          selectedPatronId: null,
          selectedPatronNom: "Tous les patrons (Global)",
          fraisKilometriques: { items: [], totalKm: 0, totalAmount: 0 },
        }}
      />,
    );

    expect(screen.queryByTestId("section-acompte-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("section-frais-card")).not.toBeInTheDocument();
    expect(screen.getByTestId("section-missions")).toBeInTheDocument();
  });

  it("renders monthly view as weekly summary cards instead of raw mission cards", () => {
    render(
      <RapportBilanVisualV1
        title="AVRIL 2026"
        subtitle="Avril 2026"
        onBack={vi.fn()}
        bilanPeriodType="mois"
        sortedMissions={[
          {
            id: "m-1",
            date_iso: "2026-04-06",
            client: "Client Alpha",
            lieu: "Tours",
            debut: "08:00",
            fin: "12:00",
            duree: 4,
            montant: 120,
            pause: 30,
          } as any,
        ]}
        bilanContent={{
          titre: "AVRIL 2026",
          totalE: 480,
          totalH: 16,
          filteredData: [
            {
              id: "m-1",
              date_iso: "2026-04-06",
              client: "Client Alpha",
              lieu: "Tours",
              debut: "08:00",
              fin: "12:00",
              duree: 4,
              montant: 120,
              pause: 30,
            } as any,
          ],
          groupedData: [
            { label: "Semaine 15", h: 9, e: 270, missions: [], paymentStatus: "paid", paymentLabel: "Payé", periodValue: "15" } as any,
            { label: "Semaine 16", h: 7, e: 210, missions: [], paymentStatus: "unpaid", paymentLabel: "Non payé", paymentRemaining: 210, periodValue: "16" } as any,
          ],
          totalFrais: 0,
          fraisDivers: [],
          impayePrecedent: 0,
          resteCettePeriode: 0,
          resteAPercevoir: 0,
          soldeAcomptesAvant: 0,
          soldeAcomptesApres: 0,
          acomptesDansPeriode: 0,
          totalAcomptes: 0,
          acompteConsommePeriode: 0,
          selectedPatronId: null,
          selectedPatronNom: "Tous les patrons (Global)",
          fraisKilometriques: { items: [], totalKm: 0, totalAmount: 0 },
        }}
      />,
    );

    expect(screen.getByText("Semaine 15")).toBeInTheDocument();
    expect(screen.getByText("Semaine 16")).toBeInTheDocument();
    expect(screen.getByText("Payé")).toBeInTheDocument();
    expect(screen.getByText("Non payé")).toBeInTheDocument();
    expect(screen.getByText(/210,00 € restant/i)).toBeInTheDocument();
    expect(screen.queryByText(/08:00 - 12:00/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Client Alpha")).not.toBeInTheDocument();
    expect(screen.queryByText("À détailler")).not.toBeInTheDocument();
  });

  it("renders yearly view as monthly summary cards instead of raw mission cards", () => {
    render(
      <RapportBilanVisualV1
        title="2026"
        subtitle="Année 2026"
        onBack={vi.fn()}
        bilanPeriodType="annee"
        sortedMissions={[
          {
            id: "m-1",
            date_iso: "2026-01-10",
            client: "Client Janvier",
            lieu: "Tours",
            debut: "09:00",
            fin: "12:00",
            duree: 3,
            montant: 90,
            pause: 0,
          } as any,
        ]}
        bilanContent={{
          titre: "2026",
          totalE: 720,
          totalH: 24,
          filteredData: [
            {
              id: "m-1",
              date_iso: "2026-01-10",
              client: "Client Janvier",
              lieu: "Tours",
              debut: "09:00",
              fin: "12:00",
              duree: 3,
              montant: 90,
              pause: 0,
            } as any,
          ],
          groupedData: [
            { label: "JANVIER", h: 10, e: 300, missions: [], paymentStatus: "partial", paymentLabel: "1/2 semaines payées", paymentRemaining: 180, periodValue: "2026-01" } as any,
            { label: "FÉVRIER", h: 14, e: 420, missions: [], paymentStatus: "paid", paymentLabel: "2/2 semaines payées", periodValue: "2026-02" } as any,
          ],
          totalFrais: 0,
          fraisDivers: [],
          impayePrecedent: 0,
          resteCettePeriode: 0,
          resteAPercevoir: 0,
          soldeAcomptesAvant: 0,
          soldeAcomptesApres: 0,
          acomptesDansPeriode: 0,
          totalAcomptes: 0,
          acompteConsommePeriode: 0,
          selectedPatronId: null,
          selectedPatronNom: "Tous les patrons (Global)",
          fraisKilometriques: { items: [], totalKm: 0, totalAmount: 0 },
        }}
      />,
    );

    expect(screen.getByText("JANVIER")).toBeInTheDocument();
    expect(screen.getByText("FÉVRIER")).toBeInTheDocument();
    expect(screen.getByText("1/2 semaines payées")).toBeInTheDocument();
    expect(screen.getByText("2/2 semaines payées")).toBeInTheDocument();
    expect(screen.queryByText(/09:00 - 12:00/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Client Janvier")).not.toBeInTheDocument();
  });

  it("hides pro-only KPI and reserve when contrat PRO is disabled", () => {
    render(
      <RapportBilanVisualV1
        title="Semaine 19"
        subtitle="5 mai - 11 mai 2025"
        onBack={vi.fn()}
        isProContractEnabled={false}
      />,
    );

    expect(screen.queryByText("Heure supplémentaire")).not.toBeInTheDocument();
    expect(screen.queryByText("Heure payable")).not.toBeInTheDocument();
    expect(screen.queryByText("+3h en réserve")).not.toBeInTheDocument();
    expect(screen.getByText("Heure semaine")).toBeInTheDocument();
    expect(screen.getByText("Total brut")).toBeInTheDocument();
  });
});

describe("Suivi sub navigation", () => {
  it("replaces Dashboard with Reserve hours", () => {
    render(
      <PermissionsContext.Provider value={permissions}>
        <SuiviTab
          historiqueProps={{}}
          bilanProps={{}}
          onNavigateDashboard={vi.fn()}
        />
      </PermissionsContext.Provider>
    );

    expect(screen.getByRole("button", { name: /réserve heures/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /dashboard/i })).not.toBeInTheDocument();
  });

  it("hides reserve tab when contrat PRO is disabled", () => {
    render(
      <PermissionsContext.Provider value={permissionsNoPro}>
        <SuiviTab
          historiqueProps={{}}
          bilanProps={{}}
          onNavigateDashboard={vi.fn()}
        />
      </PermissionsContext.Provider>
    );

    expect(screen.queryByRole("button", { name: /réserve heures/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /historique/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bilan/i })).toBeInTheDocument();
  });
});
