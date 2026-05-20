"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProfileCard } from "@/components/sidebar/ProfileCard";
import { AcceptedReferralsButton } from "@/components/sidebar/AcceptedReferralsButton";
import { EditRequestsButton } from "@/components/sidebar/EditRequestsButton";
import { DeletionRequestsButton } from "@/components/sidebar/DeletionRequestsButton";
import { ArchivedReferralsButton } from "@/components/sidebar/ArchivedReferralsButton";
import { RequestStatusButton } from "@/components/sidebar/RequestStatusButton";
import { SchedulePlanner } from "@/components/sidebar/SchedulePlanner";
import { ReferralCard, MemoizedReferralCard, MemoizedFeaturedReferralCard } from "@/components/referrals/ReferralCard";
import { CreateReferralModal } from "@/components/modals/CreateReferralModal";
import { NewPatientReferralModal } from "@/components/modals/NewPatientReferralModal";
import { ExistingPatientReferralModal } from "@/components/modals/ExistingPatientReferralModal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getReferrals, deleteReferral, acceptReferral, updateReferral, Referral } from "@/lib/api/referrals";
import { createEvent, clearEventsCache } from "@/lib/api/events";
import { getMockUserProfile, getCurrentUserId, getProfile } from "@/lib/api/profiles";
import { supabase } from "@/lib/supabase";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { filterTaxonomy, ClinicalSection, ClinicalDiscipline, TreatmentService } from "@/lib/data/filterTaxonomy";
import { sendSystemNotification, requestNotificationPermission } from "@/lib/utils/notify";


