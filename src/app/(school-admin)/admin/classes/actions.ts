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
