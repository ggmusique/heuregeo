import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("xlsx", () => {
  return {
    utils: {
      aoa_to_sheet: vi.fn(() => ({})),
      book_new: vi.fn(() => ({})),
      book_append_sheet: vi.fn(() => undefined),
    },
    writeFile: vi.fn(() => undefined),
  };
});

import * as XLSX from "xlsx";
import { exportToCSV, exportToExcel } from "../../utils/exportUtils";

describe("exportUtils V2 contrat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inclut les sections contrat et reserve dans l'export Excel", () => {
    exportToExcel(
      {
        filteredData: [
          {
            date_iso: "2026-05-20",
            client: "Client A",
            lieu: "Atelier",
            debut: "08:00",
            fin: "12:00",
            pause: 15,
            duree: 3.75,
            montant: 120,
          },
        ],
        totalH: 3.75,
        totalE: 120,
        contractSummary: {
          mode: "on",
          quotaHours: 35,
          workedHours: 40,
          payableHours: 35,
          reserveHours: 5,
          quotaOverflowHours: 5,
          reserveBalanceHours: 12.5,
        },
        reserveMovements: [
          {
            date: "2026-05-20",
            type: "manual_add",
            source: "user",
            deltaHours: 1,
            comment: "Ajout test",
          },
        ],
      },
      "semaine",
      "2026-W21",
      "Semaine 21",
      [{ description: "Peage", montant: 15 }],
      null,
      { client: "Client", lieu: "Lieu" },
    );

    expect(XLSX.writeFile).toHaveBeenCalledTimes(1);

    const aoaToSheetMock = XLSX.utils.aoa_to_sheet as unknown as ReturnType<typeof vi.fn>;
    expect(aoaToSheetMock).toHaveBeenCalledTimes(1);

    const matrix = aoaToSheetMock.mock.calls[0]?.[0] as Array<Array<string>>;
    const flatten = (matrix || []).flat().join(" ");

    expect(flatten).toContain("CONTRAT PRO");
    expect(flatten).toContain("MOUVEMENTS RÉSERVE");
    expect(flatten).toContain("TOTAL FRAIS");
  });

  it("inclut contrat, reserve et frais dans le CSV hebdo", async () => {
    let capturedBlob: Blob | null = null;

    const createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockImplementation((obj: string | Blob | MediaSource) => {
      if (obj instanceof Blob) {
        capturedBlob = obj;
      }
      return "blob:csv-test";
    });
    const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    exportToCSV(
      {
        filteredData: [
          {
            date_iso: "2026-05-20",
            client: "Client A",
            lieu: "Atelier",
            debut: "08:00",
            fin: "12:00",
            pause: 15,
            duree: 3.75,
            montant: 120,
          },
        ],
        fraisDivers: [{ description: "Parking", montant: 12, date_frais: "2026-05-20" }],
        totalFrais: 12,
        contractSummary: {
          mode: "on",
          quotaHours: 35,
          workedHours: 40,
          payableHours: 35,
          reserveHours: 5,
          quotaOverflowHours: 5,
          reserveBalanceHours: 12.5,
        },
        reserveMovements: [
          {
            date: "2026-05-20",
            type: "manual_consume",
            source: "user",
            deltaHours: -0.5,
            comment: "Consommation test",
          },
        ],
      },
      "semaine",
      "2026-W21",
      true,
      { client: "Client", lieu: "Lieu" },
    );

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:csv-test");
    expect(capturedBlob).not.toBeNull();

    const csv = await capturedBlob!.text();
    expect(csv).toContain("CONTRAT PRO");
    expect(csv).toContain("MOUVEMENTS RESERVE");
    expect(csv).toContain("FRAIS DIVERS");
    expect(csv).toContain("Consommation test");
  });
});
