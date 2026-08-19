"use client";

import { useState } from "react";
import Sidebar, { type SidebarLink } from "./Sidebar";
import Header from "./Header";
import OfflineBanner from "./OfflineBanner";

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
      <div className="print:hidden">
        <Sidebar
          sectionLabel={sectionLabel}
          links={links}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
      </div>
      <div className="md:pl-64 print:pl-0">
        <div className="print:hidden">
          <Header
            welcomeName={welcomeName}
            subLabel={subLabel}
            onMenuClick={() => setMobileOpen(true)}
          />
          <OfflineBanner />
        </div>
        <main>{children}</main>
      </div>
    </div>
  );
}
