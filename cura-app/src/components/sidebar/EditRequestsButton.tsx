"use client";

import Link from "next/link";
import { FileEdit } from "lucide-react";

interface EditRequestsButtonProps {
  count?: number;
}

export function EditRequestsButton({ count }: EditRequestsButtonProps) {
  return (
    <Link href="/edit-requests" className="block relative">
      <div className="bg-secondary text-white text-xs font-bold py-3 px-4 rounded shadow text-center uppercase tracking-wide cursor-pointer hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2">
        <FileEdit className="h-3.5 w-3.5" />
        EDIT REQUESTS
      </div>
      {count !== undefined && count > 0 && (
        <span className="absolute -top-2 -right-2 min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 shadow-md border-2 border-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
