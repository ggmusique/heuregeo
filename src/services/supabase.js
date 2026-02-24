import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const configError = {
  message: "Configuration Supabase manquante. Vérifie VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.",
};

if (!isConfigured) {
  console.error("❌ Variables Supabase manquantes ! Vérifie ton .env");
}

const createFallbackClient = () => ({
  auth: {
    getSession: async () => ({ data: { session: null }, error: configError }),
    getUser: async () => ({ data: { user: null }, error: configError }),
    signInWithPassword: async () => ({ data: null, error: configError }),
    signUp: async () => ({ data: null, error: configError }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    }),
  },
});

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : createFallbackClient();
