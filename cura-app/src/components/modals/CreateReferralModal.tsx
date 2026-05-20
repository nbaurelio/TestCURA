"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CreateReferralModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewPatient?: () => void;
  onExistingPatient?: () => void;
}

export function CreateReferralModal({ 
  open, 
  onOpenChange, 
  onNewPatient,
  onExistingPatient,
}: CreateReferralModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-[300px] w-[92vw] p-0 gap-0 rounded-xl overflow-hidden shadow-xl [&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100 [&>button]:top-3 [&>button]:right-3">
        <DialogHeader className="bg-secondary p-3 sm:p-4">
          <DialogTitle className="text-white font-bold text-xs sm:text-sm uppercase tracking-wide">
            Create Referral
          </DialogTitle>
          <p className="text-white/70 text-[10px] mt-0.5">Select patient type to continue</p>
        </DialogHeader>

        <div className="p-3 sm:p-4 space-y-2.5">
          <button
            onClick={() => {
              onNewPatient?.();
              onOpenChange(false);
            }}
            className="w-full bg-gray-50 hover:bg-secondary hover:text-white border border-gray-200 rounded-lg px-4 py-3 text-left transition-colors group"
          >
            <p className="text-[10px] font-bold text-secondary group-hover:text-white uppercase tracking-wide">New Patient</p>
            <p className="text-[10px] text-gray-500 group-hover:text-white/70 mt-0.5">Create a referral for a new patient</p>
          </button>
          <button
            onClick={() => {
              onExistingPatient?.();
              onOpenChange(false);
            }}
            className="w-full bg-gray-50 hover:bg-secondary hover:text-white border border-gray-200 rounded-lg px-4 py-3 text-left transition-colors group"
          >
            <p className="text-[10px] font-bold text-secondary group-hover:text-white uppercase tracking-wide">Existing Patient</p>
            <p className="text-[10px] text-gray-500 group-hover:text-white/70 mt-0.5">Create a referral for an existing patient</p>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
