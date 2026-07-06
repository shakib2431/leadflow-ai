import LifecycleLaunchpad from '@/components/hrms/lifecycle-launchpad';

export default function HRMSSettingsPage() {
  return (
    <LifecycleLaunchpad
      title="Settings"
      subtitle="Global HRMS policy controls for attendance, payroll, compliance, and operating defaults."
      items={[
        {
          title: 'Administration Console',
          description: 'Use existing admin APIs and controls for core platform setup.',
          href: '/hrms/v2/admin',
          cta: 'Open Admin Console',
        },
        {
          title: 'Payroll Controls',
          description: 'Manage payroll cycle, approval checkpoints, and compliance baselines.',
          href: '/team/payroll',
          cta: 'Open Payroll Settings',
        },
        {
          title: 'Reporting Controls',
          description: 'Set reporting filters, export defaults, and operational visibility standards.',
          href: '/hrms/v2/reports',
          cta: 'Open Reporting Center',
        },
      ]}
    />
  );
}
