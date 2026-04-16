"use client";

import Link from "next/link";

export function AcceptedReferralsButton() {
  return (
    <Link href="/accepted-referrals" className="block">
      <div className="bg-secondary text-white text-xs font-bold py-3 px-4 rounded shadow text-center uppercase tracking-wide cursor-pointer hover:bg-secondary/90 transition-colors">
        ACCEPTED REFERRALS
      </div>
    </Link>
  );
}
