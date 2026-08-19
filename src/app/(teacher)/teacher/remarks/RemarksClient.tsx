"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addRemark, deleteRemark } from "./actions";

type ClassOption = { id: string; name: string };
type Remark = { id: string; remark: string; created_at: string };
type StudentRow = {
  id: string;
  name: string;
  roll_no: number | null;
  remarks: Remark[];
};

export default function RemarksClient({
  classes,
  classId,
  students,
}: {
  classes: ClassOption[];
  classId: string;
  students: StudentRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [openStudentId, setOpenStudentId] = useState<string | null>(null);

  function handleClassChange(newClassId: string) {
    router.push(`/teacher/remarks?classId=${newClassId}`);
  }

  function handleAdd(studentId: string, formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addRemark(classId, studentId, formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleDelete(remarkId: string) {
    if (!confirm("Delete this remark?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteRemark(remarkId, classId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-ink">Remarks</h1>
        <select
          value={classId}
          onChange={(e) => handleClassChange(e.target.value)}
          className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-muted">
        Note things a student is doing well, or areas they need support in — visible to the
        student&apos;s parent and to School Admin.
      </p>

      {error && (
        <p className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="bg-surface rounded-xl border border-line divide-y divide-line">
        {students.length === 0 && (
          <p className="p-5 text-sm text-muted">No students in this class yet.</p>
        )}
        {students.map((s) => (
          <div key={s.id} className="p-4">
            <button
              onClick={() => setOpenStudentId(openStudentId === s.id ? null : s.id)}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="font-medium text-ink">
                {s.name}
                <span className="text-muted font-normal text-sm">
                  {" "}
                  · Roll No: {s.roll_no ?? "—"} · {s.remarks.length} remark
                  {s.remarks.length === 1 ? "" : "s"}
                </span>
              </span>
              <span className="text-sm text-brand-light">
                {openStudentId === s.id ? "Close" : "Open"}
              </span>
            </button>

            {openStudentId === s.id && (
              <div className="mt-3 space-y-3">
                {s.remarks.length > 0 && (
                  <div className="space-y-2">
                    {s.remarks.map((r) => (
                      <div
                        key={r.id}
                        className="bg-paper rounded-lg p-3 text-sm flex items-start justify-between gap-3"
                      >
                        <div>
                          <p className="text-ink">{r.remark}</p>
                          <p className="text-xs text-muted mt-1">
                            {new Date(r.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={isPending}
                          className="text-xs text-danger hover:text-danger font-medium shrink-0 disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <form action={(fd) => handleAdd(s.id, fd)} className="flex gap-2">
                  <textarea
                    name="remark"
                    rows={2}
                    required
                    placeholder="e.g. Doing great in class participation, or needs support with reading."
                    className="flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors disabled:opacity-60 self-start"
                  >
                    Add
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
