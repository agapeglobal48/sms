"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireParent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "parent") throw new Error("Parent only.");

  return { supabase, userId: user.id };
}

export async function markNotificationRead(notificationId: string) {
  const { supabase, userId } = await requireParent();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("parent_id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/parent/notifications");
}

export async function markAllNotificationsRead() {
  const { supabase, userId } = await requireParent();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("parent_id", userId)
    .eq("read", false);
  if (error) throw new Error(error.message);

  revalidatePath("/parent/notifications");
}
