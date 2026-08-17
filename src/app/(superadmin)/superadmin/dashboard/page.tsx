import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/shared/PageHeader";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatRs(n: number) {
  return `Rs. ${Math.round(n).toLocaleString()}`;
}

export default async function SuperadminDashboardPage() {
  const supabase = await createClient();
  const month = currentMonth();

  const [
    { data: schools },
    { data: students },
    { data: profiles },
    { data: feesThisMonth },
    { data: funding },
    { data: bills },
  ] = await Promise.all([
    supabase.from("schools").select("id, name").order("name", { ascending: true }),
    supabase.from("students").select("id, school_id, monthly_fee"),
    supabase.from("profiles").select("role, school_id"),
    supabase.from("fees").select("student_id, status").eq("month", month),
    supabase.from("funding").select("school_id, amount"),
    supabase.from("bills").select("school_id, amount"),
  ]);

  const schoolList = schools ?? [];
  const studentList = students ?? [];
  const profileList = profiles ?? [];

  const teacherCount = profileList.filter((p) => p.role === "teacher").length;

  const paidStudentIds = new Set(
    (feesThisMonth ?? []).filter((f) => f.status === "paid").map((f) => f.student_id)
  );

  const fundingBySchool = new Map<string, number>();
  for (const f of funding ?? []) {
    fundingBySchool.set(f.school_id, (fundingBySchool.get(f.school_id) ?? 0) + f.amount);
  }
  const billsBySchool = new Map<string, number>();
  for (const b of bills ?? []) {
    billsBySchool.set(b.school_id, (billsBySchool.get(b.school_id) ?? 0) + b.amount);
  }

  const perSchool = schoolList.map((school) => {
    const schoolStudents = studentList.filter((s) => s.school_id === school.id);
    const expected = schoolStudents.reduce((sum, s) => sum + (s.monthly_fee ?? 0), 0);
    const collected = schoolStudents
      .filter((s) => paidStudentIds.has(s.id))
      .reduce((sum, s) => sum + (s.monthly_fee ?? 0), 0);
    const collectionRate = expected > 0 ? Math.round((collected / expected) * 100) : null;

    return {
      id: school.id,
      name: school.name,
      studentCount: schoolStudents.length,
      teacherCount: profileList.filter(
        (p) => p.role === "teacher" && p.school_id === school.id
      ).length,
      parentCount: profileList.filter(
        (p) => p.role === "parent" && p.school_id === school.id
      ).length,
      collectionRate,
      funding: fundingBySchool.get(school.id) ?? 0,
      spent: billsBySchool.get(school.id) ?? 0,
    };
  });

  const totalExpected = studentList.reduce((sum, s) => sum + (s.monthly_fee ?? 0), 0);
  const totalCollected = studentList
    .filter((s) => paidStudentIds.has(s.id))
    .reduce((sum, s) => sum + (s.monthly_fee ?? 0), 0);
  const overallRate =
    totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : null;

  const totalFunding = [...fundingBySchool.values()].reduce((a, b) => a + b, 0);
  const totalSpent = [...billsBySchool.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <PageHeader eyebrow="Overview" title="Dashboard" />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Schools" value={schoolList.length.toString()} />
        <StatCard label="Students" value={studentList.length.toString()} />
        <StatCard label="Teachers" value={teacherCount.toString()} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label={`Fee collection (${month})`}
          value={overallRate !== null ? `${overallRate}%` : "—"}
          sub={`${formatRs(totalCollected)} of ${formatRs(totalExpected)}`}
        />
        <StatCard label="Total funding allocated" value={formatRs(totalFunding)} />
        <StatCard label="Total spent (bills)" value={formatRs(totalSpent)} />
      </div>

      <h2 className="font-heading font-semibold text-ink mb-3">By school</h2>
      <div className="bg-surface rounded-xl border border-line overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-line">
              <th className="p-3 font-medium">School</th>
              <th className="p-3 font-medium">Students</th>
              <th className="p-3 font-medium">Teachers</th>
              <th className="p-3 font-medium">Parents</th>
              <th className="p-3 font-medium">Fee collection</th>
              <th className="p-3 font-medium">Funding</th>
              <th className="p-3 font-medium">Spent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {perSchool.length === 0 && (
              <tr>
                <td colSpan={7} className="p-5 text-muted">
                  No schools yet.
                </td>
              </tr>
            )}
            {perSchool.map((s) => (
              <tr key={s.id}>
                <td className="p-3 font-medium text-ink">{s.name}</td>
                <td className="p-3 text-ink/80">{s.studentCount}</td>
                <td className="p-3 text-ink/80">{s.teacherCount}</td>
                <td className="p-3 text-ink/80">{s.parentCount}</td>
                <td className="p-3 text-ink/80">
                  {s.collectionRate !== null ? `${s.collectionRate}%` : "—"}
                </td>
                <td className="p-3 text-ink/80">{formatRs(s.funding)}</td>
                <td className="p-3 text-ink/80">{formatRs(s.spent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-surface rounded-xl border border-line p-4">
      <p className="text-xs font-medium text-muted uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-heading font-bold text-ink mt-1">{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}
