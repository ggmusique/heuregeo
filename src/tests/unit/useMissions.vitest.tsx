import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useMissions } from "../../hooks/useMissions";
import * as missionsApi from "../../services/api/missionsApi";

vi.mock("../../services/api/missionsApi");

describe("getMissionsByWeek — filtre semaine + année ISO", () => {
  beforeEach(() => {
    missionsApi.fetchMissions.mockResolvedValue([
      { id: "1", date_iso: "2025-03-03", debut: "09:00", fin: "11:00", patron_id: "p1" },
      { id: "2", date_iso: "2026-03-02", debut: "14:00", fin: "16:00", patron_id: "p1" },
    ]);
  });

  it("retourne uniquement la mission de 2025 pour semaine 10 / 2025", async () => {
    const { result } = renderHook(() => useMissions(vi.fn()));
    await act(() => result.current.fetchMissions());
    const s2025 = result.current.getMissionsByWeek(10, null, 2025);
    expect(s2025).toHaveLength(1);
    expect(s2025[0].id).toBe("1");
  });

  it("retourne uniquement la mission de 2026 pour semaine 10 / 2026", async () => {
    const { result } = renderHook(() => useMissions(vi.fn()));
    await act(() => result.current.fetchMissions());
    const s2026 = result.current.getMissionsByWeek(10, null, 2026);
    expect(s2026).toHaveLength(1);
    expect(s2026[0].id).toBe("2");
  });
});

describe("createMission — détection chevauchement", () => {
  beforeEach(() => {
    missionsApi.fetchMissions.mockResolvedValue([
      { id: "m1", date_iso: "2025-06-10", debut: "09:00", fin: "11:00",
        client_id: "c1", lieu_id: "l1", patron_id: "p1" },
    ]);
  });

  it("refuse un créneau qui chevauche", async () => {
    const onError = vi.fn();
    missionsApi.createMission.mockResolvedValue({});
    const { result } = renderHook(() => useMissions(onError));
    await act(() => result.current.fetchMissions());

    await expect(
      act(() => result.current.createMission({
        date_iso: "2025-06-10", debut: "10:00", fin: "12:00",
        client_id: "c1", lieu_id: "l1", patron_id: "p1",
      }))
    ).rejects.toThrow();

    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining("Créneau déjà occupé")
    );
  });

  it("accepte un créneau libre", async () => {
    const onError = vi.fn();
    missionsApi.createMission.mockResolvedValue({
      id: "m2", date_iso: "2025-06-10", debut: "14:00", fin: "16:00",
    });
    const { result } = renderHook(() => useMissions(onError));
    await act(() => result.current.fetchMissions());

    await act(() => result.current.createMission({
      date_iso: "2025-06-10", debut: "14:00", fin: "16:00",
      client_id: "c1", lieu_id: "l1", patron_id: "p1",
    }));

    expect(onError).not.toHaveBeenCalled();
  });
});