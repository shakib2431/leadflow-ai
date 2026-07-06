import LifecycleLaunchpad from '@/app/hrms/v2/components/lifecycle-launchpad';

export default function SeparationPage() {
  return (
    <LifecycleLaunchpad
      title="Separation"
      subtitle="Initialize resignation, notice period tracking, and manager/HR separation tasks."
      items={[
        {
          title: 'Current Workforce',
          description: 'Start separation actions from active employee records.',
          href: '/hrms/v2',
          cta: 'Open Employees',
        },
        {
          title: 'Attendance and Leave Context',
          description: 'Review attendance and leave before final separation decisions.',
          href: '/team/attendance',
          cta: 'Open Attendance',
        },
        {
          title: 'Payroll Readiness',
          description: 'Prepare records required for final settlement and compliance.',
          href: '/team/payroll',
          cta: 'Open Payroll',
        },
      ]}
    />
  );
}
