import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/shared/AppShell";

const LINKS = [
  { href: "/admin/classes", label: "Classes", icon: "bookOpen" as const },
  { href: "/admin/teachers", label: "Teachers", icon: "users" as const },
  { href: "/admin/students", label: "Students", icon: "graduationCap" as const },
  { href: "/admin/parents", label: "Parents", icon: "userCheck" as const },
  { href: "/admin/fees", label: "Fees", icon: "wallet" as const },
  { href: "/admin/results", label: "Results", icon: "award" as const },
  { href: "/ams/assets", label: "Go to AMS", icon: "package" as const },
];

export default async function SchoolAdminLayout({
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
    .select("full_name, school_id")
    .eq("id", user!.id)
    .single();

  const { data: school } = profile?.school_id
    ? await supabase
        .from("schools")
        .select("name")
        .eq("id", profile.school_id)
        .single()
    : { data: null };

  return (
    <AppShell
      sectionLabel="School Admin"
      links={LINKS}
      welcomeName={profile?.full_name ?? "Admin"}
      subLabel={school?.name}
    >
      {children}
    </AppShell>
  );
}
