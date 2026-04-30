"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, Mail, Building2, GraduationCap, Users, X, ChevronDown } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getAllProfiles, getAdvisees, getCurrentUserId, Profile } from "@/lib/api/profiles";
import { useAuth } from "@/context/AuthContext";

const roleBadge: Record<string, { label: string; bg: string; text: string; border: string }> = {
  professor: { label: "PROFESSOR", bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-400" },
  clinician: { label: "CLINICIAN", bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-400" },
  college_head: { label: "COLLEGE HEAD", bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-400" },
};

function getInitials(first: string, last: string) {
  return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase();
}

export default function ProfilesPage() {
  const { role } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [advisees, setAdvisees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isRoleFilterOpen, setIsRoleFilterOpen] = useState(false);
  const roleFilterRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleFilterRef.current && !roleFilterRef.current.contains(e.target as Node)) {
        setIsRoleFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const load = async () => {
      const data = await getAllProfiles();
      setProfiles(data);

      if (role === "professor") {
        const professorId = getCurrentUserId();
        const myAdvisees = await getAdvisees(professorId);
        setAdvisees(myAdvisees);
      }

      setLoading(false);
    };
    load();
  }, [role]);

  const filtered = useMemo(() => {
    let result = profiles;
    if (roleFilter !== "all") {
      result = result.filter((p) => p.role === roleFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.first_name?.toLowerCase().includes(q) ||
          p.last_name?.toLowerCase().includes(q) ||
          p.role?.toLowerCase().includes(q) ||
          p.clinical_department?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [profiles, searchQuery, roleFilter]);

  const roleFilterOptions = [
    { value: "all", label: "All Roles" },
    { value: "college_head", label: "College Head" },
    { value: "professor", label: "Professor" },
    { value: "clinician", label: "Clinician" },
  ];
  const selectedRoleLabel = roleFilterOptions.find((o) => o.value === roleFilter)?.label || "All Roles";

  // Group by role in display order
  const roleOrder = ["college_head", "professor", "clinician"];
  const grouped = useMemo(() => {
    const map: Record<string, Profile[]> = {};
    for (const role of roleOrder) {
      map[role] = filtered.filter((p) => p.role === role);
    }
    // Add any roles not in the predefined list
    const otherProfiles = filtered.filter((p) => !roleOrder.includes(p.role));
    if (otherProfiles.length > 0) map["other"] = otherProfiles;
    return map;
  }, [filtered]);

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background Image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/bg-homepage.png)" }}
      />

      {/* White Opaque Overlay */}
      <div className="fixed inset-0 z-0 bg-white/60" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <Header />

        <main className="flex-1 p-4 sm:p-6 max-w-[1200px] mx-auto w-full">
          {/* Back to Home Link */}
          <Link href="/home" className="text-secondary text-sm mb-4 inline-block hover:underline">
            ← Back to Home
          </Link>

          {/* Page Title & Search */}
          <div className="bg-secondary rounded-lg p-5 mb-6 shadow relative">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_80%_50%,white_0%,transparent_50%)]" />
            <div className="relative flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-white font-bold text-lg uppercase tracking-wide">Members Directory</h1>
                <p className="text-white/60 text-xs mt-0.5">View all professors, clinicians, and college heads</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Role Filter Dropdown */}
                <div ref={roleFilterRef} className="relative">
                  <button
                    onClick={() => setIsRoleFilterOpen(!isRoleFilterOpen)}
                    className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2.5 border border-white/20 hover:bg-white/20 transition-all text-xs text-white font-medium min-w-[130px]"
                  >
                    <Users className="h-3.5 w-3.5 text-white/50 flex-shrink-0" />
                    <span className="flex-1 text-left">{selectedRoleLabel}</span>
                    <ChevronDown className={`h-3 w-3 text-white/50 transition-transform ${isRoleFilterOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isRoleFilterOpen && (
                    <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-10 min-w-[150px]">
                      {roleFilterOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => { setRoleFilter(option.value); setIsRoleFilterOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${
                            roleFilter === option.value
                              ? "bg-secondary text-white"
                              : "text-gray-700 hover:bg-secondary/10 hover:text-secondary"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Search Input */}
                <div className="flex items-center bg-white/10 rounded-lg border border-white/20 focus-within:bg-white/20 focus-within:border-white/40 transition-all">
                  <Search className="h-3.5 w-3.5 text-white/50 ml-3 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search profiles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-3 py-2.5 text-xs outline-none w-[140px] sm:w-[220px] bg-transparent text-white placeholder:text-white/40 font-medium"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="pr-2.5 text-white/40 hover:text-white transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* My Advisees Section — professors only, hidden when searching/filtering */}
          {!loading && role === "professor" && advisees.length > 0 && !searchQuery.trim() && roleFilter === "all" && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wide border bg-accent/15 text-accent border-accent/40">
                  My Advisees
                </span>
                <div className="flex-1 h-px bg-accent/30" />
                <span className="text-xs text-muted-foreground font-medium">{advisees.length} {advisees.length === 1 ? "advisee" : "advisees"}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {advisees.map((profile) => {
                  const badge = roleBadge[profile.role] || { label: profile.role.toUpperCase(), bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-400" };
                  return (
                    <div
                      key={profile.id}
                      onClick={() => setSelectedProfile(profile)}
                      className="bg-accent/10 backdrop-blur-sm rounded-lg p-4 sm:p-5 flex items-center gap-4 shadow border-2 border-accent/40 hover:border-accent/70 transition-colors cursor-pointer"
                    >
                      <Avatar className={`flex-shrink-0 h-12 w-12 border ${badge.border}`}>
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className={`${badge.bg} ${badge.text} font-bold text-sm`}>
                          {getInitials(profile.first_name, profile.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-secondary text-sm uppercase tracking-wide truncate">
                          {profile.last_name}, {profile.first_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                          {profile.clinical_department && (
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {profile.clinical_department}
                            </span>
                          )}
                        </div>
                        {profile.year_level && (
                          <p className="text-[10px] text-muted-foreground font-medium mt-1">{profile.year_level}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading profiles...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No profiles found.</div>
          ) : (
            roleOrder.map((role) => {
              const group = grouped[role];
              if (!group || group.length === 0) return null;
              const badge = roleBadge[role] || { label: role.toUpperCase(), bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-400" };

              return (
                <div key={role} className="mb-8">
                  {/* Section Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${badge.bg} ${badge.text} ${badge.border}`}>
                      {badge.label}
                    </span>
                    <div className="flex-1 h-px bg-gray-300" />
                    <span className="text-xs text-muted-foreground font-medium">{group.length} {group.length === 1 ? "member" : "members"}</span>
                  </div>

                  {/* Profiles Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.map((profile) => (
                      <div
                        key={profile.id}
                        onClick={() => setSelectedProfile(profile)}
                        className={`bg-[#87c4d8]/25 backdrop-blur-sm rounded-lg p-4 sm:p-5 flex items-center gap-4 shadow border-2 border-[#87c4d8]/50 hover:border-secondary/60 transition-colors cursor-pointer`}
                      >
                        {/* Avatar Circle */}
                        <Avatar className={`flex-shrink-0 h-12 w-12 border ${badge.border}`}>
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className={`${badge.bg} ${badge.text} font-bold text-sm`}>
                            {getInitials(profile.first_name, profile.last_name)}
                          </AvatarFallback>
                        </Avatar>

                        {/* Profile Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-secondary text-sm uppercase tracking-wide truncate">
                            {profile.last_name}, {profile.first_name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${badge.bg} ${badge.text}`}>
                              {badge.label}
                            </span>
                            {profile.clinical_department && (
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {profile.clinical_department}
                              </span>
                            )}
                          </div>
                          {profile.year_level && (
                            <p className="text-[10px] text-muted-foreground font-medium mt-1">{profile.year_level}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </main>

        <Footer />
      </div>

      {/* Profile Detail Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedProfile(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl border-2 border-secondary/30 w-full max-w-sm mx-4 overflow-hidden">
            {/* Close button */}
            <button
              onClick={() => setSelectedProfile(null)}
              className="absolute top-3 right-3 z-10 p-1 rounded-full bg-white/20 hover:bg-white/40 transition-colors"
            >
              <X className="h-4 w-4 text-white" />
            </button>

            {/* Header with avatar */}
            <div className="bg-secondary px-6 pt-8 pb-6 text-center relative">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_120%,white_0%,transparent_60%)]" />
              <div className="relative inline-block mb-3">
                <div className="absolute inset-0 rounded-full bg-white/20 blur-md scale-110" />
                <Avatar className="relative h-20 w-20 border-[3px] border-white/80 shadow-lg">
                  <AvatarImage src={selectedProfile.avatar_url || undefined} />
                  <AvatarFallback className="bg-accent text-white text-xl font-bold">
                    {getInitials(selectedProfile.first_name, selectedProfile.last_name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <h3 className="text-white font-bold text-lg uppercase tracking-wide leading-tight">
                {selectedProfile.last_name}, {selectedProfile.first_name}
              </h3>
              {selectedProfile.batch_name && (
                <p className="text-white/70 text-xs font-semibold mt-1">{selectedProfile.batch_name}</p>
              )}
              {(() => {
                const b = roleBadge[selectedProfile.role];
                return b ? (
                  <span className={`inline-block mt-2 px-3 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${b.bg} ${b.text} border ${b.border}`}>
                    {b.label}
                  </span>
                ) : (
                  <span className="inline-block mt-2 px-3 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-700 border border-gray-400">
                    {selectedProfile.role}
                  </span>
                );
              })()}
            </div>

            {/* Details */}
            <div className="px-5 py-5 space-y-2.5">
              {selectedProfile.email && (
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 border border-secondary/10">
                  <Mail className="h-4 w-4 text-secondary/50 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide block">Email</span>
                    <span className="text-xs font-semibold text-secondary truncate block">{selectedProfile.email}</span>
                  </div>
                </div>
              )}
              {selectedProfile.clinical_department && (
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 border border-secondary/10">
                  <Building2 className="h-4 w-4 text-secondary/50 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide block">Department</span>
                    <span className="text-xs font-semibold text-secondary">{selectedProfile.clinical_department}</span>
                  </div>
                </div>
              )}
              {selectedProfile.year_level && (
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 border border-secondary/10">
                  <GraduationCap className="h-4 w-4 text-secondary/50 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide block">Year Level</span>
                    <span className="text-xs font-semibold text-secondary">{selectedProfile.year_level}</span>
                  </div>
                </div>
              )}
              {selectedProfile.role && (
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 border border-secondary/10">
                  <Users className="h-4 w-4 text-secondary/50 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide block">Role</span>
                    <span className="text-xs font-semibold text-secondary capitalize">{selectedProfile.role.replace("_", " ")}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
