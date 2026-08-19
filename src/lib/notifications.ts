import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export async function notifyParentsOfStudent(
  supabase: Client,
  params: {
    schoolId: string;
    studentId: string;
    type: "attendance" | "homework" | "remark";
    title: string;
    message?: string;
  }
) {
  const { data: links } = await supabase
    .from("parent_student_links")
    .select("parent_id")
    .eq("student_id", params.studentId);

  const parentIds = (links ?? []).map((l) => l.parent_id);
  if (parentIds.length === 0) return;

  await supabase.from("notifications").insert(
    parentIds.map((parentId) => ({
      school_id: params.schoolId,
      parent_id: parentId,
      student_id: params.studentId,
      type: params.type,
      title: params.title,
      message: params.message ?? null,
    }))
  );
}

export async function notifyParentsOfClass(
  supabase: Client,
  params: {
    schoolId: string;
    classId: string;
    type: "attendance" | "homework" | "remark";
    title: string;
    message?: string;
  }
) {
  const { data: students } = await supabase
    .from("students")
    .select("id")
    .eq("class_id", params.classId);
  const studentIds = (students ?? []).map((s) => s.id);
  if (studentIds.length === 0) return;

  const { data: links } = await supabase
    .from("parent_student_links")
    .select("parent_id, student_id")
    .in("student_id", studentIds);
  if (!links || links.length === 0) return;

  await supabase.from("notifications").insert(
    links.map((l) => ({
      school_id: params.schoolId,
      parent_id: l.parent_id,
      student_id: l.student_id,
      type: params.type,
      title: params.title,
      message: params.message ?? null,
    }))
  );
}
