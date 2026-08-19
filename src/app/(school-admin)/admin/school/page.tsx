import { createClient } from "@/lib/supabase/server";
import SchoolProfileClient from "./SchoolProfileClient";

export default async function SchoolProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user!.id)
    .single();

  const { data: school } = await supabase
    .from("schools")
    .select("name, address, logo_url")
    .eq("id", profile!.school_id!)
    .single();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <SchoolProfileClient
        schoolName={school?.name ?? ""}
        schoolAddress={school?.address ?? null}
        logoUrl={school?.logo_url ?? null}
      />
    </div>
  );
}
