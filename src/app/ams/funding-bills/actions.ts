"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireRole() {
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

  return { supabase, role: profile.role, ownSchoolId: profile.school_id, userId: user.id };
}

export async function allocateFunding(formData: FormData) {
  const { supabase, role, userId } = await requireRole();
  if (role !== "superadmin") throw new Error("Superadmin only.");

  const schoolId = String(formData.get("schoolId") || "");
  const amount = Number(formData.get("amount") || 0);
  const purpose = String(formData.get("purpose") || "").trim() || null;

  if (!schoolId || !amount || amount <= 0) {
    throw new Error("Please select a school and enter a valid amount.");
  }

  const { error } = await supabase.from("funding").insert({
    school_id: schoolId,
    amount,
    purpose,
    allocated_by: userId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/ams/funding-bills");
}

export async function uploadBill(formData: FormData) {
  const { supabase, role, ownSchoolId, userId } = await requireRole();
  if (role !== "school_admin" || !ownSchoolId) {
    throw new Error("School Admin only.");
  }

  const amount = Number(formData.get("amount") || 0);
  const description = String(formData.get("description") || "").trim() || null;
  const fundingId = String(formData.get("fundingId") || "") || null;
  const file = formData.get("file") as File | null;

  if (!amount || amount <= 0) throw new Error("Please enter a valid amount.");
  if (!file || file.size === 0) throw new Error("Please attach a receipt file.");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${ownSchoolId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("bills")
    .upload(path, file);
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase.from("bills").insert({
    school_id: ownSchoolId,
    funding_id: fundingId,
    amount,
    description,
    file_url: path,
    uploaded_by: userId,
  });
  if (error) {
    await supabase.storage.from("bills").remove([path]);
    throw new Error(error.message);
  }

  revalidatePath("/ams/funding-bills");
}

export async function getBillFileUrl(billId: string) {
  const { supabase, role, ownSchoolId } = await requireRole();

  const { data: bill } = await supabase
    .from("bills")
    .select("school_id, file_url")
    .eq("id", billId)
    .single();

  if (!bill || !bill.file_url) throw new Error("File not found.");
  if (role === "school_admin" && bill.school_id !== ownSchoolId) {
    throw new Error("Not authorized.");
  }

  const { data, error } = await supabase.storage
    .from("bills")
    .createSignedUrl(bill.file_url, 60);
  if (error || !data) throw new Error(error?.message ?? "Failed to load file.");

  return data.signedUrl;
}
