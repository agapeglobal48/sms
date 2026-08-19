import { notFound } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Public, read-only asset lookup page — this is what a QR code sticker
 * links to. No login required (a staff member scanning with their own
 * phone camera won't have a session), so this uses the service role
 * client server-side to fetch just this one asset by its ID. The asset ID
 * is an unguessable UUID, so this is safe without making the whole assets
 * table publicly queryable — RLS on the `assets` table itself is untouched.
 */
export default async function PublicAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: asset } = await admin
    .from("assets")
    .select(
      "id, category, name, serial_key, os, classroom, quantity, publisher, purchase_date, allocation_date, image_url, school_id"
    )
    .eq("id", id)
    .single();

  if (!asset) notFound();

  const { data: school } = await admin
    .from("schools")
    .select("name")
    .eq("id", asset.school_id)
    .single();

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-surface rounded-2xl border border-line shadow-sm overflow-hidden">
        {asset.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.image_url}
            alt={asset.name}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-32 bg-brand flex items-center justify-center">
            <GraduationCap size={32} className="text-white/70" />
          </div>
        )}

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wide">
              {asset.category}
            </p>
            <h1 className="text-xl font-heading font-bold text-ink">{asset.name}</h1>
            <p className="text-sm text-muted">{school?.name ?? "Unknown school"}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm border-t border-line pt-4">
            <Info label="Serial / Batch Key" value={asset.serial_key} />
            <Info label="Classroom" value={asset.classroom} />
            <Info label="Quantity" value={asset.quantity?.toString()} />
            <Info label="OS" value={asset.os} />
            <Info label="Publisher" value={asset.publisher} />
            <Info label="Purchased" value={asset.purchase_date} />
            <Info label="Allocated" value={asset.allocation_date} />
          </div>

          <p className="text-xs text-muted border-t border-line pt-3">
            This is a public asset record from School SMS.
          </p>
        </div>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-ink font-medium">{value}</p>
    </div>
  );
}
