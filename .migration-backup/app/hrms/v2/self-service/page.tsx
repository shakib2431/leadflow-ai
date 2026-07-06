import SelfServiceClient from './self-service-client';
import HRMSSidebarNav from '@/app/hrms/v2/components/hrms-sidebar-nav';
import HRMSTopHeader from '@/app/hrms/v2/components/hrms-top-header';

export default function EmployeeSelfServicePage() {
  return (
    <main className="hrms-enterprise min-h-screen p-6">
      <HRMSSidebarNav />
      <div className="hrms-main-with-nav">
        <HRMSTopHeader
          title="Employee Self-Service"
          subtitle="Personal workspace for profile, attendance, leave, payroll, and onboarding actions."
        />
        <SelfServiceClient initialTab="overview" />
      </div>
    </main>
  );
}
