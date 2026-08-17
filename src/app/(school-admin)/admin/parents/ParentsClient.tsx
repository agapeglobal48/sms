"use client";

import { useState, useTransition } from "react";
import { createParent, updateParent, updateParentLinks, deleteParent } from "./actions";

type StudentOption = { id: string; name: string };
type Parent = {
  id: string;
  full_name: string;
  phone: string | null;
  linkedStudentIds: string[];
};

export default function ParentsClient({
  parents,
  students,
}: {
  parents: Parent[];
  students: StudentOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingLinksId, setEditingLinksId] = useState<string | null>(null);
  const [editingDetailsId, setEditingDetailsId] = useState<string | null>(null);

  function studentNames(ids: string[]) {
    if (ids.length === 0) return "No children linked";
    return ids
      .map((id) => students.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  }

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createParent(formData);
        setAddOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleUpdateDetails(parentId: string, formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await updateParent(parentId, formData);
        setEditingDetailsId(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleUpdateLinks(parentId: string, formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await updateParentLinks(parentId, formData);
        setEditingLinksId(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleDelete(parentId: string, name: string) {
    if (!confirm(`Delete "${name}"? This removes their login and all child links.`))
      return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteParent(parentId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Parents</h1>
        <button
          onClick={() => setAddOpen((v) => !v)}
          className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors"
        >
          {addOpen ? "Cancel" : "+ Add parent"}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full name" name="fullName" required />
            <Field label="Email" name="email" type="email" required />
            <Field
              label="Password"
              name="password"
              type="password"
              minLength={8}
              helper="At least 8 characters"
              required
            />
            <Field label="Phone" name="phone" />
          </div>

          <StudentCheckboxes students={students} defaultSelected={[]} />

          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors disabled:opacity-60"
          >
            {isPending ? "Creating…" : "Create parent"}
          </button>
        </form>
      )}

      <div className="bg-surface rounded-xl border border-line divide-y divide-line">
        {parents.length === 0 && (
          <p className="p-5 text-sm text-muted">
            No parents yet — add the first one above.
          </p>
        )}
        {parents.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-4 gap-4">
            <div>
              <p className="font-medium text-ink">{p.full_name}</p>
              <p className="text-sm text-muted">
                {studentNames(p.linkedStudentIds)}
              </p>
            </div>
            <div className="flex gap-4 shrink-0">
              <button
                onClick={() => setEditingDetailsId(p.id)}
                className="text-sm text-brand-light hover:text-brand font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => setEditingLinksId(p.id)}
                className="text-sm text-brand-light hover:text-brand font-medium"
              >
                Edit children
              </button>
              <button
                onClick={() => handleDelete(p.id, p.full_name)}
                disabled={isPending}
                className="text-sm text-danger hover:text-danger font-medium disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingDetailsId && (
        <EditLinksModal onClose={() => setEditingDetailsId(null)}>
          <h2 className="font-medium text-ink mb-3">
            Edit {parents.find((p) => p.id === editingDetailsId)?.full_name}
          </h2>
          <form
            action={(fd) => handleUpdateDetails(editingDetailsId, fd)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Full name"
                name="fullName"
                defaultValue={parents.find((p) => p.id === editingDetailsId)?.full_name}
                required
              />
              <Field
                label="Phone"
                name="phone"
                defaultValue={parents.find((p) => p.id === editingDetailsId)?.phone ?? ""}
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
        </EditLinksModal>
      )}

      {editingLinksId && (
        <EditLinksModal onClose={() => setEditingLinksId(null)}>
          <h2 className="font-medium text-ink mb-3">
            Linked children for {parents.find((p) => p.id === editingLinksId)?.full_name}
          </h2>
          <form
            action={(fd) => handleUpdateLinks(editingLinksId, fd)}
            className="space-y-4"
          >
            <StudentCheckboxes
              students={students}
              defaultSelected={
                parents.find((p) => p.id === editingLinksId)?.linkedStudentIds ?? []
              }
            />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          </form>
        </EditLinksModal>
      )}
    </div>
  );
}

function EditLinksModal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
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

function StudentCheckboxes({
  students,
  defaultSelected,
}: {
  students: StudentOption[];
  defaultSelected: string[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-2">
        Children
      </label>
      {students.length === 0 ? (
        <p className="text-sm text-muted">
          No students in your school yet — add students first.
        </p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto border border-line rounded-lg p-3">
          {students.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="studentIds"
                value={s.id}
                defaultChecked={defaultSelected.includes(s.id)}
                className="rounded border-line"
              />
              {s.name}
            </label>
          ))}
        </div>
      )}
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
