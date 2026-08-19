"use client";

export default function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden rounded-lg border border-line text-sm font-medium px-4 py-2 text-ink hover:bg-paper"
    >
      {label}
    </button>
  );
}
