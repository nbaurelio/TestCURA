"use client";

import React, { useState, memo, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ViewDetailsModal } from "@/components/modals/ViewDetailsModal";
import { EditReferralModal } from "@/components/modals/EditReferralModal";
import { Referral, submitEditRequest, submitRereferRequest, submitDeletionRequest, sendBackToSystem } from "@/lib/api/referrals";
import { getCurrentUserId, getProfessors, Profile } from "@/lib/api/profiles";
import { sendSystemNotification } from "@/lib/utils/notify";
import { supabase } from "@/lib/supabase";

interface ReferralCardProps {
  id: string;
  title: string;
  medicalAlert?: string;
  clinicalSectionOrigin?: string;
  clinicalSectionDestination?: string;
  clinicalDisciplineOrigin?: string;
  clinicalDisciplineDestination?: string;
  treatmentServiceOrigin?: string;
  treatmentServiceDestination?: string;
  notesAndIndications?: string;
  chartNumber?: string;
  acceptedBy?: string;
  acceptedAt?: string | null;
  status?: string;
  showAccept?: boolean;
  showUpdate?: boolean;
  showApprove?: boolean;
  showDecline?: boolean;
  createdAt?: string;
  treatment?: string;
  medicalHistory?: string;
  isFeatured?: boolean;
  specialCase?: string;
  tentativeAppointment?: string;
  age?: number;
  sex?: string | null;
  userId?: string;
  showEditOption?: boolean;
  editRequestReason?: string | null;
  editRequestStatus?: string | null;
  onUpdate?: (id: string, updates: Partial<Referral>) => void;
  onAccept?: (id: string) => void;
  onApprove?: (id: string) => void;
  onDecline?: (id: string) => void;
  onDelete?: (id: string) => void;
  onApproveEditRequest?: (id: string) => void;
  onDeclineEditRequest?: (id: string) => void;
  onEditRequestSubmitted?: () => void;
  editRequestPage?: boolean;
  onCancelEditRequest?: (id: string) => void;
  deletionRequestPage?: boolean;
  deletionRequestReason?: string | null;
  onCancelDeletionRequest?: (id: string) => void;
  acceptedReferralsPage?: boolean;
  completedReferralsPage?: boolean;
  referralStatus?: string | null;
  referralStatusChangedAt?: string | null;
  acceptedByUserId?: string | null;
  onStatusChange?: (id: string, status: string) => void;
  onRerefer?: (id: string) => void;
  rereferRequestStatus?: string | null;
  rereferRequestReason?: string | null;
  deletionRequestStatus?: string | null;
  isProfessor?: boolean;
  isAdvisee?: boolean;
  createdByName?: string;
  onSendBackToSystem?: (id: string) => void;
  statusChangeReason?: string | null;
}

