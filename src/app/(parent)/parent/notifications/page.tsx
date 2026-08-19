import { createClient } from "@/lib/supabase/server";
import NotificationsClient from "./NotificationsClient";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, message, read, created_at")
    .eq("parent_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <NotificationsClient notifications={notifications ?? []} />
    </div>
  );
}
