export interface SecurePdfParams {
  sourcePdfBytes: Uint8Array;
  password: string;
  regenerateEncryptedPdf: (password: string) => Uint8Array;
}

function bytesToLatin1(bytes: Uint8Array): string {
  return Array.from(bytes, (v) => String.fromCharCode(v)).join("");
}

function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export async function securePdf({
  sourcePdfBytes,
  password,
  regenerateEncryptedPdf,
}: SecurePdfParams): Promise<Uint8Array> {
  if (!password.trim()) {
    throw new Error("Mot de passe requis pour sécuriser le PDF.");
  }

  const sourceSnapshot = sourcePdfBytes.slice();
  const encryptedBytes = regenerateEncryptedPdf(password);

  if (!arraysEqual(sourcePdfBytes, sourceSnapshot)) {
    throw new Error("Le PDF original a été modifié pendant la sécurisation.");
  }

  const pdfHeader = String.fromCharCode(
    encryptedBytes[0] ?? 0,
    encryptedBytes[1] ?? 0,
    encryptedBytes[2] ?? 0,
    encryptedBytes[3] ?? 0,
  );

  if (!pdfHeader.startsWith("%PDF")) {
    throw new Error("Le PDF sécurisé généré est invalide.");
  }

  // /Encrypt se trouve dans le trailer PDF, toujours à la FIN du fichier.
  // Vérifier les derniers bytes (et non les premiers) où le trailer réside.
  const trailerRaw = bytesToLatin1(encryptedBytes.slice(-3000));
  if (!trailerRaw.includes("/Encrypt")) {
    throw new Error("Le chiffrement PDF n'a pas pu être appliqué.");
  }

  return encryptedBytes;
}