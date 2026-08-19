import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "@/components/shared/PrintButton";
import { computeWeightedTotal } from "@/lib/marks";

export default async function StudentRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user!.id)
    .single();

  const { data: student } = await supabase
    .from("students")
    .select(
      "id, name, father_name, roll_no, gender, dob, date_of_admission, contact, address, monthly_fee, class_id, school_id"
    )
    .eq("id", id)
    .single();

  if (!student || student.school_id !== profile?.school_id) {
    notFound();
  }

  const [{ data: classInfo }, { data: attendance }, { data: components }, { data: fees }] =
    await Promise.all([
      student.class_id
        ? supabase.from("classes").select("name").eq("id", student.class_id).single()
        : Promise.resolve({ data: null }),
      supabase
        .from("attendance")
        .select("date, status")
        .eq("student_id", id)
        .order("date", { ascending: false })
        .limit(30),
      student.class_id
        ? supabase
            .from("assessment_components")
            .select("id, subject, name, weight, included, sort_order")
            .eq("class_id", student.class_id)
            .order("subject", { ascending: true })
            .order("sort_order", { ascending: true })
        : Promise.resolve({ data: [] as never[] }),
      supabase
        .from("fees")
        .select("month, status")
        .eq("student_id", id)
        .order("month", { ascending: false }),
    ]);

  const componentIds = (components ?? []).map((c) => c.id);
  const { data: entries } = componentIds.length
    ? await supabase
        .from("mark_entries")
        .select("component_id, score")
        .eq("student_id", id)
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

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/admin/students" className="text-sm text-brand-light hover:text-brand">
          ← Back to Students
        </Link>
        <PrintButton label="Print report" />
      </div>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-ink">{student.name}</h1>
          <p className="text-sm text-muted">{classInfo?.name ?? "Not assigned to a class"}</p>
        </div>
        <Link
          href="/admin/students"
          className="text-sm text-brand-light hover:text-brand font-medium print:hidden"
        >
          Edit details
        </Link>
      </div>

      {/* Basic info */}
      <section className="bg-surface rounded-xl border border-line p-5">
        <h2 className="font-medium text-ink mb-3">Enrollment details</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <Info label="Roll No" value={student.roll_no?.toString()} />
          <Info label="Father's Name" value={student.father_name} />
          <Info label="Gender" value={student.gender} />
          <Info label="Date of Birth" value={student.dob} />
          <Info label="Date of Admission" value={student.date_of_admission} />
          <Info label="Contact" value={student.contact} />
          <Info label="Monthly Fee" value={`Rs. ${student.monthly_fee}`} />
          <Info label="Address" value={student.address} />
        </div>
      </section>

      {/* Attendance */}
      <section className="bg-surface rounded-xl border border-line p-5">
        <h2 className="font-medium text-ink mb-3">Attendance (last 30 records)</h2>
        <div className="flex gap-4 text-sm mb-4">
          <span className="text-success font-medium">
            {attendanceCounts.present} Present
          </span>
          <span className="text-danger font-medium">{attendanceCounts.absent} Absent</span>
          <span className="text-gold font-medium">{attendanceCounts.leave} Leave</span>
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

      {/* Marks — grouped by subject, one weighted total per subject */}
      <section className="bg-surface rounded-xl border border-line p-5">
        <h2 className="font-medium text-ink mb-3">Marks</h2>
        {subjectGroups.size === 0 ? (
          <p className="text-sm text-muted">No marks recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {Array.from(subjectGroups.entries()).map(([subject, subjectComponents]) => (
              <div key={subject}>
                <p className="font-medium text-ink text-sm mb-1">{subject}</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted border-b border-line">
                      {subjectComponents.map((c) => (
                        <th key={c.id} className="py-1.5 font-medium">
                          {c.name} ({c.weight}%)
                        </th>
                      ))}
                      <th className="py-1.5 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {subjectComponents.map((c) => (
                        <td key={c.id} className="py-1.5 text-muted">
                          {scoreByComponentId.get(c.id) ?? "—"}
                        </td>
                      ))}
                      <td className="py-1.5 font-medium text-ink">
                        {computeWeightedTotal(subjectComponents, scoreByComponentId)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Fees */}
      <section className="bg-surface rounded-xl border border-line p-5">
        <h2 className="font-medium text-ink mb-3">Fee history</h2>
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

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
      <p className="text-ink">{value || "—"}</p>
    </div>
  );
}
