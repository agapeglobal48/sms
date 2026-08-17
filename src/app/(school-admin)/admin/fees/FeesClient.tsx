"use client";

import { useTransition, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setFeeStatus } from "./actions";

type ClassOption = { id: string; name: string };
type StudentFee = {
  id: string;
  name: string;
  roll_no: number | null;
  monthly_fee: number;
  status: "paid" | "unpaid";
  class_id: string | null;
};

export default function FeesClient({
  month,
  students,
  classes,
}: {
  month: string;
  students: StudentFee[];
  classes: ClassOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function className(id: string | null) {
    if (!id) return "Unassigned";
    return classes.find((c) => c.id === id)?.name ?? "Unassigned";
  }

  function handleMonthChange(newMonth: string) {
    router.push(`/admin/fees?month=${newMonth}`);
  }

  function handleToggle(studentId: string, current: "paid" | "unpaid") {
    setError(null);
    setPendingId(studentId);
    const next = current === "paid" ? "unpaid" : "paid";
    startTransition(async () => {
      try {
        await setFeeStatus(studentId, month, next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setPendingId(null);
      }
    });
  }

  const paidCount = students.filter((s) => s.status === "paid").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-ink">Fees</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted" htmlFor="month">
            Month
          </label>
          <input
            id="month"
            type="month"
            value={month}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
          />
        </div>
      </div>

      <p className="text-sm text-muted">
        {paidCount} of {students.length} students paid for this month.
      </p>

      {error && (
        <p className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="bg-surface rounded-xl border border-line overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-line">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Roll No</th>
              <th className="p-3 font-medium">Monthly Fee</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {students.length === 0 && (
              <tr>
                <td colSpan={5} className="p-5 text-muted">
                  No students yet — add students first.
                </td>
              </tr>
            )}
            {students.map((s, i) => {
              const prevClassId = i > 0 ? students[i - 1].class_id : undefined;
              const showGroupHeader = s.class_id !== prevClassId;
              return (
                <Fragment key={s.id}>
                  {showGroupHeader && (
                    <tr className="bg-paper">
                      <td
                        colSpan={5}
                        className="px-3 py-1.5 text-xs font-semibold text-muted uppercase tracking-wide"
                      >
                        {className(s.class_id)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="p-3 font-medium text-ink">{s.name}</td>
                    <td className="p-3 text-muted">{s.roll_no ?? "—"}</td>
                    <td className="p-3 text-muted">Rs. {s.monthly_fee}</td>
                    <td className="p-3">
                      <span
                        className={
                          s.status === "paid"
                            ? "inline-block rounded-full bg-success-soft text-success text-xs font-medium px-2.5 py-1"
                            : "inline-block rounded-full bg-danger-soft text-danger text-xs font-medium px-2.5 py-1"
                        }
                      >
                        {s.status === "paid" ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <Link
                        href={`/admin/students/${s.id}`}
                        className="text-sm text-brand-light hover:text-brand font-medium mr-4"
                      >
                        View full record
                      </Link>
                      <button
                        onClick={() => handleToggle(s.id, s.status)}
                        disabled={isPending && pendingId === s.id}
                        className="text-sm text-brand-light hover:text-brand font-medium disabled:opacity-60"
                      >
                        {isPending && pendingId === s.id
                          ? "Updating…"
                          : s.status === "paid"
                            ? "Mark unpaid"
                            : "Mark paid"}
                      </button>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
