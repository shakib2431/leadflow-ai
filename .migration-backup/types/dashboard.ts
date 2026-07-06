export interface DashboardPriority {
  lead_id: string;
  lead_name: string;
  reason: string;
  recommended_action: string;
  priority_score: number;
}

export interface DashboardRadar {
  lead_id: string;
  lead_name: string;
  next_action: string;
}

export interface DashboardRisk {
  lead_id: string;
  lead_name: string;
  risk_reason: string;
  suggested_rescue: string;
}

export interface DashboardRecommendations {
  calls: string[];
  emails: string[];
  revivals: string[];
  followups: string[];
}

export interface DashboardIntelligenceData {
  id?: string;
  analyzed_at?: string;
  executive_summary: string;
  biggest_revenue_blocker: string;
  priorities: DashboardPriority[];
  opportunity_radar: DashboardRadar[];
  deal_risks: DashboardRisk[];
  ai_recommendations: DashboardRecommendations;
}