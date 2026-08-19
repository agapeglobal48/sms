import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RemarksClient from "./RemarksClient";

export default async function RemarksPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const { classId: classIdParam } = await searchParams;

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
      .select("class_id")
      .eq("teacher_id", user!.id),
  ]);

  const assignedClassIds = Array.from(
    new Set((subjectAssignments ?? []).map((a) => a.class_id))
  );
  const { data: assignedClassInfo } = assignedClassIds.length
    ? await supabase.from("classes").select("id, name").in("id", assignedClassIds)
    : { data: [] as { id: string; name: string }[] };

  const classesById = new Map<string, { id: string; name: string }>();
  for (const c of classTeacherOf ?? []) classesById.set(c.id, c);
  for (const c of assignedClassInfo ?? []) {
    if (!classesById.has(c.id)) classesById.set(c.id, c);
  }
  const classes = Array.from(classesById.values()).sort((a, b) => a.name.localeCompare(b.name));

  if (classes.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-sm text-muted">
          You haven&apos;t been assigned to any classes yet.
        </p>
      </div>
    );
  }

  const classId =
    classIdParam && classes.some((c) => c.id === classIdParam)
      ? classIdParam
      : classes[0].id;

  if (!classIdParam) {
    redirect(`/teacher/remarks?classId=${classId}`);
  }

  const { data: students } = await supabase
    .from("students")
    .select("id, name, roll_no")
    .eq("class_id", classId)
    .order("roll_no", { ascending: true });

  const studentIds = (students ?? []).map((s) => s.id);
  const { data: remarks } = studentIds.length
    ? await supabase
        .from("student_remarks")
        .select("id, student_id, remark, created_at")
        .in("student_id", studentIds)
        .order("created_at", { ascending: false })
    : { data: [] as { id: string; student_id: string; remark: string; created_at: string }[] };

  const remarksByStudent = new Map<string, { id: string; remark: string; created_at: string }[]>();
  for (const r of remarks ?? []) {
    const list = remarksByStudent.get(r.student_id) ?? [];
    list.push({ id: r.id, remark: r.remark, created_at: r.created_at });
    remarksByStudent.set(r.student_id, list);
  }

  const studentsWithRemarks = (students ?? []).map((s) => ({
    ...s,
    remarks: remarksByStudent.get(s.id) ?? [],
  }));

  return (
    <div className="max-w-3xl mx-auto p-6">
      <RemarksClient
        key={classId}
        classes={classes}
        classId={classId}
        students={studentsWithRemarks}
      />
    </div>
  );
}
