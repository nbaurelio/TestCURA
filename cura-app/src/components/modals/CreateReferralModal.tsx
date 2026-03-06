"use client";

import React from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
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
      <DialogContent className="bg-background max-w-[380px] p-0 gap-0 rounded-2xl overflow-hidden border-0 [&>button]:hidden">
        {/* Header */}
        <div className="bg-[#f5f0e1] p-4 flex items-center justify-between">
          <h2 className="text-secondary font-bold text-base">CREATE REFERRAL</h2>
          <button 
            onClick={() => onOpenChange(false)}
            className="w-7 h-7 border-2 border-secondary rounded flex items-center justify-center hover:bg-secondary/10"
          >
            <X className="h-4 w-4 text-secondary" />
          </button>
        </div>

        {/* Options */}
        <div className="p-6 space-y-4">
          <button
            onClick={() => {
              onNewPatient?.();
              onOpenChange(false);
            }}
            className="w-full py-3 px-6 bg-primary/40 rounded-full text-secondary font-medium text-sm hover:bg-primary/60 transition-colors"
          >
            New Patient
          </button>
          <button
            onClick={() => {
              onExistingPatient?.();
              onOpenChange(false);
            }}
            className="w-full py-3 px-6 bg-primary/40 rounded-full text-secondary font-medium text-sm hover:bg-primary/60 transition-colors"
          >
            Existing Patient
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
