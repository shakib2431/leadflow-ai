

type HRMSTopHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

export default function HRMSTopHeader({ title, subtitle, actions }: HRMSTopHeaderProps) {
  return (
    <header className="hrms-top-header">
      <div className="min-w-0">
        <h1 className="hrms-top-header-title">{title}</h1>
        {subtitle ? <p className="hrms-top-header-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="hrms-top-actions">{actions}</div> : null}
    </header>
  );
}

