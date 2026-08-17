"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  LayoutDashboard,
  School,
  Wallet,
  Package,
  BookOpen,
  Users,
  GraduationCap,
  UserCheck,
  LayoutGrid,
  CalendarCheck,
  Award,
  ClipboardList,
  Home,
  ArrowLeft,
} from "lucide-react";

const ICONS = {
  dashboard: LayoutDashboard,
  school: School,
  wallet: Wallet,
  package: Package,
  bookOpen: BookOpen,
  users: Users,
  graduationCap: GraduationCap,
  userCheck: UserCheck,
  layoutGrid: LayoutGrid,
  calendarCheck: CalendarCheck,
  award: Award,
  clipboardList: ClipboardList,
  home: Home,
  arrowLeft: ArrowLeft,
} as const;

export type IconKey = keyof typeof ICONS;

export type SidebarLink = {
  href: string;
  label: string;
  icon: IconKey;
};

export default function Sidebar({
  sectionLabel,
  links,
  mobileOpen,
  onClose,
}: {
  sectionLabel: string;
  links: SidebarLink[];
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      <div
        onClick={onClose}
        className={
          "fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-300 " +
          (mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")
        }
      />

      <aside
        className={
          "fixed top-0 left-0 h-screen w-64 bg-brand text-white z-50 flex flex-col " +
          "transition-transform duration-300 ease-out md:translate-x-0 " +
          (mobileOpen ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div>
            <p className="font-heading font-bold text-lg tracking-tight leading-none">
              School SMS
            </p>
            <p className="text-xs text-white/50 mt-1">{sectionLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-white/60 hover:text-white"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            const Icon = ICONS[link.icon];
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 " +
                  (active
                    ? "bg-surface/10 text-white font-medium"
                    : "text-white/65 hover:text-white hover:bg-surface/5")
                }
              >
                <span
                  className={
                    "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-gold transition-all duration-200 " +
                    (active ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0")
                  }
                />
                <Icon
                  size={18}
                  className={
                    "shrink-0 transition-transform duration-200 " +
                    (active ? "" : "group-hover:translate-x-0.5")
                  }
                />
                <span className="truncate">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
