import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function TeacherClassesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: classTeacherOf }, { data: subjectAssignments }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name")
      .eq("teacher_id", user!.id)
      .order("name", { ascending: true }),
    supabase
      .from("subject_assignments")
      .select("class_id, subject")
      .eq("teacher_id", user!.id),
  ]);

  const assignedClassIds = Array.from(
    new Set((subjectAssignments ?? []).map((a) => a.class_id))
  );
  const { data: assignedClassInfo } = assignedClassIds.length
    ? await supabase.from("classes").select("id, name").in("id", assignedClassIds)
    : { data: [] as { id: string; name: string }[] };
  const classInfoById = new Map((assignedClassInfo ?? []).map((c) => [c.id, c]));

  type Row = { id: string; name: string; isClassTeacher: boolean; subjects: string[] };
  const rowsById = new Map<string, Row>();

  for (const c of classTeacherOf ?? []) {
    rowsById.set(c.id, { id: c.id, name: c.name, isClassTeacher: true, subjects: [] });
  }
  for (const a of subjectAssignments ?? []) {
    const info = classInfoById.get(a.class_id);
    if (!info) continue;
    const existing = rowsById.get(info.id);
    if (existing) {
      existing.subjects.push(a.subject);
    } else {
      rowsById.set(info.id, {
        id: info.id,
        name: info.name,
        isClassTeacher: false,
        subjects: [a.subject],
      });
    }
  }

  const rows = Array.from(rowsById.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-ink">My Classes</h1>

      {rows.length === 0 && (
        <p className="text-sm text-muted">
          You haven&apos;t been assigned to any classes yet. Ask your School
          Admin to assign you as a class teacher or a subject teacher.
        </p>
      )}

      <div className="bg-surface rounded-xl border border-line divide-y divide-line">
        {rows.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-4 flex-wrap gap-2">
            <div>
              <p className="font-medium text-ink">
                {c.name}
                {c.isClassTeacher && (
                  <span className="ml-2 inline-block rounded-full bg-gold-soft text-gold text-xs font-medium px-2 py-0.5 align-middle">
                    Class Teacher
                  </span>
                )}
              </p>
              {c.subjects.length > 0 && (
                <p className="text-sm text-muted">Teaches: {c.subjects.join(", ")}</p>
              )}
            </div>
            <div className="flex gap-4 text-sm font-medium">
              <Link
                href={`/teacher/attendance?classId=${c.id}`}
                className="text-brand-light hover:text-brand"
              >
                Attendance
              </Link>
              <Link
                href={`/teacher/homework?classId=${c.id}`}
                className="text-brand-light hover:text-brand"
              >
                Homework
              </Link>
              <Link
                href={`/teacher/marks?classId=${c.id}`}
                className="text-brand-light hover:text-brand"
              >
                Marks
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
