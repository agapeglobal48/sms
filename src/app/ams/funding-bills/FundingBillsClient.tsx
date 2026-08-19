"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { allocateFunding, uploadBill, getBillFileUrl } from "./actions";

type SchoolOption = { id: string; name: string };
type FundingRow = {
  id: string;
  amount: number;
  purpose: string | null;
  allocated_at: string;
};
type BillRow = {
  id: string;
  amount: number;
  description: string | null;
  uploaded_at: string;
  funding_id: string | null;
};

export default function FundingBillsClient({
  isSuperadmin,
  schools,
  schoolId,
  funding,
  bills,
}: {
  isSuperadmin: boolean;
  schools: SchoolOption[];
  schoolId: string;
  funding: FundingRow[];
  bills: BillRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const totalAllocated = funding.reduce((sum, f) => sum + f.amount, 0);
  const totalSpent = bills.reduce((sum, b) => sum + b.amount, 0);
  const remaining = totalAllocated - totalSpent;
  const utilization = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : null;

  const spentByFundingId = new Map<string, number>();
  let unlinkedSpent = 0;
  for (const b of bills) {
    if (b.funding_id) {
      spentByFundingId.set(b.funding_id, (spentByFundingId.get(b.funding_id) ?? 0) + b.amount);
    } else {
      unlinkedSpent += b.amount;
    }
  }

  function handleSchoolChange(newSchoolId: string) {
    router.push(`/ams/funding-bills?schoolId=${newSchoolId}`);
  }

  function handleAllocate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await allocateFunding(formData);
        setAddOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleUpload(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await uploadBill(formData);
        setAddOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleView(billId: string) {
    setError(null);
    setViewingId(billId);
    startTransition(async () => {
      try {
        const url = await getBillFileUrl(billId);
        window.open(url, "_blank");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setViewingId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-ink">
          Funding & Bills
        </h1>
        <div className="flex items-center gap-3">
          {isSuperadmin && (
            <select
              value={schoolId}
              onChange={(e) => handleSchoolChange(e.target.value)}
              className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setAddOpen((v) => !v)}
            className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors"
          >
            {addOpen
              ? "Cancel"
              : isSuperadmin
                ? "+ Allocate funding"
                : "+ Upload bill"}
          </button>
        </div>
      </div>

      <div className="flex gap-6 text-sm flex-wrap">
        <p>
          <span className="text-muted">Total allocated: </span>
          <span className="font-medium text-ink">
            Rs. {totalAllocated.toLocaleString()}
          </span>
        </p>
        <p>
          <span className="text-muted">Total spent (bills): </span>
          <span className="font-medium text-ink">
            Rs. {totalSpent.toLocaleString()}
          </span>
        </p>
        <p>
          <span className="text-muted">Remaining: </span>
          <span className={remaining < 0 ? "font-medium text-danger" : "font-medium text-ink"}>
            Rs. {remaining.toLocaleString()}
          </span>
        </p>
        <p>
          <span className="text-muted">Utilization: </span>
          <span
            className={
              utilization !== null && utilization > 100
                ? "font-medium text-danger"
                : "font-medium text-ink"
            }
          >
            {utilization !== null ? `${utilization}%` : "—"}
          </span>
        </p>
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {addOpen && isSuperadmin && (
        <form
          action={handleAllocate}
          className="bg-surface rounded-xl border border-line p-5 space-y-4"
        >
          <input type="hidden" name="schoolId" value={schoolId} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Amount (Rs.)
              </label>
              <input
                name="amount"
                type="number"
                min={1}
                required
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Purpose
              </label>
              <input
                name="purpose"
                placeholder="e.g. Furniture upgrade, term 2"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors disabled:opacity-60"
          >
            {isPending ? "Allocating…" : "Allocate funding"}
          </button>
        </form>
      )}

      {addOpen && !isSuperadmin && (
        <form
          action={handleUpload}
          className="bg-surface rounded-xl border border-line p-5 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Amount (Rs.)
              </label>
              <input
                name="amount"
                type="number"
                min={1}
                required
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Against funding (optional)
              </label>
              <select
                name="fundingId"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
              >
                <option value="">Not linked to a specific allocation</option>
                {funding.map((f) => (
                  <option key={f.id} value={f.id}>
                    Rs. {f.amount.toLocaleString()}
                    {f.purpose ? ` — ${f.purpose}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-ink mb-1">
                Description
              </label>
              <input
                name="description"
                placeholder="e.g. Purchased 20 chairs from ABC Furniture"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-ink mb-1">
                Receipt file
              </label>
              <input
                name="file"
                type="file"
                required
                accept="image/*,.pdf"
                className="w-full text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors disabled:opacity-60"
          >
            {isPending ? "Uploading…" : "Upload bill"}
          </button>
        </form>
      )}

      <div>
        <h2 className="font-medium text-ink mb-2">Funding history</h2>
        <div className="bg-surface rounded-xl border border-line divide-y divide-line">
          {funding.length === 0 && (
            <p className="p-4 text-sm text-muted">
              No funding allocated to this school yet.
            </p>
          )}
          {funding.map((f) => {
            const spent = spentByFundingId.get(f.id) ?? 0;
            const left = f.amount - spent;
            return (
              <div key={f.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-ink">
                    Rs. {f.amount.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted">{f.purpose ?? "—"}</p>
                  <p className="text-xs text-muted">
                    Spent: Rs. {spent.toLocaleString()} · Remaining:{" "}
                    <span className={left < 0 ? "text-danger" : ""}>
                      Rs. {left.toLocaleString()}
                    </span>
                  </p>
                </div>
                <p className="text-xs text-muted">
                  {new Date(f.allocated_at).toLocaleDateString()}
                </p>
              </div>
            );
          })}
          {unlinkedSpent > 0 && (
            <p className="p-4 text-xs text-muted">
              Rs. {unlinkedSpent.toLocaleString()} in bills aren&apos;t linked to a specific
              allocation.
            </p>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-medium text-ink mb-2">Bills</h2>
        <div className="bg-surface rounded-xl border border-line divide-y divide-line">
          {bills.length === 0 && (
            <p className="p-4 text-sm text-muted">
              No bills uploaded for this school yet.
            </p>
          )}
          {bills.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-ink">
                  Rs. {b.amount.toLocaleString()}
                </p>
                <p className="text-sm text-muted">
                  {b.description ?? "—"}
                </p>
                <p className="text-xs text-muted">
                  {new Date(b.uploaded_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleView(b.id)}
                disabled={isPending && viewingId === b.id}
                className="text-sm text-brand-light hover:text-brand font-medium disabled:opacity-60"
              >
                {isPending && viewingId === b.id ? "Loading…" : "View receipt"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
