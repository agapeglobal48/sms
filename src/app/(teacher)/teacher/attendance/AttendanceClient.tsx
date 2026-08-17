"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { setAttendance } from "./actions";

type ClassOption = { id: string; name: string };
type StudentAttendance = {
  id: string;
  name: string;
  roll_no: number | null;
  status: "present" | "absent" | "leave" | null;
};

const STATUS_OPTIONS: { value: "present" | "absent" | "leave"; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "leave", label: "Leave" },
];

export default function AttendanceClient({
  classes,
  classId,
  date,
  students,
}: {
  classes: ClassOption[];
  classId: string;
  date: string;
  students: StudentAttendance[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function updateQuery(next: { classId?: string; date?: string }) {
    const params = new URLSearchParams({
      classId: next.classId ?? classId,
      date: next.date ?? date,
    });
    router.push(`/teacher/attendance?${params.toString()}`);
  }

  function handleMark(studentId: string, status: "present" | "absent" | "leave") {
    setError(null);
    setPendingId(studentId);
    startTransition(async () => {
      try {
        await setAttendance(studentId, classId, date, status);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setPendingId(null);
      }
    });
  }

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

      {error && (
        <p className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="bg-surface rounded-xl border border-line divide-y divide-line">
        {students.length === 0 && (
          <p className="p-5 text-sm text-muted">
            No students in this class yet.
          </p>
        )}
        {students.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between p-4 flex-wrap gap-3"
          >
            <div>
              <p className="font-medium text-ink">{s.name}</p>
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
                      : "bg-amber-500 text-white";
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleMark(s.id, opt.value)}
                    disabled={isPending && pendingId === s.id}
                    className={
                      "rounded-lg text-xs font-medium px-3 py-1.5 border transition-colors disabled:opacity-60 " +
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
    </div>
  );
}
