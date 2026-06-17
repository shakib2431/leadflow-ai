export interface AIDraftPayload {
  message_copy?: string;
  negotiation_points?: string[];
  blocker_warning?: string;
}

export interface CRMTodo {
  id: string;
  lead_id: string;
  title: string;
  description: string;
  priority_score: number;
  task_type: 'whatsapp' | 'email' | 'call' | 'revival' | 'admin';
  status: 'pending' | 'completed' | 'skipped';
  ai_draft_payload: AIDraftPayload;
  due_date: string;
  created_at: string;
  leads?: {
    full_name: string;
    phone: string;
    email: string;
    status: string;
  };
}