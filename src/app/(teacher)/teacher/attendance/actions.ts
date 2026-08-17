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
    .select("role, school_id")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "teacher" || !profile.school_id) {
    throw new Error("Teacher only.");
  }

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

export async function setAttendance(
  studentId: string,
  classId: string,
  date: string,
  status: "present" | "absent" | "leave"
) {
  const { supabase, schoolId, userId } = await requireTeacherOfClass(classId);

  // Confirm the student is actually in this class before writing.
  const { data: student } = await supabase
    .from("students")
    .select("id, class_id")
    .eq("id", studentId)
    .single();
  if (!student || student.class_id !== classId) {
    throw new Error("Student not found in this class.");
  }

  const { error } = await supabase.from("attendance").upsert(
    {
      school_id: schoolId,
      class_id: classId,
      student_id: studentId,
      date,
      status,
      marked_by: userId,
    },
    { onConflict: "student_id,date" }
  );
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/attendance");
}
