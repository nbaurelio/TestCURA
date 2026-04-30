"use client";

import Link from "next/link";
import { CheckCircle } from "lucide-react";

interface AcceptedReferralsButtonProps {
  count?: number;
}

export function AcceptedReferralsButton({ count }: AcceptedReferralsButtonProps) {
  return (
    <Link href="/accepted-referrals" className="block relative">
      <div className="bg-secondary text-white text-xs font-bold py-3 px-4 rounded shadow text-center uppercase tracking-wide cursor-pointer hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2">
        <CheckCircle className="h-3.5 w-3.5" />
        ACCEPTED REFERRALS
      </div>
      {count !== undefined && count > 0 && (
        <span className="absolute -top-2 -right-2 min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 shadow-md border-2 border-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
