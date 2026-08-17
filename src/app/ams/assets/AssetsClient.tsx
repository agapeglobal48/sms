"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAsset, updateAsset, deleteAsset } from "./actions";

type SchoolOption = { id: string; name: string };
type Asset = {
  id: string;
  category: string;
  name: string;
  serial_key: string | null;
  os: string | null;
  classroom: string | null;
  assigned_users: string[] | null;
  quantity: number;
  publisher: string | null;
  notes: string | null;
};

const CATEGORIES = ["electronics", "furniture", "books", "stationery", "other"];

export default function AssetsClient({
  isSuperadmin,
  schools,
  schoolId,
  assets,
}: {
  isSuperadmin: boolean;
  schools: SchoolOption[];
  schoolId: string;
  assets: Asset[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleSchoolChange(newSchoolId: string) {
    router.push(`/ams/assets?schoolId=${newSchoolId}`);
  }

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createAsset(formData);
        setAddOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleUpdate(assetId: string, formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await updateAsset(assetId, formData);
        setEditingId(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleDelete(assetId: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteAsset(assetId, schoolId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-ink">
          Assets (AMS)
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
            {addOpen ? "Cancel" : "+ Add asset"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {addOpen && (
        <AssetForm
          schoolId={schoolId}
          onSubmit={handleCreate}
          submitLabel={isPending ? "Adding…" : "Add asset"}
          disabled={isPending}
        />
      )}

      <div className="bg-surface rounded-xl border border-line overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-line">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Category</th>
              <th className="p-3 font-medium">Serial / Batch Key</th>
              <th className="p-3 font-medium">Classroom</th>
              <th className="p-3 font-medium">Qty</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {assets.length === 0 && (
              <tr>
                <td colSpan={6} className="p-5 text-muted">
                  No assets recorded yet — add the first one above.
                </td>
              </tr>
            )}
            {assets.map((a) => (
              <tr key={a.id}>
                <td className="p-3 font-medium text-ink">{a.name}</td>
                <td className="p-3 text-muted capitalize">{a.category}</td>
                <td className="p-3 text-muted">{a.serial_key ?? "—"}</td>
                <td className="p-3 text-muted">{a.classroom ?? "—"}</td>
                <td className="p-3 text-muted">{a.quantity}</td>
                <td className="p-3 whitespace-nowrap">
                  <button
                    onClick={() => setEditingId(a.id)}
                    className="text-brand-light hover:text-brand font-medium mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(a.id, a.name)}
                    disabled={isPending}
                    className="text-danger hover:text-danger font-medium disabled:opacity-60"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingId && (
        <EditModal onClose={() => setEditingId(null)}>
          <AssetForm
            schoolId={schoolId}
            asset={assets.find((a) => a.id === editingId)}
            onSubmit={(fd) => handleUpdate(editingId, fd)}
            submitLabel={isPending ? "Saving…" : "Save changes"}
            disabled={isPending}
          />
        </EditModal>
      )}
    </div>
  );
}

function EditModal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5">
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="text-muted hover:text-muted text-sm"
          >
            ✕ Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AssetForm({
  schoolId,
  asset,
  onSubmit,
  submitLabel,
  disabled,
}: {
  schoolId: string;
  asset?: Asset;
  onSubmit: (formData: FormData) => void;
  submitLabel: string;
  disabled: boolean;
}) {
  return (
    <form
      action={onSubmit}
      className="bg-surface rounded-xl border border-line p-5 space-y-4"
    >
      <input type="hidden" name="schoolId" value={schoolId} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">
            Category
          </label>
          <select
            name="category"
            defaultValue={asset?.category ?? "electronics"}
            required
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="capitalize">
                {c}
              </option>
            ))}
          </select>
        </div>
        <Field
          label="Name"
          name="name"
          defaultValue={asset?.name}
          placeholder="e.g. Dell Desktop PC"
          required
        />
        <Field
          label="Serial / batch key"
          name="serialKey"
          defaultValue={asset?.serial_key ?? ""}
          placeholder="e.g. SN-2938 or Batch-2026-A"
        />
        <Field
          label="OS (if applicable)"
          name="os"
          defaultValue={asset?.os ?? ""}
          placeholder="e.g. Windows 11"
        />
        <Field
          label="Classroom"
          name="classroom"
          defaultValue={asset?.classroom ?? ""}
        />
        <Field
          label="Quantity"
          name="quantity"
          type="number"
          defaultValue={asset?.quantity?.toString() ?? "1"}
        />
        <Field
          label="Publisher (for books)"
          name="publisher"
          defaultValue={asset?.publisher ?? ""}
        />
        <div className="sm:col-span-2">
          <Field
            label="Assigned users (comma-separated)"
            name="assignedUsers"
            defaultValue={asset?.assigned_users?.join(", ") ?? ""}
            placeholder="e.g. Grade 6 teachers, Front office"
          />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium text-ink mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            defaultValue={asset?.notes ?? ""}
            rows={2}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-1">
        {label}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
      />
    </div>
  );
}