function DeleteConfirmDialog({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="bg-white max-w-sm rounded-2xl shadow-2xl p-6 text-center [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">Confirm Delete</DialogTitle>
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-red-600 mb-2">Delete Referral</h3>
        <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete this referral? This action cannot be undone.</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            YES, DELETE
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"
          >
            CANCEL
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProfessorPicker({ selectedIds, onChange }: { selectedIds: string[]; onChange: (ids: string[]) => void }) {
  const [professors, setProfessors] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  React.useEffect(() => {
    getProfessors().then(setProfessors);
  }, []);

  const filtered = professors.filter(p => {
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) && !selectedIds.includes(p.id);
  });

  const selectedProfessors = professors.filter(p => selectedIds.includes(p.id));

  return (
    <div>
      <label className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5 block">
        Send To (Professors)
      </label>
      {selectedProfessors.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedProfessors.map(p => (
            <span key={p.id} className="inline-flex items-center gap-1 bg-secondary/10 text-secondary text-[10px] font-semibold px-2 py-0.5 rounded-full border border-secondary/30">
              {p.first_name} {p.last_name}
              <button type="button" onClick={() => onChange(selectedIds.filter(id => id !== p.id))} className="hover:text-red-500 transition-colors ml-0.5">×</button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          placeholder="Search professors..."
          className="w-full h-8 text-xs px-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
        />
        {showDropdown && filtered.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {filtered.map(p => (
              <button
                key={p.id}
                type="button"
                onMouseDown={() => { onChange([...selectedIds, p.id]); setSearch(""); setShowDropdown(false); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-secondary/10 hover:text-secondary transition-colors"
              >
                {p.first_name} {p.last_name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EditRequestDialog({ open, onCancel, onSubmit }: { open: boolean; onCancel: () => void; onSubmit: (reason: string, professorIds: string[]) => void }) {
  const [reason, setReason] = useState("");
  const [professorIds, setProfessorIds] = useState<string[]>([]);

  const handleSubmit = () => {
    if (reason.trim()) {
      onSubmit(reason.trim(), professorIds);
      setReason("");
      setProfessorIds([]);
    }
  };

  const handleClose = () => {
    setReason("");
    setProfessorIds([]);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-white max-w-md rounded-2xl shadow-2xl p-0 overflow-hidden [&>button:last-child]:hidden">
        <div className="bg-secondary px-6 py-4">
          <DialogTitle className="text-white font-bold text-sm uppercase tracking-wide">Request to Edit</DialogTitle>
          <p className="text-white/70 text-[10px] mt-0.5">Please provide a reason for your edit request</p>
        </div>
        <div className="p-6 space-y-4">
          <ProfessorPicker selectedIds={professorIds} onChange={setProfessorIds} />
          <div>
            <label className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5 block">
              Reason for Edit Request
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter the reason for your edit request..."
              className="w-full min-h-[100px] text-xs border-2 border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!reason.trim() || professorIds.length === 0}
              className="flex-1 px-4 py-2.5 bg-secondary text-white text-xs font-bold rounded-lg hover:bg-secondary/90 transition-colors uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
            >
              SUBMIT REQUEST
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors uppercase tracking-wide"
            >
              CANCEL
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteRequestDialog({ open, onCancel, onSubmit }: { open: boolean; onCancel: () => void; onSubmit: (reason: string, professorIds: string[]) => void }) {
  const [reason, setReason] = useState("");
  const [professorIds, setProfessorIds] = useState<string[]>([]);

  const handleSubmit = () => {
    if (reason.trim()) {
      onSubmit(reason.trim(), professorIds);
      setReason("");
      setProfessorIds([]);
    }
  };

  const handleClose = () => {
    setReason("");
    setProfessorIds([]);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-white max-w-md rounded-2xl shadow-2xl p-0 overflow-hidden [&>button:last-child]:hidden">
        <div className="bg-secondary px-6 py-4">
          <DialogTitle className="text-white font-bold text-sm uppercase tracking-wide">Request to Delete</DialogTitle>
          <p className="text-white/70 text-[10px] mt-0.5">Please provide a reason for your deletion request</p>
        </div>
        <div className="p-6 space-y-4">
          <ProfessorPicker selectedIds={professorIds} onChange={setProfessorIds} />
          <div>
            <label className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5 block">
              Reason for Deletion Request
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter the reason for your deletion request..."
              className="w-full min-h-[100px] text-xs border-2 border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!reason.trim() || professorIds.length === 0}
              className="flex-1 px-4 py-2.5 bg-secondary text-white text-xs font-bold rounded-lg hover:bg-secondary/90 transition-colors uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
            >
              SUBMIT REQUEST
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors uppercase tracking-wide"
            >
              CANCEL
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RereferRequestDialog({ open, onCancel, onSubmit }: { open: boolean; onCancel: () => void; onSubmit: (reason: string, professorIds: string[]) => void }) {
  const [reason, setReason] = useState("");
  const [professorIds, setProfessorIds] = useState<string[]>([]);
  
  const handleSubmit = () => {
    if (reason.trim()) {
      onSubmit(reason.trim(), professorIds);
      setReason("");
      setProfessorIds([]);
    }
  };

  const handleClose = () => {
    setReason("");
    setProfessorIds([]);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-white max-w-md rounded-2xl shadow-2xl p-0 overflow-hidden [&>button:last-child]:hidden z-50">
        <div className="bg-secondary px-6 py-4">
          <DialogTitle className="text-white font-bold text-sm uppercase tracking-wide">Request to Rerefer</DialogTitle>
          <p className="text-white/70 text-[10px] mt-0.5">Please provide a reason for your rerefer request</p>
        </div>
        <div className="p-6 space-y-4">
          <ProfessorPicker selectedIds={professorIds} onChange={setProfessorIds} />
          <div>
            <label className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5 block">
              Reason for Rerefer Request
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter the reason for your rerefer request..."
              className="w-full min-h-[100px] text-xs border-2 border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!reason.trim() || professorIds.length === 0}
              className="flex-1 px-4 py-2.5 bg-secondary text-white text-xs font-bold rounded-lg hover:bg-secondary/90 transition-colors uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
            >
              SUBMIT REQUEST
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors uppercase tracking-wide"
            >
              CANCEL
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusChangeReasonDialog({
  open,
  statusLabel,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  statusLabel: string;
  onCancel: () => void;
  onSubmit: (reason: string, professorIds: string[]) => void;
}) {
  const [reason, setReason] = useState("");
  const [professorIds, setProfessorIds] = useState<string[]>([]);

  const handleSubmit = () => {
    if (reason.trim() && professorIds.length > 0) {
      onSubmit(reason.trim(), professorIds);
      setReason("");
      setProfessorIds([]);
    }
  };

  const handleClose = () => {
    setReason("");
    setProfessorIds([]);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-white max-w-md rounded-2xl shadow-2xl p-0 overflow-hidden [&>button:last-child]:hidden">
        <div className="bg-secondary px-6 py-4">
          <DialogTitle className="text-white font-bold text-sm uppercase tracking-wide">Change Status to {statusLabel}</DialogTitle>
          <p className="text-white/70 text-[10px] mt-0.5">Please provide a reason and notify a professor</p>
        </div>
        <div className="p-6 space-y-4">
          <ProfessorPicker selectedIds={professorIds} onChange={setProfessorIds} />
          <div>
            <label className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5 block">
              Reason for {statusLabel}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`Enter the reason for changing status to ${statusLabel}...`}
              className="w-full min-h-[100px] text-xs border-2 border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!reason.trim() || professorIds.length === 0}
              className="flex-1 px-4 py-2.5 bg-secondary text-white text-xs font-bold rounded-lg hover:bg-secondary/90 transition-colors uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
            >
              SUBMIT
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors uppercase tracking-wide"
            >
              CANCEL
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ReferralCard({
  id,
  title,
  medicalAlert,
  clinicalSectionOrigin,
  clinicalSectionDestination,
  clinicalDisciplineOrigin,
  clinicalDisciplineDestination,
  treatmentServiceOrigin,
  treatmentServiceDestination,
  notesAndIndications,
  chartNumber,
  acceptedBy,
  acceptedAt,
  status,
  showAccept = true,
  showUpdate = false,
  showApprove = false,
  showDecline = false,
  createdAt,
  treatment,
  medicalHistory,
  isFeatured,
  specialCase,
  tentativeAppointment,
  age: ageProp,
  sex,
  userId,
  showEditOption = false,
  editRequestReason,
  editRequestStatus,
  onUpdate,
  onAccept,
  onApprove,
  onDecline,
  onDelete,
  onApproveEditRequest,
  onDeclineEditRequest,
  onEditRequestSubmitted,
  editRequestPage = false,
  onCancelEditRequest,
  deletionRequestPage = false,
  deletionRequestReason,
  onCancelDeletionRequest,
  acceptedReferralsPage = false,
  completedReferralsPage = false,
  referralStatus,
  referralStatusChangedAt,
  acceptedByUserId,
  onStatusChange,
  onRerefer,
  rereferRequestStatus,
  rereferRequestReason,
  deletionRequestStatus,
  isProfessor = false,
  isAdvisee = false,
  createdByName,
  onSendBackToSystem,
  statusChangeReason,
}: ReferralCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEditRequestOpen, setIsEditRequestOpen] = useState(false);
  const [isCancelEditRequestOpen, setIsCancelEditRequestOpen] = useState(false);
  const [isCancelDeletionRequestOpen, setIsCancelDeletionRequestOpen] = useState(false);
  const [isStatusPickerOpen, setIsStatusPickerOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [isRereferOpen, setIsRereferOpen] = useState(false);
  const [isDeletionRequestOpen, setIsDeletionRequestOpen] = useState(false);

  // Memoize referralData to prevent recreation on every render
  const referralData: Referral = useMemo(() => ({
    id,
    user_id: userId || "",
    chart_number: chartNumber || "",
    treatment: treatment || null,
    age: ageProp ?? (title ? parseInt(title.match(/(\d+) yr/)?.[1] || "0") : null),
    sex: sex || null,
    medical_alert: medicalAlert || null,
    clinical_section_origin: clinicalSectionOrigin || "",
    clinical_section_destination: clinicalSectionDestination || "",
    clinical_discipline_origin: clinicalDisciplineOrigin || null,
    clinical_discipline_destination: clinicalDisciplineDestination || null,
    treatment_service_origin: treatmentServiceOrigin || null,
    treatment_service_destination: treatmentServiceDestination || null,
    special_case: specialCase || null,
    tentative_appointment_schedule: tentativeAppointment || null,
    medical_history: medicalHistory || null,
    notes_and_special_indications: notesAndIndications || null,
    status: status || "pending",
    is_featured: isFeatured || false,
    accepted_by: acceptedBy || "None",
    accepted_by_user_id: acceptedByUserId || null,
    accepted_at: acceptedAt || null,
    edit_request_reason: editRequestReason || null,
    edit_request_status: editRequestStatus || null,
    last_edited_by: null,
    last_edited_at: null,
    referral_status: referralStatus || "ongoing",
    referral_status_changed_at: referralStatusChangedAt || null,
    rerefer_request_reason: null,
    rerefer_request_status: null,
    rerefer_requested_by: null,
    rerefer_requested_at: null,
    rerefer_approved_by: null,
    rerefer_approved_at: null,
    rerefer_declined_by: null,
    rerefer_declined_at: null,
    deletion_request_reason: null,
    deletion_request_status: null,
    deletion_requested_by: null,
    deletion_requested_at: null,
    created_at: createdAt || new Date().toISOString(),
  }), [id, userId, chartNumber, treatment, ageProp, medicalAlert, clinicalSectionOrigin, clinicalSectionDestination,
      clinicalDisciplineOrigin, clinicalDisciplineDestination, treatmentServiceOrigin, treatmentServiceDestination,
      specialCase, tentativeAppointment, medicalHistory, notesAndIndications, status, isFeatured, acceptedBy,
      acceptedAt, editRequestReason, editRequestStatus, referralStatus, referralStatusChangedAt, acceptedByUserId, createdAt]);

  const handleEditRequestSubmit = useCallback(async (reason: string, professorIds: string[]) => {
    try {
      await submitEditRequest(id, reason, professorIds);
      setIsEditRequestOpen(false);
      onEditRequestSubmitted?.();
      sendSystemNotification("📝 Edit Request Submitted", "Your edit request has been submitted for approval.");
    } catch (error) {
      console.error("Error submitting edit request:", error);
      alert("Failed to submit edit request: " + (error as Error).message);
    }
  }, [id, onEditRequestSubmitted]);

  const handleRereferSubmit = useCallback(async (reason: string, professorIds: string[]) => {
    try {
      await submitRereferRequest(id, reason, professorIds);
      setIsRereferOpen(false);
      onRerefer?.(id);
      onEditRequestSubmitted?.();
      sendSystemNotification("🔄 Rerefer Request Submitted", "Your rereferral request has been submitted for approval.");
    } catch (error) {
      console.error("Error submitting rerefer request:", error);
      alert("Failed to submit rerefer request: " + (error as Error).message);
    }
  }, [id, onRerefer, onEditRequestSubmitted]);

  const handleDeletionRequestSubmit = useCallback(async (reason: string, professorIds: string[]) => {
    try {
      await submitDeletionRequest(id, reason, professorIds);
      setIsDeletionRequestOpen(false);
      onEditRequestSubmitted?.();
      sendSystemNotification("🗑️ Deletion Request Submitted", "Your deletion request has been submitted for approval.");
    } catch (error) {
      console.error("Error submitting deletion request:", error);
      alert("Failed to submit deletion request: " + (error as Error).message);
    }
  }, [id, onEditRequestSubmitted]);

  const isBlacklisted = referralStatus?.toLowerCase() === "blacklisted";

  return (
    <div className={`backdrop-blur-sm rounded shadow p-5 mb-3 ${
      isBlacklisted
        ? "bg-gray-100 border-2 border-gray-400 opacity-80"
        : "bg-[#87c4d8]/25 border border-[#87c4d8]/50"
    }`}>
      {isBlacklisted && (
        <div className="flex items-center gap-2 mb-3 bg-gray-800 text-white px-3 py-2 rounded">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
          <span className="text-[11px] font-bold uppercase tracking-widest">Blacklisted — This referral cannot be accepted</span>
        </div>
      )}
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h3 className={`font-bold text-sm mb-2 leading-tight ${isBlacklisted ? "text-gray-500 line-through" : "text-secondary"}`}>
            {treatmentServiceDestination ? (
              <>
                {`Referring ${ageProp ?? parseInt(title?.match(/(\d+) yr/)?.[1] ?? "0")} yr. old patient for `}
                <span className={isBlacklisted ? "" : "bg-accent/20 text-secondary px-1 py-0.5 rounded"}>
                  {treatmentServiceDestination}
                </span>
                {specialCase ? ` (${specialCase})` : ""}
              </>
            ) : title}
          </h3>
          {createdByName && (
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Created by</span>
              <span className="text-[10px] font-semibold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">{createdByName}</span>
            </div>
          )}
          <div className="space-y-2.5 text-xs text-gray-700">
            {medicalAlert && (
              <div className="bg-red-50 border-l-4 border-red-600 px-2 py-1.5 rounded-sm flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-red-900 text-[10px] uppercase tracking-wide shrink-0">Medical Alert:</span>
                {medicalAlert.split(",").map((a) => a.trim()).filter(Boolean).map((alert, i) => (
                  <span key={i} className="inline-flex items-center bg-red-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-sm">
                    {alert}
                  </span>
                ))}
              </div>
            )}
            
            {/* Clinical Pathway - Origin */}
            {(clinicalSectionOrigin || clinicalDisciplineOrigin || treatmentServiceOrigin) && (
              <div className="bg-blue-50 p-3 rounded border-l-4 border-info">
                <p className="font-semibold text-info mb-1.5 text-xs uppercase tracking-wide">Clinical Pathway - Origin</p>
                {clinicalSectionOrigin && <p className="text-gray-700"><span className="font-semibold">Section:</span> {clinicalSectionOrigin}</p>}
                {clinicalDisciplineOrigin && <p className="text-gray-700"><span className="font-semibold">Discipline:</span> {clinicalDisciplineOrigin}</p>}
                {treatmentServiceOrigin && <p className="text-gray-700"><span className="font-semibold">Treatment:</span> {treatmentServiceOrigin}</p>}
              </div>
            )}
            
            {/* Clinical Pathway - Destination */}
            {(clinicalSectionDestination || clinicalDisciplineDestination || treatmentServiceDestination) && (
              <div className="bg-green-50 p-3 rounded border-l-4 border-success">
                <p className="font-semibold text-success mb-1.5 text-xs uppercase tracking-wide">Clinical Pathway - Destination</p>
                {clinicalSectionDestination && <p className="text-gray-700"><span className="font-semibold">Section:</span> {clinicalSectionDestination}</p>}
                {clinicalDisciplineDestination && <p className="text-gray-700"><span className="font-semibold">Discipline:</span> {clinicalDisciplineDestination}</p>}
                {treatmentServiceDestination && <p className="text-gray-700"><span className="font-semibold">Treatment:</span> {treatmentServiceDestination}</p>}
              </div>
            )}
            
            {notesAndIndications && (
              <div className="bg-muted p-2 rounded border border-gray-300">
                <span className="font-semibold uppercase tracking-wide text-[10px]">Notes and Special Indications: </span>
                <span className="[&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4" dangerouslySetInnerHTML={{ __html: notesAndIndications }} />
              </div>
            )}

            {editRequestReason && editRequestStatus === "declined" && !deletionRequestPage && (
              <div className="bg-gray-50 p-3 rounded border-l-4 border-gray-400">
                <p className="font-semibold text-gray-700 mb-1 text-xs uppercase tracking-wide">Reason for Decline</p>
                <p className="text-gray-600">{editRequestReason}</p>
              </div>
            )}
            {rereferRequestReason && rereferRequestStatus === "declined" && (
              <div className="bg-gray-50 p-3 rounded border-l-4 border-gray-400">
                <p className="font-semibold text-gray-700 mb-1 text-xs uppercase tracking-wide">Rerefer Decline Reason</p>
                <p className="text-gray-600">{rereferRequestReason}</p>
              </div>
            )}
            {editRequestReason && editRequestStatus === "pending" && (
              <div className="bg-amber-50 p-3 rounded border-l-4 border-amber-500">
                <p className="font-semibold text-amber-800 mb-1 text-xs uppercase tracking-wide">Edit Request Reason</p>
                <p className="text-gray-700">{editRequestReason}</p>
                {onApproveEditRequest && onDeclineEditRequest && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => onApproveEditRequest(id)}
                      className="px-4 py-1.5 bg-success text-white text-[10px] font-bold rounded hover:bg-success/90 transition-colors uppercase tracking-wide shadow"
                    >
                      APPROVE EDIT
                    </button>
                    <button
                      onClick={() => onDeclineEditRequest(id)}
                      className="px-4 py-1.5 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700 transition-colors uppercase tracking-wide shadow"
                    >
                      DECLINE EDIT
                    </button>
                  </div>
                )}
              </div>
            )}
            {deletionRequestReason && deletionRequestStatus === "pending" && (
              <div className="bg-red-50 p-3 rounded border-l-4 border-red-500">
                <p className="font-semibold text-red-800 mb-1 text-xs uppercase tracking-wide">Deletion Request Reason</p>
                <p className="text-gray-700">{deletionRequestReason}</p>
              </div>
            )}
            {deletionRequestReason && deletionRequestStatus === "declined" && (
              <div className="bg-gray-50 p-3 rounded border-l-4 border-gray-400">
                <p className="font-semibold text-gray-700 mb-1 text-xs uppercase tracking-wide">Reason for Decline</p>
                <p className="text-gray-600">{deletionRequestReason}</p>
              </div>
            )}
            {acceptedBy && acceptedBy !== 'None' && (
              <div className="bg-secondary/5 px-3 py-2 rounded-lg border border-secondary/20">
                <p className="font-bold text-secondary text-[10px] uppercase tracking-wide mb-1.5">Acceptance Details</p>
                <div className="grid grid-cols-3 gap-x-4">
                  {chartNumber && (
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Chart No.</p>
                      <p className="text-[11px] font-bold text-secondary">{chartNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Accepted By</p>
                    <p className="text-[11px] font-semibold text-gray-800">{acceptedBy}</p>
                  </div>
                  {acceptedAt && (
                    <div className={chartNumber ? "" : "col-span-2"}>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Accepted On</p>
                      <p className="text-[11px] text-gray-600">{new Date(acceptedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2">
          <div className="flex flex-col items-start gap-2">
            <div className="flex gap-2">
              {/* APPROVE button - Show when showApprove is true */}
              {showApprove && (
                <Button
                  size="sm"
                  onClick={() => onApprove?.(id)}
                  className="text-xs px-4 py-1.5 h-8 bg-success text-white hover:bg-success/90 font-bold uppercase tracking-wide shadow"
                >
                  APPROVE
                </Button>
              )}
              
              {/* DECLINE button - Show when showDecline is true */}
              {showDecline && (
                <Button
                  size="sm"
                  onClick={() => onDecline?.(id)}
                  className="text-xs px-4 py-1.5 h-8 bg-red-600 text-white hover:bg-red-700 font-bold uppercase tracking-wide shadow"
                >
                  DECLINE
                </Button>
              )}
            </div>
            
            {/* Status Badge - Show based on referral status (hide on accepted referrals page and edit request page) */}
            {!showUpdate && !acceptedReferralsPage && !editRequestPage && acceptedBy && acceptedBy !== 'None' && (
              <>
                {status === 'pending' && (
                  <div className="bg-orange-100 border-2 border-orange-500 text-orange-800 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide">
                    PENDING
                  </div>
                )}
                {status === 'approved' && (
                  <div className="bg-green-100 border-2 border-success text-success px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide">
                    APPROVED
                  </div>
                )}
              </>
            )}
          </div>
          
          {showAccept && !isBlacklisted && (
            <Button
              size="sm"
              onClick={() => onAccept?.(id)}
              className="text-xs px-6 py-1.5 h-8 bg-secondary text-white hover:bg-secondary/90 font-bold uppercase tracking-wide shadow"
            >
              ACCEPT
            </Button>
          )}
          
          {/* Edit Request Status Badge */}
          {editRequestPage && editRequestStatus && (
            <>
              {editRequestStatus === "pending" && (
                <div className="bg-amber-50 border-2 border-amber-500 text-amber-700 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide">
                  PENDING
                </div>
              )}
              {editRequestStatus === "approved" && (
                <div className="bg-green-100 border-2 border-success text-success px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide">
                  APPROVED
                </div>
              )}
              {editRequestStatus === "declined" && (
                <div className="bg-red-100 border-2 border-red-500 text-red-600 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide">
                  DECLINED
                </div>
              )}
            </>
          )}

          {/* Deletion Request Status Badge */}
          {deletionRequestPage && deletionRequestStatus && (
            <>
              {deletionRequestStatus === "pending" && (
                <div className="bg-orange-50 border-2 border-orange-500 text-orange-700 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide">
                  PENDING DELETION
                </div>
              )}
              {deletionRequestStatus === "approved" && (
                <div className="bg-green-100 border-2 border-success text-success px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide">
                  DELETION APPROVED
                </div>
              )}
              {deletionRequestStatus === "declined" && (
                <div className="bg-red-100 border-2 border-red-500 text-red-600 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide">
                  DECLINED
                </div>
              )}
            </>
          )}

          {/* Accepted Referral Status Badge */}
          {/* Pending Rerefer Badge */}
          {acceptedReferralsPage && rereferRequestStatus === "pending" && (
            <div className="bg-amber-100 border-2 border-amber-500 text-amber-700 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide">
              PENDING REREFER
            </div>
          )}
          {acceptedReferralsPage && rereferRequestStatus === "approved" && (
            <div className="bg-green-100 border-2 border-green-500 text-green-700 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide">
              REREFER APPROVED
            </div>
          )}
          {acceptedReferralsPage && rereferRequestStatus === "declined" && (
            <div className="bg-red-100 border-2 border-red-500 text-red-600 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide">
              DECLINED
            </div>
          )}
          {referralStatus && (acceptedReferralsPage || (acceptedBy && acceptedBy !== "None")) && (
            <div className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide border-2 ${
              referralStatus === "ongoing"
                ? "bg-blue-100 border-blue-500 text-blue-700"
                : referralStatus === "completed"
                ? "bg-green-100 border-green-500 text-green-700"
                : referralStatus === "deferred"
                ? "bg-red-100 border-red-500 text-red-700"
                : referralStatus === "blacklisted"
                ? "bg-gray-800 border-gray-900 text-white"
                : "bg-blue-100 border-blue-500 text-blue-700"
            }`}>
              {referralStatus}
            </div>
          )}

          {/* Pending Request Badges — professor "All Referrals" tab (only for advisees) */}
          {showUpdate && editRequestStatus === "pending" && editRequestReason && (!isProfessor || isAdvisee) && !editRequestPage && !deletionRequestPage && (
            <div className="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide border-2 bg-amber-50 border-amber-500 text-amber-700">
              Pending Edit
            </div>
          )}
          {showUpdate && rereferRequestStatus === "pending" && (!isProfessor || isAdvisee) && !editRequestPage && !deletionRequestPage && (
            <div className="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide border-2 bg-purple-50 border-purple-500 text-purple-700">
              Pending Rerefer
            </div>
          )}
          {showUpdate && deletionRequestStatus === "pending" && (!isProfessor || isAdvisee) && !editRequestPage && !deletionRequestPage && (
            <div className="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide border-2 bg-orange-50 border-orange-500 text-orange-700">
              Pending Deletion
            </div>
          )}
          {statusChangeReason && (
            <div className="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide border-2 bg-yellow-50 border-yellow-500 text-yellow-700 flex items-center gap-1">
              <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Pending Status Change
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-2 border-gray-300 shadow-lg rounded">
              <DropdownMenuItem onClick={() => setIsDetailsOpen(true)}>View Details</DropdownMenuItem>
              {!completedReferralsPage && !isBlacklisted && acceptedReferralsPage && rereferRequestStatus === "approved" ? (
                <>
                  <DropdownMenuItem
                    className="text-blue-600 font-semibold"
                    onClick={() => setIsEditOpen(true)}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-green-700 font-semibold"
                    onClick={async () => {
                      try {
                        await sendBackToSystem(id);
                        onSendBackToSystem?.(id);
                        sendSystemNotification("🔄 Referral Sent Back", "The referral has been sent back to the system.");
                      } catch (e) {
                        console.error("Error sending back to system:", e);
                      }
                    }}
                  >
                    Send Back to System
                  </DropdownMenuItem>
                </>
              ) : !completedReferralsPage && !isBlacklisted && acceptedReferralsPage ? (
                <>
                  <DropdownMenuItem
                    className="text-blue-600 font-semibold"
                    onClick={() => setIsStatusPickerOpen(true)}
                  >
                    Edit Status
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-amber-600 font-semibold cursor-pointer"
                    onClick={() => setIsRereferOpen(true)}
                  >
                    Re-refer
                  </DropdownMenuItem>
                </>
              ) : !isBlacklisted && deletionRequestPage ? (
                <>
                  {deletionRequestStatus === "pending" && (
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => setIsCancelDeletionRequestOpen(true)}
                    >
                      Cancel Request
                    </DropdownMenuItem>
                  )}
                  {deletionRequestStatus === "declined" && (
                    <>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setIsDeletionRequestOpen(true)}
                      >
                        Request to Delete
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-gray-600"
                        onClick={() => setIsCancelDeletionRequestOpen(true)}
                      >
                        Cancel Request
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              ) : !isBlacklisted && editRequestPage ? (
                <>
                  {editRequestStatus === "approved" && (
                    <DropdownMenuItem onClick={() => setIsEditOpen(true)}>Edit</DropdownMenuItem>
                  )}
                  {editRequestStatus === "declined" && (
                    <DropdownMenuItem
                      className="text-blue-600"
                      onClick={() => setIsEditRequestOpen(true)}
                    >
                      Request to Edit
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => setIsCancelEditRequestOpen(true)}
                  >
                    Cancel Request
                  </DropdownMenuItem>
                </>
              ) : !isBlacklisted && isProfessor ? (
                <>
                  <DropdownMenuItem onClick={() => setIsEditOpen(true)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              ) : !isBlacklisted ? (
                userId === getCurrentUserId() && (
                  <>
                    {showEditOption && (
                      <DropdownMenuItem onClick={() => setIsEditOpen(true)}>Edit</DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-blue-600"
                      onClick={() => setIsEditRequestOpen(true)}
                    >
                      Request to Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => setIsDeletionRequestOpen(true)}
                    >
                      Request to Delete
                    </DropdownMenuItem>
                  </>
                )
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {createdAt && (
        <div className="flex justify-end mt-2 pt-2 border-t border-[#87c4d8]/40">
          <span className="text-[10px] text-secondary/60 font-semibold">
            Posted {new Date(createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
          </span>
        </div>
      )}
      <EditRequestDialog
        open={isEditRequestOpen}
        onCancel={() => setIsEditRequestOpen(false)}
        onSubmit={handleEditRequestSubmit}
      />
      <RereferRequestDialog
        open={isRereferOpen}
        onCancel={() => setIsRereferOpen(false)}
        onSubmit={handleRereferSubmit}
      />
      <DeleteConfirmDialog
        open={isDeleteConfirmOpen}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => { setIsDeleteConfirmOpen(false); onDelete?.(id); }}
      />
      <ViewDetailsModal referral={referralData} isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} hideChartNumber={showAccept} />
      <EditReferralModal referral={referralData} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} onSave={async (id, updates) => {
        await onUpdate?.(id, updates);
        setIsEditOpen(false);
        if (rereferRequestStatus === "approved") {
          try {
            await sendBackToSystem(id);
            onSendBackToSystem?.(id);
            sendSystemNotification("🔄 Referral Sent Back", "The referral has been edited and sent back to the system.");
          } catch (e) {
            console.error("Error sending back to system after edit:", e);
          }
        }
      }} />
      <DeleteRequestDialog open={isDeletionRequestOpen} onCancel={() => setIsDeletionRequestOpen(false)} onSubmit={handleDeletionRequestSubmit} />

      {/* Cancel Edit Request Confirmation Dialog — portaled to body */}
      {isCancelEditRequestOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setIsCancelEditRequestOpen(false)}
          />
          <div className="relative bg-white rounded shadow-2xl border-2 border-gray-300 w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2 uppercase tracking-wide">Cancel Edit Request</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to cancel this edit request? The referral will be removed from your edit requests.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIsCancelEditRequestOpen(false); onCancelEditRequest?.(id); }}
                  className="flex-1 px-6 py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors shadow uppercase tracking-wide"
                >
                  YES, CANCEL
                </button>
                <button
                  type="button"
                  onClick={() => setIsCancelEditRequestOpen(false)}
                  className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded hover:bg-muted transition-colors uppercase tracking-wide"
                >
                  GO BACK
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Cancel Deletion Request Confirmation Dialog */}
      {isCancelDeletionRequestOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setIsCancelDeletionRequestOpen(false)}
          />
          <div className="relative bg-white rounded shadow-2xl border-2 border-gray-300 w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2 uppercase tracking-wide">Cancel Deletion Request</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to cancel this deletion request? The referral will be removed from your deletion requests.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIsCancelDeletionRequestOpen(false); onCancelDeletionRequest?.(id); }}
                  className="flex-1 px-6 py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors shadow uppercase tracking-wide"
                >
                  YES, CANCEL
                </button>
                <button
                  type="button"
                  onClick={() => setIsCancelDeletionRequestOpen(false)}
                  className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded hover:bg-muted transition-colors uppercase tracking-wide"
                >
                  GO BACK
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Status Picker Dialog */}
      {isStatusPickerOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setIsStatusPickerOpen(false)}
          />
          <div className="relative bg-white rounded shadow-2xl border-2 border-gray-300 w-full max-w-sm mx-4 p-6">
            <div className="text-center">
              <h3 className="text-lg font-bold text-secondary mb-2 uppercase tracking-wide">Edit Status</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select a status for this referral
              </p>
              <div className="space-y-2 mb-6">
                {[
                  { value: "ongoing", label: "ONGOING", className: "bg-blue-100 border-blue-500 text-blue-700 hover:bg-blue-200" },
                  { value: "completed", label: "COMPLETED", className: "bg-green-100 border-green-500 text-green-700 hover:bg-green-200" },
                  { value: "deferred", label: "DEFERRED", className: "bg-red-100 border-red-500 text-red-700 hover:bg-red-200" },
                  { value: "blacklisted", label: "BLACKLISTED", className: "bg-gray-800 border-gray-900 text-white hover:bg-gray-700" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      if (option.value === "deferred" || option.value === "blacklisted") {
                        setPendingStatus(option.value);
                        setIsStatusPickerOpen(false);
                      } else {
                        onStatusChange?.(id, option.value);
                        setIsStatusPickerOpen(false);
                      }
                    }}
                    className={`w-full px-4 py-3 rounded border-2 text-xs font-bold uppercase tracking-wide transition-colors ${option.className} ${
                      referralStatus === option.value ? "ring-2 ring-offset-2 ring-gray-400" : ""
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIsStatusPickerOpen(false)}
                className="w-full px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded hover:bg-muted transition-colors uppercase tracking-wide"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <StatusChangeReasonDialog
        open={!!pendingStatus}
        statusLabel={pendingStatus ? pendingStatus.charAt(0).toUpperCase() + pendingStatus.slice(1) : ""}
        onCancel={() => setPendingStatus(null)}
        onSubmit={async (reason, professorIds) => {
          if (!pendingStatus) return;
          try {
            await (supabase.from("referrals") as any).update({
              status_change_reason: `${pendingStatus}::${reason}`,
              status_change_professor_ids: professorIds,
            } as any).eq("id", id);
          } catch {}
          setPendingStatus(null);
          onEditRequestSubmitted?.();
          sendSystemNotification(
            `📋 Status Change Request Submitted`,
            `Your request to change status to ${pendingStatus} has been sent to the assigned professor for approval.`
          );
        }}
      />
    </div>
  );
}

interface FeaturedReferralCardProps {
  id: string;
  title: string;
  medicalAlert?: string;
  clinicalSectionOrigin?: string;
  clinicalSectionDestination?: string;
  clinicalDisciplineOrigin?: string;
  clinicalDisciplineDestination?: string;
  treatmentServiceOrigin?: string;
  treatmentServiceDestination?: string;
  notesAndIndications?: string;
  chartNumber?: string;
  acceptedBy?: string;
  acceptedAt?: string | null;
  status?: string;
  createdAt?: string;
  treatment?: string;
  medicalHistory?: string;
  isFeatured?: boolean;
  specialCase?: string;
  tentativeAppointment?: string;
  age?: number;
  sex?: string | null;
  userId?: string;
  showEditOption?: boolean;
  editRequestReason?: string | null;
  editRequestStatus?: string | null;
  initiallyReferredBy?: string;
  approvedBy?: string;
  currentlyReferredBy?: string;
  currentApprovedBy?: string;
  onAccept?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Referral>) => void;
  onDelete?: (id: string) => void;
  onApproveEditRequest?: (id: string) => void;
  onDeclineEditRequest?: (id: string) => void;
  onEditRequestSubmitted?: () => void;
}

export function FeaturedReferralCard({
  id,
  title,
  medicalAlert,
  clinicalSectionOrigin,
  clinicalSectionDestination,
  clinicalDisciplineOrigin,
  clinicalDisciplineDestination,
  treatmentServiceOrigin,
  treatmentServiceDestination,
  notesAndIndications,
  chartNumber,
  acceptedBy,
  acceptedAt,
  status,
  createdAt,
  treatment,
  medicalHistory,
  isFeatured,
  specialCase,
  tentativeAppointment,
  age: agePropFeatured,
  sex: sexFeatured,
  initiallyReferredBy,
  approvedBy,
  currentlyReferredBy,
  currentApprovedBy,
  userId,
  showEditOption = false,
  editRequestReason,
  editRequestStatus,
  onAccept,
  onUpdate,
  onDelete,
  onApproveEditRequest,
  onDeclineEditRequest,
  onEditRequestSubmitted,
}: FeaturedReferralCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEditRequestOpen, setIsEditRequestOpen] = useState(false);
  const [isDeletionRequestOpen, setIsDeletionRequestOpen] = useState(false);

  const handleDeletionRequestSubmit = async (reason: string, professorIds: string[]) => {
    try {
      await submitDeletionRequest(id, reason, professorIds);
      setIsDeletionRequestOpen(false);
      onEditRequestSubmitted?.();
    } catch (error) {
      console.error("Error submitting deletion request:", error);
      alert("Failed to submit deletion request: " + (error as Error).message);
    }
  };

  const referralData: Referral = {
    id,
    user_id: userId || "",
    chart_number: chartNumber || "",
    treatment: treatment || null,
    age: agePropFeatured ?? (title ? parseInt(title.match(/(\d+) yr/)?.[1] || "0") : null),
    sex: sexFeatured || null,
    medical_alert: medicalAlert || null,
    clinical_section_origin: clinicalSectionOrigin || "",
    clinical_section_destination: clinicalSectionDestination || "",
    clinical_discipline_origin: clinicalDisciplineOrigin || null,
    clinical_discipline_destination: clinicalDisciplineDestination || null,
    treatment_service_origin: treatmentServiceOrigin || null,
    treatment_service_destination: treatmentServiceDestination || null,
    special_case: specialCase || null,
    tentative_appointment_schedule: tentativeAppointment || null,
    medical_history: medicalHistory || null,
    notes_and_special_indications: notesAndIndications || null,
    status: status || "pending",
    is_featured: isFeatured || false,
    accepted_by: acceptedBy || "None",
    accepted_by_user_id: null,
    accepted_at: acceptedAt || null,
    edit_request_reason: editRequestReason || null,
    edit_request_status: editRequestStatus || null,
    last_edited_by: null,
    last_edited_at: null,
    referral_status: "ongoing",
    referral_status_changed_at: null,
    rerefer_request_reason: null,
    rerefer_request_status: null,
    rerefer_requested_by: null,
    rerefer_requested_at: null,
    rerefer_approved_by: null,
    rerefer_approved_at: null,
    rerefer_declined_by: null,
    rerefer_declined_at: null,
    deletion_request_reason: null,
    deletion_request_status: null,
    deletion_requested_by: null,
    deletion_requested_at: null,
    created_at: createdAt || new Date().toISOString(),
  };

  const handleEditRequestSubmit = async (reason: string, professorIds: string[]) => {
    try {
      await submitEditRequest(id, reason, professorIds);
      setIsEditRequestOpen(false);
      onEditRequestSubmitted?.();
    } catch (error) {
      console.error("Error submitting edit request:", error);
      alert("Failed to submit edit request: " + (error as Error).message);
    }
  };

  return (
    <div className="bg-[#87c4d8]/25 backdrop-blur-sm rounded border-2 border-[#87c4d8]/50 p-4 shadow relative">
      {/* Dropdown Menu */}
      <div className="absolute top-3 right-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border-2 border-gray-300 shadow-lg rounded">
            <DropdownMenuItem onClick={() => setIsDetailsOpen(true)}>View Details</DropdownMenuItem>
            {userId === getCurrentUserId() && (
              <>
                {showEditOption && (
                  <DropdownMenuItem onClick={() => setIsEditOpen(true)}>Edit</DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-blue-600"
                  onClick={() => setIsEditRequestOpen(true)}
                >
                  Request to Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => setIsDeletionRequestOpen(true)}
                >
                  Request to Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h4 className="text-secondary font-bold text-sm mb-4 leading-tight pr-8">
        {title}
      </h4>
      <div className="text-xs space-y-2.5 text-gray-700">
        {medicalAlert && (
          <div className="bg-red-50 border-l-4 border-red-600 px-2 py-1.5 rounded-sm flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-red-900 text-[10px] uppercase tracking-wide shrink-0">Medical Alert:</span>
            {medicalAlert.split(",").map((a) => a.trim()).filter(Boolean).map((alert, i) => (
              <span key={i} className="inline-flex items-center bg-red-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-sm">
                {alert}
              </span>
            ))}
          </div>
        )}
        
        {/* Clinical Pathway - Origin */}
        {(clinicalSectionOrigin || clinicalDisciplineOrigin || treatmentServiceOrigin) && (
          <div className="bg-blue-50 p-3 rounded border-l-4 border-info">
            <p className="font-semibold text-info mb-1.5 text-xs uppercase tracking-wide">Origin</p>
            {clinicalSectionOrigin && <p className="text-gray-700 text-xs"><span className="font-semibold">Section:</span> {clinicalSectionOrigin}</p>}
            {clinicalDisciplineOrigin && <p className="text-gray-700 text-xs"><span className="font-semibold">Discipline:</span> {clinicalDisciplineOrigin}</p>}
            {treatmentServiceOrigin && <p className="text-gray-700 text-xs"><span className="font-semibold">Treatment:</span> {treatmentServiceOrigin}</p>}
          </div>
        )}
        
        {/* Clinical Pathway - Destination */}
        {(clinicalSectionDestination || clinicalDisciplineDestination || treatmentServiceDestination) && (
          <div className="bg-green-50 p-3 rounded border-l-4 border-success">
            <p className="font-semibold text-success mb-1.5 text-xs uppercase tracking-wide">Destination</p>
            {clinicalSectionDestination && <p className="text-gray-700 text-xs"><span className="font-semibold">Section:</span> {clinicalSectionDestination}</p>}
            {clinicalDisciplineDestination && <p className="text-gray-700 text-xs"><span className="font-semibold">Discipline:</span> {clinicalDisciplineDestination}</p>}
            {treatmentServiceDestination && <p className="text-gray-700 text-xs"><span className="font-semibold">Treatment:</span> {treatmentServiceDestination}</p>}
          </div>
        )}
        
        {notesAndIndications && (
          <div className="bg-muted p-2 rounded border border-gray-300">
            <span className="font-semibold">Notes: </span>
            <span className="[&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4" dangerouslySetInnerHTML={{ __html: notesAndIndications }} />
          </div>
        )}
        {acceptedBy && acceptedBy !== 'None' && (
          <div className="bg-secondary/5 p-3 rounded-lg border border-secondary/20">
            <p className="font-bold text-secondary text-[10px] uppercase tracking-wide mb-2">Acceptance Details</p>
            {chartNumber && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Chart No.</span>
                <span className="text-xs font-bold text-secondary">{chartNumber}</span>
              </div>
            )}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Accepted by</span>
              <span className="text-xs font-semibold text-gray-800">{acceptedBy}</span>
            </div>
            {acceptedAt && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Accepted on</span>
                <span className="text-xs text-gray-600">{new Date(acceptedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</span>
              </div>
            )}
          </div>
        )}
        {initiallyReferredBy && (
          <p><span className="font-semibold text-secondary">Initially Referred By:</span> {initiallyReferredBy}</p>
        )}
        {approvedBy && (
          <p><span className="font-semibold text-secondary">Approved By:</span> {approvedBy}</p>
        )}
        {currentlyReferredBy && (
          <p><span className="font-semibold text-secondary">Currently Referred By:</span> {currentlyReferredBy}</p>
        )}
        {currentApprovedBy && (
          <p><span className="font-semibold text-secondary">Approved By:</span> {currentApprovedBy}</p>
        )}
      </div>
      {onAccept && userId !== getCurrentUserId() && (
        <button
          onClick={() => onAccept(id)}
          className="w-full mt-4 bg-secondary text-white text-xs font-bold py-2.5 px-6 rounded hover:bg-secondary/90 transition-colors shadow uppercase tracking-wide"
        >
          ACCEPT
        </button>
      )}
      <EditRequestDialog
        open={isEditRequestOpen}
        onCancel={() => setIsEditRequestOpen(false)}
        onSubmit={handleEditRequestSubmit}
      />
      <DeleteConfirmDialog
        open={isDeleteConfirmOpen}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => { setIsDeleteConfirmOpen(false); onDelete?.(id); }}
      />
      <ViewDetailsModal referral={referralData} isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} hideChartNumber={onAccept && userId !== getCurrentUserId()} />
      <EditReferralModal referral={referralData} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} onSave={(id, updates) => { onUpdate?.(id, updates); setIsEditOpen(false); }} />
      <DeleteRequestDialog open={isDeletionRequestOpen} onCancel={() => setIsDeletionRequestOpen(false)} onSubmit={handleDeletionRequestSubmit} />
    </div>
  );
}

// Memoized versions for performance optimization
export const MemoizedReferralCard = memo(ReferralCard);
export const MemoizedFeaturedReferralCard = memo(FeaturedReferralCard);
