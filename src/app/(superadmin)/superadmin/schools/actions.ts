"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { validatePassword } from "@/lib/password";
import { uploadSchoolLogoIfProvided } from "@/lib/schoolLogo";

async function assertSuperadmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "superadmin") throw new Error("Superadmin only.");

  return { userId: user.id, userName: profile.full_name };
}

export async function createSchool(formData: FormData) {
  const { userId, userName } = await assertSuperadmin();

  const schoolName = String(formData.get("schoolName") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const adminName = String(formData.get("adminName") || "").trim();
  const adminEmail = String(formData.get("adminEmail") || "").trim();
  const adminPassword = String(formData.get("adminPassword") || "");

  if (!schoolName || !adminName || !adminEmail || !adminPassword) {
    throw new Error("School name, admin name, admin email, and a password are all required.");
  }
  const passwordError = validatePassword(adminPassword);
  if (passwordError) throw new Error(passwordError);

  const admin = createAdminClient();

  // 1. Create the school
  const { data: school, error: schoolError } = await admin
    .from("schools")
    .insert({ name: schoolName, address })
    .select()
    .single();
  if (schoolError || !school) {
    throw new Error(schoolError?.message ?? "Failed to create school.");
  }

  // 2. Create the auth login for that school's admin
  const { data: authUser, error: authError } =
    await admin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });
  if (authError || !authUser.user) {
    // roll back the school row so we don't leave an orphaned school
    await admin.from("schools").delete().eq("id", school.id);
    throw new Error(authError?.message ?? "Failed to create admin login.");
  }

  // 3. Link that login to this school as a school_admin profile
  const { error: profileError } = await admin.from("profiles").insert({
    id: authUser.user.id,
    role: "school_admin",
    school_id: school.id,
    full_name: adminName,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    await admin.from("schools").delete().eq("id", school.id);
    throw new Error(profileError.message);
  }

  // 4. Optional logo/monogram
  const logoUrl = await uploadSchoolLogoIfProvided(admin, formData, school.id);
  if (logoUrl) {
    await admin.from("schools").update({ logo_url: logoUrl }).eq("id", school.id);
  }

  await logAudit({
    actorId: userId,
    actorName: userName,
    actorRole: "superadmin",
    action: "school_created",
    targetType: "school",
    targetId: school.id,
    targetLabel: school.name,
    schoolId: school.id,
  });

  revalidatePath("/superadmin/schools");
}

export async function updateSchool(schoolId: string, formData: FormData) {
  const { userId, userName } = await assertSuperadmin();
  const admin = createAdminClient();

  const schoolName = String(formData.get("schoolName") || "").trim();
  const address = String(formData.get("address") || "").trim();
  if (!schoolName) throw new Error("School name is required.");

  const removeLogo = formData.get("removeLogo") === "on";
  const logoUrl = await uploadSchoolLogoIfProvided(admin, formData, schoolId);

  const updateFields = {
    name: schoolName,
    address,
    ...(logoUrl ? { logo_url: logoUrl } : removeLogo ? { logo_url: null } : {}),
  };

  const { error } = await admin.from("schools").update(updateFields).eq("id", schoolId);
  if (error) throw new Error(error.message);

  await logAudit({
    actorId: userId,
    actorName: userName,
    actorRole: "superadmin",
    action: "school_updated",
    targetType: "school",
    targetId: schoolId,
    targetLabel: schoolName,
    schoolId,
  });

  revalidatePath("/superadmin/schools");
}

