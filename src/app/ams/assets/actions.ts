"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAmsAccess() {
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

  if (profile?.role !== "superadmin" && profile?.role !== "school_admin") {
    throw new Error("Not authorized.");
  }

  return { supabase, role: profile.role, ownSchoolId: profile.school_id };
}

/**
 * Resolves which school_id an action should apply to: School Admin is
 * always locked to their own school; Superadmin must explicitly pass one
 * (since they manage assets across every school).
 */
function resolveSchoolId(
  role: string,
  ownSchoolId: string | null,
  formData: FormData
): string {
  if (role === "school_admin") {
    if (!ownSchoolId) throw new Error("No school associated with this account.");
    return ownSchoolId;
  }
  const schoolId = String(formData.get("schoolId") || "");
  if (!schoolId) throw new Error("Please select a school.");
  return schoolId;
}

function assetFieldsFrom(formData: FormData, schoolId: string) {
  const category = String(formData.get("category") || "").trim();
  const name = String(formData.get("name") || "").trim();

  if (!category || !name) {
    throw new Error("Category and name are required.");
  }

  const assignedUsersRaw = String(formData.get("assignedUsers") || "").trim();

  return {
    school_id: schoolId,
    category,
    name,
    serial_key: String(formData.get("serialKey") || "").trim() || null,
    os: String(formData.get("os") || "").trim() || null,
    classroom: String(formData.get("classroom") || "").trim() || null,
    assigned_users: assignedUsersRaw
      ? assignedUsersRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : null,
    quantity: formData.get("quantity") ? Number(formData.get("quantity")) : 1,
    publisher: String(formData.get("publisher") || "").trim() || null,
    notes: String(formData.get("notes") || "").trim() || null,
  };
}

export async function createAsset(formData: FormData) {
  const { supabase, role, ownSchoolId } = await requireAmsAccess();
  const schoolId = resolveSchoolId(role, ownSchoolId, formData);
  const fields = assetFieldsFrom(formData, schoolId);

  const { error } = await supabase.from("assets").insert(fields);
  if (error) throw new Error(error.message);

  revalidatePath("/ams/assets");
}

export async function updateAsset(assetId: string, formData: FormData) {
  const { supabase, role, ownSchoolId } = await requireAmsAccess();
  const schoolId = resolveSchoolId(role, ownSchoolId, formData);
  const fields = assetFieldsFrom(formData, schoolId);

  let query = supabase.from("assets").update(fields).eq("id", assetId);
  if (role === "school_admin") {
    query = query.eq("school_id", schoolId);
  }
  const { error } = await query;
  if (error) throw new Error(error.message);

  revalidatePath("/ams/assets");
}

export async function deleteAsset(assetId: string, schoolId: string) {
  const { supabase, role, ownSchoolId } = await requireAmsAccess();
  if (role === "school_admin" && ownSchoolId !== schoolId) {
    throw new Error("Not authorized for this school.");
  }

  const { error } = await supabase
    .from("assets")
    .delete()
    .eq("id", assetId)
    .eq("school_id", schoolId);
  if (error) throw new Error(error.message);

  revalidatePath("/ams/assets");
}
