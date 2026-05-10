"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { MoreHorizontal, ChevronDown } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProfileCard } from "@/components/sidebar/ProfileCard";
import { SchedulePlanner } from "@/components/sidebar/SchedulePlanner";
import { getReferrals, Referral, updateReferral, cancelDeletionRequest, submitDeletionRequest, submitEditRequest } from "@/lib/api/referrals";
import { getCurrentUserId, getProfile } from "@/lib/api/profiles";
import { supabase } from "@/lib/supabase";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { ViewDetailsModal } from "@/components/modals/ViewDetailsModal";

type RequestFilter = "ALL" | "EDIT" | "DELETION" | "DEFERRAL" | "BLACKLISTED";

const STATUS_BADGE: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-700 border border-yellow-400",
  approved: "bg-green-100 text-green-700 border border-green-400",
  declined: "bg-red-100 text-red-700 border border-red-400",
};

export default function RequestStatusPage() {
  const [referrals, setReferrals]   = useState<Referral[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<RequestFilter>("ALL");
  const [searchQuery, setSearchQuery]       = useState("");
  const [searchCategory, setSearchCategory] = useState("medical_alert");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [confirmAction, setConfirmAction] = useState<{ label: string; description: string; onConfirm: () => Promise<void> } | null>(null);
  const [resubmitDialog, setResubmitDialog] = useState<{ label: string; referralId: string; type: "Edit" | "Deletion"; oldReason: string } | null>(null);
  const [resubmitReason, setResubmitReason] = useState("");
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setIsFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleHeaderSearch = useCallback((query: string, category: string) => {
    setSearchQuery(query);
    setSearchCategory(category);
  }, []);

  const loadReferrals = useCallback(async () => {
    try {
      const data = await getReferrals(false);
      setReferrals(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReferrals(); }, [loadReferrals]);

  const currentUserId = getCurrentUserId();

  useEffect(() => {
    const professorIds = new Set<string>();
    referrals.forEach(r => {
      (r.edit_request_professor_ids || []).forEach((id: string) => professorIds.add(id));
      ((r as any).deletion_request_professor_ids || []).forEach((id: string) => professorIds.add(id));
      ((r as any).status_change_professor_ids || []).forEach((id: string) => professorIds.add(id));
    });
    if (professorIds.size === 0) return;
    Promise.all(
      [...professorIds].map(id => getProfile(id).then(p => p ? [id, `${p.first_name} ${p.last_name}`] : null))
    ).then(results => {
      const map: Record<string, string> = {};
      results.forEach(r => { if (r) map[r[0]] = r[1]; });
      setUserNames(map);
    });
  }, [referrals]);

  const cancelEditRequest = useCallback(async (id: string) => {
    await updateReferral(id, { edit_request_reason: null, edit_request_status: null } as any);
    await loadReferrals();
  }, [loadReferrals]);

  const cancelStatusChangeRequest = useCallback(async (id: string) => {
    await (supabase.from("referrals") as any)
      .update({ status_change_reason: null, status_change_professor_ids: null } as any)
      .eq("id", id);
    await loadReferrals();
  }, [loadReferrals]);

  const confirmResubmit = useCallback(async () => {
    if (!resubmitDialog || !resubmitReason.trim()) return;
    if (resubmitDialog.type === "Edit") {
      await submitEditRequest(resubmitDialog.referralId, resubmitReason.trim());
    } else {
      await submitDeletionRequest(resubmitDialog.referralId, resubmitReason.trim());
    }
    setResubmitDialog(null);
    setResubmitReason("");
    await loadReferrals();
  }, [resubmitDialog, resubmitReason, loadReferrals]);

  const rows = useMemo(() => {
    const result: {
      referral: Referral;
      reqType: "Edit" | "Deletion" | "Deferral" | "Blacklisted";
      reason: string;
      declineReason: string | null;
      reqStatus: string;
      professorIds: string[];
    }[] = [];

    referrals.forEach(r => {
      const isCreator  = r.user_id === currentUserId;
      const isAcceptor = (r as any).accepted_by_user_id === currentUserId;

      if (isCreator) {
        if (r.edit_request_status && r.edit_request_reason) {
          result.push({ referral: r, reqType: "Edit", reason: r.edit_request_reason, declineReason: r.edit_request_decline_reason || null, reqStatus: r.edit_request_status, professorIds: r.edit_request_professor_ids || [] });
        }
        if ((r as any).deletion_request_status && (r as any).deletion_request_reason) {
          result.push({ referral: r, reqType: "Deletion", reason: (r as any).deletion_request_reason, declineReason: (r as any).deletion_request_decline_reason || null, reqStatus: (r as any).deletion_request_status, professorIds: (r as any).deletion_request_professor_ids || [] });
        }
      }

      if (isAcceptor) {
        const rawSCR: string = (r as any).status_change_reason || "";
        if (rawSCR) {
          // Pending deferral/blacklist request (not yet approved)
          const parts = rawSCR.includes("::") ? rawSCR.split("::") : ["deferred", rawSCR];
          const target = parts[0];
          const cleanReason = parts.slice(1).join("::");
          if (target === "deferred") {
            result.push({ referral: r, reqType: "Deferral", reason: cleanReason, declineReason: null, reqStatus: "pending", professorIds: (r as any).status_change_professor_ids || [] });
          } else if (target === "blacklisted") {
            result.push({ referral: r, reqType: "Blacklisted", reason: cleanReason, declineReason: null, reqStatus: "pending", professorIds: (r as any).status_change_professor_ids || [] });
          }
        }
      }
    });

    return result.sort((a, b) => new Date(b.referral.created_at).getTime() - new Date(a.referral.created_at).getTime());
  }, [referrals, currentUserId]);

  const filtered = useMemo(() => {
    let list = rows;
    if (filter !== "ALL") {
      const map: Record<RequestFilter, string> = { ALL: "", EDIT: "Edit", DELETION: "Deletion", DEFERRAL: "Deferral", BLACKLISTED: "Blacklisted" };
      list = list.filter(row => row.reqType === map[filter]);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(row => {
        const r = row.referral;
        switch (searchCategory) {
          case "medical_alert":  return r.medical_alert?.toLowerCase().includes(q);
          case "origin":         return r.clinical_section_origin?.toLowerCase().includes(q) || r.treatment_service_origin?.toLowerCase().includes(q);
          case "destination":    return r.clinical_section_destination?.toLowerCase().includes(q) || r.treatment_service_destination?.toLowerCase().includes(q);
          case "created_by":     return r.chart_number?.toLowerCase().includes(q);
          default: return true;
        }
      });
    }
    return list;
  }, [rows, filter, searchQuery, searchCategory]);

  const askConfirm = (label: string, description: string, onConfirm: () => Promise<void>) => {
    setConfirmAction({ label, description, onConfirm });
  };

  const TYPE_STYLE: Record<string, string> = {
    Edit:        "bg-amber-100 text-amber-700 border border-amber-400",
    Deletion:    "bg-red-100 text-red-700 border border-red-400",
    Deferral:    "bg-orange-100 text-orange-700 border border-orange-400",
    Blacklisted: "bg-gray-800 text-white",
  };

  const FILTER_TABS: { label: string; value: RequestFilter }[] = [
    { label: "All",        value: "ALL"        },
    { label: "Edit",       value: "EDIT"       },
    { label: "Deletion",   value: "DELETION"   },
    { label: "Deferral",   value: "DEFERRAL"   },
    { label: "Blacklisted",value: "BLACKLISTED"},
  ];

  return (
    <RouteGuard allowedRoles={["clinician"]}>
    <div className="min-h-screen flex flex-col relative">
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url(/bg-homepage.png)" }} />
      <div className="fixed inset-0 z-0 bg-white/60" />

      <div className="relative z-10 min-h-screen flex flex-col">
        <Header onSearch={handleHeaderSearch} />

        <main className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-5 p-4 lg:p-5 max-w-[1400px] mx-auto w-full">
          {/* Sidebar */}
          <aside className="hidden lg:block w-[200px] flex-shrink-0 space-y-4">
            <ProfileCard />
            <SchedulePlanner />
          </aside>

          <div className="lg:hidden">
            <ProfileCard />
          </div>

          {/* Main Content */}
          <section className="flex-1">
            <Link href="/home" className="text-secondary text-sm mb-4 inline-block hover:underline font-semibold">
              ← Back to Home
            </Link>

            <div className="bg-secondary text-white text-sm font-bold py-3 px-5 rounded shadow mb-4 uppercase tracking-wide flex items-center justify-between">
              <span>Requests Referrals</span>
              <div ref={filterRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(p => !p)}
                  className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors text-white text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded border border-white/30"
                >
                  <span>{FILTER_TABS.find(t => t.value === filter)?.label || "All"}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${isFilterOpen ? "rotate-180" : ""}`} />
                </button>
                {isFilterOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden min-w-[140px]">
                    {FILTER_TABS.map(tab => (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => { setFilter(tab.value); setIsFilterOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${
                          filter === tab.value
                            ? "bg-secondary text-white"
                            : "text-gray-700 hover:bg-secondary/10 hover:text-secondary"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border-2 border-[#87c4d8]/50 shadow overflow-visible bg-white/60 backdrop-blur-sm">
              <table className="w-full text-xs table-fixed">
                <thead>
                  <tr className="bg-secondary text-white">
                    <th className="px-4 py-3 text-left font-bold uppercase tracking-wide w-[10%] rounded-tl-lg">Request Type</th>
                    <th className="px-4 py-3 text-left font-bold uppercase tracking-wide w-[8%]">Chart No.</th>
                    <th className="px-4 py-3 text-left font-bold uppercase tracking-wide w-[13%]">Treatment Service</th>
                    <th className="px-4 py-3 text-left font-bold uppercase tracking-wide w-[8%]">Special</th>
                    <th className="px-4 py-3 text-left font-bold uppercase tracking-wide w-[16%]">Reason</th>
                    <th className="px-4 py-3 text-left font-bold uppercase tracking-wide w-[13%]">Reviewed By</th>
                    <th className="px-4 py-3 text-center font-bold uppercase tracking-wide w-[9%]">Status</th>
                    <th className="px-4 py-3 text-left font-bold uppercase tracking-wide w-[13%]">Decline Reason</th>
                    <th className="px-4 py-3 w-[6%] rounded-tr-lg"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} className="p-8 text-center text-muted-foreground text-sm">Loading requests...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={9} className="p-8 text-center text-muted-foreground text-sm">
                      {searchQuery.trim() ? "No requests match your search." : "No pending requests."}
                    </td></tr>
                  ) : (
                    filtered.map((row, idx) => {
                      const r = row.referral;
                      const menuKey = `${r.id}-${row.reqType}`;
                      const isPending = row.reqStatus === "pending";
                      const isDeclined = row.reqStatus === "declined";

                      const menuItems: { label: string; className?: string; onClick: () => void }[] = [
                        { label: "View Details", onClick: () => setSelectedReferral(r) }
                      ];
                      if (row.reqType === "Edit") {
                        if (isPending) menuItems.push({
                          label: "Cancel Request", className: "text-red-600",
                          onClick: () => askConfirm("Cancel Edit Request", "Are you sure you want to cancel this edit request?", () => cancelEditRequest(r.id))
                        });
                        if (isDeclined) {
                          menuItems.push({
                            label: "Re-submit Edit Request", className: "text-blue-600",
                            onClick: () => { setResubmitReason(row.reason || ""); setResubmitDialog({ label: "Re-submit Edit Request", referralId: r.id, type: "Edit", oldReason: row.reason }); }
                          });
                          menuItems.push({
                            label: "Cancel Request", className: "text-red-600",
                            onClick: () => askConfirm("Cancel Edit Request", "Are you sure you want to cancel this edit request?", () => cancelEditRequest(r.id))
                          });
                        }
                      }
                      if (row.reqType === "Deletion") {
                        if (isPending) menuItems.push({
                          label: "Cancel Request", className: "text-red-600",
                          onClick: () => askConfirm("Cancel Deletion Request", "Are you sure you want to cancel this deletion request?", () => cancelDeletionRequest(r.id).then(() => loadReferrals()))
                        });
                        if (isDeclined) {
                          menuItems.push({
                            label: "Re-submit Deletion Request", className: "text-blue-600",
                            onClick: () => { setResubmitReason(row.reason || ""); setResubmitDialog({ label: "Re-submit Deletion Request", referralId: r.id, type: "Deletion", oldReason: row.reason }); }
                          });
                        }
                      }
                      if (row.reqType === "Deferral" || row.reqType === "Blacklisted") {
                        if (isPending) menuItems.push({
                          label: "Cancel Request", className: "text-red-600",
                          onClick: () => askConfirm("Cancel Status Change Request", "Are you sure you want to cancel this status change request?", () => cancelStatusChangeRequest(r.id))
                        });
                      }

                      return (
                        <tr
                          key={menuKey}
                          className={`border-b border-[#87c4d8]/30 hover:bg-[#87c4d8]/10 transition-colors ${
                            idx % 2 === 0 ? "bg-white" : "bg-[#87c4d8]/5"
                          }`}
                        >
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${TYPE_STYLE[row.reqType]}`}>
                              {row.reqType}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-secondary break-words">{r.chart_number || "—"}</td>
                          <td className="px-4 py-3 text-gray-700 break-words">{r.treatment_service_destination || "—"}</td>
                          <td className="px-4 py-3">
                            {r.special_case ? (
                              <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                {r.special_case}
                              </span>
                            ) : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="bg-orange-50 border-l-4 border-orange-400 px-2 py-1.5 rounded text-gray-700 break-words">
                              {row.reason || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-700 break-words">
                            {row.professorIds.length > 0 ? (
                              <div className="space-y-0.5">
                                {row.professorIds.map((pid: string) => (
                                  <div key={pid} className="text-[10px] font-semibold text-secondary">
                                    {userNames[pid] || "Prof."}
                                  </div>
                                ))}
                              </div>
                            ) : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${STATUS_BADGE[row.reqStatus] || STATUS_BADGE.pending}`}>
                              {row.reqStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {row.reqStatus === "declined" && row.declineReason ? (
                              <div className="bg-red-50 border-l-4 border-red-500 px-2 py-1.5 rounded text-gray-700 break-words">
                                {row.declineReason}
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {menuItems.length > 0 && (
                              <div className="relative inline-block" ref={openMenuId === menuKey ? menuRef : undefined}>
                                <button
                                  onClick={() => setOpenMenuId(openMenuId === menuKey ? null : menuKey)}
                                  className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                                >
                                  <MoreHorizontal className="h-4 w-4 text-gray-500" />
                                </button>
                                {openMenuId === menuKey && (
                                  <div className="absolute right-0 top-full mt-1 bg-white border-2 border-gray-200 rounded shadow-lg z-50 min-w-[150px]">
                                    {menuItems.map((item, i) => (
                                      <button
                                        key={i}
                                        onClick={() => { setOpenMenuId(null); item.onClick(); }}
                                        className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-gray-100 transition-colors ${item.className || "text-gray-700"}`}
                                      >
                                        {item.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden mt-4">
              <SchedulePlanner />
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </div>

    <ViewDetailsModal referral={selectedReferral} isOpen={!!selectedReferral} onClose={() => setSelectedReferral(null)} />

    {/* Re-submit Dialog */}
    {resubmitDialog && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setResubmitDialog(null)} />
        <div className="relative bg-white rounded shadow-2xl border-2 border-gray-300 w-full max-w-md mx-4 p-0 overflow-hidden">
          <div className="bg-secondary px-6 py-4">
            <h3 className="text-white font-bold text-sm uppercase tracking-wide">{resubmitDialog.label}</h3>
            <p className="text-white/70 text-[10px] mt-0.5">Update the reason below and resubmit</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5 block">Reason</label>
              <textarea
                value={resubmitReason}
                onChange={e => setResubmitReason(e.target.value)}
                placeholder="Enter reason..."
                className="w-full min-h-[100px] text-xs border-2 border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={confirmResubmit}
                disabled={!resubmitReason.trim()}
                className="flex-1 px-4 py-2.5 bg-secondary text-white text-xs font-bold rounded-lg hover:bg-secondary/90 transition-colors uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
              >SUBMIT</button>
              <button
                onClick={() => { setResubmitDialog(null); setResubmitReason(""); }}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors uppercase tracking-wide"
              >CANCEL</button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Confirm Dialog */}
    {confirmAction && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmAction(null)} />
        <div className="relative bg-white rounded shadow-2xl border-2 border-gray-300 w-full max-w-md mx-4 p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-secondary mb-2 uppercase tracking-wide">{confirmAction.label}</h3>
            <p className="text-sm text-muted-foreground mb-6">{confirmAction.description}</p>
            <div className="flex gap-3">
              <button
                onClick={async () => { await confirmAction.onConfirm(); setConfirmAction(null); }}
                className="flex-1 px-6 py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors shadow uppercase tracking-wide"
              >YES, CANCEL</button>
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded hover:bg-muted transition-colors uppercase tracking-wide"
              >GO BACK</button>
            </div>
          </div>
        </div>
      </div>
    )}
    </RouteGuard>
  );
}
