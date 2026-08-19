import { createClient } from "@/lib/supabase/client";
import { getPendingAttendance, removePendingAttendance } from "./db";

export async function syncPendingAttendance(): Promise<{
  synced: number;
  failed: number;
}> {
  const pending = await getPendingAttendance();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  const supabase = createClient();
  let synced = 0;
  let failed = 0;

  for (const entry of pending) {
    const { error } = await supabase.from("attendance").upsert(
      {
        school_id: entry.schoolId,
        class_id: entry.classId,
        student_id: entry.studentId,
        date: entry.date,
        status: entry.status,
        marked_by: entry.markedBy,
      },
      { onConflict: "student_id,date" }
    );

    if (error) {
      failed++;
    } else {
      await removePendingAttendance(entry.key);
      synced++;
    }
  }

  return { synced, failed };
}
