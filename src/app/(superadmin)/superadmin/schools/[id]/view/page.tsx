import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function ViewSchoolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: schoolId } = await params;
  const supabase = await createClient();
  const month = currentMonth();

  const { data: school } = await supabase
    .from("schools")
    .select("id, name, address")
    .eq("id", schoolId)
    .single();

  if (!school) notFound();

  const [
    { data: classes },
    { data: teachers },
    { data: students },
    { data: parents },
    { data: parentLinks },
    { data: fees },
  ] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, teacher_id, grade, section")
      .eq("school_id", schoolId)
      .order("grade", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("school_id", schoolId)
      .eq("role", "teacher")
      .order("full_name", { ascending: true }),
    supabase
      .from("students")
      .select("id, name, roll_no, class_id, monthly_fee")
      .eq("school_id", schoolId)
      .order("name", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("school_id", schoolId)
      .eq("role", "parent")
      .order("full_name", { ascending: true }),
    supabase.from("parent_student_links").select("parent_id, student_id"),
    supabase
      .from("fees")
      .select("student_id, status")
      .eq("school_id", schoolId)
      .eq("month", month),
  ]);

  const teacherName = (id: string | null) =>
    id ? (teachers ?? []).find((t) => t.id === id)?.full_name ?? "Unassigned" : "Unassigned";
  const className = (id: string | null) =>
    id ? (classes ?? []).find((c) => c.id === id)?.name ?? "Unassigned" : "Unassigned";

  const linksByParent = new Map<string, string[]>();
  for (const l of parentLinks ?? []) {
    const list = linksByParent.get(l.parent_id) ?? [];
    list.push(l.student_id);
    linksByParent.set(l.parent_id, list);
  }
  const studentName = (id: string) => (students ?? []).find((s) => s.id === id)?.name ?? "—";

  const paidStudentIds = new Set(
    (fees ?? []).filter((f) => f.status === "paid").map((f) => f.student_id)
  );

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <Link
        href="/superadmin/schools"
        className="text-sm text-brand-light hover:text-brand"
      >
        ← Back to Schools
      </Link>

      <div>
        <h1 className="text-2xl font-heading font-bold text-ink">{school.name}</h1>
        {school.address && <p className="text-sm text-muted">{school.address}</p>}
        <p className="text-xs text-gold font-medium mt-1">
          Read-only view — Superadmin
        </p>
      </div>

      {/* Classes */}
      <section className="bg-surface rounded-xl border border-line p-5">
        <h2 className="font-medium text-ink mb-3">
          Classes ({(classes ?? []).length})
        </h2>
        <div className="divide-y divide-line">
          {(classes ?? []).length === 0 && (
            <p className="text-sm text-muted">No classes yet.</p>
          )}
          {(classes ?? []).map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2 text-sm">
              <span className="font-medium text-ink">{c.name}</span>
              <span className="text-muted">Teacher: {teacherName(c.teacher_id)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Teachers */}
      <section className="bg-surface rounded-xl border border-line p-5">
        <h2 className="font-medium text-ink mb-3">
          Teachers ({(teachers ?? []).length})
        </h2>
        <div className="divide-y divide-line">
          {(teachers ?? []).length === 0 && (
            <p className="text-sm text-muted">No teachers yet.</p>
          )}
          {(teachers ?? []).map((t) => (
            <p key={t.id} className="py-2 text-sm text-ink">
              {t.full_name}
            </p>
          ))}
        </div>
      </section>

      {/* Students */}
      <section className="bg-surface rounded-xl border border-line p-5">
        <h2 className="font-medium text-ink mb-3">
          Students ({(students ?? []).length})
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-line">
              <th className="py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Roll No</th>
              <th className="py-2 font-medium">Class</th>
              <th className="py-2 font-medium">Monthly Fee</th>
              <th className="py-2 font-medium">Fee status ({month})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(students ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="py-3 text-muted">
                  No students yet.
                </td>
              </tr>
            )}
            {(students ?? []).map((s) => (
              <tr key={s.id}>
                <td className="py-2 font-medium text-ink">{s.name}</td>
                <td className="py-2 text-muted">{s.roll_no ?? "—"}</td>
                <td className="py-2 text-muted">{className(s.class_id)}</td>
                <td className="py-2 text-muted">Rs. {s.monthly_fee}</td>
                <td className="py-2">
                  <span
                    className={
                      paidStudentIds.has(s.id)
                        ? "text-success font-medium"
                        : "text-danger font-medium"
                    }
                  >
                    {paidStudentIds.has(s.id) ? "Paid" : "Unpaid"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Parents */}
      <section className="bg-surface rounded-xl border border-line p-5">
        <h2 className="font-medium text-ink mb-3">
          Parents ({(parents ?? []).length})
        </h2>
        <div className="divide-y divide-line">
          {(parents ?? []).length === 0 && (
            <p className="text-sm text-muted">No parents yet.</p>
          )}
          {(parents ?? []).map((p) => (
            <div key={p.id} className="py-2 text-sm">
              <p className="font-medium text-ink">{p.full_name}</p>
              <p className="text-muted text-xs">
                {(linksByParent.get(p.id) ?? []).map(studentName).join(", ") ||
                  "No children linked"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
