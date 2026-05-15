-- Migration: create frais_km table
-- Purpose: store per-mission km expenses computed by "Recalculer KM" button
-- Unique key: mission_id (upsert on conflict)

CREATE TABLE IF NOT EXISTS frais_km (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patron_id      uuid,
  mission_id     uuid NOT NULL UNIQUE,
  date_frais     date NOT NULL,
  country_code   text NOT NULL DEFAULT 'FR',
  distance_km    numeric(10, 4) NOT NULL,
  rate_per_km    numeric(10, 4) NOT NULL,
  amount         numeric(10, 4) NOT NULL,
  source         text NOT NULL DEFAULT 'auto',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE frais_km ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "frais_km_select_own" ON frais_km;
CREATE POLICY "frais_km_select_own" ON frais_km
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "frais_km_insert_own" ON frais_km;
CREATE POLICY "frais_km_insert_own" ON frais_km
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "frais_km_update_own" ON frais_km;
CREATE POLICY "frais_km_update_own" ON frais_km
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "frais_km_delete_own" ON frais_km;
CREATE POLICY "frais_km_delete_own" ON frais_km
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS frais_km_user_date_idx ON frais_km (user_id, date_frais);