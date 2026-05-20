"use client";

import Link from "next/link";
import { Archive } from "lucide-react";

interface ArchivedReferralsButtonProps {
  count?: number;
}

export function ArchivedReferralsButton({ count }: ArchivedReferralsButtonProps) {
  return (
    <Link href="/completed-referrals" className="block">
      <div className="bg-white border-2 border-secondary/20 rounded shadow-sm px-4 py-2 flex items-center gap-3 hover:border-secondary/50 hover:shadow-md transition-all duration-150 cursor-pointer group">
        <div className="flex-shrink-0 h-9 w-9 rounded bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
          <Archive className="h-5 w-5 text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-secondary uppercase tracking-wide leading-tight">Archived Referrals</p>
        </div>
      </div>
    </Link>
  );
}
