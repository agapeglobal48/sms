import { createClient } from "@/lib/supabase/server";
import ClassesClient from "./ClassesClient";

export default async function ClassesPage() {
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

  const [{ data: classes }, { data: teachers }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, grade, section, name, teacher_id")
      .eq("school_id", schoolId!)
      .order("grade", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("school_id", schoolId!)
      .eq("role", "teacher")
      .order("full_name", { ascending: true }),
  ]);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <ClassesClient classes={classes ?? []} teachers={teachers ?? []} />
    </div>
  );
}
