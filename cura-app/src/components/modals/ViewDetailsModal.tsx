"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Referral, ReferralVersion, StatusChange, RereferralEvent, getReferralHistory, getReferralStatusHistory, getRereferralHistory } from "@/lib/api/referrals";
import { getProfile, getCurrentUserId } from "@/lib/api/profiles";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserProfilePopover } from "@/components/ui/UserProfilePopover";

interface ViewDetailsModalProps {
  referral: Referral | null;
  isOpen: boolean;
  onClose: () => void;
  hideChartNumber?: boolean;
}

export function ViewDetailsModal({ referral, isOpen, onClose, hideChartNumber = false }: ViewDetailsModalProps) {
  const [versions, setVersions] = useState<ReferralVersion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [creatorName, setCreatorName] = useState<string>("");
  const [originalCreatorId, setOriginalCreatorId] = useState<string>("");
  const [originalCreatedAt, setOriginalCreatedAt] = useState<string>("");
  const [editorName, setEditorName] = useState<string>("");
  const [editorId, setEditorId] = useState<string | null>(null);
  const [lastEditedAt, setLastEditedAt] = useState<string | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusChange[]>([]);
  const [statusChangers, setStatusChangers] = useState<Record<string, string>>({});
  const [rereferUserName, setRereferUserName] = useState<string>("");
  const [rereferApproverName, setRereferApproverName] = useState<string>("");
  const [rereferData, setRereferData] = useState<any>(null);
  const [rereferralHistory, setRereferralHistory] = useState<RereferralEvent[]>([]);
  const [rereferralUsers, setRereferralUsers] = useState<Record<string, string>>({});
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [approvalEvents, setApprovalEvents] = useState<{ action: string; userId: string; timestamp: string; approverName: string }[]>([]);

  useEffect(() => {
    const uid = getCurrentUserId();
    setCurrentUserId(uid);
    getProfile(uid).then(p => { if (p) setCurrentUserRole(p.role); });
  }, []);

  useEffect(() => {
    if (!isOpen || !referral) {
      setVersions([]);
      setCurrentIndex(0);
      setCreatorName("");
      setOriginalCreatorId("");
      setOriginalCreatedAt("");
      setEditorName("");
      setLastEditedAt(null);
      setStatusHistory([]);
      setStatusChangers({});
      setRereferUserName("");
      setRereferApproverName("");
      setRereferData(null);
      setRereferralHistory([]);
      setRereferralUsers({});
      setApprovalEvents([]);
      return;
    }
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const history = await getReferralHistory(referral.id);
        if (history.length > 0) {
          setVersions(history);
          setCurrentIndex(history.length - 1);
        } else {
          setVersions([{ action: "CREATE_REFERRAL", timestamp: referral.created_at, snapshot: referral }]);
          setCurrentIndex(0);
        }
      } catch {
        setVersions([{ action: "CREATE_REFERRAL", timestamp: referral.created_at, snapshot: referral }]);
        setCurrentIndex(0);
      } finally {
        setLoadingHistory(false);
      }
    };
    
    const fetchUserInfo = async () => {
      try {
        // Fetch creator info — prefer the original CREATE_REFERRAL snapshot so that
        // rereferral cycles (where user_id may be stale) still show the true first creator.
        const history = await getReferralHistory(referral.id);
        const originalVersion = history.find(v => v.action === "CREATE_REFERRAL") ?? history[0];
        const originalUserId = originalVersion?.snapshot?.user_id ?? referral.user_id;
        const originalTs = originalVersion?.snapshot?.created_at ?? referral.created_at;
        setOriginalCreatorId(originalUserId);
        setOriginalCreatedAt(originalTs);
        const creatorProfile = await getProfile(originalUserId);
        if (creatorProfile) {
          setCreatorName(`${creatorProfile.first_name} ${creatorProfile.last_name}`);
        }
        
        // Fetch live referral from DB to get current last_edited_by/at
        const { data: liveReferral } = await supabase
          .from("referrals")
          .select("last_edited_by, last_edited_at")
          .eq("id", referral.id)
          .single() as { data: { last_edited_by: string | null; last_edited_at: string | null } | null };
        
        if (liveReferral?.last_edited_by) {
          setEditorId(liveReferral.last_edited_by);
          const editorProfile = await getProfile(liveReferral.last_edited_by);
          if (editorProfile) {
            setEditorName(`${editorProfile.first_name} ${editorProfile.last_name}`);
          }
          setLastEditedAt(liveReferral.last_edited_at || null);
        }

        // Fetch live rereferral info
        const { data: liveRereferData } = await supabase
          .from("referrals")
          .select("rerefer_requested_by, rerefer_requested_at, rerefer_approved_by, rerefer_approved_at, rerefer_request_status, rerefer_request_reason")
          .eq("id", referral.id)
          .single() as { data: { rerefer_requested_by: string | null; rerefer_requested_at: string | null; rerefer_approved_by: string | null; rerefer_approved_at: string | null; rerefer_request_status: string | null; rerefer_request_reason: string | null } | null };

        setRereferData(liveRereferData);

        if (liveRereferData?.rerefer_requested_by) {
          const rereferProfile = await getProfile(liveRereferData.rerefer_requested_by);
          if (rereferProfile) {
            setRereferUserName(`${rereferProfile.first_name} ${rereferProfile.last_name}`);
          }
        }

        if (liveRereferData?.rerefer_approved_by) {
          const approverProfile = await getProfile(liveRereferData.rerefer_approved_by);
          if (approverProfile) {
            setRereferApproverName(`${approverProfile.first_name} ${approverProfile.last_name}`);
          }
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };
    
    const fetchStatusHistory = async () => {
      try {
        let history = await getReferralStatusHistory(referral.id, referral.chart_number);
        
        // Fallback: synthesize status history from referral fields when activity_logs has no entries
        if (history.length === 0 && referral.accepted_at) {
          const syntheticHistory: StatusChange[] = [];
          // 1. ONGOING — when the referral was accepted
          syntheticHistory.push({
            status: "ongoing",
            timestamp: referral.accepted_at,
            changedBy: referral.accepted_by_user_id || null,
          });
          // 2. Final status — completed/deferred/blacklisted
          const finalStatus = referral.referral_status?.toLowerCase();
          if (finalStatus && finalStatus !== "ongoing" && ["completed", "deferred", "blacklisted"].includes(finalStatus)) {
            // All final statuses (completed/deferred/blacklisted) require professor approval.
            // Fetch status_change_approved_by live from DB (prop may be stale).
            const { data: liveApprover } = await (supabase.from("referrals") as any)
              .select("status_change_approved_by")
              .eq("id", referral.id)
              .single();
            const approverId = (liveApprover as any)?.status_change_approved_by as string | null | undefined;
            const changedBy = approverId || referral.accepted_by_user_id || null;
            syntheticHistory.push({
              status: finalStatus,
              timestamp: referral.referral_status_changed_at || new Date().toISOString(),
              changedBy,
            });
          }
          history = syntheticHistory;
        }
        
        setStatusHistory(history);
        
        // Fetch user names for status changers
        const changerIds = Array.from(new Set(history.map(h => h.changedBy).filter(Boolean)));
        const changersMap: Record<string, string> = {};
        for (const userId of changerIds) {
          const profile = await getProfile(userId!);
          if (profile) {
            changersMap[userId!] = `${profile.first_name} ${profile.last_name}`;
          }
        }
        setStatusChangers(changersMap);
      } catch (error) {
        console.error("Error fetching status history:", error);
      }
    };
    
    const fetchRereferralHistory = async () => {
      try {
        const history = await getRereferralHistory(referral.id);
        setRereferralHistory(history);

        // Fetch user names for all unique user IDs in the history
        const userIds = Array.from(new Set(history.map(h => h.userId).filter(Boolean)));
        const usersMap: Record<string, string> = {};
        for (const uid of userIds) {
          const profile = await getProfile(uid);
          if (profile) {
            usersMap[uid] = `${profile.first_name} ${profile.last_name}`;
          }
        }
        setRereferralUsers(usersMap);
      } catch (error) {
        console.error("Error fetching rereferral history:", error);
      }
    };

    const fetchRequestApprovers = async () => {
      try {
        const activityLogsTable = supabase.from("activity_logs") as any;
        const { data } = await activityLogsTable
          .select("action, user_id, created_at, metadata")
          .in("action", ["APPROVE_EDIT_REQUEST", "APPROVE_REREFER_REQUEST", "APPROVE_DELETION_REQUEST"])
          .order("created_at", { ascending: true })
          .limit(10000);

        const events: { action: string; userId: string; timestamp: string; approverName: string }[] = [];
        for (const log of (data || [])) {
          try {
            const meta = typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata;
            if (meta?.referral_id !== referral.id) continue;
            const profile = await getProfile(log.user_id);
            if (profile) events.push({
              action: log.action,
              userId: log.user_id,
              timestamp: log.created_at,
              approverName: `${profile.first_name} ${profile.last_name}`,
            });
          } catch {}
        }
        setApprovalEvents(events);
      } catch (error) {
        console.error("Error fetching request approvers:", error);
      }
    };

    fetchHistory();
    fetchUserInfo();
    fetchStatusHistory();
    fetchRereferralHistory();
    fetchRequestApprovers();
  }, [isOpen, referral?.id, referral?.referral_status]);

  if (!referral) return null;

  const total = versions.length;
  const currentVersion = versions[currentIndex];
  const r = currentVersion?.snapshot ?? referral;
  const isLatest = currentIndex === total - 1;
  const isOriginal = currentIndex === 0;
  const isAccepted = r.accepted_by && r.accepted_by !== "None";
  const isCreator = currentUserId === r.user_id;
  const isAcceptor = !!r.accepted_by_user_id && currentUserId === r.accepted_by_user_id;
  const isPrivileged = currentUserRole === "professor" || currentUserRole === "clinical-admin";
  // Creator always sees their own chart number.
  // Acceptor, professor, clinical-admin only see it once the referral is accepted.
  // Everyone else never sees it.
  const canSeeChartNumber =
    isCreator ||
    isPrivileged ||
    (isAccepted && isAcceptor);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const versionLabel = isOriginal && isLatest
    ? "Original"
    : isLatest
    ? "Current Version"
    : isOriginal
    ? "Original Version"
    : currentVersion?.action === "REREFER_REQUEST"
    ? "Rereferred"
    : `Version ${currentIndex + 1}`;

  // Show rereferral history only for versions where rereferral events have occurred.
  // On the latest version: show ALL rereferral events (approve/sent-back happen after the rerefer snapshot).
  // On older versions: only show events up to that version's timestamp.
  const filteredRereferralHistory = (() => {
    if (!currentVersion || rereferralHistory.length === 0) return [];

    if (isLatest) return rereferralHistory;

    const currentTs = new Date(currentVersion.timestamp).getTime();
    return rereferralHistory.filter(e =>
      new Date(e.timestamp).getTime() <= currentTs + 1000 // 1s tolerance for near-simultaneous events
    );
  })();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white max-w-[420px] w-[92vw] sm:w-full p-0 gap-0 rounded-xl overflow-hidden shadow-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="bg-secondary p-3 sm:p-4 sticky top-0 z-10">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-white font-bold text-xs sm:text-sm uppercase tracking-wide">
                Referral Details
              </DialogTitle>
              <p className="text-white/70 text-[10px] leading-snug mt-0.5">
                Referring {r.age || 0} yr. old patient for {r.treatment_service_destination || "—"}
                {r.special_case ? ` (${r.special_case})` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/20 transition-colors mt-0.5 shrink-0"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </div>

          {/* Version Navigator */}
          <div className="mt-2.5 bg-white/10 rounded-lg px-3 py-2 flex items-center gap-2">
            <button
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={isOriginal || loadingHistory}
              className="text-white/70 hover:text-white disabled:opacity-25 transition-colors shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex-1 text-center min-w-0">
              {loadingHistory ? (
                <p className="text-white/60 text-[10px]">Loading history…</p>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      isLatest ? "bg-green-400/30 text-green-200" : "bg-white/20 text-white/70"
                    }`}>
                      {versionLabel}
                    </span>
                    {total > 1 && (
                      <span className="text-white/40 text-[9px]">{currentIndex + 1} / {total}</span>
                    )}
                  </div>
                  {currentVersion && (() => {
                    const versionTs = new Date(currentVersion.timestamp).getTime();
                    const prevVersionTs = currentIndex > 0
                      ? new Date(versions[currentIndex - 1].timestamp).getTime()
                      : 0;
                    // EDIT: find an APPROVE_EDIT_REQUEST event that occurred between prev version and this version
                    const editApprover = currentVersion.action === "UPDATE_REFERRAL"
                      ? approvalEvents
                          .filter(e => e.action === "APPROVE_EDIT_REQUEST" &&
                            new Date(e.timestamp).getTime() > prevVersionTs &&
                            new Date(e.timestamp).getTime() <= versionTs)
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
                      : null;
                    // REREFER: approval comes AFTER the rerefer snapshot → find earliest approval after versionTs
                    const rereferApproverForThis = currentVersion.action === "REREFER_REQUEST"
                      ? approvalEvents
                          .filter(e => e.action === "APPROVE_REREFER_REQUEST" && new Date(e.timestamp).getTime() >= versionTs)
                          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0]
                      : null;

                    // CYCLE-ORIGIN REREFER: when the current version is an
                    // UPDATE that sits inside a rerefer cycle, walk back to
                    // the most recent REREFER_REQUEST version and surface
                    // that as the cycle origin (so the header shows both the
                    // "Rereferred" and the "Edited" lines, each with its
                    // own approver). Without this the modal mislabels a
                    // rereferred-then-edited version as just "Updated".
                    let rereferCycleVersion: typeof currentVersion | null = null;
                    let rereferCycleApprover: { approverName: string } | null = null;
                    if (currentVersion.action === "UPDATE_REFERRAL") {
                      for (let i = currentIndex - 1; i >= 0; i--) {
                        const v = versions[i];
                        if (v.action === "REREFER_REQUEST") {
                          rereferCycleVersion = v;
                          const vTs = new Date(v.timestamp).getTime();
                          const nextBoundaryTs = i + 1 < versions.length
                            ? new Date(versions[i + 1].timestamp).getTime()
                            : Number.POSITIVE_INFINITY;
                          rereferCycleApprover = approvalEvents
                            .filter(e => e.action === "APPROVE_REREFER_REQUEST" &&
                              new Date(e.timestamp).getTime() >= vTs &&
                              new Date(e.timestamp).getTime() <= nextBoundaryTs)
                            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0] || null;
                          break;
                        }
                        if (v.action === "CREATE_REFERRAL") break; // cycle originated with the create, not a rerefer
                      }
                    }

                    const isRereferredAndEdited = !!rereferCycleVersion && !isOriginal;
                    const primaryLabel = isOriginal
                      ? "Created"
                      : currentVersion.action === "CREATE_REFERRAL"
                      ? "Created"
                      : currentVersion.action === "REREFER_REQUEST"
                      ? "Rereferred"
                      : isRereferredAndEdited
                      ? "Rereferred & Edited"
                      : "Updated";

                    return (
                      <div>
                        {/* Rereferred-cycle origin line (only when the current
                            UPDATE version sits inside a rerefer cycle, NOT for original version) */}
                        {isRereferredAndEdited && rereferCycleVersion && !isOriginal && (
                          <>
                            <p className="text-white/55 text-[9px] mt-0.5 truncate">
                              Rereferred: {formatDateTime(rereferCycleVersion.timestamp)}
                            </p>
                            {rereferCycleApprover && (
                              <p className="text-green-300/80 text-[9px] mt-0.5 truncate">
                                Approved By: {rereferCycleApprover.approverName}
                              </p>
                            )}
                          </>
                        )}

                        {/* Primary line for THIS version */}
                        <p className="text-white/55 text-[9px] mt-0.5 truncate">
                          {isRereferredAndEdited ? "Edited" : primaryLabel}: {formatDateTime(currentVersion.timestamp)}
                        </p>
                        {/* Show approver for Edit requests, but NOT for rereferral on original version */}
                        {editApprover && (
                          <p className="text-green-300/80 text-[9px] mt-0.5 truncate">
                            Approved By: {editApprover.approverName}
                          </p>
                        )}
                        {/* Show rereferral approver only for NON-original versions */}
                        {rereferApproverForThis && !isOriginal && (
                          <p className="text-green-300/80 text-[9px] mt-0.5 truncate">
                            Approved By: {rereferApproverForThis.approverName}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            <button
              onClick={() => setCurrentIndex(i => Math.min(total - 1, i + 1))}
              disabled={isLatest || loadingHistory}
              className="text-white/70 hover:text-white disabled:opacity-25 transition-colors shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">

          {/* Patient Info */}
          <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
            <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5">Patient Info</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {r.chart_number && !hideChartNumber && canSeeChartNumber && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500">Chart Number</p>
                  <p className="text-xs text-gray-800 font-medium">{r.chart_number}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold text-gray-500">Age</p>
                <p className="text-xs text-gray-800 font-medium">{r.age ? `${r.age} yrs old` : "—"}</p>
              </div>
              {r.sex && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500">Sex</p>
                  <p className="text-xs text-gray-800 font-medium">{r.sex}</p>
                </div>
              )}
            </div>
          </div>

          {/* Medical Alert */}
          {r.medical_alert && (
            <div className="bg-red-50 rounded-lg px-2.5 py-2 border border-red-200 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide shrink-0">Medical Alert:</span>
              {r.medical_alert.split(",").map((a) => a.trim()).filter(Boolean).map((alert, i) => (
                <span key={i} className="inline-flex items-center bg-red-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-sm">
                  {alert}
                </span>
              ))}
            </div>
          )}

          {/* Clinical Pathway - Origin */}
          <div className="bg-blue-50 rounded-lg p-2.5 sm:p-3 border border-blue-200">
            <h3 className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1.5">Clinical Pathway — Origin</h3>
            <div className="space-y-1">
              <div>
                <p className="text-[10px] font-semibold text-blue-500">Section</p>
                <p className="text-xs text-gray-800 font-medium">{r.clinical_section_origin || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-blue-500">Discipline</p>
                <p className="text-xs text-gray-800 font-medium">{r.clinical_discipline_origin || "—"}</p>
              </div>
            </div>
          </div>

          {/* Clinical Pathway - Destination */}
          <div className="bg-green-50 rounded-lg p-2.5 sm:p-3 border border-green-200">
            <h3 className="text-[10px] font-bold text-green-700 uppercase tracking-wide mb-1.5">Clinical Pathway — Destination</h3>
            <div className="space-y-1">
              <div>
                <p className="text-[10px] font-semibold text-green-500">Section</p>
                <p className="text-xs text-gray-800 font-medium">{r.clinical_section_destination || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-green-500">Discipline</p>
                <p className="text-xs text-gray-800 font-medium">{r.clinical_discipline_destination || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-green-500">Treatment Service</p>
                <p className="text-xs text-gray-800 font-medium break-words">{r.treatment_service_destination || "—"}</p>
              </div>
              {r.special_case && (
                <div>
                  <p className="text-[10px] font-semibold text-green-500">Special Case</p>
                  <p className="text-xs text-gray-800 font-medium break-words">{r.special_case}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tentative Appointment */}
          {r.tentative_appointment_schedule && (
            <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 border border-gray-200">
              <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5">Tentative Appointment</h3>
              <p className="text-xs text-gray-800 font-medium">
                {new Date(r.tentative_appointment_schedule!).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
              </p>
            </div>
          )}

          {/* Notes & Special Indications */}
          {r.notes_and_special_indications && (
            <div className="bg-yellow-50 rounded-lg p-2.5 sm:p-3 border border-yellow-200">
              <h3 className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide mb-1.5">Notes & Special Indications</h3>
              <div className="text-xs text-gray-800 break-words [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-0.5" dangerouslySetInnerHTML={{ __html: r.notes_and_special_indications }} />
            </div>
          )}

          {/* Referral Timeline — duration metrics scoped to current version's cycle */}
          {(() => {
            // Duration formatter in days. Sub-day durations render as
            // "<1 day" instead of "0 days" so freshly-created/accepted
            // referrals don't all read as zero.
            const msToDays = (ms: number | null): number | null => {
              if (ms === null || ms < 0) return null;
              return ms; // pass raw ms; fmtDays handles unit conversion
            };
            const fmtDays = (ms: number | null): string => {
              if (ms === null || ms < 0) return "—";
              const hours = ms / (1000 * 60 * 60);
              if (hours < 24) return "0 day";
              const days = Math.round(hours / 24);
              return `${days} day${days === 1 ? "" : "s"}`;
            };

            // Cycle bounds: from this version's timestamp to next version's timestamp (or now if latest).
            // Special case 1: for REREFER_REQUEST versions, the cycle only truly starts when the referral
            // is SENT BACK to the system (after professor approval). Use that timestamp instead.
            // Special case 2: for overdue referrals that are DEFERRED, the timeline resets at deferral
            // (treating it like a "send back to system" for overdue cases).
            const versionStartTs = currentVersion ? new Date(currentVersion.timestamp).getTime() : new Date(r.created_at).getTime();
            const versionEndTs = (currentIndex < total - 1)
              ? new Date(versions[currentIndex + 1].timestamp).getTime()
              : Date.now();

            const isRerefer = currentVersion?.action === "REREFER_REQUEST";
            const sendBackEvent = isRerefer
              ? rereferralHistory.find(e =>
                  e.action === "SEND_BACK_TO_SYSTEM" &&
                  new Date(e.timestamp).getTime() >= versionStartTs &&
                  new Date(e.timestamp).getTime() <= versionEndTs + 1000
                )
              : null;
            const sendBackTs = sendBackEvent ? new Date(sendBackEvent.timestamp).getTime() : null;

            // Check if this version follows an overdue state - look for any send-back event
            // that follows an overdue period (>7 days since appointment)
            const wasOverdueBefore = (() => {
              const prevVersion = currentIndex > 0 ? versions[currentIndex - 1] : null;
              if (!prevVersion) return false;
              const prevSnapshot = prevVersion.snapshot;
              if (!prevSnapshot?.tentative_appointment_schedule || !prevSnapshot?.accepted_at) return false;
              const apptDate = new Date(prevSnapshot.tentative_appointment_schedule).getTime();
              const versionDate = versionStartTs;
              const daysSinceAppt = Math.floor((versionDate - apptDate) / (1000 * 60 * 60 * 24));
              return daysSinceAppt > 7 && prevSnapshot.referral_status?.toLowerCase() === "ongoing";
            })();
            // Find send-back event within this version's timeframe (any send-back after overdue resets timeline)
            const overdueSendBackEvent = wasOverdueBefore
              ? rereferralHistory.find(e =>
                  e.action === "SEND_BACK_TO_SYSTEM" &&
                  new Date(e.timestamp).getTime() >= versionStartTs &&
                  new Date(e.timestamp).getTime() <= versionEndTs + 1000
                )
              : null;
            const overdueSendBackTs = overdueSendBackEvent ? new Date(overdueSendBackEvent.timestamp).getTime() : null;

            // For original version: use the original referral creation date
            // For rereferral cycles: use send-back timestamp or version start
            // For overdue referrals sent back: use send-back timestamp (reset)
            const cycleStartTs = isOriginal
              ? new Date(r.created_at).getTime()
              : (sendBackTs ?? overdueSendBackTs ?? versionStartTs);
            const cycleEndTs = isOriginal ? Date.now() : versionEndTs;
            const rereferNotSentBack = isRerefer && !isOriginal && sendBackTs === null;

            // Find acceptance + final-status events within this cycle from statusHistory
            // For rereferral cycles, we need to find events AFTER the send-back timestamp
            const inCycle = (ts: string) => {
              const t = new Date(ts).getTime();
              return t >= cycleStartTs - 1000 && t <= cycleEndTs + 1000;
            };
            const afterCycleStart = (ts: string) => {
              const t = new Date(ts).getTime();
              return t >= cycleStartTs - 1000;
            };
            // Find first acceptance event after cycle start (for rereferrals, this is after send-back)
            const acceptedEvent = statusHistory
              .filter(s => s.status === "ongoing" && afterCycleStart(s.timestamp))
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];
            const finalEvent = statusHistory.find(s =>
              ["completed", "deferred", "blacklisted"].includes(s.status) && inCycle(s.timestamp)
            );

            // Fallback to live referral fields when no status-history entry matches and we're on the latest version
            const isLatestVersion = currentIndex === total - 1;
            const liveAcceptedTs = (isLatestVersion || isOriginal) && r.accepted_at ? new Date(r.accepted_at).getTime() : null;
            const liveCompletedTs = (isLatestVersion || isOriginal) && r.referral_status_changed_at && ["completed", "deferred", "blacklisted"].includes(r.referral_status?.toLowerCase() || "")
              ? new Date(r.referral_status_changed_at).getTime()
              : null;

            // For original version: use original acceptance date regardless of cycle bounds
            const acceptedTs = isOriginal
              ? (liveAcceptedTs ?? (acceptedEvent ? new Date(acceptedEvent.timestamp).getTime() : null))
              : (acceptedEvent ? new Date(acceptedEvent.timestamp).getTime()
                : (liveAcceptedTs !== null && liveAcceptedTs >= cycleStartTs ? liveAcceptedTs : null));
            const finalTs = isOriginal
              ? (liveCompletedTs ?? (finalEvent ? new Date(finalEvent.timestamp).getTime() : null))
              : (finalEvent ? new Date(finalEvent.timestamp).getTime()
                : (liveCompletedTs !== null && liveCompletedTs >= cycleStartTs ? liveCompletedTs : null));

            const cycleLabel = "Referral Timeline";
            const isOverdueSendBack = overdueSendBackTs !== null;
            const cycleStartLabel = isOverdueSendBack
              ? "Sent Back to System"
              : (isRerefer && !isOriginal)
                ? "Sent Back to System"
                : "Referral Start";

            const rows: { label: string; value: string }[] = [];

            if (rereferNotSentBack) {
              // Rereferral approved but not yet sent back — counter hasn't started.
              rows.push({
                label: "Rereferral Requested",
                value: new Date(versionStartTs).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }),
              });
              rows.push({ label: "Status", value: "Awaiting send-back to system" });
            } else {
              // ── Always show the cycle start + running "Days in System"
              // counter. These NEVER restart once the referral is accepted —
              // they stay anchored to the original referral start (or, for
              // rereferral cycles, the send-back timestamp) and keep
              // accumulating through acceptance and completion.
              rows.push({
                label: cycleStartLabel,
                value: new Date(cycleStartTs).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }),
              });
              rows.push({
                label: "Days in System",
                value: fmtDays(msToDays(cycleEndTs - cycleStartTs)),
              });

              // ── Additional acceptance / final-status metrics shown only
              // when the corresponding event has occurred.
              if (finalTs !== null && acceptedTs !== null) {
                const finalLabel = (finalEvent?.status || r.referral_status?.toLowerCase() || "completed");
                const labelMap: Record<string, string> = { completed: "Days to Completion", deferred: "Days to Deferral", blacklisted: "Days to Blacklist" };
                rows.push({ label: "Days to Acceptance", value: fmtDays(msToDays(acceptedTs - cycleStartTs)) });
                rows.push({ label: labelMap[finalLabel] || "Days to Final Status", value: fmtDays(msToDays(finalTs - acceptedTs)) });
              } else if (acceptedTs !== null) {
                rows.push({ label: "Days to Acceptance", value: fmtDays(msToDays(acceptedTs - cycleStartTs)) });
                rows.push({ label: "Days Since Acceptance", value: fmtDays(msToDays(cycleEndTs - acceptedTs)) });
              }

              // ── Appointment-based metrics (only when referral is accepted
              // and a tentative appointment schedule exists)
              const apptStr = r.tentative_appointment_schedule;
              if (acceptedTs !== null && apptStr) {
                const apptTs = new Date(apptStr).getTime();
                const now = Date.now();
                const isOngoing = !["completed", "deferred", "blacklisted"].includes(r.referral_status?.toLowerCase() || "");
                // Days to Appointment (shown only if appointment is in the future or today)
                if (apptTs > acceptedTs) {
                  if (apptTs > now) {
                    rows.push({
                      label: "Days to Appointment",
                      value: fmtDays(msToDays(apptTs - now)),
                    });
                  }
                }
                // Since Appointment — shown once appointment date has passed
                if (apptTs <= now && isOngoing) {
                  rows.push({ label: "Days Since Appointment", value: fmtDays(msToDays(now - apptTs)) });
                  // Since Overdue — shown once 7+ days have passed since appointment
                  const daysSinceAppt = Math.floor((now - apptTs) / (1000 * 60 * 60 * 24));
                  if (daysSinceAppt > 7) {
                    rows.push({ label: "Days Since Overdue", value: fmtDays(msToDays(now - apptTs - 7 * 24 * 60 * 60 * 1000)) });
                  }
                }
              }
            }

            return (
              <div className="bg-secondary/5 rounded-lg p-2.5 sm:p-3 border border-secondary/20">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wide">{cycleLabel}</h3>
                  {total > 1 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-secondary/10 text-secondary/70">
                      Cycle {currentIndex + 1} / {total}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {rows.map((row, i) => (
                    <div key={i} className={i === 0 ? "col-span-2" : ""}>
                      <p className="text-[10px] font-semibold text-gray-500">{row.label}</p>
                      <p className="text-xs text-gray-800 font-medium">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Accepted By */}
          {isAccepted && (
            <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 space-y-1">
              <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5">Accepted By</h3>
              <p className="text-xs text-gray-800 font-medium">{r.accepted_by}</p>
              {r.accepted_at && (
                <p className="text-[11px] text-gray-500">
                  {new Date(r.accepted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                </p>
              )}
            </div>
          )}

          {/* Referral Info — Created By (always shown) + Sent Back By (rereferral cycles) */}
          {(() => {
            // Find the SEND_BACK_TO_SYSTEM event for the current non-original cycle
            const cycleVersionTs = currentVersion ? new Date(currentVersion.timestamp).getTime() : null;
            const nextVersionTs = currentIndex < total - 1
              ? new Date(versions[currentIndex + 1].timestamp).getTime()
              : Number.POSITIVE_INFINITY;
            const sendBackEvent = !isOriginal
              ? rereferralHistory
                  .filter(e =>
                    e.action === "SEND_BACK_TO_SYSTEM" &&
                    cycleVersionTs !== null &&
                    new Date(e.timestamp).getTime() >= cycleVersionTs - 1000 &&
                    new Date(e.timestamp).getTime() <= nextVersionTs
                  )
                  .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0] ?? null
              : null;
            const sendBackUserId = sendBackEvent?.userId ?? null;
            const sendBackName = sendBackUserId ? (rereferralUsers[sendBackUserId] ?? null) : null;
            const sendBackTs = sendBackEvent?.timestamp ?? null;

            // Determine if this is a plain edit (not a rereferral cycle)
            const isPlainEdit = !isOriginal && !sendBackEvent &&
              (currentVersion?.action === "UPDATE_REFERRAL" || currentVersion?.action === "EDIT_REQUEST");

            return (
              <>
                {/* Show original creator only on the original version */}
                {isOriginal && (
                  <div className="bg-blue-50 rounded-lg p-2.5 sm:p-3 border border-blue-200">
                    <h3 className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1.5">Created By</h3>
                    {creatorName ? (
                      <UserProfilePopover userId={originalCreatorId || referral.user_id} displayName={creatorName} />
                    ) : (
                      <p className="text-xs text-gray-800 font-medium">—</p>
                    )}
                    <p className="text-[11px] text-gray-500 mt-0.5">{formatDateTime(originalCreatedAt || referral.created_at)}</p>
                  </div>
                )}

                {/* Show "Sent Back By" for rereferral cycles */}
                {!isOriginal && sendBackUserId && sendBackName && (
                  <div className="bg-purple-50 rounded-lg p-2.5 sm:p-3 border border-purple-200">
                    <h3 className="text-[10px] font-bold text-purple-700 uppercase tracking-wide mb-1.5">Sent Back By</h3>
                    <UserProfilePopover userId={sendBackUserId} displayName={sendBackName} />
                    {sendBackTs && (
                      <p className="text-[11px] text-gray-500 mt-0.5">{formatDateTime(sendBackTs)}</p>
                    )}
                  </div>
                )}

                {/* Show "Last Edited By" for plain edits only */}
                {isPlainEdit && editorId && editorName && (
                  <div className="bg-purple-50 rounded-lg p-2.5 sm:p-3 border border-purple-200">
                    <h3 className="text-[10px] font-bold text-purple-700 uppercase tracking-wide mb-1.5">Last Edited By</h3>
                    <UserProfilePopover userId={editorId} displayName={editorName} />
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {currentVersion ? formatDateTime(currentVersion.timestamp) : lastEditedAt ? formatDateTime(lastEditedAt) : "—"}
                    </p>
                  </div>
                )}
              </>
            );
          })()}

          {/* Status History — only when a final status (completed/deferred/blacklisted) exists */}
          {statusHistory.some(s => ["completed", "deferred", "blacklisted"].includes(s.status)) && (
            <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 border border-gray-200">
              <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-2">Status History</h3>
              <div className="space-y-2">
                {statusHistory.map((change, index) => (
                  <div key={index} className={`flex items-center justify-between p-2 rounded border ${
                    change.status === "ongoing"
                      ? "bg-blue-50 border-blue-200"
                      : change.status === "completed"
                      ? "bg-green-50 border-green-200"
                      : change.status === "deferred"
                      ? "bg-red-50 border-red-200"
                      : change.status === "blacklisted"
                      ? "bg-gray-700 border-gray-800 text-white"
                      : "bg-gray-50 border-gray-200"
                  }`}>
                    <div>
                      <p className={`text-xs font-bold uppercase ${change.status === "blacklisted" ? "text-white" : "text-gray-800"}`}>
                        {change.status}
                      </p>
                      <div className={`text-[10px] ${change.status === "blacklisted" ? "text-gray-300" : "text-gray-500"}`}>
                        {["completed", "deferred", "blacklisted"].includes(change.status) ? (
                          <>
                            <span>Approved by: </span>
                            {change.changedBy && statusChangers[change.changedBy] ? (
                              <UserProfilePopover userId={change.changedBy} displayName={statusChangers[change.changedBy]} />
                            ) : (
                              <span>Unknown</span>
                            )}
                          </>
                        ) : (
                          <>
                            <span>by </span>
                            {change.changedBy && statusChangers[change.changedBy] ? (
                              <UserProfilePopover userId={change.changedBy} displayName={statusChangers[change.changedBy]} />
                            ) : (
                              <span>Unknown</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <p className={`text-[10px] ${change.status === "blacklisted" ? "text-gray-300" : "text-gray-500"}`}>
                      {formatDateTime(change.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}


          {/* Close Button */}
          <div className="pt-1">
            <Button
              variant="outline"
              className="w-full text-[10px] font-bold h-8"
              onClick={onClose}
            >
              CLOSE
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
