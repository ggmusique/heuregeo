import { useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "../services/supabase";
import { getWeekNumber, getWeekStartDate } from "../utils/dateUtils";
import { KM_RATES } from "../utils/kmRatesByCountry";
import { haversineKm } from "../utils/calculators";

const fetchHistoricalWeather = async (dateIso) => {
  try {
    const lat = 50.63;
    const lon = 5.58;
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${dateIso}&end_date=${dateIso}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe/Paris`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Erreur API météo");
    const data = await res.json();
    if (data.daily && data.daily.time.length > 0) {
      const code = data.daily.weathercode[0];
      let icon = "01d";
      let desc = "Ensoleillé";
      if (code >= 61 && code <= 67) { icon = "09d"; desc = "Pluie"; }
      else if (code >= 71 && code <= 77) { icon = "13d"; desc = "Neige"; }
      else if (code >= 80 && code <= 86) { icon = "09d"; desc = "Averses"; }
      else if (code >= 95) { icon = "11d"; desc = "Orage"; }
      else if (code >= 2 && code <= 3) { icon = "02d"; desc = "Nuageux"; }
      return {
        tempMax: Math.round(data.daily.temperature_2m_max[0]),
        tempMin: Math.round(data.daily.temperature_2m_min[0]),
        icon,
        desc,
      };
    }
    return null;
  } catch {
    return null;
  }
};

const GLOBAL_PATRON_ID = "00000000-0000-0000-0000-000000000000";
const TABLE = "bilans_status_v2";

export function useBilan({
  missions,
  fraisDivers,
  patrons = [],
  getMissionsByWeek,
  getMissionsByPeriod,
  getFraisByWeek,
  getTotalFrais,
  getSoldeAvant,
  getAcomptesDansPeriode,
  getTotalAcomptesJusqua,
  triggerAlert,
  kmSettings = null,
  domicileLatLng = null,
  lieux = [],
}) {
  const [showBilan, setShowBilan] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [bilanPeriodType, setBilanPeriodType] = useState("semaine");
  const [bilanPeriodValue, setBilanPeriodValue] = useState("");
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [bilanPaye, setBilanPaye] = useState(false);

  const [bilanContent, setBilanContent] = useState({
    titre: "",
    totalE: 0,
    totalH: 0,
    filteredData: [],
    groupedData: [],
    totalFrais: 0,
    fraisDivers: [],
    impayePrecedent: 0,
    resteCettePeriode: 0,
    resteAPercevoir: 0,
    soldeAcomptesAvant: 0,
    soldeAcomptesApres: 0,
    acomptesDansPeriode: 0,
    totalAcomptes: 0,
    selectedPatronId: null,
    selectedPatronNom: "Tous les patrons (Global)",
    fraisKilometriques: { items: [], totalKm: 0, totalAmount: 0 },
  });

  useEffect(() => {
    if (showBilan && bilanPeriodValue) {
      genererBilan(bilanContent.selectedPatronId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bilanPeriodValue]);

  const PERIOD_TYPES = {
    SEMAINE: "semaine",
    MOIS: "mois",
    ANNEE: "annee",
  };

  const effectivePatronId = (patronId) =>
    patronId ? patronId : GLOBAL_PATRON_ID;

  const isGlobalPatronId = (patronId) =>
    !patronId || patronId === GLOBAL_PATRON_ID;

  const resolvePatronNom = (patronId) => {
    if (isGlobalPatronId(patronId)) return "Global";
    const p = patrons.find((x) => x.id === patronId);
    return p?.nom || "Inconnu";
  };

  const computePeriodeIndex = (type, value) => {
    const v = value?.toString?.() ?? "";
    if (!v) return 0;
    if (type === PERIOD_TYPES.SEMAINE) return parseInt(v, 10) || 0;
    if (type === PERIOD_TYPES.ANNEE) return parseInt(v, 10) || 0;
    if (type === PERIOD_TYPES.MOIS) return parseInt(v.replace("-", ""), 10) || 0;
    return 0;
  };

  const formatPeriodLabel = useCallback(
    (val) => {
      if (!val) return "";
      const sVal = val.toString();
      if (bilanPeriodType === PERIOD_TYPES.SEMAINE) return `Semaine ${sVal}`;
      if (bilanPeriodType === PERIOD_TYPES.MOIS && sVal.includes("-")) {
        const [y, m] = sVal.split("-");
        return new Date(y, m - 1)
          .toLocaleString("fr-FR", { month: "long", year: "numeric" })
          .toUpperCase();
      }
      return sVal;
    },
    [bilanPeriodType]
  );

  const calculerPeriodesDisponibles = useCallback(() => {
    const periods = new Set();
    missions.forEach((m) => {
      if (!m?.date_iso) return;
      const d = new Date(m.date_iso);
      if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
        periods.add(getWeekNumber(d));
      } else if (bilanPeriodType === PERIOD_TYPES.MOIS) {
        periods.add(m.date_iso.substring(0, 7));
      } else if (bilanPeriodType === PERIOD_TYPES.ANNEE) {
        periods.add(m.date_iso.substring(0, 4));
      }
    });
    const sorted = Array.from(periods).sort().reverse();
    setAvailablePeriods(sorted);
    if (sorted.length > 0) {
      setBilanPeriodValue(sorted[0].toString());
    }
  }, [missions, bilanPeriodType]);

  const getStatutPaiement = useCallback(
    async (patronId = null) => {
      const pId = effectivePatronId(patronId);
  
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        // ✅ Le statut payé est partagé par période/patron.
        // On ne filtre donc pas par user_id pour éviter les écrasements
        // lors d'un changement de rôle (viewer <-> owner).
        let query = supabase
          .from(TABLE)
          .select("paye")
          .eq("periode_type", bilanPeriodType)
          .eq("periode_value", bilanPeriodValue)
          .eq("patron_id", pId);
  
        const { data, error } = await query.maybeSingle();
  
        if (error) throw error;
        return data?.paye || false;
      } catch (err) {
        console.error("Erreur getStatutPaiement:", err);
        return false;
      }
    },
    [bilanPeriodType, bilanPeriodValue]
  );

  const getImpayePrecedent = useCallback(
    async (currentWeek, patronId = null) => {
      const pId = effectivePatronId(patronId);
      const currentIndex = parseInt(currentWeek, 10) || 0;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 0;

        let query = supabase
          .from(TABLE)
          .select("periode_index, ca_brut_periode, acompte_consomme")
          .eq("periode_type", PERIOD_TYPES.SEMAINE)
          .eq("patron_id", pId)
          .eq("paye", false)
          .lt("periode_index", currentIndex)
          .order("periode_index", { ascending: true });

        const { data, error } = await query;
  
        if (error) throw error;
  
        // ✅ Impayé = somme de (CA brut - acompte consommé) par semaine
        const total = (data || []).reduce((sum, row) => {
          const ca = parseFloat(row?.ca_brut_periode ?? 0);
          const acompte = parseFloat(row?.acompte_consomme ?? 0);
          const reste = Math.max(0, ca - acompte);
          return sum + reste;
        }, 0);
  
        return total;
      } catch {
        return 0;
      }
    },
    []
  );

  const fetchHistoriqueBilans = useCallback(
    async (patronId = null) => {
      const pId = effectivePatronId(patronId);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { impayes: [], payes: [], all: [] };
        let query = supabase
          .from(TABLE)
          .select("id, periode_type, periode_value, periode_index, patron_id, paye, date_paiement, reste_a_percevoir, ca_brut_periode, acompte_consomme, created_at")
          .eq("patron_id", pId)
          .eq("periode_type", "semaine")
          .order("periode_index", { ascending: false });
        const { data, error } = await query;
        if (error) throw error;
        const rows = (data || []).map((r) => {
          const patron_nom = resolvePatronNom(r.patron_id);
          let resteFixe = r.reste_a_percevoir ?? 0;
          if (r.periode_type === "semaine") {
            resteFixe = parseFloat(r?.reste_a_percevoir ?? 0);
          }
          return { ...r, patron_nom, reste_a_percevoir: resteFixe };
        });
        const impayes = rows
          .filter((r) => r.paye === false)
          .sort((a, b) => Number(b.periode_value) - Number(a.periode_value));
        const payes = rows
          .filter((r) => r.paye === true)
          .sort((a, b) => Number(b.periode_value) - Number(a.periode_value));
        return { impayes, payes, all: rows };
      } catch {
        triggerAlert?.("Erreur chargement historique");
        return { impayes: [], payes: [], all: [] };
      }
    },
    [patrons, triggerAlert]
  );

  const genererBilan = useCallback(
    async (patronId = null, clientId = null) => {
      if (!bilanPeriodValue) {
        triggerAlert?.("Sélectionnez une période.");
        return false;
      }
      if (bilanPeriodType === PERIOD_TYPES.SEMAINE && !getTotalAcomptesJusqua) {
        triggerAlert?.("⚠️ getTotalAcomptesJusqua manquant (useAcomptes).");
        return false;
      }

      try {
        const pId = effectivePatronId(patronId);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          triggerAlert?.("Utilisateur non connecté.");
          return false;
        }

        // 1) Missions filtrées
        const filtered = getMissionsByPeriod(
          bilanPeriodType,
          bilanPeriodValue,
          patronId
        ).filter((m) => !clientId || m.client_id === clientId)
          .sort((a, b) => new Date(a.date_iso) - new Date(b.date_iso));

        const totalMissions = filtered.reduce((sum, m) => sum + (m.montant || 0), 0);
        const totalH = filtered.reduce((sum, m) => sum + (m.duree || 0), 0);

        // 2) Groupements (MOIS/ANNEE)
        let groupedData = [];
        if (bilanPeriodType === PERIOD_TYPES.MOIS && filtered.length > 0) {
          const weekMap = new Map();
          filtered.forEach((m) => {
            const weekNum = getWeekNumber(new Date(m.date_iso));
            if (!weekMap.has(weekNum)) {
              weekMap.set(weekNum, { weekNumber: weekNum, totalHeures: 0, totalMontant: 0, missions: [] });
            }
            const week = weekMap.get(weekNum);
            week.totalHeures += m.duree || 0;
            week.totalMontant += m.montant || 0;
            week.missions.push(m);
          });
          groupedData = Array.from(weekMap.values())
            .sort((a, b) => a.weekNumber - b.weekNumber)
            .map((week) => ({
              label: `Semaine ${week.weekNumber}`,
              h: week.totalHeures,
              e: week.totalMontant,
              missions: week.missions,
            }));
        }
        if (bilanPeriodType === PERIOD_TYPES.ANNEE && filtered.length > 0) {
          const monthMap = new Map();
          filtered.forEach((m) => {
            const monthKey = m.date_iso.substring(0, 7);
            if (!monthMap.has(monthKey)) {
              monthMap.set(monthKey, { monthKey, totalHeures: 0, totalMontant: 0, missions: [] });
            }
            const month = monthMap.get(monthKey);
            month.totalHeures += m.duree || 0;
            month.totalMontant += m.montant || 0;
            month.missions.push(m);
          });
          groupedData = Array.from(monthMap.values())
            .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
            .map((month) => {
              const [year, monthNum] = month.monthKey.split("-");
              const monthLabel = new Date(year, parseInt(monthNum) - 1)
                .toLocaleString("fr-FR", { month: "long" })
                .toUpperCase();
              return { label: monthLabel, h: month.totalHeures, e: month.totalMontant, missions: month.missions };
            });
        }

        // 3) Frais
        let fraisFiltres = [];
        if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
          fraisFiltres = getFraisByWeek(parseInt(bilanPeriodValue, 10), patronId);
        }
        const totalFrais = getTotalFrais(fraisFiltres);

        // 4) Dates début/fin
        let debutPeriode = "";
        let finPeriode = "";
        if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
          const weekNum = parseInt(bilanPeriodValue, 10);
          const year = new Date().getFullYear();
          debutPeriode = getWeekStartDate(weekNum, year);
          const finDate = new Date(debutPeriode);
          finDate.setDate(finDate.getDate() + 6);
          finPeriode = finDate.toISOString().split("T")[0];
        } else if (bilanPeriodType === PERIOD_TYPES.MOIS) {
          debutPeriode = `${bilanPeriodValue}-01`;
          const [year, month] = bilanPeriodValue.split("-").map(Number);
          const last = new Date(year, month, 0);
          finPeriode = last.toISOString().split("T")[0];
        } else {
          debutPeriode = `${bilanPeriodValue}-01-01`;
          finPeriode = `${bilanPeriodValue}-12-31`;
        }

        // 5) CA brut
        const caBrutPeriode = totalMissions + totalFrais;

        if (caBrutPeriode === 0 && filtered.length === 0) {
          triggerAlert?.(`⚠️ Aucune mission pour ${resolvePatronNom(patronId) || "ce patron"} en ${formatPeriodLabel(bilanPeriodValue)}`);
          setShowPeriodModal(false);
          setShowBilan(false);
          return false;
        }

        // 6) Impayé précédent
        let impayePrecedent = 0;
        if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
          impayePrecedent = await getImpayePrecedent(parseInt(bilanPeriodValue, 10), patronId);
        }

        // Variables résultats
        let resteCettePeriode = 0;
        let resteAPercevoir = 0;
        let soldeAvantPeriode = 0;
        let soldeApresPeriode = 0;
        let acompteConsomme = 0;
        let acompteConsommeAffiche = 0; // ✅ total affiché (inclut semaines précédentes)

        const acomptesDansPeriode =
          bilanPeriodType === PERIOD_TYPES.SEMAINE
            ? getAcomptesDansPeriode(debutPeriode, finPeriode, patronId)
            : 0;

        if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
          const acomptesCumules = getTotalAcomptesJusqua(finPeriode, patronId);

          // Somme des acompte_consomme des bilans précédents sauvegardés
          let acomptesDejaUtilises = 0;
          try {

            let bilansPrecedentsQuery = supabase
              .from(TABLE)
              .select("acompte_consomme")
              .eq("patron_id", pId)
              .eq("periode_type", "semaine")
              .lt("periode_index", parseInt(bilanPeriodValue, 10));

            const { data: bilansPrecedents } = await bilansPrecedentsQuery;

            if (bilansPrecedents) {
              acomptesDejaUtilises = bilansPrecedents.reduce((sum, b) => {
                return sum + (parseFloat(b.acompte_consomme) || 0);
              }, 0);
            }
          } catch (err) {
            console.error("Erreur calcul acomptes utilisés:", err);
          }

          // Acomptes disponibles pour cette semaine
          const acomptesDisponibles = Math.max(0, acomptesCumules - acomptesDejaUtilises);

          // Solde avant = acompte dispo AVANT les acomptes reçus cette période
          const acomptesAvantPeriode = getTotalAcomptesJusqua(debutPeriode, patronId);
          soldeAvantPeriode = Math.max(0, acomptesAvantPeriode - acomptesDejaUtilises);

          console.log("💰 DEBUG ACOMPTES", {
            acomptesCumules,
            acomptesDejaUtilises,
            acomptesDisponibles,
            soldeAvantPeriode,
            caBrutPeriode,
            impayePrecedent,
          });

          // Consommé cette période uniquement (sauvegardé en BDD)
          acompteConsomme = Math.min(caBrutPeriode, acomptesDisponibles);

          // ✅ Consommé AFFICHÉ = tout ce qui a été utilisé jusqu'ici
          acompteConsommeAffiche = acomptesDejaUtilises + acompteConsomme;

          // Solde à reporter
          soldeApresPeriode = Math.max(0, acomptesCumules - acompteConsommeAffiche);

          // Reste à percevoir = CA + impayés - acompte dispo cette période
          resteAPercevoir = Math.max(0, caBrutPeriode + impayePrecedent - acompteConsomme);
          resteCettePeriode = resteAPercevoir;

        } else {
          // Mode mois/année
          soldeAvantPeriode = getSoldeAvant(debutPeriode, patronId);
          const acompteDisponible = soldeAvantPeriode + acomptesDansPeriode;
          acompteConsomme = Math.min(acompteDisponible, caBrutPeriode);
          resteCettePeriode = caBrutPeriode - acompteConsomme;
          resteAPercevoir = resteCettePeriode;
          soldeApresPeriode = acompteDisponible - acompteConsomme;
          acompteConsommeAffiche = acompteConsomme;
        }

        // 7) Statut payé
        const statutPaye = await getStatutPaiement(patronId);

        // 8) Nom patron
        const selectedPatron = patronId ? patrons.find((p) => p.id === patronId) : null;
        const patronNom = selectedPatron ? selectedPatron.nom : "Tous les patrons (Global)";

        // 9) Météo
        let filteredWithWeather = filtered;
        if (bilanPeriodType === PERIOD_TYPES.SEMAINE && filtered.length > 0) {
          const uniqueDates = [...new Set(filtered.map((m) => m.date_iso))];
          const weatherCache = {};
          await Promise.all(
            uniqueDates.map(async (date) => {
              if (!weatherCache[date]) {
                weatherCache[date] = await fetchHistoricalWeather(date);
              }
            })
          );
          filteredWithWeather = filtered.map((m) => ({
            ...m,
            weather: weatherCache[m.date_iso],
          }));
        }

        // 10) Objet final UI
        // Frais kilométriques
        let fraisKm = { items: [], totalKm: 0, totalAmount: 0 };
        if (kmSettings?.km_enable && bilanPeriodType === PERIOD_TYPES.SEMAINE && domicileLatLng?.lat && domicileLatLng?.lng) {
          const kmRateEffectif = kmSettings.km_rate_mode === "CUSTOM"
            ? (parseFloat(kmSettings.km_rate) || 0)
            : (KM_RATES[kmSettings.km_country_code || "FR"] || 0.42);
          const multiplicateur = kmSettings.km_include_retour ? 2 : 1;

          filtered.forEach((m) => {
            const lieu = lieux.find((l) => l.id === m.lieu_id);
            if (lieu?.latitude && lieu?.longitude) {
              const kmOneWay = haversineKm(domicileLatLng.lat, domicileLatLng.lng, lieu.latitude, lieu.longitude);
              const kmTotal = kmOneWay * multiplicateur;
              const amount = kmTotal * kmRateEffectif;
              fraisKm.items.push({
                missionId: m.id,
                date: m.date_iso,
                labelLieuOuClient: lieu.nom || m.client || "",
                kmOneWay: Math.round(kmOneWay * 10) / 10,
                kmTotal: Math.round(kmTotal * 10) / 10,
                amount: Math.round(amount * 100) / 100,
              });
              fraisKm.totalKm += kmTotal;
              fraisKm.totalAmount += amount;
            } else {
              fraisKm.items.push({
                missionId: m.id,
                date: m.date_iso,
                labelLieuOuClient: lieu?.nom || m.client || "",
                kmOneWay: null,
                kmTotal: null,
                amount: null,
              });
            }
          });
          fraisKm.totalKm = Math.round(fraisKm.totalKm * 10) / 10;
          fraisKm.totalAmount = Math.round(fraisKm.totalAmount * 100) / 100;

          resteAPercevoir = Math.max(0, resteAPercevoir + fraisKm.totalAmount);
          resteCettePeriode = resteAPercevoir;
        }

        const content = {
          titre: formatPeriodLabel(bilanPeriodValue),
          totalE: caBrutPeriode,
          totalH,
          filteredData: filteredWithWeather,
          groupedData,
          totalFrais: bilanPeriodType === PERIOD_TYPES.SEMAINE ? totalFrais : 0,
          fraisDivers: bilanPeriodType === PERIOD_TYPES.SEMAINE ? fraisFiltres : [],

         // ✅ N'afficher le bloc que si un acompte a été consommé sur CETTE période
totalAcomptes: bilanPeriodType === PERIOD_TYPES.SEMAINE && acompteConsomme > 0 
? acompteConsommeAffiche 
: 0,

          acomptesDansPeriode: bilanPeriodType === PERIOD_TYPES.SEMAINE ? acomptesDansPeriode : 0,
          resteCettePeriode,
          resteAPercevoir,
          impayePrecedent,
          soldeAcomptesAvant: soldeAvantPeriode,
          soldeAcomptesApres: soldeApresPeriode,
          selectedPatronId: patronId,
          selectedPatronNom: patronNom,
          fraisKilometriques: fraisKm,
        };

        setBilanContent(content);
        setBilanPaye(statutPaye);
        setShowPeriodModal(false);
        setShowBilan(true);
        
        

        // 11) Sauvegarde Supabase
        const periodeIndex = computePeriodeIndex(bilanPeriodType, bilanPeriodValue);
        const { data: bilanExistant } = await supabase
          .from(TABLE)
          .select("acompte_consomme, paye")
          .eq("periode_type", bilanPeriodType)
          .eq("periode_value", bilanPeriodValue)
          .eq("patron_id", pId)
          .maybeSingle();

        const dataToSave = {
          user_id: user.id,
          periode_type: bilanPeriodType,
          periode_value: bilanPeriodValue,
          periode_index: periodeIndex,
          patron_id: pId,
          paye: statutPaye,
          date_paiement: statutPaye ? new Date().toISOString() : null,
          reste_a_percevoir: resteCettePeriode,
          ca_brut_periode: caBrutPeriode,
          // ✅ Sauvegarde le petit acompteConsomme (cette période uniquement)
          acompte_consomme: (bilanExistant?.acompte_consomme > 0)
            ? bilanExistant.acompte_consomme
            : (bilanPeriodType === PERIOD_TYPES.SEMAINE ? acompteConsomme : 0),
        };

        if (!isGlobalPatronId(patronId)) {
          const { error: upsertError } = await supabase.from(TABLE).upsert(dataToSave, {
            onConflict: "periode_type,periode_value,patron_id",
          });
          if (upsertError) {
            triggerAlert?.("Erreur sauvegarde bilan.");
          }
        }

      } catch (err) {
        console.error("❌ ERREUR GENERATION BILAN:", err);
        triggerAlert?.("Erreur lors de la génération du bilan.");
        return false;
      }
    },
    [
      bilanPeriodValue,
      bilanPeriodType,
      getMissionsByPeriod,
      getFraisByWeek,
      getTotalFrais,
      getSoldeAvant,
      getAcomptesDansPeriode,
      getTotalAcomptesJusqua,
      getImpayePrecedent,
      getStatutPaiement,
      formatPeriodLabel,
      triggerAlert,
      patrons,
      kmSettings,
      domicileLatLng,
      lieux,
    ]
  );

  const autoPayerBilans = useCallback(
    async (patronId, montantAcompte) => {
      try {
        const pId = effectivePatronId(patronId);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        console.log("🔵 AUTO-PAIEMENT DÉMARRÉ", { patronId: pId, montantAcompte });

        const { data: bilansImpayes, error } = await supabase
          .from(TABLE)
          .select("*")
          .eq("patron_id", pId)
          .eq("periode_type", "semaine")
          .eq("paye", false)
          .order("periode_index", { ascending: true });

        if (error) throw error;
        console.log("🟡 Bilans impayés trouvés:", bilansImpayes);

        if (!bilansImpayes || bilansImpayes.length === 0) {
          console.log("⚠️ Aucun bilan impayé trouvé");
          return true;
        }

        let resteAcompte = montantAcompte;

        for (const bilan of bilansImpayes) {
          if (resteAcompte <= 0) break;

          const caBrut = parseFloat(bilan.ca_brut_periode || 0);
          const acompteDejaConsomme = parseFloat(bilan.acompte_consomme || 0);
          const resteDu = Math.max(0, caBrut - acompteDejaConsomme);

          if (resteDu <= 0) continue;

          if (resteAcompte >= resteDu) {
            await supabase.from(TABLE).update({
              paye: true,
              date_paiement: new Date().toISOString(),
              acompte_consomme: caBrut,
              reste_a_percevoir: 0,
            }).eq("id", bilan.id);
            resteAcompte -= resteDu;
          } else {
            const nouvelAcompteConsomme = acompteDejaConsomme + resteAcompte;
            await supabase.from(TABLE).update({
              acompte_consomme: nouvelAcompteConsomme,
              reste_a_percevoir: caBrut - nouvelAcompteConsomme,
            }).eq("id", bilan.id);
            resteAcompte = 0;
            break;
          }
        }

        console.log("✅ AUTO-PAIEMENT TERMINÉ");
        return true;
      } catch (err) {
        console.error("❌ Erreur auto-paiement bilans:", err);
        triggerAlert?.("⚠️ Erreur lors de la mise à jour automatique des bilans");
        return false;
      }
    },
    [triggerAlert]
  );

  const marquerCommePaye = useCallback(
    async (patronId = null) => {
      try {
        const pId = effectivePatronId(patronId);
        const reste = bilanContent.resteCettePeriode || 0;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Utilisateur non connecté");

        const dataToSave = {
          user_id: user.id,
          periode_type: bilanPeriodType,
          periode_value: bilanPeriodValue,
          periode_index: computePeriodeIndex(bilanPeriodType, bilanPeriodValue),
          patron_id: pId,
          paye: true,
          date_paiement: new Date().toISOString(),
          reste_a_percevoir: reste,
          ca_brut_periode: bilanContent.totalE || 0,
          acompte_consomme: bilanContent.totalAcomptes || 0,
        };

        const { error } = await supabase.from(TABLE).upsert(dataToSave, {
          onConflict: "periode_type,periode_value,patron_id",
        });
        if (error) throw error;

        setBilanPaye(true);
        triggerAlert?.("✅ Marqué comme payé !");
        return true;
      } catch {
        triggerAlert?.("Erreur : opération échouée");
        return false;
      }
    },
    [bilanPeriodType, bilanPeriodValue, bilanContent, triggerAlert]
  );

  const gotoPreviousWeek = useCallback(() => {
    const currentIndex = availablePeriods.indexOf(bilanPeriodValue);
    if (currentIndex < availablePeriods.length - 1) {
      setBilanPeriodValue(availablePeriods[currentIndex + 1]);
    }
  }, [availablePeriods, bilanPeriodValue]);

  const gotoNextWeek = useCallback(() => {
    const currentIndex = availablePeriods.indexOf(bilanPeriodValue);
    if (currentIndex > 0) {
      setBilanPeriodValue(availablePeriods[currentIndex - 1]);
    }
  }, [availablePeriods, bilanPeriodValue]);

  const hasPreviousWeek = useMemo(() => {
    const currentIndex = availablePeriods.indexOf(bilanPeriodValue);
    return currentIndex < availablePeriods.length - 1;
  }, [availablePeriods, bilanPeriodValue]);

  const hasNextWeek = useMemo(() => {
    const currentIndex = availablePeriods.indexOf(bilanPeriodValue);
    return currentIndex > 0;
  }, [availablePeriods, bilanPeriodValue]);

  const handleWeekChange = useCallback((newValue) => {
    setBilanPeriodValue(newValue);
  }, []);

  return {
    showBilan,
    setShowBilan,
    showPeriodModal,
    setShowPeriodModal,
    bilanPeriodType,
    setBilanPeriodType,
    bilanPeriodValue,
    setBilanPeriodValue,
    availablePeriods,
    bilanPaye,
    bilanContent,
    formatPeriodLabel,
    calculerPeriodesDisponibles,
    genererBilan,
    marquerCommePaye,
    autoPayerBilans,
    fetchHistoriqueBilans,
    gotoPreviousWeek,
    gotoNextWeek,
    hasPreviousWeek,
    hasNextWeek,
    handleWeekChange,
  };
}
