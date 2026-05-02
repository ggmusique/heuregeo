import { supabase } from "./supabase";

export async function getCurrentUserOrNull() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user || null;
}
