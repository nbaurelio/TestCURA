"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProfileCard } from "@/components/sidebar/ProfileCard";
import { SchedulePlanner } from "@/components/sidebar/SchedulePlanner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getActivityLogs, ActivityLog } from "@/lib/api/activity-logs";
import { ActivityLogDetailsModal } from "@/components/modals/ActivityLogDetailsModal";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const logsPerPage = 25;

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await getActivityLogs();
      setLogs(data || []);
    } catch (error) {
      console.error("Error loading activity logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  const filteredLogs = logs.filter(log => 
    log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    formatDateTime(log.created_at).includes(searchQuery)
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleLogClick = (log: ActivityLog) => {
    setSelectedLog(log);
    setIsDetailsOpen(true);
  };

  return (
    <RouteGuard allowedRoles={["clinician", "professor"]}>
    <div className="min-h-screen flex flex-col relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/bg-homepage.png)' }}
      />
      
      {/* White Opaque Overlay */}
      <div className="fixed inset-0 z-0 bg-white/60" />
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <Header />

      <main className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-5 p-3 sm:p-5 max-w-[1400px] mx-auto w-full">
        {/* Left Sidebar - Hidden on mobile */}
        <aside className="hidden lg:block w-[200px] flex-shrink-0 space-y-4 animate-enter">
          <ProfileCard />
          <SchedulePlanner />
        </aside>

        {/* Mobile Profile Card */}
        <div className="lg:hidden">
          <ProfileCard />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <Link href="/home" className="text-secondary text-sm mb-4 inline-block hover:underline">
            ← Back to Home
          </Link>

          {/* Header Bar */}
          <div className="bg-secondary rounded-lg p-5 mb-5 shadow relative animate-enter">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_80%_50%,white_0%,transparent_50%)]" />
            <div className="relative flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-white font-bold text-lg uppercase tracking-wide">Activity Logs</h1>
                <p className="text-white/60 text-xs mt-0.5">Track all actions performed on your account</p>
              </div>
              <div className="flex items-center bg-white/10 rounded-lg overflow-hidden border border-white/20 focus-within:bg-white/20 focus-within:border-white/40 transition-all">
                <Search className="h-3.5 w-3.5 text-white/50 ml-3 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2.5 text-xs outline-none w-[180px] sm:w-[240px] bg-transparent text-white placeholder:text-white/40 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Loading activity logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                {searchQuery ? "No logs found matching your search." : "No activity logs yet."}
              </div>
            ) : (
              <div className="rounded-lg border-2 border-[#87c4d8]/50 shadow overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-secondary text-white">
                      <th className="py-3 px-5 text-left font-bold uppercase tracking-wide w-[200px]">
                        Date Performed
                      </th>
                      <th className="py-3 px-5 text-left font-bold uppercase tracking-wide">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentLogs.map((log, idx) => (
                      <tr 
                        key={log.id}
                        onClick={() => handleLogClick(log)}
                        className={`border-b border-[#87c4d8]/30 hover:bg-[#87c4d8]/15 transition-colors cursor-pointer ${
                          idx % 2 === 0 ? "bg-white" : "bg-[#87c4d8]/5"
                        }`}
                      >
                        <td className="py-3 px-5 font-semibold text-secondary whitespace-nowrap">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="py-3 px-5 text-gray-700 font-medium">
                          {log.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Loading activity logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                {searchQuery ? "No logs found matching your search." : "No activity logs yet."}
              </div>
            ) : (
              currentLogs.map((log) => (
                <div 
                  key={log.id} 
                  onClick={() => handleLogClick(log)}
                  className="bg-[#87c4d8]/25 backdrop-blur-sm rounded-lg p-4 cursor-pointer hover:bg-[#87c4d8]/35 transition-colors border-2 border-[#87c4d8]/50"
                >
                  <div className="text-[10px] text-secondary/70 mb-1.5 font-bold uppercase tracking-wide">{formatDateTime(log.created_at)}</div>
                  <div className="text-xs text-gray-700 font-medium">{log.description}</div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {!loading && filteredLogs.length > 0 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide border-2 border-[#87c4d8]/50 rounded-lg hover:bg-[#87c4d8]/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-secondary"
              >
                Previous
              </button>
              
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                      currentPage === pageNum
                        ? "bg-secondary text-white shadow"
                        : "border-2 border-[#87c4d8]/50 text-secondary hover:bg-[#87c4d8]/15"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide border-2 border-[#87c4d8]/50 rounded-lg hover:bg-[#87c4d8]/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-secondary"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Mobile Schedule Planner */}
        <div className="lg:hidden">
          <SchedulePlanner />
        </div>
      </main>

      {/* Activity Log Details Modal */}
      <ActivityLogDetailsModal
        log={selectedLog}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />

        <Footer />
      </div>
    </div>
    </RouteGuard>
  );
}
