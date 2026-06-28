"use client";

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

  const isAuthPage =
    pathname === "/login" ||
    pathname.startsWith("/auth/");

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <AppSidebar />

      <div className="min-h-screen md:pl-64">
        <AppHeader />

        <main>{children}</main>
      </div>
    </div>
  );
}