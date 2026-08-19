import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "@/components/shared/PrintButton";
import ResultsFilters from "./ResultsFilters";
import { computeWeightedTotal } from "@/lib/marks";

const CUMULATIVE = "__cumulative__";

export default async function AdminResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; subject?: string; term?: string }>;
}) {
  const { classId: classIdParam, subject: subjectParam, term: termParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user!.id)
    .single();
  const schoolId = profile!.school_id!;

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("grade", { ascending: true });

  if (!classes || classes.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-sm text-muted">No classes yet.</p>
      </div>
    );
  }

  const classId =
    classIdParam && classes.some((c) => c.id === classIdParam) ? classIdParam : classes[0].id;

  const { data: subjectRows } = await supabase
    .from("assessment_components")
    .select("subject")
    .eq("class_id", classId);
  const subjectOptions = Array.from(new Set((subjectRows ?? []).map((r) => r.subject))).sort();

  const subject =
    subjectParam && subjectOptions.includes(subjectParam)
      ? subjectParam
      : (subjectOptions[0] ?? "");

  if (!classIdParam || (subject && subjectParam !== subject)) {
    redirect(`/admin/results?classId=${classId}&subject=${encodeURIComponent(subject)}`);
  }

  let allComponents: {
    id: string;
    name: string;
    weight: number;
    included: boolean;
    sort_order: number;
  }[] = [];
  let students: { id: string; name: string; roll_no: number | null }[] = [];
  let entriesByKey = new Map<string, number | null>();

  if (subject) {
    const [{ data: componentsData }, { data: studentsData }] = await Promise.all([
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
    allComponents = componentsData ?? [];
    students = studentsData ?? [];

    const studentIds = students.map((s) => s.id);
    const componentIds = allComponents.map((c) => c.id);
    if (studentIds.length && componentIds.length) {
      const { data: entries } = await supabase
        .from("mark_entries")
        .select("student_id, component_id, score")
        .in("student_id", studentIds)
        .in("component_id", componentIds);
      entriesByKey = new Map(
        (entries ?? []).map((e) => [`${e.student_id}:${e.component_id}`, e.score])
      );
    }
  }

  const termOptions = allComponents.map((c) => c.name);
  const term = termParam && (termParam === CUMULATIVE || termOptions.includes(termParam))
    ? termParam
    : termOptions[0] ?? "";

  // "Cumulative" shows every component + weighted total; a specific term
  // shows just that one column with raw scores, no total.
  const showingCumulative = term === CUMULATIVE;
  const visibleComponents = showingCumulative
    ? allComponents
    : allComponents.filter((c) => c.name === term);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-ink">Results</h1>
        <div className="flex items-center gap-3 print:hidden">
          <ResultsFilters
            classes={classes}
            classId={classId}
            subjectOptions={subjectOptions}
            subject={subject}
            termOptions={termOptions}
            term={term}
          />
          {subject && <PrintButton label="Print class results" />}
        </div>
      </div>

      {!subject ? (
        <p className="text-sm text-muted">
          No marks have been entered for this class yet.
        </p>
      ) : (
        <div className="bg-surface rounded-xl border border-line overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-line">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Roll No</th>
                {visibleComponents.map((c) => (
                  <th key={c.id} className="p-3 font-medium whitespace-nowrap">
                    {c.name} ({c.weight}%)
                  </th>
                ))}
                {showingCumulative && <th className="p-3 font-medium">Total</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {students.length === 0 && (
                <tr>
                  <td colSpan={visibleComponents.length + 3} className="p-5 text-muted">
                    No students in this class.
                  </td>
                </tr>
              )}
              {students.map((s) => {
                const scores = new Map(
                  allComponents.map((c) => [c.id, entriesByKey.get(`${s.id}:${c.id}`) ?? null])
                );
                return (
                  <tr key={s.id}>
                    <td className="p-3 font-medium text-ink">{s.name}</td>
                    <td className="p-3 text-muted">{s.roll_no ?? "—"}</td>
                    {visibleComponents.map((c) => (
                      <td key={c.id} className="p-3 text-muted">
                        {scores.get(c.id) ?? "—"}
                      </td>
                    ))}
                    {showingCumulative && (
                      <td className="p-3 font-medium text-ink">
                        {computeWeightedTotal(allComponents, scores)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
