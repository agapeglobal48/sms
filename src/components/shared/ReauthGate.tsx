"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ReauthGate({
  onClose,
  onVerified,
}: {
  onClose: () => void;
  onVerified: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setError("Could not verify your session.");
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });

    setLoading(false);
    if (signInError) {
      setError("Incorrect password.");
      return;
    }

    setPassword("");
    onVerified();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[60]">
      <div className="bg-surface rounded-xl w-full max-w-sm p-5">
        <h2 className="font-medium text-ink mb-1">Confirm it&apos;s you</h2>
        <p className="text-sm text-muted mb-4">
          Enter your own password to view and manage this login.
        </p>
        <form onSubmit={handleVerify} className="space-y-3">
          {error && (
            <p className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <input
            type="password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/15"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-brand-light text-white text-sm font-medium px-4 py-2 hover:bg-brand transition-colors disabled:opacity-60"
            >
              {loading ? "Verifying…" : "Confirm"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line text-sm font-medium px-4 py-2 text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
