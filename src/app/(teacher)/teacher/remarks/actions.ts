"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notifyParentsOfStudent } from "@/lib/notifications";

async function requireAssignedToClass(classId: string) {
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
  if (profile?.role !== "teacher") throw new Error("Teacher only.");

  const { data: klass } = await supabase
    .from("classes")
    .select("id, teacher_id, school_id")
    .eq("id", classId)
    .single();
  if (!klass) throw new Error("Class not found.");

  const isClassTeacher = klass.teacher_id === user.id;
  let hasSubjectAssignment = false;
  if (!isClassTeacher) {
    const { data: assignment } = await supabase
      .from("subject_assignments")
      .select("id")
      .eq("class_id", classId)
      .eq("teacher_id", user.id)
      .limit(1)
      .maybeSingle();
    hasSubjectAssignment = Boolean(assignment);
  }

  if (!isClassTeacher && !hasSubjectAssignment) {
    throw new Error("You are not assigned to this class.");
  }

  return { supabase, schoolId: klass.school_id, userId: user.id };
}

export async function addRemark(classId: string, studentId: string, formData: FormData) {
  const { supabase, schoolId, userId } = await requireAssignedToClass(classId);

  const remark = String(formData.get("remark") || "").trim();
  if (!remark) throw new Error("Remark cannot be empty.");

  const { data: student } = await supabase
    .from("students")
    .select("id, class_id")
    .eq("id", studentId)
    .single();
  if (!student || student.class_id !== classId) {
    throw new Error("Student not found in this class.");
  }

  const { error } = await supabase.from("student_remarks").insert({
    school_id: schoolId,
    student_id: studentId,
    class_id: classId,
    teacher_id: userId,
    remark,
  });
  if (error) throw new Error(error.message);

  await notifyParentsOfStudent(supabase, {
    schoolId,
    studentId,
    type: "remark",
    title: "New remark from teacher",
    message: remark,
  });

  revalidatePath("/teacher/remarks");
}

export async function deleteRemark(remarkId: string, classId: string) {
  const { supabase } = await requireAssignedToClass(classId);

  const { error } = await supabase
    .from("student_remarks")
    .delete()
    .eq("id", remarkId)
    .eq("class_id", classId);
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/remarks");
}
