export interface Stakeholder {
  name: string;
  role: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'unknown';
}

export interface RelationshipIntelligenceData {
  id?: string;
  lead_id: string;
  champion: string;
  decision_maker: string;
  economic_buyer: string;
  relationship_strength: number; 
  buying_intent: number; 
  trust_score: number; 
  engagement_trend: 'Improving' | 'Stable' | 'Declining' | 'Dead';
  primary_objection: string;
  secondary_objection: string;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  missing_information: string[];
  stakeholders: Stakeholder[];
  next_relationship_action: string;
  last_analyzed_at?: string;
}