import { useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "../services/supabase";
import { getWeekNumber, getWeekStartDate } from "../utils/dateUtils";
import { KM_RATES } from "../utils/kmRatesByCountry";
import { haversineKm, getLieuLabel } from "../utils/calculators";
import { computeStatutPaye, normalizeBilanForWrite } from "../lib/bilanEngine";

// Rétro-compatibilité : normalizeBilanRow est désormais dans bilanEngine
export { normalizeBilanForWrite as normalizeBilanRow };

const fetchHistoricalWeather = async (dateIso, lat = 50.63, lon = 5.58) => {
  try {
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
  const [isRecalculatingKm, setIsRecalculatingKm] = useState(false);

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
    acompteConsommePeriode: 0,
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
      // date_mission en priorité, date_iso en fallback
      const mDate = m?.date_mission || m?.date_iso;
      if (!mDate) return;
      const d = new Date(mDate);
      if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
        periods.add(getWeekNumber(d));
      } else if (bilanPeriodType === PERIOD_TYPES.MOIS) {
        periods.add(mDate.substring(0, 7));
      } else if (bilanPeriodType === PERIOD_TYPES.ANNEE) {
        periods.add(mDate.substring(0, 4));
      }
    });
    const sorted = Array.from(periods).sort((a, b) => computePeriodeIndex(bilanPeriodType, b) - computePeriodeIndex(bilanPeriodType, a));
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
        // On prend la ligne la plus récente pour survivre aux éventuels doublons.
        const { data, error } = await supabase
          .from(TABLE)
          .select("paye, reste_a_percevoir")
          .eq("periode_type", bilanPeriodType)
          .eq("periode_value", bilanPeriodValue)
          .eq("patron_id", pId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) {
          console.error("STATUT_QUERY_ERROR", { pId, bilanPeriodType, bilanPeriodValue, error });
          throw error;
        }
        if (!data || data.length === 0) return false;
        const row = data[0] || {};
        const reste = parseFloat(row?.reste_a_percevoir ?? 0);
        return computeStatutPaye(row?.paye, reste);
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
    if (currentIndex < 2) return 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data, error } = await supabase
        .from(TABLE)
        .select("periode_index, paye, reste_a_percevoir")
        .eq("periode_type", PERIOD_TYPES.SEMAINE)
        .eq("patron_id", pId)
        .lt("periode_index", currentIndex)
        .or("paye.eq.false,reste_a_percevoir.gt.0");

      if (error) {
        console.error("BILANS_QUERY_ERROR", { scope: "impaye_precedent", patronId: pId, currentIndex, error });
        throw error;
      }

      const impayePrecedent = (data || []).reduce((sum, row) => {
        const reste = parseFloat(row?.reste_a_percevoir ?? 0);
        return sum + (reste > 0 ? reste : 0);
      }, 0);

      return impayePrecedent;
    } catch (err) {
      console.error("Erreur getImpayePrecedent:", err);
      return 0;
    }
  },
  []
);

  const getAcomptesUtilisesAvantPeriode = useCallback(
    async (weekNum, patronId = null) => {
      if (!weekNum) return 0;

      const pId = effectivePatronId(patronId);

      try {
        const { data, error } = await supabase
          .from("acompte_allocations")
          .select("amount")
          .eq("patron_id", pId)
          .lt("periode_index", parseInt(weekNum, 10));

        if (error) throw error;

        return (data || []).reduce((sum, row) => sum + (parseFloat(row?.amount) || 0), 0);
      } catch (err) {
        console.error("Erreur getAcomptesUtilisesAvantPeriode:", err);
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
          const payeNormalise = r?.paye === true && !(resteFixe > 0.01);
          return { ...r, patron_nom, paye: payeNormalise, reste_a_percevoir: resteFixe };
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
      if (bilanPeriodType === PERIOD_TYPES.SEMAINE && !getSoldeAvant) {
        triggerAlert?.("⚠️ getSoldeAvant manquant (useAcomptes).");
        return false;
      }

      try {
        const runPatronId = patronId ?? bilanContent.selectedPatronId ?? null;
        const pId = effectivePatronId(runPatronId);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          triggerAlert?.("Utilisateur non connecté.");
          return false;
        }

        // 1) Missions filtrées
        const filtered = getMissionsByPeriod(
          bilanPeriodType,
          bilanPeriodValue,
          runPatronId
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
          fraisFiltres = getFraisByWeek(parseInt(bilanPeriodValue, 10), runPatronId);
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
          triggerAlert?.(`⚠️ Aucune mission pour ${resolvePatronNom(runPatronId) || "ce patron"} en ${formatPeriodLabel(bilanPeriodValue)}`);
          setShowPeriodModal(false);
          setShowBilan(false);
          return false;
        }

        // 6) Impayé précédent
        let impayePrecedent = 0;
        if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
          impayePrecedent = await getImpayePrecedent(parseInt(bilanPeriodValue, 10), runPatronId);
        }

        // Variables résultats
        let resteCettePeriode = 0;
        let resteAPercevoir = 0;
        let soldeAvantPeriode = 0;
        let soldeApresPeriode = 0;
        let acompteConsomme = 0;
        let acompteConsommePeriode = 0;

        const acomptesDansPeriode =
          bilanPeriodType === PERIOD_TYPES.SEMAINE
            ? getAcomptesDansPeriode(debutPeriode, finPeriode, runPatronId)
            : 0;

if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
  const weekNum = parseInt(bilanPeriodValue, 10);
  
  // Total alloué POUR CETTE semaine uniquement (delta)
  const { data: allocsCetteSemaine, error: allocCetteSemaineError } = await supabase
    .from("acompte_allocations")
    .select("amount")
    .eq("patron_id", pId)
    .eq("periode_index", weekNum);  // ✅ Juste cette semaine

  if (allocCetteSemaineError) {
    console.error("ALLOC_QUERY_ERROR", { scope: "cette_semaine", patronId: pId, currentIndex: weekNum, error: allocCetteSemaineError });
  }

  const allocCetteSemaine = (allocsCetteSemaine || []).reduce(
    (sum, a) => sum + (parseFloat(a.amount) || 0), 
    0
  );

  // Total alloué JUSQU'À cette semaine (cumul pour solde global)
  const { data: allocsJusqua, error: allocJusquaError } = await supabase
    .from("acompte_allocations")
    .select("amount")
    .eq("patron_id", pId)
    .lte("periode_index", weekNum);

  if (allocJusquaError) {
    console.error("ALLOC_QUERY_ERROR", { scope: "jusqua", patronId: pId, currentIndex: weekNum, error: allocJusquaError });
  }

  const totalAlloueJusqua = (allocsJusqua || []).reduce(
    (sum, a) => sum + (parseFloat(a.amount) || 0), 
    0
  );

  // Total alloué AVANT cette semaine
  const { data: allocsAvant, error: allocAvantError } = await supabase
    .from("acompte_allocations")
    .select("amount")
    .eq("patron_id", pId)
    .lt("periode_index", weekNum);

  if (allocAvantError) {
    console.error("ALLOC_QUERY_ERROR", { scope: "avant", patronId: pId, currentIndex: weekNum, error: allocAvantError });
  }

  const totalAlloueAvant = (allocsAvant || []).reduce(
    (sum, a) => sum + (parseFloat(a.amount) || 0), 
    0
  );

  const periodStartIso = new Date(`${debutPeriode}T00:00:00`).toISOString();
  const periodEndExclusive = new Date(`${finPeriode}T00:00:00`);
  periodEndExclusive.setDate(periodEndExclusive.getDate() + 1);

  const { data: allocsCreatedInPeriod, error: allocPeriodError } = await supabase
    .from("acompte_allocations")
    .select("amount, created_at")
    .eq("patron_id", pId)
    .gte("created_at", periodStartIso)
    .lt("created_at", periodEndExclusive.toISOString());

  if (allocPeriodError) {
    console.error("ALLOC_QUERY_ERROR", { scope: "created_in_period", patronId: pId, currentIndex: weekNum, error: allocPeriodError });
  }

  acompteConsommePeriode = (allocsCreatedInPeriod || []).reduce(
    (sum, a) => sum + (parseFloat(a.amount) || 0),
    0
  );

  // Acomptes reçus
  const { data: acomptesCumulesRows, error: acomptesCumulesError } = await supabase
    .from("acomptes")
    .select("montant")
    .eq("patron_id", pId)
    .lte("date_acompte", finPeriode);

  if (acomptesCumulesError) {
    console.error("ACOMPTES_QUERY_ERROR", { scope: "cumules", patronId: pId, dateFin: finPeriode, error: acomptesCumulesError });
  }

  const { data: acomptesPeriodeRows, error: acomptesPeriodeError } = await supabase
    .from("acomptes")
    .select("montant")
    .eq("patron_id", pId)
    .gte("date_acompte", debutPeriode)
    .lte("date_acompte", finPeriode);

  if (acomptesPeriodeError) {
    console.error("ACOMPTES_QUERY_ERROR", { scope: "dans_periode", patronId: pId, debutPeriode, finPeriode, error: acomptesPeriodeError });
  }

  const acomptesCumules = (acomptesCumulesRows || []).reduce(
    (sum, a) => sum + (parseFloat(a.montant) || 0),
    0
  );
  const acomptesDansPeriode = (acomptesPeriodeRows || []).reduce(
    (sum, a) => sum + (parseFloat(a.montant) || 0),
    0
  );
  
  // ✅ acompteConsomme = ce qui a été alloué POUR CETTE semaine
  acompteConsomme = allocCetteSemaine;

  // Solde avant
  soldeAvantPeriode = Math.max(0, acomptesCumules - totalAlloueAvant - acomptesDansPeriode);
  
  // Solde après
  soldeApresPeriode = Math.max(0, acomptesCumules - totalAlloueJusqua);
  
  // ✅ Reste à percevoir = dette - acompte alloué POUR cette semaine
  const detteTotale = impayePrecedent + caBrutPeriode;
  resteCettePeriode = Math.max(0, detteTotale - acompteConsomme);
  resteAPercevoir = resteCettePeriode;

} else {
  // Mode mois/année (inchangé)
  soldeAvantPeriode = getSoldeAvant(debutPeriode, runPatronId);
  const acomptesDansPeriode = getAcomptesDansPeriode(debutPeriode, finPeriode, runPatronId);
  const acompteDisponible = soldeAvantPeriode + acomptesDansPeriode;
  acompteConsomme = Math.min(acompteDisponible, caBrutPeriode);
  resteCettePeriode = caBrutPeriode - acompteConsomme;
  resteAPercevoir = resteCettePeriode;
  soldeApresPeriode = acompteDisponible - acompteConsomme;
}

        // ✅ Si un acompte a été REÇU cette semaine, afficher son montant total
        // Sinon afficher 0 (même si des allocations d'acomptes précédents existent)
        const consommeCettePeriode = bilanPeriodType === PERIOD_TYPES.SEMAINE
          ? (acomptesDansPeriode > 0 ? acomptesDansPeriode : 0)
          : Math.max(0, (soldeAvantPeriode + acomptesDansPeriode) - soldeApresPeriode);

        // 7) Statut payé
        const statutPaye = await getStatutPaiement(runPatronId);

        // 8) Nom patron
        const selectedPatron = runPatronId ? patrons.find((p) => p.id === runPatronId) : null;
        const patronNom = selectedPatron ? selectedPatron.nom : "Tous les patrons (Global)";

        // 9) Météo
        let filteredWithWeather = filtered;
        if (bilanPeriodType === PERIOD_TYPES.SEMAINE && filtered.length > 0) {
          const uniqueDates = [...new Set(filtered.map((m) => m.date_iso))];
          const weatherCache = {};
          await Promise.all(
            uniqueDates.map(async (date) => {
              if (!weatherCache[date]) {
                const missionDuJour = filtered.find((m) => m.date_iso === date);
                const lieuById = missionDuJour && lieux.find((l) => l.id === missionDuJour.lieu_id);
                const lieuByName = !lieuById && missionDuJour?.lieu
                  ? lieux.find((l) => l.nom?.toLowerCase().trim() === missionDuJour.lieu?.toLowerCase().trim())
                  : null;
                const lieu = lieuById || lieuByName;
                const latLieu = Number(lieu?.latitude);
                const lngLieu = Number(lieu?.longitude);
                const weatherLat = Number.isFinite(latLieu) && Number.isFinite(lngLieu)
                  ? latLieu
                  : (domicileLatLng?.lat ?? 50.63);
                const weatherLon = Number.isFinite(latLieu) && Number.isFinite(lngLieu)
                  ? lngLieu
                  : (domicileLatLng?.lng ?? 5.58);
                weatherCache[date] = await fetchHistoricalWeather(date, weatherLat, weatherLon);
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
        // Use domicileLatLng state first, fall back to coords stored directly in kmSettings
        const effectiveDomicile = domicileLatLng ?? (
          Number.isFinite(kmSettings?.km_domicile_lat) && Number.isFinite(kmSettings?.km_domicile_lng)
            ? { lat: kmSettings.km_domicile_lat, lng: kmSettings.km_domicile_lng }
            : null
        );
        if (kmSettings?.km_enable === true && bilanPeriodType === PERIOD_TYPES.SEMAINE && effectiveDomicile?.lat && effectiveDomicile?.lng) {
          // Rate: AUTO uses table, CUSTOM uses km_rate_custom
          const kmRateEffectif = kmSettings.km_rate_mode === "CUSTOM"
            ? (parseFloat(kmSettings.km_rate) || 0)
            : (KM_RATES[kmSettings.km_country_code || "FR"] || 0.42);
          const multiplicateur = kmSettings.km_include_retour ? 2 : 1;

          filtered.forEach((m) => {
            // Lieu lookup: by id first, then by name (case-insensitive) as fallback
            const lieuById = lieux.find((l) => l.id === m.lieu_id);
            const lieuByName = !lieuById && m.lieu
              ? lieux.find((l) => l.nom?.toLowerCase().trim() === m.lieu?.toLowerCase().trim())
              : null;
            const lieu = lieuById || lieuByName;
            const latLieu = Number(lieu?.latitude);
            const lngLieu = Number(lieu?.longitude);
            if (Number.isFinite(latLieu) && Number.isFinite(lngLieu)) {
              // distance_km is in km (haversineKm returns km)
              const kmOneWay = haversineKm(effectiveDomicile.lat, effectiveDomicile.lng, latLieu, lngLieu);
              const kmTotal = kmOneWay * multiplicateur; // × 2 if aller-retour
              const amount = kmTotal * kmRateEffectif;   // no rounding: exact value stored
              // Ajoute le type entre parenthèses si ce n'est pas 'client'
              const typeLabel = lieu?.type && lieu.type !== 'client'
                ? ` (${lieu.type.toUpperCase()})`
                : '';
              fraisKm.items.push({
                missionId: m.id,
                date: m.date_iso,
                labelLieuOuClient: getLieuLabel(lieu, m) + typeLabel,
                kmOneWay, kmTotal, amount,   // exact, rounded only at display
              });
              fraisKm.totalKm += kmTotal;
              fraisKm.totalAmount += amount;
            } else {
              // Ajoute le type même si pas de GPS
              const typeLabel = lieu?.type && lieu.type !== 'client'
                ? ` (${lieu.type.toUpperCase()})`
                : '';
              fraisKm.items.push({
                missionId: m.id,
                date: m.date_iso,
                labelLieuOuClient: getLieuLabel(lieu, m) + typeLabel,
                kmOneWay: null,
                kmTotal: null,
                amount: null,
              });
            }
          });
          // totals kept exact; display layer applies rounding

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

          acompteConsommePeriode: bilanPeriodType === PERIOD_TYPES.SEMAINE ? acompteConsommePeriode : 0,
          totalAcomptes: bilanPeriodType === PERIOD_TYPES.SEMAINE ? consommeCettePeriode : 0,

          acomptesDansPeriode: bilanPeriodType === PERIOD_TYPES.SEMAINE ? acomptesDansPeriode : 0,
          resteCettePeriode,
          resteAPercevoir,
          impayePrecedent,
          soldeAcomptesAvant: soldeAvantPeriode,
          soldeAcomptesApres: soldeApresPeriode,
          selectedPatronId: runPatronId,
          selectedPatronNom: patronNom,
          fraisKilometriques: fraisKm,
          lieux,
        };

        // 11) Invariant paye<=>reste=0 : dériver l'état final avant tout write DB
        const periodeIndex = computePeriodeIndex(bilanPeriodType, bilanPeriodValue);
        const isPaid = computeStatutPaye(statutPaye, resteCettePeriode);

        // Forcer la cohérence UI : resteAPercevoir = resteCettePeriode = valeur nette finale
        if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
          const safeNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
          const resteNetFinal = safeNumber(resteCettePeriode);
          content.resteAPercevoir = resteNetFinal;
          content.resteCettePeriode = resteNetFinal;
        }

        setBilanContent(content);
        setBilanPaye(isPaid);
        setShowPeriodModal(false);
        setShowBilan(true);

        if (!isGlobalPatronId(patronId)) {
          const { data: existingBilan, error: lookupError } = await supabase
            .from(TABLE)
            .select("id")
            .eq("periode_type", bilanPeriodType)
            .eq("periode_value", bilanPeriodValue)
            .eq("patron_id", pId)
            .maybeSingle();

          if (lookupError) {
            triggerAlert?.("Erreur sauvegarde bilan.");
            return false;
          }

          if (!existingBilan?.id) {
            const { error: insertError } = await supabase
              .from(TABLE)
              .insert({
                user_id: user.id,
                periode_type: bilanPeriodType,
                periode_value: bilanPeriodValue,
                periode_index: periodeIndex,
                patron_id: pId,
                ca_brut_periode: caBrutPeriode,
                paye: false,
                date_paiement: null,
                acompte_consomme: 0,
                reste_a_percevoir: caBrutPeriode,
              });

            if (insertError) {
              triggerAlert?.("Erreur sauvegarde bilan.");
              return false;
            }
          } else {
            const { error: updateError } = await supabase
              .from(TABLE)
              .update({
                ca_brut_periode: caBrutPeriode,
                periode_index: periodeIndex,
                // Corrige les valeurs reste_a_percevoir périmées (ex: incluaient les frais KM par erreur)
                reste_a_percevoir: isPaid ? 0 : caBrutPeriode,
              })
              .eq("id", existingBilan.id);

            if (updateError) {
              triggerAlert?.("Erreur sauvegarde bilan.");
              return false;
            }
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
      getImpayePrecedent,
      getAcomptesUtilisesAvantPeriode,
      getTotalAcomptesJusqua,
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
      console.warn("autoPayerBilans est neutralisé: utiliser apply_acompte côté DB", { patronId, montantAcompte });
      triggerAlert?.("ℹ️ Auto-paiement front désactivé (source de vérité côté DB).");
      return false;
    },
    [triggerAlert]
  );

  const marquerCommePaye = useCallback(
    async (patronId = null) => {
      try {
        const pId = effectivePatronId(patronId);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Utilisateur non connecté");

        const periodeIndex = computePeriodeIndex(bilanPeriodType, bilanPeriodValue);
        const { data: existingBilan, error: lookupError } = await supabase
          .from(TABLE)
          .select("id, ca_brut_periode")
          .eq("periode_type", bilanPeriodType)
          .eq("periode_value", bilanPeriodValue)
          .eq("patron_id", pId)
          .maybeSingle();

        if (lookupError) throw lookupError;

        if (!existingBilan?.id) {
          const caBrutPeriode = Number(bilanContent.totalE) || 0;
          const { error: insertError } = await supabase.from(TABLE).insert({
            user_id: user.id,
            periode_type: bilanPeriodType,
            periode_value: bilanPeriodValue,
            periode_index: periodeIndex,
            patron_id: pId,
            ca_brut_periode: caBrutPeriode,
            paye: true,
            date_paiement: new Date().toISOString(),
            reste_a_percevoir: 0,
            acompte_consomme: 0,
          });

          if (insertError) throw insertError;
        } else {
          const { error: updateError } = await supabase
            .from(TABLE)
            .update({
              paye: true,
              date_paiement: new Date().toISOString(),
              reste_a_percevoir: 0,
            })
            .eq("id", existingBilan.id);

          if (updateError) throw updateError;
        }

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

  const recalculerFraisKm = useCallback(
    async (patronId = null) => {
      if (!bilanPeriodValue) { triggerAlert?.("Sélectionnez une période."); return; }

      const effectiveDomicile = domicileLatLng ?? (
        Number.isFinite(kmSettings?.km_domicile_lat) && Number.isFinite(kmSettings?.km_domicile_lng)
          ? { lat: kmSettings.km_domicile_lat, lng: kmSettings.km_domicile_lng }
          : null
      );
      if (!effectiveDomicile?.lat || !effectiveDomicile?.lng) {
        triggerAlert?.("🚗 Domicile non configuré. Vérifiez Paramètres → Km.");
        return;
      }

      const missionsList = bilanContent.filteredData;
      if (!missionsList || missionsList.length === 0) {
        triggerAlert?.("Aucune mission pour cette période.");
        return;
      }

      try {
        setIsRecalculatingKm(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { triggerAlert?.("Utilisateur non connecté."); return; }

        const kmRateEffectif = kmSettings.km_rate_mode === "CUSTOM"
          ? (parseFloat(kmSettings.km_rate) || 0)
          : (KM_RATES[kmSettings.km_country_code || "FR"] || 0.42); // 0.42 €/km: default FR rate
        const multiplicateur = kmSettings.km_include_retour ? 2 : 1;
        const countryCode = kmSettings.km_country_code || "FR";

        const rows = [];
        missionsList.forEach((m) => {
          const lieuById = lieux.find((l) => l.id === m.lieu_id);
          const lieuByName = !lieuById && m.lieu
            ? lieux.find((l) => l.nom?.toLowerCase().trim() === m.lieu?.toLowerCase().trim())
            : null;
          const lieu = lieuById || lieuByName;
          const latLieu = Number(lieu?.latitude);
          const lngLieu = Number(lieu?.longitude);
          if (Number.isFinite(latLieu) && Number.isFinite(lngLieu)) {
            const kmOneWay = haversineKm(effectiveDomicile.lat, effectiveDomicile.lng, latLieu, lngLieu);
            const distanceKm = kmOneWay * multiplicateur;
            const amount = distanceKm * kmRateEffectif;
            rows.push({
              user_id: user.id,
              patron_id: m.patron_id || null,
              mission_id: m.id,
              date_frais: m.date_iso,
              country_code: countryCode,
              distance_km: distanceKm,
              rate_per_km: kmRateEffectif,
              amount,
              source: "auto",
            });
          }
        });

        if (rows.length === 0) {
          triggerAlert?.("🚗 Aucun lieu géocodé — coordonnées GPS manquantes pour les lieux de mission.");
          return;
        }

        const { error } = await supabase
          .from("frais_km")
          .upsert(rows, { onConflict: "mission_id" });
        if (error) throw error;

        triggerAlert?.(`✅ ${rows.length} ligne(s) km recalculée(s)`);
        await genererBilan(patronId);
      } catch (err) {
        console.error("❌ Erreur recalcul frais_km:", err);
        triggerAlert?.("Erreur lors du recalcul des frais km.");
      } finally {
        setIsRecalculatingKm(false);
      }
    },
    [bilanPeriodValue, bilanContent.filteredData, kmSettings, domicileLatLng, lieux, triggerAlert, genererBilan]
  );

  /**
   * Reconstruit les bilans en DB pour une plage de semaines.
   * Calcule dans l'ordre croissant pour respecter la règle glissante N-1.
   */
  const rebuildBilans = useCallback(
    async (patronId, startWeek, endWeek) => {
      const pId = effectivePatronId(patronId);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, message: "Utilisateur non connecté" };

        let rebuilt = 0;

        for (let weekNum = startWeek; weekNum <= endWeek; weekNum++) {
          // Missions de la semaine
          const filtered = getMissionsByPeriod(PERIOD_TYPES.SEMAINE, String(weekNum), patronId);
          const totalMissions = filtered.reduce((sum, m) => sum + (m.montant || 0), 0);

          // Frais divers de la semaine
          const fraisFiltres = getFraisByWeek(weekNum, patronId);
          const totalFrais = getTotalFrais(fraisFiltres);

          const caBrutPeriode = totalMissions + totalFrais;

          // Impayé précédent (règle glissante N-1)
          const impayePrecedent = await getImpayePrecedent(weekNum, patronId);

          const { data: existingBilan, error: lookupError } = await supabase
            .from(TABLE)
            .select("id")
            .eq("periode_type", PERIOD_TYPES.SEMAINE)
            .eq("periode_value", String(weekNum))
            .eq("patron_id", pId)
            .maybeSingle();

          if (lookupError) throw lookupError;

          if (!existingBilan?.id) {
            const { error: insertError } = await supabase.from(TABLE).insert({
              user_id: user.id,
              periode_type: PERIOD_TYPES.SEMAINE,
              periode_value: String(weekNum),
              periode_index: weekNum,
              patron_id: pId,
              ca_brut_periode: caBrutPeriode,
              paye: false,
              date_paiement: null,
              acompte_consomme: 0,
              reste_a_percevoir: caBrutPeriode,
            });

            if (insertError) throw insertError;
          } else {
            const { error: updateError } = await supabase
              .from(TABLE)
              .update({
                ca_brut_periode: caBrutPeriode,
                periode_index: weekNum,
              })
              .eq("id", existingBilan.id);

            if (updateError) throw updateError;
          }

          rebuilt++;
        }

        return { success: true, message: `${rebuilt} semaine(s) reconstruite(s) (S${startWeek}→S${endWeek})` };
      } catch (err) {
        console.error("❌ Erreur rebuildBilans:", err);
        return { success: false, message: err?.message || "Erreur rebuild" };
      }
    },
    [getMissionsByPeriod, getFraisByWeek, getTotalFrais, getImpayePrecedent]
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
    recalculerFraisKm,
    isRecalculatingKm,
    rebuildBilans,
  };
}
