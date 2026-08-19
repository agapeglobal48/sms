"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { uploadSchoolLogoIfProvided } from "@/lib/schoolLogo";

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

export async function updateSchoolLogo(formData: FormData) {
  const { supabase, schoolId } = await requireSchoolAdmin();

  const removeLogo = formData.get("removeLogo") === "on";
  const logoUrl = await uploadSchoolLogoIfProvided(supabase, formData, schoolId);

  if (!logoUrl && !removeLogo) return; // nothing to change

  const { error } = await supabase
    .from("schools")
    .update({ logo_url: logoUrl ?? null })
    .eq("id", schoolId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/school");
}
