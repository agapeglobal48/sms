import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AttendanceClient from "./AttendanceClient";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; date?: string }>;
}) {
  const { classId: classIdParam, date: dateParam } = await searchParams;
  const date = dateParam || today();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user!.id)
    .single();

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

  const classId = classIdParam && classes.some((c) => c.id === classIdParam)
    ? classIdParam
    : classes[0].id;

  if (!classIdParam) {
    redirect(`/teacher/attendance?classId=${classId}&date=${date}`);
  }

  const [{ data: students }, { data: attendance }] = await Promise.all([
    supabase
      .from("students")
      .select("id, name, roll_no")
      .eq("class_id", classId)
      .order("roll_no", { ascending: true }),
    supabase
      .from("attendance")
      .select("student_id, status")
      .eq("class_id", classId)
      .eq("date", date),
  ]);

  const statusByStudent = new Map(
    (attendance ?? []).map((a) => [a.student_id, a.status])
  );

  const studentsWithStatus = (students ?? []).map((s) => ({
    ...s,
    status:
      (statusByStudent.get(s.id) as "present" | "absent" | "leave" | undefined) ??
      null,
  }));

  return (
    <div className="max-w-3xl mx-auto p-6">
      <AttendanceClient
        key={`${classId}-${date}`}
        classes={classes}
        classId={classId}
        date={date}
        students={studentsWithStatus}
        schoolId={profile!.school_id!}
        teacherId={user!.id}
      />
    </div>
  );
}
