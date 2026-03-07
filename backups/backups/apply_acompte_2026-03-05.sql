
DECLARE
  v_montant NUMERIC;
  v_patron_id UUID;
  v_reste_acompte NUMERIC;
  v_bilan RECORD;
  v_montant_alloue NUMERIC;
  v_montant_deja_alloue NUMERIC;
  v_montant_a_allouer NUMERIC;
  v_total_alloue_semaine NUMERIC;
  v_nouveau_reste NUMERIC;
BEGIN
  -- 1. Récupérer l'acompte
  SELECT montant, patron_id INTO v_montant, v_patron_id
  FROM acomptes
  WHERE id = p_acompte_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Acompte % introuvable', p_acompte_id;
  END IF;

  v_reste_acompte := v_montant;

  -- 2. Boucler sur les semaines impayées par ordre chronologique
  FOR v_bilan IN
    SELECT 
      id,
      periode_value,
      periode_index,
      ca_brut_periode,
      acompte_consomme,
      reste_a_percevoir
    FROM bilans_status_v2
    WHERE patron_id = v_patron_id
      AND periode_type = 'semaine'
      AND reste_a_percevoir > 0
    ORDER BY periode_index ASC
  LOOP
    EXIT WHEN v_reste_acompte <= 0;

    -- Calculer combien a déjà été alloué à cette semaine (tous acomptes confondus)
    SELECT COALESCE(SUM(amount), 0) INTO v_montant_deja_alloue
    FROM acompte_allocations
    WHERE patron_id = v_patron_id
      AND periode_index = v_bilan.periode_index;

    -- Montant restant à payer pour cette semaine
    v_montant_a_allouer := LEAST(
      v_reste_acompte,
      v_bilan.ca_brut_periode - v_montant_deja_alloue
    );

    IF v_montant_a_allouer > 0 THEN
      -- Insérer l'allocation (idempotent)
      INSERT INTO acompte_allocations (
        user_id,
        patron_id,
        acompte_id,
        periode_type,
        periode_index,
        amount
      )
      SELECT 
        user_id,
        v_patron_id,
        p_acompte_id,
        'semaine',
        v_bilan.periode_index,
        v_montant_a_allouer
      FROM acomptes
      WHERE id = p_acompte_id
      ON CONFLICT (acompte_id, periode_type, periode_index) 
      DO UPDATE SET amount = EXCLUDED.amount;

      -- ✅ CORRECTION : Mettre à jour bilans_status_v2
      -- Total alloué à cette semaine (incluant ce nouvel ajout)
      v_total_alloue_semaine := v_montant_deja_alloue + v_montant_a_allouer;
      
      -- Nouveau reste
      v_nouveau_reste := GREATEST(0, v_bilan.ca_brut_periode - v_total_alloue_semaine);

      UPDATE bilans_status_v2
      SET 
        acompte_consomme = v_total_alloue_semaine,
        reste_a_percevoir = v_nouveau_reste,
        paye = (v_nouveau_reste <= 0.01),
        date_paiement = CASE 
          WHEN v_nouveau_reste <= 0.01 THEN NOW()
          ELSE date_paiement
        END
      WHERE id = v_bilan.id;

      v_reste_acompte := v_reste_acompte - v_montant_a_allouer;
    END IF;
  END LOOP;

  RAISE NOTICE 'Acompte % appliqué avec succès', p_acompte_id;
END;