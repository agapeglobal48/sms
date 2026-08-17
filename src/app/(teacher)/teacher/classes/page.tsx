import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function TeacherClassesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("teacher_id", user!.id)
    .order("name", { ascending: true });

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-ink">My Classes</h1>

      {(!classes || classes.length === 0) && (
        <p className="text-sm text-muted">
          You haven&apos;t been assigned to any classes yet. Ask your School
          Admin to assign you to a class.
        </p>
      )}

      <div className="bg-surface rounded-xl border border-line divide-y divide-line">
        {(classes ?? []).map((c) => (
          <div key={c.id} className="flex items-center justify-between p-4">
            <p className="font-medium text-ink">{c.name}</p>
            <div className="flex gap-4 text-sm font-medium">
              <Link
                href={`/teacher/attendance?classId=${c.id}`}
                className="text-brand-light hover:text-brand"
              >
                Attendance
              </Link>
              <Link
                href={`/teacher/marks?classId=${c.id}`}
                className="text-brand-light hover:text-brand"
              >
                Marks
              </Link>
              <Link
                href={`/teacher/homework?classId=${c.id}`}
                className="text-brand-light hover:text-brand"
              >
                Homework
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
