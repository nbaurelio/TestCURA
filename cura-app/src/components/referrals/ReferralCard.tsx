"use client";

import React, { useState } from "react";
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
import { Referral } from "@/lib/api/referrals";

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
  onUpdate?: (id: string, updates: Partial<Referral>) => void;
  onAccept?: (id: string) => void;
  onApprove?: (id: string) => void;
  onDecline?: (id: string) => void;
  onDelete?: (id: string) => void;
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
            onClick={onCancel}
            className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            YES, DELETE
          </button>
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
  onUpdate,
  onAccept,
  onApprove,
  onDecline,
  onDelete,
}: ReferralCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const referralData: Referral = {
    id,
    chart_number: chartNumber || "",
    treatment: treatment || null,
    age: ageProp ?? (title ? parseInt(title.match(/(\d+) yr/)?.[1] || "0") : null),
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
    created_at: createdAt || new Date().toISOString(),
  };

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded shadow border border-gray-300 p-5 mb-3">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h3 className="text-secondary font-bold text-sm mb-4 leading-tight">
            {title}
          </h3>
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
                <span className="font-semibold">Notes and Special Indications: </span>
                <span className="[&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4" dangerouslySetInnerHTML={{ __html: notesAndIndications }} />
              </div>
            )}
            {chartNumber && acceptedBy && acceptedBy !== 'None' && <p><span className="font-semibold text-secondary">Chart Number:</span> {chartNumber}</p>}
            {acceptedBy && <p><span className="font-semibold text-secondary">Accepted by:</span> {acceptedBy}</p>}
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
            
            {/* Status Badge - Show based on referral status */}
            {!showUpdate && acceptedBy && acceptedBy !== 'None' && (
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
          
          {showAccept && (
            <Button
              size="sm"
              onClick={() => onAccept?.(id)}
              className="text-xs px-6 py-1.5 h-8 bg-secondary text-white hover:bg-secondary/90 font-bold uppercase tracking-wide shadow"
            >
              ACCEPT
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-2 border-gray-300 shadow-lg rounded">
              <DropdownMenuItem onClick={() => setIsDetailsOpen(true)}>View Details</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsEditOpen(true)}>Edit</DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => setIsDeleteConfirmOpen(true)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <DeleteConfirmDialog
        open={isDeleteConfirmOpen}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => { setIsDeleteConfirmOpen(false); onDelete?.(id); }}
      />
      <ViewDetailsModal referral={referralData} isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} />
      <EditReferralModal referral={referralData} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} onSave={(id, updates) => { onUpdate?.(id, updates); setIsEditOpen(false); }} />
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
  status?: string;
  createdAt?: string;
  treatment?: string;
  medicalHistory?: string;
  isFeatured?: boolean;
  specialCase?: string;
  tentativeAppointment?: string;
  age?: number;
  initiallyReferredBy?: string;
  approvedBy?: string;
  currentlyReferredBy?: string;
  currentApprovedBy?: string;
  onAccept?: () => void;
  onUpdate?: (id: string, updates: Partial<Referral>) => void;
  onDelete?: (id: string) => void;
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
  status,
  createdAt,
  treatment,
  medicalHistory,
  isFeatured,
  specialCase,
  tentativeAppointment,
  age: agePropFeatured,
  initiallyReferredBy,
  approvedBy,
  currentlyReferredBy,
  currentApprovedBy,
  onAccept,
  onUpdate,
  onDelete,
}: FeaturedReferralCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const referralData: Referral = {
    id,
    chart_number: chartNumber || "",
    treatment: treatment || null,
    age: agePropFeatured ?? (title ? parseInt(title.match(/(\d+) yr/)?.[1] || "0") : null),
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
    created_at: createdAt || new Date().toISOString(),
  };

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded border-2 border-gray-300 p-4 shadow relative">
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
            <DropdownMenuItem onClick={() => setIsEditOpen(true)}>Edit</DropdownMenuItem>
            <DropdownMenuItem 
              className="text-red-600"
              onClick={() => setIsDeleteConfirmOpen(true)}
            >
              Delete
            </DropdownMenuItem>
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
        {chartNumber && acceptedBy && acceptedBy !== 'None' && (
          <p><span className="font-semibold text-secondary">Chart:</span> {chartNumber}</p>
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
      {onAccept && (
        <button
          onClick={onAccept}
          className="w-full mt-4 bg-secondary text-white text-xs font-bold py-2.5 px-6 rounded hover:bg-secondary/90 transition-colors shadow uppercase tracking-wide"
        >
          ACCEPT
        </button>
      )}
      <DeleteConfirmDialog
        open={isDeleteConfirmOpen}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => { setIsDeleteConfirmOpen(false); onDelete?.(id); }}
      />
      <ViewDetailsModal referral={referralData} isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} />
      <EditReferralModal referral={referralData} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} onSave={(id, updates) => { onUpdate?.(id, updates); setIsEditOpen(false); }} />
    </div>
  );
}
