import { supabase } from "./supabase";

export interface Lead {
  id: string;

  full_name: string;
  phone: string;
  email: string;
  status: string;
  source?: string;
  created_at?: string;
  portal_token?: string;

  ai_score?: number;
  ai_summary?: string;
  ai_next_action?: string;
  ai_score_reason?: string;
}

export async function fetchLeads(): Promise<Lead[]> {
  try {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error.message);
      throw new Error(error.message);
    }

    return data || [];
  } catch (error) {
    console.error("Fetch leads failed:", error);
    throw error;
  }
}
export async function createLead(payload: {
  full_name: string;
  phone: string;
  email: string;
  status: string;
  source: string;
}) {
  try {
    const { data, error } = await supabase
      .from("leads")
      .insert([
        {
          full_name: payload.full_name,
          phone: payload.phone,
          email: payload.email,
          status: payload.status,
          source: payload.source,
        },
      ])
      .select();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error("Create lead failed:", error);
    throw error;
  }
}

export async function updateLeadStatus(
  id: string,
  status: string
) {
  const { data, error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", id)
    .select();

  if (error) {
    console.error(error);
    throw error;
  }

  return data;
}
export async function fetchLeadById(id: string) {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    throw error;
  }

  return data;
}
export interface LeadNote {
  id: string;
  lead_id: string;
  note: string;
  created_at: string;
}

export async function fetchLeadNotes(
  leadId: string
): Promise<LeadNote[]> {

  const { data, error } = await supabase
    .from("lead_notes")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
  console.error("Notes fetch error:", error);
  return [];
}

  return data || [];
}

export async function createLeadNote(
  leadId: string,
  note: string
) {

  const { data, error } = await supabase
    .from("lead_notes")
    .insert([
      {
        lead_id: leadId,
        note,
      },
    ])
    .select();

  if (error) {
  console.error("Create note error:", error);
  return [];
}

  return data;
}