export async function updateSchoolAdmin(
  adminUserId: string,
  formData: FormData
) {
  const { userId, userName } = await assertSuperadmin();
  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("id, role, school_id")
    .eq("id", adminUserId)
    .single();
  if (!target || target.role !== "school_admin") {
    throw new Error("School Admin login not found.");
  }

  const fullName = String(formData.get("adminName") || "").trim();
  const newEmail = String(formData.get("newAdminEmail") || "").trim();
  const newPassword = String(formData.get("newAdminPassword") || "");

  if (!fullName) throw new Error("Admin name is required.");
  if (newPassword) {
    const passwordError = validatePassword(newPassword);
    if (passwordError) throw new Error(passwordError);
  }

  if (newEmail || newPassword) {
    const { error: authError } = await admin.auth.admin.updateUserById(
      adminUserId,
      {
        ...(newEmail ? { email: newEmail } : {}),
        ...(newPassword ? { password: newPassword } : {}),
      }
    );
    if (authError) throw new Error(authError.message);
  }

  const { error } = await admin
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", adminUserId);
  if (error) throw new Error(error.message);

  await logAudit({
    actorId: userId,
    actorName: userName,
    actorRole: "superadmin",
    action: "school_admin_updated",
    targetType: "profile",
    targetId: adminUserId,
    targetLabel: fullName,
    schoolId: target.school_id,
    details: { emailChanged: Boolean(newEmail), passwordChanged: Boolean(newPassword) },
  });

  revalidatePath("/superadmin/schools");
}

/** Requires the caller to have already re-authenticated client-side. */
export async function getSchoolAdminEmail(adminUserId: string) {
  const { userId, userName } = await assertSuperadmin();
  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("role, school_id, full_name")
    .eq("id", adminUserId)
    .single();
  if (!target || target.role !== "school_admin") {
    throw new Error("School Admin login not found.");
  }

  const { data: authUser, error } = await admin.auth.admin.getUserById(adminUserId);
  if (error || !authUser.user) throw new Error("Could not load this login.");

  await logAudit({
    actorId: userId,
    actorName: userName,
    actorRole: "superadmin",
    action: "credential_viewed",
    targetType: "profile",
    targetId: adminUserId,
    targetLabel: target.full_name,
    schoolId: target.school_id,
  });

  return { email: authUser.user.email ?? null };
}

export async function resetSchoolAdminCredentials(
  adminUserId: string,
  formData: FormData
) {
  const { userId, userName } = await assertSuperadmin();
  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("role, school_id, full_name")
    .eq("id", adminUserId)
    .single();
  if (!target || target.role !== "school_admin") {
    throw new Error("School Admin login not found.");
  }

  const newEmail = String(formData.get("newEmail") || "").trim();
  const newPassword = String(formData.get("newPassword") || "");

  if (!newEmail && !newPassword) return; // nothing to change
  if (newPassword) {
    const passwordError = validatePassword(newPassword);
    if (passwordError) throw new Error(passwordError);
  }

  const { error } = await admin.auth.admin.updateUserById(adminUserId, {
    ...(newEmail ? { email: newEmail } : {}),
    ...(newPassword ? { password: newPassword } : {}),
  });
  if (error) throw new Error(error.message);

  await logAudit({
    actorId: userId,
    actorName: userName,
    actorRole: "superadmin",
    action: "credential_reset",
    targetType: "profile",
    targetId: adminUserId,
    targetLabel: target.full_name,
    schoolId: target.school_id,
    details: { emailChanged: Boolean(newEmail), passwordChanged: Boolean(newPassword) },
  });

  revalidatePath("/superadmin/schools");
}

export async function deleteSchool(schoolId: string) {
  const { userId, userName } = await assertSuperadmin();
  const admin = createAdminClient();

  const { data: school } = await admin
    .from("schools")
    .select("name")
    .eq("id", schoolId)
    .single();

  // Grab every login tied to this school so we can remove the auth users too
  // (deleting the school cascades the profile rows, but not the auth.users
  // records themselves).
  const { data: relatedProfiles } = await admin
    .from("profiles")
    .select("id")
    .eq("school_id", schoolId);

  const { error } = await admin.from("schools").delete().eq("id", schoolId);
  if (error) throw new Error(error.message);

  for (const p of relatedProfiles ?? []) {
    await admin.auth.admin.deleteUser(p.id as string);
  }

  await logAudit({
    actorId: userId,
    actorName: userName,
    actorRole: "superadmin",
    action: "school_deleted",
    targetType: "school",
    targetId: schoolId,
    targetLabel: school?.name,
  });

  revalidatePath("/superadmin/schools");
}
