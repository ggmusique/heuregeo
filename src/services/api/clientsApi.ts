import { supabase } from "../supabase.ts";
import type { Client } from "../../types/entities.ts";

export interface ClientStats {
  nombreMissions: number;
  totalHeures: number;
  totalCA: number;
}

export type ClientInsert = Omit<Client, "id" | "created_at">;
export type ClientUpdate = Partial<Omit<Client, "id" | "user_id" | "created_at">>;

export const fetchClients = async (userId: string): Promise<Client[]> => {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("actif", true)
    .eq("user_id", userId)
    .order("nom", { ascending: true });

  if (error) throw error;
  return (data || []) as Client[];
};

export const createClient = async (clientData: ClientInsert): Promise<Client> => {
  const { data, error } = await supabase
    .from("clients")
    .insert([clientData])
    .select()
    .single();

  if (error) throw error;
  return data as Client;
};

export const updateClient = async (clientId: string, updates: ClientUpdate): Promise<Client> => {
  const { data, error } = await supabase
    .from("clients")
    .update(updates)
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
