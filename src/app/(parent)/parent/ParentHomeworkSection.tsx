"use client";

import { useState, useTransition } from "react";
import { markHomeworkComplete, unmarkHomeworkComplete } from "./actions";

type HomeworkItem = {
  id: string;
  subject: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  completedAt: string | null;
  photoUrl: string | null;
};

export default function ParentHomeworkSection({
  studentId,
  homework,
}: {
  studentId: string;
  homework: HomeworkItem[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [openFormId, setOpenFormId] = useState<string | null>(null);

  function handleComplete(homeworkId: string, formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await markHomeworkComplete(homeworkId, studentId, formData);
        setOpenFormId(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleUndo(homeworkId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await unmarkHomeworkComplete(homeworkId, studentId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  if (homework.length === 0) {
    return <p className="text-sm text-muted">No homework posted yet.</p>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {homework.map((h) => (
        <div key={h.id} className="border-b border-line last:border-0 pb-3 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-ink">
                {h.title}
                {h.subject && (
                  <span className="text-muted font-normal"> · {h.subject}</span>
                )}
              </p>
              {h.description && (
                <p className="text-sm text-muted">{h.description}</p>
              )}
              {h.due_date && (
                <p className="text-xs text-muted">Due: {h.due_date}</p>
              )}
            </div>
            {h.completed ? (
              <div className="text-right shrink-0">
                <p className="text-xs text-success font-medium">
                  Completed {h.completedAt ? new Date(h.completedAt).toLocaleDateString() : ""}
                </p>
                {h.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={h.photoUrl}
                    alt="Completed homework"
                    className="w-12 h-12 rounded-lg object-cover border border-line mt-1 ml-auto"
                  />
                )}
                <button
                  onClick={() => handleUndo(h.id)}
                  disabled={isPending}
                  className="text-xs text-muted hover:text-ink font-medium mt-1 disabled:opacity-60"
                >
                  Undo
                </button>
              </div>
            ) : (
              <button
                onClick={() => setOpenFormId(openFormId === h.id ? null : h.id)}
                className="text-sm text-brand-light hover:text-brand font-medium shrink-0"
              >
                Mark complete
              </button>
            )}
          </div>

          {openFormId === h.id && !h.completed && (
            <form
              action={(fd) => handleComplete(h.id, fd)}
              className="mt-2 flex items-center gap-2 flex-wrap"
            >
              <input
                type="file"
                name="photo"
                accept="image/*"
                className="text-xs text-ink"
              />
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-brand-light text-white text-xs font-medium px-3 py-1.5 hover:bg-brand transition-colors disabled:opacity-60"
              >
                {isPending ? "Saving…" : "Confirm complete"}
              </button>
              <span className="text-xs text-muted">Photo is optional.</span>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}
