"use client";

import { useState, useTransition } from "react";
import { markNotificationRead, markAllNotificationsRead } from "./actions";

const TYPE_LABEL: Record<string, string> = {
  attendance: "Attendance",
  homework: "Homework",
  remark: "Remark",
};

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  created_at: string;
};

export default function NotificationsClient({
  notifications,
}: {
  notifications: Notification[];
}) {
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(notifications);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = items.filter((n) => !n.read).length;

  function handleMarkRead(id: string) {
    setError(null);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    startTransition(async () => {
      try {
        await markNotificationRead(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleMarkAllRead() {
    setError(null);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    startTransition(async () => {
      try {
        await markAllNotificationsRead();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-ink">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="text-sm text-brand-light hover:text-brand font-medium disabled:opacity-60"
          >
            Mark all as read
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="bg-surface rounded-xl border border-line divide-y divide-line">
        {items.length === 0 && (
          <p className="p-5 text-sm text-muted">No notifications yet.</p>
        )}
        {items.map((n) => (
          <div
            key={n.id}
            className={
              "p-4 flex items-start justify-between gap-3 " +
              (!n.read ? "bg-gold-soft/40" : "")
            }
          >
            <div>
              <p className="text-xs text-muted uppercase tracking-wide">
                {TYPE_LABEL[n.type] ?? n.type}
              </p>
              <p className="font-medium text-ink">{n.title}</p>
              {n.message && <p className="text-sm text-muted">{n.message}</p>}
              <p className="text-xs text-muted mt-1">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
            {!n.read && (
              <button
                onClick={() => handleMarkRead(n.id)}
                disabled={isPending}
                className="text-sm text-brand-light hover:text-brand font-medium shrink-0 disabled:opacity-60"
              >
                Mark read
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
