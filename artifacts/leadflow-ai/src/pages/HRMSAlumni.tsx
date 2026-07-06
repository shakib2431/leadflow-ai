import LifecycleLaunchpad from '@/components/hrms/lifecycle-launchpad';

export default function AlumniPage() {
  return (
    <LifecycleLaunchpad
      title="Alumni"
      subtitle="Provide controlled post-exit access to payslips, tax forms, and experience documents."
      items={[
        {
          title: 'Document Access Strategy',
          description: 'Plan secure, role-based alumni document retrieval paths.',
          href: '/hrms/v2/templates',
          cta: 'Open Templates',
        },
        {
          title: 'Payroll History Source',
          description: 'Use finalized payroll records as source for alumni compensation artifacts.',
          href: '/team/payroll',
          cta: 'Open Payroll',
        },
        {
          title: 'Experience and Relieving Letters',
          description: 'Manage post-exit letter generation and controlled downloads.',
          href: '/hrms/v2',
          cta: 'Open Employees',
        },
      ]}
    />
  );
}
