import { createClient } from "@/lib/supabase/server";
import ChildSelector from "./ChildSelector";
import ParentMarksSection from "./ParentMarksSection";
import ParentHomeworkSection from "./ParentHomeworkSection";

export default async function ParentPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId: studentIdParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: links } = await supabase
    .from("parent_student_links")
    .select("student_id")
    .eq("parent_id", user!.id);

  const studentIds = (links ?? []).map((l) => l.student_id);

  if (studentIds.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-sm text-muted">
          No children are linked to your account yet. Contact your School
          Admin to get this set up.
        </p>
      </div>
    );
  }

  const { data: children } = await supabase
    .from("students")
    .select("id, name, class_id, monthly_fee")
    .in("id", studentIds)
    .order("name", { ascending: true });

  const selectedId =
    studentIdParam && studentIds.includes(studentIdParam)
      ? studentIdParam
      : (children?.[0]?.id ?? studentIds[0]);

  const selectedChild = (children ?? []).find((c) => c.id === selectedId);

  const [
    { data: classInfo },
    { data: attendance },
    { data: components },
    { data: homework },
    { data: fees },
  ] = await Promise.all([
    selectedChild?.class_id
      ? supabase
          .from("classes")
          .select("name")
          .eq("id", selectedChild.class_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from("attendance")
      .select("date, status")
      .eq("student_id", selectedId)
      .order("date", { ascending: false })
      .limit(30),
    selectedChild?.class_id
      ? supabase
          .from("assessment_components")
          .select("id, subject, name, weight, included, sort_order")
          .eq("class_id", selectedChild.class_id)
          .order("subject", { ascending: true })
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [] as never[] }),
    selectedChild?.class_id
      ? supabase
          .from("homework")
          .select("id, subject, title, description, due_date, created_at")
          .eq("class_id", selectedChild.class_id)
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    supabase
      .from("fees")
      .select("month, status")
      .eq("student_id", selectedId)
      .order("month", { ascending: false }),
  ]);

  const componentIds = (components ?? []).map((c) => c.id);
  const { data: entries } = componentIds.length
    ? await supabase
        .from("mark_entries")
        .select("component_id, score")
        .eq("student_id", selectedId)
        .in("component_id", componentIds)
    : { data: [] as { component_id: string; score: number | null }[] };
  const scoreByComponentId = new Map((entries ?? []).map((e) => [e.component_id, e.score]));

  const subjectGroups = new Map<
    string,
    { id: string; name: string; weight: number; included: boolean; sort_order: number }[]
  >();
  for (const c of components ?? []) {
    const list = subjectGroups.get(c.subject) ?? [];
    list.push(c);
    subjectGroups.set(c.subject, list);
  }

  const attendanceCounts = (attendance ?? []).reduce(
    (acc, a) => {
      acc[a.status as "present" | "absent" | "leave"] += 1;
      return acc;
    },
    { present: 0, absent: 0, leave: 0 }
  );

  const homeworkIds = (homework ?? []).map((h) => h.id);
  const { data: completions } = homeworkIds.length
    ? await supabase
        .from("homework_completions")
        .select("homework_id, completed_at, photo_url")
        .eq("student_id", selectedId)
        .in("homework_id", homeworkIds)
    : { data: [] as { homework_id: string; completed_at: string; photo_url: string | null }[] };
  const completionByHomeworkId = new Map((completions ?? []).map((c) => [c.homework_id, c]));

  const homeworkWithCompletion = (homework ?? []).map((h) => {
    const completion = completionByHomeworkId.get(h.id);
    return {
      ...h,
      completed: Boolean(completion),
      completedAt: completion?.completed_at ?? null,
      photoUrl: completion?.photo_url ?? null,
    };
  });

  const { data: remarks } = await supabase
    .from("student_remarks")
    .select("id, remark, created_at")
    .eq("student_id", selectedId)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            {selectedChild?.name}
          </h1>
          <p className="text-sm text-muted">
            {classInfo?.name ?? "Not yet assigned to a class"}
          </p>
        </div>
        <ChildSelector options={children ?? []} selectedId={selectedId} />
      </div>

      {/* Attendance */}
      <section className="bg-surface rounded-xl border border-line p-5">
        <h2 className="font-medium text-ink mb-3">
          Attendance (last 30 records)
        </h2>
        <div className="flex gap-4 text-sm mb-4">
          <span className="text-success font-medium">
            {attendanceCounts.present} Present
          </span>
          <span className="text-danger font-medium">
            {attendanceCounts.absent} Absent
          </span>
          <span className="text-gold font-medium">
            {attendanceCounts.leave} Leave
          </span>
        </div>
        {(attendance ?? []).length === 0 ? (
          <p className="text-sm text-muted">No attendance recorded yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(attendance ?? []).map((a) => (
              <span
                key={a.date}
                title={`${a.date}: ${a.status}`}
                className={
                  "w-3 h-3 rounded-sm inline-block " +
                  (a.status === "present"
                    ? "bg-success"
                    : a.status === "absent"
                      ? "bg-danger"
                      : "bg-gold")
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Marks */}
      <section className="bg-surface rounded-xl border border-line p-5">
        <h2 className="font-medium text-ink mb-3">Marks</h2>
        <ParentMarksSection
          subjectGroups={Array.from(subjectGroups.entries()).map(([subject, comps]) => ({
            subject,
            components: comps,
          }))}
          scores={Object.fromEntries(scoreByComponentId)}
        />
      </section>

      {/* Homework */}
      <section className="bg-surface rounded-xl border border-line p-5">
        <h2 className="font-medium text-ink mb-3">Homework</h2>
        <ParentHomeworkSection studentId={selectedId} homework={homeworkWithCompletion} />
      </section>

      {/* Fees */}
      <section className="bg-surface rounded-xl border border-line p-5">
        <h2 className="font-medium text-ink mb-3">Fees</h2>
        {(fees ?? []).length === 0 ? (
          <p className="text-sm text-muted">No fee records yet.</p>
        ) : (
          <div className="space-y-2">
            {(fees ?? []).map((f) => (
              <div key={f.month} className="flex items-center justify-between text-sm">
                <span className="text-ink">{f.month}</span>
                <span
                  className={
                    f.status === "paid"
                      ? "text-success font-medium"
                      : "text-danger font-medium"
                  }
                >
                  {f.status === "paid" ? "Paid" : "Unpaid"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Remarks */}
      <section className="bg-surface rounded-xl border border-line p-5">
        <h2 className="font-medium text-ink mb-3">Teacher Remarks</h2>
        {(remarks ?? []).length === 0 ? (
          <p className="text-sm text-muted">No remarks yet.</p>
        ) : (
          <div className="space-y-2">
            {(remarks ?? []).map((r) => (
              <div key={r.id} className="bg-paper rounded-lg p-3 text-sm">
                <p className="text-ink">{r.remark}</p>
                <p className="text-xs text-muted mt-1">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
