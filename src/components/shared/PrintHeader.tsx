export default function PrintHeader({
  schoolName,
  address,
  logoUrl,
}: {
  schoolName: string;
  address?: string | null;
  logoUrl?: string | null;
}) {
  return (
    <div className="hidden print:flex items-center gap-3 border-b border-line pb-3 mb-4">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={schoolName}
          className="w-10 h-10 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center text-white font-heading font-bold text-lg shrink-0">
          {schoolName?.[0]?.toUpperCase() ?? "S"}
        </div>
      )}
      <div>
        <p className="font-heading font-bold text-ink">{schoolName}</p>
        {address && <p className="text-xs text-muted">{address}</p>}
      </div>
    </div>
  );
}
