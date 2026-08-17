"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createHomework, deleteHomework } from "./actions";

type ClassOption = { id: string; name: string };
type HomeworkItem = {
  id: string;
  subject: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
};

export default function HomeworkClient({
  classes,
  classId,
  homework,
}: {
  classes: ClassOption[];
  classId: string;
  homework: HomeworkItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  function handleClassChange(newClassId: string) {
    router.push(`/teacher/homework?classId=${newClassId}`);
  }

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createHomework(classId, formData);
        setAddOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleDelete(homeworkId: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteHomework(homeworkId, classId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-ink">Homework</h1>
        <div className="flex items-center gap-3">
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
          <button
            onClick={() => setAddOpen((v) => !v)}
            className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors"
          >
            {addOpen ? "Cancel" : "+ Add homework"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {addOpen && (
        <form
          action={handleCreate}
          className="bg-surface rounded-xl border border-line p-5 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Title
              </label>
              <input
                name="title"
                required
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Subject
              </label>
              <input
                name="subject"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Due date
              </label>
              <input
                name="dueDate"
                type="date"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-ink mb-1">
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors disabled:opacity-60"
          >
            {isPending ? "Adding…" : "Add homework"}
          </button>
        </form>
      )}

      <div className="bg-surface rounded-xl border border-line divide-y divide-line">
        {homework.length === 0 && (
          <p className="p-5 text-sm text-muted">
            No homework posted for this class yet.
          </p>
        )}
        {homework.map((h) => (
          <div key={h.id} className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-medium text-ink">
                {h.title}
                {h.subject && (
                  <span className="text-muted font-normal"> · {h.subject}</span>
                )}
              </p>
              <button
                onClick={() => handleDelete(h.id, h.title)}
                disabled={isPending}
                className="text-sm text-danger hover:text-danger font-medium disabled:opacity-60"
              >
                Delete
              </button>
            </div>
            {h.description && (
              <p className="text-sm text-muted">{h.description}</p>
            )}
            {h.due_date && (
              <p className="text-xs text-muted">Due: {h.due_date}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
