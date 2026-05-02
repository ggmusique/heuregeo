import { supabase } from "./supabase.ts";

export async function getCurrentUserOrNull() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user || null;
}
