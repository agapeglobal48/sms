"use client";

import { useState } from "react";
import Sidebar, { type SidebarLink } from "./Sidebar";
import Header from "./Header";

export default function AppShell({
  sectionLabel,
  links,
  welcomeName,
  subLabel,
  children,
}: {
  sectionLabel: string;
  links: SidebarLink[];
  welcomeName: string;
  subLabel?: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper">
      <Sidebar
        sectionLabel={sectionLabel}
        links={links}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="md:pl-64">
        <Header
          welcomeName={welcomeName}
          subLabel={subLabel}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main>{children}</main>
      </div>
    </div>
  );
}
