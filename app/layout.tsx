import type { Metadata } from "next";
import type { ReactNode } from "react";

import AppHeader from "@/components/AppHeader";
import AppSidebar from "@/components/AppSidebar";

import "./globals.css";

export const metadata: Metadata = {
  title: "SM-LAB CRM",
  description: "Hệ thống quản lý khách hàng, sản phẩm và dự án SM-LAB",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({
  children,
}: Readonly<RootLayoutProps>) {
  return (
    <html lang="vi">
      <body className="bg-slate-100 text-slate-900 antialiased">
        <div className="flex min-h-screen">
          <AppSidebar />

          <div className="min-w-0 flex-1">
            <AppHeader />

            <main className="min-h-[calc(100vh-80px)] bg-slate-100 text-slate-900">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}