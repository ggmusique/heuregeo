import { supabase } from "../supabase";
import type { Client } from "../../types/entities";
import { sanitizeName } from "../../utils/sanitize";

export interface ClientStats {
  nombreMissions: number;
  totalHeures: number;
  totalCA: number;
}

export type ClientInsert = Omit<Client, "id" | "created_at">;
export type ClientUpdate = Partial<Omit<Client, "id" | "user_id" | "created_at">>;

export const fetchClients = async (_userId?: string): Promise<Client[]> => {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("actif", true)
    .order("nom", { ascending: true });

  if (error) throw error;
  return (data || []) as Client[];
};

export const createClient = async (clientData: ClientInsert): Promise<Client> => {
  const { data, error } = await supabase
    .from("clients")
    .insert([{ ...clientData, nom: sanitizeName(clientData.nom) }])
    .select()
    .single();

  if (error) throw error;
  return data as Client;
};

export const updateClient = async (clientId: string, updates: ClientUpdate): Promise<Client> => {
  const sanitized: ClientUpdate = {
    ...updates,
    ...(updates.nom != null && { nom: sanitizeName(updates.nom) }),
  };
  const { data, error } = await supabase
    .from("clients")
    .update(sanitized)
    .eq("id", clientId)
    .select()
    .single();

  if (error) throw error;
  return data as Client;
};

export const deleteClient = async (clientId: string): Promise<void> => {
  const { error } = await supabase
    .from("clients")
    .update({ actif: false })
    .eq("id", clientId);

  if (error) throw error;
};

export const getClientStats = async (clientId: string): Promise<ClientStats> => {
  const { data: missions, error } = await supabase
    .from("missions")
    .select("duree, montant")
    .eq("client_id", clientId);

  if (error) throw error;

  return {
    nombreMissions: missions.length,
    totalHeures: missions.reduce((sum, m) => sum + (m.duree || 0), 0),
    totalCA: missions.reduce((sum, m) => sum + (m.montant || 0), 0),
  };
};
