export type OnboardingTask = {
  id: 'contract' | 'id' | 'handbook';
  title: string;
  status: 'action_required' | 'sending' | 'sent' | 'pending_employee' | 'completed';
  type: 'send_doc' | 'upload' | 'review';
};

export type OnboardingChecklistState = {
  tasks: OnboardingTask[];
  offer?: {
    status?: 'pending' | 'offer_sent' | 'awaiting_signature' | 'signed' | 'declined';
    sent_at?: string | null;
    signed_at?: string | null;
    declined_at?: string | null;
  } | null;
  pre_onboarding?: {
    status?: 'submitted' | 'reviewed';
    submitted_at?: string | null;
    hr_reviewed_at?: string | null;
    link_sent?: boolean;
    link_sent_at?: string | null;
    form?: Record<string, any> & {
      documents?: Array<{
        id: string;
        file_name: string;
        uploaded_at: string;
        document_type?: string;
      }>;
    };
  } | null;
  onboarding_handoff?: {
    stage?: string;
    marked_at?: string;
  } | null;
};

export function buildDefaultOnboardingTasks(status: string): OnboardingTask[] {
  if (status === 'active') {
    return [
      { id: 'contract', title: 'Sign Employment Contract', status: 'completed', type: 'send_doc' },
      { id: 'id', title: 'Upload Government ID', status: 'completed', type: 'upload' },
      { id: 'handbook', title: 'Review Employee Handbook', status: 'completed', type: 'review' },
    ];
  }

  return [
    { id: 'contract', title: 'Sign Employment Contract', status: 'action_required', type: 'send_doc' },
    { id: 'id', title: 'Upload Government ID', status: 'pending_employee', type: 'upload' },
    { id: 'handbook', title: 'Review Employee Handbook', status: 'pending_employee', type: 'review' },
  ];
}

export function normalizeOnboardingChecklist(raw: unknown, status = 'onboarding'): OnboardingChecklistState {
  const defaults = buildDefaultOnboardingTasks(status);

  if (Array.isArray(raw)) {
    return { tasks: raw as OnboardingTask[], offer: null, pre_onboarding: null, onboarding_handoff: null };
  }

  if (!raw || typeof raw !== 'object') {
    return { tasks: defaults, offer: null, pre_onboarding: null, onboarding_handoff: null };
  }

  const value = raw as Record<string, any>;
  const tasks = Array.isArray(value.tasks) ? (value.tasks as OnboardingTask[]) : defaults;

  return {
    tasks,
    offer: value.offer || null,
    pre_onboarding: value.pre_onboarding || null,
    onboarding_handoff: value.onboarding_handoff || null,
  };
}

export function buildOnboardingChecklistState(status: string): OnboardingChecklistState {
  return {
    tasks: buildDefaultOnboardingTasks(status),
    offer: null,
    pre_onboarding: null,
    onboarding_handoff: null,
  };
}
