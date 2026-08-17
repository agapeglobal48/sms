"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireTeacherOfClass(classId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "teacher") throw new Error("Teacher only.");

  const { data: klass } = await supabase
    .from("classes")
    .select("id, teacher_id, school_id")
    .eq("id", classId)
    .single();
  if (!klass || klass.teacher_id !== user.id) {
    throw new Error("You are not assigned to this class.");
  }

  return { supabase, schoolId: klass.school_id, userId: user.id };
}

export type MarksEntry = {
  studentId: string;
  first: number | null;
  mid: number | null;
  final: number | null;
};

export async function saveMarks(
  classId: string,
  subject: string,
  entries: MarksEntry[]
) {
  const cleanSubject = subject.trim();
  if (!cleanSubject) throw new Error("Subject name is required.");

  const { supabase, schoolId, userId } = await requireTeacherOfClass(classId);

  // Only allow writing marks for students who are actually in this class.
  const { data: studentsInClass } = await supabase
    .from("students")
    .select("id")
    .eq("class_id", classId);
  const validIds = new Set((studentsInClass ?? []).map((s) => s.id));

  const rows = entries
    .filter((e) => validIds.has(e.studentId))
    .map((e) => ({
      school_id: schoolId,
      student_id: e.studentId,
      subject: cleanSubject,
      first: e.first,
      mid: e.mid,
      final: e.final,
      updated_by: userId,
    }));

  if (rows.length === 0) return;

  const { error } = await supabase
    .from("marks")
    .upsert(rows, { onConflict: "student_id,subject" });
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/marks");
}
