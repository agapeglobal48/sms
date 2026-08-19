"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireParentOfStudent(studentId: string) {
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
  if (profile?.role !== "parent") throw new Error("Parent only.");

  const { data: link } = await supabase
    .from("parent_student_links")
    .select("student_id")
    .eq("parent_id", user.id)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!link) throw new Error("This is not one of your linked children.");

  return { supabase, userId: user.id };
}

export async function markHomeworkComplete(
  homeworkId: string,
  studentId: string,
  formData: FormData
) {
  const { supabase, userId } = await requireParentOfStudent(studentId);

  const file = formData.get("photo") as File | null;
  let photoUrl: string | null = null;

  if (file && file.size > 0) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${studentId}/${homeworkId}-${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("homework-photos")
      .upload(path, file);
    if (uploadError) throw new Error(uploadError.message);
    const { data } = supabase.storage.from("homework-photos").getPublicUrl(path);
    photoUrl = data.publicUrl;
  }

  const { error } = await supabase.from("homework_completions").upsert(
    {
      homework_id: homeworkId,
      student_id: studentId,
      completed_by: userId,
      ...(photoUrl ? { photo_url: photoUrl } : {}),
      completed_at: new Date().toISOString(),
    },
    { onConflict: "homework_id,student_id" }
  );
  if (error) throw new Error(error.message);

  revalidatePath("/parent");
}

export async function unmarkHomeworkComplete(homeworkId: string, studentId: string) {
  const { supabase } = await requireParentOfStudent(studentId);

  const { error } = await supabase
    .from("homework_completions")
    .delete()
    .eq("homework_id", homeworkId)
    .eq("student_id", studentId);
  if (error) throw new Error(error.message);

  revalidatePath("/parent");
}
