"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Referral, ReferralVersion, StatusChange, RereferralEvent, getReferralHistory, getReferralStatusHistory, getRereferralHistory } from "@/lib/api/referrals";
import { getProfile } from "@/lib/api/profiles";
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
}

export function ViewDetailsModal({ referral, isOpen, onClose }: ViewDetailsModalProps) {
  const [versions, setVersions] = useState<ReferralVersion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [creatorName, setCreatorName] = useState<string>("");
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

  useEffect(() => {
    if (!isOpen || !referral) {
      setVersions([]);
      setCurrentIndex(0);
      setCreatorName("");
      setEditorName("");
      setLastEditedAt(null);
      setStatusHistory([]);
      setStatusChangers({});
      setRereferUserName("");
      setRereferApproverName("");
      setRereferData(null);
      setRereferralHistory([]);
      setRereferralUsers({});
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
        // Fetch creator info
        const creatorProfile = await getProfile(referral.user_id);
        if (creatorProfile) {
          setCreatorName(`${creatorProfile.first_name} ${creatorProfile.last_name}`);
        }
        
        // Fetch live referral from DB to get current last_edited_by/at
        const { data: liveReferral } = await supabase
          .from("referrals")
          .select("last_edited_by, last_edited_at")
          .eq("id", referral.id)
          .single();
        
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
          .single();

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
        const history = await getReferralStatusHistory(referral.id);
        setStatusHistory(history);
        
        // Fetch user names for status changers
        const changerIds = [...new Set(history.map(h => h.changedBy).filter(Boolean))];
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
        const userIds = [...new Set(history.map(h => h.userId).filter(Boolean))];
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

    fetchHistory();
    fetchUserInfo();
    fetchStatusHistory();
    fetchRereferralHistory();
  }, [isOpen, referral?.id]);

  if (!referral) return null;

  const total = versions.length;
  const currentVersion = versions[currentIndex];
  const r = currentVersion?.snapshot ?? referral;
  const isLatest = currentIndex === total - 1;
  const isOriginal = currentIndex === 0;
  const isAccepted = r.accepted_by && r.accepted_by !== "None";

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

  // Filter rereferral history: show events from start up to the next REREFER_REQUEST version
  const filteredRereferralHistory = (() => {
    if (!currentVersion || currentVersion.action !== "REREFER_REQUEST") return [];
    const currentTs = new Date(currentVersion.timestamp).getTime();
    // Find the next REREFER_REQUEST version after the current one
    const nextRereferVersion = versions.find(v =>
      v.action === "REREFER_REQUEST" && new Date(v.timestamp).getTime() > currentTs
    );
    const upperBound = nextRereferVersion
      ? new Date(nextRereferVersion.timestamp).getTime()
      : Infinity;
    return rereferralHistory.filter(e => {
      const eventTs = new Date(e.timestamp).getTime();
      return eventTs < upperBound;
    });
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
                  {currentVersion && (
                    <p className="text-white/55 text-[9px] mt-0.5 truncate">
                      {currentVersion.action === "CREATE_REFERRAL" ? "Created" : currentVersion.action === "REREFER_REQUEST" ? "Rereferred" : "Updated"}: {formatDateTime(currentVersion.timestamp)}
                    </p>
                  )}
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
              {r.chart_number && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500">Chart Number</p>
                  <p className="text-xs text-gray-800 font-medium">{r.chart_number}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold text-gray-500">Age</p>
                <p className="text-xs text-gray-800 font-medium">{r.age ? `${r.age} yrs old` : "—"}</p>
              </div>
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
                {new Date(r.tentative_appointment_schedule).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
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

          {/* Referral Info — Original or Edited */}
          {isOriginal ? (
            <div className="bg-blue-50 rounded-lg p-2.5 sm:p-3 border border-blue-200">
              <h3 className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1.5">Created By</h3>
              {creatorName ? (
                <UserProfilePopover userId={referral.user_id} displayName={creatorName} />
              ) : (
                <p className="text-xs text-gray-800 font-medium">—</p>
              )}
              <p className="text-[11px] text-gray-500 mt-0.5">{formatDateTime(referral.created_at)}</p>
            </div>
          ) : (
            <div className="bg-purple-50 rounded-lg p-2.5 sm:p-3 border border-purple-200">
              <h3 className="text-[10px] font-bold text-purple-700 uppercase tracking-wide mb-1.5">Last Edited By</h3>
              {editorId && editorName ? (
                <UserProfilePopover userId={editorId} displayName={editorName} />
              ) : (
                <p className="text-xs text-gray-800 font-medium">—</p>
              )}
              <p className="text-[11px] text-gray-500 mt-0.5">
                {currentVersion ? formatDateTime(currentVersion.timestamp) : lastEditedAt ? formatDateTime(lastEditedAt) : "—"}
              </p>
            </div>
          )}

          {/* Status History */}
          {statusHistory.length > 0 && (
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
                        <span>by </span>
                        {change.changedBy && statusChangers[change.changedBy] ? (
                          <UserProfilePopover userId={change.changedBy} displayName={statusChangers[change.changedBy]} />
                        ) : (
                          <span>Unknown</span>
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

          {/* Rereferral History — only shown on rerefer versions */}
          {filteredRereferralHistory.length > 0 && currentVersion?.action === "REREFER_REQUEST" && (
            <div className="bg-amber-50 rounded-lg p-2.5 sm:p-3 border border-amber-200">
              <h3 className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2">Rereferral History</h3>
              <div className="relative pl-4">
                {/* Timeline line */}
                <div className="absolute left-[5px] top-1 bottom-1 w-[2px] bg-amber-300" />
                <div className="space-y-3">
                  {filteredRereferralHistory.map((event, index) => {
                    const isRequest = event.action === "REREFER_REQUEST";
                    const isApprove = event.action === "APPROVE_REREFER_REQUEST";
                    const isDecline = event.action === "DECLINE_REREFER_REQUEST";
                    const dotColor = isRequest
                      ? "bg-amber-500"
                      : isApprove
                      ? "bg-green-500"
                      : "bg-red-500";
                    const label = isRequest
                      ? "Rerefer Requested"
                      : isApprove
                      ? "Rerefer Approved"
                      : "Rerefer Declined";
                    const textColor = isRequest
                      ? "text-amber-700"
                      : isApprove
                      ? "text-green-700"
                      : "text-red-700";

                    return (
                      <div key={index} className="relative">
                        {/* Timeline dot */}
                        <div className={`absolute -left-4 top-[3px] w-[10px] h-[10px] rounded-full ${dotColor} border-2 border-white shadow-sm`} />
                        <div>
                          <p className={`text-[10px] font-bold uppercase tracking-wide ${textColor}`}>
                            {label}
                          </p>
                          <div className="text-xs text-gray-800 font-medium">
                            {event.userId && rereferralUsers[event.userId] ? (
                              <UserProfilePopover userId={event.userId} displayName={rereferralUsers[event.userId]} />
                            ) : (
                              <span>Unknown</span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(event.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
