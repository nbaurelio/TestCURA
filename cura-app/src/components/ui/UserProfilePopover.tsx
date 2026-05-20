"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getProfile, Profile } from "@/lib/api/profiles";
import { Mail, Building2, GraduationCap, Users } from "lucide-react";

interface UserProfilePopoverProps {
  userId: string;
  displayName: string;
}

export function UserProfilePopover({ userId, displayName }: UserProfilePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  // Reset profile when userId changes
  useEffect(() => {
    setProfile(null);
  }, [userId]);

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popoverHeight = 320; // approximate max height of the popover
      const popoverWidth = 256; // w-64 = 16rem = 256px
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Flip upward if not enough space below
      const top = spaceBelow < popoverHeight && spaceAbove > spaceBelow
        ? rect.top - popoverHeight - 8
        : rect.bottom + 8;

      // Clamp left so it doesn't go off-screen right
      const left = Math.min(
        rect.left,
        window.innerWidth - popoverWidth - 16
      );

      setPopoverPos({ top: Math.max(8, top), left: Math.max(8, left) });
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  const handleClick = async () => {
    updatePosition();
    setIsOpen((prev) => !prev);
    if (!profile && !loading) {
      setLoading(true);
      try {
        const data = await getProfile(userId);
        setProfile(data);
      } catch (err) {
        console.error("Error loading user profile:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  const fullName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : displayName;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        className="text-secondary font-bold hover:underline hover:text-secondary/80 transition-colors text-left text-xs"
      >
        {displayName}
      </button>

      {isOpen && createPortal(
        <div
          ref={popoverRef}
          className="fixed w-64 rounded-xl border-2 border-secondary/60 bg-white overflow-hidden"
          style={{
            top: popoverPos.top,
            left: popoverPos.left,
            zIndex: 9999,
            boxShadow: "0 8px 32px 0 rgba(30, 64, 175, 0.22), 0 2px 8px 0 rgba(30, 64, 175, 0.12)",
          }}
        >
          {loading ? (
            <div className="p-6 text-center">
              <div className="h-14 w-14 mx-auto mb-3 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded animate-pulse mb-2 mx-auto w-28" />
              <div className="h-2.5 bg-gray-200 rounded animate-pulse mx-auto w-20" />
            </div>
          ) : (
            <>
              {/* Header banner */}
              <div className="bg-secondary px-4 py-3 text-center relative">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_120%,white_0%,transparent_60%)]" />
                <div className="relative inline-block mb-2">
                  <div className="absolute inset-0 rounded-full bg-white/20 blur-md scale-110" />
                  <Avatar className="relative h-14 w-14 border-[2.5px] border-white/80 shadow-lg">
                    <AvatarImage src={profile?.avatar_url || `https://via.placeholder.com/100x100/c4956a/ffffff?text=${getInitials(fullName)}`} />
                    <AvatarFallback className="bg-accent text-white text-base font-bold">
                      {getInitials(fullName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <h3 className="text-white font-bold text-sm uppercase tracking-wide leading-tight">
                  {fullName}
                </h3>
                {profile?.batch_name && (
                  <p className="text-white/70 text-[10px] font-semibold mt-0.5">{profile.batch_name}</p>
                )}
              </div>

              {/* Details */}
              <div className="px-3 py-3 space-y-1.5">
                {profile?.email && (
                  <div className="flex items-center gap-2.5 bg-white rounded-lg px-3 py-2 border border-secondary/15 shadow-sm">
                    <Mail className="h-3.5 w-3.5 text-secondary/50 flex-shrink-0" />
                    <span className="text-[11px] text-gray-600 truncate">{profile.email}</span>
                  </div>
                )}
                {profile?.clinical_department && (
                  <div className="flex items-center gap-2.5 bg-white rounded-lg px-3 py-2 border border-secondary/15 shadow-sm">
                    <Building2 className="h-3.5 w-3.5 text-secondary/50 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide block">Department</span>
                      <span className="text-[11px] font-semibold text-secondary">{profile.clinical_department}</span>
                    </div>
                  </div>
                )}
                {profile?.year_level && (
                  <div className="flex items-center gap-2.5 bg-white rounded-lg px-3 py-2 border border-secondary/15 shadow-sm">
                    <GraduationCap className="h-3.5 w-3.5 text-secondary/50 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide block">Year Level</span>
                      <span className="text-[11px] font-semibold text-secondary">{profile.year_level}</span>
                    </div>
                  </div>
                )}
                {profile?.role && (
                  <div className="flex items-center gap-2.5 bg-white rounded-lg px-3 py-2 border border-secondary/15 shadow-sm">
                    <Users className="h-3.5 w-3.5 text-secondary/50 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide block">Role</span>
                      <span className="text-[11px] font-semibold text-secondary capitalize">{profile.role}</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
