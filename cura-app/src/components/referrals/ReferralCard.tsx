"use client";

import React, { useState } from "react";
import { MoreHorizontal } from "lucide-react";
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
  onUpdate?: (id: string, updates: Partial<Referral>) => void;
  onAccept?: (id: string) => void;
  onApprove?: (id: string) => void;
  onDecline?: (id: string) => void;
  onDelete?: (id: string) => void;
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
  onUpdate,
  onAccept,
  onApprove,
  onDecline,
  onDelete,
}: ReferralCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const referralData: Referral = {
    id,
    chart_number: chartNumber || "",
    treatment: treatment || null,
    age: title ? parseInt(title.match(/(\d+) yr/)?.[1] || "0") : null,
    medical_alert: medicalAlert || null,
    clinical_section_origin: clinicalSectionOrigin || "",
    clinical_section_destination: clinicalSectionDestination || "",
    clinical_discipline_origin: clinicalDisciplineOrigin || null,
    clinical_discipline_destination: clinicalDisciplineDestination || null,
    treatment_service_origin: treatmentServiceOrigin || null,
    treatment_service_destination: treatmentServiceDestination || null,
    medical_history: medicalHistory || null,
    notes_and_special_indications: notesAndIndications || null,
    status: status || "pending",
    is_featured: isFeatured || false,
    accepted_by: acceptedBy || "None",
    created_at: createdAt || new Date().toISOString(),
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h3 className="text-secondary font-semibold text-sm mb-3">
            {title}
          </h3>
          <div className="space-y-1 text-xs text-gray-700">
            {medicalAlert && <p><span className="font-medium">Medical Alert:</span> {medicalAlert}</p>}
            
            {/* Clinical Pathway - Origin */}
            {(clinicalSectionOrigin || clinicalDisciplineOrigin || treatmentServiceOrigin) && (
              <div className="bg-blue-50 p-2 rounded border border-blue-200">
                <p className="font-medium text-blue-800 mb-1">Clinical Pathway - Origin:</p>
                {clinicalSectionOrigin && <p className="text-blue-700"><span className="font-medium">Section:</span> {clinicalSectionOrigin}</p>}
                {clinicalDisciplineOrigin && <p className="text-blue-700"><span className="font-medium">Discipline:</span> {clinicalDisciplineOrigin}</p>}
                {treatmentServiceOrigin && <p className="text-blue-700"><span className="font-medium">Treatment:</span> {treatmentServiceOrigin}</p>}
              </div>
            )}
            
            {/* Clinical Pathway - Destination */}
            {(clinicalSectionDestination || clinicalDisciplineDestination || treatmentServiceDestination) && (
              <div className="bg-green-50 p-2 rounded border border-green-200">
                <p className="font-medium text-green-800 mb-1">Clinical Pathway - Destination:</p>
                {clinicalSectionDestination && <p className="text-green-700"><span className="font-medium">Section:</span> {clinicalSectionDestination}</p>}
                {clinicalDisciplineDestination && <p className="text-green-700"><span className="font-medium">Discipline:</span> {clinicalDisciplineDestination}</p>}
                {treatmentServiceDestination && <p className="text-green-700"><span className="font-medium">Treatment:</span> {treatmentServiceDestination}</p>}
              </div>
            )}
            
            {notesAndIndications && <p><span className="font-medium">Notes and Special Indications:</span> {notesAndIndications}</p>}
            {chartNumber && <p><span className="font-medium">Chart Number:</span> {chartNumber}</p>}
            {acceptedBy && <p><span className="font-medium">Accepted by:</span> {acceptedBy}</p>}
          </div>
        </div>

        <div className="flex items-start gap-2">
          <div className="flex flex-col items-start gap-2">
            <div className="flex gap-2">
              {/* UPDATE button - Show based on showUpdate prop or if referral has been accepted */}
              {(showUpdate || (acceptedBy && acceptedBy !== 'None')) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(true)}
                  className="text-xs px-4 py-1.5 h-8 border-2 border-secondary text-secondary hover:bg-secondary/10 font-semibold"
                >
                  UPDATE
                </Button>
              )}
              
              {/* APPROVE button - Show when showApprove is true */}
              {showApprove && (
                <Button
                  size="sm"
                  onClick={() => onApprove?.(id)}
                  className="text-xs px-4 py-1.5 h-8 bg-green-600 text-white hover:bg-green-700 font-semibold"
                >
                  APPROVE
                </Button>
              )}
              
              {/* DECLINE button - Show when showDecline is true */}
              {showDecline && (
                <Button
                  size="sm"
                  onClick={() => onDecline?.(id)}
                  className="text-xs px-4 py-1.5 h-8 bg-red-600 text-white hover:bg-red-700 font-semibold"
                >
                  DECLINE
                </Button>
              )}
            </div>
            
            {/* Status Badge - Show based on referral status */}
            {!showUpdate && acceptedBy && acceptedBy !== 'None' && (
              <>
                {status === 'pending' && (
                  <div className="bg-orange-100 border border-orange-300 text-orange-700 px-3 py-1 rounded text-xs font-semibold">
                    PENDING
                  </div>
                )}
                {status === 'approved' && (
                  <div className="bg-green-100 border border-green-300 text-green-700 px-3 py-1 rounded text-xs font-semibold">
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
              className="text-xs px-6 py-1.5 h-8 bg-secondary text-white hover:bg-secondary/90 font-semibold"
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
            <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-lg">
              <DropdownMenuItem onClick={() => setIsDetailsOpen(true)}>View Details</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsEditOpen(true)}>Edit</DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => onDelete?.(id)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <ViewDetailsModal
        referral={referralData}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
      <EditReferralModal
        referral={referralData}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={(id, updates) => {
          onUpdate?.(id, updates);
          setIsEditOpen(false);
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
  status?: string;
  createdAt?: string;
  treatment?: string;
  medicalHistory?: string;
  isFeatured?: boolean;
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

  const referralData: Referral = {
    id,
    chart_number: chartNumber || "",
    treatment: treatment || null,
    age: title ? parseInt(title.match(/(\d+) yr/)?.[1] || "0") : null,
    medical_alert: medicalAlert || null,
    clinical_section_origin: clinicalSectionOrigin || "",
    clinical_section_destination: clinicalSectionDestination || "",
    clinical_discipline_origin: clinicalDisciplineOrigin || null,
    clinical_discipline_destination: clinicalDisciplineDestination || null,
    treatment_service_origin: treatmentServiceOrigin || null,
    treatment_service_destination: treatmentServiceDestination || null,
    medical_history: medicalHistory || null,
    notes_and_special_indications: notesAndIndications || null,
    status: status || "pending",
    is_featured: isFeatured || false,
    accepted_by: acceptedBy || "None",
    created_at: createdAt || new Date().toISOString(),
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative">
      {/* Dropdown Menu */}
      <div className="absolute top-3 right-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-lg">
            <DropdownMenuItem onClick={() => setIsDetailsOpen(true)}>View Details</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsEditOpen(true)}>Edit</DropdownMenuItem>
            <DropdownMenuItem 
              className="text-red-600"
              onClick={() => onDelete?.(id)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h4 className="text-secondary font-bold text-sm underline cursor-pointer mb-3 leading-tight pr-8">
        {title}
      </h4>
      <div className="text-xs space-y-1 text-gray-700">
        {medicalAlert && (
          <p><span className="font-medium">Medical Alert:</span> {medicalAlert}</p>
        )}
        
        {/* Clinical Pathway - Origin */}
        {(clinicalSectionOrigin || clinicalDisciplineOrigin || treatmentServiceOrigin) && (
          <div className="bg-blue-50 p-2 rounded border border-blue-200">
            <p className="font-medium text-blue-800 mb-1">Origin:</p>
            {clinicalSectionOrigin && <p className="text-blue-700 text-xs"><span className="font-medium">Section:</span> {clinicalSectionOrigin}</p>}
            {clinicalDisciplineOrigin && <p className="text-blue-700 text-xs"><span className="font-medium">Discipline:</span> {clinicalDisciplineOrigin}</p>}
            {treatmentServiceOrigin && <p className="text-blue-700 text-xs"><span className="font-medium">Treatment:</span> {treatmentServiceOrigin}</p>}
          </div>
        )}
        
        {/* Clinical Pathway - Destination */}
        {(clinicalSectionDestination || clinicalDisciplineDestination || treatmentServiceDestination) && (
          <div className="bg-green-50 p-2 rounded border border-green-200">
            <p className="font-medium text-green-800 mb-1">Destination:</p>
            {clinicalSectionDestination && <p className="text-green-700 text-xs"><span className="font-medium">Section:</span> {clinicalSectionDestination}</p>}
            {clinicalDisciplineDestination && <p className="text-green-700 text-xs"><span className="font-medium">Discipline:</span> {clinicalDisciplineDestination}</p>}
            {treatmentServiceDestination && <p className="text-green-700 text-xs"><span className="font-medium">Treatment:</span> {treatmentServiceDestination}</p>}
          </div>
        )}
        
        {notesAndIndications && (
          <p><span className="font-medium">Notes:</span> {notesAndIndications}</p>
        )}
        {chartNumber && (
          <p><span className="font-medium">Chart:</span> {chartNumber}</p>
        )}
        {initiallyReferredBy && (
          <p><span className="font-medium">Initially Referred By:</span> {initiallyReferredBy}</p>
        )}
        {approvedBy && (
          <p><span className="font-medium">Approved By:</span> {approvedBy}</p>
        )}
        {currentlyReferredBy && (
          <p><span className="font-medium">Currently Referred By:</span> {currentlyReferredBy}</p>
        )}
        {currentApprovedBy && (
          <p><span className="font-medium">Approved By:</span> {currentApprovedBy}</p>
        )}
      </div>
      {onAccept && (
        <button
          onClick={onAccept}
          className="w-full mt-4 bg-secondary text-white text-xs font-bold py-2.5 px-6 rounded-lg hover:bg-secondary/90 transition-colors"
        >
          ACCEPT
        </button>
      )}

      <ViewDetailsModal
        referral={referralData}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
      <EditReferralModal
        referral={referralData}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={(id, updates) => {
          onUpdate?.(id, updates);
          setIsEditOpen(false);
        }}
      />
    </div>
  );
}
