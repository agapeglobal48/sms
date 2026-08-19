"use client";

import { useTransition, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setFeeStatus } from "./actions";
import PrintButton from "@/components/shared/PrintButton";
import PrintHeader from "@/components/shared/PrintHeader";

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
  schoolName,
  schoolAddress,
  schoolLogoUrl,
}: {
  month: string;
  students: StudentFee[];
  classes: ClassOption[];
  schoolName: string;
  schoolAddress: string | null;
  schoolLogoUrl: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [classFilterOpen, setClassFilterOpen] = useState(false);
  const [selectedClassKeys, setSelectedClassKeys] = useState<Set<string>>(
    new Set([...classes.map((c) => c.id), "unassigned"])
  );

  function className(id: string | null) {
    if (!id) return "Unassigned";
    return classes.find((c) => c.id === id)?.name ?? "Unassigned";
  }

  function classKey(id: string | null) {
    return id ?? "unassigned";
  }

  function toggleClassKey(key: string) {
    setSelectedClassKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const hasUnassigned = students.some((s) => s.class_id === null);
  const visibleStudents = students.filter((s) => selectedClassKeys.has(classKey(s.class_id)));

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

  const paidCount = visibleStudents.filter((s) => s.status === "paid").length;

  return (
    <div className="space-y-6">
      <PrintHeader schoolName={schoolName} address={schoolAddress} logoUrl={schoolLogoUrl} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-ink">Fees</h1>
        <div className="flex items-center gap-3 print:hidden">
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
          <div className="relative">
            <button
              onClick={() => setClassFilterOpen((v) => !v)}
              className="rounded-lg border border-line text-sm font-medium px-3 py-2 text-ink hover:bg-paper"
            >
              Classes ({selectedClassKeys.size}) ▾
            </button>
            {classFilterOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-surface border border-line rounded-lg shadow-lg p-3 z-10 space-y-2">
                <div className="flex justify-between text-xs">
                  <button
                    onClick={() =>
                      setSelectedClassKeys(
                        new Set([...classes.map((c) => c.id), "unassigned"])
                      )
                    }
                    className="text-brand-light hover:text-brand font-medium"
                  >
                    Select all
                  </button>
                  <button
                    onClick={() => setSelectedClassKeys(new Set())}
                    className="text-muted hover:text-ink font-medium"
                  >
                    Select none
                  </button>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {classes.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={selectedClassKeys.has(c.id)}
                        onChange={() => toggleClassKey(c.id)}
                        className="rounded border-line"
                      />
                      {c.name}
                    </label>
                  ))}
                  {hasUnassigned && (
                    <label className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={selectedClassKeys.has("unassigned")}
                        onChange={() => toggleClassKey("unassigned")}
                        className="rounded border-line"
                      />
                      Unassigned
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>
          <Link
            href="/admin/fees/ledger"
            className="text-sm text-brand-light hover:text-brand font-medium"
          >
            Monthly ledger →
          </Link>
          <PrintButton />
        </div>
      </div>

      <p className="text-sm text-muted">
        {paidCount} of {visibleStudents.length} students paid for this month.
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
            {visibleStudents.length === 0 && (
              <tr>
                <td colSpan={5} className="p-5 text-muted">
                  No students to show for the selected classes.
                </td>
              </tr>
            )}
            {visibleStudents.map((s, i) => {
              const prevClassId = i > 0 ? visibleStudents[i - 1].class_id : undefined;
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
                    <td className="p-3 whitespace-nowrap print:hidden">
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
