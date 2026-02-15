import React, { useState, useEffect, useCallback } from "react";



/* ============================================================
   ✅ IMPORTS = briques utilisées par App
   - Hooks : logique (charger, créer, supprimer, calculer...)
   - Components : interface (formulaires, cartes, modales)
   - Styles : correctifs d’UI
   - Utils : fonctions pratiques (format €, export, dates...)
   ============================================================ */

// Hooks
import { useClients } from "./hooks/useClients";
import { useMissions } from "./hooks/useMissions";
import { useFrais } from "./hooks/useFrais";
import { useAcomptes } from "./hooks/useAcomptes";
import { usePatrons } from "./hooks/usePatrons";
import { useBilan } from "./hooks/useBilan";
import { useConfirm } from "./hooks/useConfirm";
import { useGeolocation } from "./hooks/useGeolocation";
import { useLieux } from "./hooks/useLieux";
import { LieuxManager } from "./components/lieu/LieuxManager";
import { LieuModal } from "./components/lieu/LieuModal";




// Components
import { MissionForm } from "./components/mission/MissionForm";
import { MissionCard } from "./components/mission/MissionCard";
import { FraisModal } from "./components/common/frais/FraisModal";
import { AcompteModal } from "./components/common/acompte/AcompteModal";
import { PatronModal } from "./components/patron/PatronModal";
import { PatronsManager } from "./components/patron/PatronsManager";
import { ClientModal } from "./components/client/ClientModal";
import { ClientsManager } from "./components/client/ClientsManager";
import { PeriodModal } from "./components/common/bilan/PeriodModal";
import { ConfirmModal } from "./components/common/ConfirmModal";
import { CustomAlert } from "./components/common/CustomAlert";
import { WeekPicker } from "./components/common/bilan/WeekPicker";




// Styles
import "./time-inputs-fix.css";
import "./fix-time-pickers-emergency.css";
import "./fix-selects.css";


// Utils
import { formatEuro, formatHeures, formatDateFR } from "./utils/formatters";
import { getWeekNumber } from "./utils/dateUtils";
import { exportToExcel, exportToCSV } from "./utils/exportUtils";
import { exportToPDFPro } from "./utils/exportPDF_Pro";

