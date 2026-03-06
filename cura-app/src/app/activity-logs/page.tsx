"use client";

import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProfileCard } from "@/components/sidebar/ProfileCard";
import { SchedulePlanner } from "@/components/sidebar/SchedulePlanner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getActivityLogs, ActivityLog } from "@/lib/api/activity-logs";

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-5 p-3 sm:p-5 max-w-[1400px] mx-auto w-full">
        {/* Left Sidebar - Hidden on mobile */}
        <aside className="hidden lg:block w-[200px] flex-shrink-0 space-y-4">
          <ProfileCard />
          <SchedulePlanner />
        </aside>

        {/* Mobile Profile Card */}
        <div className="lg:hidden">
          <ProfileCard />
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white rounded-lg shadow-md p-3 sm:p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
            <h1 className="bg-secondary text-white text-xs sm:text-sm font-semibold py-2 px-4 rounded-md">
              ACTIVITY LOGS
            </h1>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-secondary hidden sm:inline">SEARCH</span>
              <div className="flex items-center bg-gray-100 rounded-md px-3 py-1 flex-1 sm:flex-none">
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-none bg-transparent shadow-none focus-visible:ring-0 w-full sm:w-[200px] text-xs sm:text-sm"
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                  <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading activity logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? "No logs found matching your search." : "No activity logs yet."}
              </div>
            ) : (
              <table className="w-full border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th className="bg-primary text-secondary text-xs font-semibold py-3 px-3 sm:px-5 text-center rounded-l-lg w-[150px] sm:w-[200px]">
                      DATE PERFORMED
                    </th>
                    <th className="bg-primary text-secondary text-xs font-semibold py-3 px-3 sm:px-5 text-center rounded-r-lg">
                      DESCRIPTION
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="bg-gray-50 py-3 px-3 sm:px-5 text-center text-xs sm:text-sm rounded-l-lg">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="bg-gray-50 py-3 px-3 sm:px-5 text-center text-xs sm:text-sm rounded-r-lg">
                        {log.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading activity logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? "No logs found matching your search." : "No activity logs yet."}
              </div>
            ) : (
              currentLogs.map((log) => (
                <div key={log.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-[10px] text-gray-500 mb-1">{formatDateTime(log.created_at)}</div>
                  <div className="text-xs text-gray-700">{log.description}</div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {!loading && filteredLogs.length > 0 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="text-xs"
              >
                Previous
              </Button>
              
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="text-xs w-8 h-8"
                  >
                    {pageNum}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="text-xs"
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Schedule Planner */}
        <div className="lg:hidden">
          <SchedulePlanner />
        </div>
      </main>

      <Footer />
    </div>
  );
}
