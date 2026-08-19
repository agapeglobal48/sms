import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MarksClient from "./MarksClient";
import { ensureDefaultComponents } from "./actions";

export default async function MarksPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; subject?: string }>;
}) {
  const { classId: classIdParam, subject: subjectParam } = await searchParams;

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

  type ClassOption = { id: string; name: string };
  const classesById = new Map<string, ClassOption>();
  for (const c of classTeacherOf ?? []) classesById.set(c.id, { id: c.id, name: c.name });
  for (const c of assignedClassInfo ?? []) {
    if (!classesById.has(c.id)) classesById.set(c.id, c);
  }
  const classes = Array.from(classesById.values()).sort((a, b) => a.name.localeCompare(b.name));

  if (classes.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
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

  const isClassTeacher = (classTeacherOf ?? []).some((c) => c.id === classId);
  const assignedSubjects = (subjectAssignments ?? [])
    .filter((a) => a.class_id === classId)
    .map((a) => a.subject)
    .sort();

  const restrictedToAssigned = assignedSubjects.length > 0;
  let subject = subjectParam ?? "";
  if (restrictedToAssigned && (!subject || !assignedSubjects.includes(subject))) {
    subject = assignedSubjects.length === 1 ? assignedSubjects[0] : "";
  }

  if (!classIdParam || (restrictedToAssigned && subjectParam !== subject)) {
    redirect(`/teacher/marks?classId=${classId}&subject=${encodeURIComponent(subject)}`);
  }

  if (!restrictedToAssigned && !isClassTeacher) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-sm text-muted">
          You are not assigned to teach any subject for this class.
        </p>
      </div>
    );
  }

  let subjectOptions = assignedSubjects;
  if (!restrictedToAssigned) {
    const { data: allComponentsForClass } = await supabase
      .from("assessment_components")
      .select("subject")
      .eq("class_id", classId);
    subjectOptions = Array.from(
      new Set((allComponentsForClass ?? []).map((c) => c.subject))
    ).sort();
  }

  const students0 = await supabase
    .from("students")
    .select("id, name, roll_no")
    .eq("class_id", classId)
    .order("roll_no", { ascending: true });
  const students = students0.data ?? [];

  if (subject) {
    await ensureDefaultComponents(classId, subject);
  }

  let components: {
    id: string;
    name: string;
    weight: number;
    included: boolean;
    is_default: boolean;
    sort_order: number;
  }[] = [];
  let entriesByKey = new Map<string, number | null>();

  if (subject) {
    const { data: componentsData } = await supabase
      .from("assessment_components")
      .select("id, name, weight, included, is_default, sort_order")
      .eq("class_id", classId)
      .eq("subject", subject)
      .order("sort_order", { ascending: true });
    components = componentsData ?? [];

    const studentIds = students.map((s) => s.id);
    const componentIds = components.map((c) => c.id);

    if (studentIds.length && componentIds.length) {
      const { data: entries } = await supabase
        .from("mark_entries")
        .select("student_id, component_id, score")
        .in("student_id", studentIds)
        .in("component_id", componentIds);

      entriesByKey = new Map(
        (entries ?? []).map((e) => [`${e.student_id}:${e.component_id}`, e.score])
      );
    }
  }

  const studentsWithScores = students.map((s) => ({
    id: s.id,
    name: s.name,
    roll_no: s.roll_no,
    scores: Object.fromEntries(
      components.map((c) => [c.id, entriesByKey.get(`${s.id}:${c.id}`) ?? null])
    ),
  }));

  return (
    <div className="max-w-4xl mx-auto p-6">
      <MarksClient
        key={`${classId}-${subject}`}
        classes={classes}
        classId={classId}
        subject={subject}
        subjectOptions={subjectOptions}
        restrictedToAssigned={restrictedToAssigned}
        components={components}
        students={studentsWithScores}
      />
    </div>
  );
}
