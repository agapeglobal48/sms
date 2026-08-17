export default function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
      <div>
        {eyebrow && (
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-heading font-bold text-ink relative inline-block pb-2">
          {title}
          <span className="absolute left-0 bottom-0 h-[3px] w-10 bg-gold rounded-full" />
        </h1>
      </div>
      {action}
    </div>
  );
}
