"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GraduationCap, Mail, Lock, Check } from "lucide-react";

const ROLE_HOME: Record<string, string> = {
  superadmin: "/superadmin/dashboard",
  school_admin: "/admin/classes",
  teacher: "/teacher/classes",
  parent: "/parent",
};

const FEATURES = [
  "Attendance, marks and fees in one place",
  "Built for every school, one record at a time",
  "Secure role-based access for admins, teachers and parents",
];

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !signInData.user) {
      setError("Incorrect email or password.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", signInData.user.id)
      .single();

    if (profileError || !profile) {
      setError("Logged in, but no profile is set up for this account yet.");
      setLoading(false);
      return;
    }

    const destination = ROLE_HOME[profile.role as string] ?? "/login";
    router.push(destination);
    router.refresh();
  }

  return (
    <main className="min-h-screen grid md:grid-cols-2">
      {/* Left panel — brand */}
      <div className="relative hidden md:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-dark via-brand to-brand-light px-12 py-12 text-white">
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-gold/20 blur-3xl"
          aria-hidden
        />

        <div className="relative flex items-center gap-2">
          <GraduationCap size={26} strokeWidth={2.2} />
          <span className="font-heading font-bold text-lg tracking-tight">
            School SMS
          </span>
        </div>

        <div className="relative max-w-sm">
          <h1 className="font-heading font-bold text-4xl leading-tight mb-4">
            One system for every school record.
          </h1>
          <p className="text-white/70 mb-8">
            A unified management system built for Pakistani government
            schools — students, staff, assets and funding, all in one place.
          </p>
          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-white/85">
                <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-gold/90 flex items-center justify-center">
                  <Check size={11} strokeWidth={3} className="text-brand-dark" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">
          For Pakistani government schools
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex items-center justify-center px-6 py-12 bg-surface">
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="md:hidden flex items-center justify-center gap-2 mb-8 text-brand">
            <GraduationCap size={24} strokeWidth={2.2} />
            <span className="font-heading font-bold text-lg tracking-tight">
              School SMS
            </span>
          </div>

          <h2 className="font-heading font-bold text-2xl text-ink mb-1">
            Welcome back
          </h2>
          <p className="text-muted text-sm mb-8">
            Sign in with the email and password you were given.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-line pl-10 pr-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-light focus:ring-4 focus:ring-brand-light/10"
                  placeholder="you@school.edu.pk"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-line pl-10 pr-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-light focus:ring-4 focus:ring-brand-light/10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand text-white font-medium py-2.5 text-sm shadow-sm hover:bg-brand-dark hover:shadow-md transition-all disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
