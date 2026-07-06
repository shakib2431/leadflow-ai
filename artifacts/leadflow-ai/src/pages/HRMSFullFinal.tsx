import LifecycleLaunchpad from '@/components/hrms/lifecycle-launchpad';

export default function FullAndFinalPage() {
  return (
    <LifecycleLaunchpad
      title="Full & Final"
      subtitle="Consolidate payroll, leave encashment, deductions, and final settlement statements."
      items={[
        {
          title: 'Payroll Run Workspace',
          description: 'Use payroll controls to process final period and settlement components.',
          href: '/team/payroll',
          cta: 'Open Payroll Run',
        },
        {
          title: 'Compliance and Reporting',
          description: 'Review statutory and payout visibility before release.',
          href: '/hrms/v2/reports',
          cta: 'Open Reports',
        },
        {
          title: 'Post-Settlement Archive',
          description: 'Move employee to archived records and enable alumni access.',
          href: '/hrms/v2/alumni',
          cta: 'Open Alumni',
        },
      ]}
    />
  );
}
