"use client";

import React from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SystemAdminNav } from "@/components/sidebar/SystemAdminNav";
import { RouteGuard } from "@/components/auth/RouteGuard";

/**
 * Shared chrome for every page under /system-admin.
 *
 * Renders the standard CURA header/background/footer plus the dedicated
 * `SystemAdminNav` left-rail. Child routes only need to provide the main
 * panel content.
 */
export default function SystemAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={["system_admin"]}>
      <div className="min-h-screen flex flex-col relative">
        {/* Background image + white overlay (matches every other CURA page) */}
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/bg-homepage.png)" }}
        />
        <div className="fixed inset-0 z-0 bg-white/60" />

        <div className="relative z-10 min-h-screen flex flex-col">
          <Header />

          <main className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-5 p-3 sm:p-5 max-w-[1400px] mx-auto w-full">
            {/* Left rail */}
            <aside className="hidden lg:block w-[220px] flex-shrink-0 animate-enter">
              <SystemAdminNav />
            </aside>

            {/* Mobile: nav above content */}
            <div className="lg:hidden">
              <SystemAdminNav />
            </div>

            {/* Page content */}
            <div className="flex-1 min-w-0">{children}</div>
          </main>

          <Footer />
        </div>
      </div>
    </RouteGuard>
  );
}
