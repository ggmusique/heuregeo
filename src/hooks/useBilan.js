import { useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "../services/supabase";
import { getCurrentUserOrNull } from "../services/authService";
import { getWeekNumber, getWeekStartDate } from "../utils/dateUtils";
import { KM_RATES } from "../utils/kmRatesByCountry";
import { haversineKm, getLieuLabel } from "../utils/calculators";
import { computeStatutPaye, computeImpayePrecedent, normalizeBilanForWrite } from "../lib/bilanEngine";
import { fetchHistoricalWeather } from "../services/weatherService";
import { fetchLatestBilanStatus, fetchWeeklyBilansHistory, fetchAcompteAllocationsByPatron, fetchUnpaidWeeklyBilansBefore, fetchAcompteAllocationsBefore, fetchAcompteAmountsBefore } from "../services/bilanRepository";
import { buildAllocByWeek, normalizeHistoriqueRows, splitHistoriqueRows } from "../lib/bilanHistory";
import { PERIOD_TYPES } from "../constants/bilanPeriods";

export { normalizeBilanForWrite as normalizeBilanRow };

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
        const user = await getCurrentUserOrNull();
        if (!user) return false;
        const row = await fetchLatestBilanStatus({
          periodeType: bilanPeriodType,
          periodeValue: bilanPeriodValue,
          patronId: pId,
        });
        if (!row) return false;
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
        const user = await getCurrentUserOrNull();
        if (!user) return 0;

        const bilans = await fetchUnpaidWeeklyBilansBefore({
          patronId: pId,
          beforePeriodeIndex: currentIndex,
        });
        if (!bilans || bilans.length === 0) return 0;

        const allocs = await fetchAcompteAllocationsBefore({
          patronId: pId,
          beforePeriodeIndex: currentIndex,
        });

        const allocByWeek = buildAllocByWeek(allocs);

        const impayePrecedent = bilans.reduce((sum, r) => {
          const ca = parseFloat(r.ca_brut_periode || 0);
          const alloue = allocByWeek[r.periode_index] || 0;
          const resteReel = Math.max(0, ca - alloue);
          return sum + resteReel;
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
        const data = await fetchAcompteAmountsBefore({
          patronId: pId,
          beforePeriodeIndex: parseInt(weekNum, 10),
        });
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
        const user = await getCurrentUserOrNull();
        if (!user) return { impayes: [], payes: [], all: [] };

        const data = await fetchWeeklyBilansHistory({ patronId: pId });

        // ✅ Récupère toutes les allocations pour ce patron
        const allocs = await fetchAcompteAllocationsByPatron({ patronId: pId });

        const allocByWeek = buildAllocByWeek(allocs);

        const rows = normalizeHistoriqueRows(data, allocByWeek, resolvePatronNom);
        return splitHistoriqueRows(rows);
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
        const user = await getCurrentUserOrNull();
        if (!user) {
          triggerAlert?.("Utilisateur non connecté.");
          return false;
        }

        const filtered = getMissionsByPeriod(
          bilanPeriodType,
          bilanPeriodValue,
          runPatronId
        ).filter((m) => !clientId || m.client_id === clientId)
          .sort((a, b) => new Date(a.date_iso) - new Date(b.date_iso));

        const totalMissions = filtered.reduce((sum, m) => sum + (m.montant || 0), 0);
        const totalH = filtered.reduce((sum, m) => sum + (m.duree || 0), 0);

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

        let fraisFiltres = [];
        if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
          fraisFiltres = getFraisByWeek(parseInt(bilanPeriodValue, 10), runPatronId);
        }
        const totalFrais = getTotalFrais(fraisFiltres);

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

        const caBrutPeriode = totalMissions + totalFrais;

        if (caBrutPeriode === 0 && filtered.length === 0) {
          triggerAlert?.(`⚠️ Aucune mission pour ${resolvePatronNom(runPatronId) || "ce patron"} en ${formatPeriodLabel(bilanPeriodValue)}`);
          setShowPeriodModal(false);
          setShowBilan(false);
          return false;
        }

        let impayePrecedent = 0;
        if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
          impayePrecedent = await getImpayePrecedent(parseInt(bilanPeriodValue, 10), runPatronId);
        }

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

          const { data: allocsCetteSemaine, error: allocCetteSemaineError } = await supabase
            .from("acompte_allocations")
            .select("amount")
            .eq("patron_id", pId)
            .eq("periode_index", weekNum);

          if (allocCetteSemaineError) {
            console.error("ALLOC_QUERY_ERROR", { scope: "cette_semaine", patronId: pId, currentIndex: weekNum, error: allocCetteSemaineError });
          }

          const allocCetteSemaine = (allocsCetteSemaine || []).reduce(
            (sum, a) => sum + (parseFloat(a.amount) || 0),
            0
          );

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

          acompteConsomme = allocCetteSemaine;
          soldeAvantPeriode = Math.max(0, acomptesCumules - totalAlloueAvant - acomptesDansPeriode);
          soldeApresPeriode = Math.max(0, acomptesCumules - totalAlloueJusqua);

          const detteTotale = impayePrecedent + caBrutPeriode;
          resteCettePeriode = Math.max(0, detteTotale - acompteConsomme);
          resteAPercevoir = resteCettePeriode;

        } else {
          soldeAvantPeriode = getSoldeAvant(debutPeriode, runPatronId);
          const acomptesDansPeriode = getAcomptesDansPeriode(debutPeriode, finPeriode, runPatronId);
          const acompteDisponible = soldeAvantPeriode + acomptesDansPeriode;
          acompteConsomme = Math.min(acompteDisponible, caBrutPeriode);
          resteCettePeriode = caBrutPeriode - acompteConsomme;
          resteAPercevoir = resteCettePeriode;
          soldeApresPeriode = acompteDisponible - acompteConsomme;
        }

        const consommeCettePeriode = bilanPeriodType === PERIOD_TYPES.SEMAINE
          ? (acomptesDansPeriode > 0 ? acomptesDansPeriode : 0)
          : Math.max(0, (soldeAvantPeriode + acomptesDansPeriode) - soldeApresPeriode);

        const statutPaye = await getStatutPaiement(runPatronId);

        const selectedPatron = runPatronId ? patrons.find((p) => p.id === runPatronId) : null;
        const patronNom = selectedPatron ? selectedPatron.nom : "Tous les patrons (Global)";

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

        let fraisKm = { items: [], totalKm: 0, totalAmount: 0 };
        const effectiveDomicile = domicileLatLng ?? (
          Number.isFinite(kmSettings?.km_domicile_lat) && Number.isFinite(kmSettings?.km_domicile_lng)
            ? { lat: kmSettings.km_domicile_lat, lng: kmSettings.km_domicile_lng }
            : null
        );
        if (kmSettings?.km_enable === true && bilanPeriodType === PERIOD_TYPES.SEMAINE && effectiveDomicile?.lat && effectiveDomicile?.lng) {
          const kmRateEffectif = kmSettings.km_rate_mode === "CUSTOM"
            ? (parseFloat(kmSettings.km_rate) || 0)
            : (KM_RATES[kmSettings.km_country_code || "FR"] || 0.42);
          const multiplicateur = kmSettings.km_include_retour ? 2 : 1;

          filtered.forEach((m) => {
            const lieuById = lieux.find((l) => l.id === m.lieu_id);
            const lieuByName = !lieuById && m.lieu
              ? lieux.find((l) => l.nom?.toLowerCase().trim() === m.lieu?.toLowerCase().trim())
              : null;
            const lieu = lieuById || lieuByName;
            const latLieu = Number(lieu?.latitude);
            const lngLieu = Number(lieu?.longitude);
            if (Number.isFinite(latLieu) && Number.isFinite(lngLieu)) {
              const kmOneWay = haversineKm(effectiveDomicile.lat, effectiveDomicile.lng, latLieu, lngLieu);
              const kmTotal = kmOneWay * multiplicateur;
              const amount = kmTotal * kmRateEffectif;
              const typeLabel = lieu?.type && lieu.type !== 'client' ? ` (${lieu.type.toUpperCase()})` : '';
              fraisKm.items.push({
                missionId: m.id,
                date: m.date_iso,
                labelLieuOuClient: getLieuLabel(lieu, m) + typeLabel,
                kmOneWay, kmTotal, amount,
              });
              fraisKm.totalKm += kmTotal;
              fraisKm.totalAmount += amount;
            } else {
              const typeLabel = lieu?.type && lieu.type !== 'client' ? ` (${lieu.type.toUpperCase()})` : '';
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

        const periodeIndex = computePeriodeIndex(bilanPeriodType, bilanPeriodValue);
        const isPaid = computeStatutPaye(statutPaye, resteCettePeriode);

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
                acompte_consomme: acompteConsomme,
                reste_a_percevoir: resteCettePeriode,
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
                acompte_consomme: acompteConsomme,
                reste_a_percevoir: isPaid ? 0 : resteCettePeriode,
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
        const user = await getCurrentUserOrNull();
        if (!user) { triggerAlert?.("Utilisateur non connecté."); return; }

        const kmRateEffectif = kmSettings.km_rate_mode === "CUSTOM"
          ? (parseFloat(kmSettings.km_rate) || 0)
          : (KM_RATES[kmSettings.km_country_code || "FR"] || 0.42);
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

  const rebuildBilans = useCallback(
    async (patronId, startWeek, endWeek) => {
      const pId = effectivePatronId(patronId);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, message: "Utilisateur non connecté" };

        let rebuilt = 0;

        for (let weekNum = startWeek; weekNum <= endWeek; weekNum++) {
          const filtered = getMissionsByPeriod(PERIOD_TYPES.SEMAINE, String(weekNum), patronId);
          const totalMissions = filtered.reduce((sum, m) => sum + (m.montant || 0), 0);
          const fraisFiltres = getFraisByWeek(weekNum, patronId);
          const totalFrais = getTotalFrais(fraisFiltres);
          const caBrutPeriode = totalMissions + totalFrais;
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

  const repairBilansDB = useCallback(async (patronId) => {
    const pId = effectivePatronId(patronId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, message: "Non connecté", fixed: 0, skipped: 0 };

      const { data: bilans, error: bilansError } = await supabase
        .from("bilans_status_v2")
        .select("id, periode_index, ca_brut_periode, acompte_consomme, reste_a_percevoir, paye")
        .eq("patron_id", pId)
        .eq("periode_type", "semaine");

      if (bilansError) throw bilansError;
      if (!bilans || bilans.length === 0) {
        return { success: true, message: "Aucune ligne à réparer", fixed: 0, skipped: 0 };
      }

      const { data: allocs, error: allocsError } = await supabase
        .from("acompte_allocations")
        .select("periode_index, amount")
        .eq("patron_id", pId);

      if (allocsError) throw allocsError;

      const allocByWeek = {};
      (allocs || []).forEach((a) => {
        const idx = a.periode_index;
        allocByWeek[idx] = (allocByWeek[idx] || 0) + (parseFloat(a.amount) || 0);
      });

      let fixed = 0;
      let skipped = 0;

      for (const bilan of bilans) {
        const ca = parseFloat(bilan.ca_brut_periode || 0);
        const alloueReel = allocByWeek[bilan.periode_index] || 0;
        const resteReel = Math.max(0, ca - alloueReel);
        const payeReel = bilan.paye === true || resteReel <= 0.01;

        const acompteConsommeInDB = parseFloat(bilan.acompte_consomme || 0);
        const resteInDB = parseFloat(bilan.reste_a_percevoir || 0);

        const needsFix =
          Math.abs(acompteConsommeInDB - alloueReel) > 0.01 ||
          Math.abs(resteInDB - (payeReel ? 0 : resteReel)) > 0.01;

        if (!needsFix) {
          skipped++;
          continue;
        }

        const updatePayload = {
          acompte_consomme: alloueReel,
          reste_a_percevoir: payeReel ? 0 : resteReel,
          paye: payeReel,
        };
        if (payeReel && !bilan.paye) {
          updatePayload.date_paiement = new Date().toISOString();
        }

        const { error: updateError } = await supabase
          .from("bilans_status_v2")
          .update(updatePayload)
          .eq("id", bilan.id);

        if (updateError) {
          console.error("repairBilansDB update error", { id: bilan.id, error: updateError });
        } else {
          fixed++;
        }
      }

      return {
        success: true,
        message: `Réparation terminée : ${fixed} ligne(s) corrigée(s), ${skipped} déjà correcte(s)`,
        fixed,
        skipped,
      };
    } catch (err) {
      console.error("repairBilansDB error:", err);
      return { success: false, message: err?.message || "Erreur inconnue", fixed: 0, skipped: 0 };
    }
  }, []);

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
    repairBilansDB,
  };
}
