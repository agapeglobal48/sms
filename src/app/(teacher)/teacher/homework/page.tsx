import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HomeworkClient from "./HomeworkClient";

export default async function HomeworkPage({
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
    redirect(`/teacher/homework?classId=${classId}`);
  }

  const { data: homework } = await supabase
    .from("homework")
    .select("id, subject, title, description, due_date, created_at")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });

  const homeworkIds = (homework ?? []).map((h) => h.id);
  const { data: completions } = homeworkIds.length
    ? await supabase
        .from("homework_completions")
        .select("homework_id, student_id, completed_at")
        .in("homework_id", homeworkIds)
    : { data: [] as { homework_id: string; student_id: string; completed_at: string }[] };

  const studentIds = Array.from(new Set((completions ?? []).map((c) => c.student_id)));
  const { data: studentsForNames } = studentIds.length
    ? await supabase.from("students").select("id, name").in("id", studentIds)
    : { data: [] as { id: string; name: string }[] };
  const studentNameById = new Map((studentsForNames ?? []).map((s) => [s.id, s.name]));

  const completionsByHomeworkId = new Map<string, { name: string; completedAt: string }[]>();
  for (const c of completions ?? []) {
    const list = completionsByHomeworkId.get(c.homework_id) ?? [];
    list.push({
      name: studentNameById.get(c.student_id) ?? "Unknown student",
      completedAt: c.completed_at,
    });
    completionsByHomeworkId.set(c.homework_id, list);
  }

  const homeworkWithCompletions = (homework ?? []).map((h) => ({
    ...h,
    completions: completionsByHomeworkId.get(h.id) ?? [],
  }));

  return (
    <div className="max-w-3xl mx-auto p-6">
      <HomeworkClient
        key={classId}
        classes={classes}
        classId={classId}
        homework={homeworkWithCompletions}
      />
    </div>
  );
}
