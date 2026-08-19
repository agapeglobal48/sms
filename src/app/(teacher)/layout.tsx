import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/shared/AppShell";

const LINKS = [
  { href: "/teacher/classes", label: "My Classes", icon: "layoutGrid" as const },
  { href: "/teacher/attendance", label: "Attendance", icon: "calendarCheck" as const },
  { href: "/teacher/marks", label: "Marks", icon: "award" as const },
  { href: "/teacher/homework", label: "Homework", icon: "clipboardList" as const },
  { href: "/teacher/remarks", label: "Remarks", icon: "messageSquare" as const },
];

export default async function TeacherLayout({
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
      sectionLabel="Teacher"
      links={LINKS}
      welcomeName={profile?.full_name ?? "Teacher"}
      subLabel={school?.name}
    >
      {children}
    </AppShell>
  );
}
