"use client";

import { useRouter } from "next/navigation";

export default function ChildSelector({
  options,
  selectedId,
}: {
  options: { id: string; name: string }[];
  selectedId: string;
}) {
  const router = useRouter();

  if (options.length <= 1) return null;

  return (
    <select
      value={selectedId}
      onChange={(e) => router.push(`/parent?studentId=${e.target.value}`)}
      className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
    >
      {options.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
