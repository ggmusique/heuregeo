export interface ShareWhatsAppResult {
  mode: "native" | "fallback";
}

function openWhatsAppWeb(message: string): void {
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function triggerDownload(file: File): void {
  const blobUrl = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Révoquer après un délai pour laisser le navigateur démarrer le téléchargement.
  // Une révocation immédiate peut interrompre le transfert sur certains navigateurs mobiles.
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}

export async function shareWhatsAppFile(file: File, message: string): Promise<ShareWhatsAppResult> {
  if (!file) {
    throw new Error("Fichier PDF introuvable pour le partage.");
  }

  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };

  if (nav.share && nav.canShare?.({ files: [file] })) {
    await nav.share({
      title: "PDF sécurisé",
      text: message,
      files: [file],
    });
    return { mode: "native" };
  }

  triggerDownload(file);
  openWhatsAppWeb(message);
  return { mode: "fallback" };
}