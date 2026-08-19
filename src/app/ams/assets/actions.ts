"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

async function requireAmsAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, school_id, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "superadmin" && profile?.role !== "school_admin") {
    throw new Error("Not authorized.");
  }

  return {
    supabase,
    role: profile.role,
    ownSchoolId: profile.school_id,
    userId: user.id,
    userName: profile.full_name,
  };
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
    purchase_date: String(formData.get("purchaseDate") || "") || null,
    allocation_date: String(formData.get("allocationDate") || "") || null,
    supplier: String(formData.get("supplier") || "").trim() || null,
  };
}

async function uploadAssetImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  schoolId: string,
  assetId: string
): Promise<string | null> {
  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) return null;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${schoolId}/${assetId}-${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from("asset-images")
    .upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("asset-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function createAsset(formData: FormData) {
  const { supabase, role, ownSchoolId, userId, userName } = await requireAmsAccess();
  const schoolId = resolveSchoolId(role, ownSchoolId, formData);
  const fields = assetFieldsFrom(formData, schoolId);

  const { data: asset, error } = await supabase
    .from("assets")
    .insert(fields)
    .select()
    .single();
  if (error) throw new Error(error.message);

  const imageUrl = await uploadAssetImage(supabase, formData, schoolId, asset.id);
  if (imageUrl) {
    await supabase.from("assets").update({ image_url: imageUrl }).eq("id", asset.id);
  }

  await logAudit({
    actorId: userId,
    actorName: userName,
    actorRole: role,
    action: "asset_created",
    targetType: "asset",
    targetId: asset.id,
    targetLabel: asset.name,
    schoolId,
  });

  revalidatePath("/ams/assets");
}

export async function updateAsset(assetId: string, formData: FormData) {
  const { supabase, role, ownSchoolId, userId, userName } = await requireAmsAccess();
  const schoolId = resolveSchoolId(role, ownSchoolId, formData);
  const fields = assetFieldsFrom(formData, schoolId);

  const removeImage = formData.get("removeImage") === "on";
  const imageUrl = await uploadAssetImage(supabase, formData, schoolId, assetId);

  const updateFields = {
    ...fields,
    ...(imageUrl ? { image_url: imageUrl } : removeImage ? { image_url: null } : {}),
  };

  let query = supabase.from("assets").update(updateFields).eq("id", assetId);
  if (role === "school_admin") {
    query = query.eq("school_id", schoolId);
  }
  const { error } = await query;
  if (error) throw new Error(error.message);

  await logAudit({
    actorId: userId,
    actorName: userName,
    actorRole: role,
    action: "asset_updated",
    targetType: "asset",
    targetId: assetId,
    targetLabel: fields.name,
    schoolId,
  });

  revalidatePath("/ams/assets");
}

/**
 * School Admin can no longer delete assets directly — this flags the asset
 * for deletion instead. Only Superadmin can approve the actual removal.
 */
export async function requestAssetDeletion(assetId: string, schoolId: string) {
  const { supabase, role, ownSchoolId, userId, userName } = await requireAmsAccess();
  if (role !== "school_admin" || ownSchoolId !== schoolId) {
    throw new Error("Not authorized for this school.");
  }

  const { data: asset, error } = await supabase
    .from("assets")
    .update({
      deletion_requested: true,
      deletion_requested_by: userId,
      deletion_requested_at: new Date().toISOString(),
    })
    .eq("id", assetId)
    .eq("school_id", schoolId)
    .select()
    .single();
  if (error) throw new Error(error.message);

  await logAudit({
    actorId: userId,
    actorName: userName,
    actorRole: role,
    action: "asset_delete_requested",
    targetType: "asset",
    targetId: assetId,
    targetLabel: asset?.name,
    schoolId,
  });

  revalidatePath("/ams/assets");
}

export async function cancelAssetDeletionRequest(assetId: string, schoolId: string) {
  const { supabase, role, ownSchoolId, userId, userName } = await requireAmsAccess();
  if (role !== "school_admin" || ownSchoolId !== schoolId) {
    throw new Error("Not authorized for this school.");
  }

  const { error } = await supabase
    .from("assets")
    .update({
      deletion_requested: false,
      deletion_requested_by: null,
      deletion_requested_at: null,
    })
    .eq("id", assetId)
    .eq("school_id", schoolId);
  if (error) throw new Error(error.message);

  await logAudit({
    actorId: userId,
    actorName: userName,
    actorRole: role,
    action: "asset_delete_request_cancelled",
    targetType: "asset",
    targetId: assetId,
    schoolId,
  });

  revalidatePath("/ams/assets");
}

export async function approveAssetDeletion(assetId: string, schoolId: string) {
  const { supabase, role, userId, userName } = await requireAmsAccess();
  if (role !== "superadmin") throw new Error("Superadmin only.");

  const { data: asset } = await supabase
    .from("assets")
    .select("name")
    .eq("id", assetId)
    .single();

  const { error } = await supabase.from("assets").delete().eq("id", assetId);
  if (error) throw new Error(error.message);

  await logAudit({
    actorId: userId,
    actorName: userName,
    actorRole: role,
    action: "asset_delete_approved",
    targetType: "asset",
    targetId: assetId,
    targetLabel: asset?.name,
    schoolId,
  });

  revalidatePath("/ams/assets");
}

export async function rejectAssetDeletion(assetId: string, schoolId: string) {
  const { supabase, role, userId, userName } = await requireAmsAccess();
  if (role !== "superadmin") throw new Error("Superadmin only.");

  const { error } = await supabase
    .from("assets")
    .update({
      deletion_requested: false,
      deletion_requested_by: null,
      deletion_requested_at: null,
    })
    .eq("id", assetId);
  if (error) throw new Error(error.message);

  await logAudit({
    actorId: userId,
    actorName: userName,
    actorRole: role,
    action: "asset_delete_rejected",
    targetType: "asset",
    targetId: assetId,
    schoolId,
  });

  revalidatePath("/ams/assets");
}
