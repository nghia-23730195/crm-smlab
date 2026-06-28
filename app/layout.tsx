import type { Metadata } from "next";

import AppShell from "@/components/AppShell";

import "./globals.css";

export const metadata: Metadata = {
  title: "SM-LAB CRM",
  description: "Hệ thống quản lý khách hàng SM-LAB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="bg-slate-100 text-slate-900">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}