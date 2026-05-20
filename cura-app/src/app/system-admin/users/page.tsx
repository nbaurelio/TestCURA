"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { Search, Plus, MoreHorizontal, Eye, Pencil, Lock, Unlock, ShieldCheck, Upload, Download, FileSpreadsheet, X, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createProfile, getAllProfiles, getCurrentUserId, updateProfile, Profile, INACTIVITY_THRESHOLD_MS } from "@/lib/api/profiles";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SystemAdminUserDialog } from "@/components/modals/SystemAdminUserDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Types ──────────────────────────────────────────────────────────────────
type UserStatus = "ACTIVE" | "INACTIVE" | "LOCKED";

interface UserRow extends Profile {
  status: UserStatus;
}

// Friendly label for any role (snake_case → Title Case). Falls back to raw value.
const formatRole = (role: string | undefined | null) => {
  if (!role) return "—";
  return role
    .split("_")
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
};

// Map each status to its visual treatment. Cohesive with the existing CURA
// palette: status accents are kept saturated against the white card surface.
const STATUS_STYLE: Record<UserStatus, string> = {
  ACTIVE:   "bg-[#87c4d8] text-secondary border border-[#5B8AB8]/40",
  INACTIVE: "bg-secondary text-white border border-secondary",
  LOCKED:   "bg-red-500 text-white border border-red-600",
};

