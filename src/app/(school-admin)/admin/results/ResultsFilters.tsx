"use client";

import { useRouter } from "next/navigation";

type ClassOption = { id: string; name: string };

const CUMULATIVE = "__cumulative__";

export default function ResultsFilters({
  classes,
  classId,
  subjectOptions,
  subject,
  termOptions,
  term,
}: {
  classes: ClassOption[];
  classId: string;
  subjectOptions: string[];
  subject: string;
  termOptions: string[];
  term: string;
}) {
  const router = useRouter();

  function updateQuery(next: { classId?: string; subject?: string; term?: string }) {
    const params = new URLSearchParams({
      classId: next.classId ?? classId,
      subject: next.subject ?? subject,
      term: next.term ?? term,
    });
    router.push(`/admin/results?${params.toString()}`);
  }

  return (
    <>
      <select
        value={classId}
        onChange={(e) => updateQuery({ classId: e.target.value, subject: "", term: "" })}
        className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {subjectOptions.length > 0 && (
        <select
          value={subject}
          onChange={(e) => updateQuery({ subject: e.target.value, term: "" })}
          className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
        >
          {subjectOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}
      {termOptions.length > 0 && (
        <select
          value={term}
          onChange={(e) => updateQuery({ term: e.target.value })}
          className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
        >
          {termOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          <option value={CUMULATIVE}>Cumulative (all terms)</option>
        </select>
      )}
    </>
  );
}
