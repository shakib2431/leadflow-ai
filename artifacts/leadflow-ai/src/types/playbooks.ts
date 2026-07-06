export interface PlaybookStep {
  id: string; // Temp ID for UI state
  step_order: number;
  channel: 'email' | 'whatsapp' | 'linkedin';
  ai_prompt_context: string;
  wait_time_hours: number;
}

export interface Playbook {
  id?: string;
  name: string;
  objective: string;
  is_active: boolean;
  steps: PlaybookStep[];
}