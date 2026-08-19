"use client";

import { useState, useTransition } from "react";
import {
  createClass,
  updateClass,
  deleteClass,
  addSubjectAssignment,
  removeSubjectAssignment,
} from "./actions";

type Teacher = { id: string; full_name: string };
type ClassRow = {
  id: string;
  grade: number;
  section: string;
  name: string;
  teacher_id: string | null;
};
type SubjectAssignment = {
  id: string;
  class_id: string;
  subject: string;
  teacher_id: string;
};

export default function ClassesClient({
  classes,
  teachers,
  subjectAssignments,
}: {
  classes: ClassRow[];
  teachers: Teacher[];
  subjectAssignments: SubjectAssignment[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subjectsForClassId, setSubjectsForClassId] = useState<string | null>(null);

  function teacherName(id: string | null) {
    if (!id) return "Unassigned";
    return teachers.find((t) => t.id === id)?.full_name ?? "Unassigned";
  }

  function subjectsFor(classId: string) {
    return subjectAssignments.filter((a) => a.class_id === classId);
  }

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createClass(formData);
        setAddOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleUpdate(classId: string, formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await updateClass(classId, formData);
        setEditingId(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleDelete(classId: string, name: string) {
    if (!confirm(`Delete "${name}"? Students in it will become unassigned.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteClass(classId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleAddSubject(classId: string, formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addSubjectAssignment(classId, formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleRemoveSubject(assignmentId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await removeSubjectAssignment(assignmentId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Classes</h1>
        <button
          onClick={() => setAddOpen((v) => !v)}
          className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors"
        >
          {addOpen ? "Cancel" : "+ Add class"}
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
          className="bg-surface rounded-xl border border-line p-5 flex flex-wrap items-end gap-4"
        >
          <NumField label="Grade" name="grade" required />
          <TextField label="Section" name="section" placeholder="A" required />
          <TeacherSelect name="teacherId" teachers={teachers} label="Class Teacher" />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors disabled:opacity-60 h-[38px]"
          >
            {isPending ? "Adding…" : "Add"}
          </button>
        </form>
      )}

      <div className="bg-surface rounded-xl border border-line divide-y divide-line">
        {classes.length === 0 && (
          <p className="p-5 text-sm text-muted">
            No classes yet — add the first one above.
          </p>
        )}

        {classes.map((c) =>
          editingId === c.id ? (
            <form
              key={c.id}
              action={(fd) => handleUpdate(c.id, fd)}
              className="flex flex-wrap items-end gap-4 p-4"
            >
              <NumField label="Grade" name="grade" defaultValue={c.grade} required />
              <TextField
                label="Section"
                name="section"
                defaultValue={c.section}
                required
              />
              <TeacherSelect
                name="teacherId"
                teachers={teachers}
                defaultValue={c.teacher_id ?? ""}
                label="Class Teacher"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors disabled:opacity-60 h-[38px]"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-lg border border-line text-sm font-medium px-4 py-2 h-[38px]"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div key={c.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-ink">{c.name}</p>
                <p className="text-sm text-muted">
                  Class Teacher: {teacherName(c.teacher_id)}
                </p>
                <p className="text-xs text-muted">
                  {subjectsFor(c.id).length > 0
                    ? `${subjectsFor(c.id).length} subject(s) assigned`
                    : "No subject teachers assigned yet"}
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setSubjectsForClassId(c.id)}
                  className="text-sm text-brand-light hover:text-brand font-medium"
                >
                  Subjects
                </button>
                <button
                  onClick={() => setEditingId(c.id)}
                  className="text-sm text-brand-light hover:text-brand font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(c.id, c.name)}
                  disabled={isPending}
                  className="text-sm text-danger hover:text-danger font-medium disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {subjectsForClassId && (
        <SubjectsModal
          onClose={() => setSubjectsForClassId(null)}
          className={classes.find((c) => c.id === subjectsForClassId)?.name ?? ""}
          assignments={subjectsFor(subjectsForClassId)}
          teachers={teachers}
          teacherName={teacherName}
          isPending={isPending}
          onAdd={(fd) => handleAddSubject(subjectsForClassId, fd)}
          onRemove={handleRemoveSubject}
        />
      )}
    </div>
  );
}

function SubjectsModal({
  onClose,
  className,
  assignments,
  teachers,
  teacherName,
  isPending,
  onAdd,
  onRemove,
}: {
  onClose: () => void;
  className: string;
  assignments: SubjectAssignment[];
  teachers: Teacher[];
  teacherName: (id: string | null) => string;
  isPending: boolean;
  onAdd: (formData: FormData) => void;
  onRemove: (assignmentId: string) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-ink">Subject teachers — {className}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink text-sm">
            ✕
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {assignments.length === 0 && (
            <p className="text-sm text-muted">No subjects assigned yet.</p>
          )}
          {assignments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between bg-paper rounded-lg px-3 py-2 text-sm"
            >
              <span className="text-ink">
                <span className="font-medium">{a.subject}</span> — {teacherName(a.teacher_id)}
              </span>
              <button
                onClick={() => onRemove(a.id)}
                disabled={isPending}
                className="text-danger hover:text-danger font-medium disabled:opacity-60"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <form action={onAdd} className="flex flex-wrap items-end gap-3">
          <TextField label="Subject" name="subject" placeholder="e.g. Mathematics" required />
          <TeacherSelect name="teacherId" teachers={teachers} label="Teacher" required />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors disabled:opacity-60 h-[38px]"
          >
            Add
          </button>
        </form>
        <p className="text-xs text-muted mt-2">
          Adding a subject that&apos;s already assigned replaces its teacher.
        </p>
      </div>
    </div>
  );
}

function TextField({
  label,
  name,
  defaultValue,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1">
        {label}
      </label>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-28 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
      />
    </div>
  );
}

function NumField({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: number;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1">
        {label}
      </label>
      <input
        type="number"
        min={1}
        max={12}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-20 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
      />
    </div>
  );
}

function TeacherSelect({
  name,
  teachers,
  defaultValue,
  label,
  required,
}: {
  name: string;
  teachers: Teacher[];
  defaultValue?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1">
        {label}
      </label>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15 h-[38px]"
      >
        <option value="">{required ? "Select a teacher" : "Unassigned"}</option>
        {teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.full_name}
          </option>
        ))}
      </select>
    </div>
  );
}
