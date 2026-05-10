export const sanitizeText = (value: string): string =>
  value.trim().slice(0, 500).replace(/[<>]/g, "");

export const sanitizeName = (value: string): string =>
  value.trim().slice(0, 100).replace(/[<>]/g, "");

export const sanitizeNotes = (value: string): string =>
  value.trim().slice(0, 1000).replace(/[<>]/g, "");
