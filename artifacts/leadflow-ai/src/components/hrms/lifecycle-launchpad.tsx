

import { Link } from 'wouter';
import HRMSSidebarNav from '@/components/hrms/hrms-sidebar-nav';
import HRMSTopHeader from '@/components/hrms/hrms-top-header';
import { useHRMSRole } from '@/components/hrms/use-hrms-role';

type LaunchpadItem = {
  title: string;
  description: string;
  href?: string;
  cta?: string;
};

export default function LifecycleLaunchpad({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: LaunchpadItem[];
}) {
  const { role, loading } = useHRMSRole();
  const isEmployee = role === 'Employee';
  const actionableCount = items.filter((item) => Boolean(item.href)).length;

  if (!loading && isEmployee) {
    return (
      <div className="hrms-enterprise min-h-screen px-4 py-6 md:px-8 md:py-8">
        <HRMSSidebarNav />
        <div className="hrms-main-with-nav">
          <HRMSTopHeader
            title="Employee Access"
            subtitle="This workspace is for HR operations. Employee accounts can use self-service modules only."
          />
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.03),0_12px_30px_rgba(16,24,40,0.05)]">
              <p className="text-sm text-slate-600">Continue in your self-service hub to manage profile, attendance, leave, payroll, and onboarding details.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link to="/hrms/v2/self-service" className="hrms-btn hrms-btn-primary px-4 py-2 text-sm">Open Self-Service Hub</Link>
                <Link to="/hrms/v2/self-service/pre-onboarding" className="hrms-btn hrms-btn-secondary px-4 py-2 text-sm">Open Pre-Onboarding</Link>
              </div>
            </section>
        </div>
      </div>
    );
  }

  return (
    <div className="hrms-enterprise min-h-screen px-4 py-6 md:px-8 md:py-8">
      <HRMSSidebarNav />
      <div className="hrms-main-with-nav">
        <HRMSTopHeader title={title} subtitle={subtitle} />

        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <article className="hrms-kpi-card hrms-kpi-1">
            <h4>Total Steps</h4>
            <p>{items.length}</p>
          </article>
          <article className="hrms-kpi-card hrms-kpi-2">
            <h4>Actionable</h4>
            <p>{actionableCount}</p>
          </article>
          <article className="hrms-kpi-card hrms-kpi-4">
            <h4>Planned</h4>
            <p>{Math.max(items.length - actionableCount, 0)}</p>
          </article>
        </section>

        <section className="hrms-lifecycle-shell">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.03),0_12px_30px_rgba(16,24,40,0.05)]">
            {items[0]?.href ? (
              <Link to={items[0].href} className="hrms-btn hrms-btn-primary px-4 py-2 text-sm">
                {items[0].cta || 'Start Workflow'}
              </Link>
            ) : null}
            {items[1]?.href ? (
              <Link to={items[1].href} className="hrms-btn hrms-btn-secondary px-4 py-2 text-sm">
                {items[1].cta || 'Open Next Stage'}
              </Link>
            ) : null}
          </div>

          <div className="hrms-lifecycle-grid">
            <div className="hrms-lifecycle-column">
              <h3>Action Board</h3>
              <div className="hrms-lifecycle-card-grid">
                {items.map((item, index) => (
                  <article key={item.title} className="hrms-lifecycle-card">
                    <div className="hrms-lifecycle-step">Step {index + 1}</div>
                    <h4>{item.title}</h4>
                    <p>{item.description}</p>
                    {item.href ? (
                      <Link to={item.href} className="hrms-lifecycle-link">{item.cta || 'Open'}</Link>
                    ) : (
                      <span className="hrms-lifecycle-pill">Planned</span>
                    )}
                  </article>
                ))}
              </div>
            </div>

            <div className="hrms-lifecycle-column">
              <h3>Sequence</h3>
              <ol className="hrms-lifecycle-sequence">
                {items.map((item, index) => (
                  <li key={`${item.title}-sequence`}>
                    <span className="hrms-lifecycle-dot">{index + 1}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
