// e2e/helpers/supabase.ts
// ─────────────────────────────────────────────────────────────────────────────
// Helpers E2E pour interagir directement avec Supabase en tests
// (nettoyage DB, création de données de test).
//
// Utilise le service_role pour bypasser RLS — uniquement en test !
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "E2E : VITE_SUPABASE_URL et E2E_SUPABASE_SERVICE_ROLE_KEY requis dans .env.local"
  );
}

/** Client admin pour le cleanup E2E (bypass RLS) */
export const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

/** Supprime toutes les missions de test créées par les E2E */
export async function cleanupTestMissions(ownerEmail: string): Promise<void> {
  const { data: profile } = await adminClient
    .from("profiles")
    .select("id")
    .eq("email", ownerEmail)
    .single();

  if (!profile) return;

  await adminClient
    .from("missions")
    .delete()
    .eq("user_id", profile.id)
    .like("client", "TEST_E2E_%");
}

/** Supprime les acomptes de test */
export async function cleanupTestAcomptes(ownerEmail: string): Promise<void> {
  const { data: profile } = await adminClient
    .from("profiles")
    .select("id")
    .eq("email", ownerEmail)
    .single();

  if (!profile) return;

  await adminClient
    .from("acomptes")
    .delete()
    .eq("user_id", profile.id)
    .eq("source", "e2e_test");
}
