"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, Users } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getMockUserProfile, Profile } from "@/lib/api/profiles";

interface ProfileCardProps {
  name?: string;
  department?: string;
  yearLevel?: string;
  avatarUrl?: string;
  refreshTrigger?: number;
}

export function ProfileCard({
  name,
  department,
  yearLevel,
  avatarUrl,
  refreshTrigger,
}: ProfileCardProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [refreshTrigger]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getMockUserProfile();
      setProfile(data);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get initials from name
  const getInitials = (fullName: string) => {
    return fullName.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  // Use props if provided, otherwise use database data
  const displayName = name || (profile ? `${profile.first_name} ${profile.last_name}` : "User");
  const displayDepartment = department || profile?.clinical_department || "N/A";
  const displayYearLevel = yearLevel || profile?.year_level || "N/A";
  const displayBatchName = profile?.batch_name || null;
  const displayAvatarUrl = avatarUrl || profile?.avatar_url || "https://via.placeholder.com/100x100/c4956a/ffffff?text=U";

  if (loading) {
    return (
      <div className="rounded-xl shadow-md border border-gray-200 bg-white px-4 pt-6 pb-4 text-center">
        <div className="h-16 w-16 mx-auto mb-3 rounded-full bg-gray-200 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2 mx-auto w-32" />
        <div className="h-3 bg-gray-200 rounded animate-pulse mx-auto w-24" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-secondary/60 bg-gradient-to-b from-white to-secondary/5 overflow-hidden" style={{ boxShadow: "0 4px 24px 0 rgba(30, 64, 175, 0.18), 0 1.5px 6px 0 rgba(30, 64, 175, 0.10)" }}>
      <div className="pt-5 pb-4 px-4 text-center">
        {/* Avatar with glowing ring */}
        <div className="relative inline-block mb-3">
          <div className="absolute inset-0 rounded-full bg-secondary/20 blur-md scale-110" />
          <Avatar className="relative h-20 w-20 border-[3px] border-secondary shadow-md rounded-full">
            <AvatarImage src={displayAvatarUrl} />
            <AvatarFallback className="bg-secondary text-white text-xl font-bold rounded-full">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
        </div>

        <h2 className="text-sm font-bold text-secondary uppercase tracking-wide leading-tight">
          {displayName}
        </h2>
        {displayBatchName && (
          <p className="text-[11px] text-accent font-semibold mt-0.5">{displayBatchName}</p>
        )}

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5 border border-secondary/15 shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Shift</span>
            <span className="text-[11px] font-semibold text-secondary text-right max-w-[60%] leading-tight">{displayDepartment}</span>
          </div>
          <div className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5 border border-secondary/15 shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Year</span>
            <span className="text-[11px] font-semibold text-secondary">{displayYearLevel}</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex gap-2 mt-4">
          <Link
            href="/schedule"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors"
          >
            <Calendar className="h-4 w-4" />
          </Link>
          <Link
            href="/profiles"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors"
          >
            <Users className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
