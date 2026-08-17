import { createClient } from "@/lib/supabase/server";
import ParentsClient from "./ParentsClient";

export default async function ParentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user!.id)
    .single();

  const schoolId = profile?.school_id;

  const [{ data: parentProfiles }, { data: students }, { data: links }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, phone")
        .eq("school_id", schoolId!)
        .eq("role", "parent")
        .order("full_name", { ascending: true }),
      supabase
        .from("students")
        .select("id, name")
        .eq("school_id", schoolId!)
        .order("name", { ascending: true }),
      supabase
        .from("parent_student_links")
        .select("parent_id, student_id"),
    ]);

  const linksByParent = new Map<string, string[]>();
  for (const link of links ?? []) {
    const existing = linksByParent.get(link.parent_id) ?? [];
    existing.push(link.student_id);
    linksByParent.set(link.parent_id, existing);
  }

  const parents = (parentProfiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    phone: p.phone,
    linkedStudentIds: linksByParent.get(p.id) ?? [],
  }));

  return (
    <div className="max-w-3xl mx-auto p-6">
      <ParentsClient parents={parents} students={students ?? []} />
    </div>
  );
}
