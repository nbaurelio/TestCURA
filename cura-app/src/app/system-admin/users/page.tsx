"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search, Plus, MoreHorizontal, Eye, Pencil, Lock, Unlock, ShieldCheck } from "lucide-react";
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
              Users Management
            </h1>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {loading ? "Loading users…" : `${filteredUsers.length} of ${users.length} users`}
            </p>
          </div>
          <button
            onClick={() => setDialogState({ open: true, mode: "add", target: null })}
            className="inline-flex items-center gap-1.5 bg-secondary hover:bg-secondary/90 text-white text-[11px] font-bold uppercase tracking-wide px-4 py-2 rounded-lg shadow-sm transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Add User
          </button>
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
                            Update
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
              // Only attach an adviser when the role can have one.
              adviser_id: data.role === "clinician" ? (data.adviser_id ?? null) : null,
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
              // Clear adviser when the user is no longer a clinician.
              adviser_id: data.role === "clinician" ? (data.adviser_id ?? null) : null,
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

