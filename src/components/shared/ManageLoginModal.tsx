"use client";

import { useState } from "react";
import ReauthGate from "./ReauthGate";

export default function ManageLoginModal({
  onClose,
  targetId,
  targetLabel,
  getEmail,
  resetCredentials,
}: {
  onClose: () => void;
  targetId: string;
  targetLabel: string;
  getEmail: (id: string) => Promise<{ email: string | null }>;
  resetCredentials: (id: string, formData: FormData) => Promise<void>;
}) {
  const [verified, setVerified] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleVerified() {
    setVerified(true);
    setLoading(true);
    try {
      const result = await getEmail(targetId);
      setEmail(result.email);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset(formData: FormData) {
    setError(null);
    setSuccess(false);
    setLoading(true);
    resetCredentials(targetId, formData)
      .then(() => setSuccess(true))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Something went wrong.")
      )
      .finally(() => setLoading(false));
  }

  if (!verified) {
    return <ReauthGate onClose={onClose} onVerified={handleVerified} />;
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[60]">
      <div className="bg-surface rounded-xl w-full max-w-sm p-5 space-y-4">
        <div className="flex justify-between items-start">
          <h2 className="font-medium text-ink">Manage login — {targetLabel}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink text-sm">
            ✕
          </button>
        </div>

        {loading && !email && <p className="text-sm text-muted">Loading…</p>}
        {email && (
          <p className="text-sm text-ink">
            Current email: <span className="font-medium">{email}</span>
          </p>
        )}

        {error && (
          <p className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-success bg-success-soft border border-success/20 rounded-lg px-3 py-2">
            Updated.
          </p>
        )}

        <form action={handleReset} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              New email
            </label>
            <input
              name="newEmail"
              type="email"
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              New password
            </label>
            <input
              name="newPassword"
              type="password"
              minLength={8}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
            />
            <p className="text-xs text-muted mt-1">
              Leave blank to keep unchanged. At least 8 characters if changing.
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors disabled:opacity-60"
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}
