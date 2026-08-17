"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { parseStudentsWorkbook } from "@/lib/excel/students";

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

function studentFieldsFrom(formData: FormData, schoolId: string) {
  const name = String(formData.get("name") || "").trim();
  const classId = String(formData.get("classId") || "") || null;

  if (!name) throw new Error("Student name is required.");

  return {
    school_id: schoolId,
    class_id: classId,
    name,
    father_name: String(formData.get("fatherName") || "").trim() || null,
    roll_no: formData.get("rollNo") ? Number(formData.get("rollNo")) : null,
    gender: String(formData.get("gender") || "") || null,
    dob: String(formData.get("dob") || "") || null,
    date_of_admission: String(formData.get("dateOfAdmission") || "") || null,
    contact: String(formData.get("contact") || "").trim() || null,
    address: String(formData.get("address") || "").trim() || null,
    monthly_fee: formData.get("monthlyFee")
      ? Number(formData.get("monthlyFee"))
      : 0,
  };
}

async function findAuthUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
) {
  // supabase-js has no direct "get user by email" admin call, so page through
  // users and match. Fine at school-system scale; revisit if this ever needs
  // to scale to tens of thousands of accounts.
  const target = email.toLowerCase();
  let page = 1;
  for (let i = 0; i < 20; i++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error || !data) break;
    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match) return match;
    if (data.users.length < 1000) break; // last page
    page++;
  }
  return null;
}

/**
 * Creates a parent login and links it to the given student, if parent
 * details were provided in the form. If the email already belongs to an
 * existing parent in this same school, that parent is linked automatically
 * instead of erroring — this is the common "second child, same parent"
 * case. If the email belongs to someone in a different school or a
 * non-parent account, it refuses rather than silently cross-linking.
 */
async function createAndLinkParentIfProvided(
  formData: FormData,
  studentId: string,
  schoolId: string
) {
  const parentName = String(formData.get("parentName") || "").trim();
  const parentEmail = String(formData.get("parentEmail") || "").trim();
  const parentPassword = String(formData.get("parentPassword") || "");

  if (!parentName && !parentEmail && !parentPassword) return; // nothing to do

  if (!parentName || !parentEmail || parentPassword.length < 8) {
    throw new Error(
      "To create a parent login, fill in parent name, email, and an 8+ character password (or leave all three blank to skip)."
    );
  }

  const admin = createAdminClient();

  const { data: authUser, error: authError } =
    await admin.auth.admin.createUser({
      email: parentEmail,
      password: parentPassword,
      email_confirm: true,
    });

  if (authError || !authUser.user) {
    const isDuplicate =
      authError?.code === "email_exists" ||
      /already.*(registered|exists)/i.test(authError?.message ?? "");

    if (!isDuplicate) {
      throw new Error(authError?.message ?? "Failed to create parent login.");
    }

    // Duplicate email — try to auto-link to the existing account instead.
    const existing = await findAuthUserByEmail(admin, parentEmail);
    if (!existing) {
      throw new Error(
        `A parent account with "${parentEmail}" already exists, but it could not be found to link automatically. Go to Admin → Parents to link this student manually.`
      );
    }

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("role, school_id")
      .eq("id", existing.id)
      .single();

    if (
      !existingProfile ||
      existingProfile.role !== "parent" ||
      existingProfile.school_id !== schoolId
    ) {
      throw new Error(
        `"${parentEmail}" belongs to an existing account that isn't a parent in this school, so it can't be linked automatically. Use a different email, or link manually from Admin → Parents.`
      );
    }

    const { error: linkError } = await admin
      .from("parent_student_links")
      .upsert(
        { parent_id: existing.id, student_id: studentId },
        { onConflict: "parent_id,student_id" }
      );
    if (linkError) throw new Error(linkError.message);
    return;
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authUser.user.id,
    role: "parent",
    school_id: schoolId,
    full_name: parentName,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    throw new Error(profileError.message);
  }

  const { error: linkError } = await admin
    .from("parent_student_links")
    .insert({ parent_id: authUser.user.id, student_id: studentId });
  if (linkError) throw new Error(linkError.message);
}

export async function createStudent(formData: FormData) {
  const { supabase, schoolId } = await requireSchoolAdmin();
  const fields = studentFieldsFrom(formData, schoolId);

  const { data: student, error } = await supabase
    .from("students")
    .insert(fields)
    .select()
    .single();
  if (error || !student) throw new Error(error?.message ?? "Failed to add student.");

  await createAndLinkParentIfProvided(formData, student.id, schoolId);

  revalidatePath("/admin/students");
  revalidatePath("/admin/parents");
}

export async function updateStudent(studentId: string, formData: FormData) {
  const { supabase, schoolId } = await requireSchoolAdmin();
  const fields = studentFieldsFrom(formData, schoolId);

  const { error } = await supabase
    .from("students")
    .update(fields)
    .eq("id", studentId)
    .eq("school_id", schoolId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/students");
}

export async function deleteStudent(studentId: string) {
  const { supabase, schoolId } = await requireSchoolAdmin();

  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", studentId)
    .eq("school_id", schoolId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/students");
}

/**
 * Bulk-adds students from an uploaded .xlsx file. Matches the exact column
 * headers produced by the Export button, so a file exported from this app
 * can be edited and re-imported directly. Every row becomes a NEW student
 * row — this does not update existing students, to avoid silently
 * overwriting records from an out-of-date export.
 */
export async function importStudents(formData: FormData) {
  const { supabase, schoolId } = await requireSchoolAdmin();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    throw new Error("Please choose an .xlsx file to import.");
  }

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("school_id", schoolId);

  const buffer = await file.arrayBuffer();
  const parsedRows = parseStudentsWorkbook(buffer, classes ?? []);

  if (parsedRows.length === 0) {
    throw new Error(
      "No valid rows found. Make sure the 'Name' column is filled in."
    );
  }

  const inserts = parsedRows.map((r) => ({ ...r, school_id: schoolId }));

  const { error } = await supabase.from("students").insert(inserts);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/students");
  return { imported: inserts.length };
}
