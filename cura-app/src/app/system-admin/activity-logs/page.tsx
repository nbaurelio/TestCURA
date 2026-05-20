"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search, Activity } from "lucide-react";
import { toast } from "sonner";
import { getAllActivityLogs, ActivityLog } from "@/lib/api/activity-logs";
import { getAllProfiles, Profile } from "@/lib/api/profiles";
import { ActivityLogDetailsModal, depersonalizeDescription } from "@/components/modals/ActivityLogDetailsModal";

const LOGS_PER_PAGE = 25;

// Pretty action labels (snake / SCREAMING_SNAKE → Title Case).
const formatAction = (action: string) =>
  action
    .toLowerCase()
    .split("_")
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");

// Each broad action category gets a discrete color treatment so the table
// reads at a glance — kept aligned with the existing CURA palette.
const getActionStyle = (action: string): string => {
  const a = action.toUpperCase();
  if (a.startsWith("CREATE") || a.startsWith("ADD")) return "bg-green-100 text-green-700 border-green-200";
  if (a.startsWith("DELETE") || a.startsWith("DECLINE")) return "bg-red-100 text-red-700 border-red-200";
  if (a.startsWith("APPROVE") || a.includes("ACCEPT")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (a.startsWith("UPDATE") || a.startsWith("CHANGE") || a.startsWith("EDIT")) return "bg-amber-100 text-amber-700 border-amber-200";
  if (a.includes("LOGIN") || a.includes("LOGOUT")) return "bg-secondary/10 text-secondary border-secondary/20";
  return "bg-[#87c4d8]/20 text-secondary border-[#87c4d8]/40";
};

export default function SystemAdminActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  // Initial load — pulls all logs + the user directory in parallel so we can
  // render "who did it" alongside the description.
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [logsData, profilesData] = await Promise.all([
          getAllActivityLogs(),
          getAllProfiles(),
        ]);
        const map: Record<string, Profile> = {};
        (profilesData || []).forEach(p => { map[p.id] = p; });
        setProfilesById(map);
        setLogs(logsData || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load activity logs");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Reset paging when filters change so the user always lands on page 1.
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  // Search-and-filter pipeline.
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter(l => {
      if (!q) return true;
      const userName = profilesById[l.user_id]
        ? `${profilesById[l.user_id].first_name} ${profilesById[l.user_id].last_name}`
        : "";
      return (
        l.description.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        userName.toLowerCase().includes(q)
      );
    });
  }, [logs, searchQuery, profilesById]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / LOGS_PER_PAGE));
  const pageStart = (currentPage - 1) * LOGS_PER_PAGE;
  const visibleLogs = filtered.slice(pageStart, pageStart + LOGS_PER_PAGE);

  const formatDateTime = (s: string) => {
    const d = new Date(s);
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const userLabel = (userId: string) => {
    const p = profilesById[userId];
    return p ? `${p.first_name} ${p.last_name}` : "—";
  };

  return (
    <div className="animate-enter">
      <section className="bg-white rounded-xl border-2 border-[#87c4d8]/40 shadow-sm overflow-hidden">
        {/* Header */}
        <header className="px-5 sm:px-6 py-4 flex items-center justify-between gap-3 border-b border-[#87c4d8]/30 bg-gradient-to-r from-white to-[#87c4d8]/5">
          <div className="min-w-0">
            <h1 className="text-secondary font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity Logs
            </h1>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {loading ? "Loading…" : `${filtered.length} of ${logs.length} log entries`}
            </p>
          </div>
        </header>

        {/* Filter bar */}
        <div className="px-5 sm:px-6 py-3 border-b border-[#87c4d8]/20 bg-[#87c4d8]/[0.04] flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-secondary/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search description, action, or user…"
              className="w-full pl-9 pr-3 py-2 text-[11px] rounded-lg border-2 border-[#87c4d8]/40 bg-white text-secondary placeholder-gray-400 focus:outline-none focus:border-[#5B8AB8]/60 focus:ring-1 focus:ring-[#5B8AB8]/20 transition-all"
            />
          </div>

        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[820px]">
            <thead>
              <tr className="bg-secondary text-white">
                <th className="py-3 px-5 text-left font-bold uppercase tracking-wide w-[180px]">Date</th>
                <th className="py-3 px-5 text-left font-bold uppercase tracking-wide w-[170px]">User</th>
                <th className="py-3 px-5 text-left font-bold uppercase tracking-wide w-[170px]">Action</th>
                <th className="py-3 px-5 text-left font-bold uppercase tracking-wide">Description</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-12 text-gray-500">Loading activity logs…</td></tr>
              ) : visibleLogs.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-gray-500">
                  {searchQuery
                    ? "No logs match the current filters."
                    : "No activity logs yet."}
                </td></tr>
              ) : (
                visibleLogs.map((log, idx) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`border-b border-[#87c4d8]/20 transition-colors hover:bg-[#87c4d8]/10 cursor-pointer ${
                      idx % 2 === 0 ? "bg-white" : "bg-[#87c4d8]/[0.04]"
                    }`}
                  >
                    <td className="py-3 px-5 font-semibold text-secondary whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="py-3 px-5 font-medium text-gray-700">{userLabel(log.user_id)}</td>
                    <td className="py-3 px-5">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getActionStyle(log.action)}`}>
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-gray-700 font-medium truncate max-w-md" title={depersonalizeDescription(log.description, userLabel(log.user_id))}>
                      {depersonalizeDescription(log.description, userLabel(log.user_id))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > LOGS_PER_PAGE && (
          <div className="flex justify-center items-center gap-2 px-5 py-4 border-t border-[#87c4d8]/20 bg-[#87c4d8]/[0.04]">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide border-2 border-[#87c4d8]/50 rounded-lg hover:bg-[#87c4d8]/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-secondary"
            >
              Previous
            </button>

            <div className="flex gap-1">
              {(() => {
                // Render up to 7 page buttons, centered around the current page.
                const pages: number[] = [];
                const window = 3;
                const start = Math.max(1, currentPage - window);
                const end = Math.min(totalPages, start + 2 * window);
                for (let i = start; i <= end; i++) pages.push(i);
                return pages.map(num => (
                  <button
                    key={num}
                    onClick={() => setCurrentPage(num)}
                    className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-colors ${
                      currentPage === num
                        ? "bg-secondary text-white shadow"
                        : "border-2 border-[#87c4d8]/50 text-secondary hover:bg-[#87c4d8]/15"
                    }`}
                  >
                    {num}
                  </button>
                ));
              })()}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide border-2 border-[#87c4d8]/50 rounded-lg hover:bg-[#87c4d8]/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-secondary"
            >
              Next
            </button>
          </div>
        )}
      </section>

      <ActivityLogDetailsModal
        log={selectedLog}
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        actorName={selectedLog ? userLabel(selectedLog.user_id) : undefined}
      />
    </div>
  );
}
