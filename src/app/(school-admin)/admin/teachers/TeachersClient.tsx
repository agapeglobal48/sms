"use client";

import { useState, useTransition } from "react";
import { createTeacher, updateTeacher, deleteTeacher } from "./actions";

type Teacher = {
  id: string;
  full_name: string;
  phone: string | null;
  classNames: string[];
};

export default function TeachersClient({ teachers }: { teachers: Teacher[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createTeacher(formData);
        setAddOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleUpdate(teacherId: string, formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await updateTeacher(teacherId, formData);
        setEditingId(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleDelete(id: string, name: string) {
    if (
      !confirm(
        `Remove "${name}"? Their login will be deleted and they'll be unassigned from any classes.`
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteTeacher(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Teachers</h1>
        <button
          onClick={() => setAddOpen((v) => !v)}
          className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors"
        >
          {addOpen ? "Cancel" : "+ Add teacher"}
        </button>
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
          <h2 className="font-medium text-ink">New teacher</h2>
          <p className="text-sm text-muted">
            This creates the login the teacher will use to sign in.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Full name" name="fullName" required />
            <Field label="Email" name="email" type="email" required />
            <Field
              label="Password"
              name="password"
              type="password"
              required
              minLength={8}
              helper="At least 8 characters"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors disabled:opacity-60"
          >
            {isPending ? "Creating…" : "Create teacher"}
          </button>
        </form>
      )}

      <div className="bg-surface rounded-xl border border-line divide-y divide-line">
        {teachers.length === 0 && (
          <p className="p-5 text-sm text-muted">
            No teachers yet — add the first one above.
          </p>
        )}
        {teachers.map((t) => (
          <div key={t.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-ink">{t.full_name}</p>
              <p className="text-sm text-muted">
                {t.classNames.length > 0
                  ? `Teaches: ${t.classNames.join(", ")}`
                  : "Not assigned to any class yet"}
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setEditingId(t.id)}
                className="text-sm text-brand-light hover:text-brand font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(t.id, t.full_name)}
                disabled={isPending}
                className="text-sm text-danger hover:text-danger font-medium disabled:opacity-60"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingId && (
        <EditModal onClose={() => setEditingId(null)}>
          <h2 className="font-medium text-ink mb-3">Edit teacher</h2>
          <form
            action={(fd) => handleUpdate(editingId, fd)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Full name"
                name="fullName"
                defaultValue={teachers.find((t) => t.id === editingId)?.full_name}
                required
              />
              <Field
                label="Phone"
                name="phone"
                defaultValue={teachers.find((t) => t.id === editingId)?.phone ?? ""}
              />
            </div>
            <hr className="border-line" />
            <p className="text-sm text-muted">
              Leave the fields below blank to keep their current email/password.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="New email" name="newEmail" type="email" />
              <Field
                label="New password"
                name="newPassword"
                type="password"
                minLength={8}
                helper="At least 8 characters if changing"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save changes"}
            </button>
          </form>
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
      <div className="bg-surface rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5">
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

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  minLength,
  helper,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  minLength?: number;
  helper?: string;
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
        required={required}
        minLength={minLength}
        className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
      />
      {helper && <p className="text-xs text-muted mt-1">{helper}</p>}
    </div>
  );
}
