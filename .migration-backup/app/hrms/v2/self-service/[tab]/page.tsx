import SelfServiceClient from '../self-service-client';
import HRMSSidebarNav from '@/app/hrms/v2/components/hrms-sidebar-nav';
import HRMSTopHeader from '@/app/hrms/v2/components/hrms-top-header';

type TabParam = 'overview' | 'pre-onboarding' | 'profile' | 'attendance' | 'leave' | 'calendar' | 'payroll' | 'work-mode';

export default async function EmployeeSelfServiceTabPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  const safeTab: TabParam =
    tab === 'pre-onboarding' ||
    tab === 'profile' ||
    tab === 'attendance' ||
    tab === 'leave' ||
    tab === 'calendar' ||
    tab === 'payroll' ||
    tab === 'work-mode'
      ? tab
      : 'overview';

  return (
    <main className="hrms-enterprise min-h-screen p-6">
      <HRMSSidebarNav />
      <div className="hrms-main-with-nav">
        <HRMSTopHeader
          title="Employee Self-Service"
          subtitle="Personal workspace for profile, attendance, leave, payroll, and onboarding actions."
        />
        <SelfServiceClient initialTab={safeTab} />
      </div>
    </main>
  );
}