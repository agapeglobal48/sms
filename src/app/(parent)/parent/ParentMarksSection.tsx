"use client";

import { useState } from "react";
import { computeWeightedTotal, type Component } from "@/lib/marks";

type SubjectGroup = { subject: string; components: Component[] };

const CUMULATIVE = "__cumulative__";

export default function ParentMarksSection({
  subjectGroups,
  scores,
}: {
  subjectGroups: SubjectGroup[];
  scores: Record<string, number | null>;
}) {
  const termNames = Array.from(
    new Set(subjectGroups.flatMap((g) => g.components.map((c) => c.name)))
  );
  const [selected, setSelected] = useState<string>(termNames[0] ?? CUMULATIVE);

  if (subjectGroups.length === 0) {
    return <p className="text-sm text-muted">No marks recorded yet.</p>;
  }

  const isCumulative = selected === CUMULATIVE;

  return (
    <div className="space-y-3">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
      >
        {termNames.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
        <option value={CUMULATIVE}>Cumulative (all terms)</option>
      </select>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted border-b border-line">
            <th className="py-2 font-medium">Subject</th>
            <th className="py-2 font-medium">{isCumulative ? "Total" : "Score"}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {subjectGroups.map((g) => {
            if (isCumulative) {
              const scoreMap = new Map(g.components.map((c) => [c.id, scores[c.id] ?? null]));
              return (
                <tr key={g.subject}>
                  <td className="py-2 font-medium text-ink">{g.subject}</td>
                  <td className="py-2 text-ink font-medium">
                    {computeWeightedTotal(g.components, scoreMap)}
                  </td>
                </tr>
              );
            }
            const match = g.components.find((c) => c.name === selected);
            return (
              <tr key={g.subject}>
                <td className="py-2 font-medium text-ink">{g.subject}</td>
                <td className="py-2 text-muted">
                  {match ? (scores[match.id] ?? "—") : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
