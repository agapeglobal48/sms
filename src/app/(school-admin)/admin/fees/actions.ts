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

  return { supabase, schoolId: profile.school_id, userId: user.id };
}

export async function setFeeStatus(
  studentId: string,
  month: string,
  status: "paid" | "unpaid"
) {
  const { supabase, schoolId, userId } = await requireSchoolAdmin();

  // Confirm the student actually belongs to this school before writing.
  const { data: student } = await supabase
    .from("students")
    .select("id, school_id")
    .eq("id", studentId)
    .single();
  if (!student || student.school_id !== schoolId) {
    throw new Error("Student not found in your school.");
  }

  const { error } = await supabase.from("fees").upsert(
    {
      school_id: schoolId,
      student_id: studentId,
      month,
      status,
      paid_at: status === "paid" ? new Date().toISOString() : null,
      verified_by: userId,
    },
    { onConflict: "student_id,month" }
  );
  if (error) throw new Error(error.message);

  revalidatePath("/admin/fees");
}
