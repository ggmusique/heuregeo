import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MissionForm } from "../../components/mission/MissionForm";
import { SaisieTab } from "../../pages/SaisieTab";

// ─── Mocks globaux ─────────────────────────────────────────────────────────

vi.mock("../../contexts/DarkModeContext", () => ({
  useDarkMode: () => ({ darkMode: false }),
}));

vi.mock("../../contexts/LabelsContext", () => ({
  useLabels: () => ({ client: "client", lieu: "lieu", patron: "patron" }),
}));

// fetch → météo ignorée (geolocation absente en jsdom → retour anticipé de l'effet)
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

// ─── Helpers ────────────────────────────────────────────────────────────────

// 2 patrons → désactive l'auto-select de PatronSelectorCompact (required + length===1)
// Sans ça, le useEffect du sélecteur relancerait clearError("patron") après setFormErrors.
const PATRONS = [{ id: "p1", nom: "Paul" }, { id: "p2", nom: "Marie" }];
const CLIENTS = [{ id: "c1", nom: "Alice" }];
const LIEUX   = [{ id: "l1", nom: "Bureau" }];

/** Props minimales pour MissionForm. onCancel et onCopyLast absents par défaut. */
function makeFormProps(overrides = {}) {
  return {
    darkMode: false,
    patrons: PATRONS,
    clients: CLIENTS,
    lieux: LIEUX,
    missions: [],
    loading: false,
    isIOS: false,
    selectedPatronId: null,
    selectedClientId: null,
    selectedLieuId: null,
    onPatronChange: vi.fn(),
    onClientChange: vi.fn(),
    onLieuChange: vi.fn(),
    onAddNewPatron: vi.fn(),
    onAddNewClient: vi.fn(),
    onAddNewLieu: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  };
}

/** Props minimales pour SaisieTab (Groupe D). */
function makeSaisieProps(overrides = {}) {
  return {
    editingMissionId: null,
    editingMissionData: null,
    selectedClientId: null,
    selectedLieuId: null,
    selectedPatronId: null,
    loading: false,
    isIOS: false,
    lieux: LIEUX,
    patrons: PATRONS,
    clients: CLIENTS,
    missions: [],
    onMissionSubmit: vi.fn(),
    onMissionCancel: vi.fn(),
    onCopyLast: vi.fn(),
    onLieuChange: vi.fn(),
    onPatronChange: vi.fn(),
    onClientChange: vi.fn(),
    onShowPatronModal: vi.fn(),
    onShowLieuModal: vi.fn(),
    onShowClientModal: vi.fn(),
    onShowFraisModal: vi.fn(),
    onShowAcompteModal: vi.fn(),
    onShowImportModal: vi.fn(),
    showMissionRateEditor: true,
    ...overrides,
  };
}

const getSubmitBtn = () =>
  screen.getByRole("button", { name: /enregistrer la mission/i });

// ───────────────────────────────────────────────────────────────────────────
// Groupe A — rendu initial
// ───────────────────────────────────────────────────────────────────────────

describe("MissionForm – rendu initial", () => {
  beforeEach(() => vi.clearAllMocks());

  it("le bouton 'Enregistrer la mission' est présent", () => {
    render(<MissionForm {...makeFormProps()} />);
    expect(getSubmitBtn()).toBeInTheDocument();
  });

  it("le bouton 'Annuler' est absent si onCancel n'est pas fourni", () => {
    render(<MissionForm {...makeFormProps()} />);
    expect(
      screen.queryByRole("button", { name: /annuler/i })
    ).not.toBeInTheDocument();
  });

  it("le bouton 'Annuler' est présent si onCancel est fourni", () => {
    render(<MissionForm {...makeFormProps({ onCancel: vi.fn() })} />);
    expect(
      screen.getByRole("button", { name: /annuler/i })
    ).toBeInTheDocument();
  });

  it("le bouton 'Dupliquer' est absent si onCopyLast n'est pas fourni", () => {
    render(<MissionForm {...makeFormProps()} />);
    expect(
      screen.queryByRole("button", { name: /dupliquer/i })
    ).not.toBeInTheDocument();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Groupe B — validation bloquante
// ───────────────────────────────────────────────────────────────────────────

describe("MissionForm – validation bloquante", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submit sans patron → onSubmit non appelé + message d'erreur patron visible", () => {
    const onSubmit = vi.fn();
    render(
      <MissionForm
        {...makeFormProps({
          onSubmit,
          // patron absent, client + lieu valides
          selectedClientId: "c1",
          selectedLieuId: "l1",
        })}
      />
    );

    fireEvent.click(getSubmitBtn());

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/patron obligatoire/i)).toBeInTheDocument();
  });

  it("submit sans client → onSubmit non appelé + message d'erreur client visible", () => {
    const onSubmit = vi.fn();
    render(
      <MissionForm
        {...makeFormProps({
          onSubmit,
          selectedPatronId: "p1",
          // client absent
          selectedLieuId: "l1",
        })}
      />
    );

    fireEvent.click(getSubmitBtn());

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/client obligatoire/i)).toBeInTheDocument();
  });

  it("submit sans lieu → onSubmit non appelé + message d'erreur lieu visible", () => {
    const onSubmit = vi.fn();
    render(
      <MissionForm
        {...makeFormProps({
          onSubmit,
          selectedPatronId: "p1",
          selectedClientId: "c1",
          // lieu absent
        })}
      />
    );

    fireEvent.click(getSubmitBtn());

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/lieu obligatoire/i)).toBeInTheDocument();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Groupe C — soumission valide
// ───────────────────────────────────────────────────────────────────────────

describe("MissionForm – soumission valide", () => {
  beforeEach(() => vi.clearAllMocks());

  it("patron + client + lieu → onSubmit appelé avec les bons champs", () => {
    const onSubmit = vi.fn();
    render(
      <MissionForm
        {...makeFormProps({
          onSubmit,
          selectedPatronId: "p1",
          selectedClientId: "c1",
          selectedLieuId: "l1",
        })}
      />
    );

    fireEvent.click(getSubmitBtn());

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        patron_id: "p1",
        client_id: "c1",
        lieu_id: "l1",
        // Horaires par défaut : 08:00 → 17:00 pause 30 min → 8.5 h
        debut: "08:00",
        fin:   "17:00",
        duree: 8.5,
      })
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Groupe D — boutons rapides de SaisieTab
// ───────────────────────────────────────────────────────────────────────────

describe("SaisieTab – boutons rapides", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clic '+ Frais divers' appelle onShowFraisModal", () => {
    const onShowFraisModal = vi.fn();
    render(<SaisieTab {...makeSaisieProps({ onShowFraisModal })} />);

    fireEvent.click(screen.getByRole("button", { name: /frais divers/i }));

    expect(onShowFraisModal).toHaveBeenCalledTimes(1);
  });

  it("clic '+ Acompte' appelle onShowAcompteModal", () => {
    const onShowAcompteModal = vi.fn();
    render(<SaisieTab {...makeSaisieProps({ onShowAcompteModal })} />);

    fireEvent.click(screen.getByRole("button", { name: /acompte/i }));

    expect(onShowAcompteModal).toHaveBeenCalledTimes(1);
  });
});
