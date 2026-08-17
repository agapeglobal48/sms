import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FundingBillsClient from "./FundingBillsClient";

export default async function FundingBillsPage({
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
      redirect(`/ams/funding-bills?schoolId=${schoolId}`);
    }
  } else {
    schoolId = profile!.school_id!;
  }

  const [{ data: funding }, { data: bills }] = await Promise.all([
    supabase
      .from("funding")
      .select("id, amount, purpose, allocated_at")
      .eq("school_id", schoolId)
      .order("allocated_at", { ascending: false }),
    supabase
      .from("bills")
      .select("id, amount, description, uploaded_at, funding_id")
      .eq("school_id", schoolId)
      .order("uploaded_at", { ascending: false }),
  ]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <FundingBillsClient
        isSuperadmin={isSuperadmin}
        schools={schools}
        schoolId={schoolId}
        funding={funding ?? []}
        bills={bills ?? []}
      />
    </div>
  );
}
