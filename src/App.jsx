import React, { useState, useEffect, useCallback, useMemo } from "react";

import { SaisieTab } from "./pages/SaisieTab";
import { DonneesTab } from "./pages/DonneesTab";
import { HistoriqueTab } from "./pages/HistoriqueTab";
import { BilanTab } from "./pages/BilanTab";
import { CompteTab } from "./pages/CompteTab";

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
import { ViewerBadge } from "./components/common/ViewerBadge";

import { supabase } from "./services/supabase";

import "./time-inputs-fix.css";
import "./fix-time-pickers-emergency.css";
import "./fix-selects.css";

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

  const { missions, loading: missionsLoading, fetchMissions, createMission, updateMission, deleteMission, getMissionsByWeek, getMissionsByPeriod } = useMissions(triggerAlert);
  const { lieux, loading: lieuxLoading, fetchLieux, createLieu, updateLieu, deleteLieu } = useLieux(triggerAlert);
  const { fraisDivers, loading: fraisLoading, fetchFrais, createFrais, updateFrais, deleteFrais, getFraisByWeek, getTotalFrais } = useFrais(triggerAlert);
  const { listeAcomptes, loading: acomptesLoading, fetchAcomptes, createAcompte, getSoldeAvant, getAcomptesDansPeriode, getTotalAcomptesJusqua } = useAcomptes(missions, fraisDivers, triggerAlert);
  const { patrons, loading: patronsLoading, createPatron, updatePatron, deletePatron, getPatronNom, getPatronColor } = usePatrons(triggerAlert);
  const { clients, loading: clientsLoading, createClient, updateClient, deleteClient, getClientNom } = useClients(triggerAlert);
  const { loading: gpsLoading } = useGeolocation(
    (address) => triggerAlert("Position chargee : " + address.substring(0, 45) + "..."),
    (error) => triggerAlert(error)
  );

  const bilan = useBilan({ missions, fraisDivers, patrons, getMissionsByWeek, getMissionsByPeriod, getFraisByWeek, getTotalFrais, getSoldeAvant, getAcomptesDansPeriode, getTotalAcomptesJusqua, triggerAlert });
  const { profile, loading: profileLoading, saving: profileSaving, saveProfile, isProfileComplete, isViewer, viewerPatronId } = useProfile(user);

  useEffect(() => {
    document.title = "Heures de Geo";
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
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
    if (editingMissionData?.lieu_id) setSelectedLieuId(editingMissionData.lieu_id);
    else if (!editingMissionId) setSelectedLieuId(null);
  }, [editingMissionData, editingMissionId]);

  useEffect(() => {
    if (editingMissionData?.client_id) setSelectedClientId(editingMissionData.client_id);
    else if (!editingMissionId) setSelectedClientId(null);
  }, [editingMissionData, editingMissionId]);

  useEffect(() => {
    if (bilan.showPeriodModal) bilan.calculerPeriodesDisponibles();
  }, [bilan.showPeriodModal, bilan.bilanPeriodType, missions]);

  useEffect(() => {
    if (isViewer && !profileLoading) {
      setActiveTab("histo");
    }
  }, [isViewer, profileLoading]);

  useEffect(() => {
    if (isViewer && viewerPatronId) {
      setBilanPatronId(viewerPatronId);
    }
  }, [isViewer, viewerPatronId]);

  const handleMissionSubmit = async (missionData) => {
    if (!missionData?.debut || !missionData?.fin) { triggerAlert("Veuillez remplir debut et fin"); return; }
    try {
      setLoading(true);
      if (editingMissionId) { await updateMission(editingMissionId, missionData); triggerAlert("Mission mise a jour !"); }
      else { await createMission(missionData); triggerAlert("Mission enregistree !"); }
      resetMissionForm();
    } catch (err) { triggerAlert("Erreur : " + (err?.message || "Operation echouee")); }
    finally { setLoading(false); }
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
    const confirmed = await showConfirm({ title: "Supprimer mission", message: "Supprimer cette mission ?", confirmText: "Supprimer", cancelText: "Annuler", type: "danger" });
    if (!confirmed) return;
    try { setLoading(true); await deleteMission(id); triggerAlert("Mission supprimee !"); }
    catch { triggerAlert("Erreur suppression"); }
    finally { setLoading(false); }
  };

  const resetMissionForm = () => { setEditingMissionId(null); setEditingMissionData(null); setSelectedClientId(null); setSelectedLieuId(null); setSelectedPatronId(null); };

  const copierDerniereMission = () => {
    if (!missions.length) return triggerAlert("Aucune mission precedente.");
    const derniere = [...missions].sort((a, b) => b.date_iso.localeCompare(a.date_iso))[0];
    setEditingMissionData({ lieu_id: derniere.lieu_id || null, lieu: derniere.lieu || "", debut: derniere.debut, fin: derniere.fin, pause: derniere.pause, patron_id: derniere.patron_id, client_id: derniere.client_id, client: derniere.client });
    setSelectedClientId(derniere.client_id || null);
    setSelectedLieuId(derniere.lieu_id || null);
    setSelectedPatronId(derniere.patron_id || null);
  };

  const handleFraisSubmit = async () => {
    const montant = parseFloat(fraisMontant);
    if (!fraisDescription.trim() || isNaN(montant) || montant <= 0) return triggerAlert("Remplis correctement les champs");
    if (!fraisPatronId) return triggerAlert("Selectionne un patron pour ce frais");
    try {
      setLoading(true);
      if (editingFraisId) { await updateFrais(editingFraisId, { description: fraisDescription.trim(), montant, date_frais: fraisDate, patron_id: fraisPatronId }); triggerAlert("Frais modifie !"); }
      else { await createFrais({ description: fraisDescription.trim(), montant, date_frais: fraisDate, patron_id: fraisPatronId }); triggerAlert("Frais ajoute !"); }
      resetFraisForm();
      setShowFraisModal(false);
    } catch { triggerAlert("Erreur operation frais"); }
    finally { setLoading(false); }
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
    const confirmed = await showConfirm({ title: "Supprimer ce frais", message: "Supprimer ce frais ?", confirmText: "Supprimer", cancelText: "Annuler", type: "danger" });
    if (!confirmed) return;
    try { setLoading(true); await deleteFrais(frais.id); triggerAlert("Frais supprime !"); }
    catch { triggerAlert("Erreur suppression"); }
    finally { setLoading(false); }
  };

  const resetFraisForm = () => { setFraisDescription(""); setFraisMontant(""); setFraisDate(new Date().toISOString().split("T")[0]); setEditingFraisId(null); setFraisPatronId(null); };

  const handleAcompteSubmit = async () => {
    const montantNet = parseFloat(acompteMontant?.toString().replace(",", "."));
    if (!acompteMontant || isNaN(montantNet) || montantNet <= 0) return triggerAlert("Veuillez saisir un montant valide");
    if (!acomptePatronId) return triggerAlert("Selectionne un patron pour cet acompte");
    try {
      setLoading(true);
      await createAcompte({ montant: montantNet, date_acompte: acompteDate, patron_id: acomptePatronId }, bilan.autoPayerBilans);
      triggerAlert("Acompte enregistre !");
      resetAcompteForm();
      setShowAcompteModal(false);
      if (bilan.showBilan && bilan.bilanPeriodValue) await bilan.genererBilan(bilanPatronId);
    } catch (err) { triggerAlert("Erreur : " + (err?.message || "Probleme de base de donnees")); }
    finally { setLoading(false); }
  };

  const resetAcompteForm = () => { setAcompteMontant(""); setAcompteDate(new Date().toISOString().split("T")[0]); setAcomptePatronId(null); };

  const handlePatronSubmit = async (patronData) => {
    try {
      setLoading(true);
      if (editingPatronId) { await updatePatron(editingPatronId, patronData); triggerAlert("Patron modifie !"); }
      else { await createPatron(patronData); triggerAlert("Patron cree !"); }
      resetPatronForm();
      setShowPatronModal(false);
    } catch (err) { triggerAlert("Erreur : " + (err?.message || "Operation echouee")); }
    finally { setLoading(false); }
  };

  const handlePatronEdit = (patron) => { setEditingPatronId(patron.id); setEditingPatronData(patron); setShowPatronModal(true); };

  const handlePatronDelete = async (patron) => {
    const confirmed = await showConfirm({ title: "Supprimer ce patron", message: "Supprimer ce patron ?", confirmText: "Supprimer", cancelText: "Annuler", type: "danger" });
    if (!confirmed) return;
    try { setLoading(true); await deletePatron(patron.id); triggerAlert("Patron supprime !"); }
    catch { triggerAlert("Erreur suppression"); }
    finally { setLoading(false); }
  };

  const resetPatronForm = () => { setEditingPatronId(null); setEditingPatronData(null); };

  const handleClientSubmit = async (clientData) => {
    try {
      setLoading(true);
      if (editingClientId) { await updateClient(editingClientId, clientData); triggerAlert("Client modifie !"); }
      else { await createClient(clientData); triggerAlert("Client cree !"); }
      resetClientForm();
      setShowClientModal(false);
    } catch (err) { triggerAlert("Erreur : " + (err?.message || "Operation echouee")); }
    finally { setLoading(false); }
  };

  const handleClientEdit = (client) => { setEditingClientId(client.id); setEditingClientData(client); setShowClientModal(true); };

  const handleClientDelete = async (client) => {
    const confirmed = await showConfirm({ title: "Supprimer ce client", message: "Supprimer ce client ?", confirmText: "Supprimer", cancelText: "Annuler", type: "danger" });
    if (!confirmed) return;
    try { setLoading(true); await deleteClient(client.id); triggerAlert("Client supprime !"); }
    catch { triggerAlert("Erreur suppression"); }
    finally { setLoading(false); }
  };

  const resetClientForm = () => { setEditingClientId(null); setEditingClientData(null); };

  const handleLieuSubmit = async (lieuData) => {
    try {
      setLoading(true);
      let createdLieu;
      if (editingLieuId) { await updateLieu(editingLieuId, lieuData); triggerAlert("Lieu modifie !"); }
      else { createdLieu = await createLieu(lieuData); triggerAlert("Lieu cree !"); }
      await fetchLieux();
      if (createdLieu?.id) {
        setSelectedLieuId(createdLieu.id);
        if (!editingMissionId) setEditingMissionData((prev) => ({ ...(prev || {}), lieu_id: createdLieu.id, lieu: createdLieu.nom || "" }));
      }
      resetLieuForm();
      setShowLieuModal(false);
    } catch (err) { triggerAlert("Erreur : " + (err?.message || "Operation echouee")); }
    finally { setLoading(false); }
  };

  const handleLieuEdit = (lieu) => { setEditingLieuId(lieu.id); setEditingLieuData(lieu); setShowLieuModal(true); };

  const handleLieuDelete = async (lieu) => {
    const confirmed = await showConfirm({ title: "Supprimer ce lieu", message: "Supprimer ce lieu ?", confirmText: "Supprimer", cancelText: "Annuler", type: "danger" });
    if (!confirmed) return;
    try { setLoading(true); await deleteLieu(lieu.id); triggerAlert("Lieu supprime !"); }
    catch { triggerAlert("Erreur suppression"); }
    finally { setLoading(false); }
  };

  const resetLieuForm = () => { setEditingLieuId(null); setEditingLieuData(null); };

  const handleMarquerCommePaye = async () => {
    const confirmed = await showConfirm({ title: "Marquer comme paye", message: "Voulez-vous marquer ce bilan comme paye ?", confirmText: "Confirmer", cancelText: "Annuler", type: "info" });
    if (!confirmed) return;
    await bilan.marquerCommePaye(bilanPatronId);
  };

  const chargerHistorique = async (patronId = null) => {
    if (typeof bilan.fetchHistoriqueBilans !== "function") { triggerAlert("Historique non branche"); return; }
    try {
      setLoadingHistorique(true);
      const res = await bilan.fetchHistoriqueBilans(patronId);
      setHistorique(res || { impayes: [], payes: [], all: [] });
    } catch { triggerAlert("Erreur chargement historique"); }
    finally { setLoadingHistorique(false); }
  };

  const currentWeek = getWeekNumber(new Date());
  const missionsThisWeek = getMissionsByWeek(currentWeek).filter((m) => m && m.date_iso);

  const isLoading = loading || missionsLoading || fraisLoading || acomptesLoading || patronsLoading || clientsLoading || lieuxLoading || gpsLoading || loadingHistorique;

  if (user && !profileLoading && !isViewer && !isProfileComplete) {
    return <OnboardingForm onSave={saveProfile} saving={profileSaving} />;
  }

  return (
    <div className={"min-h-screen relative overflow-hidden transition-all duration-700 " + (darkMode ? "bg-[#020818] text-white" : "bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900")}>  
      <div className="fixed inset-0 pointer-events-none">  
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 via-transparent to-blue-800/10" />  
        <div className="absolute inset-0 backdrop-blur-3xl" />  
      </div>  

      <CustomAlert show={customAlert.show} message={customAlert.message || ""} onDismiss={() => setCustomAlert((prev) => ({ ...prev, show: false }))} />  
      <UpdatePrompt />  

      {isLoading && (  
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm">  
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-transparent"></div>  
        </div>  
      )}  

      <header className="relative p-6 pb-14 rounded-b-[60px] overflow-hidden shadow-2xl border-b border-yellow-600/30">  
        <div className="absolute inset-0 bg-gradient-to-br from-[#020818] via-[#0A1628] to-[#020818] backdrop-blur-xl" />  
        <div className="relative z-10 text-center">  
          <button  
            onClick={() => setDarkMode(!darkMode)}  
            className="absolute right-6 top-6 w-12 h-12 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-2xl border border-white/20 shadow-lg active:scale-90 transition-all"  
          >  
            {darkMode ? "☀️" : "🌙"}  
          </button>  
          <h1 className="relative text-[30px] font-black italic tracking-[0.1em] text-[#D4AF37] mb-2 drop-shadow-2xl font-['Playfair_Display']">  
            {("HEURES DE " + (profile?.prenom?.trim()?.toUpperCase() || "GEO"))}  
          </h1>  
          {isViewer && <ViewerBadge patronNom={profile?.nom || ""} />}  
          <div className="flex items-center justify-center gap-2 mb-1">  
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase px-3 py-0.5 rounded-full border border-yellow-600/40 text-yellow-500/70">  
              v{APP_VERSION} ✓ OTA  
            </span>  
          </div>  
          <div className="flex items-center justify-center gap-2 text-white/90">  
            <span className="text-[17px] font-black tracking-tight">{liveTime}</span>  
            <span className="text-[15px] font-medium opacity-80 lowercase">  
              {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}  
            </span>  
          </div>  
        </div>  
      </header>  

      <main className="relative px-5 -mt-10 pb-32 z-10">  
        {activeTab === "saisie" && (  
          <SaisieTab  
            editingMissionId={editingMissionId}  
            editingMissionData={editingMissionData}  
            selectedClientId={selectedClientId}  
            selectedLieuId={selectedLieuId}  
            selectedPatronId={selectedPatronId}  
            onMissionSubmit={handleMissionSubmit}  
            onMissionCancel={resetMissionForm}  
            onCopyLast={copierDerniereMission}  
            lieux={lieux}  
            patrons={patrons}  
            clients={clients}  
            missions={missions}  
            darkMode={darkMode}  
            isIOS={isIOS}  
            loading={loading}  
            onLieuChange={(lieuId) => {  
              setSelectedLieuId(lieuId);  
              if (editingMissionId) {  
                const selected = lieux.find((l) => String(l.id) === String(lieuId));  
                setEditingMissionData((prev) => ({ ...(prev || {}), lieu_id: lieuId, lieu: selected?.nom || prev?.lieu || "" }));  
              }  
            }}  
            onPatronChange={(patronId) => {  
              setSelectedPatronId(patronId);  
              if (editingMissionId) setEditingMissionData((prev) => ({ ...(prev || {}), patron_id: patronId }));  
            }}  
            onClientChange={(clientId) => {  
              setSelectedClientId(clientId);  
              if (editingMissionId) {  
                const selected = clients.find((c) => c.id === clientId);  
                setEditingMissionData((prev) => ({ ...(prev || {}), client_id: clientId, client: selected?.nom || prev?.client || "" }));  
              }  
            }}  
            onShowLieuModal={() => { resetLieuForm(); setShowLieuModal(true); }}  
            onShowClientModal={() => { resetClientForm(); setShowClientModal(true); }}  
            onShowFraisModal={() => setShowFraisModal(true)}  
            onShowAcompteModal={() => setShowAcompteModal(true)}  
          />  
        )}  

        {activeTab === "donnees" && (  
          <DonneesTab  
            patrons={patrons} clients={clients} lieux={lieux} missions={missions} fraisDivers={fraisDivers} acomptes={listeAcomptes} darkMode={darkMode}  
            onPatronEdit={handlePatronEdit} onPatronDelete={handlePatronDelete} onPatronAdd={() => { resetPatronForm(); setShowPatronModal(true); }}  
            onClientEdit={handleClientEdit} onClientDelete={handleClientDelete} onClientAdd={() => { resetClientForm(); setShowClientModal(true); }}  
            onLieuEdit={handleLieuEdit} onLieuDelete={handleLieuDelete} onLieuAdd={() => { resetLieuForm(); setShowLieuModal(true); }}  
          />  
        )}  

        {activeTab === "historique" && (  
          <HistoriqueTab  
            historique={historique} historiquePatronId={historiquePatronId} historiqueTab={historiqueTab} loadingHistorique={loadingHistorique}  
            darkMode={darkMode} patrons={patrons} missions={missions} listeAcomptes={listeAcomptes}  
            onPatronFilterChange={(patronId) => { setHistoriquePatronId(patronId); chargerHistorique(patronId); }}  
            onTabChange={setHistoriqueTab} onLoadHistorique={chargerHistorique}  
            isViewer={isViewer} viewerPatronId={viewerPatronId}  
          />  
        )}  

        {activeTab === "histo" && (  
          <BilanTab  
            bilan={bilan} bilanPatronId={bilanPatronId} currentWeek={currentWeek} missionsThisWeek={missionsThisWeek}  
            darkMode={darkMode} patrons={patrons} getPatronNom={getPatronNom} getPatronColor={getPatronColor}  
            onMarquerCommePaye={handleMarquerCommePaye} onFraisEdit={handleFraisEdit} onFraisDelete={handleFraisDelete}  
            onMissionEdit={handleMissionEdit} onMissionDelete={handleMissionDelete} profile={profile}  
            isViewer={isViewer}  
          />  
        )}  

        {activeTab === "compte" && (  
          <CompteTab profile={profile} saving={profileSaving} onSave={saveProfile} userEmail={user?.email} />  
        )}  
      </main>  

      <ConfirmModal show={confirmState.show} title={confirmState.title} message={confirmState.message} confirmText={confirmState.confirmText} cancelText={confirmState.cancelText} type={confirmState.type} onConfirm={confirmState.onConfirm} onCancel={hideConfirm} />  

      <FraisModal show={showFraisModal} editMode={!!editingFraisId} description={fraisDescription} setDescription={setFraisDescription} montant={fraisMontant} setMontant={setFraisMontant} date={fraisDate} setDate={setFraisDate} onSubmit={handleFraisSubmit} onCancel={() => { setShowFraisModal(false); resetFraisForm(); }} loading={loading} darkMode={darkMode} isIOS={isIOS} patrons={patrons} selectedPatronId={fraisPatronId} onPatronChange={setFraisPatronId} />  

      <AcompteModal show={showAcompteModal} montant={acompteMontant} setMontant={setAcompteMontant} date={acompteDate} setDate={setAcompteDate} onSubmit={handleAcompteSubmit} onCancel={() => { setShowAcompteModal(false); resetAcompteForm(); }} loading={loading} isIOS={isIOS} patrons={patrons} selectedPatronId={acomptePatronId} onPatronChange={setAcomptePatronId} />  

      <PatronModal show={showPatronModal} editMode={!!editingPatronId} initialData={editingPatronData} onSubmit={handlePatronSubmit} onCancel={() => { setShowPatronModal(false); resetPatronForm(); }} loading={loading} darkMode={darkMode} />  

      <ClientModal show={showClientModal} editMode={!!editingClientId} initialData={editingClientData} onSubmit={handleClientSubmit} onCancel={() => { setShowClientModal(false); resetClientForm(); }} loading={loading} darkMode={darkMode} />  

      <PeriodModal
        show={bilan.showPeriodModal} periodType={bilan.bilanPeriodType} setPeriodType={bilan.setBilanPeriodType}
        periodValue={bilan.bilanPeriodValue} setPeriodValue={bilan.setBilanPeriodValue} availablePeriods={bilan.availablePeriods}
        formatPeriodLabel={bilan.formatPeriodLabel} onConfirm={() => bilan.genererBilan(bilanPatronId, bilanClientId)}
        onCancel={() => { bilan.setShowPeriodModal(false); setBilanClientId(null); }}
        darkMode={darkMode} patrons={patrons} selectedPatronId={bilanPatronId} onPatronChange={setBilanPatronId}
        clients={clients} selectedClientId={bilanClientId} onClientChange={setBilanClientId}
        isViewer={isViewer}
      />

      <LieuModal show={showLieuModal} editMode={!!editingLieuId} initialData={editingLieuData} onSubmit={handleLieuSubmit} onCancel={() => { setShowLieuModal(false); resetLieuForm(); }} loading={loading} darkMode={darkMode} />  

      <nav className="fixed bottom-6 left-6 right-6 z-[100]">  
        <div className="bg-[#020818]/90 backdrop-blur-3xl border border-yellow-600/20 p-2 rounded-[35px] shadow-2xl flex gap-1">  
          {!isViewer && (
            <button onClick={() => setActiveTab("saisie")} className={"flex-1 py-4 rounded-[28px] font-black uppercase text-[10px] tracking-widest " + (activeTab === "saisie" ? "bg-gradient-to-br from-indigo-600 to-indigo-800 text-white" : "text-white/30")}>Saisie</button>
          )}
          {!isViewer && (
            <button onClick={() => setActiveTab("donnees")} className={"flex-1 py-4 rounded-[28px] font-black uppercase text-[10px] tracking-widest " + (activeTab === "donnees" ? "bg-gradient-to-br from-green-600 to-green-800 text-white" : "text-white/30")}>Donnees</button>
          )}
          <button onClick={() => { setActiveTab("historique"); bilan.setShowBilan(false); }} className={"flex-1 py-4 rounded-[28px] font-black uppercase text-[10px] tracking-widest " + (activeTab === "historique" ? "bg-gradient-to-br from-cyan-600 to-cyan-800 text-white" : "text-white/30")}>Historique</button>  
          <button onClick={() => { setActiveTab("histo"); bilan.setShowBilan(false); }} className={"flex-1 py-4 rounded-[28px] font-black uppercase text-[10px] tracking-widest " + (activeTab === "histo" ? "bg-gradient-to-br from-[#C9A84C] to-[#A07830] text-white" : "text-white/30")}>Bilan</button>  
          {!isViewer ? (
            <button onClick={() => setActiveTab("compte")} className={"flex-1 py-3 rounded-[28px] font-black uppercase text-[9px] tracking-widest flex flex-col items-center justify-center gap-0.5 " + (activeTab === "compte" ? "bg-gradient-to-br from-indigo-600 to-purple-700 text-white" : "text-white/30")}>
              <span>Compte</span>
            </button>
          ) : (
            <button onClick={() => supabase.auth.signOut()} className="flex-1 py-3 rounded-[28px] font-black uppercase text-[9px] tracking-widest flex flex-col items-center justify-center gap-0.5 text-white/30">
              <span>🚪</span>
            </button>
          )}
        </div>  
      </nav>  
    </div>  
  );
}