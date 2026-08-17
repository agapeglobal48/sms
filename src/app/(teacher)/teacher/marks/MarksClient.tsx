"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMarks, type MarksEntry } from "./actions";

type ClassOption = { id: string; name: string };
type StudentMarks = {
  id: string;
  name: string;
  roll_no: number | null;
  first: number | null;
  mid: number | null;
  final: number | null;
};

function weightedTotal(first: number | null, mid: number | null, final: number | null) {
  const f = first ?? 0;
  const m = mid ?? 0;
  const fi = final ?? 0;
  return Math.round((f * 0.25 + m * 0.25 + fi * 0.5) * 10) / 10;
}

export default function MarksClient({
  classes,
  classId,
  subject,
  subjectOptions,
  students,
}: {
  classes: ClassOption[];
  classId: string;
  subject: string;
  subjectOptions: string[];
  students: StudentMarks[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [subjectInput, setSubjectInput] = useState(subject);
  const [rows, setRows] = useState<StudentMarks[]>(students);

  function updateQuery(next: { classId?: string; subject?: string }) {
    const params = new URLSearchParams({
      classId: next.classId ?? classId,
      subject: next.subject ?? subject,
    });
    router.push(`/teacher/marks?${params.toString()}`);
  }

  function updateField(
    studentId: string,
    field: "first" | "mid" | "final",
    value: string
  ) {
    const num = value === "" ? null : Number(value);
    setRows((prev) =>
      prev.map((r) => (r.id === studentId ? { ...r, [field]: num } : r))
    );
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    const entries: MarksEntry[] = rows.map((r) => ({
      studentId: r.id,
      first: r.first,
      mid: r.mid,
      final: r.final,
    }));
    startTransition(async () => {
      try {
        await saveMarks(classId, subjectInput, entries);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-ink">Marks</h1>
        <div className="flex items-center gap-3">
          <select
            value={classId}
            onChange={(e) => updateQuery({ classId: e.target.value })}
            className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateQuery({ subject: subjectInput });
            }}
            className="flex gap-2"
          >
            <input
              list="subject-options"
              value={subjectInput}
              onChange={(e) => setSubjectInput(e.target.value)}
              placeholder="Subject (e.g. Mathematics)"
              className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
            />
            <datalist id="subject-options">
              {subjectOptions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <button
              type="submit"
              className="rounded-lg border border-line text-sm font-medium px-3 py-2 text-ink hover:bg-paper"
            >
              Go
            </button>
          </form>
        </div>
      </div>

      <p className="text-sm text-muted">
        Total = 25% First Term + 25% Mid Term + 50% Final.
      </p>

      {error && (
        <p className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="text-sm text-success bg-success-soft border border-success/20 rounded-lg px-3 py-2">
          Marks saved.
        </p>
      )}

      {!subject ? (
        <p className="text-sm text-muted">
          Type a subject above and press &quot;Go&quot; to start entering marks.
        </p>
      ) : (
        <div className="bg-surface rounded-xl border border-line overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-line">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Roll No</th>
                <th className="p-3 font-medium">First (25%)</th>
                <th className="p-3 font-medium">Mid (25%)</th>
                <th className="p-3 font-medium">Final (50%)</th>
                <th className="p-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-5 text-muted">
                    No students in this class yet.
                  </td>
                </tr>
              )}
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className="p-3 font-medium text-ink">{s.name}</td>
                  <td className="p-3 text-muted">{s.roll_no ?? "—"}</td>
                  <td className="p-3">
                    <MarkInput
                      value={s.first}
                      onChange={(v) => updateField(s.id, "first", v)}
                    />
                  </td>
                  <td className="p-3">
                    <MarkInput
                      value={s.mid}
                      onChange={(v) => updateField(s.id, "mid", v)}
                    />
                  </td>
                  <td className="p-3">
                    <MarkInput
                      value={s.final}
                      onChange={(v) => updateField(s.id, "final", v)}
                    />
                  </td>
                  <td className="p-3 font-medium text-ink">
                    {weightedTotal(s.first, s.mid, s.final)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subject && rows.length > 0 && (
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save marks"}
        </button>
      )}
    </div>
  );
}

function MarkInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      max={100}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-20 rounded-lg border border-line px-2 py-1.5 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
    />
  );
}
