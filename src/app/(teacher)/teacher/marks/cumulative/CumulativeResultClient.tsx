"use client";

import { useState } from "react";
import Link from "next/link";
import PrintButton from "@/components/shared/PrintButton";
import { computeWeightedTotal, type Component } from "@/lib/marks";

type Student = { id: string; name: string; roll_no: number | null };

export default function CumulativeResultClient({
  classId,
  subject,
  className,
  components,
  students,
  scoresByKey,
}: {
  classId: string;
  subject: string;
  className: string;
  components: Component[];
  students: Student[];
  scoresByKey: Record<string, number | null>;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(components.filter((c) => c.included).map((c) => c.id))
  );

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const activeComponents: Component[] = components.map((c) => ({
    ...c,
    included: selectedIds.has(c.id),
  }));

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/teacher/marks?classId=${classId}&subject=${encodeURIComponent(subject)}`}
          className="text-sm text-brand-light hover:text-brand"
        >
          ← Back to Marks
        </Link>
        <PrintButton />
      </div>

      <div>
        <h1 className="text-2xl font-heading font-bold text-ink">Cumulative Result</h1>
        <p className="text-sm text-muted">
          {className} — {subject}
        </p>
      </div>

      <div className="bg-surface rounded-xl border border-line p-4 print:hidden">
        <p className="text-sm font-medium text-ink mb-2">
          Choose which terms/tests to include in this cumulative total:
        </p>
        <div className="flex flex-wrap gap-4">
          {components.map((c) => (
            <label key={c.id} className="flex items-center gap-1.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={selectedIds.has(c.id)}
                onChange={() => toggle(c.id)}
                className="rounded border-line"
              />
              {c.name} ({c.weight}%)
            </label>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-line overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-line">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Roll No</th>
              {components.map((c) => (
                <th key={c.id} className="p-3 font-medium whitespace-nowrap">
                  {c.name} ({c.weight}%)
                  {!selectedIds.has(c.id) && <span className="text-muted"> — excluded</span>}
                </th>
              ))}
              <th className="p-3 font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {students.length === 0 && (
              <tr>
                <td colSpan={components.length + 3} className="p-5 text-muted">
                  No students in this class.
                </td>
              </tr>
            )}
            {students.map((s) => {
              const scores = new Map(
                components.map((c) => [c.id, scoresByKey[`${s.id}:${c.id}`] ?? null])
              );
              return (
                <tr key={s.id}>
                  <td className="p-3 font-medium text-ink">{s.name}</td>
                  <td className="p-3 text-muted">{s.roll_no ?? "—"}</td>
                  {components.map((c) => (
                    <td key={c.id} className="p-3 text-muted">
                      {scores.get(c.id) ?? "—"}
                    </td>
                  ))}
                  <td className="p-3 font-medium text-ink">
                    {computeWeightedTotal(activeComponents, scores)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
