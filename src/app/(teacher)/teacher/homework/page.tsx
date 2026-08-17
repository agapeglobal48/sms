import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HomeworkClient from "./HomeworkClient";

export default async function HomeworkPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const { classId: classIdParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("teacher_id", user!.id)
    .order("name", { ascending: true });

  if (!classes || classes.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-sm text-muted">
          You haven&apos;t been assigned to any classes yet.
        </p>
      </div>
    );
  }

  const classId =
    classIdParam && classes.some((c) => c.id === classIdParam)
      ? classIdParam
      : classes[0].id;

  if (!classIdParam) {
    redirect(`/teacher/homework?classId=${classId}`);
  }

  const { data: homework } = await supabase
    .from("homework")
    .select("id, subject, title, description, due_date, created_at")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl mx-auto p-6">
      <HomeworkClient classes={classes} classId={classId} homework={homework ?? []} />
    </div>
  );
}
