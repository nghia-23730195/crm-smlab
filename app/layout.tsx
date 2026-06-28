import type { Metadata } from "next";
import "./globals.css";

import AppHeader from "@/components/AppHeader";
import AppSidebar from "@/components/AppSidebar";

export const metadata: Metadata = {
  title: "SM-LAB CRM",
  description: "Hệ thống quản lý SM-LAB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="bg-slate-100 text-slate-900">
        <div className="min-h-screen">
          <AppSidebar />

          <div className="min-h-screen md:pl-64">
            <AppHeader />

            <main>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}