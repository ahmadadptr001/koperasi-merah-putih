"use client";
import HeaderLayout from "@/components/layout/HeaderLayout";
import SidebarLayout from "@/components/layout/SidebarLayout";
import type { Metadata } from "next";
import { useState } from "react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);

  return (
    <main className="min-h-screen bg-[#fcf5f4]">
      <HeaderLayout
        showSidebarMobile={showSidebarMobile}
        setShowSidebarMobile={setShowSidebarMobile}
      />

      <div id="main" className="relative lg:flex">
        <SidebarLayout showSidebarMobile={showSidebarMobile} />

        {showSidebarMobile && (
          <div
            className="fixed inset-0 z-40 bg-black/20 lg:hidden"
            onClick={() => setShowSidebarMobile(false)}
          />
        )}

        <section className="flex-1 min-h-screen overflow-x-hidden">
          {children}
        </section>
      </div>
    </main>
  );
}