export default function SystemAdminUsersPage() {
  const { refreshUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");

  // Single piece of state drives both Add and Edit dialogs. `mode` decides
  // which flow runs on save; `target` carries the row being edited.
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    mode: "add" | "edit" | "view";
    target: UserRow | null;
  }>({ open: false, mode: "add", target: null });

  // Bulk upload state
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [bulkUploadProgress, setBulkUploadProgress] = useState<{ current: number; total: number; success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load profiles. We auto-flip ACTIVE accounts to INACTIVE when their
  // `last_active_at` (or `created_at` for legacy rows missing the column)
  // exceeds the 1-year inactivity threshold, and persist the change so
  // subsequent logins are rejected by the status gate in `/login`.
  const loadUsers = async () => {
    try {
      setLoading(true);
      const profiles = await getAllProfiles();
      const now = Date.now();
      const rows: UserRow[] = await Promise.all((profiles || []).map(async p => {
        const currentStatus = (((p as any).status as UserStatus) || "ACTIVE");
        const lastActive = (p as any).last_active_at || p.created_at;
        const lastActiveMs = lastActive ? new Date(lastActive).getTime() : now;
        const isStale = now - lastActiveMs > INACTIVITY_THRESHOLD_MS;
        if (currentStatus === "ACTIVE" && isStale) {
          // Persist so the next login is gated correctly; ignore failures —
          // the row still renders as INACTIVE in the UI either way.
          updateProfile(p.id, { status: "INACTIVE" } as any).catch(err =>
            console.error("Failed to auto-mark profile inactive", p.id, err)
          );
          return { ...p, status: "INACTIVE" } as UserRow;
        }
        return { ...p, status: currentStatus } as UserRow;
      }));
      setUsers(rows);
    } catch (err) {
      console.error("Failed to load users", err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  // Distinct role list for the filter dropdown.
  const availableRoles = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => u.role && set.add(u.role));
    return Array.from(set).sort();
  }, [users]);

  // Visible rows after applying search + role/status filters.
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter(u => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (!q) return true;
      const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
      return (
        fullName.includes(q) ||
        u.email.toLowerCase().includes(q) ||
        formatRole(u.role).toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // ── Action handlers ──────────────────────────────────────────────────
  const applyStatus = async (
    u: UserRow,
    status: UserStatus,
    extras: Record<string, any> = {},
    successMsg?: string,
  ) => {
    // Optimistic UI flip; revert if the persist fails.
    const prev = u.status;
    setUsers(list => list.map(r => r.id === u.id ? { ...r, status } : r));
    const result = await updateProfile(u.id, { status, ...extras } as any);
    if (!result) {
      setUsers(list => list.map(r => r.id === u.id ? { ...r, status: prev } : r));
      toast.error("Failed to update status");
      return;
    }
    toast.success(successMsg || `${u.first_name} ${u.last_name} updated`);
  };

  const handleView = (u: UserRow) =>
    setDialogState({ open: true, mode: "view", target: u });
  const handleUpdate = (u: UserRow) =>
    setDialogState({ open: true, mode: "edit", target: u });

  // ── Bulk Upload handlers ─────────────────────────────────────────────
  const downloadCsvTemplate = () => {
    const headers = ["email", "first_name", "last_name", "role", "password", "year_level", "clinical_department", "batch_name", "subrole"];
    const sampleRow = ["user@example.com", "John", "Doe", "clinician", "tempPass123", "3", "OM", "Batch 2025", "Student"];
    const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "user_upload_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV template downloaded");
  };

  const parseCsv = (text: string): Record<string, string>[] => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
      rows.push(row);
    }
    return rows;
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) {
      toast.error("CSV file is empty or invalid");
      return;
    }

    setBulkUploadProgress({ current: 0, total: rows.length, success: 0, failed: 0, errors: [] });

    const errors: string[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      setBulkUploadProgress(prev => prev ? { ...prev, current: i + 1 } : null);

      // Validate required fields
      if (!row.email || !row.first_name || !row.last_name || !row.role) {
        errors.push(`Row ${i + 1}: Missing required fields (email, first_name, last_name, role)`);
        failedCount++;
        continue;
      }

      try {
        const created = await createProfile({
          email: row.email,
          first_name: row.first_name,
          last_name: row.last_name,
          role: row.role,
          year_level: row.year_level || null,
          clinical_department: row.clinical_department || null,
          batch_name: row.batch_name || null,
          subrole: row.subrole || null,
          password: row.password || undefined,
        } as any);

        if (created) {
          successCount++;
          setUsers(prev => [{ ...created, status: "ACTIVE" } as UserRow, ...prev]);
        } else {
          errors.push(`Row ${i + 1}: Failed to create user ${row.email}`);
          failedCount++;
        }
      } catch (err) {
        errors.push(`Row ${i + 1}: Error creating ${row.email} - ${err instanceof Error ? err.message : "Unknown error"}`);
        failedCount++;
      }
    }

    setBulkUploadProgress(prev => prev ? { ...prev, success: successCount, failed: failedCount, errors } : null);

    if (successCount > 0) {
      toast.success(`${successCount} users created successfully`);
    }
    if (failedCount > 0) {
      toast.error(`${failedCount} users failed to create`);
    }
  };
  // Unlock clears the failed-attempts counter so the user starts fresh.
  const handleUnlock = (u: UserRow) =>
    applyStatus(u, "ACTIVE", { failed_login_attempts: 0 }, `${u.first_name} ${u.last_name} unlocked`);
  const handleLock = (u: UserRow) =>
    applyStatus(u, "LOCKED", {}, `${u.first_name} ${u.last_name} locked`);
  const handleDeactivate = (u: UserRow) =>
    applyStatus(u, "INACTIVE", {}, `${u.first_name} ${u.last_name} marked inactive`);
  // Reactivation also resets the counter — the admin is vouching for the user.
  const handleActivate = (u: UserRow) =>
    applyStatus(u, "ACTIVE", { failed_login_attempts: 0 }, `${u.first_name} ${u.last_name} reactivated`);

  return (
    <div className="animate-enter">
      {/* ── Page card ─────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border-2 border-[#87c4d8]/40 shadow-sm overflow-hidden">
        {/* Title bar */}
        <header className="px-5 sm:px-6 py-4 flex items-center justify-between gap-3 border-b border-[#87c4d8]/30 bg-gradient-to-r from-white to-[#87c4d8]/5">
          <div className="min-w-0">
            <h1 className="text-secondary font-bold text-sm uppercase tracking-wider">
              User Management
            </h1>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {loading ? "Loading users…" : `${filteredUsers.length} of ${users.length} users`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBulkUploadOpen(true)}
              className="inline-flex items-center gap-1.5 bg-white border-2 border-secondary hover:bg-secondary/5 text-secondary text-[11px] font-bold uppercase tracking-wide px-4 py-2 rounded-lg shadow-sm transition-all"
            >
              <Upload className="h-3.5 w-3.5" />
              Bulk Upload
            </button>
            <button
              onClick={() => setDialogState({ open: true, mode: "add", target: null })}
              className="inline-flex items-center gap-1.5 bg-secondary hover:bg-secondary/90 text-white text-[11px] font-bold uppercase tracking-wide px-4 py-2 rounded-lg shadow-sm transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Add User
            </button>
          </div>
        </header>

        {/* Filter bar */}
        <div className="px-5 sm:px-6 py-3 border-b border-[#87c4d8]/20 bg-[#87c4d8]/[0.04] flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-secondary/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name, email, or role…"
              className="w-full pl-9 pr-3 py-2 text-[11px] rounded-lg border-2 border-[#87c4d8]/40 bg-white text-secondary placeholder-gray-400 focus:outline-none focus:border-[#5B8AB8]/60 focus:ring-1 focus:ring-[#5B8AB8]/20 transition-all"
            />
          </div>

          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="text-[11px] font-semibold rounded-lg border-2 border-[#87c4d8]/40 bg-white px-2.5 py-2 text-secondary focus:outline-none focus:border-[#5B8AB8]/60 focus:ring-1 focus:ring-[#5B8AB8]/20 transition-all"
          >
            <option value="all">All Roles</option>
            {availableRoles.map(r => (
              <option key={r} value={r}>{formatRole(r)}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as UserStatus | "all")}
            className="text-[11px] font-semibold rounded-lg border-2 border-[#87c4d8]/40 bg-white px-2.5 py-2 text-secondary focus:outline-none focus:border-[#5B8AB8]/60 focus:ring-1 focus:ring-[#5B8AB8]/20 transition-all"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="LOCKED">Locked</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[720px]">
            <thead>
              <tr className="bg-secondary text-white">
                <th className="py-3 px-5 text-left font-bold uppercase tracking-wide">Name</th>
                <th className="py-3 px-5 text-left font-bold uppercase tracking-wide">Email</th>
                <th className="py-3 px-5 text-left font-bold uppercase tracking-wide">Role</th>
                <th className="py-3 px-5 text-left font-bold uppercase tracking-wide">Status</th>
                <th className="py-3 px-5 text-right font-bold uppercase tracking-wide w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-500">Loading users…</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-500">
                  {searchQuery || roleFilter !== "all" || statusFilter !== "all"
                    ? "No users match the current filters."
                    : "No users found."}
                </td></tr>
              ) : (
                filteredUsers.map((u, idx) => (
                  <tr
                    key={u.id}
                    className={`border-b border-[#87c4d8]/20 transition-colors hover:bg-[#87c4d8]/10 ${
                      idx % 2 === 0 ? "bg-white" : "bg-[#87c4d8]/[0.04]"
                    }`}
                  >
                    <td className="py-3 px-5 font-semibold text-secondary whitespace-nowrap uppercase">
                      {u.first_name} {u.last_name}
                    </td>
                    <td className="py-3 px-5 text-gray-700 font-medium uppercase">{u.email}</td>
                    <td className="py-3 px-5 text-gray-700 font-medium uppercase">{formatRole(u.role)}</td>
                    <td className="py-3 px-5">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[u.status]}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-1.5 rounded-md hover:bg-secondary/10 text-secondary/70 hover:text-secondary transition-colors"
                            aria-label="User actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white border-2 border-gray-300 shadow-lg rounded w-40">
                          <DropdownMenuItem onClick={() => handleView(u)} className="cursor-pointer">
                            <Eye className="h-3.5 w-3.5 mr-2 text-secondary/70" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdate(u)} className="cursor-pointer">
                            <Pencil className="h-3.5 w-3.5 mr-2 text-secondary/70" />
                            Edit
                          </DropdownMenuItem>

                          {u.status === "LOCKED" ? (
                            <DropdownMenuItem onClick={() => handleUnlock(u)} className="cursor-pointer">
                              <Unlock className="h-3.5 w-3.5 mr-2 text-secondary/70" />
                              Unlock
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleLock(u)} className="cursor-pointer">
                              <Lock className="h-3.5 w-3.5 mr-2 text-secondary/70" />
                              Lock
                            </DropdownMenuItem>
                          )}

                          {u.status === "INACTIVE" ? (
                            <DropdownMenuItem onClick={() => handleActivate(u)} className="cursor-pointer">
                              <ShieldCheck className="h-3.5 w-3.5 mr-2 text-secondary/70" />
                              Activate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleDeactivate(u)} className="cursor-pointer">
                              <ShieldCheck className="h-3.5 w-3.5 mr-2 text-secondary/70" />
                              Deactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Bulk Upload Dialog ────────── */}
      <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
        <DialogContent className="bg-white max-w-md w-[92vw] sm:w-full p-0 gap-0 rounded-xl overflow-hidden shadow-xl">
          <DialogHeader className="bg-secondary p-4 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white font-bold text-sm uppercase tracking-wide">
                Bulk User Upload
              </DialogTitle>
              <button
                type="button"
                onClick={() => {
                  setIsBulkUploadOpen(false);
                  setBulkUploadProgress(null);
                }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/20 transition-colors"
              >
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
            <p className="text-white/70 text-[10px] leading-snug mt-0.5">
              Upload multiple users via CSV file
            </p>
          </DialogHeader>

          <div className="p-5 space-y-4">
            {/* Template Download */}
            <div className="bg-[#87c4d8]/[0.06] rounded-lg p-4 border border-[#87c4d8]/30">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <FileSpreadsheet className="h-4 w-4 text-secondary" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-secondary mb-1">CSV Template</p>
                  <p className="text-[10px] text-gray-500 mb-2">
                    Download the template with required columns: email, first_name, last_name, role, password (optional), year_level, clinical_department, batch_name, subrole
                  </p>
                  <button
                    onClick={downloadCsvTemplate}
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-secondary hover:text-secondary/80 transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    Download Template
                  </button>
                </div>
              </div>
            </div>

            {/* File Upload */}
            {!bulkUploadProgress && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#87c4d8]/40 rounded-lg p-6 text-center cursor-pointer hover:border-secondary/60 hover:bg-[#87c4d8]/[0.04] transition-all"
              >
                <Upload className="h-6 w-6 text-secondary/50 mx-auto mb-2" />
                <p className="text-[11px] font-semibold text-secondary mb-1">Click to upload CSV</p>
                <p className="text-[9px] text-gray-400">or drag and drop your file here</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                    e.target.value = "";
                  }}
                />
              </div>
            )}

            {/* Progress */}
            {bulkUploadProgress && (
              <div className="space-y-3">
                {/* Progress bar */}
                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-secondary h-full transition-all duration-300"
                    style={{ width: `${(bulkUploadProgress.current / bulkUploadProgress.total) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-500">
                    Processing {bulkUploadProgress.current} of {bulkUploadProgress.total}
                  </span>
                  <span className="text-secondary font-semibold">
                    {Math.round((bulkUploadProgress.current / bulkUploadProgress.total) * 100)}%
                  </span>
                </div>

                {/* Results */}
                {bulkUploadProgress.current === bulkUploadProgress.total && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-[11px] font-semibold text-green-600">
                        {bulkUploadProgress.success} created successfully
                      </span>
                    </div>
                    {bulkUploadProgress.failed > 0 && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-[11px] font-semibold text-red-600">
                          {bulkUploadProgress.failed} failed
                        </span>
                      </div>
                    )}
                    {bulkUploadProgress.errors.length > 0 && (
                      <div className="bg-red-50 rounded-lg p-3 border border-red-200 max-h-32 overflow-y-auto">
                        <p className="text-[10px] font-semibold text-red-700 mb-1">Errors:</p>
                        {bulkUploadProgress.errors.slice(0, 5).map((err, idx) => (
                          <p key={idx} className="text-[9px] text-red-600 leading-relaxed">{err}</p>
                        ))}
                        {bulkUploadProgress.errors.length > 5 && (
                          <p className="text-[9px] text-red-500 italic">
                            ...and {bulkUploadProgress.errors.length - 5} more
                          </p>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setBulkUploadProgress(null);
                        setIsBulkUploadOpen(false);
                      }}
                      className="w-full mt-2 bg-secondary hover:bg-secondary/90 text-white text-[11px] font-bold uppercase tracking-wide px-4 py-2 rounded-lg shadow-sm transition-all"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add / Edit User modal (Radix Dialog — portal-rendered) ────────── */}
      <SystemAdminUserDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState(s => ({ ...s, open }))}
        mode={dialogState.mode}
        user={dialogState.target}
        onSave={async (data) => {
          if (dialogState.mode === "add") {
            // Persist the new user so they can actually log in with the
            // email + password the admin just assigned.
            const created = await createProfile({
              email: data.email,
              first_name: data.first_name,
              last_name: data.last_name,
              role: data.role,
              year_level: data.year_level,
              clinical_department: data.clinical_department,
              batch_name: data.batch_name,
              subrole: data.subrole || null,
              avatar_url: data.avatar_url,
              // Only attach advisers when the role can have them.
              adviser_ids: data.role === "clinician" ? (data.adviser_ids ?? []) : [],
              ...(data.password ? { password: data.password } : {}),
            } as any);

            if (!created) {
              toast.error("Failed to create user");
              throw new Error("createProfile returned null");
            }

            setUsers(prev => [{ ...created, status: "ACTIVE" } as UserRow, ...prev]);
            toast.success(`${data.first_name} ${data.last_name} added`);
          } else if (dialogState.target) {
            // Persist the edit to Supabase so the user sees the change on
            // their own side (login, profile card, header, etc.).
            const id = dialogState.target.id;
            const updates: Record<string, any> = {
              first_name: data.first_name,
              last_name: data.last_name,
              email: data.email,
              role: data.role,
              year_level: data.year_level,
              clinical_department: data.clinical_department,
              batch_name: data.batch_name,
              subrole: data.subrole || null,
              avatar_url: data.avatar_url,
              // Clear advisers when the user is no longer a clinician.
              adviser_ids: data.role === "clinician" ? (data.adviser_ids ?? []) : [],
            };
            // Only set the password if the admin actually typed a new one.
            // Empty string means "keep current".
            if (data.password && data.password.length > 0) {
              updates.password = data.password;
            }
            const updated = await updateProfile(id, updates as any);

            if (!updated) {
              toast.error("Failed to update user");
              throw new Error("updateProfile returned null");
            }

            // Reflect the canonical record in the table.
            setUsers(prev => prev.map(u => u.id === id
              ? { ...u, ...updated, status: u.status }
              : u
            ));

            // If the System Admin just edited their own profile, refresh the
            // auth context so the sidebar avatar/name update immediately.
            if (id === getCurrentUserId()) {
              await refreshUser();
            }

            toast.success(`${data.first_name} ${data.last_name} updated`);
          }
        }}
      />
    </div>
  );
}

