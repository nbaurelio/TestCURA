"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Search, Mail, Building2, GraduationCap, Users, X, ChevronDown, FileText, CheckCircle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getAllProfiles, getAdvisees, getCurrentUserId, getMockUserProfile, Profile } from "@/lib/api/profiles";
import { getReferrals, acceptReferral, submitEditRequest, submitDeletionRequest, Referral } from "@/lib/api/referrals";
import { getAllEvents } from "@/lib/api/events";
import { ViewDetailsModal } from "@/components/modals/ViewDetailsModal";
import { ActivityLogDetailsModal } from "@/components/modals/ActivityLogDetailsModal";
import { ActivityLog } from "@/lib/api/activity-logs";
import { supabase } from "@/lib/supabase";
import { MoreHorizontal, ClipboardList } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const roleBadge: Record<string, { label: string; bg: string; text: string; border: string }> = {
  professor: { label: "PROFESSOR", bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-400" },
  clinician: { label: "CLINICIAN", bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-400" },
  clinical_admin: { label: "CLINICAL ADMIN", bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-400" },
};

function getInitials(first: string, last: string) {
  return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase();
}

export default function ProfilesPage() {
  const { role, user } = useAuth();
  const canSeeProfessorLogs = role === "clinical_admin" || (role === "professor" && (user as any)?.subrole === "Clinical Chair");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [advisees, setAdvisees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [profileTab, setProfileTab] = useState<"info" | "posted" | "accepted" | "advisees" | "logs">("info");
  const [professorLogs, setProfessorLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [openLogMenuId, setOpenLogMenuId] = useState<string | null>(null);
  const logMenuRef = React.useRef<HTMLDivElement>(null);
  const [allReferrals, setAllReferrals] = useState<Referral[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [detailReferral, setDetailReferral] = useState<Referral | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [editRequestReferral, setEditRequestReferral] = useState<Referral | null>(null);
  const [editRequestReason, setEditRequestReason] = useState("");
  const [deletionRequestReferral, setDeletionRequestReferral] = useState<Referral | null>(null);
  const [deletionRequestReason, setDeletionRequestReason] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isRoleFilterOpen, setIsRoleFilterOpen] = useState(false);
  const roleFilterRef = React.useRef<HTMLDivElement>(null);
  const currentUserId = getCurrentUserId();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleFilterRef.current && !roleFilterRef.current.contains(e.target as Node)) {
        setIsRoleFilterOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
      if (logMenuRef.current && !logMenuRef.current.contains(e.target as Node)) {
        setOpenLogMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const load = async () => {
      const [profileData, referralData, currentProfile, eventsData] = await Promise.all([
        getAllProfiles(),
        getReferrals(false),
        getMockUserProfile(),
        getAllEvents(),
      ]);
      setProfiles(profileData);
      setAllReferrals(referralData || []);
      setAllEvents(eventsData || []);
      if (currentProfile) setCurrentUserName(`${currentProfile.first_name} ${currentProfile.last_name}`);

      if (role === "professor") {
        const professorId = getCurrentUserId();
        const myAdvisees = await getAdvisees(professorId);
        setAdvisees(myAdvisees);
      }

      setLoading(false);
    };
    load();
  }, [role]);

  // Fetches the professor's approve/decline activity logs. Three sources are
  // merged so the Logs tab covers every decision-making action:
  //   1. profData       — approve/decline of edit/rerefer/deletion requests
  //   2. profStatusData — approve/decline of status-change requests
  //                       (CHANGE_REFERRAL_STATUS rows written by the
  //                       professor in `professor/page.tsx`)
  //   3. statusData     — legacy advisee CHANGE_REFERRAL_STATUS rows that
  //                       pre-date the request/approval flow, kept for
  //                       backwards-compat
  const fetchProfessorLogs = useCallback(async (professor: Profile) => {
    setLogsLoading(true);
    try {
      const adviseeIds = profiles
        .filter(p => p.adviser_id === professor.id)
        .map(p => p.id);
      const [{ data: profData }, { data: profStatusData }, { data: statusData }] = await Promise.all([
        (supabase.from("activity_logs") as any)
          .select("*")
          .eq("user_id", professor.id)
          .in("action", [
            "APPROVE_EDIT_REQUEST",
            "DECLINE_EDIT_REQUEST",
            "APPROVE_REREFER_REQUEST",
            "DECLINE_REREFER_REQUEST",
            "APPROVE_DELETION_REQUEST",
            "DECLINE_DELETION_REQUEST",
          ]),
        (supabase.from("activity_logs") as any)
          .select("*")
          .eq("user_id", professor.id)
          .eq("action", "CHANGE_REFERRAL_STATUS"),
        adviseeIds.length > 0
          ? (supabase.from("activity_logs") as any)
              .select("*")
              .in("user_id", adviseeIds)
              .eq("action", "CHANGE_REFERRAL_STATUS")
          : Promise.resolve({ data: [] }),
      ]);
      const statusFiltered = (statusData || []).filter((log: any) => {
        try {
          const m = typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata;
          return m?.new_status === "deferred" || m?.new_status === "blacklisted" || m?.new_status === "completed";
        } catch { return false; }
      });
      const merged = [...(profData || []), ...(profStatusData || []), ...statusFiltered]
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setProfessorLogs(merged);
    } catch (e) {
      console.error(e);
    } finally {
      setLogsLoading(false);
    }
  }, [profiles]);

  // Eagerly pre-load logs when a professor profile is opened (only for
  // viewers who can see them). This populates `professorLogs.length` so the
  // Logs tab can show its count badge before the tab is clicked.
  useEffect(() => {
    if (!selectedProfile) return;
    if (selectedProfile.role !== "professor") return;
    if (!canSeeProfessorLogs) return;
    if (professorLogs.length > 0 || logsLoading) return;
    fetchProfessorLogs(selectedProfile);
  }, [selectedProfile, canSeeProfessorLogs, professorLogs.length, logsLoading, fetchProfessorLogs]);

  const filtered = useMemo(() => {
    let result = profiles;
    if (roleFilter !== "all") {
      if (roleFilter.startsWith("professor__")) {
        const sr = roleFilter.replace("professor__", "");
        result = result.filter((p) => p.role === "professor" && ((p as any).subrole || "Professor") === sr);
      } else {
        result = result.filter((p) => p.role === roleFilter);
      }
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

  const PROFESSOR_SUBROLE_ORDER = ["Clinical Chair", "Discipline Head", "Department Head", "Professor"];

  const roleFilterOptions = [
    { value: "all", label: "All Roles" },
    { value: "clinical_admin", label: "Clinical Admin" },
    { value: "professor", label: "Professor" },
    { value: "clinician", label: "Clinician" },
  ];
  const selectedRoleLabel = roleFilterOptions.find((o) => o.value === roleFilter)?.label || "All Roles";

  // Group by role in display order; split professors by subrole
  const roleOrder = ["clinical_admin", "professor", "clinician"];
  const grouped = useMemo(() => {
    const map: Record<string, Profile[]> = {};
    map["clinical_admin"] = filtered.filter((p) => p.role === "clinical_admin");
    // Split professors by subrole
    for (const sr of PROFESSOR_SUBROLE_ORDER) {
      map[`professor__${sr}`] = filtered.filter((p) => p.role === "professor" && ((p as any).subrole || "Professor") === sr);
    }
    map["clinician"] = filtered.filter((p) => p.role === "clinician");
    const otherProfiles = filtered.filter((p) => !roleOrder.includes(p.role));
    if (otherProfiles.length > 0) map["other"] = otherProfiles;
    return map;
  }, [filtered]);

  const professorBadge = roleBadge["professor"];
  const groupOrder = ["clinical_admin", ...PROFESSOR_SUBROLE_ORDER.map(sr => `professor__${sr}`), "clinician", "other"];

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
          <div className="bg-secondary rounded-lg p-5 mb-6 shadow relative z-50 animate-enter">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_80%_50%,white_0%,transparent_50%)]" />
            <div className="relative flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-white font-bold text-lg uppercase tracking-wide">Members Directory</h1>
                <p className="text-white/60 text-xs mt-0.5">View all professors, clinicians, and clinical admins</p>
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
                    <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50 min-w-[150px]">
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
                      onClick={() => { setSelectedProfile(profile); setProfessorLogs([]); setProfileTab("info"); }}
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
                              {profile.role === 'clinical_admin' ? `Section: ${profile.clinical_department}` : profile.clinical_department}
                            </span>
                          )}
                        </div>
                        {profile.role !== 'clinical_admin' && profile.year_level && (
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
            groupOrder.map((groupKey) => {
              const group = grouped[groupKey];
              if (!group || group.length === 0) return null;
              const isProfSubrole = groupKey.startsWith("professor__");
              const subroleLabel = isProfSubrole ? groupKey.replace("professor__", "") : null;
              const badge = isProfSubrole ? professorBadge : (roleBadge[groupKey] || { label: groupKey.toUpperCase(), bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-400" });

              return (
                <div key={groupKey} className="mb-8">
                  {/* Section Header */}
                  <div className="flex items-center gap-3 mb-4">
                    {isProfSubrole ? (
                      <>
                        <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">·</span>
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border bg-blue-50 text-blue-700 border-blue-300">
                          {subroleLabel}
                        </span>
                      </>
                    ) : (
                      <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {badge.label}
                      </span>
                    )}
                    <div className="flex-1 h-px bg-gray-300" />
                    <span className="text-xs text-muted-foreground font-medium">{group.length} {group.length === 1 ? "member" : "members"}</span>
                  </div>

                  {/* Profiles Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.map((profile) => (
                      <div
                        key={profile.id}
                        onClick={() => { setSelectedProfile(profile); setProfessorLogs([]); setProfileTab("info"); }}
                        className={`backdrop-blur-sm rounded-lg p-4 sm:p-5 flex items-center gap-4 shadow border-2 transition-colors cursor-pointer ${
                          profile.id === currentUserId
                            ? "bg-secondary/15 border-secondary/70 ring-2 ring-secondary/30"
                            : "bg-[#87c4d8]/25 border-[#87c4d8]/50 hover:border-secondary/60"
                        }`}
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
                            {profile.id === currentUserId && (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-secondary text-white">
                                YOU
                              </span>
                            )}
                            {profile.role === 'professor' && (profile as any).subrole && (
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {(profile as any).subrole}
                              </span>
                            )}
                            {profile.role === 'clinical_admin' && (
                              <span className="text-[10px] text-muted-foreground font-medium">OD · OM</span>
                            )}
                            {profile.role !== 'professor' && profile.role !== 'clinical_admin' && profile.clinical_department && (
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {profile.clinical_department}
                              </span>
                            )}
                          </div>
                          {profile.role !== 'clinical_admin' && profile.role !== 'professor' && profile.year_level && (
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
      {selectedProfile && (() => {
        const postedReferrals = allReferrals.filter(r => r.user_id === selectedProfile.id);
        const acceptedReferrals = allReferrals.filter(r => r.accepted_by_user_id === selectedProfile.id);
        const canSeeAccepted = role === "professor" || role === "clinical_admin";
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setSelectedProfile(null); setProfileTab("info"); setProfessorLogs([]); }} />
            <div className="relative bg-white rounded-2xl shadow-2xl border-2 border-secondary/30 w-full max-w-lg mx-auto overflow-hidden max-h-[90vh] flex flex-col">
              {/* Close button */}
              <button onClick={() => { setSelectedProfile(null); setProfileTab("info"); setProfessorLogs([]); }} className="absolute top-3 right-3 z-10 p-1 rounded-full bg-white/20 hover:bg-white/40 transition-colors">
                <X className="h-4 w-4 text-white" />
              </button>

              {/* Header */}
              <div className="bg-secondary px-6 pt-8 pb-5 text-center relative flex-shrink-0">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_120%,white_0%,transparent_60%)]" />
                <div className="relative inline-block mb-3">
                  <div className="absolute inset-0 rounded-full bg-white/20 blur-md scale-110" />
                  <Avatar className="relative h-16 w-16 border-[3px] border-white/80 shadow-lg">
                    <AvatarImage src={selectedProfile.avatar_url || undefined} />
                    <AvatarFallback className="bg-accent text-white text-lg font-bold">
                      {getInitials(selectedProfile.first_name, selectedProfile.last_name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <h3 className="text-white font-bold text-base uppercase tracking-wide leading-tight">
                  {selectedProfile.last_name}, {selectedProfile.first_name}
                </h3>
                {selectedProfile.role !== 'professor' && selectedProfile.batch_name && (
                  <p className="text-white/70 text-xs font-semibold mt-0.5">{selectedProfile.batch_name}</p>
                )}
                {(() => { const b = roleBadge[selectedProfile.role]; return b ? (
                  <span className={`inline-block mt-2 px-3 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${b.bg} ${b.text} border ${b.border}`}>{b.label}</span>
                ) : (
                  <span className="inline-block mt-2 px-3 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-700 border border-gray-400">{selectedProfile.role}</span>
                ); })()}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 flex-shrink-0">
                <button onClick={() => setProfileTab("info")} className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5 ${profileTab === "info" ? "text-secondary border-b-2 border-secondary bg-secondary/5" : "text-gray-400 hover:text-secondary"}`}>
                  <Users className="h-3.5 w-3.5" /> Info
                </button>
                {selectedProfile.role === "professor" && (() => {
                  const profAdvisees = profiles.filter(p => p.adviser_id === selectedProfile.id);
                  return (
                    <button onClick={() => setProfileTab("advisees")} className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5 ${profileTab === "advisees" ? "text-secondary border-b-2 border-secondary bg-secondary/5" : "text-gray-400 hover:text-secondary"}`}>
                      <Users className="h-3.5 w-3.5" /> Advisees <span className="ml-1 bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{profAdvisees.length}</span>
                    </button>
                  );
                })()}
                {selectedProfile.role === "professor" && canSeeProfessorLogs && (
                  <button
                    onClick={() => {
                      setProfileTab("logs");
                      // No-op if the eager pre-load already filled the cache
                      // (see the `useEffect` near `fetchProfessorLogs`).
                      if (professorLogs.length === 0 && !logsLoading) {
                        fetchProfessorLogs(selectedProfile);
                      }
                    }}
                    className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5 ${profileTab === "logs" ? "text-secondary border-b-2 border-secondary bg-secondary/5" : "text-gray-400 hover:text-secondary"}`}
                  >
                    <ClipboardList className="h-3.5 w-3.5" /> Logs
                    <span className="ml-1 bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{professorLogs.length}</span>
                  </button>
                )}
                {selectedProfile.role === "clinician" && (
                  <button onClick={() => setProfileTab("posted")} className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5 ${profileTab === "posted" ? "text-secondary border-b-2 border-secondary bg-secondary/5" : "text-gray-400 hover:text-secondary"}`}>
                    <FileText className="h-3.5 w-3.5" /> Posted <span className="ml-1 bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{postedReferrals.length}</span>
                  </button>
                )}
                {selectedProfile.role === "clinician" && canSeeAccepted && (
                  <button onClick={() => setProfileTab("accepted")} className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5 ${profileTab === "accepted" ? "text-secondary border-b-2 border-secondary bg-secondary/5" : "text-gray-400 hover:text-secondary"}`}>
                    <CheckCircle className="h-3.5 w-3.5" /> Accepted <span className="ml-1 bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{acceptedReferrals.length}</span>
                  </button>
                )}
              </div>

              {/* Tab Content */}
              <div className="overflow-y-auto flex-1">
                {/* Info Tab */}
                {profileTab === "info" && (
                  <div className="px-5 py-4 space-y-2.5">
                    {selectedProfile.email && (
                      <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 border border-secondary/10">
                        <Mail className="h-4 w-4 text-secondary/50 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide block">Email</span>
                          <span className="text-xs font-semibold text-secondary truncate block">{selectedProfile.email}</span>
                        </div>
                      </div>
                    )}
                    {selectedProfile.role === "clinical_admin" ? (
                      <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 border border-secondary/10">
                        <Building2 className="h-4 w-4 text-secondary/50 flex-shrink-0" />
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div><span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide block">Clinical Discipline</span><span className="text-xs font-semibold text-secondary">OD</span></div>
                          <div><span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide block">Clinical Section</span><span className="text-xs font-semibold text-secondary">OM</span></div>
                        </div>
                      </div>
                    ) : (selectedProfile.clinical_department || selectedProfile.year_level) ? (
                      <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 border border-secondary/10">
                        <Building2 className="h-4 w-4 text-secondary/50 flex-shrink-0" />
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          {selectedProfile.clinical_department && <div><span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide block">Department</span><span className="text-xs font-semibold text-secondary">{selectedProfile.clinical_department}</span></div>}
                          {selectedProfile.year_level && <div><span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide block">Year Level</span><span className="text-xs font-semibold text-secondary">{selectedProfile.year_level}</span></div>}
                        </div>
                      </div>
                    ) : null}
                    {selectedProfile.role === "professor" && (selectedProfile as any).subrole && (
                      <div className="flex items-center gap-3 bg-blue-50 rounded-lg px-4 py-3 border border-secondary/30">
                        <Users className="h-4 w-4 text-secondary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-bold text-secondary/60 uppercase tracking-wide block">Subrole</span>
                          <span className="text-xs font-bold text-secondary">{(selectedProfile as any).subrole}</span>
                        </div>
                      </div>
                    )}

                    {/* Activity Summary — clinicians only */}
                    {selectedProfile.role === "clinician" && (() => {
                      const posted = allReferrals.filter(r => r.user_id === selectedProfile.id);
                      const accepted = allReferrals.filter(r => r.accepted_by_user_id === selectedProfile.id);
                      const ongoing = accepted.filter(r => r.referral_status === "ongoing").length;
                      const completed = accepted.filter(r => r.referral_status === "completed").length;
                      const deferred = accepted.filter(r => r.referral_status === "deferred").length;
                      const blacklisted = accepted.filter(r => r.referral_status === "blacklisted").length;
                      // Event statistics for the clinician
                      const clinicianEvents = allEvents.filter(e => e.user_id === selectedProfile.id);
                      const scheduled = clinicianEvents.filter(e => e.status === "scheduled" || !e.status).length;
                      const treatmentRendered = clinicianEvents.filter(e => e.status === "treatment_rendered").length;
                      const canceled = clinicianEvents.filter(e => e.status === "canceled").length;
                      const rescheduled = clinicianEvents.filter(e => e.status === "rescheduled").length;
                      const noShow = clinicianEvents.filter(e => e.status === "no_show").length;
                      return (
                        <div className="bg-gray-50 rounded-lg px-4 py-3 border border-secondary/10">
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-3">Activity Summary</p>
                          {/* Top row: Posted & Accepted */}
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="bg-secondary/5 border border-secondary/20 rounded-lg px-3 py-2 text-center">
                              <p className="text-xl font-bold text-secondary">{posted.length}</p>
                              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mt-0.5">Posted</p>
                            </div>
                            <div className="bg-secondary/5 border border-secondary/20 rounded-lg px-3 py-2 text-center">
                              <p className="text-xl font-bold text-secondary">{accepted.length}</p>
                              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mt-0.5">Accepted</p>
                            </div>
                          </div>
                          {/* Referral Statuses */}
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-3 mb-2">Referral Statuses</p>
                          <div className="grid grid-cols-4 gap-1.5">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg px-2 py-2 text-center">
                              <p className="text-base font-bold text-blue-600">{ongoing}</p>
                              <p className="text-[8px] font-bold text-blue-400 uppercase tracking-wide mt-0.5">Ongoing</p>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-lg px-2 py-2 text-center">
                              <p className="text-base font-bold text-green-600">{completed}</p>
                              <p className="text-[8px] font-bold text-green-400 uppercase tracking-wide mt-0.5">Completed</p>
                            </div>
                            <div className="bg-orange-50 border border-orange-200 rounded-lg px-2 py-2 text-center">
                              <p className="text-base font-bold text-orange-600">{deferred}</p>
                              <p className="text-[8px] font-bold text-orange-400 uppercase tracking-wide mt-0.5">Deferred</p>
                            </div>
                            <div className="bg-gray-100 border border-gray-300 rounded-lg px-2 py-2 text-center">
                              <p className="text-base font-bold text-gray-600">{blacklisted}</p>
                              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">Blacklisted</p>
                            </div>
                          </div>
                          {/* Event Statuses */}
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-4 mb-2">Event Statuses</p>
                          <div className="grid grid-cols-5 gap-1.5">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg px-1 py-2 text-center">
                              <p className="text-sm font-bold text-blue-600">{scheduled}</p>
                              <p className="text-[7px] font-bold text-blue-400 uppercase tracking-wide mt-0.5 leading-tight">Scheduled</p>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-lg px-1 py-2 text-center">
                              <p className="text-sm font-bold text-green-600">{treatmentRendered}</p>
                              <p className="text-[7px] font-bold text-green-400 uppercase tracking-wide mt-0.5 leading-tight">Treatment<br/>Rendered</p>
                            </div>
                            <div className="bg-red-50 border border-red-200 rounded-lg px-1 py-2 text-center">
                              <p className="text-sm font-bold text-red-600">{canceled}</p>
                              <p className="text-[7px] font-bold text-red-400 uppercase tracking-wide mt-0.5 leading-tight">Canceled</p>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg px-1 py-2 text-center">
                              <p className="text-sm font-bold text-amber-600">{rescheduled}</p>
                              <p className="text-[7px] font-bold text-amber-400 uppercase tracking-wide mt-0.5 leading-tight">Rescheduled</p>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg px-1 py-2 text-center">
                              <p className="text-sm font-bold text-gray-600">{noShow}</p>
                              <p className="text-[7px] font-bold text-gray-400 uppercase tracking-wide mt-0.5 leading-tight">No Show</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Activity Logs Tab — professors, visible to clinical_admin only */}
                {profileTab === "logs" && selectedProfile.role === "professor" && canSeeProfessorLogs && (() => {
                  const professorFullName = `${selectedProfile.first_name} ${selectedProfile.last_name}`.trim();
                  const parseMeta = (log: ActivityLog): any => {
                    try { return typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata; } catch { return null; }
                  };
                  const getActionLabel = (log: ActivityLog) => {
                    if (log.action === "CHANGE_REFERRAL_STATUS") {
                      const m = parseMeta(log);
                      if (m?.declined_via === "status_change_request") return "Declined";
                      if (m?.new_status === "deferred") return "Deferred";
                      if (m?.new_status === "blacklisted") return "Blacklisted";
                      if (m?.new_status === "completed") return "Completed";
                      return "Status Changed";
                    }
                    const map: Record<string, string> = {
                      APPROVE_EDIT_REQUEST: "Edit Approved",
                      DECLINE_EDIT_REQUEST: "Edit Declined",
                      APPROVE_REREFER_REQUEST: "Re-refer Approved",
                      DECLINE_REREFER_REQUEST: "Re-refer Declined",
                      APPROVE_DELETION_REQUEST: "Deletion Approved",
                      DECLINE_DELETION_REQUEST: "Deletion Declined",
                    };
                    return map[log.action] || log.action;
                  };
                  const getActionStyle = (log: ActivityLog) => {
                    if (log.action === "CHANGE_REFERRAL_STATUS") {
                      const m = parseMeta(log);
                      if (m?.declined_via === "status_change_request") return "bg-red-50 border-red-300 text-red-700";
                      if (m?.new_status === "deferred") return "bg-orange-50 border-orange-300 text-orange-700";
                      if (m?.new_status === "blacklisted") return "bg-gray-100 border-gray-400 text-gray-700";
                      if (m?.new_status === "completed") return "bg-green-50 border-green-300 text-green-700";
                    }
                    const map: Record<string, string> = {
                      APPROVE_EDIT_REQUEST: "bg-green-50 border-green-300 text-green-700",
                      DECLINE_EDIT_REQUEST: "bg-red-50 border-red-300 text-red-700",
                      APPROVE_REREFER_REQUEST: "bg-purple-50 border-purple-300 text-purple-700",
                      DECLINE_REREFER_REQUEST: "bg-red-50 border-red-300 text-red-700",
                      APPROVE_DELETION_REQUEST: "bg-orange-50 border-orange-300 text-orange-700",
                      DECLINE_DELETION_REQUEST: "bg-red-50 border-red-300 text-red-700",
                    };
                    return map[log.action] || "bg-gray-50 border-gray-300 text-gray-700";
                  };
                  // Build a human-friendly description from the log action +
                  // metadata, framed from the professor's decision-making
                  // perspective. The raw `log.description` strings start with
                  // "YOU" (correct from the actor's own activity log view but
                  // misleading here, since whoever opens this popup is not
                  // the professor). We rewrite to "<Professor name> APPROVED/
                  // DECLINED <request type>" instead, matching the user-facing
                  // role of a professor: decision-maker only, never the one
                  // who performed the underlying status change.
                  const buildDescription = (log: ActivityLog): string => {
                    const m = parseMeta(log);
                    const chart = m?.chart_number ? ` - Chart: ${m.chart_number}` : "";
                    const upperName = professorFullName.toUpperCase();
                    switch (log.action) {
                      case "APPROVE_EDIT_REQUEST":
                        return `${upperName} APPROVED THE EDIT REQUEST${chart}`;
                      case "DECLINE_EDIT_REQUEST":
                        return `${upperName} DECLINED THE EDIT REQUEST${chart}`;
                      case "APPROVE_REREFER_REQUEST":
                        return `${upperName} APPROVED THE REREFER REQUEST${chart}`;
                      case "DECLINE_REREFER_REQUEST":
                        return `${upperName} DECLINED THE REREFER REQUEST${chart}`;
                      case "APPROVE_DELETION_REQUEST":
                        return `${upperName} APPROVED THE DELETION REQUEST${chart}`;
                      case "DECLINE_DELETION_REQUEST":
                        return `${upperName} DECLINED THE DELETION REQUEST${chart}`;
                      case "CHANGE_REFERRAL_STATUS": {
                        if (m?.declined_via === "status_change_request") {
                          const target = String(m?.declined_target || "").toUpperCase();
                          return `${upperName} DECLINED STATUS CHANGE TO ${target || "ONGOING"}${chart}`;
                        }
                        const target = String(m?.new_status || "").toUpperCase();
                        return `${upperName} APPROVED STATUS CHANGE TO ${target}${chart}`;
                      }
                      default:
                        return (log.description || "").replace(/\bYOU\b/gi, upperName);
                    }
                  };
                  return (
                    <div className="px-5 py-4 space-y-2">
                      {logsLoading ? (
                        <p className="text-center text-xs text-gray-400 py-8">Loading logs...</p>
                      ) : professorLogs.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 py-8">No activity logs found.</p>
                      ) : professorLogs.map(log => {
                        let meta: any = null;
                        try { if (log.metadata) meta = JSON.parse(log.metadata); } catch {}
                        const referral = meta?.referral_id ? allReferrals.find(r => r.id === meta.referral_id) : null;
                        const clinician = referral ? profiles.find(p => p.id === referral.user_id) : null;
                        const clinicianName = clinician ? `${clinician.first_name} ${clinician.last_name}` : null;
                        // Determine requester — metadata takes priority (works even after deletion/nulling)
                        const getRequesterId = () => {
                          if (meta?.requested_by_user_id) return meta.requested_by_user_id;
                          if (log.action === "CHANGE_REFERRAL_STATUS") return log.user_id;
                          if ((log.action === "APPROVE_EDIT_REQUEST" || log.action === "DECLINE_EDIT_REQUEST") && referral) return referral.user_id;
                          if ((log.action === "APPROVE_REREFER_REQUEST" || log.action === "DECLINE_REREFER_REQUEST") && referral) return referral.rerefer_requested_by;
                          if ((log.action === "APPROVE_DELETION_REQUEST" || log.action === "DECLINE_DELETION_REQUEST") && referral) return referral.deletion_requested_by;
                          return null;
                        };
                        const requesterId = getRequesterId();
                        const requester = requesterId ? profiles.find(p => p.id === requesterId) : null;
                        const requesterName = requester ? `${requester.first_name} ${requester.last_name}` : null;
                        const label = getActionLabel(log);
                        const style = getActionStyle(log);
                        return (
                          <div key={log.id} className="bg-white rounded-lg border border-secondary/15 shadow-sm px-4 py-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-secondary leading-snug">{buildDescription(log)}</p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                                  {requesterName && (
                                    <p className="text-[10px] text-gray-500">Requested by: <span className="font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{requesterName}</span></p>
                                  )}
                                  {meta?.chart_number && (
                                    <p className="text-[10px] text-gray-400">Chart: <span className="font-semibold text-gray-600">{meta.chart_number}</span></p>
                                  )}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {new Date(log.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${style}`}>{label}</span>
                                <div className="relative" ref={openLogMenuId === log.id ? logMenuRef : undefined}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setOpenLogMenuId(openLogMenuId === log.id ? null : log.id); }}
                                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>
                                  {openLogMenuId === log.id && (
                                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px] overflow-hidden">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedLog(log); setOpenLogMenuId(null); }}
                                        className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-secondary/10 hover:text-secondary transition-colors"
                                      >
                                        View Log Details
                                      </button>
                                      {referral && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setDetailReferral(referral); setOpenLogMenuId(null); }}
                                          className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-secondary/10 hover:text-secondary transition-colors"
                                        >
                                          View Referral
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Advisees Tab — professors only */}
                {profileTab === "advisees" && selectedProfile.role === "professor" && (() => {
                  const profAdvisees = profiles.filter(p => p.adviser_id === selectedProfile.id);
                  return (
                    <div className="px-5 py-4 space-y-2">
                      {profAdvisees.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 py-8">No advisees found.</p>
                      ) : profAdvisees.map(advisee => {
                        const posted = allReferrals.filter(r => r.user_id === advisee.id).length;
                        const accepted = allReferrals.filter(r => r.accepted_by_user_id === advisee.id).length;
                        return (
                          <div key={advisee.id} className="bg-white rounded-lg border border-secondary/15 shadow-sm px-4 py-3 flex items-center gap-3">
                            <Avatar className="h-9 w-9 border-2 border-secondary/20 flex-shrink-0">
                              <AvatarImage src={advisee.avatar_url || undefined} />
                              <AvatarFallback className="bg-secondary/10 text-secondary text-xs font-bold">
                                {getInitials(advisee.first_name, advisee.last_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-secondary truncate">{advisee.last_name}, {advisee.first_name}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {advisee.batch_name && (
                                  <span className="text-[9px] font-semibold text-gray-400">{advisee.batch_name}</span>
                                )}
                                {advisee.year_level && (
                                  <span className="text-[9px] font-semibold text-gray-400">{advisee.year_level}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="text-center">
                                <p className="text-sm font-bold text-secondary">{posted}</p>
                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wide">Posted</p>
                              </div>
                              <div className="w-px h-6 bg-gray-200" />
                              <div className="text-center">
                                <p className="text-sm font-bold text-secondary">{accepted}</p>
                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wide">Accepted</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Posted Referrals Tab */}
                {profileTab === "posted" && (
                  <div className="px-5 py-4 space-y-2">
                    {postedReferrals.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 py-8">No posted referrals found.</p>
                    ) : postedReferrals.map(r => {
                      const isNotAccepted = !r.accepted_by_user_id || r.accepted_by === "None";
                      const isNotCreator = r.user_id !== currentUserId;
                      const canAccept = role === "clinician" && isNotAccepted && isNotCreator;
                      const title = `Referring ${r.age || 0} yr. old patient for ${r.treatment_service_destination || r.treatment || r.chart_number}${r.special_case ? ` (${r.special_case})` : ''}`;
                      return (
                        <div key={r.id} className="bg-white rounded-lg border border-secondary/15 shadow-sm overflow-hidden">
                          {/* Card Header */}
                          <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-secondary leading-snug">{title}</p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {canAccept && (
                                <button
                                  disabled={acceptingId === r.id}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setAcceptingId(r.id);
                                    try {
                                      await acceptReferral(r.id, currentUserName || "Clinician");
                                      const updated = await getReferrals(false);
                                      setAllReferrals(updated || []);
                                    } catch (err) {
                                      console.error("Failed to accept referral:", err);
                                    } finally {
                                      setAcceptingId(null);
                                    }
                                  }}
                                  className="text-[10px] font-bold uppercase px-2.5 py-1 rounded bg-secondary text-white hover:bg-secondary/90 transition-colors disabled:opacity-50"
                                >
                                  {acceptingId === r.id ? "Accepting..." : "Accept"}
                                </button>
                              )}
                              {/* Three-dot menu */}
                              <div className="relative" ref={openMenuId === r.id ? menuRef : undefined}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === r.id ? null : r.id); }}
                                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                                {openMenuId === r.id && (
                                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[150px] overflow-hidden">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setDetailReferral(r); setOpenMenuId(null); }}
                                      className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-secondary/10 hover:text-secondary transition-colors"
                                    >
                                      View Details
                                    </button>
                                    {r.user_id === currentUserId && (
                                      <>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setEditRequestReferral(r); setEditRequestReason(""); setOpenMenuId(null); }}
                                          className="w-full text-left px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                                        >
                                          Request to Edit
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setDeletionRequestReferral(r); setDeletionRequestReason(""); setOpenMenuId(null); }}
                                          className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                          Request to Delete
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Medical Alert */}
                          {r.medical_alert && (
                            <div className="mx-4 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded px-3 py-1.5">
                              <span className="text-[9px] font-bold text-red-500 uppercase tracking-wide">Medical Alert:</span>
                              <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded">{r.medical_alert}</span>
                            </div>
                          )}

                          {/* Clinical Pathways */}
                          <div className="mx-4 mb-2 grid grid-cols-2 gap-2">
                            <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2">
                              <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wide mb-1">Origin</p>
                              {r.clinical_section_origin && <p className="text-[10px] text-gray-700"><span className="font-semibold">Section:</span> {r.clinical_section_origin}</p>}
                              {r.clinical_discipline_origin && <p className="text-[10px] text-gray-700"><span className="font-semibold">Discipline:</span> {r.clinical_discipline_origin}</p>}
                              {r.treatment_service_origin && <p className="text-[10px] text-gray-700"><span className="font-semibold">Treatment:</span> {r.treatment_service_origin}</p>}
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded px-3 py-2">
                              <p className="text-[9px] font-bold text-green-600 uppercase tracking-wide mb-1">Destination</p>
                              {r.clinical_section_destination && <p className="text-[10px] text-gray-700"><span className="font-semibold">Section:</span> {r.clinical_section_destination}</p>}
                              {r.clinical_discipline_destination && <p className="text-[10px] text-gray-700"><span className="font-semibold">Discipline:</span> {r.clinical_discipline_destination}</p>}
                              {r.treatment_service_destination && <p className="text-[10px] text-gray-700"><span className="font-semibold">Treatment:</span> {r.treatment_service_destination}</p>}
                            </div>
                          </div>

                          {/* Notes */}
                          {r.notes_and_special_indications && (
                            <div className="mx-4 mb-3 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">Notes: </span>
                              <span className="text-[10px] text-gray-600">{r.notes_and_special_indications}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Accepted Referrals Tab */}
                {profileTab === "accepted" && canSeeAccepted && (
                  <div className="px-5 py-4 space-y-3">
                    {acceptedReferrals.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 py-8">No accepted referrals found.</p>
                    ) : acceptedReferrals.map(r => {
                      const creator = profiles.find(p => p.id === r.user_id);
                      const creatorName = creator ? `${creator.first_name} ${creator.last_name}` : null;
                      const title = `Referring ${r.age || 0} yr. old patient for ${r.treatment_service_destination || r.treatment || r.chart_number}${r.special_case ? ` (${r.special_case})` : ''}`;
                      const statusStyle =
                        r.referral_status === "completed" ? "bg-green-100 text-green-700 border-green-400" :
                        r.referral_status === "deferred" ? "bg-orange-100 text-orange-700 border-orange-400" :
                        r.referral_status === "blacklisted" ? "bg-gray-800 text-white border-gray-700" :
                        "bg-blue-100 text-blue-700 border-blue-400";
                      return (
                        <div key={r.id} className="bg-white rounded-lg border border-secondary/15 shadow-sm overflow-hidden">
                          {/* Header */}
                          <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-secondary leading-snug">{title}</p>
                              {creatorName && (
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  Created by <span className="font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{creatorName}</span>
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded border ${statusStyle}`}>
                                {r.referral_status || "ongoing"}
                              </span>
                              {/* Three-dot menu */}
                              <div className="relative" ref={openMenuId === `acc-${r.id}` ? menuRef : undefined}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === `acc-${r.id}` ? null : `acc-${r.id}`); }}
                                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                                {openMenuId === `acc-${r.id}` && (
                                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px] overflow-hidden">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setDetailReferral(r); setOpenMenuId(null); }}
                                      className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-secondary/10 hover:text-secondary transition-colors"
                                    >
                                      View Details
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Medical Alert */}
                          {r.medical_alert && (
                            <div className="mx-4 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded px-3 py-1.5 flex-wrap">
                              <span className="text-[9px] font-bold text-red-500 uppercase tracking-wide">Medical Alert:</span>
                              {r.medical_alert.split(",").map((a, i) => (
                                <span key={i} className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded">{a.trim()}</span>
                              ))}
                            </div>
                          )}

                          {/* Clinical Pathways */}
                          <div className="mx-4 mb-2 grid grid-cols-2 gap-2">
                            <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2">
                              <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wide mb-1">Clinical Pathway — Origin</p>
                              {r.clinical_section_origin && <p className="text-[10px] text-gray-700"><span className="font-semibold">Section:</span> {r.clinical_section_origin}</p>}
                              {r.clinical_discipline_origin && <p className="text-[10px] text-gray-700"><span className="font-semibold">Discipline:</span> {r.clinical_discipline_origin}</p>}
                              {r.treatment_service_origin && <p className="text-[10px] text-gray-700"><span className="font-semibold">Treatment:</span> {r.treatment_service_origin}</p>}
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded px-3 py-2">
                              <p className="text-[9px] font-bold text-green-600 uppercase tracking-wide mb-1">Clinical Pathway — Destination</p>
                              {r.clinical_section_destination && <p className="text-[10px] text-gray-700"><span className="font-semibold">Section:</span> {r.clinical_section_destination}</p>}
                              {r.clinical_discipline_destination && <p className="text-[10px] text-gray-700"><span className="font-semibold">Discipline:</span> {r.clinical_discipline_destination}</p>}
                              {r.treatment_service_destination && <p className="text-[10px] text-gray-700"><span className="font-semibold">Treatment:</span> {r.treatment_service_destination}</p>}
                            </div>
                          </div>

                          {/* Notes */}
                          {r.notes_and_special_indications && (
                            <div className="mx-4 mb-2 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">Notes and Special Indications: </span>
                              <span className="text-[10px] text-gray-600">{r.notes_and_special_indications}</span>
                            </div>
                          )}

                          {/* Acceptance Details */}
                          <div className="mx-4 mb-3 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Acceptance Details</p>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Chart No.</p>
                                <p className="text-[11px] font-bold text-secondary">{r.chart_number}</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Accepted By</p>
                                <p className="text-[11px] font-semibold text-gray-700">{r.accepted_by || "—"}</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Accepted On</p>
                                <p className="text-[11px] font-semibold text-gray-700">
                                  {r.accepted_at ? new Date(r.accepted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* View Details Modal */}
      <ViewDetailsModal referral={detailReferral} isOpen={!!detailReferral} onClose={() => setDetailReferral(null)} />

      {/* Activity Log Details Modal */}
      <ActivityLogDetailsModal log={selectedLog} isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} />

      {/* Edit Request Dialog */}
      {editRequestReferral && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditRequestReferral(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-secondary px-6 py-4">
              <p className="text-white font-bold text-sm uppercase tracking-wide">Request to Edit</p>
              <p className="text-white/70 text-[10px] mt-0.5">Chart: {editRequestReferral.chart_number}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5 block">Reason for Edit Request</label>
                <textarea
                  value={editRequestReason}
                  onChange={e => setEditRequestReason(e.target.value)}
                  placeholder="Enter the reason for your edit request..."
                  className="w-full min-h-[100px] text-xs border-2 border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  disabled={!editRequestReason.trim()}
                  onClick={async () => {
                    try {
                      await submitEditRequest(editRequestReferral.id, editRequestReason, []);
                      setEditRequestReferral(null);
                      const updated = await getReferrals(false);
                      setAllReferrals(updated || []);
                    } catch (err) { console.error(err); }
                  }}
                  className="flex-1 px-4 py-2 bg-secondary text-white text-xs font-bold rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50"
                >
                  SUBMIT REQUEST
                </button>
                <button onClick={() => setEditRequestReferral(null)} className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors">
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deletion Request Dialog */}
      {deletionRequestReferral && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeletionRequestReferral(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-red-600 px-6 py-4">
              <p className="text-white font-bold text-sm uppercase tracking-wide">Request to Delete</p>
              <p className="text-white/70 text-[10px] mt-0.5">Chart: {deletionRequestReferral.chart_number}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5 block">Reason for Deletion Request</label>
                <textarea
                  value={deletionRequestReason}
                  onChange={e => setDeletionRequestReason(e.target.value)}
                  placeholder="Enter the reason for your deletion request..."
                  className="w-full min-h-[100px] text-xs border-2 border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  disabled={!deletionRequestReason.trim()}
                  onClick={async () => {
                    try {
                      await submitDeletionRequest(deletionRequestReferral.id, deletionRequestReason, []);
                      setDeletionRequestReferral(null);
                      const updated = await getReferrals(false);
                      setAllReferrals(updated || []);
                    } catch (err) { console.error(err); }
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  SUBMIT REQUEST
                </button>
                <button onClick={() => setDeletionRequestReferral(null)} className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors">
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
