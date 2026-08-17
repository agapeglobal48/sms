"use client";

import { useState, useTransition, useRef, Fragment } from "react";
import Link from "next/link";
import { createStudent, updateStudent, deleteStudent, importStudents } from "./actions";

type ClassOption = { id: string; name: string };
type Student = {
  id: string;
  name: string;
  father_name: string | null;
  roll_no: number | null;
  gender: string | null;
  dob: string | null;
  date_of_admission: string | null;
  contact: string | null;
  address: string | null;
  monthly_fee: number;
  class_id: string | null;
};

export default function StudentsClient({
  students,
  classes,
}: {
  students: Student[];
  classes: ClassOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function className(id: string | null) {
    if (!id) return "Unassigned";
    return classes.find((c) => c.id === id)?.name ?? "Unassigned";
  }

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createStudent(formData);
        setAddOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleUpdate(studentId: string, formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await updateStudent(studentId, formData);
        setEditingId(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleDelete(studentId: string, name: string) {
    if (!confirm(`Delete "${name}"? This removes their attendance, marks, and fee records permanently.`))
      return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteStudent(studentId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleImport(file: File) {
    setError(null);
    setImportMessage(null);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      try {
        const result = await importStudents(formData);
        setImportMessage(`Imported ${result.imported} student(s).`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-ink">Students</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/students/export"
            className="rounded-lg border border-line text-sm font-medium px-4 py-2 text-ink hover:bg-paper transition-colors"
          >
            Export to Excel
          </Link>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            className="rounded-lg border border-line text-sm font-medium px-4 py-2 text-ink hover:bg-paper transition-colors disabled:opacity-60"
          >
            Import from Excel
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
            }}
          />
          <button
            onClick={() => setAddOpen((v) => !v)}
            className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors"
          >
            {addOpen ? "Cancel" : "+ Add student"}
          </button>
        </div>
      </div>

      {importMessage && (
        <p className="text-sm text-success bg-success-soft border border-success/20 rounded-lg px-3 py-2">
          {importMessage}
        </p>
      )}

      {error && (
        <p className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {addOpen && (
        <StudentForm
          classes={classes}
          onSubmit={handleCreate}
          submitLabel={isPending ? "Adding…" : "Add student"}
          disabled={isPending}
          showParentFields
        />
      )}

      <div className="bg-surface rounded-xl border border-line overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-line">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Roll No</th>
              <th className="p-3 font-medium">Class</th>
              <th className="p-3 font-medium">Father</th>
              <th className="p-3 font-medium">Contact</th>
              <th className="p-3 font-medium">Monthly Fee</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {students.length === 0 && (
              <tr>
                <td colSpan={7} className="p-5 text-muted">
                  No students yet — add the first one above.
                </td>
              </tr>
            )}
            {students.map((s, i) => {
              const prevClassId = i > 0 ? students[i - 1].class_id : undefined;
              const showGroupHeader = s.class_id !== prevClassId;
              return (
                <Fragment key={s.id}>
                  {showGroupHeader && (
                    <tr className="bg-paper">
                      <td
                        colSpan={7}
                        className="px-3 py-1.5 text-xs font-semibold text-muted uppercase tracking-wide"
                      >
                        {className(s.class_id)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="p-3 font-medium text-ink">{s.name}</td>
                    <td className="p-3 text-muted">{s.roll_no ?? "—"}</td>
                    <td className="p-3 text-muted">{className(s.class_id)}</td>
                    <td className="p-3 text-muted">{s.father_name ?? "—"}</td>
                    <td className="p-3 text-muted">{s.contact ?? "—"}</td>
                    <td className="p-3 text-muted">Rs. {s.monthly_fee}</td>
                    <td className="p-3 whitespace-nowrap">
                      <Link
                        href={`/admin/students/${s.id}`}
                        className="text-brand-light hover:text-brand font-medium mr-4"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => setEditingId(s.id)}
                        className="text-brand-light hover:text-brand font-medium mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        disabled={isPending}
                        className="text-danger hover:text-danger font-medium disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingId && (
        <EditModal onClose={() => setEditingId(null)}>
          <StudentForm
            classes={classes}
            student={students.find((s) => s.id === editingId)}
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

function StudentForm({
  classes,
  student,
  onSubmit,
  submitLabel,
  disabled,
  showParentFields,
}: {
  classes: ClassOption[];
  student?: Student;
  onSubmit: (formData: FormData) => void;
  submitLabel: string;
  disabled: boolean;
  showParentFields?: boolean;
}) {
  return (
    <form
      action={onSubmit}
      className="bg-surface rounded-xl border border-line p-5 space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Full name" name="name" defaultValue={student?.name} required />
        <Field
          label="Father's name"
          name="fatherName"
          defaultValue={student?.father_name ?? ""}
        />
        <Field
          label="Roll No"
          name="rollNo"
          type="number"
          defaultValue={student?.roll_no?.toString() ?? ""}
        />
        <div>
          <label className="block text-sm font-medium text-ink mb-1">
            Class
          </label>
          <select
            name="classId"
            defaultValue={student?.class_id ?? ""}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
          >
            <option value="">Unassigned</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">
            Gender
          </label>
          <select
            name="gender"
            defaultValue={student?.gender ?? ""}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
          >
            <option value="">—</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <Field
          label="Date of birth"
          name="dob"
          type="date"
          defaultValue={student?.dob ?? ""}
        />
        <Field
          label="Date of admission"
          name="dateOfAdmission"
          type="date"
          defaultValue={student?.date_of_admission ?? ""}
        />
        <Field
          label="Contact number"
          name="contact"
          defaultValue={student?.contact ?? ""}
        />
        <Field
          label="Monthly fee (Rs.)"
          name="monthlyFee"
          type="number"
          defaultValue={student?.monthly_fee?.toString() ?? "0"}
        />
        <div className="sm:col-span-3">
          <Field label="Address" name="address" defaultValue={student?.address ?? ""} />
        </div>
      </div>

      {showParentFields && (
        <div className="border-t border-line pt-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-ink">
              Parent login (optional)
            </p>
            <p className="text-xs text-muted">
              Fill these in to create the parent&apos;s account at the same
              time — or leave all three blank and add it later from Admin →
              Parents.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Parent full name" name="parentName" />
            <Field label="Parent email" name="parentEmail" type="email" />
            <Field
              label="Parent password"
              name="parentPassword"
              type="password"
              minLength={8}
            />
          </div>
        </div>
      )}

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
  required,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  minLength?: number;
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
    </div>
  );
}
