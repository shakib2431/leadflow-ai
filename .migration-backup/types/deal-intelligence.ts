export interface DealIntelligenceData {
  id?: string;
  lead_id: string;
  deal_value: number;
  win_probability: number; // 0-100
  expected_close_date: string; // YYYY-MM-DD
  forecast_category: 'Commit' | 'Best Case' | 'Pipeline' | 'At Risk' | 'Lost Likely';
  deal_risk: 'Low' | 'Medium' | 'High' | 'Critical';
  confidence_score: number; // 0-100
  revenue_contribution: number;
  pipeline_impact: number;
  momentum_score: number; // 0-100
  stakeholder_alignment: number; // 0-100
  engagement_score: number; // 0-100
  key_risks: string[];
  positive_signals: string[];
  recommended_actions: string[];
  executive_forecast: string;
  last_analyzed_at?: string;
  updated_at?: string;
}