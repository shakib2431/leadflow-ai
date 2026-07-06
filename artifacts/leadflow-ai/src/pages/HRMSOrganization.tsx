import LifecycleLaunchpad from '@/components/hrms/lifecycle-launchpad';

export default function OrganizationSetupPage() {
  return (
    <LifecycleLaunchpad
      title="Organization Setup"
      subtitle="Configure entities, branches, departments, designations, and payroll-ready master data."
      items={[
        {
          title: 'Core Organization Admin',
          description: 'Manage business entities, departments, designations, and hierarchy baselines.',
          href: '/hrms/v2/admin',
          cta: 'Open Organization Console',
        },
        {
          title: 'Role Matrix',
          description: 'Control access and responsibilities across HR, managers, and employees.',
          href: '/hrms/v2/roles',
          cta: 'Open Roles & Permissions',
        },
        {
          title: 'Template Library',
          description: 'Keep offer, appointment, contract, and policy templates in sync with legal standards.',
          href: '/hrms/v2/templates',
          cta: 'Open Templates',
        },
      ]}
    />
  );
}
