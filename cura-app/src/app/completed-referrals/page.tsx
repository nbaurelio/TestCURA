"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProfileCard } from "@/components/sidebar/ProfileCard";
import { SchedulePlanner } from "@/components/sidebar/SchedulePlanner";
import { ReferralCard } from "@/components/referrals/ReferralCard";
import { getReferrals, Referral } from "@/lib/api/referrals";
import { getCurrentUserId, getProfile } from "@/lib/api/profiles";
import { supabase } from "@/lib/supabase";
import { RouteGuard } from "@/components/auth/RouteGuard";

const COMPLETED_STATUSES = ["completed", "deferred", "blacklisted"];

type StatusFilter = "all" | "completed" | "deferred" | "blacklisted";

export default function CompletedReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptedReferralIds, setAcceptedReferralIds] = useState<Set<string>>(new Set());
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("medical_alert");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const statusFilterRef = useRef<HTMLDivElement>(null);

  const handleHeaderSearch = useCallback((query: string, category: string) => {
    setSearchQuery(query);
    setSearchCategory(category);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setIsSortOpen(false);
      if (statusFilterRef.current && !statusFilterRef.current.contains(e.target as Node)) setIsStatusFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
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
    fetchAcceptedByCurrentUser();
    loadReferrals();
  }, []);

  const loadReferrals = useCallback(async () => {
    try {
      const data = await getReferrals(false);
      setReferrals(data || []);
    } catch (error) {
      console.error("Error loading referrals:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const blacklistedChartNumbers = useMemo(() =>
    new Set(referrals.filter(r => r.referral_status?.toLowerCase() === "blacklisted" && r.chart_number).map(r => r.chart_number!)),
  [referrals]);

  const currentUserId = getCurrentUserId();

  const completedReferrals = useMemo(() => {
    if (!logsLoaded) return [];
    return referrals.filter(
      (referral) =>
        referral.is_featured &&
        referral.accepted_by &&
        referral.accepted_by !== "None" &&
        // STRICT: Only show referrals where current user is the acceptor
        referral.accepted_by_user_id === currentUserId &&
        referral.referral_status &&
        COMPLETED_STATUSES.includes(referral.referral_status.toLowerCase()) &&
        !(referral as any).status_change_reason &&
        // Exclude referrals that have been sent back to system (completed rereferral)
        (referral as any).rerefer_request_status !== "completed"
    ).sort((a, b) => {
      const aTs = new Date(a.referral_status_changed_at ?? a.created_at).getTime();
      const bTs = new Date(b.referral_status_changed_at ?? b.created_at).getTime();
      return sortOrder === "newest" ? bTs - aTs : aTs - bTs;
    });
  }, [referrals, acceptedReferralIds, logsLoaded, currentUserId, sortOrder]);

  const filteredReferrals = useMemo(() => {
    if (statusFilter === "all") return completedReferrals;
    return completedReferrals.filter(r => r.referral_status?.toLowerCase() === statusFilter);
  }, [completedReferrals, statusFilter]);

  const searchedReferrals = useMemo(() => {
    if (!searchQuery.trim()) return filteredReferrals;
    const lowerQuery = searchQuery.toLowerCase();
    return filteredReferrals.filter(r => {
      switch (searchCategory) {
        case "medical_alert": return r.medical_alert?.toLowerCase().includes(lowerQuery);
        case "origin": return r.clinical_section_origin?.toLowerCase().includes(lowerQuery) || r.clinical_discipline_origin?.toLowerCase().includes(lowerQuery) || r.treatment_service_origin?.toLowerCase().includes(lowerQuery);
        case "destination": return r.clinical_section_destination?.toLowerCase().includes(lowerQuery) || r.clinical_discipline_destination?.toLowerCase().includes(lowerQuery) || r.treatment_service_destination?.toLowerCase().includes(lowerQuery);
        case "created_by": return r.chart_number?.toLowerCase().includes(lowerQuery);
        case "accepted_by": return r.accepted_by?.toLowerCase().includes(lowerQuery);
        default: return true;
      }
    });
  }, [filteredReferrals, searchQuery, searchCategory]);

  const statusLabel = (status: string | null) => {
    if (!status) return "";
    if (status === "completed") return "Completed";
    if (status === "deferred") return "Deferred";
    if (status === "blacklisted") return "Blacklisted";
    return status;
  };

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
            <div className="bg-secondary text-white text-sm font-bold py-3 px-5 rounded shadow mb-5 uppercase tracking-wide flex items-center justify-between">
              <span>ARCHIVED REFERRALS</span>
              <div className="flex items-center gap-2">
                <div ref={sortRef} className="relative normal-case tracking-normal">
                  <button
                    type="button"
                    onClick={() => setIsSortOpen(p => !p)}
                    className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors text-white text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded border border-white/30"
                  >
                    <span>Sort by: {sortOrder === "newest" ? "Newest" : "Oldest"}</span>
                    <ChevronDown className={`h-3 w-3 transition-transform ${isSortOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isSortOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden min-w-[120px]">
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
                <div ref={statusFilterRef} className="relative normal-case tracking-normal">
                  <button
                    type="button"
                    onClick={() => setIsStatusFilterOpen(p => !p)}
                    className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors text-white text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded border border-white/30"
                  >
                    <span>{statusFilter === "all" ? "All" : statusFilter === "completed" ? "Completed" : statusFilter === "deferred" ? "Deferred" : "Blacklisted"}</span>
                    <ChevronDown className={`h-3 w-3 transition-transform ${isStatusFilterOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isStatusFilterOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden min-w-[120px]">
                      {(["all", "completed", "deferred", "blacklisted"] as const).map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => { setStatusFilter(opt); setIsStatusFilterOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${
                            statusFilter === opt ? "bg-secondary text-white" : "text-gray-700 hover:bg-secondary/10 hover:text-secondary"
                          }`}
                        >
                          {opt === "all" ? "All" : opt === "completed" ? "Completed" : opt === "deferred" ? "Deferred" : "Blacklisted"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Completed Referrals List */}
            <div className="space-y-3">
              {loading ? (
                <div className="bg-white/60 backdrop-blur-sm rounded shadow border border-gray-300 p-8 text-center text-muted-foreground">
                  Loading archived referrals...
                </div>
              ) : searchedReferrals.length === 0 ? (
                <div className="bg-white/60 backdrop-blur-sm rounded shadow border border-gray-300 p-8 text-center text-muted-foreground">
                  {searchQuery.trim() ? "No referrals match your search." : `No ${statusFilter === "all" ? "archived" : statusFilter} referrals yet.`}
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
                    completedReferralsPage={true}
                    referralStatus={referral.chart_number && blacklistedChartNumbers.has(referral.chart_number) ? "blacklisted" : referral.referral_status}
                    referralStatusChangedAt={referral.referral_status_changed_at}
                    acceptedByUserId={referral.accepted_by_user_id}
                    rereferRequestStatus={referral.rerefer_request_status}
                    rereferRequestReason={referral.rerefer_request_reason}
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
