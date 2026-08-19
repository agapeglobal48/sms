import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/shared/AppShell";

const LINKS = [
  { href: "/parent", label: "Overview", icon: "home" as const },
  { href: "/parent/notifications", label: "Notifications", icon: "bell" as const },
];

export default async function ParentLayout({
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

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", user!.id)
    .eq("read", false);

  const links = LINKS.map((l) =>
    l.href === "/parent/notifications" ? { ...l, badge: unreadCount ?? 0 } : l
  );

  return (
    <AppShell
      sectionLabel="Parent"
      links={links}
      welcomeName={profile?.full_name ?? "there"}
      subLabel={school?.name}
    >
      {children}
    </AppShell>
  );
}
