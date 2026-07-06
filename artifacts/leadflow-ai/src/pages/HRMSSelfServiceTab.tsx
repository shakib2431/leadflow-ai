import { useParams } from "wouter";
import HRMSSelfService from './HRMSSelfService';

type TabParam = 'overview' | 'pre-onboarding' | 'profile' | 'attendance' | 'leave' | 'calendar' | 'payroll' | 'work-mode';

export default function EmployeeSelfServiceTabPage() {
  const { tab } = useParams<{ tab: string }>();
  const safeTab: TabParam =
    tab === 'pre-onboarding' ||
    tab === 'profile' ||
    tab === 'attendance' ||
    tab === 'leave' ||
    tab === 'calendar' ||
    tab === 'payroll' ||
    tab === 'work-mode'
      ? (tab as TabParam)
      : 'overview';

  // Render the HRMSSelfService page, passing the tab as a prop
  return <HRMSSelfService activeTab={safeTab} />;
}
