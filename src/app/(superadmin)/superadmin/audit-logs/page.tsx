import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/shared/PageHeader";

const ACTION_LABELS: Record<string, string> = {
  school_created: "Created school",
  school_updated: "Updated school",
  school_deleted: "Deleted school",
  school_admin_updated: "Updated School Admin",
  teacher_created: "Created teacher",
  teacher_updated: "Updated teacher",
  teacher_deleted: "Removed teacher",
  asset_created: "Created asset",
  asset_updated: "Updated asset",
  asset_delete_requested: "Requested asset deletion",
  asset_delete_request_cancelled: "Cancelled asset deletion request",
  asset_delete_approved: "Approved asset deletion",
  asset_delete_rejected: "Rejected asset deletion",
  credential_viewed: "Viewed login email",
  credential_reset: "Reset login credentials",
};

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ before?: string }>;
}) {
  const { before } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("audit_logs")
    .select(
      "id, actor_name, actor_role, action, target_type, target_label, school_id, details, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (before) query = query.lt("created_at", before);

  const { data: logs } = await query;

  const { data: schools } = await supabase.from("schools").select("id, name");
  const schoolName = (id: string | null) =>
    id ? (schools ?? []).find((s) => s.id === id)?.name ?? "—" : "—";

  const oldestTimestamp =
    logs && logs.length > 0 ? logs[logs.length - 1].created_at : null;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <PageHeader eyebrow="Oversight" title="Audit Logs" />

      <div className="bg-surface rounded-xl border border-line overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-line">
              <th className="p-3 font-medium">When</th>
              <th className="p-3 font-medium">Who</th>
              <th className="p-3 font-medium">Action</th>
              <th className="p-3 font-medium">Target</th>
              <th className="p-3 font-medium">School</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(!logs || logs.length === 0) && (
              <tr>
                <td colSpan={5} className="p-5 text-muted">
                  No activity logged yet.
                </td>
              </tr>
            )}
            {(logs ?? []).map((log) => (
              <tr key={log.id}>
                <td className="p-3 text-muted whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="p-3 text-ink">
                  {log.actor_name ?? "—"}
                  <span className="text-muted text-xs ml-1">
                    ({log.actor_role ?? "—"})
                  </span>
                </td>
                <td className="p-3 text-ink">
                  {ACTION_LABELS[log.action] ?? log.action}
                </td>
                <td className="p-3 text-muted">
                  {log.target_label ?? log.target_type ?? "—"}
                </td>
                <td className="p-3 text-muted">{schoolName(log.school_id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {logs && logs.length === 100 && oldestTimestamp && (
        <div className="mt-4">
          <Link
            href={`/superadmin/audit-logs?before=${encodeURIComponent(oldestTimestamp)}`}
            className="text-sm text-brand-light hover:text-brand font-medium"
          >
            Load older entries →
          </Link>
        </div>
      )}
    </div>
  );
}
