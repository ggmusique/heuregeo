import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const message = "❌ Variables Supabase manquantes ! Vérifie ton .env";
  if (import.meta.env.DEV) {
    throw new Error(message);
  }
  console.error(message);
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: { persistSession: true, autoRefreshToken: true },
});
