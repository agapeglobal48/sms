import { createClient } from "@/lib/supabase/server";
import FeesClient from "./FeesClient";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function FeesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam || currentMonth();

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

  const [{ data: students }, { data: fees }, { data: classes }] = await Promise.all([
    supabase
      .from("students")
      .select("id, name, roll_no, monthly_fee, class_id")
      .eq("school_id", schoolId!)
      .order("name", { ascending: true }),
    supabase
      .from("fees")
      .select("student_id, status")
      .eq("school_id", schoolId!)
      .eq("month", month),
    supabase
      .from("classes")
      .select("id, name, grade, section")
      .eq("school_id", schoolId!)
      .order("grade", { ascending: true })
      .order("section", { ascending: true }),
  ]);

  const feeByStudent = new Map(
    (fees ?? []).map((f) => [f.student_id, f.status])
  );

  const studentsWithStatus = (students ?? []).map((s) => ({
    ...s,
    status: (feeByStudent.get(s.id) ?? "unpaid") as "paid" | "unpaid",
  }));

  // Sort by class (grade, section), unassigned last, then by name.
  const classOrder = new Map((classes ?? []).map((c, i) => [c.id, i]));
  const sortedStudents = studentsWithStatus.sort((a, b) => {
    const orderA = a.class_id ? (classOrder.get(a.class_id) ?? 9999) : 9999;
    const orderB = b.class_id ? (classOrder.get(b.class_id) ?? 9999) : 9999;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="max-w-3xl mx-auto p-6">
      <FeesClient month={month} students={sortedStudents} classes={classes ?? []} />
    </div>
  );
}
