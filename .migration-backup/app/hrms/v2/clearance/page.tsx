import LifecycleLaunchpad from '@/app/hrms/v2/components/lifecycle-launchpad';

export default function ClearancePage() {
  return (
    <LifecycleLaunchpad
      title="Clearance"
      subtitle="Track department-wise handover and asset/document clearances before exit closure."
      items={[
        {
          title: 'Onboarding Assets Trail',
          description: 'Use onboarding and employee records to verify assigned assets during return.',
          href: '/team/onboarding',
          cta: 'Open Onboarding Records',
        },
        {
          title: 'HR Checklist',
          description: 'Validate documents, handover notes, and policy acknowledgements.',
          href: '/hrms/v2/templates',
          cta: 'Open Templates',
        },
        {
          title: 'Final Payroll Input',
          description: 'Push completed clearance details into full-and-final calculations.',
          href: '/hrms/v2/full-and-final',
          cta: 'Open Full & Final',
        },
      ]}
    />
  );
}
