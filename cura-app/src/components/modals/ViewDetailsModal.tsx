"use client";

import React from "react";
import { Referral } from "@/lib/api/referrals";
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
  if (!referral) return null;

  const isAccepted = referral.accepted_by && referral.accepted_by !== "None";

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white max-w-[420px] w-[92vw] sm:w-full p-0 gap-0 rounded-xl overflow-hidden shadow-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="bg-secondary p-3 sm:p-4 sticky top-0 z-10">
          <DialogTitle className="text-white font-bold text-xs sm:text-sm uppercase tracking-wide">
            Referral Details
          </DialogTitle>
          <p className="text-white/70 text-[10px] leading-snug mt-0.5">
            Referring {referral.age || 0} yr. old patient for {referral.treatment_service_destination || "—"}
            {referral.special_case ? ` (${referral.special_case})` : ""}
          </p>
        </DialogHeader>

        <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">

          {/* Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
              referral.status === "approved"
                ? "bg-green-100 text-green-700 border-green-300"
                : isAccepted
                ? "bg-orange-100 text-orange-700 border-orange-300"
                : "bg-blue-100 text-blue-700 border-blue-300"
            }`}>
              {referral.status === "approved" ? "APPROVED" : isAccepted ? "PENDING" : "AVAILABLE"}
            </span>
            {referral.is_featured && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-300">
                FEATURED
              </span>
            )}
          </div>

          {/* Patient Info */}
          <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
            <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5">Patient Info</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div>
                <p className="text-[10px] font-semibold text-gray-500">Chart Number</p>
                <p className="text-xs text-gray-800 font-medium">{referral.chart_number || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-500">Age</p>
                <p className="text-xs text-gray-800 font-medium">{referral.age ? `${referral.age} yrs old` : "—"}</p>
              </div>
            </div>
          </div>

          {/* Medical Alert */}
          {referral.medical_alert && (
            <div className="bg-red-50 rounded-lg px-2.5 py-2 border border-red-200 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide shrink-0">Medical Alert:</span>
              {referral.medical_alert.split(",").map((a) => a.trim()).filter(Boolean).map((alert, i) => (
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
                <p className="text-xs text-gray-800 font-medium">{referral.clinical_section_origin || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-blue-500">Discipline</p>
                <p className="text-xs text-gray-800 font-medium">{referral.clinical_discipline_origin || "—"}</p>
              </div>
            </div>
          </div>

          {/* Clinical Pathway - Destination */}
          <div className="bg-green-50 rounded-lg p-2.5 sm:p-3 border border-green-200">
            <h3 className="text-[10px] font-bold text-green-700 uppercase tracking-wide mb-1.5">Clinical Pathway — Destination</h3>
            <div className="space-y-1">
              <div>
                <p className="text-[10px] font-semibold text-green-500">Section</p>
                <p className="text-xs text-gray-800 font-medium">{referral.clinical_section_destination || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-green-500">Discipline</p>
                <p className="text-xs text-gray-800 font-medium">{referral.clinical_discipline_destination || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-green-500">Treatment Service</p>
                <p className="text-xs text-gray-800 font-medium break-words">{referral.treatment_service_destination || "—"}</p>
              </div>
              {referral.special_case && (
                <div>
                  <p className="text-[10px] font-semibold text-green-500">Special Case</p>
                  <p className="text-xs text-gray-800 font-medium break-words">{referral.special_case}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tentative Appointment */}
          {referral.tentative_appointment_schedule && (
            <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 border border-gray-200">
              <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5">Tentative Appointment</h3>
              <p className="text-xs text-gray-800 font-medium">
                {new Date(referral.tentative_appointment_schedule).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
              </p>
            </div>
          )}

          {/* Notes & Special Indications */}
          {referral.notes_and_special_indications && (
            <div className="bg-yellow-50 rounded-lg p-2.5 sm:p-3 border border-yellow-200">
              <h3 className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide mb-1.5">Notes & Special Indications</h3>
              <p className="text-xs text-gray-800 break-words">{referral.notes_and_special_indications}</p>
            </div>
          )}

          {/* Accepted By */}
          {isAccepted && (
            <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
              <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5">Accepted By</h3>
              <p className="text-xs text-gray-800 font-medium">{referral.accepted_by}</p>
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
