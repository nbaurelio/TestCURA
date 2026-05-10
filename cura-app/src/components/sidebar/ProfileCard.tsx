"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Calendar, Users, Pencil, BarChart3 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getMockUserProfile, Profile, hasProfileCache, getMockUserProfileSync } from "@/lib/api/profiles";
import { EditProfileModal } from "@/components/modals/EditProfileModal";
import { useAuth } from "@/context/AuthContext";

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
  // Initialize with cached data to prevent avatar flickering on navigation
  const { role: userRole } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(getMockUserProfileSync());
  // Only show loading on initial load if no cache exists
  const [loading, setLoading] = useState(!hasProfileCache());
  const [editOpen, setEditOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const data = await getMockUserProfile();
      setProfile(data);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile, refreshTrigger]);

  // Get initials from name - memoized
  const getInitials = useCallback((fullName: string) => {
    return fullName.split(" ").map(n => n[0]).join("").toUpperCase();
  }, []);

  // Use props if provided, otherwise use database data - memoized
  const displayData = useMemo(() => ({
    name: name || (profile ? `${profile.first_name} ${profile.last_name}` : "User"),
    department: department || profile?.clinical_department || "N/A",
    yearLevel: yearLevel || profile?.year_level || "N/A",
    batchName: profile?.batch_name || null,
    subrole: (profile as any)?.subrole || null,
    avatarUrl: avatarUrl || profile?.avatar_url || "https://via.placeholder.com/100x100/c4956a/ffffff?text=U"
  }), [name, department, yearLevel, avatarUrl, profile]);

  // Destructure display data
  const { name: displayName, department: displayDepartment, yearLevel: displayYearLevel, batchName: displayBatchName, subrole: displaySubrole, avatarUrl: displayAvatarUrl } = displayData;

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
    <>
    <EditProfileModal open={editOpen} onOpenChange={setEditOpen} onSave={loadProfile} />
    <div className="relative rounded-xl border-2 border-secondary/60 bg-gradient-to-b from-white to-secondary/5 overflow-hidden" style={{ boxShadow: "0 4px 24px 0 rgba(30, 64, 175, 0.18), 0 1.5px 6px 0 rgba(30, 64, 175, 0.10)" }}>
      <button
        onClick={() => setEditOpen(true)}
        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-secondary/60 hover:text-secondary hover:bg-secondary/10 transition-colors z-10"
        title="Edit Profile"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
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
        {displayBatchName && profile?.role !== 'clinical_admin' && profile?.role !== 'professor' && (
          <p className="text-[11px] text-accent font-semibold mt-0.5">{displayBatchName}</p>
        )}


        <div className="mt-3 space-y-1.5">
          {profile?.role === 'professor' ? (
            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5 border border-secondary/15 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Role</span>
              <span className="text-[11px] font-semibold text-secondary text-right max-w-[60%] leading-tight">{displaySubrole || "Professor"}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5 border border-secondary/15 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{profile?.role === 'clinical_admin' ? 'Section' : 'Shift'}</span>
                <span className="text-[11px] font-semibold text-secondary text-right max-w-[60%] leading-tight">{displayDepartment}</span>
              </div>
              {profile?.role !== 'clinical_admin' && (
                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5 border border-secondary/15 shadow-sm">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Year</span>
                  <span className="text-[11px] font-semibold text-secondary">{displayYearLevel}</span>
                </div>
              )}
            </>
          )}
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
          {(userRole === "professor" || userRole === "clinical_admin") && (
            <Link
              href={userRole === "clinical_admin" ? "/clinical-admin/dashboard" : "/professor/dashboard"}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors"
              title="Analytics Dashboard"
            >
              <BarChart3 className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
