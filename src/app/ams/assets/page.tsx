import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AssetsClient from "./AssetsClient";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string }>;
}) {
  const { schoolId: schoolIdParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, school_id")
    .eq("id", user!.id)
    .single();

  const isSuperadmin = profile?.role === "superadmin";

  let schoolId: string;
  let schools: { id: string; name: string }[] = [];

  if (isSuperadmin) {
    const { data: allSchools } = await supabase
      .from("schools")
      .select("id, name")
      .order("name", { ascending: true });
    schools = allSchools ?? [];

    if (schools.length === 0) {
      return (
        <div className="max-w-4xl mx-auto p-6">
          <p className="text-sm text-muted">
            No schools exist yet — create one first.
          </p>
        </div>
      );
    }

    schoolId =
      schoolIdParam && schools.some((s) => s.id === schoolIdParam)
        ? schoolIdParam
        : schools[0].id;

    if (!schoolIdParam) {
      redirect(`/ams/assets?schoolId=${schoolId}`);
    }
  } else {
    schoolId = profile!.school_id!;
  }

  const { data: assets } = await supabase
    .from("assets")
    .select(
      "id, category, name, serial_key, os, classroom, assigned_users, quantity, publisher, notes"
    )
    .eq("school_id", schoolId)
    .order("category", { ascending: true });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <AssetsClient
        isSuperadmin={isSuperadmin}
        schools={schools}
        schoolId={schoolId}
        assets={assets ?? []}
      />
    </div>
  );
}
