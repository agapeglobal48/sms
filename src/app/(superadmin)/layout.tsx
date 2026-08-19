import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/shared/AppShell";

const LINKS = [
  { href: "/superadmin/dashboard", label: "Dashboard", icon: "dashboard" as const },
  { href: "/superadmin/schools", label: "Schools", icon: "school" as const },
  { href: "/ams/funding-bills", label: "Funding & Bills", icon: "wallet" as const },
  { href: "/ams/assets", label: "Go to AMS", icon: "package" as const },
  { href: "/superadmin/audit-logs", label: "Audit Logs", icon: "history" as const },
];

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  return (
    <AppShell
      sectionLabel="Superadmin"
      links={LINKS}
      welcomeName={profile?.full_name ?? "Superadmin"}
      subLabel="All schools"
    >
      {children}
    </AppShell>
  );
}
