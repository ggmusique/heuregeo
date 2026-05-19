import { beforeEach, describe, expect, it, vi } from "vitest";
import { shareWhatsAppFile } from "../../utils/shareWhatsApp";

describe("shareWhatsAppFile", () => {
  const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("utilise navigator.share en mode natif", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });

    const result = await shareWhatsAppFile(
      new File([new Uint8Array([1])], "secure.pdf", { type: "application/pdf" }),
      "Message test",
    );

    expect(result.mode).toBe("native");
    expect(share).toHaveBeenCalledTimes(1);
  });

  it("active le fallback si Web Share file n'est pas dispo", async () => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: undefined });

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const appendSpy = vi.spyOn(document.body, "appendChild");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:pdf");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    const result = await shareWhatsAppFile(
      new File([new Uint8Array([1])], "secure.pdf", { type: "application/pdf" }),
      "Message test",
    );

    expect(result.mode).toBe("fallback");
    expect(openSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalled();
  });

  it("renvoie une erreur propre si fichier absent", async () => {
    await expect(shareWhatsAppFile(undefined as unknown as File, "x")).rejects.toThrow("Fichier PDF introuvable");
  });
});