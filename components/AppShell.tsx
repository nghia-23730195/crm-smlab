"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

import AppHeader from "@/components/AppHeader";
import AppSidebar from "@/components/AppSidebar";

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isAuthPage =
    pathname === "/login" ||
    pathname.startsWith("/auth/");

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <div className="min-h-screen md:pl-64 flex flex-col">
        <AppHeader
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}