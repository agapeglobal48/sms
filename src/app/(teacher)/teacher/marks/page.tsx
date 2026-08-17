import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MarksClient from "./MarksClient";

export default async function MarksPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; subject?: string }>;
}) {
  const { classId: classIdParam, subject: subjectParam } = await searchParams;
  const subject = subjectParam ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("teacher_id", user!.id)
    .order("name", { ascending: true });

  if (!classes || classes.length === 0) {
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
    redirect(`/teacher/marks?classId=${classId}&subject=${subject}`);
  }

  const { data: students } = await supabase
    .from("students")
    .select("id, name, roll_no")
    .eq("class_id", classId)
    .order("roll_no", { ascending: true });

  const studentIds = (students ?? []).map((s) => s.id);

  // Every subject ever entered for students in this class, so the teacher
  // gets autocomplete instead of retyping subject names each time.
  const { data: allMarksForClass } = studentIds.length
    ? await supabase.from("marks").select("subject").in("student_id", studentIds)
    : { data: [] as { subject: string }[] };

  const subjectOptions = Array.from(
    new Set((allMarksForClass ?? []).map((m) => m.subject))
  ).sort();

  let marksBySudent = new Map<
    string,
    { first: number | null; mid: number | null; final: number | null }
  >();

  if (subject && studentIds.length) {
    const { data: marks } = await supabase
      .from("marks")
      .select("student_id, first, mid, final")
      .eq("subject", subject)
      .in("student_id", studentIds);

    marksBySudent = new Map(
      (marks ?? []).map((m) => [
        m.student_id,
        { first: m.first, mid: m.mid, final: m.final },
      ])
    );
  }

  const studentsWithMarks = (students ?? []).map((s) => ({
    ...s,
    first: marksBySudent.get(s.id)?.first ?? null,
    mid: marksBySudent.get(s.id)?.mid ?? null,
    final: marksBySudent.get(s.id)?.final ?? null,
  }));

  return (
    <div className="max-w-3xl mx-auto p-6">
      <MarksClient
        classes={classes}
        classId={classId}
        subject={subject}
        subjectOptions={subjectOptions}
        students={studentsWithMarks}
      />
    </div>
  );
}
