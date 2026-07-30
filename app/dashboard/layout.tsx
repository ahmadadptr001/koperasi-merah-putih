"use client";
import HeaderLayout from "@/components/layout/HeaderLayout";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { useColors } from "@/hooks/useColors";
import { useState } from "react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const colors = useColors();
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);

  return (
    // Latar diambil dari token tema. Sebelumnya dipaku ke `bg-[#fcf5f4]`
    // (pink terang), sehingga pada tema gelap seluruh area di luar konten
    // tetap terang dan tampak belang terhadap header serta sidebar.
    <main
      className="min-h-screen"
      style={{ backgroundColor: colors.background }}
    >
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
