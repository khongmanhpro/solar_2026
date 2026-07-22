interface AdminPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: AdminPageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-5 border-b border-[var(--line-strong)] pb-7 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand)]">
          {eyebrow}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-[var(--ink)] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          {description}
        </p>
      </div>
      {action}
    </header>
  );
}
