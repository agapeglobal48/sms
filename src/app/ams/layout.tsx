import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/shared/AppShell";

const ROLE_HOME: Record<string, string> = {
  superadmin: "/superadmin/dashboard",
  school_admin: "/admin/classes",
};

export default async function AmsLayout({
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
    .select("full_name, role, school_id")
    .eq("id", user!.id)
    .single();

  const backHref = ROLE_HOME[(profile?.role as string) ?? ""] ?? "/login";

  const { data: school } = profile?.school_id
    ? await supabase
        .from("schools")
        .select("name")
        .eq("id", profile.school_id)
        .single()
    : { data: null };

  const links = [
    { href: "/ams/assets", label: "Assets", icon: "package" as const },
    { href: "/ams/funding-bills", label: "Funding & Bills", icon: "wallet" as const },
    { href: backHref, label: "Back to Dashboard", icon: "arrowLeft" as const },
  ];

  return (
    <AppShell
      sectionLabel="AMS"
      links={links}
      welcomeName={profile?.full_name ?? "there"}
      subLabel={school?.name ?? "All schools"}
    >
      {children}
    </AppShell>
  );
}