export default function App() {
  /* ============================================================
     ✅ Badge "version / canal"
     - APP_CHANNEL : WORK / MAIN / LOCAL (selon ton .env.local)
     - APP_VERSION : v6.0 etc.
     ============================================================ */
  const APP_CHANNEL = import.meta.env.VITE_APP_CHANNEL || "LOCAL";
  const APP_VERSION = import.meta.env.VITE_APP_VERSION || "";

  // ============================================================
  // ✅ STATE GÉNÉRAL (contrôle global de l’app)
  // ============================================================
  const [activeTab, setActiveTab] = useState("saisie"); // onglet actuel
  const [darkMode, setDarkMode] = useState(true); // thème sombre/clair
  const [loading, setLoading] = useState(false); // loading manuel pendant actions
  const [customAlert, setCustomAlert] = useState({ show: false, message: "" }); // alert toast
  const [isIOS, setIsIOS] = useState(false); // détecte iPhone/iPad
  const [liveTime, setLiveTime] = useState(""); // horloge temps réel

  // ============================================================
// ✅ LIEUX (modale + édition)
// ============================================================
const [showLieuModal, setShowLieuModal] = useState(false);
const [editingLieuId, setEditingLieuId] = useState(null);
const [editingLieuData, setEditingLieuData] = useState(null);


  // ============================================================
  // ✅ HISTORIQUE bilans (liste payés / impayés)
  // ============================================================
  const [historique, setHistorique] = useState({
    impayes: [],
    payes: [],
    all: [],
  });
  const [loadingHistorique, setLoadingHistorique] = useState(false);
  const [historiquePatronId, setHistoriquePatronId] = useState(null); // filtre patron (historique)
  const [historiqueTab, setHistoriqueTab] = useState("impayes"); // impayes | payes

  // ============================================================
  // ✅ CLIENTS (modale + édition)
  // ============================================================
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);
  const [editingClientData, setEditingClientData] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null); // sélection client dans MissionForm
  const [selectedLieuId, setSelectedLieuId] = useState(null);
  const [selectedPatronId, setSelectedPatronId] = useState(null);

  // ============================================================
  // ✅ Patron sélectionné pour le BILAN (filtre)
  // ============================================================
  const [bilanPatronId, setBilanPatronId] = useState(null);

  // ============================================================
  // ✅ MISSIONS (édition)
  // ============================================================
  const [editingMissionId, setEditingMissionId] = useState(null);
  const [editingMissionData, setEditingMissionData] = useState(null);

  // ============================================================
  // ✅ FRAIS (modale + édition)
  // ============================================================
  const [showFraisModal, setShowFraisModal] = useState(false);
  const [fraisDescription, setFraisDescription] = useState("");
  const [fraisMontant, setFraisMontant] = useState("");
  const [fraisDate, setFraisDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [editingFraisId, setEditingFraisId] = useState(null);
  const [fraisPatronId, setFraisPatronId] = useState(null);

  // ============================================================
  // ✅ ACOMPTE (modale)
  // ============================================================
  const [showAcompteModal, setShowAcompteModal] = useState(false);
  const [acompteMontant, setAcompteMontant] = useState("");
  const [acompteDate, setAcompteDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [acomptePatronId, setAcomptePatronId] = useState(null);

  // ============================================================
  // ✅ PATRON (modale + édition)
  // ============================================================
  const [showPatronModal, setShowPatronModal] = useState(false);
  const [editingPatronId, setEditingPatronId] = useState(null);
  const [editingPatronData, setEditingPatronData] = useState(null);

  // ============================================================
  // ✅ triggerAlert = la petite notif qui pop (CustomAlert)
  // ============================================================
  const triggerAlert = useCallback((msg) => {
    setCustomAlert((prev) => ({ ...prev, show: true, message: msg }));
    setTimeout(
      () => setCustomAlert((prev) => ({ ...prev, show: false })),
      3500
    );
  }, []);

  // ============================================================
  // ✅ Confirm Modal (pour valider suppression etc.)
  // ============================================================
  const { confirmState, showConfirm, hideConfirm } = useConfirm();

  // ============================================================
  // ✅ Hook MISSIONS (CRUD + filtres période)
  // ============================================================
  const {
    missions,
    loading: missionsLoading,
    clientsUniques,
    lieuxUniques,
    fetchMissions,
    createMission,
    updateMission,
    deleteMission,
    getMissionsByWeek,
    getMissionsByPeriod,
  } = useMissions(triggerAlert);

// ============================================================
// ✅ Hook LIEUX (CRUD)
// ============================================================
const {
  lieux,
  loading: lieuxLoading,
  fetchLieux,
  createLieu,
  updateLieu,
  deleteLieu,
} = useLieux(triggerAlert);



  // ============================================================
  // ✅ Hook FRAIS (CRUD + filtres semaine)
  // ============================================================
  const {
    fraisDivers,
    loading: fraisLoading,
    fetchFrais,
    createFrais,
    updateFrais,
    deleteFrais,
    getFraisByWeek,
    getTotalFrais,
  } = useFrais(triggerAlert);

  // ============================================================
  // ✅ Hook ACOMPTES (CRUD + calculs solde)
  // - getSoldeAvant : solde avant une date
  // - getAcomptesDansPeriode : total acompte entre 2 dates
  // - getTotalAcomptesJusqua : cumul jusqu'à une date (important bilan)
  // ============================================================
  const {
    listeAcomptes,
    loading: acomptesLoading,
    fetchAcomptes,
    createAcompte,
    getSoldeAvant,
    getAcomptesDansPeriode,
    getTotalAcomptesJusqua, // ✅
  } = useAcomptes(missions, fraisDivers, triggerAlert);

  // ============================================================
  // ✅ Hook PATRONS (CRUD + affichage nom/couleur)
  // ============================================================
  const {
    patrons,
    loading: patronsLoading,
    createPatron,
    updatePatron,
    deletePatron,
    getPatronNom,
    getPatronColor,
  } = usePatrons(triggerAlert);

  // ============================================================
  // ✅ Hook CLIENTS (CRUD + recherche)
  // ============================================================
  const {
    clients,
    loading: clientsLoading,
    createClient,
    updateClient,
    deleteClient,
    getClientNom,
    searchClients,
  } = useClients(triggerAlert);

  // ============================================================
  // ✅ Hook GEOLOCATION (récupère une adresse)
  // ============================================================
  const { loading: gpsLoading } = useGeolocation(
    (address) =>
      triggerAlert(`Position chargée : ${address.substring(0, 45)}...`),
    (error) => triggerAlert(error)
  );

  // ============================================================
  // ✅ Hook BILAN (calcule + sauvegarde l'état payé)
  // ============================================================
  const bilan = useBilan({
    missions,
    fraisDivers,
    patrons,
    getMissionsByWeek,
    getMissionsByPeriod,
    getFraisByWeek,
    getTotalFrais,
    getSoldeAvant,
    getAcomptesDansPeriode,
    getTotalAcomptesJusqua, // ✅
    triggerAlert,
  });

  // ============================================================
  // ✅ EFFECTS (automatiques)
  // ============================================================

  // Au démarrage : titre + détection iOS + chargement data
  useEffect(() => {
    document.title = "Heures de Geo";

    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );

    fetchMissions();
fetchFrais();
fetchAcomptes();
fetchLieux(); // ✅
  }, [fetchMissions, fetchFrais, fetchAcomptes,fetchLieux]);


  useEffect(() => {
  if (editingMissionData?.lieu_id) {
    setSelectedLieuId(editingMissionData.lieu_id);
  } else if (!editingMissionId) {
    setSelectedLieuId(null);
  }
}, [editingMissionData, editingMissionId]);


  // Horloge live
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setLiveTime(
        now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Quand le modal "période" s'ouvre, on calcule les périodes possibles
  useEffect(() => {
    if (bilan.showPeriodModal) bilan.calculerPeriodesDisponibles();
  }, [bilan.showPeriodModal, bilan.bilanPeriodType, missions]);

  // ✅ Sync client sélectionné quand on édite une mission
useEffect(() => {
  if (editingMissionData?.client_id) {
    setSelectedClientId(editingMissionData.client_id);
  } else if (!editingMissionId) {
    setSelectedClientId(null);
  }
}, [editingMissionData, editingMissionId]);


  // ============================================================
  // ✅ Charger historique bilans (depuis useBilan)
  // ============================================================
  const chargerHistorique = async (patronId = null) => {
    if (typeof bilan.fetchHistoriqueBilans !== "function") {
      triggerAlert(
        "⚠️ Historique non branché : useBilan doit exposer fetchHistoriqueBilans"
      );
      return;
    }

    try {
      setLoadingHistorique(true);
      const res = await bilan.fetchHistoriqueBilans(patronId);
      setHistorique(res || { impayes: [], payes: [], all: [] });
    } catch (e) {
      triggerAlert("Erreur chargement historique");
    } finally {
      setLoadingHistorique(false);
    }
  };

// ============================================================
// ✅ HANDLERS MISSIONS - VERSION CLEAN FINALE
// ============================================================

const handleMissionSubmit = async (missionData) => {
  try {
    setLoading(true);
    
    if (editingMissionId) {
      await updateMission(editingMissionId, missionData);
      triggerAlert("✅ Mission mise à jour !");
    } else {
      await createMission(missionData);
      triggerAlert("✅ Mission enregistrée !");
    }

    // Reset après succès
    resetMissionForm();
    
  } catch (err) {
    triggerAlert("❌ Erreur : " + (err?.message || "Opération échouée"));
  } finally {
    setLoading(false);
  }
};

const handleMissionEdit = (mission) => {
  setEditingMissionId(mission.id);
  setEditingMissionData(mission);
  setSelectedClientId(mission.client_id || null);
  setSelectedLieuId(mission.lieu_id || null);
  setSelectedPatronId(mission.patron_id || null);  // ✅ AJOUTE cette ligne
  setActiveTab("saisie");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const handleMissionDelete = async (id) => {
  const mission = missions.find((m) => m.id === id);
  if (!mission) return;

  const confirmed = await showConfirm({
    title: "Supprimer mission",
    message: `Supprimer définitivement "${mission.client}" du ${formatDateFR(
      mission.date_iso
    )} ?`,
    confirmText: "Supprimer",
    cancelText: "Annuler",
    type: "danger",
  });

  if (!confirmed) return;

  try {
    setLoading(true);
    await deleteMission(id);
    triggerAlert("✅ Mission supprimée !");
  } catch {
    triggerAlert("❌ Erreur suppression");
  } finally {
    setLoading(false);
  }
};

const resetMissionForm = () => {
  setEditingMissionId(null);
  setEditingMissionData(null);
  setSelectedClientId(null);
  setSelectedLieuId(null);
  setSelectedPatronId(null);  // ✅ AJOUTE ÇA
};

// Copier la dernière mission
const copierDerniereMission = () => {
  if (!missions.length) return triggerAlert("Aucune mission précédente.");
  
  const derniere = [...missions].sort((a, b) =>
    b.date_iso.localeCompare(a.date_iso)
  )[0];

  setEditingMissionData({
    lieu_id: derniere.lieu_id || null,
    lieu: derniere.lieu || "",
    debut: derniere.debut,
    fin: derniere.fin,
    pause: derniere.pause,
    patron_id: derniere.patron_id,
    client_id: derniere.client_id,
    client: derniere.client,
  });

  setSelectedClientId(derniere.client_id || null);
  setSelectedLieuId(derniere.lieu_id || null);
  setSelectedPatronId(derniere.patron_id || null);  // ✅ AJOUTE cette ligne
};

  // ============================================================
  // ✅ HANDLERS FRAIS
  // ============================================================
  const handleFraisSubmit = async () => {
    const montant = parseFloat(fraisMontant);
    if (!fraisDescription.trim() || isNaN(montant) || montant <= 0)
      return triggerAlert("Remplis correctement les champs");
    if (!fraisPatronId)
      return triggerAlert("Sélectionne un patron pour ce frais");

    try {
      setLoading(true);
      if (editingFraisId) {
        await updateFrais(editingFraisId, {
          description: fraisDescription.trim(),
          montant,
          date_frais: fraisDate,
          patron_id: fraisPatronId,
        });
        triggerAlert("Frais modifié !");
      } else {
        await createFrais({
          description: fraisDescription.trim(),
          montant,
          date_frais: fraisDate,
          patron_id: fraisPatronId,
        });
        triggerAlert("Frais ajouté !");
      }
      resetFraisForm();
      setShowFraisModal(false);
    } catch {
      triggerAlert("Erreur opération frais");
    } finally {
      setLoading(false);
    }
  };

  const handleFraisEdit = (frais) => {
    setEditingFraisId(frais.id);
    setFraisDescription(frais.description || "");
    setFraisMontant(frais.montant?.toString() || "");
    setFraisDate(frais.date_frais || new Date().toISOString().split("T")[0]);
    setFraisPatronId(frais.patron_id || null);
    setShowFraisModal(true);
  };

  const handleFraisDelete = async (frais) => {
    const confirmed = await showConfirm({
      title: "Supprimer ce frais",
      message: `Voulez-vous vraiment supprimer "${
        frais.description
      }" (${formatEuro(frais.montant)}) ?`,
      confirmText: "Supprimer",
      cancelText: "Annuler",
      type: "danger",
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      await deleteFrais(frais.id);
      triggerAlert("Frais supprimé !");
    } catch {
      triggerAlert("Erreur suppression");
    } finally {
      setLoading(false);
    }
  };

  const resetFraisForm = () => {
    setFraisDescription("");
    setFraisMontant("");
    setFraisDate(new Date().toISOString().split("T")[0]);
    setEditingFraisId(null);
    setFraisPatronId(null);
  };

  // ============================================================
  // ✅ HANDLERS ACOMPTE
  // ============================================================
  const handleAcompteSubmit = async () => {
    const montantNet = parseFloat(acompteMontant?.toString().replace(",", "."));
    if (!acompteMontant || isNaN(montantNet) || montantNet <= 0) {
      return triggerAlert("Veuillez saisir un montant valide");
    }

    if (!acomptePatronId) {
      return triggerAlert("Sélectionne un patron pour cet acompte");
    }

    try {
      setLoading(true);
      await createAcompte({
        montant: montantNet,
        date_acompte: acompteDate,
        patron_id: acomptePatronId,
      });
      triggerAlert("💰 Acompte enregistré !");
      resetAcompteForm();
      setShowAcompteModal(false);
    } catch (err) {
      triggerAlert(
        "Erreur : " + (err?.message || "Problème de base de données")
      );
    } finally {
      setLoading(false);
    }
  };

  const resetAcompteForm = () => {
    setAcompteMontant("");
    setAcompteDate(new Date().toISOString().split("T")[0]);
    setAcomptePatronId(null);
  };

  // ============================================================
  // ✅ HANDLERS PATRON
  // ============================================================
  const handlePatronSubmit = async (patronData) => {
    try {
      setLoading(true);
      if (editingPatronId) {
        await updatePatron(editingPatronId, patronData);
        triggerAlert("✅ Patron modifié !");
      } else {
        await createPatron(patronData);
        triggerAlert("✅ Patron créé !");
      }
      resetPatronForm();
      setShowPatronModal(false);
    } catch (err) {
      triggerAlert("❌ Erreur : " + (err?.message || "Opération échouée"));
    } finally {
      setLoading(false);
    }
  };

  const handlePatronEdit = (patron) => {
    setEditingPatronId(patron.id);
    setEditingPatronData(patron);
    setShowPatronModal(true);
  };

  const handlePatronDelete = async (patron) => {
    const confirmed = await showConfirm({
      title: "Supprimer ce patron",
      message: `Voulez-vous vraiment supprimer "${patron.nom}" ?\n\nLes missions existantes ne seront pas supprimées mais ne seront plus associées à ce patron.`,
      confirmText: "Supprimer",
      cancelText: "Annuler",
      type: "danger",
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      await deletePatron(patron.id);
      triggerAlert("🗑️ Patron supprimé !");
    } catch {
      triggerAlert("❌ Erreur suppression");
    } finally {
      setLoading(false);
    }
  };

  const resetPatronForm = () => {
    setEditingPatronId(null);
    setEditingPatronData(null);
  };

  // ============================================================
  // ✅ HANDLERS CLIENTS
  // ============================================================
  const handleClientSubmit = async (clientData) => {
    try {
      setLoading(true);
      if (editingClientId) {
        await updateClient(editingClientId, clientData);
        triggerAlert("✅ Client modifié !");
      } else {
        await createClient(clientData);
        triggerAlert("✅ Client créé !");
      }
      resetClientForm();
      setShowClientModal(false);
    } catch (err) {
      triggerAlert("❌ Erreur : " + (err?.message || "Opération échouée"));
    } finally {
      setLoading(false);
    }
  };

  const handleClientEdit = (client) => {
    setEditingClientId(client.id);
    setEditingClientData(client);
    setShowClientModal(true);
  };

  const handleClientDelete = async (client) => {
    const confirmed = await showConfirm({
      title: "Supprimer ce client",
      message: `Voulez-vous vraiment supprimer "${client.nom}" ?\n\nLes missions existantes ne seront pas supprimées.`,
      confirmText: "Supprimer",
      cancelText: "Annuler",
      type: "danger",
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      await deleteClient(client.id);
      triggerAlert("🗑️ Client supprimé !");
    } catch {
      triggerAlert("❌ Erreur suppression");
    } finally {
      setLoading(false);
    }
  };

  const resetClientForm = () => {
    setEditingClientId(null);
    setEditingClientData(null);
  };

  // ============================================================
// ✅ HANDLERS LIEUX
// ============================================================

const handleLieuSubmit = async (lieuData) => {
  try {
    setLoading(true);

    let createdLieu;

    if (editingLieuId) {
      await updateLieu(editingLieuId, lieuData);
      triggerAlert("✅ Lieu modifié !");
    } else {
      createdLieu = await createLieu(lieuData);
      triggerAlert("✅ Lieu créé !");
    }

    await fetchLieux(); // refresh liste

    // ✅ AUTO-SELECT le lieu créé (UUID string)
    if (createdLieu?.id) {
      setSelectedLieuId(createdLieu.id);  // ✅ UUID string
      
      // ✅ Mettre à jour editingMissionData
      if (!editingMissionId) {
        setEditingMissionData((prev) => ({
          ...(prev || {}),
          lieu_id: createdLieu.id,
          lieu: createdLieu.nom || "",
        }));
      }
    }

    resetLieuForm();
    setShowLieuModal(false);
  } catch (err) {
    triggerAlert("❌ Erreur : " + (err?.message || "Opération échouée"));
  } finally {
    setLoading(false);
  }
};

const handleLieuEdit = (lieu) => {
  setEditingLieuId(lieu.id);
  setEditingLieuData(lieu);
  setShowLieuModal(true);
};

const handleLieuDelete = async (lieu) => {
  const confirmed = await showConfirm({
    title: "Supprimer ce lieu",
    message: `Voulez-vous vraiment supprimer "${lieu.nom}" ?\n\nLes missions existantes ne seront pas supprimées.`,
    confirmText: "Supprimer",
    cancelText: "Annuler",
    type: "danger",
  });

  if (!confirmed) return;

  try {
    setLoading(true);
    await deleteLieu(lieu.id);
    triggerAlert("🗑️ Lieu supprimé !");
  } catch {
    triggerAlert("❌ Erreur suppression");
  } finally {
    setLoading(false);
  }
};

const resetLieuForm = () => {
  setEditingLieuId(null);
  setEditingLieuData(null);
};


  // ============================================================
  // ✅ HANDLER : marquer bilan comme payé
  // ============================================================
  const handleMarquerCommePaye = async () => {
    const titre = bilan?.bilanContent?.titre || "ce bilan";
    const reste = bilan?.bilanContent?.resteAPercevoir || 0;

    const confirmed = await showConfirm({
      title: "Marquer comme payé",
      message: `Voulez-vous marquer ${titre} comme payé (${formatEuro(
        reste
      )}) ?`,
      confirmText: "Confirmer le paiement",
      cancelText: "Annuler",
      type: "info",
    });

    if (!confirmed) return;

    await bilan.marquerCommePaye(bilanPatronId);
    // ✅ ne pas regénérer direct après
  };

  // ============================================================
  // ✅ RENDER: données calculées pour l'affichage
  // ============================================================
  const currentWeek = getWeekNumber(new Date());
  const missionsThisWeek = getMissionsByWeek(currentWeek).filter(
    (m) => m && m.date_iso
  );

  /* ============================================================
     ✅ AccordionSection = un mini composant pour l’onglet "Données"
     - ça fait les blocs repliables (Patrons / Clients)
     ============================================================ */
  const AccordionSection = ({
    title,
    count,
    children,
    defaultOpen = false,
    disabled = false,
  }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
      <div
        className={`rounded-[30px] border-2 overflow-hidden ${
          darkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
        } backdrop-blur-xl`}
      >
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full p-6 flex items-center justify-between text-left transition-all ${
            disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-white/5"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{title.split(" ")[0]}</span>
            <div>
              <h3 className="text-lg font-black uppercase">
                {title.split(" ").slice(1).join(" ")}
              </h3>
              <p className="text-xs opacity-60">
                {count} élément{count > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {!disabled && (
            <div
              className={`text-2xl transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            >
              ▼
            </div>
          )}
        </button>
        {isOpen && !disabled && (
          <div className="p-6 border-t border-white/10">{children}</div>
        )}
      </div>
    );
  };
  return (
    <div
      className={`min-h-screen relative overflow-hidden transition-all duration-700 ${
        darkMode
          ? "bg-gradient-to-br from-[#0a001f] via-[#1a0033] to-[#0f0022] text-white"
          : "bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900"
      }`}
    >
      {/* Fond décoratif */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/30 via-transparent to-indigo-900/30" />
        <div className="absolute inset-0 backdrop-blur-3xl" />
      </div>

      {/* Toast alert (petites notifications) */}
      <CustomAlert
        show={customAlert.show}
        message={customAlert.message || ""}
        onDismiss={() => setCustomAlert((prev) => ({ ...prev, show: false }))}
      />

      {/* Overlay loading global */}
      {(loading ||
        missionsLoading ||
        fraisLoading ||
        acomptesLoading ||
        patronsLoading ||
        clientsLoading ||
        lieuxLoading || // ✅
        gpsLoading ||
        loadingHistorique) && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-400 border-t-transparent shadow-[0_0_30px_rgba(99,102,241,0.6)]"></div>
        </div>
      )}

      {/* Header haut (titre + horloge + bouton dark mode) */}
      <header className="relative p-6 pb-14 rounded-b-[60px] overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-800/95 via-purple-900/95 to-indigo-950/95 backdrop-blur-xl" />
        <div className="relative z-10 text-center">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="absolute right-6 top-6 w-12 h-12 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-2xl border border-white/20 shadow-lg active:scale-90 transition-all"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
          <h1 className="relative text-[30px] font-black italic tracking-[0.1em] text-white mb-2 drop-shadow-2xl">
            HEURES DE GEO
          </h1>
          <div className="flex items-center justify-center gap-2 text-white/90">
            <span className="text-[17px] font-black tracking-tight">
              {liveTime}
            </span>
            <span className="text-[15px] font-medium opacity-80 lowercase">
              {new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>
        </div>
      </header>

      {/* Main = contenu selon l’onglet actif */}
      <main className="relative px-5 -mt-10 pb-32 z-10">
        {/* ========= ONGLET SAISIE ========= */}
        {activeTab === "saisie" ? (
          <div className="animate-in fade-in duration-500">



<MissionForm
  editMode={!!editingMissionId}
  initialData={editingMissionData}
  
  lieux={lieux}
  selectedLieuId={selectedLieuId}
  onLieuChange={(lieuId) => {
    setSelectedLieuId(lieuId);
    
    // ✅ Ne modifier editingMissionData QUE si édition
    if (editingMissionId) {
      const selected = lieux.find((l) => String(l.id) === String(lieuId));
      setEditingMissionData((prev) => ({
        ...(prev || {}),
        lieu_id: lieuId,
        lieu: selected?.nom || prev?.lieu || "",
      }));
    }
  }}
  
  onAddNewLieu={(prefilledData) => {
    resetLieuForm();
    if (prefilledData) {
      setEditingLieuData(prefilledData);
    }
    setShowLieuModal(true);
  }}
  
  onSubmit={handleMissionSubmit}
  onCancel={resetMissionForm}
  onCopyLast={copierDerniereMission}
  darkMode={darkMode}
  isIOS={isIOS}
  loading={loading}
  
  patrons={patrons}
  missions={missions}
  
  // ✅ CORRECTION : Utiliser selectedPatronId state (pas editingMissionData)
  selectedPatronId={selectedPatronId}
  onPatronChange={(patronId) => {
    setSelectedPatronId(patronId);
    
    // ✅ Ne modifier editingMissionData QUE si édition
    if (editingMissionId) {
      setEditingMissionData((prev) => ({
        ...(prev || {}),
        patron_id: patronId,
      }));
    }
  }}
  
  clients={clients}
  selectedClientId={selectedClientId}
  onClientChange={(clientId) => {
    setSelectedClientId(clientId);
    
    // ✅ Ne modifier editingMissionData QUE si édition
    if (editingMissionId) {
      const selected = clients.find((c) => c.id === clientId);
      setEditingMissionData((prev) => ({
        ...(prev || {}),
        client_id: clientId,
        client: selected?.nom || prev?.client || "",
      }));
    }
  }}
  
  onAddNewClient={() => {
    resetClientForm();
    setShowClientModal(true);
  }}
/>

            {/* Boutons rapides */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <button
                onClick={() => setShowFraisModal(true)}
                className="py-4 bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded-[25px] text-[11px] font-black uppercase active:scale-95 transition-all"
              >
                + Frais divers
              </button>
              <button
                onClick={() => setShowAcompteModal(true)}
                className="py-4 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-[25px] text-[11px] font-black uppercase active:scale-95 transition-all"
              >
                + Acompte
              </button>
            </div>
          </div>
        ) : /* ========= ONGLET DONNEES ========= */
        activeTab === "donnees" ? (
          <div className="animate-in fade-in duration-500 space-y-4">
            <AccordionSection
              title="👔 Patrons"
              count={patrons.length}
              defaultOpen={true}
            >
              <PatronsManager
                patrons={patrons}
                onEdit={handlePatronEdit}
                onDelete={handlePatronDelete}
                onAdd={() => {
                  resetPatronForm();
                  setShowPatronModal(true);
                }}
                darkMode={darkMode}
                missions={missions}
                fraisDivers={fraisDivers}
                acomptes={listeAcomptes}
              />
            </AccordionSection>

            <AccordionSection
              title="🏢 Clients"
              count={clients.length}
              defaultOpen={false}
            >
              <ClientsManager
                clients={clients}
                onEdit={handleClientEdit}
                onDelete={handleClientDelete}
                onAdd={() => {
                  resetClientForm();
                  setShowClientModal(true);
                }}
                darkMode={darkMode}
                missions={missions}
              />
            </AccordionSection>
  
<AccordionSection title="📍 Lieux" count={lieux.length} defaultOpen={false}>
  <LieuxManager
    lieux={lieux}
    missions={missions}
    darkMode={darkMode}
    onAdd={() => {
      resetLieuForm();
      setShowLieuModal(true);
    }}
    onEdit={handleLieuEdit}
    onDelete={handleLieuDelete}
  />
</AccordionSection>


          </div>
          
        ) : /* ========= ONGLET HISTORIQUE ========= */
        activeTab === "historique" ? (
          <div className="animate-in fade-in duration-500 space-y-4">
            <p className="text-[11px] font-black uppercase opacity-40 px-2 tracking-[0.25em] text-center">
              Historique des bilans
            </p>

            <div className="p-5 rounded-[25px] border border-white/10 bg-white/5 backdrop-blur-md space-y-3">
              <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">
                Filtre patron
              </p>

              <select
                value={historiquePatronId || ""}
                onChange={(e) => setHistoriquePatronId(e.target.value || null)}
                className="w-full p-4 rounded-2xl bg-black/30 border border-white/10 text-white"
              >
                <option value="">Tous (global)</option>
                {patrons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom}
                  </option>
                ))}
              </select>

              <button
                onClick={() => chargerHistorique(historiquePatronId)}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl font-black text-white text-[11px] uppercase active:scale-95 transition-all"
              >
                {loadingHistorique ? "Chargement..." : "Charger l’historique"}
              </button>
            </div>

            {/* Onglets impayés / payés */}
            <div className="flex gap-2">
              <button
                onClick={() => setHistoriqueTab("impayes")}
                className={`flex-1 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${
                  historiqueTab === "impayes"
                    ? "bg-gradient-to-br from-orange-600 to-red-700 text-white"
                    : "bg-white/5 text-white/40 border border-white/10"
                }`}
              >
                Impayés ({historique.impayes.length})
              </button>

              <button
                onClick={() => setHistoriqueTab("payes")}
                className={`flex-1 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${
                  historiqueTab === "payes"
                    ? "bg-gradient-to-br from-green-600 to-emerald-700 text-white"
                    : "bg-white/5 text-white/40 border border-white/10"
                }`}
              >
                Payés ({historique.payes.length})
              </button>
            </div>

            {/* Contenu selon onglet */}
            {historiqueTab === "impayes" ? (
              <div className="p-5 rounded-[25px] border border-orange-500/20 bg-orange-500/10 backdrop-blur-md">
                <p className="text-[10px] font-black uppercase text-orange-300 tracking-widest mb-4">
                  Impayés
                </p>

                {historique.impayes.length === 0 ? (
                  <p className="text-sm opacity-60">Aucun impayé 🎉</p>
                ) : (
                  <div className="space-y-3">
                    {historique.impayes.map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center justify-between p-4 rounded-2xl bg-black/30 border border-white/10"
                      >
                        <div>
                          <p className="font-black uppercase text-sm">
                            Semaine {row.periode_value}
                          </p>
                          <p className="text-xs opacity-60">
                            Patron : {row.patron_nom || "Global"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-orange-300">
                            {formatEuro(row.reste_a_percevoir || 0)}
                          </p>
                          <p className="text-[10px] opacity-60">NON PAYÉ</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 rounded-[25px] border border-green-500/20 bg-green-500/10 backdrop-blur-md">
                <p className="text-[10px] font-black uppercase text-green-300 tracking-widest mb-4">
                  Payés
                </p>

                {historique.payes.length === 0 ? (
                  <p className="text-sm opacity-60">Aucun payé enregistré.</p>
                ) : (
                  <div className="space-y-3">
                    {historique.payes.map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center justify-between p-4 rounded-2xl bg-black/30 border border-white/10"
                      >
                        <div>
                          <p className="font-black uppercase text-sm">
                            Semaine {row.periode_value}
                          </p>
                          <p className="text-xs opacity-60">
                            Patron : {row.patron_nom || "Global"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-green-300">
                            {formatEuro(row.reste_a_percevoir || 0)}
                          </p>
                          <p className="text-[10px] opacity-60">
                            {row.date_paiement
                              ? formatDateFR(row.date_paiement)
                              : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ========= ONGLET BILAN ========= */
          <div className="animate-in slide-in-from-right duration-400">
            {!bilan.showBilan ? (
              <>
                <div className="mb-12 space-y-4">
                  <p className="text-[11px] font-black uppercase opacity-40 px-2 tracking-[0.25em] text-center">
                    Rapports & Bilans
                  </p>
                  <button
                    onClick={() => {
                      setBilanPatronId(null);
                      bilan.setShowPeriodModal(true);
                    }}
                    className="w-full py-6 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-3xl font-black text-white text-[14px] uppercase shadow-xl active:scale-95 transition-all"
                  >
                    Rapport bilan
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-[11px] font-black uppercase opacity-40 px-2 tracking-[0.25em]">
                    Semaine en cours (S{currentWeek})
                  </p>

                  {missionsThisWeek.length === 0 ? (
                    <p className="text-center text-[13px] opacity-60 py-8">
                      Aucune mission cette semaine...
                    </p>
                  ) : (
                    [...missionsThisWeek]
                      .sort(
                        (a, b) => new Date(a.date_iso) - new Date(b.date_iso)
                      )
                      .map((m) => (
                        <MissionCard
                          key={m.id}
                          mission={m}
                          onEdit={handleMissionEdit}
                          onDelete={handleMissionDelete}
                          patronNom={getPatronNom(m.patron_id)}
                          patronColor={getPatronColor(m.patron_id)}
                        />
                      ))
                  )}
                </div>
              </>
            ) : (
              <div className="animate-in fade-in duration-500">
                <button
                  onClick={() => bilan.setShowBilan(false)}
                  className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase opacity-50"
                >
                  ← Retour
                </button>

             <div className="bg-gradient-to-br from-indigo-600 to-purple-800 p-8 rounded-[45px] shadow-2xl mb-8">
  <p className="text-[10px] font-black uppercase text-white/50 tracking-[0.3em] mb-1">
    {bilan.bilanContent.titre}
  </p>
<div className="flex items-center justify-between gap-4 mb-6">
  <h2 className="text-4xl font-black text-white italic leading-none">
    BILAN
  </h2>

  {bilan.bilanPeriodType === "semaine" && (
    <div className="flex items-center gap-2">
      <button
        onClick={bilan.gotoPreviousWeek}
        disabled={!bilan.hasPreviousWeek}
        className="
          h-8 w-8 rounded-xl
          bg-white/10 border border-white/20
          text-white font-black
          disabled:opacity-30
          hover:bg-white/20
          transition-all
        "
      >
        ←
      </button>

      <WeekPicker
        value={bilan.bilanPeriodValue}
        weeks={bilan.availablePeriods}
        onChange={bilan.handleWeekChange}
      />

      <button
        onClick={bilan.gotoNextWeek}
        disabled={!bilan.hasNextWeek}
        className="
          h-8 w-8 rounded-xl
          bg-white/10 border border-white/20
          text-white font-black
          disabled:opacity-30
          hover:bg-white/20
          transition-all
        "
      >
        →
      </button>
    </div>
  )}
</div>




                  
                  <p className="text-center text-sm opacity-80 mb-4">
                    Pour : {bilan.bilanContent.selectedPatronNom}
                  </p>

                  <div
                    className={`grid gap-4 ${
                      bilan.bilanContent.impayePrecedent > 0
                        ? "grid-cols-3"
                        : "grid-cols-2"
                    }`}
                  >
                    <div className="bg-white/10 p-4 rounded-3xl">
                      <p className="text-[9px] font-black text-white/50 uppercase">
                        Heures
                      </p>
                      <p className="text-xl font-black text-white">
                        {formatHeures(bilan.bilanContent.totalH)}
                      </p>
                    </div>

                    {bilan.bilanContent.impayePrecedent > 0 && (
                      <div className="bg-white/10 p-4 rounded-3xl">
                        <p className="text-[9px] font-black text-white/50 uppercase">
                          Impayé précédent
                        </p>
                        <p className="text-xl font-black text-orange-300">
                          +{formatEuro(bilan.bilanContent.impayePrecedent)}
                        </p>
                      </div>
                    )}

                    <div className="bg-white/10 p-4 rounded-3xl">
                      <p className="text-[9px] font-black text-white/50 uppercase">
                        Total Brut
                      </p>
                      <p className="text-xl font-black text-green-300">
                        {formatEuro(bilan.bilanContent.totalE)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* SUIVI FRAIS / ACOMPTES */}
                {bilan.bilanPeriodType === "semaine" &&
                  (bilan.bilanContent.fraisDivers.length > 0 ||
                    bilan.bilanContent.impayePrecedent !== 0 ||
                    bilan.bilanContent.soldeAcomptesAvant !== 0 ||
                    bilan.bilanContent.acomptesDansPeriode !== 0 ||
                    bilan.bilanContent.totalAcomptes !== 0 ||
                    bilan.bilanContent.soldeAcomptesApres !== 0) && (
                    <div className="mb-8 p-6 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-[35px] border border-indigo-500/30 backdrop-blur-md">
                      <p className="text-[10px] font-black uppercase text-cyan-400 mb-4 tracking-[0.2em]">
                        {bilan.bilanContent.fraisDivers.length > 0
                          ? "Frais & Acomptes"
                          : "Suivi des acomptes & impayés"}
                      </p>

                      {bilan.bilanContent.fraisDivers.length > 0 && (
                        <>
                          {[...bilan.bilanContent.fraisDivers]
                            .sort(
                              (a, b) =>
                                new Date(a.date_frais) - new Date(b.date_frais)
                            )
                            .map((f) => (
                              <div
                                key={f.id}
                                className="flex justify-between items-center mb-3 gap-3"
                              >
                                <div className="flex-1">
                                  <span className="text-sm font-bold opacity-70 uppercase">
                                    {f.description} –{" "}
                                    {formatDateFR(f.date_frais)}
                                  </span>
                                </div>
                                <span className="text-sm font-black text-amber-500">
                                  +{formatEuro(f.montant)}
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleFraisEdit(f)}
                                    className="w-8 h-8 bg-blue-600/20 text-blue-400 rounded-lg flex items-center justify-center border border-blue-500/30 active:scale-90 transition-all"
                                    title="Modifier"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleFraisDelete(f)}
                                    className="w-8 h-8 bg-red-600/20 text-red-400 rounded-lg flex items-center justify-center border border-red-500/30 active:scale-90 transition-all"
                                    title="Supprimer"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            ))}
                        </>
                      )}

                      <div className="mt-6 bg-black/30 rounded-3xl p-5 border border-cyan-500/20">
                        <p className="text-[9px] font-black uppercase text-cyan-400 mb-4 tracking-[0.2em]">
                          Suivi du solde acompte & impayés
                        </p>

                        <div className="space-y-3">
                          {bilan.bilanContent.impayePrecedent !== 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-white/60">
                                Impayé précédent :
                              </span>
                              <span className="font-bold text-orange-400">
                                +
                                {formatEuro(bilan.bilanContent.impayePrecedent)}
                              </span>
                            </div>
                          )}

                          {bilan.bilanContent.soldeAcomptesAvant !== 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-white/60">
                                Solde avant période :
                              </span>
                              <span className="font-bold text-white">
                                {formatEuro(
                                  bilan.bilanContent.soldeAcomptesAvant
                                )}
                              </span>
                            </div>
                          )}

                          {bilan.bilanContent.acomptesDansPeriode !== 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-white/60">
                                Reçus cette période :
                              </span>
                              <span className="font-bold text-cyan-300">
                                +
                                {formatEuro(
                                  bilan.bilanContent.acomptesDansPeriode
                                )}
                              </span>
                            </div>
                          )}

                          {bilan.bilanContent.totalAcomptes !== 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-white/60">Consommé :</span>
                              <span className="font-bold text-cyan-300">
                                -{formatEuro(bilan.bilanContent.totalAcomptes)}
                              </span>
                            </div>
                          )}

                          {bilan.bilanContent.soldeAcomptesApres !== 0 && (
                            <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                              <span className="text-[10px] font-black uppercase text-white/80">
                                Solde restant à reporter :
                              </span>
                              <span className="text-xl font-black text-green-400">
                                {formatEuro(
                                  bilan.bilanContent.soldeAcomptesApres
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                {/* PAIEMENT */}
                {bilan.bilanPeriodType === "semaine" &&
                  (!bilan.bilanPaye ? (
                    <div className="mb-8 mt-2 p-5 bg-gradient-to-r from-orange-600 to-red-700 rounded-2xl shadow-lg">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[11px] font-black uppercase text-white/80">
                          Reste à percevoir (Net)
                        </span>
                        <span className="text-2xl font-black text-white">
                          {formatEuro(bilan.bilanContent.resteAPercevoir || 0)}
                        </span>
                      </div>

                      <button
                        onClick={handleMarquerCommePaye}
                        className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-xl font-black uppercase text-[11px] text-white tracking-wider transition-all active:scale-95 backdrop-blur-md border border-white/30"
                      >
                        💰 MARQUER COMME PAYÉ
                      </button>
                    </div>
                  ) : (
                    <div className="mb-8 mt-2 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-emerald-600/20 animate-pulse"></div>
                      <div className="relative p-6 bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl shadow-2xl border-2 border-green-400">
                        <div className="flex items-center justify-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                            <span className="text-4xl">✓</span>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-white/80 tracking-wider">
                              Statut du paiement
                            </p>
                            <p className="text-3xl font-black text-white uppercase tracking-tight">
                              PAYÉ
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                {/* EXPORTS */}
                <div className="flex flex-wrap gap-3 mb-8">
                  <button
                    onClick={() =>
                      exportToExcel(
                        bilan.bilanContent,
                        bilan.bilanPeriodType,
                        bilan.bilanPeriodValue,
                        bilan.bilanContent.titre,
                        bilan.bilanContent.fraisDivers
                      )
                    }
                    className="flex-1 min-w-[120px] py-4 bg-green-600/20 text-green-400 rounded-2xl font-black text-[10px] uppercase border border-green-500/30 active:scale-95 transition-all backdrop-blur-md"
                  >
                    Excel
                  </button>

                  <button
                    onClick={() =>
                      exportToPDFPro(
                        bilan.bilanContent,
                        bilan.bilanPeriodType,
                        bilan.bilanPaye,
                        bilan.bilanPeriodValue
                      )
                    }
                    className="flex-1 min-w-[120px] py-4 bg-red-600/20 text-red-400 rounded-2xl font-black text-[10px] uppercase border border-red-500/30 active:scale-95 transition-all backdrop-blur-md"
                  >
                    PDF
                  </button>

                  <button
                    onClick={() =>
                      exportToCSV(
                        bilan.bilanContent,
                        bilan.bilanPeriodType,
                        bilan.bilanPeriodValue,
                        false
                      )
                    }
                    className="flex-1 min-w-[120px] py-4 bg-blue-600/20 text-blue-400 rounded-2xl font-black text-[10px] uppercase border border-blue-500/30 active:scale-95 transition-all backdrop-blur-md"
                  >
                    CSV Missions
                  </button>

                  {bilan.bilanPeriodType === "semaine" &&
                    bilan.bilanContent.fraisDivers.length > 0 && (
                      <button
                        onClick={() =>
                          exportToCSV(
                            bilan.bilanContent,
                            bilan.bilanPeriodType,
                            bilan.bilanPeriodValue,
                            true
                          )
                        }
                        className="flex-1 min-w-[140px] py-4 bg-cyan-600/20 text-cyan-300 rounded-2xl font-black text-[10px] uppercase border border-cyan-500/30 active:scale-95 transition-all backdrop-blur-md"
                      >
                        CSV + Frais
                      </button>
                    )}
                </div>

                {/* Détail missions (semaine) OU Regroupement (mois/année) */}
                {bilan.bilanPeriodType === "semaine" ? (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase opacity-40 tracking-widest px-2">
                      Détail des missions
                    </p>

                    {[...bilan.bilanContent.filteredData]
                      .sort(
                        (a, b) => new Date(a.date_iso) - new Date(b.date_iso)
                      )
                      .map((m, i) => {
                        const date = new Date(m.date_iso);
                        const day = date.getDate().toString().padStart(2, "0");
                        const monthShort = date
                          .toLocaleString("fr-FR", { month: "short" })
                          .toUpperCase();

                        return (
                          <div
                            key={i}
                            className={`p-5 rounded-[25px] backdrop-blur-md border border-white/10 ${
                              darkMode ? "bg-white/5" : "bg-black/5"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="flex flex-col items-center min-w-[50px]">
                                  <div className="text-[10px] font-black uppercase text-indigo-300/90">
                                    {monthShort}
                                  </div>
                                  <div className="w-10 h-10 bg-indigo-700 rounded-md flex items-center justify-center shadow-md border border-indigo-600/30">
                                    <span className="text-white font-black text-xl">
                                      {day}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-sm uppercase text-white truncate">
                                    {m.client}
                                  </p>
                                  <p className="text-[11px] opacity-70 truncate">
                                    {m.debut} → {m.fin}
                                    {m.pause > 0 && ` (${m.pause} min)`}
                                  </p>
                                  {m.lieu && (
                                    <p className="text-[11px] opacity-60 mt-1 truncate">
                                      {m.lieu}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-6 shrink-0">
                                <div className="text-right">
                                  <p className="text-[12px] font-bold text-indigo-300">
                                    {formatHeures(m.duree || 0)}
                                  </p>
                                  <p className="text-lg font-black text-green-400">
                                    {formatEuro(m.montant)}
                                  </p>
                                </div>

                                {m.weather ? (
                                  <div className="flex items-center gap-2 min-w-[90px] justify-end">
                                    <img
                                      src={`https://openweathermap.org/img/wn/${m.weather.icon}@2x.png`}
                                      alt={m.weather.desc}
                                      className="w-8 h-8 drop-shadow-sm opacity-90"
                                      onError={(e) =>
                                        (e.target.src =
                                          "https://openweathermap.org/img/wn/01d@2x.png")
                                      }
                                    />
                                    <div className="text-right text-xs leading-tight">
                                      <div className="font-medium">
                                        {m.weather.tempMin}–{m.weather.tempMax}°
                                      </div>
                                      <div className="opacity-70 capitalize truncate max-w-[60px]">
                                        {m.weather.desc}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-xs opacity-40 italic text-right">
                                    ?
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="mt-8">
                    <p className="text-[10px] font-black uppercase opacity-60 px-2 mb-4 tracking-widest">
                      Regroupement
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {bilan.bilanContent.groupedData.map((group, index) => (
                        <div
                          key={index}
                          className="p-5 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10 shadow-lg"
                        >
                          <p className="font-black text-lg text-white mb-2">
                            {group.label}
                          </p>
                          <div className="flex justify-between text-sm">
                            <span className="opacity-70">Heures :</span>
                            <span className="font-bold text-indigo-300">
                              {formatHeures(group.h)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="opacity-70">Montant :</span>
                            <span className="font-bold text-green-400">
                              {formatEuro(group.e)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals (popups) */}
      <ConfirmModal
        show={confirmState.show}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
        onConfirm={confirmState.onConfirm}
        onCancel={hideConfirm}
      />

      <FraisModal
        show={showFraisModal}
        editMode={!!editingFraisId}
        description={fraisDescription}
        setDescription={setFraisDescription}
        montant={fraisMontant}
        setMontant={setFraisMontant}
        date={fraisDate}
        setDate={setFraisDate}
        onSubmit={handleFraisSubmit}
        onCancel={() => {
          setShowFraisModal(false);
          resetFraisForm();
        }}
        loading={loading}
        darkMode={darkMode}
        isIOS={isIOS}
        patrons={patrons}
        selectedPatronId={fraisPatronId}
        onPatronChange={setFraisPatronId}
      />

      <AcompteModal
        show={showAcompteModal}
        montant={acompteMontant}
        setMontant={setAcompteMontant}
        date={acompteDate}
        setDate={setAcompteDate}
        onSubmit={handleAcompteSubmit}
        onCancel={() => {
          setShowAcompteModal(false);
          resetAcompteForm();
        }}
        loading={loading}
        isIOS={isIOS}
        patrons={patrons}
        selectedPatronId={acomptePatronId}
        onPatronChange={setAcomptePatronId}
      />

      <PatronModal
        show={showPatronModal}
        editMode={!!editingPatronId}
        initialData={editingPatronData}
        onSubmit={handlePatronSubmit}
        onCancel={() => {
          setShowPatronModal(false);
          resetPatronForm();
        }}
        loading={loading}
        darkMode={darkMode}
      />

      <ClientModal
        show={showClientModal}
        editMode={!!editingClientId}
        initialData={editingClientData}
        onSubmit={handleClientSubmit}
        onCancel={() => {
          setShowClientModal(false);
          resetClientForm();
        }}
        loading={loading}
        darkMode={darkMode}
      />

      <PeriodModal
        show={bilan.showPeriodModal}
        periodType={bilan.bilanPeriodType}
        setPeriodType={bilan.setBilanPeriodType}
        periodValue={bilan.bilanPeriodValue}
        setPeriodValue={bilan.setBilanPeriodValue}
        availablePeriods={bilan.availablePeriods}
        formatPeriodLabel={bilan.formatPeriodLabel}
        onConfirm={() => bilan.genererBilan(bilanPatronId)}
        onCancel={() => bilan.setShowPeriodModal(false)}
        darkMode={darkMode}
        patrons={patrons}
        selectedPatronId={bilanPatronId}
        onPatronChange={setBilanPatronId}
      />
<LieuModal
  show={showLieuModal}
  editMode={!!editingLieuId}
  initialData={editingLieuData}
  onSubmit={handleLieuSubmit}
  onCancel={() => {
    setShowLieuModal(false);
    resetLieuForm();
  }}
  loading={loading}
  darkMode={darkMode}
/>


      {/* Navigation en bas */}
      <nav className="fixed bottom-6 left-6 right-6 z-[100]">
        <div className="bg-[#0f111a]/80 backdrop-blur-3xl border border-white/10 p-2 rounded-[35px] shadow-2xl flex gap-1">
          <button
            onClick={() => setActiveTab("saisie")}
            className={`flex-1 py-4 rounded-[28px] font-black uppercase text-[10px] tracking-widest ${
              activeTab === "saisie"
                ? "bg-gradient-to-br from-indigo-600 to-indigo-800 text-white"
                : "text-white/30"
            }`}
          >
            Saisie
          </button>

          <button
            onClick={() => setActiveTab("donnees")}
            className={`flex-1 py-4 rounded-[28px] font-black uppercase text-[10px] tracking-widest ${
              activeTab === "donnees"
                ? "bg-gradient-to-br from-green-600 to-green-800 text-white"
                : "text-white/30"
            }`}
          >
            Données
          </button>

          <button
            onClick={() => {
              setActiveTab("historique");
              bilan.setShowBilan(false);
            }}
            className={`flex-1 py-4 rounded-[28px] font-black uppercase text-[10px] tracking-widest ${
              activeTab === "historique"
                ? "bg-gradient-to-br from-cyan-600 to-cyan-800 text-white"
                : "text-white/30"
            }`}
          >
            Historique
          </button>

          <button
            onClick={() => {
              setActiveTab("histo");
              bilan.setShowBilan(false);
            }}
            className={`flex-1 py-4 rounded-[28px] font-black uppercase text-[10px] tracking-widest ${
              activeTab === "histo"
                ? "bg-gradient-to-br from-purple-600 to-purple-800 text-white"
                : "text-white/30"
            }`}
          >
            Bilan
          </button>
        </div>
      </nav>
    </div>
  );
}
