"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sumIncludedWeights } from "@/lib/marks";

async function requireMarksAccess(classId: string, subject: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "teacher") throw new Error("Teacher only.");

  const { data: klass } = await supabase
    .from("classes")
    .select("id, teacher_id, school_id")
    .eq("id", classId)
    .single();
  if (!klass) throw new Error("Class not found.");

  const isClassTeacher = klass.teacher_id === user.id;

  let isSubjectTeacher = false;
  if (!isClassTeacher && subject) {
    const { data: assignment } = await supabase
      .from("subject_assignments")
      .select("id")
      .eq("class_id", classId)
      .eq("subject", subject)
      .eq("teacher_id", user.id)
      .maybeSingle();
    isSubjectTeacher = Boolean(assignment);
  }

  if (!isClassTeacher && !isSubjectTeacher) {
    throw new Error("You are not assigned to teach this subject for this class.");
  }

  return { supabase, schoolId: klass.school_id, userId: user.id };
}

/** Called on page load — seeds First/Second/Final Term (25/25/50) the first
 * time a teacher opens a class+subject that has no components yet. */
export async function ensureDefaultComponents(classId: string, subject: string) {
  const { supabase, schoolId, userId } = await requireMarksAccess(classId, subject);

  const { data: existing } = await supabase
    .from("assessment_components")
    .select("id")
    .eq("class_id", classId)
    .eq("subject", subject)
    .limit(1);

  if (existing && existing.length > 0) return;

  const defaults = [
    { name: "First Term", weight: 25, sort_order: 0 },
    { name: "Second Term", weight: 25, sort_order: 1 },
    { name: "Final Term", weight: 50, sort_order: 2 },
  ];

  await supabase.from("assessment_components").insert(
    defaults.map((d) => ({
      school_id: schoolId,
      class_id: classId,
      subject,
      name: d.name,
      weight: d.weight,
      included: true,
      is_default: true,
      sort_order: d.sort_order,
      created_by: userId,
    }))
  );
}

export async function addComponent(classId: string, subject: string, formData: FormData) {
  const { supabase, schoolId, userId } = await requireMarksAccess(classId, subject);

  const name = String(formData.get("name") || "").trim();
  const weight = Number(formData.get("weight") || 0);

  if (!name) throw new Error("Component name is required.");
  if (weight < 0 || weight > 100) throw new Error("Weight must be between 0 and 100.");

  const { data: existingComponents } = await supabase
    .from("assessment_components")
    .select("weight, included")
    .eq("class_id", classId)
    .eq("subject", subject);

  const currentTotal = sumIncludedWeights(existingComponents ?? []);
  if (currentTotal + weight > 100) {
    throw new Error(
      `Adding this would bring included weights to ${currentTotal + weight}%, over the 100% limit. Lower another component's weight, or mark it not included, first.`
    );
  }

  const { data: maxOrder } = await supabase
    .from("assessment_components")
    .select("sort_order")
    .eq("class_id", classId)
    .eq("subject", subject)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("assessment_components").insert({
    school_id: schoolId,
    class_id: classId,
    subject,
    name,
    weight,
    included: true,
    is_default: false,
    sort_order: (maxOrder?.sort_order ?? -1) + 1,
    created_by: userId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/marks");
}

export async function updateComponent(
  componentId: string,
  classId: string,
  subject: string,
  formData: FormData
) {
  const { supabase } = await requireMarksAccess(classId, subject);

  const weight = Number(formData.get("weight") || 0);
  const included = formData.get("included") === "on";

  if (weight < 0 || weight > 100) throw new Error("Weight must be between 0 and 100.");

  const { data: existingComponents } = await supabase
    .from("assessment_components")
    .select("id, weight, included")
    .eq("class_id", classId)
    .eq("subject", subject);

  const others = (existingComponents ?? []).filter((c) => c.id !== componentId);
  const othersTotal = sumIncludedWeights(others);
  const newTotal = othersTotal + (included ? weight : 0);

  if (newTotal > 100) {
    throw new Error(`This would bring included weights to ${newTotal}%, over the 100% limit.`);
  }

  const { error } = await supabase
    .from("assessment_components")
    .update({ weight, included })
    .eq("id", componentId);
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/marks");
}

export async function removeComponent(componentId: string, classId: string, subject: string) {
  const { supabase } = await requireMarksAccess(classId, subject);

  const { error } = await supabase.from("assessment_components").delete().eq("id", componentId);
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/marks");
}

export type ScoreEntry = { studentId: string; componentId: string; score: number | null };

export async function saveMarkEntries(classId: string, subject: string, entries: ScoreEntry[]) {
  const { supabase, schoolId, userId } = await requireMarksAccess(classId, subject);

  const { data: studentsInClass } = await supabase
    .from("students")
    .select("id")
    .eq("class_id", classId);
  const validStudentIds = new Set((studentsInClass ?? []).map((s) => s.id));

  const { data: componentsForSubject } = await supabase
    .from("assessment_components")
    .select("id")
    .eq("class_id", classId)
    .eq("subject", subject);
  const validComponentIds = new Set((componentsForSubject ?? []).map((c) => c.id));

  const rows = entries
    .filter((e) => validStudentIds.has(e.studentId) && validComponentIds.has(e.componentId))
    .map((e) => ({
      school_id: schoolId,
      student_id: e.studentId,
      component_id: e.componentId,
      score: e.score,
      updated_by: userId,
    }));

  if (rows.length === 0) return;

  const { error } = await supabase
    .from("mark_entries")
    .upsert(rows, { onConflict: "student_id,component_id" });
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/marks");
}
