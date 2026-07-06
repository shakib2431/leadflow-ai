import SelfServiceClient from './self-service-client';
import HRMSSidebarNav from '@/components/hrms/hrms-sidebar-nav';
import HRMSTopHeader from '@/components/hrms/hrms-top-header';

export default function EmployeeSelfServicePage({ activeTab }: { activeTab?: string } = {}) {
  return (
    <main className="hrms-enterprise min-h-screen p-6">
      <HRMSSidebarNav />
      <div className="hrms-main-with-nav">
        <HRMSTopHeader
          title="Employee Self-Service"
          subtitle="Personal workspace for profile, attendance, leave, payroll, and onboarding actions."
        />
        <SelfServiceClient initialTab={activeTab || "overview"} />
      </div>
    </main>
  );
}
