"use client";

import React from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  onUpdate?: (id: string) => void;
  onAccept?: (id: string) => void;
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
  onUpdate,
  onAccept,
  onDelete,
}: ReferralCardProps) {
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdate?.(id)}
              className="text-xs px-4 py-1.5 h-8 border-2 border-secondary text-secondary hover:bg-secondary/10 font-semibold"
            >
              UPDATE
            </Button>
            
            {/* Status Badge - Only show if referral has been accepted */}
            {status === 'pending' && acceptedBy && acceptedBy !== 'None' && (
              <div className="bg-orange-100 border border-orange-300 text-orange-700 px-3 py-1 rounded text-xs font-semibold">
                PENDING
              </div>
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
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Edit</DropdownMenuItem>
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
    </div>
  );
}

interface FeaturedReferralCardProps {
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
  initiallyReferredBy?: string;
  approvedBy?: string;
  currentlyReferredBy?: string;
  currentApprovedBy?: string;
  onAccept?: () => void;
}

export function FeaturedReferralCard({
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
  initiallyReferredBy,
  approvedBy,
  currentlyReferredBy,
  currentApprovedBy,
  onAccept,
}: FeaturedReferralCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <h4 className="text-secondary font-bold text-sm underline cursor-pointer mb-3 leading-tight">
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
    </div>
  );
}
