"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProfileCard } from "@/components/sidebar/ProfileCard";
import { SchedulePlanner } from "@/components/sidebar/SchedulePlanner";
import { ReferralCard } from "@/components/referrals/ReferralCard";
import { getReferrals, Referral, deleteReferral, approveReferral, approveEditRequest, declineEditRequest, approveRereferRequest, declineRereferRequest, approveDeletionRequest, declineDeletionRequest } from "@/lib/api/referrals";
import { getProfile, getAdvisees, getCurrentUserId } from "@/lib/api/profiles";
import { ViewDetailsModal } from "@/components/modals/ViewDetailsModal";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { UserProfilePopover } from "@/components/ui/UserProfilePopover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ReferralStatus = "ALL" | "PENDING" | "APPROVED" | "DECLINED" | "ONGOING" | "COMPLETED";
type RequestType = "ALL" | "REREFERRALS" | "EDIT_REQUESTS" | "DELETION_REQUESTS";

export default function ProfessorDashboard() {
  const [activeStatus, setActiveStatus] = useState<ReferralStatus>("ALL");
  const [requestType, setRequestType] = useState<RequestType>("ALL");
  const [filterStatus, setFilterStatus] = useState("Active");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [filteredReferrals, setFilteredReferrals] = useState<Referral[]>([]);
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
  const statusRef = useRef<HTMLDivElement>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [adviseeIds, setAdviseeIds] = useState<Set<string>>(new Set());
  const [showOnlyAdvisees, setShowOnlyAdvisees] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setIsStatusOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterReferrals();
  }, [activeStatus, requestType, filterStatus, referrals, adviseeIds, showOnlyAdvisees]);

  const loadData = async () => {
    try {
      // Fetch advisees for this professor
      const professorId = getCurrentUserId();
      const advisees = await getAdvisees(professorId);
      const adviseeIdSet = new Set(advisees.map(a => a.id));
      setAdviseeIds(adviseeIdSet);

      const referralsData = await getReferrals(false); // Bypass cache for fresh data
      setReferrals(referralsData || []);

      // Resolve user names for requesters
      const userIds = new Set<string>();
      referralsData?.forEach((r: Referral) => {
        if (r.user_id) userIds.add(r.user_id);
        if (r.rerefer_requested_by) userIds.add(r.rerefer_requested_by);
        if (r.deletion_requested_by) userIds.add(r.deletion_requested_by);
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

  const filterReferrals = () => {
    let filtered = referrals;

    // For request tabs (rereferrals, edit requests, deletion requests),
    // always restrict to advisees only. For ALL tab, use the toggle.
    // If no advisees configured yet, show all (graceful fallback).
    const isRequestTab = requestType !== "ALL";
    if ((isRequestTab || showOnlyAdvisees) && adviseeIds.size > 0) {
      filtered = filtered.filter(ref => adviseeIds.has(ref.user_id));
    }

    // Filter by status tab
    if (activeStatus !== "ALL") {
      filtered = filtered.filter(ref => {
        const status = ref.status?.toUpperCase() || "PENDING";
        
        // For professor dashboard: PENDING tab should show referrals that have been
        // accepted by students (accepted_by is not "None") and still have pending status
        if (activeStatus === "PENDING") {
          return status === "PENDING" && ref.accepted_by && ref.accepted_by !== "None";
        }
        
        return status === activeStatus;
      });
    }

    // Filter by request type
    if (requestType === "EDIT_REQUESTS") {
      filtered = filtered.filter(ref => ref.edit_request_status === "pending" && ref.edit_request_reason);
    }
    
    if (requestType === "REREFERRALS") {
      filtered = filtered.filter(ref => ref.rerefer_request_status === "pending" && ref.rerefer_request_reason);
    }

    if (requestType === "DELETION_REQUESTS") {
      filtered = filtered.filter(ref => ref.deletion_request_status === "pending" && ref.deletion_request_reason);
    }

    // Filter by active/inactive
    if (filterStatus === "Active") {
      filtered = filtered.filter(ref => {
        const status = ref.status?.toUpperCase() || "PENDING";
        return status !== "COMPLETED" && status !== "DECLINED";
      });
    }

    setFilteredReferrals(filtered);
  };

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

  const handleApproveRerefer = async (id: string) => {
    try {
      await approveRereferRequest(id);
      loadData();
    } catch (error) {
      console.error("Error approving rerefer request:", error);
    }
  };

  const handleDeclineRerefer = async (id: string) => {
    try {
      await declineRereferRequest(id);
      loadData();
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
      console.log("Approving referral with ID:", referralToApprove);
      const result = await approveReferral(referralToApprove);
      console.log("Approval result:", result);
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
      // TODO: Implement decline logic - update referral status to "declined"
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
    setIsDeclineEditOpen(true);
  };

  const confirmApproveEditRequest = async () => {
    if (!editRequestToAction) return;
    try {
      await approveEditRequest(editRequestToAction);
      setIsApproveEditOpen(false);
      setEditRequestToAction(null);
      await loadData();
    } catch (error) {
      console.error("Error approving edit request:", error);
    }
  };

  const confirmDeclineEditRequest = async () => {
    if (!editRequestToAction) return;
    try {
      await declineEditRequest(editRequestToAction);
      setIsDeclineEditOpen(false);
      setEditRequestToAction(null);
      await loadData();
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
    setIsDeclineDeletionOpen(true);
  };

  const confirmApproveDeletion = async () => {
    if (!deletionRequestToAction) return;
    try {
      await approveDeletionRequest(deletionRequestToAction);
      setIsApproveDeletionOpen(false);
      setDeletionRequestToAction(null);
      await loadData();
    } catch (error) {
      console.error("Error approving deletion request:", error);
      alert("Failed to approve deletion request.");
    }
  };

  const confirmDeclineDeletion = async () => {
    if (!deletionRequestToAction) return;
    try {
      await declineDeletionRequest(deletionRequestToAction);
      setIsDeclineDeletionOpen(false);
      setDeletionRequestToAction(null);
      await loadData();
    } catch (error) {
      console.error("Error declining deletion request:", error);
    }
  };

  const statusTabs: ReferralStatus[] = ["ALL", "PENDING", "APPROVED", "DECLINED", "ONGOING", "COMPLETED"];

  // Only count requests from this professor's advisees (fall back to all if no advisees configured)
  const adviseeReferrals = useMemo(() =>
    adviseeIds.size > 0 ? referrals.filter(ref => adviseeIds.has(ref.user_id)) : referrals,
    [referrals, adviseeIds]
  );
  const rereferralCount = useMemo(() =>
    adviseeReferrals.filter(ref => ref.rerefer_request_status === "pending" && ref.rerefer_request_reason).length,
    [adviseeReferrals]
  );
  const editRequestCount = useMemo(() =>
    adviseeReferrals.filter(ref => ref.edit_request_status === "pending" && ref.edit_request_reason).length,
    [adviseeReferrals]
  );
  const deletionRequestCount = useMemo(() =>
    adviseeReferrals.filter(ref => (ref as any).deletion_request_status === "pending").length,
    [adviseeReferrals]
  );
  const requestCounts: Record<RequestType, number | undefined> = {
    ALL: undefined,
    REREFERRALS: rereferralCount,
    EDIT_REQUESTS: editRequestCount,
    DELETION_REQUESTS: deletionRequestCount,
  };

  return (
    <RouteGuard allowedRoles={["professor"]}>
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
        <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Left Sidebar */}
          <div className="space-y-6">
            <ProfileCard />
            <SchedulePlanner />
          </div>

          {/* Main Content - Referrals */}
          <div className="bg-white/60 backdrop-blur-sm rounded shadow-lg border-2 border-gray-300 overflow-hidden">
            {/* Filter Header */}
            <div className="bg-muted border-b-2 border-gray-300 px-6 py-5">
              {/* Row 1: Labels */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-secondary uppercase tracking-wide">Filter by Type</h2>
                <label className="text-base font-bold text-secondary uppercase tracking-wide">Filter by Status</label>
              </div>

              {/* Row 2: Buttons + Dropdown */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2 flex-wrap">
                  {(["ALL", "REREFERRALS", "EDIT_REQUESTS", "DELETION_REQUESTS"] as RequestType[]).map(type => {
                    const count = requestCounts[type];
                    return (
                      <button
                        key={type}
                        onClick={() => setRequestType(type)}
                        className={`relative px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wide transition-all ${
                          requestType === type
                            ? "bg-secondary text-white shadow"
                            : "bg-white text-gray-700 hover:bg-muted border-2 border-gray-300"
                        }`}
                      >
                        {type === "ALL" ? "All Referrals" : type === "REREFERRALS" ? "Rereferrals" : type === "EDIT_REQUESTS" ? "Edit Requests" : "Deletion Requests"}
                        {count !== undefined && count > 0 && (
                          <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1 shadow border-2 border-white">
                            {count > 9 ? "9+" : count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  {/* My Advisees toggle - visible on ALL tab */}
                  {requestType === "ALL" && adviseeIds.size > 0 && (
                    <button
                      onClick={() => setShowOnlyAdvisees(prev => !prev)}
                      className={`px-4 h-[38px] rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all border-2 ${
                        showOnlyAdvisees
                          ? "bg-accent text-white border-accent shadow"
                          : "bg-white text-gray-700 border-gray-300 hover:border-accent hover:text-accent"
                      }`}
                    >
                      My Advisees
                    </button>
                  )}

                <div ref={statusRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsStatusOpen(prev => !prev)}
                    className="flex items-center gap-2 px-4 h-[38px] border-2 border-gray-300 rounded-lg text-[11px] font-bold text-secondary bg-blue-50 hover:bg-secondary hover:text-white transition-colors cursor-pointer uppercase tracking-wide"
                  >
                    <span className="whitespace-nowrap">{activeStatus}</span>
                    <ChevronDown className={`h-3 w-3 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isStatusOpen && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
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
                </div>
              </div>
            </div>

            {/* Referrals List */}
            <div className="p-6 space-y-3 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading referrals...</div>
              ) : filteredReferrals.length > 0 ? (
                requestType === "EDIT_REQUESTS" ? (
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
                        {filteredReferrals.map((referral, idx) => (
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
                        ))}
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
                        {filteredReferrals.map((referral, idx) => (
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
                        ))}
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
                        {filteredReferrals.map((referral, idx) => (
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* ── Default Card View ── */
                  filteredReferrals.map((referral) => (
                    <ReferralCard
                      key={referral.id}
                      id={referral.id}
                      title={`Referring ${referral.age} yr. old patient for ${referral.treatment_service_destination}${referral.special_case ? ` (${referral.special_case})` : ''}`}
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
                      referralStatus={referral.referral_status || null}
                      status={referral.status}
                      showAccept={false}
                      showUpdate={true}
                      showApprove={activeStatus === "PENDING"}
                      showDecline={activeStatus === "PENDING"}
                      userId={referral.user_id}
                      editRequestReason={referral.edit_request_reason}
                      editRequestStatus={referral.edit_request_status}
                      rereferRequestStatus={referral.rerefer_request_status || null}
                      deletionRequestStatus={(referral as any).deletion_request_status || null}
                      isProfessor={true}
                      isAdvisee={adviseeIds.size === 0 || adviseeIds.has(referral.user_id)}
                      onUpdate={handleUpdateReferral}
                      onApprove={() => handleApproveReferral(referral.id)}
                      onDecline={() => handleDeclineReferral(referral.id)}
                      onDelete={() => handleDeleteReferral(referral.id)}
                    />
                  ))
                )
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No referrals found for the selected filter
                </div>
              )}
            </div>

            {/* View Details Modal for Edit Requests Table */}
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
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsApproveConfirmOpen(false)}
          />

          {/* Confirmation Modal */}
          <div className="relative bg-white rounded shadow-2xl border-2 border-gray-300 w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2 uppercase tracking-wide">Approve Referral</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to approve this referral?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmApproveReferral}
                  className="flex-1 px-6 py-2 bg-success text-white text-xs font-bold rounded hover:bg-success/90 transition-colors shadow uppercase tracking-wide"
                >
                  YES, APPROVE
                </button>
                <button
                  onClick={() => setIsApproveConfirmOpen(false)}
                  className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded hover:bg-muted transition-colors uppercase tracking-wide"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decline Referral Confirmation Dialog */}
      {isDeclineConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsDeclineConfirmOpen(false)}
          />

          {/* Confirmation Modal */}
          <div className="relative bg-white rounded shadow-2xl border-2 border-gray-300 w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2 uppercase tracking-wide">Decline Referral</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to decline this referral?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmDeclineReferral}
                  className="flex-1 px-6 py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors shadow uppercase tracking-wide"
                >
                  YES, DECLINE
                </button>
                <button
                  onClick={() => setIsDeclineConfirmOpen(false)}
                  className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded hover:bg-muted transition-colors uppercase tracking-wide"
                >
                  CANCEL
                </button>
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
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to approve this deletion request? The referral will be permanently removed from the system.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmApproveDeletion}
                  className="flex-1 px-6 py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors shadow uppercase tracking-wide"
                >
                  YES, APPROVE
                </button>
                <button
                  onClick={() => setIsApproveDeletionOpen(false)}
                  className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded hover:bg-muted transition-colors uppercase tracking-wide"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decline Deletion Request Confirmation Dialog */}
      {isDeclineDeletionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDeclineDeletionOpen(false)} />
          <div className="relative bg-white rounded shadow-2xl border-2 border-gray-300 w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
                <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2 uppercase tracking-wide">Decline Deletion Request</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to decline this deletion request? The referral will remain in the system.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmDeclineDeletion}
                  className="flex-1 px-6 py-2 bg-secondary text-white text-xs font-bold rounded hover:bg-secondary/90 transition-colors shadow uppercase tracking-wide"
                >
                  YES, DECLINE
                </button>
                <button
                  onClick={() => setIsDeclineDeletionOpen(false)}
                  className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded hover:bg-muted transition-colors uppercase tracking-wide"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Edit Request Confirmation Dialog */}
      {isApproveEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsApproveEditOpen(false)}
          />
          <div className="relative bg-white rounded shadow-2xl border-2 border-gray-300 w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2 uppercase tracking-wide">Approve Edit Request</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to approve this edit request? The student will be able to edit the referral.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmApproveEditRequest}
                  className="flex-1 px-6 py-2 bg-success text-white text-xs font-bold rounded hover:bg-success/90 transition-colors shadow uppercase tracking-wide"
                >
                  YES, APPROVE
                </button>
                <button
                  onClick={() => setIsApproveEditOpen(false)}
                  className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded hover:bg-muted transition-colors uppercase tracking-wide"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decline Edit Request Confirmation Dialog */}
      {isDeclineEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsDeclineEditOpen(false)}
          />
          <div className="relative bg-white rounded shadow-2xl border-2 border-gray-300 w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2 uppercase tracking-wide">Decline Edit Request</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to decline this edit request? The student will not be able to edit the referral.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmDeclineEditRequest}
                  className="flex-1 px-6 py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors shadow uppercase tracking-wide"
                >
                  YES, DECLINE
                </button>
                <button
                  onClick={() => setIsDeclineEditOpen(false)}
                  className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded hover:bg-muted transition-colors uppercase tracking-wide"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        <Footer />
      </div>
    </div>
    </RouteGuard>
  );
}
