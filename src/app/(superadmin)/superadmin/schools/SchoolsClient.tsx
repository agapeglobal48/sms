"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  createSchool,
  updateSchool,
  updateSchoolAdmin,
  deleteSchool,
  getSchoolAdminEmail,
  resetSchoolAdminCredentials,
} from "./actions";
import ManageLoginModal from "@/components/shared/ManageLoginModal";

type School = {
  id: string;
  name: string;
  address: string | null;
  logo_url: string | null;
  created_at: string;
  adminId: string | null;
  adminName: string | null;
};

export default function SchoolsClient({ schools }: { schools: School[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [managingId, setManagingId] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createSchool(formData);
        setAddOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleUpdateSchool(schoolId: string, formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await updateSchool(schoolId, formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleUpdateAdmin(adminId: string, formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await updateSchoolAdmin(adminId, formData);
        setEditingId(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This removes all its data and logins permanently.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteSchool(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Schools</h1>
        <button
          onClick={() => setAddOpen((v) => !v)}
          className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors"
        >
          {addOpen ? "Cancel" : "+ Add school"}
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
          <h2 className="font-medium text-ink">New school</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="School name" name="schoolName" required />
            <Field label="Address" name="address" />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              School logo / monogram (optional)
            </label>
            <input name="logo" type="file" accept="image/*" className="text-sm text-ink" />
          </div>

          <hr className="border-line" />
          <p className="text-sm text-muted">
            This creates the login the School Admin will use to sign in.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Admin full name" name="adminName" required />
            <Field label="Admin email" name="adminEmail" type="email" required />
            <Field
              label="Admin password"
              name="adminPassword"
              type="password"
              required
              minLength={8}
              helper="At least 8 characters, with a letter and a number"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors disabled:opacity-60"
          >
            {isPending ? "Creating…" : "Create school"}
          </button>
        </form>
      )}

      <div className="bg-surface rounded-xl border border-line divide-y divide-line">
        {schools.length === 0 && (
          <p className="p-5 text-sm text-muted">
            No schools yet — add the first one above.
          </p>
        )}
        {schools.map((s) => (
          <div key={s.id} className="flex items-center justify-between p-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              {s.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.logo_url}
                  alt={s.name}
                  className="w-9 h-9 rounded-lg object-cover border border-line shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center text-white font-heading font-bold text-sm shrink-0">
                  {s.name?.[0]?.toUpperCase() ?? "S"}
                </div>
              )}
              <div>
                <p className="font-medium text-ink">{s.name}</p>
                {s.address && <p className="text-sm text-muted">{s.address}</p>}
                {s.adminName && (
                  <p className="text-xs text-muted">Admin: {s.adminName}</p>
                )}
              </div>
            </div>
            <div className="flex gap-4 flex-wrap">
              <Link
                href={`/superadmin/schools/${s.id}/view`}
                className="text-sm text-brand-light hover:text-brand font-medium"
              >
                View School
              </Link>
              <button
                onClick={() => setEditingId(s.id)}
                className="text-sm text-brand-light hover:text-brand font-medium"
              >
                Edit
              </button>
              {s.adminId && (
                <button
                  onClick={() => setManagingId(s.id)}
                  className="text-sm text-brand-light hover:text-brand font-medium"
                >
                  Manage login
                </button>
              )}
              <button
                onClick={() => handleDelete(s.id, s.name)}
                disabled={isPending}
                className="text-sm text-danger hover:text-danger font-medium disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingId && (
        <EditModal onClose={() => setEditingId(null)}>
          {(() => {
            const school = schools.find((s) => s.id === editingId)!;
            return (
              <div className="space-y-6">
                <div>
                  <h2 className="font-medium text-ink mb-3">
                    School details
                  </h2>
                  <form
                    action={(fd) => handleUpdateSchool(school.id, fd)}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field
                        label="School name"
                        name="schoolName"
                        defaultValue={school.name}
                        required
                      />
                      <Field
                        label="Address"
                        name="address"
                        defaultValue={school.address ?? ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1">
                        School logo / monogram
                      </label>
                      <div className="flex items-center gap-3">
                        {school.logo_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={school.logo_url}
                            alt={school.name}
                            className="w-12 h-12 rounded-lg object-cover border border-line"
                          />
                        )}
                        <input
                          name="logo"
                          type="file"
                          accept="image/*"
                          className="text-sm text-ink flex-1"
                        />
                      </div>
                      {school.logo_url && (
                        <label className="flex items-center gap-2 text-sm text-muted mt-2">
                          <input
                            type="checkbox"
                            name="removeLogo"
                            className="rounded border-line"
                          />
                          Remove current logo
                        </label>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors disabled:opacity-60"
                    >
                      {isPending ? "Saving…" : "Save school details"}
                    </button>
                  </form>
                </div>

                {school.adminId && (
                  <div className="border-t border-line pt-5">
                    <h2 className="font-medium text-ink mb-3">
                      School Admin name
                    </h2>
                    <form
                      action={(fd) => handleUpdateAdmin(school.adminId!, fd)}
                      className="space-y-4"
                    >
                      <Field
                        label="Admin full name"
                        name="adminName"
                        defaultValue={school.adminName ?? ""}
                        required
                      />
                      <p className="text-xs text-muted">
                        To change this admin&apos;s email or password, use
                        &quot;Manage login&quot; instead.
                      </p>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors disabled:opacity-60"
                      >
                        {isPending ? "Saving…" : "Save name"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })()}
        </EditModal>
      )}

      {managingId && (
        <ManageLoginModal
          onClose={() => setManagingId(null)}
          targetId={schools.find((s) => s.id === managingId)?.adminId ?? ""}
          targetLabel={schools.find((s) => s.id === managingId)?.adminName ?? ""}
          getEmail={getSchoolAdminEmail}
          resetCredentials={resetSchoolAdminCredentials}
        />
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
