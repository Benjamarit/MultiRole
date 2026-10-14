export default function PageHeader({ title, subtitle, description, badge, action }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
          {badge}
        </div>
        {subtitle && (
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-blue-600">
            {subtitle}
          </p>
        )}
        {description && (
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}