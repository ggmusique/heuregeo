import React, { useState, useEffect, useCallback, useMemo } from "react";

// Pages (tabs)
import { SaisieTab } from "./pages/SaisieTab";
import { DonneesTab } from "./pages/DonneesTab";
import { HistoriqueTab } from "./pages/HistoriqueTab";
import { BilanTab } from "./pages/BilanTab";
import { CompteTab } from "./pages/CompteTab";

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
import { useProfile } from "./hooks/useProfile";

// Components
import { FraisModal } from "./components/common/frais/FraisModal";
import { AcompteModal } from "./components/common/acompte/AcompteModal";
import { PatronModal } from "./components/patron/PatronModal";
import { ClientModal } from "./components/client/ClientModal";
import { PeriodModal } from "./components/common/bilan/PeriodModal";
import { ConfirmModal } from "./components/common/ConfirmModal";
import { CustomAlert } from "./components/common/CustomAlert";
import { UpdatePrompt } from "./components/common/UpdatePrompt";
import { LieuModal } from "./components/lieu/LieuModal";
import { OnboardingForm } from "./components/auth/OnboardingForm";

// Styles
import "./time-inputs-fix.css";
import "./fix-time-pickers-emergency.css";
import "./fix-selects.css";

// Utils
import { getWeekNumber } from "./utils/dateUtils";

export default function App({ user }) {
  const APP_CHANNEL = import.meta.env.VITE_APP_CHANNEL || "LOCAL";
  const APP_VERSION = __APP_VERSION__ || import.meta.env.VITE_APP_VERSION || "";

  const [activeTab, setActiveTab] = useState("saisie");
  const [darkMode, setDarkMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [customAlert, setCustomAlert] = useState({ show: false, message: "" });
  const [isIOS, setIsIOS] = useState(false);
  const [liveTime, setLiveTime] = useState("");

  const [showFraisModal, setShowFraisModal] = useState(false);
  const [fraisDescription, setFraisDescription] = useState("");
  const [fraisMontant, setFraisMontant] = useState("");
  const [fraisDate, setFraisDate] = useState(new Date().toISOString().split("T")[0]);
  const [editingFraisId, setEditingFraisId] = useState(null);
  const [fraisPatronId, setFraisPatronId] = useState(null);

  const [showAcompteModal, setShowAcompteModal] = useState(false);
  const [acompteMontant, setAcompteMontant] = useState("");
  const [acompteDate, setAcompteDate] = useState(new Date().toISOString().split("T")[0]);
  const [acomptePatronId, setAcomptePatronId] = useState(null);

  const [showPatronModal, setShowPatronModal] = useState(false);
  const [editingPatronId, setEditingPatronId] = useState(null);
  const [editingPatronData, setEditingPatronData] = useState(null);

  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);
  const [editingClientData, setEditingClientData] = useState(null);

  const [showLieuModal, setShowLieuModal] = useState(false);
  const [editingLieuId, setEditingLieuId] = useState(null);
  const [editingLieuData, setEditingLieuData] = useState(null);

  const [editingMissionId, setEditingMissionId] = useState(null);
  const [editingMissionData, setEditingMissionData] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedLieuId, setSelectedLieuId] = useState(null);
  const [selectedPatronId, setSelectedPatronId] = useState(null);

  const [historique, setHistorique] = useState({ impayes: [], payes: [], all: [] });
  const [loadingHistorique, setLoadingHistorique] = useState(false);
  const [historiquePatronId, setHistoriquePatronId] = useState(null);
  const [historiqueTab, setHistoriqueTab] = useState("impayes");

  const [bilanPatronId, setBilanPatronId] = useState(null);
  const [bilanClientId, setBilanClientId] = useState(null);

  const triggerAlert = useCallback((msg) => {
    setCustomAlert({ show: true, message: msg });
  }, []);

  const { confirmState, showConfirm, hideConfirm } = useConfirm();

  const {
    missions,
    loading: missionsLoading,
    fetchMissions,
    createMission,
    updateMission,
    deleteMission,
    getMissionsByWeek,
    getMissionsByPeriod,
  } = useMissions(triggerAlert);

  const {
    lieux,
    loading: lieuxLoading,
    fetchLieux,
    createLieu,
    updateLieu,
    deleteLieu,
  } = useLieux(triggerAlert);

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

  const {
    listeAcomptes,
    loading: acomptesLoading,
    fetchAcomptes,
    createAcompte,
    getSoldeAvant,
    getAcomptesDansPeriode,
    getTotalAcomptesJusqua,
  } = useAcomptes(missions, fraisDivers, triggerAlert);

  const {
    patrons,
    loading: patronsLoading,
    createPatron,
    updatePatron,
    deletePatron,
    getPatronNom,
    getPatronColor,
  } = usePatrons(triggerAlert);

  const {
    clients,
    loading: clientsLoading,
    createClient,
    updateClient,
    deleteClient,
    getClientNom,
  } = useClients(triggerAlert);

  const { loading: gpsLoading } = useGeolocation(
    (address) => triggerAlert(`Position chargée : ${address.substring(0, 45)}...`),
    (error) => triggerAlert(error)
  );

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
    getTotalAcomptesJusqua,
    triggerAlert,
  });

  const {
    profile,
    loading: profileLoading,
    saving: profileSaving,
    saveProfile,
    isProfileComplete,
  } = useProfile(user);

  useEffect(() => {
    document.title = "Heures de Geo";
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
    fetchMissions();
    fetchFrais();
    fetchAcomptes();
    fetchLieux();
  }, [fetchMissions, fetchFrais, fetchAcomptes, fetchLieux]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (editingMissionData?.lieu_id) {
      setSelectedLieuId(editingMissionData.lieu_id);
    } else if (!editingMissionId) {
      setSelectedLieuId(null);
    }
  }, [editingMissionData, editingMissionId]);

  useEffect(() => {
    if (editingMissionData?.client_id) {
      setSelectedClientId(editingMissionData.client_id);
    } else if (!editingMissionId) {
      setSelectedClientId(null);
    }
  }, [editingMissionData, editingMissionId]);

  useEffect(() => {
    if (bilan.showPeriodModal) bilan.calculerPeriodesDisponibles();
  }, [bilan.showPeriodModal, bilan.bilanPeriodType, missions]);

  const handleMissionSubmit = async (missionData) => {
    if (!missionData?.debut || !missionData?.fin) {
      triggerAlert("❌ Veuillez remplir début et fin");
      return;
    }
    try {
      setLoading(true);
      if (editingMissionId) {
        await updateMission(editingMissionId, missionData);
        triggerAlert("✅ Mission mise à jour !");
      } else {
        await createMission(missionData);
        triggerAlert("✅ Mission enregistrée !");
      }
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
    setSelectedPatronId(mission.patron_id || null);
    setActiveTab("saisie");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleMissionDelete = async (id) => {
    const mission = missions.find((m) => m.id === id);
    if (!mission) return;
    const confirmed = await showConfirm({
      title: "Supprimer mission",
      message: `Supprimer "${mission.client}" du ${mission.date_iso} ?`,
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
    setSelectedPatronId(null);
  };

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
    setSelectedPatronId(derniere.patron_id || null);
  };

  const handleFraisSubmit = async () => {
    const montant = parseFloat(fraisMontant);
    if (!fraisDescription.trim() || isNaN(montant) || montant <= 0)
      return triggerAlert("Remplis correctement les champs");
    if (!fraisPatronId) return triggerAlert("Sélectionne un patron pour ce frais");
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
      message: `Voulez-vous vraiment supprimer \