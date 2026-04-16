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
  const displayAvatarUrl = avatarUrl || profile?.avatar_url || "https://via.placeholder.com/100x100/c4956a/ffffff?text=U";

  if (loading) {
    return (
      <div className="bg-white/60 backdrop-blur-sm border-2 border-gray-300 rounded shadow p-5 text-center">
        <div className="h-20 w-20 mx-auto mb-3 rounded-full bg-gray-200 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-3 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white/60 backdrop-blur-sm border-2 border-gray-300 rounded shadow p-5 text-center">
      <Avatar className="h-20 w-20 mx-auto mb-4 rounded-full border-3 border-gray-300 shadow-sm">
        <AvatarImage src={displayAvatarUrl} />
        <AvatarFallback className="bg-muted text-secondary text-lg font-bold">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      <h2 className="text-sm font-bold text-secondary mb-2 uppercase tracking-wide">{displayName}</h2>
      <p className="text-xs text-muted-foreground mb-3 font-medium">{displayDepartment}</p>
      <p className="text-xs text-muted-foreground mb-4 font-medium">{displayYearLevel}</p>
      <div className="flex justify-center gap-3 mt-4 pt-4 border-t border-gray-300">
        <Link href="/schedule" className="p-2 rounded bg-muted hover:bg-accent hover:text-white transition-colors">
          <Calendar className="h-4 w-4" />
        </Link>
        <Link href="/profiles" className="p-2 rounded bg-muted hover:bg-accent hover:text-white transition-colors">
          <Users className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
