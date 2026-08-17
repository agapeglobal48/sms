import { createClient } from "@/lib/supabase/server";
import ChildSelector from "./ChildSelector";

function weightedTotal(first: number | null, mid: number | null, final: number | null) {
  const f = first ?? 0;
  const m = mid ?? 0;
  const fi = final ?? 0;
  return Math.round((f * 0.25 + m * 0.25 + fi * 0.5) * 10) / 10;
}

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
    { data: marks },
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
    supabase
      .from("marks")
      .select("subject, first, mid, final")
      .eq("student_id", selectedId)
      .order("subject", { ascending: true }),
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

  const attendanceCounts = (attendance ?? []).reduce(
    (acc, a) => {
      acc[a.status as "present" | "absent" | "leave"] += 1;
      return acc;
    },
    { present: 0, absent: 0, leave: 0 }
  );

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
          <span className="text-amber-600 font-medium">
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
                      ? "bg-danger-soft0"
                      : "bg-amber-400")
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Marks */}
      <section className="bg-surface rounded-xl border border-line p-5">
        <h2 className="font-medium text-ink mb-3">Marks</h2>
        {(marks ?? []).length === 0 ? (
          <p className="text-sm text-muted">No marks recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-line">
                <th className="py-2 font-medium">Subject</th>
                <th className="py-2 font-medium">First</th>
                <th className="py-2 font-medium">Mid</th>
                <th className="py-2 font-medium">Final</th>
                <th className="py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(marks ?? []).map((m) => (
                <tr key={m.subject}>
                  <td className="py-2 font-medium text-ink">{m.subject}</td>
                  <td className="py-2 text-muted">{m.first ?? "—"}</td>
                  <td className="py-2 text-muted">{m.mid ?? "—"}</td>
                  <td className="py-2 text-muted">{m.final ?? "—"}</td>
                  <td className="py-2 font-medium text-ink">
                    {weightedTotal(m.first, m.mid, m.final)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Homework */}
      <section className="bg-surface rounded-xl border border-line p-5">
        <h2 className="font-medium text-ink mb-3">Homework</h2>
        {(homework ?? []).length === 0 ? (
          <p className="text-sm text-muted">No homework posted yet.</p>
        ) : (
          <div className="space-y-3">
            {(homework ?? []).map((h) => (
              <div key={h.id} className="border-b border-line last:border-0 pb-3 last:pb-0">
                <p className="font-medium text-ink">
                  {h.title}
                  {h.subject && (
                    <span className="text-muted font-normal"> · {h.subject}</span>
                  )}
                </p>
                {h.description && (
                  <p className="text-sm text-muted">{h.description}</p>
                )}
                {h.due_date && (
                  <p className="text-xs text-muted">Due: {h.due_date}</p>
                )}
              </div>
            ))}
          </div>
        )}
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
    </div>
  );
}
