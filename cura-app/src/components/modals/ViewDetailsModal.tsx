"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Referral, ReferralVersion, getReferralHistory } from "@/lib/api/referrals";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ViewDetailsModalProps {
  referral: Referral | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ViewDetailsModal({ referral, isOpen, onClose }: ViewDetailsModalProps) {
  const [versions, setVersions] = useState<ReferralVersion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!isOpen || !referral) {
      setVersions([]);
      setCurrentIndex(0);
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
    fetchHistory();
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
    : `Version ${currentIndex + 1}`;

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
                      {currentVersion.action === "CREATE_REFERRAL" ? "Created" : "Updated"}: {formatDateTime(currentVersion.timestamp)}
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

          {/* Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
              r.status === "approved"
                ? "bg-green-100 text-green-700 border-green-300"
                : isAccepted
                ? "bg-orange-100 text-orange-700 border-orange-300"
                : "bg-blue-100 text-blue-700 border-blue-300"
            }`}>
              {r.status === "approved" ? "APPROVED" : isAccepted ? "PENDING" : "AVAILABLE"}
            </span>
            {r.is_featured && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-300">
                FEATURED
              </span>
            )}
          </div>

          {/* Patient Info */}
          <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
            <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5">Patient Info</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {isAccepted && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500">Chart Number</p>
                  <p className="text-xs text-gray-800 font-medium">{r.chart_number || "—"}</p>
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
            <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
              <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5">Accepted By</h3>
              <p className="text-xs text-gray-800 font-medium">{r.accepted_by}</p>
            </div>
          )}

          {/* Created At */}
          <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
            <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5">Date Created</h3>
            <p className="text-xs text-gray-800 font-medium">{formatDateTime(referral.created_at)}</p>
          </div>

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
