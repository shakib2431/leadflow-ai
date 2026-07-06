import LifecycleLaunchpad from '@/components/hrms/lifecycle-launchpad';

export default function RolesPermissionsPage() {
  return (
    <LifecycleLaunchpad
      title="Roles & Permissions"
      subtitle="Define access controls for HR admins, HR executives, managers, and employees."
      items={[
        {
          title: 'Role Permission Matrix',
          description: 'Adjust permissions for employee, onboarding, payroll, and reporting actions.',
          href: '/hrms/v2/admin',
          cta: 'Open Role Matrix',
        },
        {
          title: 'Self-Service Boundaries',
          description: 'Ensure employee-only modules remain isolated from HR administrative actions.',
          href: '/hrms/v2/self-service',
          cta: 'View Self-Service',
        },
        {
          title: 'Audit Trail',
          description: 'Track permission changes and administrative actions for governance.',
          href: '/hrms/v2/audit',
          cta: 'Open Audit',
        },
      ]}
    />
  );
}
