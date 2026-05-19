import { describe, expect, it } from "vitest";
import { securePdf } from "../../utils/securePdf";

const buildEncryptedBytes = (): Uint8Array => {
  const str = "%PDF-1.4\n1 0 obj\n<< /Encrypt 2 0 R >>\nendobj\n";
  return new Uint8Array(Array.from(str).map((c) => c.charCodeAt(0)));
};

describe("securePdf", () => {
  it("renvoie un PDF chiffré valide", async () => {
    const source = new Uint8Array([1, 2, 3, 4]);
    const result = await securePdf({
      sourcePdfBytes: source,
      password: "MonPass123",
      regenerateEncryptedPdf: () => buildEncryptedBytes(),
    });

    expect(result.length).toBeGreaterThan(0);
  });

  it("ne modifie pas le PDF source", async () => {
    const source = new Uint8Array([10, 20, 30]);
    const snapshot = source.slice();

    await securePdf({
      sourcePdfBytes: source,
      password: "MonPass123",
      regenerateEncryptedPdf: () => buildEncryptedBytes(),
    });

    expect(Array.from(source)).toEqual(Array.from(snapshot));
  });

  it("échoue si le mot de passe est vide", async () => {
    await expect(
      securePdf({
        sourcePdfBytes: new Uint8Array([1]),
        password: "   ",
        regenerateEncryptedPdf: () => buildEncryptedBytes(),
      }),
    ).rejects.toThrow("Mot de passe requis");
  });

  it("échoue si le PDF ne contient pas de marqueur de chiffrement", async () => {
    const unencrypted = new Uint8Array(Array.from("%PDF-1.4\n").map((c) => c.charCodeAt(0)));
    await expect(
      securePdf({
        sourcePdfBytes: new Uint8Array([1, 2]),
        password: "MonPass123",
        regenerateEncryptedPdf: () => unencrypted,
      }),
    ).rejects.toThrow("chiffrement PDF");
  });
});