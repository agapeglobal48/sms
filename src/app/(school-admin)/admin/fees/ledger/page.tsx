import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "@/components/shared/PrintButton";

function lastTwelveMonths(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export default async function FeesLedgerPage() {
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

  const months = lastTwelveMonths();

  const [{ data: students }, { data: fees }] = await Promise.all([
    supabase
      .from("students")
      .select("id, monthly_fee")
      .eq("school_id", schoolId),
    supabase
      .from("fees")
      .select("month, status, student_id")
      .eq("school_id", schoolId)
      .in("month", months),
  ]);

  const totalStudents = (students ?? []).length;
  const totalExpectedPerMonth = (students ?? []).reduce((sum, s) => sum + (s.monthly_fee ?? 0), 0);
  const feeByStudentId = new Map((students ?? []).map((s) => [s.id, s.monthly_fee ?? 0]));

  const rows = months.map((month) => {
    const paidForMonth = (fees ?? []).filter((f) => f.month === month && f.status === "paid");
    const collected = paidForMonth.reduce(
      (sum, f) => sum + (feeByStudentId.get(f.student_id) ?? 0),
      0
    );
    const rate = totalExpectedPerMonth > 0 ? Math.round((collected / totalExpectedPerMonth) * 100) : null;
    return {
      month,
      paidCount: paidForMonth.length,
      totalStudents,
      collected,
      expected: totalExpectedPerMonth,
      rate,
    };
  });

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/admin/fees" className="text-sm text-brand-light hover:text-brand">
          ← Back to Fees
        </Link>
        <PrintButton />
      </div>

      <h1 className="text-2xl font-heading font-bold text-ink">
        Monthly Fee Ledger (last 12 months)
      </h1>

      <div className="bg-surface rounded-xl border border-line overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-line">
              <th className="p-3 font-medium">Month</th>
              <th className="p-3 font-medium">Students Paid</th>
              <th className="p-3 font-medium">Collected</th>
              <th className="p-3 font-medium">Expected</th>
              <th className="p-3 font-medium">Collection Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.month}>
                <td className="p-3 font-medium text-ink">{r.month}</td>
                <td className="p-3 text-muted">
                  {r.paidCount} / {r.totalStudents}
                </td>
                <td className="p-3 text-muted">Rs. {r.collected.toLocaleString()}</td>
                <td className="p-3 text-muted">Rs. {r.expected.toLocaleString()}</td>
                <td className="p-3 font-medium text-ink">
                  {r.rate !== null ? `${r.rate}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
