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

export async function createHomework(classId: string, formData: FormData) {
  const { supabase, schoolId, userId } = await requireTeacherOfClass(classId);

  const title = String(formData.get("title") || "").trim();
  const subject = String(formData.get("subject") || "").trim() || null;
  const description = String(formData.get("description") || "").trim() || null;
  const dueDate = String(formData.get("dueDate") || "") || null;

  if (!title) throw new Error("Title is required.");

  const { error } = await supabase.from("homework").insert({
    school_id: schoolId,
    class_id: classId,
    subject,
    title,
    description,
    due_date: dueDate,
    created_by: userId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/homework");
}

export async function deleteHomework(homeworkId: string, classId: string) {
  const { supabase } = await requireTeacherOfClass(classId);

  const { error } = await supabase
    .from("homework")
    .delete()
    .eq("id", homeworkId)
    .eq("class_id", classId);
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/homework");
}
