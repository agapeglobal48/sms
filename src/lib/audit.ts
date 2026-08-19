import { createAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/types/database";

export async function logAudit(entry: {
  actorId: string;
  actorName: string;
  actorRole: Role;
  action: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  schoolId?: string | null;
  details?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  // Best-effort — a logging failure should never block the actual action.
  await admin.from("audit_logs").insert({
    actor_id: entry.actorId,
    actor_name: entry.actorName,
    actor_role: entry.actorRole,
    action: entry.action,
    target_type: entry.targetType ?? null,
    target_id: entry.targetId ?? null,
    target_label: entry.targetLabel ?? null,
    school_id: entry.schoolId ?? null,
    details: entry.details ?? null,
  });
}
