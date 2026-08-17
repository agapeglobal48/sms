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

async function validateStudentIdsBelongToSchool(
  studentIds: string[],
  schoolId: string
) {
  if (studentIds.length === 0) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("students")
    .select("id")
    .eq("school_id", schoolId)
    .in("id", studentIds);
  return (data ?? []).map((s) => s.id);
}

export async function createParent(formData: FormData) {
  const { schoolId } = await requireSchoolAdmin();

  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const phone = String(formData.get("phone") || "").trim() || null;
  const studentIds = formData.getAll("studentIds").map(String);

  if (!fullName || !email || password.length < 8) {
    throw new Error(
      "Name, email, and an 8+ character password are all required."
    );
  }

  const admin = createAdminClient();
  const validStudentIds = await validateStudentIdsBelongToSchool(
    studentIds,
    schoolId
  );

  const { data: authUser, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (authError || !authUser.user) {
    throw new Error(authError?.message ?? "Failed to create parent login.");
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authUser.user.id,
    role: "parent",
    school_id: schoolId,
    full_name: fullName,
    phone,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    throw new Error(profileError.message);
  }

  if (validStudentIds.length > 0) {
    const { error: linkError } = await admin
      .from("parent_student_links")
      .insert(
        validStudentIds.map((studentId) => ({
          parent_id: authUser.user.id,
          student_id: studentId,
        }))
      );
    if (linkError) throw new Error(linkError.message);
  }

  revalidatePath("/admin/parents");
}

export async function updateParent(parentId: string, formData: FormData) {
  const { schoolId } = await requireSchoolAdmin();
  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("id, role, school_id")
    .eq("id", parentId)
    .single();
  if (!target || target.role !== "parent" || target.school_id !== schoolId) {
    throw new Error("Parent not found in your school.");
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
      parentId,
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
    .eq("id", parentId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/parents");
}

export async function updateParentLinks(parentId: string, formData: FormData) {
  const { schoolId } = await requireSchoolAdmin();
  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("id, role, school_id")
    .eq("id", parentId)
    .single();
  if (!target || target.role !== "parent" || target.school_id !== schoolId) {
    throw new Error("Parent not found in your school.");
  }

  const studentIds = formData.getAll("studentIds").map(String);
  const validStudentIds = await validateStudentIdsBelongToSchool(
    studentIds,
    schoolId
  );

  await admin.from("parent_student_links").delete().eq("parent_id", parentId);

  if (validStudentIds.length > 0) {
    const { error } = await admin.from("parent_student_links").insert(
      validStudentIds.map((studentId) => ({
        parent_id: parentId,
        student_id: studentId,
      }))
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/parents");
}

export async function deleteParent(parentId: string) {
  const { schoolId } = await requireSchoolAdmin();
  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("id, role, school_id")
    .eq("id", parentId)
    .single();
  if (!target || target.role !== "parent" || target.school_id !== schoolId) {
    throw new Error("Parent not found in your school.");
  }

  const { error } = await admin.from("profiles").delete().eq("id", parentId);
  if (error) throw new Error(error.message);

  await admin.auth.admin.deleteUser(parentId);

  revalidatePath("/admin/parents");
}
