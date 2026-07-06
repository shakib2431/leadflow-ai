import { supabase } from "./supabase";

export interface DashboardStats {
  totalLeads: number;
  hotLeads: number;
  convertedLeads: number;
  conversionRate: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase
    .from("leads")
    .select("status");

  if (error) {
    console.error(error);

    return {
      totalLeads: 0,
      hotLeads: 0,
      convertedLeads: 0,
      conversionRate: 0,
    };
  }

  const totalLeads = data.length;

  const hotLeads = data.filter(
    (lead) => lead.status === "hot"
  ).length;

  const convertedLeads = data.filter(
    (lead) => lead.status === "converted"
  ).length;

  const conversionRate =
    totalLeads > 0
      ? (convertedLeads / totalLeads) * 100
      : 0;

  return {
    totalLeads,
    hotLeads,
    convertedLeads,
    conversionRate,
  };
}
export async function fetchHotLeads() {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("status", "hot")
    .limit(5);

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

