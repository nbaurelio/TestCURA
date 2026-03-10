"use client";

import React from "react";
import { X, MapPin, Navigation, FileText, User, Clock, Hash, AlertTriangle } from "lucide-react";
import { Referral } from "@/lib/api/referrals";

interface ViewDetailsModalProps {
  referral: Referral | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ViewDetailsModal({ referral, isOpen, onClose }: ViewDetailsModalProps) {
  if (!isOpen || !referral) return null;

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isAccepted = referral.accepted_by && referral.accepted_by !== "None";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-secondary rounded-t-2xl px-6 py-4 flex items-start justify-between">
          <div>
            <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-1">Referral Details</p>
            <h2 className="text-white font-bold text-sm leading-snug">
              Referring {referral.age || 0} yr. old patient for {referral.clinical_section_destination}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors ml-4 mt-0.5 flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">

          {/* Status Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
              referral.status === 'approved'
                ? "bg-green-100 text-green-700 border border-green-300"
                : isAccepted
                ? "bg-orange-100 text-orange-700 border border-orange-300"
                : "bg-green-100 text-green-700 border border-green-300"
            }`}>
              {referral.status === 'approved' ? "APPROVED" : isAccepted ? "PENDING" : "AVAILABLE"}
            </span>
            {referral.is_featured && !isAccepted && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-300">
                FEATURED
              </span>
            )}
          </div>

          {/* Chart & Basic Info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="h-4 w-4 text-secondary" />
              <span className="text-xs font-bold text-secondary uppercase tracking-wide">Patient Info</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-700">
              <div>
                <span className="font-semibold text-gray-500">Chart Number</span>
                <p className="font-medium text-gray-900">{referral.chart_number || "—"}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-500">Age</span>
                <p className="font-medium text-gray-900">{referral.age ? `${referral.age} years old` : "—"}</p>
              </div>
              {referral.treatment && (
                <div className="col-span-2">
                  <span className="font-semibold text-gray-500">Treatment</span>
                  <p className="font-medium text-gray-900">{referral.treatment}</p>
                </div>
              )}
            </div>
          </div>

          {/* Medical Alert */}
          {referral.medical_alert && (
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Medical Alert</span>
              </div>
              <p className="text-xs text-red-700">{referral.medical_alert}</p>
            </div>
          )}

          {/* Clinical Pathway - Origin */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Clinical Pathway — Origin</span>
            </div>
            <div className="space-y-1.5 text-xs text-blue-800">
              <div className="flex justify-between">
                <span className="text-blue-500 font-medium">Section</span>
                <span className="font-semibold">{referral.clinical_section_origin || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-500 font-medium">Discipline</span>
                <span className="font-semibold">{referral.clinical_discipline_origin || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-500 font-medium">Treatment Service</span>
                <span className="font-semibold text-right max-w-[60%]">{referral.treatment_service_origin || "—"}</span>
              </div>
            </div>
          </div>

          {/* Clinical Pathway - Destination */}
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Navigation className="h-4 w-4 text-green-600" />
              <span className="text-xs font-bold text-green-700 uppercase tracking-wide">Clinical Pathway — Destination</span>
            </div>
            <div className="space-y-1.5 text-xs text-green-800">
              <div className="flex justify-between">
                <span className="text-green-500 font-medium">Section</span>
                <span className="font-semibold">{referral.clinical_section_destination || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-500 font-medium">Discipline</span>
                <span className="font-semibold">{referral.clinical_discipline_destination || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-500 font-medium">Treatment Service</span>
                <span className="font-semibold text-right max-w-[60%]">{referral.treatment_service_destination || "—"}</span>
              </div>
            </div>
          </div>

          {/* Medical History */}
          {referral.medical_history && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-secondary" />
                <span className="text-xs font-bold text-secondary uppercase tracking-wide">Medical History</span>
              </div>
              <p className="text-xs text-gray-700">{referral.medical_history}</p>
            </div>
          )}

          {/* Notes */}
          {referral.notes_and_special_indications && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-secondary" />
                <span className="text-xs font-bold text-secondary uppercase tracking-wide">Notes & Special Indications</span>
              </div>
              <p className="text-xs text-gray-700">{referral.notes_and_special_indications}</p>
            </div>
          )}

          {/* Accepted By */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-secondary" />
              <span className="text-xs font-bold text-secondary uppercase tracking-wide">Accepted By</span>
            </div>
            <p className="text-xs text-gray-700">{referral.accepted_by || "None"}</p>
          </div>

          {/* Timestamp */}
          <div className="bg-primary/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-wide">Timestamp</span>
            </div>
            <div className="text-xs text-gray-700 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Created At</span>
                <span className="font-semibold">{formatDateTime(referral.created_at)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full bg-secondary text-white text-xs font-bold py-2.5 rounded-xl hover:bg-secondary/90 transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
