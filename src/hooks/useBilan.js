import { useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "../services/supabase";
import { getWeekNumber, getWeekStartDate } from "../utils/dateUtils";

/**
 * ==========================================
 * METEO : enrichit les missions affichées
 * ==========================================
 * Dans le bilan semaine, tu affiches une petite météo.
 * Ici on appelle l'API Open-Meteo archive pour une date précise.
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

// ==========================================
// "Global patron" : quand tu ne filtres pas par patron
// ==========================================
const GLOBAL_PATRON_ID = "00000000-0000-0000-0000-000000000000";

// Table Supabase qui stocke : payé / impayé, reste, acompte consommé, etc.
const TABLE = "bilans_status_v2";

/**
 * ==========================================
 * HOOK useBilan
 * ==========================================
 * Rôle :
 * - Générer un bilan (semaine/mois/année)
 * - Calculer impayés, acomptes, reste à percevoir
 * - Sauvegarder le statut du bilan dans Supabase
 * - Charger l'historique des bilans (payés / impayés)
 */
export function useBilan({
  missions,
  fraisDivers,
  patrons = [],
  getMissionsByWeek, // pas utilisé ici mais gardé si tu l'utilises ailleurs
  getMissionsByPeriod, // filtre missions selon période + patron
  getFraisByWeek, // récup frais d'une semaine
  getTotalFrais, // somme les frais
  getSoldeAvant, // solde acompte avant une date (utilisé surtout pour affichage)
  getAcomptesDansPeriode, // somme acomptes dans une période (UI)
  getTotalAcomptesJusqua, // ✅ clé du fix : cumul acomptes jusqu'à fin de période
  triggerAlert,
}) {
  // ==========================================
  // STATE : ce que l'app utilise pour afficher
  // ==========================================
  const [showBilan, setShowBilan] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [bilanPeriodType, setBilanPeriodType] = useState("semaine");
  const [bilanPeriodValue, setBilanPeriodValue] = useState("");
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [bilanPaye, setBilanPaye] = useState(false);

  // Ce gros objet = données affichées dans l'écran "Bilan"
  const [bilanContent, setBilanContent] = useState({
    titre: "",
    totalE: 0, // total en € de la période
    totalH: 0, // total heures de la période
    filteredData: [], // missions filtrées (+ météo)
    groupedData: [], // regroupement mois/année
    totalFrais: 0,
    fraisDivers: [],

    // comptabilité (affichage)
    impayePrecedent: 0,
    resteCettePeriode: 0,
    resteAPercevoir: 0,
    soldeAcomptesAvant: 0,
    soldeAcomptesApres: 0,

    // UI
    selectedPatronId: null,
    selectedPatronNom: "Tous les patrons (Global)",
  });

  // ==========================================
  // Auto-régénération du bilan quand la période change
  // ==========================================
  useEffect(() => {
    if (showBilan && bilanPeriodValue) {
      genererBilan(bilanContent.selectedPatronId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bilanPeriodValue]);

  // ==========================================
  // CONSTANTES PÉRIODE
  // ==========================================
  const PERIOD_TYPES = {
    SEMAINE: "semaine",
    MOIS: "mois",
    ANNEE: "annee",
  };

  // ==========================================
  // HELPERS : petites fonctions utilitaires
  // ==========================================
  const effectivePatronId = (patronId) =>
    patronId ? patronId : GLOBAL_PATRON_ID;

  const isGlobalPatronId = (patronId) =>
    !patronId || patronId === GLOBAL_PATRON_ID;

  const resolvePatronNom = (patronId) => {
    if (isGlobalPatronId(patronId)) return "Global";
    const p = patrons.find((x) => x.id === patronId);
    return p?.nom || "Inconnu";
  };

  // Sert à trier / comparer des périodes dans Supabase (index numérique)
  const computePeriodeIndex = (type, value) => {
    const v = value?.toString?.() ?? "";
    if (!v) return 0;

    if (type === PERIOD_TYPES.SEMAINE) return parseInt(v, 10) || 0;
    if (type === PERIOD_TYPES.ANNEE) return parseInt(v, 10) || 0;
    if (type === PERIOD_TYPES.MOIS) return parseInt(v.replace("-", ""), 10) || 0;

    return 0;
  };

  // Titre affiché dans l'UI : "Semaine 6" / "FÉVRIER 2026" / "2026"
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

  // Remplit la liste des périodes dispo selon missions existantes (pour ton modal)
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

  /**
   * ==========================================
   * Statut payé (Supabase)
   * ==========================================
   * Vérifie si la période/patron est marquée payée.
   */
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
   * ==========================================
   * Impayés précédents (Supabase)
   * ==========================================
   * Calcule le cumul des semaines impayées AVANT la semaine courante.
   *
   * Important : on ne prend que les bilans enregistrés dans Supabase.
   * Le calcul = ca_brut_periode - acompte_consomme.
   *
   * ⚠️ Note technique :
   * - useCallback(..., []) ici fige PERIOD_TYPES/effectivePatronId au montage.
   * - Ça marche souvent, mais c'est "bizarre".
   */
  const getImpayePrecedent = useCallback(
    async (currentWeek, patronId = null) => {
      const pId = effectivePatronId(patronId);
      const currentIndex = parseInt(currentWeek, 10) || 0;

      try {
        const { data, error } = await supabase
          .from(TABLE)
         .select("periode_index, paye, ca_brut_periode, acompte_consomme, reste_a_percevoir")
          .eq("periode_type", PERIOD_TYPES.SEMAINE)
          .eq("patron_id", pId)
          .eq("paye", false)
          .lt("periode_index", currentIndex)
          .order("periode_index", { ascending: true });

        if (error) throw error;

       const total = (data || []).reduce((sum, row) => {
  // ✅ Utiliser reste_a_percevoir directement
  const reste = parseFloat(row?.reste_a_percevoir ?? 0);
  return sum + (isNaN(reste) ? 0 : reste);
}, 0);

        return total;
      } catch {
        return 0;
      }
    },
    [] // ⚠️ potentiellement à améliorer plus tard
  );

  /**
   * ==========================================
   * Historique bilans (Supabase)
   * ==========================================
   * Retourne :
   * - impayes : bilans non payés
   * - payes : bilans payés
   * - all : tous
   *
   * Et on recalcule le "reste_a_percevoir" pour les semaines pour éviter un cumul.
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

          // Pour la semaine : reste = ca - acompte_consomme
        if (r.periode_type === "semaine") {
  resteFixe = parseFloat(r?.reste_a_percevoir ?? 0);
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
            const ad = a?.date_paiement ? new Date(a.date_paiement).getTime() : 0;
            const bd = b?.date_paiement ? new Date(b.date_paiement).getTime() : 0;
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
   * ==========================================
   * Générer le bilan (fonction principale)
   * ==========================================
   * C'est elle qui alimente l'écran Bilan :
   * - calcule totaux, impayés, acomptes, reste à percevoir
   * - ajoute météo
   * - sauvegarde dans Supabase (bilans_status_v2)
   */
  const genererBilan = useCallback(
    async (patronId = null) => {
      if (!bilanPeriodValue) {
        triggerAlert?.("Sélectionnez une période.");
        return false;
      }

      // En mode semaine, on veut absolument la fonction de cumul des acomptes.
      if (bilanPeriodType === PERIOD_TYPES.SEMAINE && !getTotalAcomptesJusqua) {
        triggerAlert?.("⚠️ getTotalAcomptesJusqua manquant (useAcomptes).");
        return false;
      }

      try {
        const pId = effectivePatronId(patronId);

        // 1) Missions filtrées pour la période + patron
        const filtered = getMissionsByPeriod(
          bilanPeriodType,
          bilanPeriodValue,
          patronId
        ).sort((a, b) => new Date(a.date_iso) - new Date(b.date_iso));

        // Totaux missions
        const totalMissions = filtered.reduce((sum, m) => sum + (m.montant || 0), 0);
        const totalH = filtered.reduce((sum, m) => sum + (m.duree || 0), 0);

        // 2) Groupements (uniquement pour MOIS/ANNEE)
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

        // 3) Frais (uniquement semaine)
        let fraisFiltres = [];
        if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
          fraisFiltres = getFraisByWeek(parseInt(bilanPeriodValue, 10), patronId);
        }
        const totalFrais = getTotalFrais(fraisFiltres);

        // 4) Début / fin de la période (dates ISO)
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

        // ==========================================
        // 5) CALCUL COMPTABLE (la partie importante)
        // ==========================================
        // CA de la période = missions + frais
        const caBrutPeriode = totalMissions + totalFrais;

        // ✅ NOUVEAU : Pas de missions pour ce patron cette semaine
if (caBrutPeriode === 0 && filtered.length === 0) {
  triggerAlert?.(`⚠️ Aucune mission pour ${resolvePatronNom(patronId) || "ce patron"} en ${formatPeriodLabel(bilanPeriodValue)}`);
  setShowPeriodModal(false);
  setShowBilan(false);
  return false; // ← On arrête tout, pas de sauvegarde
}

        // Dette des semaines avant (impayés précédents)
        let impayePrecedent = 0;
        if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
          impayePrecedent = await getImpayePrecedent(
            parseInt(bilanPeriodValue, 10),
            patronId
          );
        }

        // Variables résultats (affichage)
        let resteCettePeriode = 0;
        let resteAPercevoir = 0;
        let soldeAvantPeriode = 0;
        let soldeApresPeriode = 0;
        let acompteConsomme = 0;

        // Pour l'UI : "acomptes reçus cette période"
        const acomptesDansPeriode =
          bilanPeriodType === PERIOD_TYPES.SEMAINE
            ? getAcomptesDansPeriode(debutPeriode, finPeriode, patronId)
            : 0;

// ✅ Mode semaine : on déduit les acomptes sur impayés + semaine courante
if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
  // Acomptes cumulés jusqu'à la FIN de la semaine
  const acomptesCumules = getTotalAcomptesJusqua(finPeriode, patronId);

  // ✅ NOUVEAU : Calculer les acomptes déjà consommés sur les semaines AVANT
  let acomptesDejaUtilises = 0;
  try {
    const { data: bilansPrecedents } = await supabase
      .from(TABLE)
      .select("acompte_consomme")
      .eq("patron_id", pId)
      .eq("periode_type", "semaine")
      .lt("periode_index", parseInt(bilanPeriodValue, 10));

    if (bilansPrecedents) {
      acomptesDejaUtilises = bilansPrecedents.reduce((sum, b) => {
        return sum + (parseFloat(b.acompte_consomme) || 0);
      }, 0);
    }
  } catch (err) {
    console.error("Erreur calcul acomptes utilisés:", err);
  }

  // Acomptes vraiment disponibles pour cette semaine
  const acomptesDisponibles = Math.max(0, acomptesCumules - acomptesDejaUtilises);

  // Solde avant période (affichage)
  soldeAvantPeriode = acomptesDisponibles;

  // Dette totale = impayés précédents + dette de la semaine
  const detteTotale = impayePrecedent + caBrutPeriode;

  // Ce que tu dois recevoir si les acomptes ne suffisent pas
  resteAPercevoir = Math.max(0, detteTotale - acomptesDisponibles);

  // Si les acomptes dépassent la dette, tu as un solde à reporter
  soldeApresPeriode = Math.max(0, acomptesDisponibles - detteTotale);

  // Montant d'acompte "consommé" pour CETTE semaine
  acompteConsomme = Math.min(acomptesDisponibles, caBrutPeriode);

  const impayeRestant = Math.max(0, impayePrecedent - soldeAvantPeriode);
  resteCettePeriode = Math.max(0, resteAPercevoir - impayeRestant);
} else {
          // Mode mois/année : on garde un calcul simple (pas de rattrapage)
          soldeAvantPeriode = getSoldeAvant(debutPeriode, patronId);
          const acompteDisponible = soldeAvantPeriode + acomptesDansPeriode;
          acompteConsomme = Math.min(acompteDisponible, caBrutPeriode);
          resteCettePeriode = caBrutPeriode - acompteConsomme;
          resteAPercevoir = resteCettePeriode;
          soldeApresPeriode = acompteDisponible - acompteConsomme;
        }

        // 7) Statut payé (Supabase)
        const statutPaye = await getStatutPaiement(patronId);

        // 8) Nom patron affiché
        const selectedPatron = patronId ? patrons.find((p) => p.id === patronId) : null;
        const patronNom = selectedPatron ? selectedPatron.nom : "Tous les patrons (Global)";

        // 9) Ajout météo (semaine seulement)
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

        // 10) Objet final envoyé à l'UI (App.jsx)
        const content = {
          titre: formatPeriodLabel(bilanPeriodValue),

          totalE: caBrutPeriode,
          totalH,
          filteredData: filteredWithWeather,
          groupedData,

          totalFrais: bilanPeriodType === PERIOD_TYPES.SEMAINE ? totalFrais : 0,
          fraisDivers: bilanPeriodType === PERIOD_TYPES.SEMAINE ? fraisFiltres : [],

          // Affichage "acompte consommé"
          totalAcomptes: bilanPeriodType === PERIOD_TYPES.SEMAINE ? acompteConsomme : 0,

          // Affichage "reçus cette période"
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

    // 11) Sauvegarde dans Supabase (bilans_status_v2)
const periodeIndex = computePeriodeIndex(bilanPeriodType, bilanPeriodValue);

// ✅ Vérifier si le bilan existe déjà
const { data: bilanExistant } = await supabase
  .from(TABLE)
  .select("acompte_consomme, paye")
  .eq("periode_type", bilanPeriodType)
  .eq("periode_value", bilanPeriodValue)
  .eq("patron_id", pId)
  .maybeSingle();

const dataToSave = {
  periode_type: bilanPeriodType,
  periode_value: bilanPeriodValue,
  periode_index: periodeIndex,
  patron_id: pId,
  paye: statutPaye,
  date_paiement: statutPaye ? new Date().toISOString() : null,

  reste_a_percevoir: resteCettePeriode,
  ca_brut_periode: caBrutPeriode,

// ✅ Ne jamais écraser acompte_consomme s'il est déjà > 0
acompte_consomme: (bilanExistant?.acompte_consomme > 0)
  ? bilanExistant.acompte_consomme
  : (bilanPeriodType === PERIOD_TYPES.SEMAINE ? acompteConsomme : 0),
};

       // ✅ Ne sauvegarder QUE si un vrai patron est sélectionné
// Le mode global (GLOBAL_PATRON_ID) est juste pour affichage
if (!isGlobalPatronId(patronId)) {
  const { error: upsertError } = await supabase.from(TABLE).upsert(dataToSave, {
    onConflict: "periode_type,periode_value,patron_id",
  });

  if (upsertError) {
    triggerAlert?.("Erreur sauvegarde bilan.");
  }
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
 * ==========================================
 * Auto-payer les bilans (NOUVEAU)
 * ==========================================
 * Appelé automatiquement après création d'un acompte.
 * Parcourt les bilans impayés dans l'ordre chronologique
 * et les marque payés si l'acompte suffit.
 */
const autoPayerBilans = useCallback(
  async (patronId, montantAcompte) => {
    try {
      const pId = effectivePatronId(patronId);

      console.log("🔵 AUTO-PAIEMENT DÉMARRÉ", {
        patronId: pId,
        montantAcompte,
      });

      // 1. Récupérer bilans impayés du patron (ordre chrono)
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

      // 2. Pour chaque bilan impayé
      for (const bilan of bilansImpayes) {
        console.log(`\n🔄 Traitement semaine ${bilan.periode_value}:`, {
          ca_brut: bilan.ca_brut_periode,
          acompte_deja_consomme: bilan.acompte_consomme,
          reste_acompte_dispo: resteAcompte,
        });

        if (resteAcompte <= 0) {
          console.log("❌ Plus d'acompte disponible, stop");
          break;
        }

        // Calculer ce qu'il reste à payer pour ce bilan
        const caBrut = parseFloat(bilan.ca_brut_periode || 0);
        const acompteDejaConsomme = parseFloat(bilan.acompte_consomme || 0);
        const resteDu = Math.max(0, caBrut - acompteDejaConsomme);

        console.log(`  → Reste dû pour S${bilan.periode_value}: ${resteDu}€`);

        if (resteDu <= 0) {
          console.log("  → Déjà payé, skip");
          continue;
        }

        if (resteAcompte >= resteDu) {
          // ✅ L'acompte couvre tout le bilan
          console.log(`  ✅ Couvre tout ! Paiement de ${resteDu}€`);

          await supabase
            .from(TABLE)
            .update({
              paye: true,
              date_paiement: new Date().toISOString(),
              acompte_consomme: caBrut,
              reste_a_percevoir: 0,
            })
            .eq("id", bilan.id);

          resteAcompte -= resteDu;
          console.log(`  → Reste après: ${resteAcompte}€`);
        } else {
          // ⚠️ L'acompte couvre partiellement
          const nouvelAcompteConsomme = acompteDejaConsomme + resteAcompte;
          console.log(`  ⚠️ Paiement partiel: ${resteAcompte}€ sur ${resteDu}€`);

          await supabase
            .from(TABLE)
            .update({
              acompte_consomme: nouvelAcompteConsomme,
              reste_a_percevoir: caBrut - nouvelAcompteConsomme,
            })
            .eq("id", bilan.id);

          resteAcompte = 0;
          console.log("  → Acompte épuisé");
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

  /**
   * ==========================================
   * Marquer comme payé (bouton "MARQUER COMME PAYÉ" dans App.jsx)
   * ==========================================
   * On upsert Supabase en mettant paye=true + date_paiement.
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

  /**
   * ==========================================
   * Navigation entre périodes
   * ==========================================
   */
  const gotoPreviousWeek = useCallback(() => {
    const currentIndex = availablePeriods.indexOf(bilanPeriodValue);
    if (currentIndex < availablePeriods.length - 1) {
      const newValue = availablePeriods[currentIndex + 1];
      setBilanPeriodValue(newValue);
    }
  }, [availablePeriods, bilanPeriodValue]);

  const gotoNextWeek = useCallback(() => {
    const currentIndex = availablePeriods.indexOf(bilanPeriodValue);
    if (currentIndex > 0) {
      const newValue = availablePeriods[currentIndex - 1];
      setBilanPeriodValue(newValue);
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

  // ==========================================
  // Ce que App.jsx récupère (bilan.xxx)
  // ==========================================
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
    autoPayerBilans, // ✅ AJOUTE ÇA

    // utilisé dans l'onglet Historique de App.jsx
    fetchHistoriqueBilans,

    // ✅ Navigation entre périodes
    gotoPreviousWeek,
    gotoNextWeek,
    hasPreviousWeek,
    hasNextWeek,
    handleWeekChange,
  };
}
