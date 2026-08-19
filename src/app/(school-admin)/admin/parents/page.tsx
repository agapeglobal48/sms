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

  const [{ data: parentProfiles }, { data: students }, { data: links }, { data: classes }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, phone")
        .eq("school_id", schoolId!)
        .eq("role", "parent")
        .order("full_name", { ascending: true }),
      supabase
        .from("students")
        .select("id, name, class_id")
        .eq("school_id", schoolId!)
        .order("name", { ascending: true }),
      supabase
        .from("parent_student_links")
        .select("parent_id, student_id"),
      supabase
        .from("classes")
        .select("id, name, grade, section")
        .eq("school_id", schoolId!)
        .order("grade", { ascending: true })
        .order("section", { ascending: true }),
    ]);

  const linksByParent = new Map<string, string[]>();
  for (const link of links ?? []) {
    const existing = linksByParent.get(link.parent_id) ?? [];
    existing.push(link.student_id);
    linksByParent.set(link.parent_id, existing);
  }

  const studentById = new Map((students ?? []).map((s) => [s.id, s]));
  const classOrder = new Map((classes ?? []).map((c, i) => [c.id, i]));

  function primaryClassOrder(studentIds: string[]): number {
    let best = Infinity;
    for (const sid of studentIds) {
      const classId = studentById.get(sid)?.class_id;
      const order = classId ? (classOrder.get(classId) ?? Infinity) : Infinity;
      if (order < best) best = order;
    }
    return best;
  }

  const parents = (parentProfiles ?? [])
    .map((p) => {
      const linkedStudentIds = linksByParent.get(p.id) ?? [];
      const primaryClassId = linkedStudentIds
        .map((sid) => studentById.get(sid)?.class_id)
        .find((cid): cid is string => Boolean(cid));
      return {
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        linkedStudentIds,
        primaryClassName:
          (classes ?? []).find((c) => c.id === primaryClassId)?.name ?? null,
        sortOrder: primaryClassOrder(linkedStudentIds),
      };
    })
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.full_name.localeCompare(b.full_name);
    });

  return (
    <div className="max-w-3xl mx-auto p-6">
      <ParentsClient parents={parents} students={students ?? []} />
    </div>
  );
}
