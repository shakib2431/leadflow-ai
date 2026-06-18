export interface Lead {
  id: string;
  full_name: string;
  email: string;
  pipeline_stage: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won';
  portal_token: string;
  manager_name?: string;
  expected_delivery?: string;
}

export interface Deliverable {
  id: string;
  lead_id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  lead_id: string;
  title: string;
  description: string;
  author: string;
  created_at: string;
}