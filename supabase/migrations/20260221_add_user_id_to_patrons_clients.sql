-- Migration: Ajouter user_id aux tables patrons et clients
-- Date: 2026-02-21
-- ⚠️ À exécuter dans Supabase SQL Editor APRÈS avoir mergé la PR

-- 1. Backup de sécurité (déjà fait manuellement: patrons_backup_20260221)

-- 2. Ajouter user_id à patrons
ALTER TABLE patrons ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- 3. Ajouter user_id à clients  
ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- 4. Mettre à jour les données existantes (remplacer 'VOTRE_USER_ID' par votre vrai user id)
-- UPDATE patrons SET user_id = 'VOTRE_USER_ID' WHERE user_id IS NULL;
-- UPDATE clients SET user_id = 'VOTRE_USER_ID' WHERE user_id IS NULL;

-- 5. Supprimer toutes les politiques RLS existantes sur patrons
DROP POLICY IF EXISTS "Ajout public" ON patrons;
DROP POLICY IF EXISTS "Lecture publique" ON patrons;
DROP POLICY IF EXISTS "Update public" ON patrons;
DROP POLICY IF EXISTS "Suppression public" ON patrons;

-- 6. Nouvelles politiques RLS pour patrons
CREATE POLICY "patrons_select_own" ON patrons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "patrons_insert_own" ON patrons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "patrons_update_own" ON patrons FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "patrons_delete_own" ON patrons FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Activer RLS sur patrons si pas encore fait
ALTER TABLE patrons ENABLE ROW LEVEL SECURITY;

-- 8. Supprimer toutes les politiques RLS existantes sur clients
DROP POLICY IF EXISTS "Ajout public" ON clients;
DROP POLICY IF EXISTS "Lecture publique" ON clients;
DROP POLICY IF EXISTS "Update public" ON clients;
DROP POLICY IF EXISTS "Suppression public" ON clients;

-- 9. Nouvelles politiques RLS pour clients
CREATE POLICY "clients_select_own" ON clients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "clients_insert_own" ON clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clients_update_own" ON clients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "clients_delete_own" ON clients FOR DELETE
  USING (auth.uid() = user_id);

-- 10. Activer RLS sur clients si pas encore fait
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
