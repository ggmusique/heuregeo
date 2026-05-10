// ─── Types agenda ─────────────────────────────────────────────────────────────

export const AGENDA_EVENT_TYPES = {
  RDV:   "rdv",
  CONGE: "conge",
  NOTE:  "note",
} as const;

export type AgendaEventType = typeof AGENDA_EVENT_TYPES[keyof typeof AGENDA_EVENT_TYPES];

// ─── Types de lieux ───────────────────────────────────────────────────────────

export const LIEU_TYPES = {
  CLIENT:   "client",
  ATELIER:  "atelier",
  BUREAU:   "bureau",
  DOMICILE: "domicile",
  AUTRE:    "autre",
} as const;

export type LieuType = typeof LIEU_TYPES[keyof typeof LIEU_TYPES];
