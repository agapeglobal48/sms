import { createClient } from "@/lib/supabase/server";
import SchoolsClient from "./SchoolsClient";

export default async function SchoolsPage() {
  const supabase = await createClient();

  const [{ data: schools }, { data: admins }] = await Promise.all([
    supabase
      .from("schools")
      .select("id, name, address, logo_url, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, school_id, full_name")
      .eq("role", "school_admin"),
  ]);

  const adminBySchool = new Map(
    (admins ?? []).map((a) => [a.school_id, { id: a.id, name: a.full_name }])
  );

  const schoolsWithAdmin = (schools ?? []).map((s) => ({
    ...s,
    adminId: adminBySchool.get(s.id)?.id ?? null,
    adminName: adminBySchool.get(s.id)?.name ?? null,
  }));

  return (
    <div className="max-w-3xl mx-auto p-6">
      <SchoolsClient schools={schoolsWithAdmin} />
    </div>
  );
}
