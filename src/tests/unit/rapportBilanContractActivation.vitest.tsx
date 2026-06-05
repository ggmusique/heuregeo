import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RapportBilanVisualV1 } from "../../components/bilan/RapportBilanVisualV1";

/**
 * Garde d'activation contrat (commit fc2cc1c).
 *
 * La carte "Heure payable" ne doit s'afficher que pour les semaines dont la
 * premiere mission est >= contract_active_since. Cette logique vit dans le
 * useMemo `isContractWeekActive` de RapportBilanVisualV1 et n'etait couverte
 * par aucun test composant :
 *   - contractActiveSince.vitest.ts mocke entierement ce composant ;
 *   - rapportBilanVisual.vitest.tsx ne passe jamais contractActiveSince.
 *
 * Sans bilanContent, le composant utilise ses metriques mock
 * (payableHours = 5 > 0), donc la carte ne depend plus que de
 * isProContractEnabled && isContractWeekActive.
 */

const missionDebutMai = [
  {
    id: "m-1",
    date_iso: "2026-05-05",
    client: "Client A",
    lieu: "Tours",
    debut: "08:00",
    fin: "12:00",
    duree: 4,
    montant: 120,
    pause: 0,
  },
] as any;

describe("RapportBilanVisualV1 - garde contractActiveSince (carte Heure payable)", () => {
  it("masque la carte Heure payable pour une semaine anterieure a contract_active_since", () => {
    render(
      <RapportBilanVisualV1
        title="Semaine 19"
        subtitle="5 mai - 11 mai 2026"
        onBack={vi.fn()}
        isProContractEnabled={true}
        contractActiveSince="2026-05-12"
        sortedMissions={missionDebutMai}
      />,
    );

    expect(screen.queryByText("Heure payable")).not.toBeInTheDocument();
    // Le reste du rapport continue de s'afficher.
    expect(screen.getByText("Heure semaine")).toBeInTheDocument();
  });

  it("affiche la carte Heure payable quand la semaine est >= contract_active_since", () => {
    render(
      <RapportBilanVisualV1
        title="Semaine 19"
        subtitle="5 mai - 11 mai 2026"
        onBack={vi.fn()}
        isProContractEnabled={true}
        contractActiveSince="2026-05-01"
        sortedMissions={missionDebutMai}
      />,
    );

    expect(screen.getByText("Heure payable")).toBeInTheDocument();
  });

  it("affiche la carte Heure payable quand contract_active_since est absent (retro-compat)", () => {
    render(
      <RapportBilanVisualV1
        title="Semaine 19"
        subtitle="5 mai - 11 mai 2026"
        onBack={vi.fn()}
        isProContractEnabled={true}
        sortedMissions={missionDebutMai}
      />,
    );

    expect(screen.getByText("Heure payable")).toBeInTheDocument();
  });

  it("masque la carte Heure payable quand le contrat PRO est desactive, meme apres activation", () => {
    render(
      <RapportBilanVisualV1
        title="Semaine 19"
        subtitle="5 mai - 11 mai 2026"
        onBack={vi.fn()}
        isProContractEnabled={false}
        contractActiveSince="2026-05-01"
        sortedMissions={missionDebutMai}
      />,
    );

    expect(screen.queryByText("Heure payable")).not.toBeInTheDocument();
  });
});
