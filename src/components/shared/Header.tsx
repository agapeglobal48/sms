"use client";

import { Menu } from "lucide-react";
import SignOutButton from "./SignOutButton";

export default function Header({
  welcomeName,
  subLabel,
  onMenuClick,
}: {
  welcomeName: string;
  subLabel?: string;
  onMenuClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 bg-surface border-b border-line">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="md:hidden text-ink/60 hover:text-ink"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div>
            <p className="font-heading font-semibold text-ink leading-tight">
              Welcome, {welcomeName}
            </p>
            {subLabel && (
              <p className="text-xs text-muted leading-tight mt-0.5">
                {subLabel}
              </p>
            )}
          </div>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
