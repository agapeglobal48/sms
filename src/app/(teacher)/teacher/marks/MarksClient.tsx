"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  saveMarkEntries,
  addComponent,
  updateComponent,
  removeComponent,
  type ScoreEntry,
} from "./actions";
import { sumIncludedWeights } from "@/lib/marks";

type ClassOption = { id: string; name: string };
type ComponentRow = {
  id: string;
  name: string;
  weight: number;
  included: boolean;
  is_default: boolean;
  sort_order: number;
};
type StudentScores = {
  id: string;
  name: string;
  roll_no: number | null;
  scores: Record<string, number | null>;
};

export default function MarksClient({
  classes,
  classId,
  subject,
  subjectOptions,
  restrictedToAssigned,
  components,
  students,
}: {
  classes: ClassOption[];
  classId: string;
  subject: string;
  subjectOptions: string[];
  restrictedToAssigned: boolean;
  components: ComponentRow[];
  students: StudentScores[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [subjectInput, setSubjectInput] = useState(subject);
  const [rows, setRows] = useState<StudentScores[]>(students);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  function updateQuery(next: { classId?: string; subject?: string }) {
    const params = new URLSearchParams({
      classId: next.classId ?? classId,
      subject: next.subject ?? subject,
    });
    router.push(`/teacher/marks?${params.toString()}`);
  }

  function updateScore(studentId: string, componentId: string, value: string) {
    const num = value === "" ? null : Number(value);
    setRows((prev) =>
      prev.map((r) =>
        r.id === studentId ? { ...r, scores: { ...r.scores, [componentId]: num } } : r
      )
    );
  }

  function handleSave(componentId: string) {
    setError(null);
    setSaved(false);
    const entries: ScoreEntry[] = rows.map((r) => ({
      studentId: r.id,
      componentId,
      score: r.scores[componentId] ?? null,
    }));
    startTransition(async () => {
      try {
        await saveMarkEntries(classId, subject, entries);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleAddComponent(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addComponent(classId, subject, formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleUpdateComponent(componentId: string, formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await updateComponent(componentId, classId, subject, formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleRemoveComponent(componentId: string, name: string) {
    if (!confirm(`Remove "${name}"? Any scores entered for it will be deleted too.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await removeComponent(componentId, classId, subject);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  const includedWeightTotal = sumIncludedWeights(components);
  const selectedComponent = components.find((c) => c.id === selectedComponentId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-ink">Marks</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={classId}
            onChange={(e) => {
              setSelectedComponentId(null);
              updateQuery({ classId: e.target.value });
            }}
            className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {restrictedToAssigned ? (
            subjectOptions.length > 1 ? (
              <select
                value={subject}
                onChange={(e) => {
                  setSelectedComponentId(null);
                  updateQuery({ subject: e.target.value });
                }}
                className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
              >
                {subjectOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-medium text-ink bg-paper rounded-lg px-3 py-2 border border-line">
                {subject}
              </span>
            )
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSelectedComponentId(null);
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
          )}

          {subject && (
            <Link
              href={`/teacher/marks/cumulative?classId=${classId}&subject=${encodeURIComponent(subject)}`}
              className="text-sm text-brand-light hover:text-brand font-medium"
            >
              Cumulative Result →
            </Link>
          )}
        </div>
      </div>

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
      ) : !selectedComponent ? (
        // ---- Picker: choose which term/test to work on ----
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Included weights total{" "}
            <span
              className={includedWeightTotal > 100 ? "text-danger font-medium" : "text-ink font-medium"}
            >
              {includedWeightTotal}%
            </span>
            {includedWeightTotal > 100 && " — over 100%, please fix below"}
          </p>

          <div className="bg-surface rounded-xl border border-line divide-y divide-line">
            {components.length === 0 && (
              <p className="p-5 text-sm text-muted">Setting up default terms…</p>
            )}
            {components.map((c) => (
              <div key={c.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedComponentId(c.id)}
                    className="text-left font-medium text-ink hover:text-brand"
                  >
                    {c.name} ({c.weight}%)
                    {!c.included && <span className="text-muted font-normal"> — excluded from cumulative</span>}
                  </button>
                  <button
                    onClick={() => setSelectedComponentId(c.id)}
                    className="text-sm text-brand-light hover:text-brand font-medium"
                  >
                    Enter marks →
                  </button>
                </div>
                <form
                  action={(fd) => handleUpdateComponent(c.id, fd)}
                  className="flex items-center gap-3 flex-wrap"
                >
                  <label className="text-xs text-muted">Weight</label>
                  <input
                    type="number"
                    name="weight"
                    min={0}
                    max={100}
                    defaultValue={c.weight}
                    className="w-16 rounded-lg border border-line px-2 py-1 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
                  />
                  <span className="text-xs text-muted">%</span>
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    <input
                      type="checkbox"
                      name="included"
                      defaultChecked={c.included}
                      className="rounded border-line"
                    />
                    Include in cumulative
                  </label>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="text-xs text-brand-light hover:text-brand font-medium disabled:opacity-60"
                  >
                    Save settings
                  </button>
                  {!c.is_default && (
                    <button
                      type="button"
                      onClick={() => handleRemoveComponent(c.id, c.name)}
                      disabled={isPending}
                      className="text-xs text-danger hover:text-danger font-medium disabled:opacity-60"
                    >
                      Remove
                    </button>
                  )}
                </form>
              </div>
            ))}
          </div>

          <form
            action={handleAddComponent}
            className="bg-surface rounded-xl border border-line p-4 flex items-end gap-3 flex-wrap"
          >
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                New term / test name
              </label>
              <input
                name="name"
                placeholder="e.g. Bi-Monthly Test"
                required
                className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Weight %</label>
              <input
                type="number"
                name="weight"
                min={0}
                max={100}
                defaultValue={0}
                className="w-20 rounded-lg border border-line px-2 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors disabled:opacity-60"
            >
              Add term / test
            </button>
          </form>
          <p className="text-xs text-muted">
            Examples: Summer Vacation, Bi-Monthly Test, Test — add as many as you like.
          </p>
        </div>
      ) : (
        // ---- Entry screen: one term/test at a time ----
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button
              onClick={() => setSelectedComponentId(null)}
              className="text-sm text-brand-light hover:text-brand font-medium"
            >
              ← Back to terms
            </button>
            <p className="text-sm font-medium text-ink">
              {selectedComponent.name} ({selectedComponent.weight}%)
            </p>
          </div>

          <div className="bg-surface rounded-xl border border-line overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-line">
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Roll No</th>
                  <th className="p-3 font-medium">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-5 text-muted">
                      No students in this class yet.
                    </td>
                  </tr>
                )}
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td className="p-3 font-medium text-ink">{s.name}</td>
                    <td className="p-3 text-muted">{s.roll_no ?? "—"}</td>
                    <td className="p-3">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={s.scores[selectedComponent.id] ?? ""}
                        onChange={(e) => updateScore(s.id, selectedComponent.id, e.target.value)}
                        className="w-24 rounded-lg border border-line px-2 py-1.5 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length > 0 && (
            <button
              onClick={() => handleSave(selectedComponent.id)}
              disabled={isPending}
              className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors disabled:opacity-60"
            >
              {isPending ? "Saving…" : `Save ${selectedComponent.name}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
