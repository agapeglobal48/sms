"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  return { schoolId: profile.school_id };
}

export async function createTeacher(formData: FormData) {
  const { schoolId } = await requireSchoolAdmin();

  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!fullName || !email || password.length < 8) {
    throw new Error(
      "Name, email, and an 8+ character password are all required."
    );
  }

  const admin = createAdminClient();

  const { data: authUser, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (authError || !authUser.user) {
    throw new Error(authError?.message ?? "Failed to create teacher login.");
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authUser.user.id,
    role: "teacher",
    school_id: schoolId,
    full_name: fullName,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    throw new Error(profileError.message);
  }

  revalidatePath("/admin/teachers");
  revalidatePath("/admin/classes");
}

export async function updateTeacher(teacherId: string, formData: FormData) {
  const { schoolId } = await requireSchoolAdmin();
  const admin = createAdminClient();

  const { data: teacher } = await admin
    .from("profiles")
    .select("id, school_id, role")
    .eq("id", teacherId)
    .single();
  if (!teacher || teacher.school_id !== schoolId || teacher.role !== "teacher") {
    throw new Error("Teacher not found in your school.");
  }

  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const newEmail = String(formData.get("newEmail") || "").trim();
  const newPassword = String(formData.get("newPassword") || "");

  if (!fullName) throw new Error("Name is required.");
  if (newPassword && newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters.");
  }

  if (newEmail || newPassword) {
    const { error: authError } = await admin.auth.admin.updateUserById(
      teacherId,
      {
        ...(newEmail ? { email: newEmail } : {}),
        ...(newPassword ? { password: newPassword } : {}),
      }
    );
    if (authError) throw new Error(authError.message);
  }

  const { error } = await admin
    .from("profiles")
    .update({ full_name: fullName, phone })
    .eq("id", teacherId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/teachers");
  revalidatePath("/admin/classes");
}

export async function deleteTeacher(teacherId: string) {
  const { schoolId } = await requireSchoolAdmin();
  const admin = createAdminClient();

  // Confirm this teacher actually belongs to the caller's school before
  // touching auth — prevents one school admin from deleting another
  // school's teacher by guessing an id.
  const { data: teacher } = await admin
    .from("profiles")
    .select("id, school_id, role")
    .eq("id", teacherId)
    .single();

  if (!teacher || teacher.school_id !== schoolId || teacher.role !== "teacher") {
    throw new Error("Teacher not found in your school.");
  }

  // Deleting the auth user cascades the profile row (and nulls any
  // classes.teacher_id pointing at them, per the schema's ON DELETE rules).
  const { error } = await admin.auth.admin.deleteUser(teacherId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/teachers");
  revalidatePath("/admin/classes");
}
