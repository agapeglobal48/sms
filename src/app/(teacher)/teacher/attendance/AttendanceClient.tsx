"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  queueAttendance,
  getPendingAttendanceForClassDate,
} from "@/lib/offline/db";
import { notifyParentsOfStudent } from "@/lib/notifications";

type ClassOption = { id: string; name: string };
type Status = "present" | "absent" | "leave";
type StudentAttendance = {
  id: string;
  name: string;
  roll_no: number | null;
  status: Status | null;
};

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "leave", label: "Leave" },
];

export default function AttendanceClient({
  classes,
  classId,
  date,
  students,
  schoolId,
  teacherId,
}: {
  classes: ClassOption[];
  classId: string;
  date: string;
  students: StudentAttendance[];
  schoolId: string;
  teacherId: string;
}) {
  const router = useRouter();
  const [isSubmitting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState(students);
  const [offlineKeys, setOfflineKeys] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  // On mount, overlay any not-yet-synced offline marks for this exact
  // class+date so the teacher sees what they already entered, even if the
  // page reloaded while still offline. (A `key` on this component from the
  // page forces a clean remount whenever class/date changes, so `rows`
  // always starts from the fresh `students` prop.)
  useEffect(() => {
    getPendingAttendanceForClassDate(classId, date).then((queued) => {
      if (queued.length === 0) return;
      const byStudent = new Map(queued.map((q) => [q.studentId, q.status]));
      setOfflineKeys(new Set(queued.map((q) => q.studentId)));
      setRows((prev) =>
        prev.map((r) =>
          byStudent.has(r.id) ? { ...r, status: byStudent.get(r.id)! } : r
        )
      );
    });
  }, [classId, date]);

  function updateQuery(next: { classId?: string; date?: string }) {
    const params = new URLSearchParams({
      classId: next.classId ?? classId,
      date: next.date ?? date,
    });
    router.push(`/teacher/attendance?${params.toString()}`);
  }

  // Selecting a status only updates local state — nothing is saved until
  // "Submit Attendance" is pressed, so the teacher can mark the whole class
  // first and correct mistakes before anything hits the database.
  function handleSelect(studentId: string, status: Status) {
    setSubmitted(false);
    setRows((prev) =>
      prev.map((r) => (r.id === studentId ? { ...r, status } : r))
    );
  }

  function handleMarkAllPresent() {
    setSubmitted(false);
    setRows((prev) => prev.map((r) => ({ ...r, status: "present" })));
  }

  function handleSubmit() {
    setError(null);
    const marked = rows.filter((r): r is StudentAttendance & { status: Status } =>
      r.status !== null
    );
    if (marked.length === 0) {
      setError("Mark at least one student before submitting.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const entries = marked.map((r) => ({
        school_id: schoolId,
        class_id: classId,
        student_id: r.id,
        date,
        status: r.status,
        marked_by: teacherId,
      }));

      let wroteDirectly = false;
      if (navigator.onLine) {
        const { error: writeError } = await supabase
          .from("attendance")
          .upsert(entries, { onConflict: "student_id,date" });
        wroteDirectly = !writeError;
      }

      if (wroteDirectly) {
        setOfflineKeys(new Set());
        // Best-effort — a notification failure shouldn't block attendance
        // from being marked. Only alert on absent/leave; present is the
        // default expectation and would just be noise.
        for (const r of marked) {
          if (r.status === "present") continue;
          try {
            await notifyParentsOfStudent(supabase, {
              schoolId,
              studentId: r.id,
              type: "attendance",
              title: `${r.name} marked ${r.status} on ${date}`,
            });
          } catch {
            // ignore — not worth surfacing to the teacher
          }
        }
      } else {
        for (const r of marked) {
          await queueAttendance({
            studentId: r.id,
            classId,
            schoolId,
            date,
            status: r.status,
            markedBy: teacherId,
          });
        }
        setOfflineKeys(new Set(marked.map((r) => r.id)));
      }

      setSubmitted(true);
    });
  }

  const markedCount = rows.filter((r) => r.status !== null).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-ink">Attendance</h1>
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
          <input
            type="date"
            value={date}
            onChange={(e) => updateQuery({ date: e.target.value })}
            className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
          />
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted">
          {markedCount} of {rows.length} students marked.
        </p>
        <button
          onClick={handleMarkAllPresent}
          className="text-sm text-brand-light hover:text-brand font-medium"
        >
          Mark all present
        </button>
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {submitted && !error && (
        <p className="text-sm text-success bg-success-soft border border-success/20 rounded-lg px-3 py-2">
          {offlineKeys.size > 0
            ? "Attendance saved on this device — will sync automatically."
            : "Attendance submitted."}
        </p>
      )}

      <div className="bg-surface rounded-xl border border-line divide-y divide-line">
        {rows.length === 0 && (
          <p className="p-5 text-sm text-muted">
            No students in this class yet.
          </p>
        )}
        {rows.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between p-4 flex-wrap gap-3"
          >
            <div>
              <p className="font-medium text-ink">
                {s.name}
                {offlineKeys.has(s.id) && (
                  <span
                    title="Saved on this device — will sync automatically"
                    className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-gold align-middle"
                  />
                )}
              </p>
              <p className="text-sm text-muted">
                Roll No: {s.roll_no ?? "—"}
              </p>
            </div>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const active = s.status === opt.value;
                const colors =
                  opt.value === "present"
                    ? "bg-success text-white"
                    : opt.value === "absent"
                      ? "bg-danger text-white"
                      : "bg-gold text-white";
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleSelect(s.id, opt.value)}
                    className={
                      "rounded-lg text-xs font-medium px-3 py-1.5 border transition-colors " +
                      (active
                        ? colors + " border-transparent"
                        : "bg-surface text-muted border-line hover:bg-paper")
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {rows.length > 0 && (
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="rounded-lg bg-brand-light text-white text-sm font-medium px-6 py-2.5 hover:bg-brand transition-colors disabled:opacity-60"
        >
          {isSubmitting ? "Submitting…" : "Submit Attendance"}
        </button>
      )}
    </div>
  );
}
