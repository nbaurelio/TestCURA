"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";

interface RequestStatusButtonProps {
  count?: number;
}

export function RequestStatusButton({ count }: RequestStatusButtonProps) {
  return (
    <Link href="/request-status" className="block relative">
      <div className="bg-white border-2 border-secondary/20 rounded shadow-sm px-4 py-2 flex items-center gap-3 hover:border-secondary/50 hover:shadow-md transition-all duration-150 cursor-pointer group">
        <div className="flex-shrink-0 h-9 w-9 rounded bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
          <ClipboardList className="h-5 w-5 text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-secondary uppercase tracking-wide leading-tight">Requests Referrals</p>
          {count !== undefined && (
            <p className="text-lg font-bold text-secondary leading-tight">{count}</p>
          )}
        </div>
      </div>
      {count !== undefined && count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1 shadow border-2 border-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
