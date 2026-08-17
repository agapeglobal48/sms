import { createClient } from "@/lib/supabase/server";
import TeachersClient from "./TeachersClient";

export default async function TeachersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user!.id)
    .single();

  const schoolId = profile?.school_id;

  const [{ data: teachers }, { data: classes }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, phone")
      .eq("school_id", schoolId!)
      .eq("role", "teacher")
      .order("full_name", { ascending: true }),
    supabase
      .from("classes")
      .select("name, teacher_id")
      .eq("school_id", schoolId!),
  ]);

  const teachersWithClasses = (teachers ?? []).map((t) => ({
    ...t,
    classNames: (classes ?? [])
      .filter((c) => c.teacher_id === t.id)
      .map((c) => c.name),
  }));

  return (
    <div className="max-w-3xl mx-auto p-6">
      <TeachersClient teachers={teachersWithClasses} />
    </div>
  );
}
