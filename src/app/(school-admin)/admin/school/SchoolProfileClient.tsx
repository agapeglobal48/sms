"use client";

import { useState, useTransition } from "react";
import { updateSchoolLogo } from "./actions";

export default function SchoolProfileClient({
  schoolName,
  schoolAddress,
  logoUrl,
}: {
  schoolName: string;
  schoolAddress: string | null;
  logoUrl: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateSchoolLogo(formData);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">School Profile</h1>

      <div className="bg-surface rounded-xl border border-line p-5 space-y-1">
        <p className="font-medium text-ink">{schoolName}</p>
        {schoolAddress && <p className="text-sm text-muted">{schoolAddress}</p>}
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="text-sm text-success bg-success-soft border border-success/20 rounded-lg px-3 py-2">
          Updated.
        </p>
      )}

      <form
        action={handleSubmit}
        className="bg-surface rounded-xl border border-line p-5 space-y-4"
      >
        <h2 className="font-medium text-ink">School logo / monogram</h2>
        <p className="text-sm text-muted">
          Appears on printed reports, fees, and results for this school.
        </p>

        <div className="flex items-center gap-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={schoolName}
              className="w-16 h-16 rounded-lg object-cover border border-line"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-brand flex items-center justify-center text-white font-heading font-bold text-xl">
              {schoolName?.[0]?.toUpperCase() ?? "S"}
            </div>
          )}
          <input name="logo" type="file" accept="image/*" className="text-sm text-ink" />
        </div>

        {logoUrl && (
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="removeLogo" className="rounded border-line" />
            Remove current logo
          </label>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
