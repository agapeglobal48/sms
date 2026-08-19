"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireSchoolAdmin() {
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

  if (profile?.role !== "school_admin" || !profile.school_id) {
    throw new Error("School Admin only.");
  }

  return { supabase, schoolId: profile.school_id };
}

export async function createClass(formData: FormData) {
  const { supabase, schoolId } = await requireSchoolAdmin();

  const grade = Number(formData.get("grade"));
  const section = String(formData.get("section") || "").trim();
  const teacherId = String(formData.get("teacherId") || "") || null;

  if (!grade || !section) {
    throw new Error("Grade and section are required.");
  }

  const name = `Grade ${grade} - ${section}`;

  const { error } = await supabase.from("classes").insert({
    school_id: schoolId,
    grade,
    section,
    name,
    teacher_id: teacherId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/classes");
}

export async function updateClass(classId: string, formData: FormData) {
  const { supabase, schoolId } = await requireSchoolAdmin();

  const grade = Number(formData.get("grade"));
  const section = String(formData.get("section") || "").trim();
  const teacherId = String(formData.get("teacherId") || "") || null;

  if (!grade || !section) {
    throw new Error("Grade and section are required.");
  }

  const name = `Grade ${grade} - ${section}`;

  const { error } = await supabase
    .from("classes")
    .update({ grade, section, name, teacher_id: teacherId })
    .eq("id", classId)
    .eq("school_id", schoolId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/classes");
}

export async function deleteClass(classId: string) {
  const { supabase, schoolId } = await requireSchoolAdmin();

  const { error } = await supabase
    .from("classes")
    .delete()
    .eq("id", classId)
    .eq("school_id", schoolId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/classes");
}

export async function addSubjectAssignment(classId: string, formData: FormData) {
  const { supabase, schoolId } = await requireSchoolAdmin();

  const subject = String(formData.get("subject") || "").trim();
  const teacherId = String(formData.get("teacherId") || "");

  if (!subject || !teacherId) {
    throw new Error("Subject and teacher are both required.");
  }

  // Confirm the class actually belongs to this school before writing.
  const { data: klass } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("school_id", schoolId)
    .single();
  if (!klass) throw new Error("Class not found in your school.");

  const { error } = await supabase.from("subject_assignments").upsert(
    { school_id: schoolId, class_id: classId, subject, teacher_id: teacherId },
    { onConflict: "class_id,subject" }
  );
  if (error) throw new Error(error.message);

  revalidatePath("/admin/classes");
  revalidatePath("/teacher/classes");
}

export async function removeSubjectAssignment(assignmentId: string) {
  const { supabase, schoolId } = await requireSchoolAdmin();

  const { error } = await supabase
    .from("subject_assignments")
    .delete()
    .eq("id", assignmentId)
    .eq("school_id", schoolId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/classes");
  revalidatePath("/teacher/classes");
}
