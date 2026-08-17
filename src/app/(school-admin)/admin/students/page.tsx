import { createClient } from "@/lib/supabase/server";
import StudentsClient from "./StudentsClient";

export default async function StudentsPage() {
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

  const [{ data: students }, { data: classes }] = await Promise.all([
    supabase
      .from("students")
      .select(
        "id, name, father_name, roll_no, gender, dob, date_of_admission, contact, address, monthly_fee, class_id"
      )
      .eq("school_id", schoolId!)
      .order("name", { ascending: true }),
    supabase
      .from("classes")
      .select("id, name, grade, section")
      .eq("school_id", schoolId!)
      .order("grade", { ascending: true })
      .order("section", { ascending: true }),
  ]);

  // Sort students by class (grade, then section), unassigned last, then by name.
  const classOrder = new Map((classes ?? []).map((c, i) => [c.id, i]));
  const sortedStudents = [...(students ?? [])].sort((a, b) => {
    const orderA = a.class_id ? (classOrder.get(a.class_id) ?? 9999) : 9999;
    const orderB = b.class_id ? (classOrder.get(b.class_id) ?? 9999) : 9999;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="max-w-5xl mx-auto p-6">
      <StudentsClient students={sortedStudents} classes={classes ?? []} />
    </div>
  );
}
