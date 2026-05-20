"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProfileCard } from "@/components/sidebar/ProfileCard";
import { SchedulePlanner } from "@/components/sidebar/SchedulePlanner";
import { ReferralCard } from "@/components/referrals/ReferralCard";
import { getReferrals, deleteReferral, updateReferral, Referral } from "@/lib/api/referrals";
import { getCurrentUserId, getProfile } from "@/lib/api/profiles";
import { supabase } from "@/lib/supabase";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function AcceptedReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("medical_alert");
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [acceptedReferralIds, setAcceptedReferralIds] = useState<Set<string>>(new Set());
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setIsSortOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchUserName = async () => {
      const profile = await getProfile(getCurrentUserId());
      if (profile) {
        setCurrentUserName(`${profile.first_name} ${profile.last_name}`);
      }
    };
    const fetchAcceptedByCurrentUser = async () => {
      const userId = getCurrentUserId();
      const { data } = await (supabase.from("activity_logs") as any)
        .select("metadata")
        .eq("action", "ACCEPT_REFERRAL")
        .eq("user_id", userId);
      if (data) {
        const ids = new Set<string>(
          (data as any[]).map((log: any) => {
            try {
              const parsed = typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata;
              return parsed?.referral_id;
            } catch { return null; }
          }).filter(Boolean)
        );
        setAcceptedReferralIds(ids);
      }
      setLogsLoaded(true);
    };
    fetchUserName();
    fetchAcceptedByCurrentUser();
    loadReferrals();
  }, []);

  const loadReferrals = useCallback(async () => {
    try {
      const data = await getReferrals(false); // Bypass cache for fresh data
      setReferrals(data || []);
    } catch (error) {
      console.error("Error loading referrals:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteReferral = useCallback(async (id: string) => {
    try {
      await deleteReferral(id);
      loadReferrals();
    } catch (error) {
      console.error("Error deleting referral:", error);
    }
  }, [loadReferrals]);

  const handleUpdateReferral = useCallback(async (id: string, updates: Partial<Referral>) => {
    try {
      await updateReferral(id, updates as any);
      loadReferrals();
    } catch (error) {
      console.error("Error updating referral:", error);
    }
  }, [loadReferrals]);

  const handleStatusChange = useCallback(async (id: string, newStatus: string) => {
    try {
      await updateReferral(id, { referral_status: newStatus } as any);
      loadReferrals();
    } catch (error) {
      console.error("Error updating referral status:", error);
    }
  }, [loadReferrals]);

  const handleSendBackToSystem = useCallback(async () => {
    loadReferrals();
  }, [loadReferrals]);

  const blacklistedChartNumbers = useMemo(() =>
    new Set(referrals.filter(r => r.referral_status?.toLowerCase() === "blacklisted" && r.chart_number).map(r => r.chart_number!)),
  [referrals]);

  const handleHeaderSearch = useCallback((query: string, category: string) => {
    setSearchQuery(query);
    setSearchCategory(category);
  }, []);

  // Only show referrals accepted by the current user, identified by activity log OR accepted_by_user_id
  const currentUserId = getCurrentUserId();
  const acceptedReferrals = useMemo(() => {
    if (!logsLoaded) return [];
    return referrals.filter(
      (referral) =>
        referral.is_featured &&
        referral.accepted_by &&
        referral.accepted_by !== "None" &&
        (acceptedReferralIds.has(referral.id) || referral.accepted_by_user_id === currentUserId) &&
        (referral.status === "pending" || referral.status === "approved") &&
        !["completed", "deferred", "blacklisted"].includes(referral.referral_status?.toLowerCase() ?? "") &&
        // Hide referrals with approved rereferral requests — they should only appear on request status page
        // until the clinician sends them back to the system
        referral.rerefer_request_status !== "approved"
        // NOTE: previously this also excluded referrals with a pending
        // status_change_reason. That hid Ongoing referrals the moment the
        // acceptor submitted a Deferral / Blacklist request — leaving the
        // acceptor with no way to see (or cancel) their own pending request.
        // We keep them visible; the ReferralCard renders a "PENDING DEFERRAL"
        // / "PENDING BLACKLIST" badge beside the Ongoing badge.
    ).sort((a, b) => {
      const aTs = new Date(a.accepted_at ?? a.created_at).getTime();
      const bTs = new Date(b.accepted_at ?? b.created_at).getTime();
      return sortOrder === "newest" ? bTs - aTs : aTs - bTs;
    });
  }, [referrals, acceptedReferralIds, logsLoaded, currentUserId, blacklistedChartNumbers, sortOrder]);

  const searchedReferrals = useMemo(() => {
    if (!searchQuery.trim()) return acceptedReferrals;
    const lowerQuery = searchQuery.toLowerCase();
    return acceptedReferrals.filter(r => {
      switch (searchCategory) {
        case "medical_alert": return r.medical_alert?.toLowerCase().includes(lowerQuery);
        case "origin": return r.clinical_section_origin?.toLowerCase().includes(lowerQuery) || r.clinical_discipline_origin?.toLowerCase().includes(lowerQuery) || r.treatment_service_origin?.toLowerCase().includes(lowerQuery);
        case "destination": return r.clinical_section_destination?.toLowerCase().includes(lowerQuery) || r.clinical_discipline_destination?.toLowerCase().includes(lowerQuery) || r.treatment_service_destination?.toLowerCase().includes(lowerQuery);
        case "created_by": return r.chart_number?.toLowerCase().includes(lowerQuery);
        case "accepted_by": return r.accepted_by?.toLowerCase().includes(lowerQuery);
        default: return true;
      }
    });
  }, [acceptedReferrals, searchQuery, searchCategory]);

  return (
    <RouteGuard allowedRoles={["clinician"]}>
    <div className="min-h-screen flex flex-col relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/bg-homepage.png)' }}
      />
      
      {/* White Opaque Overlay */}
      <div className="fixed inset-0 z-0 bg-white/60" />
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <Header onSearch={handleHeaderSearch} />

        <main className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-5 p-4 lg:p-5 max-w-[1400px] mx-auto w-full">
          {/* Left Sidebar - Hidden on mobile, shown on lg+ */}
          <aside className="hidden lg:block w-[200px] flex-shrink-0 space-y-4 animate-enter">
            <ProfileCard />
            <SchedulePlanner />
          </aside>

          {/* Mobile Profile Card - Only shown on mobile */}
          <div className="lg:hidden animate-enter">
            <ProfileCard />
          </div>

          {/* Main Content */}
          <section className="flex-1 animate-enter-delay-1">
            {/* Back to Home Link */}
            <Link href="/home" className="text-secondary text-sm mb-4 inline-block hover:underline font-semibold">
              ← Back to Home
            </Link>

            {/* Page Header */}
            <div className="bg-secondary text-white text-sm font-bold py-2.5 px-5 rounded shadow mb-5 uppercase tracking-wide flex items-center justify-between gap-3">
              <span>ACCEPTED REFERRALS</span>
              <div ref={sortRef} className="relative normal-case tracking-normal">
                <button
                  type="button"
                  onClick={() => setIsSortOpen(p => !p)}
                  className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors text-white text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded border border-white/30"
                >
                  <span>Sort by: {sortOrder === "newest" ? "Newest" : "Oldest"}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isSortOpen ? "rotate-180" : ""}`} />
                </button>
                {isSortOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white border-2 border-secondary/20 rounded shadow-lg z-50 overflow-hidden min-w-[140px]">
                    {(["newest", "oldest"] as const).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => { setSortOrder(opt); setIsSortOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${
                          sortOrder === opt ? "bg-secondary text-white" : "text-gray-700 hover:bg-secondary/10 hover:text-secondary"
                        }`}
                      >
                        {opt === "newest" ? "Newest" : "Oldest"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Accepted Referrals List */}
            <div className="space-y-3">
              {loading ? (
                <div className="bg-white/60 backdrop-blur-sm rounded shadow border border-gray-300 p-8 text-center text-muted-foreground">
                  Loading accepted referrals...
                </div>
              ) : searchedReferrals.length === 0 ? (
                <div className="bg-white/60 backdrop-blur-sm rounded shadow border border-gray-300 p-8 text-center text-muted-foreground">
                  {searchQuery.trim() ? "No referrals match your search." : "No accepted referrals yet."}
                </div>
              ) : (
                searchedReferrals.map((referral) => (
                  <ReferralCard
                    key={referral.id}
                    id={referral.id}
                    title={`Referring ${referral.age} yr. old patient for ${referral.treatment_service_destination}${referral.special_case ? ` (${referral.special_case})` : ''}`}
                    specialCase={referral.special_case || undefined}
                    medicalAlert={referral.medical_alert || undefined}
                    clinicalSectionOrigin={referral.clinical_section_origin || undefined}
                    clinicalSectionDestination={referral.clinical_section_destination}
                    clinicalDisciplineOrigin={referral.clinical_discipline_origin || undefined}
                    clinicalDisciplineDestination={referral.clinical_discipline_destination || undefined}
                    treatmentServiceOrigin={referral.treatment_service_origin || undefined}
                    treatmentServiceDestination={referral.treatment_service_destination || undefined}
                    notesAndIndications={referral.notes_and_special_indications || undefined}
                    chartNumber={referral.chart_number}
                    acceptedBy={referral.accepted_by || undefined}
                    acceptedAt={referral.accepted_at}
                    status={referral.status}
                    createdAt={referral.created_at}
                    showAccept={false}
                    showUpdate={false}
                    age={referral.age ?? undefined}
                    sex={referral.sex}
                    userId={referral.user_id}
                    acceptedReferralsPage={true}
                    referralStatus={referral.chart_number && blacklistedChartNumbers.has(referral.chart_number) ? "blacklisted" : referral.referral_status}
                    referralStatusChangedAt={referral.referral_status_changed_at}
                    acceptedByUserId={referral.accepted_by_user_id}
                    rereferRequestStatus={referral.rerefer_request_status}
                    rereferRequestReason={referral.rerefer_request_reason}
                    onStatusChange={blacklistedChartNumbers.has(referral.chart_number || "") ? undefined : handleStatusChange}
                    onUpdate={handleUpdateReferral}
                    onRerefer={() => loadReferrals()}
                    onSendBackToSystem={handleSendBackToSystem}
                    onDelete={() => handleDeleteReferral(referral.id)}
                    onEditRequestSubmitted={() => loadReferrals()}
                    statusChangeReason={referral.status_change_reason}
                    statusChangeDeclineReason={(referral as any).status_change_decline_reason}
                  />
                ))
              )}
            </div>

            {/* Mobile Schedule Planner - Only shown on mobile */}
            <div className="lg:hidden mt-4">
              <SchedulePlanner />
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </div>
    </RouteGuard>
  );
}
