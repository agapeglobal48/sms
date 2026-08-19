import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export async function uploadSchoolLogoIfProvided(
  supabase: SupabaseClient<Database>,
  formData: FormData,
  schoolId: string
): Promise<string | null> {
  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) return null;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${schoolId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from("school-logos")
    .upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("school-logos").getPublicUrl(path);
  return data.publicUrl;
}
