"use client";

import Link from "next/link";
import { FileEdit } from "lucide-react";

interface EditRequestsButtonProps {
  count?: number;
}

export function EditRequestsButton({ count }: EditRequestsButtonProps) {
  return (
    <Link href="/edit-requests" className="block relative">
      <div className="bg-secondary text-white text-xs font-bold py-2.5 pl-3 pr-4 border-l-4 border-amber-400 shadow text-left uppercase tracking-wide cursor-pointer hover:bg-secondary/80 hover:border-amber-300 transition-all duration-150 flex items-center gap-2.5">
        <FileEdit className="h-4 w-4 shrink-0 text-amber-300" />
        <span>Edit Requests</span>
      </div>
      {count !== undefined && count > 0 && (
        <span className="absolute -top-2 -right-2 min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 shadow-md border-2 border-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