export default function HomePage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isExistingPatientModalOpen, setIsExistingPatientModalOpen] = useState(false);
  const [isAcceptConfirmOpen, setIsAcceptConfirmOpen] = useState(false);
  const [referralToAccept, setReferralToAccept] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [referralToDelete, setReferralToDelete] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [featuredReferrals, setFeaturedReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileRefreshTrigger, setProfileRefreshTrigger] = useState(0);
  const [plannerRefreshKey, setPlannerRefreshKey] = useState(0);
  const [currentUserName, setCurrentUserName] = useState<string>("Unknown User");
  const [acceptedReferralIds, setAcceptedReferralIds] = useState<Set<string>>(new Set());
  const [sendBackMap, setSendBackMap] = useState<Map<string, string>>(new Map());
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getProfile(getCurrentUserId()).then((p) => {
      if (p) {
        const fullName = `${p.first_name} ${p.last_name}`.trim();
        setCurrentUserName(fullName);
      }
    }).catch(() => {});

    // Fetch referral IDs accepted by the current user from activity logs
    const fetchAcceptedIds = async () => {
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
    };
    fetchAcceptedIds();
  }, []);
  
  // Advanced Filter State
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("");
  const [selectedTreatment, setSelectedTreatment] = useState<string>("");
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [isDisciplineOpen, setIsDisciplineOpen] = useState(false);
  const [isTreatmentOpen, setIsTreatmentOpen] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const disciplineRef = useRef<HTMLDivElement>(null);
  const treatmentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sectionRef.current && !sectionRef.current.contains(e.target as Node)) setIsSectionOpen(false);
      if (disciplineRef.current && !disciplineRef.current.contains(e.target as Node)) setIsDisciplineOpen(false);
      if (treatmentRef.current && !treatmentRef.current.contains(e.target as Node)) setIsTreatmentOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setIsSortOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [filteredReferrals, setFilteredReferrals] = useState<Referral[]>([]);
  const [isAdvancedFilterActive, setIsAdvancedFilterActive] = useState(false);

  // Counts for sidebar badges
  const currentUserId = getCurrentUserId();
  const acceptedCount = useMemo(() => 
    referrals.filter(r =>
      r.is_featured &&
      r.accepted_by && r.accepted_by !== "None" &&
      (acceptedReferralIds.has(r.id) || r.accepted_by_user_id === currentUserId) &&
      (r.status === "pending" || r.status === "approved") &&
      !["completed", "deferred", "blacklisted"].includes(r.referral_status?.toLowerCase() ?? "") &&
      r.rerefer_request_status !== "approved"
    ).length,
    [referrals, acceptedReferralIds, currentUserId]
  );
  const editRequestCount = useMemo(() => 
    referrals.filter(r => r.user_id === currentUserId && r.edit_request_status && (r.edit_request_status === "pending" || r.edit_request_status === "approved" || r.edit_request_status === "declined")).length,
    [referrals, currentUserId]
  );
  const deletionRequestCount = useMemo(() =>
    referrals.filter(r => r.user_id === currentUserId && r.deletion_request_status && (r.deletion_request_status === "pending" || r.deletion_request_status === "approved" || r.deletion_request_status === "declined")).length,
    [referrals, currentUserId]
  );
  // Mirror the row-building logic in /request-status: a referral surfaces a
  // row when (a) the current user is the CREATOR and the referral has any
  // edit-request or deletion-request (pending / approved / declined), or
  // (b) the current user is the ACCEPTOR and the referral has a pending
  // status_change_reason (Deferral / Blacklisted request).
  const requestStatusCount = useMemo(() =>
    referrals.reduce((count, r) => {
      const isCreator  = r.user_id === currentUserId;
      const isAcceptor = r.accepted_by_user_id === currentUserId;
      let rows = 0;
      if (isCreator) {
        if (r.edit_request_status && r.edit_request_reason) rows++;
        if (r.deletion_request_status && r.deletion_request_reason) rows++;
      }
      if (isAcceptor && r.status_change_reason) rows++;
      // Count rereferral requests for acceptors (pending or approved, exclude completed)
      if (isAcceptor && r.rerefer_request_status && r.rerefer_request_reason && r.rerefer_request_status !== "completed") rows++;
      return count + rows;
    }, 0),
    [referrals, currentUserId]
  );
  const completedCount = useMemo(() =>
    referrals.filter(r =>
      r.is_featured &&
      r.accepted_by && r.accepted_by !== "None" &&
      acceptedReferralIds.has(r.id) &&
      r.referral_status && ["completed", "deferred", "blacklisted"].includes(r.referral_status.toLowerCase())
    ).length,
    [referrals, acceptedReferralIds]
  );

  useEffect(() => {
    loadReferrals();
    requestNotificationPermission();
  }, []);

  // Auto-play featured referrals carousel
  useEffect(() => {
    if (featuredReferrals.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredReferrals.length);
    }, 120000); // Change slide every 2 minutes

    return () => clearInterval(interval);
  }, [featuredReferrals.length]);

  const loadReferrals = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getReferrals(false);
      setReferrals(data || []);
      setFilteredReferrals(data || []);

      // Fetch latest SEND_BACK_TO_SYSTEM events to override posted-at for re-posted referrals
      const activityLogsTable = supabase.from("activity_logs") as any;
      const { data: sendBackLogs } = await activityLogsTable
        .select("created_at, metadata")
        .eq("action", "SEND_BACK_TO_SYSTEM")
        .order("created_at", { ascending: false })
        .limit(10000);
      const sbMap = new Map<string, string>();
      for (const log of (sendBackLogs || [])) {
        try {
          const meta = typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata;
          const rid = meta?.referral_id;
          if (rid && !sbMap.has(rid)) sbMap.set(rid, log.created_at); // first encounter = latest (DESC)
        } catch {}
      }
      setSendBackMap(sbMap);

      const effectivePostedAt = (r: Referral): string => sbMap.get(r.id) ?? r.created_at;

      // Get overdue referrals: not accepted, posted (effectively) more than 7 days ago,
      // and still available (not completed / deferred / blacklisted)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const overdue = (data || []).filter(r =>
        r.accepted_by === 'None' &&
        r.created_at &&
        new Date(effectivePostedAt(r)) < sevenDaysAgo &&
        !["completed", "deferred", "blacklisted"].includes(r.referral_status?.toLowerCase() ?? "") &&
        r.user_id !== getCurrentUserId()
      );
      // Sort by oldest first (most overdue)
      overdue.sort((a, b) => new Date(effectivePostedAt(a)).getTime() - new Date(effectivePostedAt(b)).getTime());
      setFeaturedReferrals(overdue.slice(0, 10));
      // Reset slide only if current slide is out of bounds
      setCurrentSlide(prev => (overdue.length > 0 ? Math.min(prev, overdue.length - 1) : 0));
    } catch (error) {
      console.error("Error loading referrals:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get available disciplines based on selected section
  const getAvailableDisciplines = (): ClinicalDiscipline[] => {
    if (!selectedSection) return [];
    const section = filterTaxonomy.find(s => s.id === selectedSection);
    return section?.clinicalDisciplines || [];
  };

  // Get available treatment services based on selected discipline
  const getAvailableTreatments = (): TreatmentService[] => {
    if (!selectedSection || !selectedDiscipline) return [];
    const section = filterTaxonomy.find(s => s.id === selectedSection);
    const discipline = section?.clinicalDisciplines.find(d => d.id === selectedDiscipline);
    return discipline?.treatmentServices || [];
  };

  // Handle section change - reset dependent filters
  const handleSectionChange = (sectionId: string) => {
    setSelectedSection(sectionId);
    setSelectedTreatment("");
    
    // For Prosthodontics, auto-select the single discipline
    const section = filterTaxonomy.find(s => s.id === sectionId);
    if (sectionId === "prostho" && section?.clinicalDisciplines.length === 1) {
      setSelectedDiscipline(section.clinicalDisciplines[0].id);
    } else {
      setSelectedDiscipline("");
    }
  };

  // Handle discipline change - reset dependent filters
  const handleDisciplineChange = (disciplineId: string) => {
    setSelectedDiscipline(disciplineId);
    setSelectedTreatment("");
  };

  // Handle treatment change
  const handleTreatmentChange = (treatmentId: string) => {
    setSelectedTreatment(treatmentId);
  };

  // Apply filters
  const handleSearch = () => {
    setIsAdvancedFilterActive(true);
    // Base pool: only non-accepted referrals, matched against DESTINATION fields only
    let filtered = referrals.filter(r => r.accepted_by === 'None');

    if (selectedSection) {
      const section = filterTaxonomy.find(s => s.id === selectedSection);
      if (section) {
        filtered = filtered.filter(r =>
          r.clinical_section_destination === section.shortName
        );
      }
    }

    if (selectedDiscipline) {
      const section = filterTaxonomy.find(s => s.id === selectedSection);
      const discipline = section?.clinicalDisciplines.find(d => d.id === selectedDiscipline);
      if (discipline) {
        filtered = filtered.filter(r =>
          r.clinical_discipline_destination === discipline.name
        );
      }
    }

    if (selectedTreatment) {
      const section = filterTaxonomy.find(s => s.id === selectedSection);
      const discipline = section?.clinicalDisciplines.find(d => d.id === selectedDiscipline);
      const treatment = discipline?.treatmentServices.find(t => t.id === selectedTreatment);
      if (treatment) {
        filtered = filtered.filter(r =>
          r.treatment_service_destination === treatment.name
        );
      }
    }

    setFilteredReferrals(filtered);
  };

  // Reset filters
  const handleResetFilters = () => {
    setSelectedSection("");
    setSelectedDiscipline("");
    setSelectedTreatment("");
    setIsAdvancedFilterActive(false);
    setFilteredReferrals(referrals);
  };

  const handleHeaderSearch = (query: string, category: string) => {
    if (!query.trim()) {
      if (!isAdvancedFilterActive) {
        setFilteredReferrals(referrals);
      }
      return;
    }
    setIsAdvancedFilterActive(false);

    const lowerQuery = query.toLowerCase();
    const filtered = referrals.filter(referral => {
      switch (category) {
        case 'chart_number':
          return referral.chart_number?.toLowerCase().includes(lowerQuery);
        case 'medical_alert':
          return referral.medical_alert?.toLowerCase().includes(lowerQuery);
        case 'origin':
          return (
            referral.clinical_section_origin?.toLowerCase().includes(lowerQuery) ||
            referral.clinical_discipline_origin?.toLowerCase().includes(lowerQuery) ||
            referral.treatment_service_origin?.toLowerCase().includes(lowerQuery)
          );
        case 'destination':
          return (
            referral.clinical_section_destination?.toLowerCase().includes(lowerQuery) ||
            referral.clinical_discipline_destination?.toLowerCase().includes(lowerQuery) ||
            referral.treatment_service_destination?.toLowerCase().includes(lowerQuery)
          );
        case 'age':
          return referral.age?.toString().includes(lowerQuery);
        default:
          return false;
      }
    });

    setFilteredReferrals(filtered);
  };

  const handleReferralSaved = () => {
    loadReferrals();
    sendSystemNotification("📋 Referral Posted", "Your referral has been successfully posted on the homepage.", "referral");
  };

  const handleDeleteReferral = useCallback((id: string) => {
    setReferralToDelete(id);
    setIsDeleteConfirmOpen(true);
  }, []);

  const confirmDeleteReferral = async () => {
    if (!referralToDelete) return;

    try {
      await deleteReferral(referralToDelete);
      setIsDeleteConfirmOpen(false);
      setReferralToDelete(null);
      loadReferrals();
      sendSystemNotification("🗑️ Referral Deleted", "The referral has been successfully deleted.", "referral");
    } catch (error) {
      console.error("Error deleting referral:", error);
      alert("Failed to delete referral. Please try again.");
    }
  };

  const handleUpdateReferral = useCallback(async (id: string, updates: Partial<Referral>) => {
    // Optimistic update — instantly reflect changes in UI
    setReferrals(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    setFilteredReferrals(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    setFeaturedReferrals(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    try {
      await updateReferral(id, updates as any);
      loadReferrals();
      sendSystemNotification("✏️ Referral Updated", "The referral has been successfully edited.", "referral");
    } catch (error: any) {
      console.error("Error updating referral (full):", JSON.stringify(error, null, 2));
      const msg = error?.message || error?.error_description || JSON.stringify(error);
      alert(`Failed to update referral: ${msg}`);
    }
  }, []);

  const handleAcceptReferral = useCallback((id: string) => {
    setReferralToAccept(id);
    setIsAcceptConfirmOpen(true);
  }, []);

  const handleEditRequestSubmitted = useCallback(() => {
    loadReferrals();
  }, [loadReferrals]);

  const blacklistedChartNumbers = useMemo(() =>
    new Set(referrals.filter(r => r.referral_status?.toLowerCase() === "blacklisted" && r.chart_number).map(r => r.chart_number!)),
  [referrals]);

  // Memoize the filtered non-featured referrals to prevent recomputation
  const visibleReferrals = useMemo(() => {
    return filteredReferrals
      .filter(referral => {
        // The home feed is the "open pool" — once a referral has been
        // accepted by anyone it must disappear from here regardless of the
        // is_featured flag, accepted_by_user_id, or status field. The
        // accepted_by string defaults to 'None' on creation and is filled
        // with the acceptor's display name on acceptance.
        if (referral.accepted_by && referral.accepted_by !== 'None') {
          return false;
        }
        // Hide blacklisted or deferred referrals — they are no longer available
        const rs = referral.referral_status?.toLowerCase();
        if (rs === 'blacklisted' || rs === 'deferred') {
          return false;
        }
        // Belt-and-suspenders: also drop any pinned referral whose status
        // is pending/approved (legacy guard; covered by the above for
        // freshly-accepted rows).
        if (referral.is_featured && (referral.status === 'pending' || referral.status === 'approved')) {
          return false;
        }

        // Exclude referrals with pending deletion requests
        if (referral.deletion_request_status === 'pending') {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aTs = new Date(sendBackMap.get(a.id) ?? a.created_at).getTime();
        const bTs = new Date(sendBackMap.get(b.id) ?? b.created_at).getTime();
        return sortOrder === "newest" ? bTs - aTs : aTs - bTs;
      });
  }, [filteredReferrals, sortOrder, sendBackMap]);

  const confirmAcceptReferral = async () => {
    if (!referralToAccept) return;

    try {
      const referral = referrals.find(r => r.id === referralToAccept);

      // Safety net: block the original rereferrer from re-accepting a
      // referral they just sent back to the system. The card-level gate
      // (`showAccept` on /home) already hides the button for this user, but
      // re-checking here protects entry points that bypass that gate (e.g.
      // the featured/overdue carousel's FeaturedReferralCard, which always
      // renders an Accept button).
      if (
        referral &&
        referral.rerefer_request_status === "completed" &&
        referral.rerefer_requested_by === currentUserId
      ) {
        alert("You can't accept a referral you just rereferred back to the system.");
        setIsAcceptConfirmOpen(false);
        setReferralToAccept(null);
        return;
      }

      await acceptReferral(referralToAccept, currentUserName);
      setIsAcceptConfirmOpen(false);
      setReferralToAccept(null);
      loadReferrals();
      sendSystemNotification("✅ Referral Accepted", "You have successfully accepted the referral.", "referral");

      // Auto-create a planner event for the tentative appointment date
      if (referral?.tentative_appointment_schedule) {
        try {
          const apptDate = new Date(referral.tentative_appointment_schedule);
          const tzOffset = -apptDate.getTimezoneOffset();
          const sign = tzOffset >= 0 ? '+' : '-';
          const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');
          const toLocalISO = (d: Date) => {
            const y = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            const dy = String(d.getDate()).padStart(2, '0');
            const h = String(d.getHours()).padStart(2, '0');
            const mi = String(d.getMinutes()).padStart(2, '0');
            return `${y}-${mo}-${dy}T${h}:${mi}:00${sign}${pad(tzOffset / 60)}:${pad(tzOffset % 60)}`;
          };
          const startISO = toLocalISO(apptDate);
          const endDate = new Date(apptDate.getTime() + 60 * 60 * 1000);
          const endISO = toLocalISO(endDate);
          await createEvent({
            title: `Referral Appointment — Chart ${referral.chart_number || "N/A"}`,
            description: `Patient referred for ${referral.treatment_service_destination || "treatment"} from ${referral.clinical_section_origin || "origin"}.`,
            start_time: startISO,
            end_time: endISO,
            color: "#1e3a5f",
            medical_alert: referral.medical_alert || undefined,
            notes: referral.notes_and_special_indications || undefined,
            source: "referral",
            location: referral.clinical_section_destination || undefined,
          });
          clearEventsCache();
          setPlannerRefreshKey(prev => prev + 1);
        } catch (eventErr) {
          console.error("Failed to create appointment event:", eventErr);
        }
      }
    } catch (error) {
      console.error("Error accepting referral:", error);
      alert("Failed to accept referral. Please try again.");
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredReferrals.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + featuredReferrals.length) % featuredReferrals.length);
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
        <Header 
          onProfileUpdate={() => setProfileRefreshTrigger(prev => prev + 1)}
          onSearch={handleHeaderSearch}
        />

        <main className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-5 p-4 lg:p-5 max-w-[1400px] mx-auto w-full">
        {/* Left Sidebar - Hidden on mobile, shown on lg+ */}
        <aside className="hidden lg:block w-[200px] flex-shrink-0 space-y-4 animate-enter">
          <ProfileCard refreshTrigger={profileRefreshTrigger} />
          <AcceptedReferralsButton count={acceptedCount} />
          <RequestStatusButton count={requestStatusCount} />
          <ArchivedReferralsButton count={completedCount} />
          <SchedulePlanner refreshKey={plannerRefreshKey} />
        </aside>

        {/* Mobile Profile Card & Buttons - Only shown on mobile */}
        <div className="lg:hidden space-y-3 animate-enter">
          <ProfileCard refreshTrigger={profileRefreshTrigger} />
          <div className="flex gap-3">
            <div className="flex-1">
              <AcceptedReferralsButton count={acceptedCount} />
            </div>
            <div className="flex-1">
              <RequestStatusButton count={requestStatusCount} />
            </div>
            <div className="flex-1">
              <ArchivedReferralsButton count={completedCount} />
            </div>
          </div>
        </div>

        {/* Center Content */}
        <section className="flex-1 order-2 lg:order-none animate-enter-delay-1">
          {/* Header with Make New Referral and Filter */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-secondary hover:bg-secondary/90 text-white font-bold px-6 sm:px-8 text-xs sm:text-sm w-full sm:w-auto uppercase tracking-wide shadow"
            >
              MAKE NEW REFERRAL
            </Button>

            <div ref={sortRef} className="relative">
              <button
                type="button"
                onClick={() => setIsSortOpen(p => !p)}
                className="flex items-center gap-1.5 bg-white border-2 border-secondary/20 hover:border-secondary/50 text-secondary text-xs font-bold uppercase tracking-wide px-3 py-2 rounded shadow-sm transition-colors"
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

          {/* Referrals List */}
          <div className="space-y-3">
            {loading ? (
              <div className="bg-[#87c4d8]/25 backdrop-blur-sm rounded shadow border border-[#87c4d8]/50 p-8 text-center text-muted-foreground">
                Loading referrals...
              </div>
            ) : visibleReferrals.length === 0 ? (
              <div className="bg-[#87c4d8]/25 backdrop-blur-sm rounded shadow border border-[#87c4d8]/50 p-8 text-center text-muted-foreground">
                {referrals.length === 0
                  ? "No referrals yet. Create your first referral!"
                  : isAdvancedFilterActive
                    ? "No referrals match the selected filters. Try adjusting or resetting the advanced filter."
                    : filteredReferrals.length === 0
                      ? "No referrals match your search."
                      : "No referrals available in the open pool right now."}
              </div>
            ) : (
              visibleReferrals.map((referral) => (
                <MemoizedReferralCard
                  key={referral.id}
                  id={referral.id}
                  title={`Referring ${referral.age || 0} yr. old patient for ${referral.treatment_service_destination}${referral.special_case ? ` (${referral.special_case})` : ''}`}
                  medicalAlert={referral.medical_alert || undefined}
                  clinicalSectionOrigin={referral.clinical_section_origin}
                  clinicalSectionDestination={referral.clinical_section_destination}
                  clinicalDisciplineOrigin={referral.clinical_discipline_origin || undefined}
                  clinicalDisciplineDestination={referral.clinical_discipline_destination || undefined}
                  treatmentServiceOrigin={referral.treatment_service_origin || undefined}
                  treatmentServiceDestination={referral.treatment_service_destination || undefined}
                  notesAndIndications={referral.notes_and_special_indications || undefined}
                  chartNumber={referral.chart_number}
                  acceptedBy={referral.accepted_by}
                  acceptedAt={referral.accepted_at}
                  status={referral.status}
                  referralStatus={referral.chart_number && blacklistedChartNumbers.has(referral.chart_number) ? "blacklisted" : (referral.referral_status || null)}
                  showAccept={
                    referral.accepted_by === "None" &&
                    referral.user_id !== currentUserId &&
                    !blacklistedChartNumbers.has(referral.chart_number || "") &&
                    // Block the user who just rereferred this referral from
                    // re-accepting it the moment it lands back in the open
                    // pool. `sendBackToSystem` sets rerefer_request_status to
                    // "completed" and leaves `rerefer_requested_by` pointing
                    // at the rereferrer, so this check is scoped to the
                    // CURRENT post-send-back cycle only; a later user who
                    // accepts and then rereferes it again will overwrite
                    // `rerefer_requested_by`, naturally un-blocking the
                    // original rereferrer.
                    !(referral.rerefer_request_status === "completed" && referral.rerefer_requested_by === currentUserId)
                  }
                  createdAt={sendBackMap.get(referral.id) ?? referral.created_at}
                  treatment={referral.treatment || undefined}
                  medicalHistory={referral.medical_history || undefined}
                  isFeatured={referral.is_featured}
                  specialCase={referral.special_case || undefined}
                  tentativeAppointment={referral.tentative_appointment_schedule || undefined}
                  age={referral.age ?? undefined}
                  sex={referral.sex}
                  userId={referral.user_id}
                  showUpdate={referral.user_id === currentUserId}
                  editRequestStatus={referral.edit_request_status}
                  editRequestReason={referral.edit_request_reason}
                  rereferRequestStatus={referral.rerefer_request_status}
                  rereferRequestReason={referral.rerefer_request_reason}
                  deletionRequestStatus={referral.deletion_request_status}
                  onUpdate={handleUpdateReferral}
                  onAccept={handleAcceptReferral}
                  onDelete={handleDeleteReferral}
                  onEditRequestSubmitted={handleEditRequestSubmitted}
                />
              ))
            )}
          </div>

          {/* Mobile Schedule Planner - Only shown on mobile */}
          <div className="lg:hidden mt-4">
            <SchedulePlanner refreshKey={plannerRefreshKey} />
          </div>
        </section>

        {/* Right Sidebar */}
        <aside className="w-full lg:w-[220px] flex-shrink-0 space-y-4 order-1 lg:order-none">
          {/* Advanced Filter Search */}
          <div className="bg-white rounded shadow border-2 border-[#87c4d8]/50">
            <div className="bg-secondary text-white text-xs font-bold py-2.5 px-4 text-center uppercase tracking-wide">
              ADVANCED FILTER SEARCH
            </div>
            <div className="p-4 space-y-3">
              {/* Clinical Section Dropdown */}
              <div ref={sectionRef} className="relative">
                <button
                  type="button"
                  onClick={() => { setIsSectionOpen(p => !p); setIsDisciplineOpen(false); setIsTreatmentOpen(false); }}
                  className="w-full flex items-center justify-between border-2 border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold bg-white hover:border-secondary transition-colors text-left"
                >
                  <span className={selectedSection ? "text-secondary" : "text-gray-400"}>
                    {selectedSection ? filterTaxonomy.find(s => s.id === selectedSection)?.name + " (" + filterTaxonomy.find(s => s.id === selectedSection)?.shortName + ")" : "By Clinical Section"}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform flex-shrink-0 ${isSectionOpen ? "rotate-180" : ""}`} />
                </button>
                {isSectionOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-secondary/30 rounded-lg shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => { handleSectionChange(""); setIsSectionOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${!selectedSection ? "bg-secondary text-white" : "text-gray-500 hover:bg-secondary/10 hover:text-secondary"}`}
                    >
                      By Clinical Section
                    </button>
                    {filterTaxonomy.map(section => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => { handleSectionChange(section.id); setIsSectionOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${selectedSection === section.id ? "bg-secondary text-white" : "text-gray-700 hover:bg-secondary/10 hover:text-secondary"}`}
                      >
                        {section.name} ({section.shortName})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Clinical Discipline Dropdown */}
              {selectedSection !== "prostho" && (
                <div ref={disciplineRef} className="relative">
                  <button
                    type="button"
                    disabled={!selectedSection}
                    onClick={() => { setIsDisciplineOpen(p => !p); setIsSectionOpen(false); setIsTreatmentOpen(false); }}
                    className={`w-full flex items-center justify-between border-2 rounded-lg px-3 py-2 text-xs font-semibold text-left transition-colors ${
                      selectedSection ? "border-gray-200 bg-white hover:border-secondary" : "border-gray-100 bg-gray-50 cursor-not-allowed"
                    }`}
                  >
                    <span className={selectedDiscipline ? "text-secondary" : "text-gray-400"}>
                      {selectedDiscipline ? getAvailableDisciplines().find(d => d.id === selectedDiscipline)?.name : "By Clinical Discipline"}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform flex-shrink-0 ${isDisciplineOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isDisciplineOpen && selectedSection && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-secondary/30 rounded-lg shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => { handleDisciplineChange(""); setIsDisciplineOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${!selectedDiscipline ? "bg-secondary text-white" : "text-gray-500 hover:bg-secondary/10 hover:text-secondary"}`}
                      >
                        By Clinical Discipline
                      </button>
                      {getAvailableDisciplines().map(discipline => (
                        <button
                          key={discipline.id}
                          type="button"
                          onClick={() => { handleDisciplineChange(discipline.id); setIsDisciplineOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${selectedDiscipline === discipline.id ? "bg-secondary text-white" : "text-gray-700 hover:bg-secondary/10 hover:text-secondary"}`}
                        >
                          {discipline.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Treatment Service Dropdown */}
              <div ref={treatmentRef} className="relative">
                {(() => {
                  const isEnabled = !!selectedSection && (!!selectedDiscipline || selectedSection === "prostho");
                  return (
                    <>
                      <button
                        type="button"
                        disabled={!isEnabled}
                        onClick={() => { setIsTreatmentOpen(p => !p); setIsSectionOpen(false); setIsDisciplineOpen(false); }}
                        className={`w-full flex items-center justify-between border-2 rounded-lg px-3 py-2 text-xs font-semibold text-left transition-colors ${
                          isEnabled ? "border-gray-200 bg-white hover:border-secondary" : "border-gray-100 bg-gray-50 cursor-not-allowed"
                        }`}
                      >
                        <span className={selectedTreatment ? "text-secondary" : "text-gray-400"}>
                          {selectedTreatment ? getAvailableTreatments().find(t => t.id === selectedTreatment)?.name : "By Treatment Service"}
                        </span>
                        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform flex-shrink-0 ${isTreatmentOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isTreatmentOpen && isEnabled && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-secondary/30 rounded-lg shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => { handleTreatmentChange(""); setIsTreatmentOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${!selectedTreatment ? "bg-secondary text-white" : "text-gray-500 hover:bg-secondary/10 hover:text-secondary"}`}
                          >
                            By Treatment Service
                          </button>
                          {getAvailableTreatments().map(treatment => (
                            <button
                              key={treatment.id}
                              type="button"
                              onClick={() => { handleTreatmentChange(treatment.id); setIsTreatmentOpen(false); }}
                              className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${selectedTreatment === treatment.id ? "bg-secondary text-white" : "text-gray-700 hover:bg-secondary/10 hover:text-secondary"}`}
                            >
                              {treatment.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleSearch}
                  className="flex-1 bg-secondary hover:bg-secondary/90 text-white text-xs font-bold uppercase tracking-wide shadow"
                >
                  SEARCH
                </Button>
                {(selectedSection || selectedDiscipline || selectedTreatment) && (
                  <Button 
                    onClick={handleResetFilters}
                    variant="outline"
                    className="text-xs font-bold uppercase tracking-wide border-2 border-gray-200 hover:border-secondary hover:text-secondary"
                  >
                    RESET
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Featured Referrals */}
          <div className="bg-[#87c4d8]/25 backdrop-blur-sm border-2 border-[#87c4d8]/50 rounded shadow overflow-hidden">
            <div className="bg-secondary text-white text-xs font-bold py-2.5 px-4 text-center uppercase tracking-wide">
              FEATURED REFERRALS
            </div>
            <div className="p-4">
              {/* Carousel Container */}
              {featuredReferrals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No overdue referrals at the moment
                </div>
              ) : (
                <div className="relative flex items-center">
                  {/* Left Arrow */}
                  {featuredReferrals.length > 1 && (
                    <button
                      onClick={prevSlide}
                      className="absolute -left-2 z-10 text-muted-foreground hover:text-secondary transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}

                  {/* Card */}
                  <div className="mx-4 w-full">
                    {featuredReferrals[currentSlide] && (
                      <MemoizedFeaturedReferralCard
                        id={featuredReferrals[currentSlide].id}
                        title={`Referring ${featuredReferrals[currentSlide].age || 0} yr. old patient for ${featuredReferrals[currentSlide].treatment_service_destination}${featuredReferrals[currentSlide].special_case ? ` (${featuredReferrals[currentSlide].special_case})` : ''}`}
                        medicalAlert={featuredReferrals[currentSlide].medical_alert || undefined}
                        clinicalSectionOrigin={featuredReferrals[currentSlide].clinical_section_origin}
                        clinicalSectionDestination={featuredReferrals[currentSlide].clinical_section_destination}
                        clinicalDisciplineOrigin={featuredReferrals[currentSlide].clinical_discipline_origin || undefined}
                        clinicalDisciplineDestination={featuredReferrals[currentSlide].clinical_discipline_destination || undefined}
                        treatmentServiceOrigin={featuredReferrals[currentSlide].treatment_service_origin || undefined}
                        treatmentServiceDestination={featuredReferrals[currentSlide].treatment_service_destination || undefined}
                        notesAndIndications={featuredReferrals[currentSlide].notes_and_special_indications || undefined}
                        chartNumber={featuredReferrals[currentSlide].chart_number}
                        acceptedBy={featuredReferrals[currentSlide].accepted_by}
                        acceptedAt={featuredReferrals[currentSlide].accepted_at}
                        status={featuredReferrals[currentSlide].status}
                        createdAt={sendBackMap.get(featuredReferrals[currentSlide].id) ?? featuredReferrals[currentSlide].created_at}
                        treatment={featuredReferrals[currentSlide].treatment || undefined}
                        medicalHistory={featuredReferrals[currentSlide].medical_history || undefined}
                        isFeatured={featuredReferrals[currentSlide].is_featured}
                        specialCase={featuredReferrals[currentSlide].special_case || undefined}
                        tentativeAppointment={featuredReferrals[currentSlide].tentative_appointment_schedule || undefined}
                        age={featuredReferrals[currentSlide].age ?? undefined}
                        sex={featuredReferrals[currentSlide].sex}
                        userId={featuredReferrals[currentSlide].user_id}
                        onAccept={handleAcceptReferral}
                        onUpdate={handleUpdateReferral}
                        onDelete={handleDeleteReferral}
                        onEditRequestSubmitted={handleEditRequestSubmitted}
                      />
                    )}
                  </div>

                  {/* Right Arrow */}
                  {featuredReferrals.length > 1 && (
                    <button
                      onClick={nextSlide}
                      className="absolute -right-2 z-10 text-muted-foreground hover:text-secondary transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}
                </div>
              )}

              {/* Dot Indicators */}
              <div className="flex justify-center gap-2 mt-4">
                {featuredReferrals.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors border-2 ${
                      idx === currentSlide 
                        ? "bg-secondary border-secondary" 
                        : "bg-gray-300 border-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </aside>
      </main>

      <Footer />

      <CreateReferralModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onNewPatient={() => setIsNewPatientModalOpen(true)}
        onExistingPatient={() => setIsExistingPatientModalOpen(true)}
      />

      <NewPatientReferralModal
        open={isNewPatientModalOpen}
        onOpenChange={setIsNewPatientModalOpen}
        onSave={handleReferralSaved}
      />

      <ExistingPatientReferralModal
        open={isExistingPatientModalOpen}
        onOpenChange={setIsExistingPatientModalOpen}
        onSave={handleReferralSaved}
      />

      {/* Delete Referral Confirmation Dialog */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsDeleteConfirmOpen(false)}
          />

          {/* Confirmation Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2">Delete Referral</h3>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete this referral? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmDeleteReferral}
                  className="flex-1 px-6 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
                >
                  YES, DELETE
                </button>
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accept Referral Confirmation Dialog */}
      {isAcceptConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsAcceptConfirmOpen(false)}
          />

          {/* Confirmation Modal — mirrors Approve Rereferral Request style */}
          <div className="relative bg-white rounded shadow-2xl border-2 border-gray-300 w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-secondary/10 mb-4">
                <svg className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2 uppercase tracking-wide">Accept Referral</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to accept this referral?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmAcceptReferral}
                  className="flex-1 px-6 py-2 bg-secondary text-white text-xs font-bold rounded hover:bg-secondary/90 transition-colors shadow uppercase tracking-wide"
                >
                  YES, ACCEPT
                </button>
                <button
                  onClick={() => setIsAcceptConfirmOpen(false)}
                  className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded hover:bg-muted transition-colors uppercase tracking-wide"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
    </RouteGuard>
  );
}
