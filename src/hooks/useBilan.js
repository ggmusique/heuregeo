import { useState, useCallback } from "react";
import { supabase } from "../services/supabase";
import { getWeekNumber, getWeekStartDate } from "../utils/dateUtils";

/**
 * Récupère la météo historique pour une date donnée (Open-Meteo archive)
 * Coordonnées par défaut : Liège/Belgique
 */
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

      if (code >= 61 && code <= 67) {
        icon = "09d";
        desc = "Pluie";
      } else if (code >= 71 && code <= 77) {
        icon = "13d";
        desc = "Neige";
      } else if (code >= 80 && code <= 86) {
        icon = "09d";
        desc = "Averses";
      } else if (code >= 95) {
        icon = "11d";
        desc = "Orage";
      } else if (code >= 2 && code <= 3) {
        icon = "02d";
        desc = "Nuageux";
      }

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

// ✅ Constante GLOBAL (jamais null côté DB)
const GLOBAL_PATRON_ID = "00000000-0000-0000-0000-000000000000";
const TABLE = "bilans_status_v2";

export function useBilan({
  missions,
  fraisDivers, // gardé car présent dans l'appel
  patrons = [],
  getMissionsByWeek, // gardé car présent dans l'appel
  getMissionsByPeriod,
  getFraisByWeek,
  getTotalFrais,
  getSoldeAvant, // gardé (utile ailleurs / UI)
  getAcomptesDansPeriode, // gardé (UI)
  getTotalAcomptesJusqua, // ✅ NOUVEAU : nécessaire pour déduire l'acompte sur les semaines impayées
  triggerAlert,
}) {
  // ========== STATE ==========
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
    selectedPatronId: null,
    selectedPatronNom: "Tous les patrons (Global)",
  });

  // ========== CONSTANTES ==========
  const PERIOD_TYPES = {
    SEMAINE: "semaine",
    MOIS: "mois",
    ANNEE: "annee",
  };

  // ========== HELPERS ==========
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
    if (type === PERIOD_TYPES.MOIS)
      return parseInt(v.replace("-", ""), 10) || 0;

    return 0;
  };

  const formatPeriodLabel = useCallback(
    (val) => {
      if (!val) return "";
      const sVal = val.toString();

      if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
        return `Semaine ${sVal}`;
      }

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
        const { data, error } = await supabase
          .from(TABLE)
          .select("paye")
          .eq("periode_type", bilanPeriodType)
          .eq("periode_value", bilanPeriodValue)
          .eq("patron_id", pId)
          .maybeSingle();

        if (error) throw error;
        return data?.paye || false;
      } catch {
        return false;
      }
    },
    [bilanPeriodType, bilanPeriodValue]
  );

  /**
   * ✅ CUMUL impayés précédents (SEMAINE) pour un patron donné
   * basé sur bilans_status_v2 : ca_brut_periode - acompte_consomme
   */
  const getImpayePrecedent = useCallback(async (currentWeek, patronId = null) => {
    const pId = effectivePatronId(patronId);
    const currentIndex = parseInt(currentWeek, 10) || 0;

    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select("periode_index, paye, ca_brut_periode, acompte_consomme")
        .eq("periode_type", PERIOD_TYPES.SEMAINE)
        .eq("patron_id", pId)
        .eq("paye", false)
        .lt("periode_index", currentIndex)
        .order("periode_index", { ascending: true });

      if (error) throw error;

      const total = (data || []).reduce((sum, row) => {
        const ca = parseFloat(row?.ca_brut_periode ?? 0);
        const acompte = parseFloat(row?.acompte_consomme ?? 0);
        const resteSemaine = Math.max(
          0,
          (isNaN(ca) ? 0 : ca) - (isNaN(acompte) ? 0 : acompte)
        );
        return sum + resteSemaine;
      }, 0);

      return total;
    } catch {
      return 0;
    }
  }, []);

  /**
   * ✅ HISTORIQUE (Option 1) = semaines uniquement
   */
  const fetchHistoriqueBilans = useCallback(
    async (patronId = null) => {
      const pId = effectivePatronId(patronId);

      try {
        const { data, error } = await supabase
          .from(TABLE)
          .select(
            "id, periode_type, periode_value, periode_index, patron_id, paye, date_paiement, reste_a_percevoir, ca_brut_periode, acompte_consomme, created_at"
          )
          .eq("patron_id", pId)
          .eq("periode_type", "semaine")
          .order("periode_index", { ascending: false });

        if (error) throw error;

        const rows = (data || []).map((r) => {
          const patron_nom = resolvePatronNom(r.patron_id);

          let resteFixe = r.reste_a_percevoir ?? 0;

          if (r.periode_type === "semaine") {
            const ca = parseFloat(r?.ca_brut_periode ?? 0);
            const acompte = parseFloat(r?.acompte_consomme ?? 0);
            resteFixe = Math.max(
              0,
              (isNaN(ca) ? 0 : ca) - (isNaN(acompte) ? 0 : acompte)
            );
          }

          return {
            ...r,
            patron_nom,
            reste_a_percevoir: resteFixe,
          };
        });

        const impayes = rows.filter((r) => r.paye === false);

        const payes = rows
          .filter((r) => r.paye === true)
          .sort((a, b) => {
            const ad = a?.date_paiement
              ? new Date(a.date_paiement).getTime()
              : 0;
            const bd = b?.date_paiement
              ? new Date(b.date_paiement).getTime()
              : 0;
            return bd - ad;
          });

        return { impayes, payes, all: rows };
      } catch {
        triggerAlert?.("Erreur chargement historique");
        return { impayes: [], payes: [], all: [] };
      }
    },
    [patrons, triggerAlert]
  );

  /**
   * Génère le bilan
   */
  const genererBilan = useCallback(
    async (patronId = null) => {
      if (!bilanPeriodValue) {
        triggerAlert?.("Sélectionnez une période.");
        return false;
      }

      // ✅ sécurité : on a besoin de getTotalAcomptesJusqua pour la semaine
      if (bilanPeriodType === PERIOD_TYPES.SEMAINE && !getTotalAcomptesJusqua) {
        triggerAlert?.(
          "⚠️ getTotalAcomptesJusqua manquant (useAcomptes)."
        );
        return false;
      }

      try {
        const pId = effectivePatronId(patronId);

        // 1) Missions filtrées
        const filtered = getMissionsByPeriod(
          bilanPeriodType,
          bilanPeriodValue,
          patronId
        ).sort((a, b) => new Date(a.date_iso) - new Date(b.date_iso));

        const totalMissions = filtered.reduce(
          (sum, m) => sum + (m.montant || 0),
          0
        );
        const totalH = filtered.reduce((sum, m) => sum + (m.duree || 0), 0);

        // 2) Groupements (mois/année)
        let groupedData = [];

        if (bilanPeriodType === PERIOD_TYPES.MOIS && filtered.length > 0) {
          const weekMap = new Map();

          filtered.forEach((m) => {
            const weekNum = getWeekNumber(new Date(m.date_iso));

            if (!weekMap.has(weekNum)) {
              weekMap.set(weekNum, {
                weekNumber: weekNum,
                totalHeures: 0,
                totalMontant: 0,
                missions: [],
              });
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
              monthMap.set(monthKey, {
                monthKey,
                totalHeures: 0,
                totalMontant: 0,
                missions: [],
              });
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

              return {
                label: monthLabel,
                h: month.totalHeures,
                e: month.totalMontant,
                missions: month.missions,
              };
            });
        }

        // 3) Frais (semaine)
        let fraisFiltres = [];
        if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
          fraisFiltres = getFraisByWeek(parseInt(bilanPeriodValue, 10), patronId);
        }
        const totalFrais = getTotalFrais(fraisFiltres);

        // 4) Dates période
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

        // =========================================================
        // ✅ CALCUL SEMAINE "COMPTABLE"
        // L’acompte couvre d’abord les semaines impayées, puis la semaine courante
        // =========================================================
        const caBrutPeriode = totalMissions + totalFrais;

        let impayePrecedent = 0;
        if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
          impayePrecedent = await getImpayePrecedent(
            parseInt(bilanPeriodValue, 10),
            patronId
          );
        }

        let resteCettePeriode = 0;
        let resteAPercevoir = 0;
        let soldeAvantPeriode = 0;
        let soldeApresPeriode = 0;
        let acompteConsomme = 0;

        // infos UI (inchangées)
        const acomptesDansPeriode =
          bilanPeriodType === PERIOD_TYPES.SEMAINE
            ? getAcomptesDansPeriode(debutPeriode, finPeriode, patronId)
            : 0;

        if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
          // Acomptes cumulés jusqu'à FIN de semaine (clé du fix)
          const acomptesCumules = getTotalAcomptesJusqua(finPeriode, patronId);

          // solde avant = acomptes jusqu'à début - dettes avant (approx)
          // (on garde aussi ton ancien getSoldeAvant pour affichage)
          soldeAvantPeriode = getSoldeAvant(debutPeriode, patronId);

          const detteTotale = impayePrecedent + caBrutPeriode;

          resteAPercevoir = Math.max(0, detteTotale - acomptesCumules);
          soldeApresPeriode = Math.max(0, acomptesCumules - detteTotale);

          acompteConsomme = Math.min(acomptesCumules, detteTotale);

          // Ce qu’il reste SPECIFIQUEMENT pour cette semaine (après rattrapage)
          // = total restant - impayés restant
          const impayeRestant = Math.max(0, impayePrecedent - soldeAvantPeriode);
          resteCettePeriode = Math.max(0, resteAPercevoir - impayeRestant);
        } else {
          // Mois/année : on garde ton fonctionnement actuel (pas de suivi d’acompte)
          soldeAvantPeriode = getSoldeAvant(debutPeriode, patronId);
          const acompteDisponible = soldeAvantPeriode + acomptesDansPeriode;
          acompteConsomme = Math.min(acompteDisponible, caBrutPeriode);
          resteCettePeriode = caBrutPeriode - acompteConsomme;
          resteAPercevoir = resteCettePeriode;
          soldeApresPeriode = acompteDisponible - acompteConsomme;
        }

        // 7) Statut payé
        const statutPaye = await getStatutPaiement(patronId);

        // 8) Nom patron
        const selectedPatron = patronId ? patrons.find((p) => p.id === patronId) : null;
        const patronNom = selectedPatron ? selectedPatron.nom : "Tous les patrons (Global)";

        // 9) Météo (semaine)
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

        // 10) Contenu final
        const content = {
          titre: formatPeriodLabel(bilanPeriodValue),
          totalE: caBrutPeriode,
          totalH,
          filteredData: filteredWithWeather,
          groupedData,

          totalFrais: bilanPeriodType === PERIOD_TYPES.SEMAINE ? totalFrais : 0,
          fraisDivers: bilanPeriodType === PERIOD_TYPES.SEMAINE ? fraisFiltres : [],

          totalAcomptes: bilanPeriodType === PERIOD_TYPES.SEMAINE ? acompteConsomme : 0,
          acomptesDansPeriode: bilanPeriodType === PERIOD_TYPES.SEMAINE ? acomptesDansPeriode : 0,

          resteCettePeriode,
          resteAPercevoir,
          impayePrecedent,

          soldeAcomptesAvant: soldeAvantPeriode,
          soldeAcomptesApres: soldeApresPeriode,

          selectedPatronId: patronId,
          selectedPatronNom: patronNom,
        };

        setBilanContent(content);
        setBilanPaye(statutPaye);
        setShowPeriodModal(false);
        setShowBilan(true);

        // 11) Sauvegarde v2
        const periodeIndex = computePeriodeIndex(bilanPeriodType, bilanPeriodValue);

        const dataToSave = {
          periode_type: bilanPeriodType,
          periode_value: bilanPeriodValue,
          periode_index: periodeIndex,
          patron_id: pId,
          paye: statutPaye,
          date_paiement: statutPaye ? new Date().toISOString() : null,

          // on stocke la dette de LA période (pas le cumul)
          reste_a_percevoir: resteCettePeriode,
          ca_brut_periode: caBrutPeriode,
          acompte_consomme: bilanPeriodType === PERIOD_TYPES.SEMAINE ? acompteConsomme : 0,
        };

        const { error: upsertError } = await supabase
          .from(TABLE)
          .upsert(dataToSave, {
            onConflict: "periode_type,periode_value,patron_id",
          });

        if (upsertError) {
          triggerAlert?.("Erreur sauvegarde bilan.");
        }

        return true;
      } catch {
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
    ]
  );

  /**
   * Marque comme payé (v2)
   */
  const marquerCommePaye = useCallback(
    async (patronId = null) => {
      try {
        const pId = effectivePatronId(patronId);
        const reste = bilanContent.resteCettePeriode || 0;

        const dataToSave = {
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

    fetchHistoriqueBilans,
  };
}
