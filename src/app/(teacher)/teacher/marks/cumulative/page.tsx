import { createClient } from "@/lib/supabase/server";
import CumulativeResultClient from "./CumulativeResultClient";

export default async function CumulativeResultPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; subject?: string }>;
}) {
  const { classId, subject } = await searchParams;

  if (!classId || !subject) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-sm text-muted">Missing class or subject.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: klass }, { data: components }, { data: students }] = await Promise.all([
    supabase.from("classes").select("name, school_id").eq("id", classId).single(),
    supabase
      .from("assessment_components")
      .select("id, name, weight, included, sort_order")
      .eq("class_id", classId)
      .eq("subject", subject)
      .order("sort_order", { ascending: true }),
    supabase
      .from("students")
      .select("id, name, roll_no")
      .eq("class_id", classId)
      .order("roll_no", { ascending: true }),
  ]);

  const { data: school } = klass?.school_id
    ? await supabase.from("schools").select("name, address, logo_url").eq("id", klass.school_id).single()
    : { data: null };

  const studentIds = (students ?? []).map((s) => s.id);
  const componentIds = (components ?? []).map((c) => c.id);

  let scoresByKey: Record<string, number | null> = {};
  if (studentIds.length && componentIds.length) {
    const { data: entries } = await supabase
      .from("mark_entries")
      .select("student_id, component_id, score")
      .in("student_id", studentIds)
      .in("component_id", componentIds);
    scoresByKey = Object.fromEntries(
      (entries ?? []).map((e) => [`${e.student_id}:${e.component_id}`, e.score])
    );
  }

  return (
    <CumulativeResultClient
      classId={classId}
      subject={subject}
      className={klass?.name ?? ""}
      schoolName={school?.name ?? ""}
      schoolAddress={school?.address ?? null}
      schoolLogoUrl={school?.logo_url ?? null}
      components={components ?? []}
      students={students ?? []}
      scoresByKey={scoresByKey}
    />
  );
}
