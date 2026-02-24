import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const configError = {
  message: "Configuration Supabase manquante. Vérifie VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.",
};

if (!isConfigured) {
  console.error(configError.message);
}

const createThenableResponse = () => ({ data: null, error: configError, count: null });

const createQueryBuilderFallback = () => {
  const target = {};

  return new Proxy(target, {
    get(_, prop) {
      if (prop === "then") {
        return (resolve) => Promise.resolve(resolve(createThenableResponse()));
      }

      if (prop === "single" || prop === "maybeSingle") {
        return async () => ({ data: null, error: configError });
      }

      if (prop === "throwOnError") {
        return () => createQueryBuilderFallback();
      }

      return () => createQueryBuilderFallback();
    },
  });
};

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
  from: () => createQueryBuilderFallback(),
  rpc: async () => ({ data: null, error: configError }),
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: configError }),
      download: async () => ({ data: null, error: configError }),
      remove: async () => ({ data: null, error: configError }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
  functions: {
    invoke: async () => ({ data: null, error: configError }),
  },
  channel: () => ({
    on: () => ({ subscribe: () => ({}) }),
    subscribe: () => ({}),
    unsubscribe: () => {},
  }),
  removeChannel: () => {},
  removeAllChannels: () => {},
});

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : createFallbackClient();
