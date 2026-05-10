"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Activity, LogOut, ShieldCheck, Pencil } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { getMockUserProfileSync, hasProfileCache } from "@/lib/api/profiles";
import { EditProfileModal } from "@/components/modals/EditProfileModal";

/**
 * Sidebar navigation for the System Administrator dashboard.
 *
 * Mirrors the visual language of `ProfileCard` (rounded card, secondary border,
 * gradient panel) but folds the navigation links inside the same card so the
 * left rail stays visually compact and matches the wireframe provided.
 */
export function SystemAdminNav() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const profile = getMockUserProfileSync();

  const displayName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : "System Administrator";
  const avatarUrl =
    profile?.avatar_url || "https://via.placeholder.com/100x100/c4956a/ffffff?text=SA";
  const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const navItems = [
    { href: "/system-admin/users",         label: "Users",         icon: Users },
    { href: "/system-admin/activity-logs", label: "Activity Logs", icon: Activity },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <EditProfileModal open={editOpen} onOpenChange={setEditOpen} />
      <div
        className="relative rounded-xl border-2 border-secondary/60 bg-gradient-to-b from-white to-secondary/5 overflow-hidden flex flex-col"
        style={{
          boxShadow:
            "0 4px 24px 0 rgba(30, 64, 175, 0.18), 0 1.5px 6px 0 rgba(30, 64, 175, 0.10)",
        }}
      >
        {/* ── Profile header ─────────────────────────────────────────────── */}
        <div className="px-4 pt-5 pb-4 border-b border-secondary/15">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-full bg-secondary/20 blur-md scale-110" />
              <Avatar className="relative h-12 w-12 border-[2.5px] border-secondary shadow-md rounded-full">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-secondary text-white text-sm font-bold rounded-full">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[12px] font-bold text-secondary leading-tight uppercase tracking-wide truncate">
                {displayName}
              </h3>
              <button
                onClick={() => setEditOpen(true)}
                className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-accent hover:text-secondary transition-colors"
              >
                <Pencil className="h-2.5 w-2.5" />
                Profile
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-1.5 bg-white rounded-lg px-3 py-1.5 border border-secondary/15 shadow-sm">
            <ShieldCheck className="h-3 w-3 text-secondary/60" />
            <span className="text-[10px] font-bold text-secondary uppercase tracking-wide">
              System Administrator
            </span>
          </div>
        </div>

        {/* ── Nav links ──────────────────────────────────────────────────── */}
        <nav className="px-3 py-3 flex-1 space-y-1.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all ${
                  active
                    ? "bg-secondary text-white shadow-md"
                    : "text-secondary/70 hover:bg-secondary/10 hover:text-secondary"
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 ${
                    active ? "text-white" : "text-secondary/50 group-hover:text-secondary"
                  }`}
                />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ── Logout ─────────────────────────────────────────────────────── */}
        <div className="px-3 pb-3 pt-1 border-t border-secondary/10">
          <button
            onClick={() => logout?.()}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wide text-red-500/80 hover:bg-red-500/10 hover:text-red-600 transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}
