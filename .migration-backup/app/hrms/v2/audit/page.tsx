import LifecycleLaunchpad from '@/app/hrms/v2/components/lifecycle-launchpad';

export default function AuditPage() {
  return (
    <LifecycleLaunchpad
      title="Audit"
      subtitle="Review administrative actions and lifecycle transitions for compliance and control."
      items={[
        {
          title: 'Administration Logs',
          description: 'Review role changes, settings updates, and high-impact operations.',
          href: '/hrms/v2/admin',
          cta: 'Open Admin Logs',
        },
        {
          title: 'Payroll Governance',
          description: 'Track payroll preview, approvals, and cycle finalization actions.',
          href: '/team/payroll',
          cta: 'Open Payroll Timeline',
        },
        {
          title: 'Reporting Verification',
          description: 'Cross-check exports and summary snapshots used in leadership reporting.',
          href: '/hrms/v2/reports',
          cta: 'Open Reports',
        },
      ]}
    />
  );
}
