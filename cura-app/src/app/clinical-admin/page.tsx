"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProfileCard } from "@/components/sidebar/ProfileCard";
import { SchedulePlanner } from "@/components/sidebar/SchedulePlanner";
import { ReferralCard } from "@/components/referrals/ReferralCard";
import { getReferrals, Referral, deleteReferral, approveReferral, approveEditRequest, declineEditRequest, approveRereferRequest, declineRereferRequest, approveDeletionRequest, declineDeletionRequest } from "@/lib/api/referrals";
import { supabase } from "@/lib/supabase";
import { getProfile, getCurrentUserId } from "@/lib/api/profiles";
import { ViewDetailsModal } from "@/components/modals/ViewDetailsModal";
import { ChevronDown, MoreHorizontal, CheckCircle } from "lucide-react";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { UserProfilePopover } from "@/components/ui/UserProfilePopover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { sendSystemNotification } from "@/lib/utils/notify";

type ReferralStatus = "ALL" | "AVAILABLE" | "ONGOING" | "COMPLETED" | "DEFERRED" | "BLACKLISTED";
type RequestType = "ALL" | "REREFERRALS" | "EDIT_REQUESTS" | "DELETION_REQUESTS" | "STATUS_REQUESTS";

export default function ClinicalAdminDashboard() {
  const [activeStatus, setActiveStatus] = useState<ReferralStatus>("ALL");
  const [requestType, setRequestType] = useState<RequestType>("ALL");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
  const [referralToApprove, setReferralToApprove] = useState<string | null>(null);
  const [isDeclineConfirmOpen, setIsDeclineConfirmOpen] = useState(false);
  const [referralToDecline, setReferralToDecline] = useState<string | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedReferralForDetails, setSelectedReferralForDetails] = useState<Referral | null>(null);
  const [isApproveEditOpen, setIsApproveEditOpen] = useState(false);
  const [isDeclineEditOpen, setIsDeclineEditOpen] = useState(false);
  const [editRequestToAction, setEditRequestToAction] = useState<string | null>(null);
  const [isApproveDeletionOpen, setIsApproveDeletionOpen] = useState(false);
  const [isDeclineDeletionOpen, setIsDeclineDeletionOpen] = useState(false);
  const [deletionRequestToAction, setDeletionRequestToAction] = useState<string | null>(null);
  const [isApproveStatusChangeOpen, setIsApproveStatusChangeOpen] = useState(false);
  const [isDeclineStatusChangeOpen, setIsDeclineStatusChangeOpen] = useState(false);
  const [statusChangeToAction, setStatusChangeToAction] = useState<string | null>(null);
  const [statusChangeTarget, setStatusChangeTarget] = useState<string>("deferred");
  const [statusRequestFilter, setStatusRequestFilter] = useState<"ALL" | "EDIT" | "DELETION" | "REREFERRAL" | "DEFERRAL" | "BLACKLISTED">("ALL");
  const [isStatusRequestFilterOpen, setIsStatusRequestFilterOpen] = useState(false);
  const statusRequestFilterRef = useRef<HTMLDivElement>(null);
  const [isDeclineRereferOpen, setIsDeclineRereferOpen] = useState(false);
  const [rereferToDecline, setRereferToDecline] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [isApproveRereferOpen, setIsApproveRereferOpen] = useState(false);
  const [rereferToApprove, setRereferToApprove] = useState<string | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const statusRefMobile = useRef<HTMLDivElement>(null);
  const sectionDropdownRef = useRef<HTMLDivElement>(null);
  const sectionDropdownMobileRef = useRef<HTMLDivElement>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [showMySection, setShowMySection] = useState(false);
  const [sectionFilterMode, setSectionFilterMode] = useState<"ALL" | "ORIGIN" | "DESTINATION">("DESTINATION");
  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false);
  const [adminSection, setAdminSection] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("medical_alert");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideDesktop = statusRef.current?.contains(target);
      const insideMobile = statusRefMobile.current?.contains(target);
      if (!insideDesktop && !insideMobile) setIsStatusOpen(false);
      const insideSectionDesktop = sectionDropdownRef.current?.contains(target);
      const insideSectionMobile = sectionDropdownMobileRef.current?.contains(target);
      if (!insideSectionDesktop && !insideSectionMobile) setSectionDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    loadData();
  }, []);


  const loadData = async () => {
    try {
      const currentUserId = getCurrentUserId();
      const profile = await getProfile(currentUserId);
      if (profile?.clinical_department) {
        const match = profile.clinical_department.match(/\(([^)]+)\)/);
        setAdminSection(match ? match[1] : profile.clinical_department);
      }

      const referralsData = await getReferrals(false);
      setReferrals(referralsData || []);

      // Resolve user names for requesters
      const userIds = new Set<string>();
      referralsData?.forEach((r: Referral) => {
        if (r.user_id) userIds.add(r.user_id);
        if (r.rerefer_requested_by) userIds.add(r.rerefer_requested_by);
        if (r.deletion_requested_by) userIds.add(r.deletion_requested_by);
        if (r.accepted_by_user_id) userIds.add(r.accepted_by_user_id);
      });
      const nameMap: Record<string, string> = {};
      await Promise.all(
        Array.from(userIds).map(async (uid) => {
          try {
            const profile = await getProfile(uid);
            if (profile) nameMap[uid] = `${profile.first_name} ${profile.last_name}`;
          } catch {}
        })
      );
      setUserNames(nameMap);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReferrals = useMemo(() => {
    let filtered = referrals;

    if (showMySection && adminSection) {
      if (sectionFilterMode === "ORIGIN") {
        filtered = filtered.filter(ref =>
          ref.clinical_section_origin?.toLowerCase() === adminSection.toLowerCase()
        );
      } else if (sectionFilterMode === "DESTINATION") {
        filtered = filtered.filter(ref =>
          ref.clinical_section_destination?.toLowerCase() === adminSection.toLowerCase()
        );
      } else {
        filtered = filtered.filter(ref =>
          ref.clinical_section_origin?.toLowerCase() === adminSection.toLowerCase() ||
          ref.clinical_section_destination?.toLowerCase() === adminSection.toLowerCase()
        );
      }
    }

    if (activeStatus === "AVAILABLE") {
      filtered = filtered.filter(ref => !ref.accepted_by || ref.accepted_by === "None");
    } else if (activeStatus !== "ALL") {
      filtered = filtered.filter(ref => {
        const refStatus = ref.referral_status?.toUpperCase() || "";
        const isAccepted = ref.accepted_by && ref.accepted_by !== "None";
        return refStatus === activeStatus && isAccepted;
      });
    }

    if (requestType === "EDIT_REQUESTS") {
      filtered = filtered.filter(ref => ref.edit_request_status === "pending" && ref.edit_request_reason);
    }
    if (requestType === "REREFERRALS") {
      filtered = filtered.filter(ref => ref.rerefer_request_status === "pending" && ref.rerefer_request_reason);
    }
    if (requestType === "DELETION_REQUESTS") {
      filtered = filtered.filter(ref => ref.deletion_request_status === "pending" && ref.deletion_request_reason);
    }
    if (requestType === "STATUS_REQUESTS") {
      filtered = filtered.filter(ref => {
        const rawReason: string = (ref as any).status_change_reason || "";
        const scTarget = rawReason.includes("::") ? rawReason.split("::")[0] : "";
        const isRerefer = ref.rerefer_request_status === "pending" && !!ref.rerefer_request_reason;
        const isEdit = ref.edit_request_status === "pending" && !!ref.edit_request_reason;
        const isDeletion = ref.deletion_request_status === "pending" && !!ref.deletion_request_reason;
        const isDeferral = !!rawReason && scTarget === "deferred";
        const isBlacklisted = !!rawReason && scTarget === "blacklisted";
        return statusRequestFilter === "ALL" ? (isRerefer || isEdit || isDeletion || isDeferral || isBlacklisted) :
          statusRequestFilter === "REREFERRAL" ? isRerefer :
          statusRequestFilter === "EDIT" ? isEdit :
          statusRequestFilter === "DELETION" ? isDeletion :
          statusRequestFilter === "DEFERRAL" ? isDeferral :
          statusRequestFilter === "BLACKLISTED" ? isBlacklisted : false;
      });
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [referrals, activeStatus, requestType, showMySection, adminSection, sectionFilterMode, statusRequestFilter]);

  const blacklistedChartNumbers = useMemo(() =>
    new Set(referrals.filter(r => r.referral_status?.toLowerCase() === "blacklisted" && r.chart_number).map(r => r.chart_number!)),
  [referrals]);

  const handleHeaderSearch = (query: string, category: string) => {
    setSearchQuery(query);
    setSearchCategory(category);
  };

  const searchedReferrals = useMemo(() => {
    if (!searchQuery.trim()) return filteredReferrals;
    const q = searchQuery.toLowerCase();
    return filteredReferrals.filter(referral => {
      switch (searchCategory) {
        case 'medical_alert': return referral.medical_alert?.toLowerCase().includes(q);
        case 'origin': return (
          referral.clinical_section_origin?.toLowerCase().includes(q) ||
          referral.clinical_discipline_origin?.toLowerCase().includes(q) ||
          referral.treatment_service_origin?.toLowerCase().includes(q)
        );
        case 'destination': return (
          referral.clinical_section_destination?.toLowerCase().includes(q) ||
          referral.clinical_discipline_destination?.toLowerCase().includes(q) ||
          referral.treatment_service_destination?.toLowerCase().includes(q)
        );
        case 'created_by': return (
          userNames[referral.user_id]?.toLowerCase().includes(q)
        );
        case 'accepted_by': return (
          referral.accepted_by?.toLowerCase().includes(q)
        );
        default: return true;
      }
    });
  }, [filteredReferrals, searchQuery, searchCategory]);

  const handleDeleteReferral = async (id: string) => {
    try {
      await deleteReferral(id);
      loadData();
    } catch (error) {
      console.error("Error deleting referral:", error);
    }
  };

  const handleUpdateReferral = async (id: string, updates: Partial<Referral>) => {
    try {
      await (await import("@/lib/api/referrals")).updateReferral(id, updates as any);
      await loadData();
    } catch (error: any) {
      console.error("Error updating referral:", error);
      alert("Failed to update referral: " + (error?.message || JSON.stringify(error)));
    }
  };

  const handleAcceptReferral = (id: string) => {
    console.log("Accept referral:", id);
  };

  const handleApproveRerefer = (id: string) => {
    setRereferToApprove(id);
    setIsApproveRereferOpen(true);
  };

  const confirmApproveRerefer = async () => {
    if (!rereferToApprove) return;
    try {
      await approveRereferRequest(rereferToApprove);
      setIsApproveRereferOpen(false);
      setRereferToApprove(null);
      loadData();
      sendSystemNotification("✅ Rerefer Approved", "The rereferral request has been approved.");
    } catch (error) {
      console.error("Error approving rerefer request:", error);
    }
  };

  const handleDeclineRerefer = (id: string) => {
    setRereferToDecline(id);
    setDeclineReason("");
    setIsDeclineRereferOpen(true);
  };

  const confirmDeclineRerefer = async () => {
    if (!rereferToDecline) return;
    try {
      await declineRereferRequest(rereferToDecline, declineReason.trim() || undefined);
      setIsDeclineRereferOpen(false);
      setRereferToDecline(null);
      setDeclineReason("");
      loadData();
      sendSystemNotification("❌ Rerefer Declined", "The rereferral request has been declined.");
    } catch (error) {
      console.error("Error declining rerefer request:", error);
    }
  };

  const handleApproveReferral = (id: string) => {
    setReferralToApprove(id);
    setIsApproveConfirmOpen(true);
  };

  const confirmApproveReferral = async () => {
    if (!referralToApprove) return;

    try {
      const result = await approveReferral(referralToApprove);
      setIsApproveConfirmOpen(false);
      setReferralToApprove(null);
      await loadData();
    } catch (error) {
      console.error("Error approving referral:", error);
      alert("Failed to approve referral. Please check the console for details.");
    }
  };

  const handleDeclineReferral = (id: string) => {
    setReferralToDecline(id);
    setIsDeclineConfirmOpen(true);
  };

  const confirmDeclineReferral = async () => {
    if (!referralToDecline) return;

    try {
      console.log("Declining referral:", referralToDecline);
      setIsDeclineConfirmOpen(false);
      setReferralToDecline(null);
      loadData();
    } catch (error) {
      console.error("Error declining referral:", error);
    }
  };

  const handleApproveEditRequest = (id: string) => {
    setEditRequestToAction(id);
    setIsApproveEditOpen(true);
  };

  const handleDeclineEditRequest = (id: string) => {
    setEditRequestToAction(id);
    setDeclineReason("");
    setIsDeclineEditOpen(true);
  };

  const confirmApproveEditRequest = async () => {
    if (!editRequestToAction) return;
    try {
      await approveEditRequest(editRequestToAction);
      setIsApproveEditOpen(false);
      setEditRequestToAction(null);
      await loadData();
      sendSystemNotification("✅ Edit Request Approved", "The edit request has been approved.");
    } catch (error) {
      console.error("Error approving edit request:", error);
    }
  };

  const confirmDeclineEditRequest = async () => {
    if (!editRequestToAction) return;
    try {
      await declineEditRequest(editRequestToAction, declineReason.trim() || undefined);
      setIsDeclineEditOpen(false);
      setEditRequestToAction(null);
      setDeclineReason("");
      await loadData();
      sendSystemNotification("❌ Edit Request Declined", "The edit request has been declined.");
    } catch (error) {
      console.error("Error declining edit request:", error);
    }
  };

  const handleApproveDeletion = (id: string) => {
    setDeletionRequestToAction(id);
    setIsApproveDeletionOpen(true);
  };

  const handleDeclineDeletion = (id: string) => {
    setDeletionRequestToAction(id);
    setDeclineReason("");
    setIsDeclineDeletionOpen(true);
  };

  const confirmApproveDeletion = async () => {
    if (!deletionRequestToAction) return;
    try {
      await approveDeletionRequest(deletionRequestToAction);
      setIsApproveDeletionOpen(false);
      setDeletionRequestToAction(null);
      await loadData();
      sendSystemNotification("✅ Deletion Approved", "The deletion request has been approved. The referral has been removed.");
    } catch (error) {
      console.error("Error approving deletion request:", error);
      alert("Failed to approve deletion request.");
    }
  };

  const confirmDeclineDeletion = async () => {
    if (!deletionRequestToAction) return;
    try {
      await declineDeletionRequest(deletionRequestToAction, declineReason.trim() || undefined);
      setIsDeclineDeletionOpen(false);
      setDeletionRequestToAction(null);
      setDeclineReason("");
      await loadData();
      sendSystemNotification("❌ Deletion Declined", "The deletion request has been declined.");
    } catch (error) {
      console.error("Error declining deletion request:", error);
    }
  };

  const statusTabs: ReferralStatus[] = ["ALL", "AVAILABLE", "ONGOING", "COMPLETED", "DEFERRED", "BLACKLISTED"];

  // Count requests from ALL referrals (clinical admin sees everything)
  const rereferralCount = useMemo(() =>
    referrals.filter(ref => ref.rerefer_request_status === "pending" && ref.rerefer_request_reason).length,
    [referrals]
  );
  const editRequestCount = useMemo(() =>
    referrals.filter(ref => ref.edit_request_status === "pending" && ref.edit_request_reason).length,
    [referrals]
  );
  const deletionRequestCount = useMemo(() =>
    referrals.filter(ref => (ref as any).deletion_request_status === "pending").length,
    [referrals]
  );
  const statusRequestCount = useMemo(() =>
    referrals.filter(ref => !!(ref as any).status_change_reason).length,
    [referrals]
  );
  const requestCounts: Record<RequestType, number | undefined> = {
    ALL: undefined,
    REREFERRALS: rereferralCount,
    EDIT_REQUESTS: editRequestCount,
    DELETION_REQUESTS: deletionRequestCount,
    STATUS_REQUESTS: statusRequestCount,
  };

  const handleApproveStatusChange = (id: string, target: string) => {
    setStatusChangeToAction(id);
    setStatusChangeTarget(target);
    setIsApproveStatusChangeOpen(true);
  };

  const handleDeclineStatusChange = (id: string) => {
    setStatusChangeToAction(id);
    setDeclineReason("");
    setIsDeclineStatusChangeOpen(true);
  };

  const confirmApproveStatusChange = async () => {
    if (!statusChangeToAction) return;
    try {
      const { error } = await (supabase.from("referrals") as any)
        .update({ referral_status: statusChangeTarget, status_change_reason: null, status_change_professor_ids: null } as any)
        .eq("id", statusChangeToAction);
      if (error) { alert("Failed to approve: " + error.message); return; }
      setIsApproveStatusChangeOpen(false);
      setStatusChangeToAction(null);
      await loadData();
      sendSystemNotification("✅ Status Change Approved", "The status change has been approved.");
    } catch (error) {
      console.error("Error approving status change:", error);
    }
  };

  const confirmDeclineStatusChange = async () => {
    if (!statusChangeToAction) return;
    try {
      await (supabase.from("referrals") as any)
        .update({ referral_status: "ongoing", status_change_reason: null, status_change_professor_ids: null } as any)
        .eq("id", statusChangeToAction);
      setIsDeclineStatusChangeOpen(false);
      setStatusChangeToAction(null);
      setDeclineReason("");
      await loadData();
      sendSystemNotification("❌ Status Change Declined", "Referral reverted to ongoing.");
    } catch (error) {
      console.error("Error declining status change:", error);
    }
  };

  return (
    <RouteGuard allowedRoles={["clinical_admin"]}>
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

      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Left Sidebar */}
          <div className="space-y-6 animate-enter">
            <ProfileCard />
            <SchedulePlanner />
          </div>

          {/* Main Content - Referrals */}
          <div className="bg-white/60 backdrop-blur-sm rounded shadow-lg border-2 border-gray-300 overflow-hidden animate-enter-delay-1">
            {/* Filter Header */}
            <div className="bg-muted border-b-2 border-gray-300 px-4 sm:px-6 py-5">
              {/* Desktop/Tablet */}
              <div className="hidden lg:flex items-center gap-2">
                {/* All Referrals — doubles as the status filter dropdown */}
                <div ref={statusRef} className="relative">
                  <button
                    type="button"
                    onClick={() => { setRequestType("ALL"); setIsStatusOpen(prev => !prev); }}
                    className={`relative flex items-center gap-2 px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wide transition-all flex-shrink-0 ${
                      requestType === "ALL"
                        ? "bg-secondary text-white shadow"
                        : "bg-white text-gray-700 hover:bg-muted border-2 border-gray-300"
                    }`}
                  >
                    <span>All Referrals</span>
                    {requestType === "ALL" && (
                      <>
                        {activeStatus !== "ALL" && (
                          <span className="bg-white/20 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                            {activeStatus.charAt(0) + activeStatus.slice(1).toLowerCase()}
                          </span>
                        )}
                        <ChevronDown className={`h-3 w-3 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
                      </>
                    )}
                  </button>
                  {requestType === "ALL" && isStatusOpen && (
                    <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                      {statusTabs.map(status => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => { setActiveStatus(status); setIsStatusOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${
                            activeStatus === status
                              ? "bg-secondary text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Requests tab - acts as dropdown filter */}
                <div ref={statusRequestFilterRef} className="relative">
                  <button
                    onClick={() => { setRequestType("STATUS_REQUESTS"); setIsStatusOpen(false); setIsStatusRequestFilterOpen(v => !v); }}
                    className={`relative flex items-center gap-2 px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wide transition-all flex-shrink-0 ${
                      requestType === "STATUS_REQUESTS"
                        ? "bg-secondary text-white shadow"
                        : "bg-white text-gray-700 hover:bg-muted border-2 border-gray-300"
                    }`}
                  >
                    <span>Status Requests</span>
                    {requestType === "STATUS_REQUESTS" && (
                      <>
                        {statusRequestFilter !== "ALL" && (
                          <span className="bg-white/20 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                            {statusRequestFilter === "EDIT" ? "Edit" : statusRequestFilter === "DELETION" ? "Deletion" : statusRequestFilter === "REREFERRAL" ? "Rereferral" : statusRequestFilter === "DEFERRAL" ? "Deferral" : "Blacklisted"}
                          </span>
                        )}
                        <ChevronDown className={`h-3 w-3 transition-transform ${isStatusRequestFilterOpen ? "rotate-180" : ""}`} />
                      </>
                    )}
                    {requestCounts["STATUS_REQUESTS"] !== undefined && requestCounts["STATUS_REQUESTS"]! > 0 && (
                      <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1 shadow border-2 border-white">
                        {requestCounts["STATUS_REQUESTS"]! > 9 ? "9+" : requestCounts["STATUS_REQUESTS"]}
                      </span>
                    )}
                  </button>
                  {requestType === "STATUS_REQUESTS" && isStatusRequestFilterOpen && (
                    <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                      {(["ALL", "REREFERRAL", "EDIT", "DELETION", "DEFERRAL", "BLACKLISTED"] as const).map(f => (
                        <button key={f} type="button" onClick={() => { setStatusRequestFilter(f); setIsStatusRequestFilterOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${statusRequestFilter === f ? "bg-secondary text-white" : "text-gray-700 hover:bg-gray-100"}`}>
                          {f === "ALL" ? "All Types" : f === "REREFERRAL" ? "Rereferral" : f === "EDIT" ? "Edit" : f === "DELETION" ? "Deletion" : f === "DEFERRAL" ? "Deferral" : "Blacklisted"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* My Section dropdown */}
                {adminSection && (
                  <div ref={sectionDropdownRef} className="relative ml-auto">
                    <button
                      type="button"
                      onClick={() => { setShowMySection(true); setSectionDropdownOpen(prev => !prev); }}
                      className={`flex items-center gap-2 px-4 h-[38px] rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all border-2 whitespace-nowrap ${
                        showMySection
                          ? "bg-accent text-white border-accent shadow"
                          : "bg-white text-gray-700 border-gray-300 hover:border-accent hover:text-accent"
                      }`}
                    >
                      <span>{showMySection && sectionFilterMode !== "ALL" ? (sectionFilterMode === "ORIGIN" ? "Origin" : "Destination") : "My Section"}</span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${sectionDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    {sectionDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                        {(["ALL", "ORIGIN", "DESTINATION"] as const).map(mode => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => {
                              setShowMySection(true);
                              setSectionFilterMode(mode);
                              setSectionDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${
                              showMySection && sectionFilterMode === mode
                                ? "bg-accent text-white"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {mode === "ALL" ? "All" : mode === "ORIGIN" ? "Origin" : "Destination"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile */}
              <div className="lg:hidden">
                <div className="grid grid-cols-2 gap-2">
                  {/* All Referrals with status dropdown */}
                  <div ref={statusRefMobile} className="relative">
                    <button
                      type="button"
                      onClick={() => { setRequestType("ALL"); setIsStatusOpen(prev => !prev); }}
                      className={`relative w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded text-[10px] font-bold uppercase tracking-wide transition-all ${
                        requestType === "ALL"
                          ? "bg-secondary text-white shadow"
                          : "bg-white text-gray-700 hover:bg-muted border-2 border-gray-300"
                      }`}
                    >
                      <span>All Referrals</span>
                      {requestType === "ALL" && (
                        <>
                          {activeStatus !== "ALL" && (
                            <span className="bg-white/20 text-[8px] px-1 py-0.5 rounded font-bold">
                              {activeStatus.charAt(0) + activeStatus.slice(1).toLowerCase()}
                            </span>
                          )}
                          <ChevronDown className={`h-3 w-3 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
                        </>
                      )}
                    </button>
                    {requestType === "ALL" && isStatusOpen && (
                      <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                        {statusTabs.map(status => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => { setActiveStatus(status); setIsStatusOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${
                              activeStatus === status
                                ? "bg-secondary text-white"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status Requests tab - dropdown filter (mobile) */}
                  <div className="relative">
                    <button
                      onClick={() => { setRequestType("STATUS_REQUESTS"); setIsStatusOpen(false); setIsStatusRequestFilterOpen(v => !v); }}
                      className={`relative flex items-center gap-1.5 px-3 py-2.5 rounded text-[10px] font-bold uppercase tracking-wide transition-all ${
                        requestType === "STATUS_REQUESTS"
                          ? "bg-secondary text-white shadow"
                          : "bg-white text-gray-700 hover:bg-muted border-2 border-gray-300"
                      }`}
                    >
                      <span>Status Requests</span>
                      {requestType === "STATUS_REQUESTS" && (
                        <>
                          {statusRequestFilter !== "ALL" && (
                            <span className="bg-white/20 text-white text-[8px] px-1 py-0.5 rounded font-bold">
                              {statusRequestFilter === "EDIT" ? "Edit" : statusRequestFilter === "DELETION" ? "Deletion" : statusRequestFilter === "REREFERRAL" ? "Rereferral" : statusRequestFilter === "DEFERRAL" ? "Deferral" : "Blacklisted"}
                            </span>
                          )}
                          <ChevronDown className={`h-3 w-3 transition-transform ${isStatusRequestFilterOpen ? "rotate-180" : ""}`} />
                        </>
                      )}
                      {requestCounts["STATUS_REQUESTS"] !== undefined && requestCounts["STATUS_REQUESTS"]! > 0 && (
                        <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1 shadow border-2 border-white">
                          {requestCounts["STATUS_REQUESTS"]! > 9 ? "9+" : requestCounts["STATUS_REQUESTS"]}
                        </span>
                      )}
                    </button>
                    {requestType === "STATUS_REQUESTS" && isStatusRequestFilterOpen && (
                      <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                        {(["ALL", "REREFERRAL", "EDIT", "DELETION", "DEFERRAL", "BLACKLISTED"] as const).map(f => (
                          <button key={f} type="button" onClick={() => { setStatusRequestFilter(f); setIsStatusRequestFilterOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-[10px] font-semibold transition-colors ${statusRequestFilter === f ? "bg-secondary text-white" : "text-gray-700 hover:bg-gray-100"}`}>
                            {f === "ALL" ? "All Types" : f === "REREFERRAL" ? "Rereferral" : f === "EDIT" ? "Edit" : f === "DELETION" ? "Deletion" : f === "DEFERRAL" ? "Deferral" : "Blacklisted"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Keep old tabs hidden but functional for internal routing */}
                  {(["REREFERRALS", "EDIT_REQUESTS", "DELETION_REQUESTS"] as RequestType[]).map(type => (
                    <button key={type} style={{display:"none"}}
                      onClick={() => { setRequestType(type); setIsStatusOpen(false); }}
                    >
                      {type === "REREFERRALS" ? "Rereferrals" : type === "EDIT_REQUESTS" ? "Edit Requests" : "Deletion Requests"}
                    </button>
                  ))}
                </div>

                {/* My Section dropdown — mobile */}
                {adminSection && (
                  <div ref={sectionDropdownMobileRef} className="relative w-full mt-2">
                    <button
                      type="button"
                      onClick={() => { setShowMySection(true); setSectionDropdownOpen(prev => !prev); }}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded text-[10px] font-bold uppercase tracking-wide transition-all border-2 ${
                        showMySection
                          ? "bg-accent text-white border-accent shadow"
                          : "bg-white text-gray-700 border-gray-300 hover:border-accent hover:text-accent"
                      }`}
                    >
                      <span>{showMySection && sectionFilterMode !== "ALL" ? (sectionFilterMode === "ORIGIN" ? "Origin" : "Destination") : "My Section"}</span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${sectionDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    {sectionDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                        {(["ALL", "ORIGIN", "DESTINATION"] as const).map(mode => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => { setShowMySection(true); setSectionFilterMode(mode); setSectionDropdownOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${
                              showMySection && sectionFilterMode === mode
                                ? "bg-accent text-white"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {mode === "ALL" ? "All" : mode === "ORIGIN" ? "Origin" : "Destination"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Referrals List */}
            <div className="p-6 space-y-3 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading referrals...</div>
              ) : requestType === "EDIT_REQUESTS" ? (
                /* ── Edit Requests Table View ── */
                <div className="rounded-lg border-2 border-[#87c4d8]/50 shadow overflow-visible">
                  <table className="w-full text-xs table-fixed">
                    <thead>
                      <tr className="bg-secondary text-white">
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wide w-[10%] rounded-tl-lg">Chart No.</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wide w-[14%]">Treatment Service</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wide w-[10%]">Special Case</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wide w-[13%]">Requested By</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wide w-[27%]">Edit Request Reason</th>
                        <th className="px-4 py-3 text-center font-bold uppercase tracking-wide w-[20%]">Actions</th>
                        <th className="px-4 py-3 text-center font-bold uppercase tracking-wide w-[6%] rounded-tr-lg"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReferrals.length > 0 ? (
                        filteredReferrals.map((referral, idx) => (
                          <tr
                            key={referral.id}
                            className={`border-b border-[#87c4d8]/30 hover:bg-[#87c4d8]/10 transition-colors ${
                              idx % 2 === 0 ? "bg-white" : "bg-[#87c4d8]/5"
                            }`}
                          >
                            <td className="px-4 py-3 font-semibold text-secondary break-words">{referral.chart_number}</td>
                            <td className="px-4 py-3 text-gray-700 break-words">{referral.treatment_service_destination || "—"}</td>
                            <td className="px-4 py-3">
                              {referral.special_case ? (
                                <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                  {referral.special_case}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 overflow-visible relative">
                              {userNames[referral.user_id] ? (
                                <UserProfilePopover userId={referral.user_id} displayName={userNames[referral.user_id]} />
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="bg-amber-50 border-l-4 border-amber-500 px-3 py-2 rounded text-gray-700 break-words overflow-hidden">
                                {referral.edit_request_reason}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleApproveEditRequest(referral.id)}
                                  className="px-3 py-1.5 bg-success text-white text-[10px] font-bold rounded hover:bg-success/90 transition-colors uppercase tracking-wide shadow"
                                >
                                  APPROVE
                                </button>
                                <button
                                  onClick={() => handleDeclineEditRequest(referral.id)}
                                  className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700 transition-colors uppercase tracking-wide shadow"
                                >
                                  DECLINE
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1.5 rounded hover:bg-gray-200 transition-colors">
                                    <MoreHorizontal className="h-4 w-4 text-gray-500" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white border-2 border-gray-300 shadow-lg rounded">
                                  <DropdownMenuItem onClick={() => setSelectedReferralForDetails(referral)}>View Details</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No pending edit requests</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : requestType === "DELETION_REQUESTS" ? (
                /* ── Deletion Requests Table View ── */
                <div className="rounded-lg border-2 border-[#87c4d8]/50 shadow overflow-visible">
                  <table className="w-full text-xs table-fixed">
                    <thead>
                      <tr className="bg-secondary text-white">
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wide w-[10%] rounded-tl-lg">Chart No.</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wide w-[14%]">Treatment Service</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wide w-[10%]">Special Case</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wide w-[13%]">Requested By</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wide w-[27%]">Deletion Reason</th>
                        <th className="px-4 py-3 text-center font-bold uppercase tracking-wide w-[20%]">Actions</th>
                        <th className="px-4 py-3 text-center font-bold uppercase tracking-wide w-[6%] rounded-tr-lg"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReferrals.length > 0 ? (
                        filteredReferrals.map((referral, idx) => (
                          <tr
                            key={referral.id}
                            className={`border-b border-[#87c4d8]/30 hover:bg-[#87c4d8]/10 transition-colors ${
                              idx % 2 === 0 ? "bg-white" : "bg-[#87c4d8]/5"
                            }`}
                          >
                            <td className="px-4 py-3 font-semibold text-secondary break-words">{referral.chart_number}</td>
                            <td className="px-4 py-3 text-gray-700 break-words">{referral.treatment_service_destination || "—"}</td>
                            <td className="px-4 py-3">
                              {referral.special_case ? (
                                <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                  {referral.special_case}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 overflow-visible relative">
                              {referral.deletion_requested_by && userNames[referral.deletion_requested_by] ? (
                                <UserProfilePopover userId={referral.deletion_requested_by} displayName={userNames[referral.deletion_requested_by]} />
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="bg-red-50 border-l-4 border-red-500 px-3 py-2 rounded text-gray-700 break-words overflow-hidden">
                                {referral.deletion_request_reason}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleApproveDeletion(referral.id)}
                                  className="px-3 py-1.5 bg-success text-white text-[10px] font-bold rounded hover:bg-success/90 transition-colors uppercase tracking-wide shadow"
                                >
                                  APPROVE
                                </button>
                                <button
                                  onClick={() => handleDeclineDeletion(referral.id)}
                                  className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700 transition-colors uppercase tracking-wide shadow"
                                >
                                  DECLINE
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1.5 rounded hover:bg-gray-200 transition-colors">
                                    <MoreHorizontal className="h-4 w-4 text-gray-500" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white border-2 border-gray-300 shadow-lg rounded">
                                  <DropdownMenuItem onClick={() => setSelectedReferralForDetails(referral)}>View Details</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No pending deletion requests</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : requestType === "REREFERRALS" ? (
                /* ── Rereferrals Table View ── */
                <div className="rounded-lg border-2 border-[#87c4d8]/50 shadow overflow-visible">
                  <table className="w-full text-xs table-fixed">
                    <thead>
                      <tr className="bg-secondary text-white">
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wide w-[10%] rounded-tl-lg">Chart No.</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wide w-[14%]">Treatment Service</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wide w-[10%]">Special Case</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wide w-[13%]">Requested By</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wide w-[27%]">Rerefer Reason</th>
                        <th className="px-4 py-3 text-center font-bold uppercase tracking-wide w-[20%]">Actions</th>
                        <th className="px-4 py-3 text-center font-bold uppercase tracking-wide w-[6%] rounded-tr-lg"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReferrals.length > 0 ? (
                        filteredReferrals.map((referral, idx) => (
                          <tr
                            key={referral.id}
                            className={`border-b border-[#87c4d8]/30 hover:bg-[#87c4d8]/10 transition-colors ${
                              idx % 2 === 0 ? "bg-white" : "bg-[#87c4d8]/5"
                            }`}
                          >
                            <td className="px-4 py-3 font-semibold text-secondary break-words">{referral.chart_number}</td>
                            <td className="px-4 py-3 text-gray-700 break-words">{referral.treatment_service_destination || "—"}</td>
                            <td className="px-4 py-3">
                              {referral.special_case ? (
                                <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                  {referral.special_case}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 overflow-visible relative">
                              {referral.rerefer_requested_by && userNames[referral.rerefer_requested_by] ? (
                                <UserProfilePopover userId={referral.rerefer_requested_by} displayName={userNames[referral.rerefer_requested_by]} />
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="bg-amber-50 border-l-4 border-amber-500 px-3 py-2 rounded text-gray-700 break-words overflow-hidden">
                                {referral.rerefer_request_reason}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleApproveRerefer(referral.id)}
                                  className="px-3 py-1.5 bg-success text-white text-[10px] font-bold rounded hover:bg-success/90 transition-colors uppercase tracking-wide shadow"
                                >
                                  APPROVE
                                </button>
                                <button
                                  onClick={() => handleDeclineRerefer(referral.id)}
                                  className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700 transition-colors uppercase tracking-wide shadow"
                                >
                                  DECLINE
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1.5 rounded hover:bg-gray-200 transition-colors">
                                    <MoreHorizontal className="h-4 w-4 text-gray-500" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white border-2 border-gray-300 shadow-lg rounded">
                                  <DropdownMenuItem onClick={() => setSelectedReferralForDetails(referral)}>View Details</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No pending rereferral requests</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : requestType === "STATUS_REQUESTS" ? (
                /* ── Unified Status Requests View ── */
                <div>
                  {filteredReferrals.length === 0 ? (
                    <div className="rounded-lg border-2 border-[#87c4d8]/50 bg-white shadow px-4 py-8 text-center text-muted-foreground text-sm">No pending requests</div>
                  ) : (
                    <>
                      {/* ── Desktop Table (lg+) ── */}
                      <div className="hidden lg:block rounded-lg border-2 border-[#87c4d8]/50 shadow overflow-visible">
                        <table className="w-full text-xs table-fixed">
                          <thead>
                            <tr className="bg-secondary text-white">
                              <th className="px-3 py-3 text-left font-bold uppercase tracking-wide w-[12%] rounded-tl-lg">Request Type</th>
                              <th className="px-3 py-3 text-left font-bold uppercase tracking-wide w-[10%]">Chart No.</th>
                              <th className="px-3 py-3 text-left font-bold uppercase tracking-wide w-[20%]">Treatment</th>
                              <th className="px-3 py-3 text-left font-bold uppercase tracking-wide w-[10%]">Special</th>
                              <th className="px-3 py-3 text-left font-bold uppercase tracking-wide w-[14%]">Requested By</th>
                              <th className="px-3 py-3 text-left font-bold uppercase tracking-wide w-[28%]">Reason</th>
                              <th className="px-3 py-3 text-center font-bold uppercase tracking-wide w-[6%] rounded-tr-lg"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredReferrals.map((referral, idx) => {
                              const isRerefer = referral.rerefer_request_status === "pending" && !!referral.rerefer_request_reason;
                              const isEdit = referral.edit_request_status === "pending" && !!referral.edit_request_reason;
                              const isDeletion = referral.deletion_request_status === "pending" && !!referral.deletion_request_reason;
                              const isStatusChange = !!(referral as any).status_change_reason;
                              const rawStatusChangeReason: string = (referral as any).status_change_reason || "";
                              const statusChangeParts = rawStatusChangeReason.includes("::") ? rawStatusChangeReason.split("::") : ["deferred", rawStatusChangeReason];
                              const statusChangeTargetVal = statusChangeParts[0];
                              const statusChangeReasonClean = statusChangeParts.slice(1).join("::");
                              const reqType = isRerefer ? "Rereferral" : isEdit ? "Edit Request" : isDeletion ? "Deletion" : isStatusChange ? (statusChangeTargetVal === "deferred" ? "Deferral" : "Blacklist") : "Unknown";
                              const reqColor = isRerefer ? "bg-purple-100 text-purple-700" : isEdit ? "bg-amber-100 text-amber-700" : isDeletion ? "bg-red-100 text-red-700" : statusChangeTargetVal === "blacklisted" ? "bg-gray-800 text-white" : "bg-red-100 text-red-700";
                              const reason = isRerefer ? referral.rerefer_request_reason : isEdit ? referral.edit_request_reason : isDeletion ? referral.deletion_request_reason : statusChangeReasonClean;
                              const reasonColor = isRerefer ? "bg-purple-50 border-purple-400" : isEdit ? "bg-amber-50 border-amber-500" : isDeletion ? "bg-red-50 border-red-500" : "bg-orange-50 border-orange-500";
                              const requesterId = isRerefer ? referral.rerefer_requested_by : isDeletion ? referral.deletion_requested_by : referral.accepted_by_user_id;
                              return (
                                <tr key={`${referral.id}-${reqType}`} className={`border-b border-[#87c4d8]/30 hover:bg-[#87c4d8]/10 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-[#87c4d8]/5"}`}>
                                  <td className="px-3 py-3"><span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${reqColor}`}>{reqType}</span></td>
                                  <td className="px-3 py-3 font-semibold text-secondary break-words">{referral.chart_number}</td>
                                  <td className="px-3 py-3 text-gray-700 break-words">{referral.treatment_service_destination || "—"}</td>
                                  <td className="px-3 py-3">{referral.special_case ? <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">{referral.special_case}</span> : <span className="text-gray-400">—</span>}</td>
                                  <td className="px-3 py-3 overflow-visible relative">
                                    {requesterId && userNames[requesterId] ? <UserProfilePopover userId={requesterId} displayName={userNames[requesterId]} /> : <span className="text-gray-400">{referral.accepted_by || "—"}</span>}
                                  </td>
                                  <td className="px-3 py-3"><div className={`border-l-4 px-2 py-1.5 rounded text-gray-700 break-words overflow-hidden ${reasonColor}`}>{reason || "—"}</div></td>
                                  <td className="px-3 py-3 text-center">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild><button className="p-1.5 rounded hover:bg-gray-200 transition-colors"><MoreHorizontal className="h-4 w-4 text-gray-500" /></button></DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="bg-white border-2 border-gray-300 shadow-lg rounded">
                                        <DropdownMenuItem onClick={() => setSelectedReferralForDetails(referral)}>View Details</DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* ── Mobile Cards (< lg) ── */}
                      <div className="lg:hidden space-y-3">
                        {filteredReferrals.map((referral) => {
                          const isRerefer = referral.rerefer_request_status === "pending" && !!referral.rerefer_request_reason;
                          const isEdit = referral.edit_request_status === "pending" && !!referral.edit_request_reason;
                          const isDeletion = referral.deletion_request_status === "pending" && !!referral.deletion_request_reason;
                          const isStatusChange = !!(referral as any).status_change_reason;
                          const rawStatusChangeReason: string = (referral as any).status_change_reason || "";
                          const statusChangeParts = rawStatusChangeReason.includes("::") ? rawStatusChangeReason.split("::") : ["deferred", rawStatusChangeReason];
                          const statusChangeTargetVal = statusChangeParts[0];
                          const statusChangeReasonClean = statusChangeParts.slice(1).join("::");
                          const reqType = isRerefer ? "Rereferral" : isEdit ? "Edit Request" : isDeletion ? "Deletion" : isStatusChange ? (statusChangeTargetVal === "deferred" ? "Deferral" : "Blacklist") : "Unknown";
                          const reqColor = isRerefer ? "bg-purple-100 text-purple-700" : isEdit ? "bg-amber-100 text-amber-700" : isDeletion ? "bg-red-100 text-red-700" : statusChangeTargetVal === "blacklisted" ? "bg-gray-800 text-white" : "bg-red-100 text-red-700";
                          const reason = isRerefer ? referral.rerefer_request_reason : isEdit ? referral.edit_request_reason : isDeletion ? referral.deletion_request_reason : statusChangeReasonClean;
                          const reasonColor = isRerefer ? "bg-purple-50 border-purple-400" : isEdit ? "bg-amber-50 border-amber-500" : isDeletion ? "bg-red-50 border-red-500" : "bg-orange-50 border-orange-500";
                          const requesterId = isRerefer ? referral.rerefer_requested_by : isDeletion ? referral.deletion_requested_by : referral.accepted_by_user_id;
                          return (
                            <div key={`${referral.id}-${reqType}-mobile`} className="bg-white rounded-lg border-2 border-[#87c4d8]/50 shadow p-4 space-y-3">
                              {/* Header row */}
                              <div className="flex items-center justify-between gap-2">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${reqColor}`}>{reqType}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-secondary text-xs">{referral.chart_number}</span>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild><button className="p-1.5 rounded hover:bg-gray-200 transition-colors"><MoreHorizontal className="h-4 w-4 text-gray-500" /></button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-white border-2 border-gray-300 shadow-lg rounded">
                                      <DropdownMenuItem onClick={() => setSelectedReferralForDetails(referral)}>View Details</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                              {/* Details */}
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                                <div>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Treatment</span>
                                  <span className="text-gray-700">{referral.treatment_service_destination || "—"}</span>
                                </div>
                                {referral.special_case && (
                                  <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Special</span>
                                    <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">{referral.special_case}</span>
                                  </div>
                                )}
                                <div className="col-span-2">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Requested By</span>
                                  {requesterId && userNames[requesterId] ? <UserProfilePopover userId={requesterId} displayName={userNames[requesterId]} /> : <span className="text-gray-600">{referral.accepted_by || "—"}</span>}
                                </div>
                              </div>
                              {/* Reason */}
                              <div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Reason</span>
                                <div className={`border-l-4 px-3 py-2 rounded text-xs text-gray-700 ${reasonColor}`}>{reason || "—"}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              ) : searchedReferrals.length > 0 ? (
                /* ── Default Card View ── */
                searchedReferrals.map((referral) => (
                  <ReferralCard
                    key={referral.id}
                    id={referral.id}
                    title={`Referring ${referral.age} yr. old patient for ${referral.treatment_service_destination}${referral.special_case ? ` (${referral.special_case})` : ''}`}
                    createdByName={referral.user_id ? userNames[referral.user_id] : undefined}
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
                    acceptedAt={referral.accepted_at || null}
                    referralStatus={referral.chart_number && blacklistedChartNumbers.has(referral.chart_number) ? "blacklisted" : (referral.referral_status || null)}
                    status={referral.status}
                    showAccept={false}
                    showUpdate={true}
                    showApprove={false}
                    showDecline={false}
                    age={referral.age ?? undefined}
                    sex={referral.sex}
                    userId={referral.user_id}
                    editRequestReason={referral.edit_request_reason}
                    editRequestStatus={referral.edit_request_status}
                    rereferRequestStatus={referral.rerefer_request_status || null}
                    deletionRequestStatus={(referral as any).deletion_request_status || null}
                    isProfessor={true}
                    isAdvisee={true}
                    onUpdate={handleUpdateReferral}
                    onApprove={() => handleApproveReferral(referral.id)}
                    onDecline={() => handleDeclineReferral(referral.id)}
                    onDelete={() => handleDeleteReferral(referral.id)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No referrals found for the selected filter
                </div>
              )}
            </div>

            {/* View Details Modal */}
            {selectedReferralForDetails && (
              <ViewDetailsModal
                referral={selectedReferralForDetails}
                isOpen={!!selectedReferralForDetails}
                onClose={() => setSelectedReferralForDetails(null)}
              />
            )}
          </div>
        </div>
      </main>

      {/* Approve Referral Confirmation Dialog */}
      {isApproveConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsApproveConfirmOpen(false)} />
          <div className="relative bg-white rounded shadow-2xl border-2 border-gray-300 w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2 uppercase tracking-wide">Approve Referral</h3>
              <p className="text-sm text-muted-foreground mb-6">Are you sure you want to approve this referral?</p>
              <div className="flex gap-3">
                <button onClick={confirmApproveReferral} className="flex-1 px-6 py-2 bg-success text-white text-xs font-bold rounded hover:bg-success/90 transition-colors shadow uppercase tracking-wide">YES, APPROVE</button>
                <button onClick={() => setIsApproveConfirmOpen(false)} className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded hover:bg-muted transition-colors uppercase tracking-wide">CANCEL</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decline Referral Confirmation Dialog */}
      {isDeclineConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDeclineConfirmOpen(false)} />
          <div className="relative bg-white rounded shadow-2xl border-2 border-gray-300 w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2 uppercase tracking-wide">Decline Referral</h3>
              <p className="text-sm text-muted-foreground mb-6">Are you sure you want to decline this referral?</p>
              <div className="flex gap-3">
                <button onClick={confirmDeclineReferral} className="flex-1 px-6 py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors shadow uppercase tracking-wide">YES, DECLINE</button>
                <button onClick={() => setIsDeclineConfirmOpen(false)} className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded hover:bg-muted transition-colors uppercase tracking-wide">CANCEL</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Deletion Request Confirmation Dialog */}
      {isApproveDeletionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsApproveDeletionOpen(false)} />
          <div className="relative bg-white rounded shadow-2xl border-2 border-gray-300 w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2 uppercase tracking-wide">Approve Deletion Request</h3>
              <p className="text-sm text-muted-foreground mb-6">Are you sure? The referral will be permanently removed.</p>
              <div className="flex gap-3">
                <button onClick={confirmApproveDeletion} className="flex-1 px-6 py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors shadow uppercase tracking-wide">YES, APPROVE</button>
                <button onClick={() => setIsApproveDeletionOpen(false)} className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded hover:bg-muted transition-colors uppercase tracking-wide">CANCEL</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decline Deletion Request Dialog */}
      <Dialog open={isDeclineDeletionOpen} onOpenChange={(open) => { if (!open) setIsDeclineDeletionOpen(false); }}>
        <DialogContent className="bg-white max-w-md rounded-2xl shadow-2xl p-0 overflow-hidden [&>button:last-child]:hidden">
          <div className="bg-red-600 px-6 py-4">
            <DialogTitle className="text-white font-bold text-sm uppercase tracking-wide">Decline Deletion Request</DialogTitle>
            <p className="text-white/70 text-[10px] mt-0.5">Please provide a reason for declining this deletion request</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-[10px] font-bold text-red-700 uppercase tracking-wide mb-1.5 block">Reason for Decline</label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Enter the reason for declining..."
                className="w-full min-h-[100px] text-xs border-2 border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={confirmDeclineDeletion} disabled={!declineReason.trim()} className="flex-1 px-4 py-2.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed">SUBMIT DECLINE</button>
              <button onClick={() => setIsDeclineDeletionOpen(false)} className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors uppercase tracking-wide">CANCEL</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Edit Request Confirmation Dialog */}
      {isApproveEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsApproveEditOpen(false)} />
          <div className="relative bg-white rounded shadow-2xl border-2 border-gray-300 w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2 uppercase tracking-wide">Approve Edit Request</h3>
              <p className="text-sm text-muted-foreground mb-6">Are you sure? The student will be able to edit the referral.</p>
              <div className="flex gap-3">
                <button onClick={confirmApproveEditRequest} className="flex-1 px-6 py-2 bg-success text-white text-xs font-bold rounded hover:bg-success/90 transition-colors shadow uppercase tracking-wide">YES, APPROVE</button>
                <button onClick={() => setIsApproveEditOpen(false)} className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded hover:bg-muted transition-colors uppercase tracking-wide">CANCEL</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decline Edit Request Dialog */}
      <Dialog open={isDeclineEditOpen} onOpenChange={(open) => { if (!open) setIsDeclineEditOpen(false); }}>
        <DialogContent className="bg-white max-w-md rounded-2xl shadow-2xl p-0 overflow-hidden [&>button:last-child]:hidden">
          <div className="bg-red-600 px-6 py-4">
            <DialogTitle className="text-white font-bold text-sm uppercase tracking-wide">Decline Edit Request</DialogTitle>
            <p className="text-white/70 text-[10px] mt-0.5">Please provide a reason for declining this edit request</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-[10px] font-bold text-red-700 uppercase tracking-wide mb-1.5 block">Reason for Decline</label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Enter the reason for declining..."
                className="w-full min-h-[100px] text-xs border-2 border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={confirmDeclineEditRequest} disabled={!declineReason.trim()} className="flex-1 px-4 py-2.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed">SUBMIT DECLINE</button>
              <button onClick={() => setIsDeclineEditOpen(false)} className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors uppercase tracking-wide">CANCEL</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Rerefer Confirmation Dialog */}
      {isApproveRereferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsApproveRereferOpen(false)} />
          <div className="relative bg-white rounded shadow-2xl border-2 border-gray-300 w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2 uppercase tracking-wide">Approve Rereferral Request</h3>
              <p className="text-sm text-muted-foreground mb-6">Are you sure? The referral will be sent back to the available pool.</p>
              <div className="flex gap-3">
                <button onClick={confirmApproveRerefer} className="flex-1 px-6 py-2 bg-success text-white text-xs font-bold rounded hover:bg-success/90 transition-colors shadow uppercase tracking-wide">YES, APPROVE</button>
                <button onClick={() => setIsApproveRereferOpen(false)} className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded hover:bg-muted transition-colors uppercase tracking-wide">CANCEL</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decline Rerefer Request Dialog */}
      <Dialog open={isDeclineRereferOpen} onOpenChange={(open) => { if (!open) setIsDeclineRereferOpen(false); }}>
        <DialogContent className="bg-white max-w-md rounded-2xl shadow-2xl p-0 overflow-hidden [&>button:last-child]:hidden">
          <div className="bg-red-600 px-6 py-4">
            <DialogTitle className="text-white font-bold text-sm uppercase tracking-wide">Decline Rereferral Request</DialogTitle>
            <p className="text-white/70 text-[10px] mt-0.5">Please provide a reason for declining this rereferral request</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-[10px] font-bold text-red-700 uppercase tracking-wide mb-1.5 block">Reason for Decline</label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Enter the reason for declining..."
                className="w-full min-h-[100px] text-xs border-2 border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={confirmDeclineRerefer} disabled={!declineReason.trim()} className="flex-1 px-4 py-2.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed">SUBMIT DECLINE</button>
              <button onClick={() => setIsDeclineRereferOpen(false)} className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors uppercase tracking-wide">CANCEL</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Status Change Dialog */}
      <Dialog open={isApproveStatusChangeOpen} onOpenChange={(open) => { if (!open) setIsApproveStatusChangeOpen(false); }}>
        <DialogContent className="bg-white max-w-md rounded-2xl shadow-2xl p-0 overflow-hidden [&>button:last-child]:hidden">
          <div className="bg-secondary px-6 py-4">
            <DialogTitle className="text-white font-bold text-sm uppercase tracking-wide">Approve Status Change</DialogTitle>
            <p className="text-white/70 text-[10px] mt-0.5">Confirm the deferral or blacklist status change</p>
          </div>
          <div className="p-6">
            <p className="text-sm text-muted-foreground mb-6">Are you sure you want to approve this status change? The referral will be moved to its new status.</p>
            <div className="flex gap-3">
              <button onClick={confirmApproveStatusChange} className="flex-1 px-6 py-2 bg-success text-white text-xs font-bold rounded hover:bg-success/90 transition-colors shadow uppercase tracking-wide">YES, APPROVE</button>
              <button onClick={() => setIsApproveStatusChangeOpen(false)} className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded hover:bg-muted transition-colors uppercase tracking-wide">CANCEL</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Decline Status Change Dialog */}
      <Dialog open={isDeclineStatusChangeOpen} onOpenChange={(open) => { if (!open) setIsDeclineStatusChangeOpen(false); }}>
        <DialogContent className="bg-white max-w-md rounded-2xl shadow-2xl p-0 overflow-hidden [&>button:last-child]:hidden">
          <div className="bg-red-600 px-6 py-4">
            <DialogTitle className="text-white font-bold text-sm uppercase tracking-wide">Decline Status Change</DialogTitle>
            <p className="text-white/70 text-[10px] mt-0.5">The referral will be reverted to Ongoing</p>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">Declining will revert the referral status back to <strong>Ongoing</strong>.</p>
            <div className="flex gap-3">
              <button onClick={confirmDeclineStatusChange} className="flex-1 px-4 py-2.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors uppercase tracking-wide">YES, DECLINE</button>
              <button onClick={() => setIsDeclineStatusChangeOpen(false)} className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors uppercase tracking-wide">CANCEL</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

        <Footer />
      </div>
    </div>
    </RouteGuard>
  );
}
