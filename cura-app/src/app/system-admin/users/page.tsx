"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search, Plus, MoreHorizontal, Mail, RefreshCw, KeyRound, Pencil, Lock, Unlock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getAllProfiles, Profile } from "@/lib/api/profiles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [addOpen, setAddOpen] = useState(false);

  // Load profiles. Status is stored locally — the underlying `profiles` table
  // does not yet have a status column, so we treat every user as ACTIVE
  // initially and let the System Admin lock / deactivate them client-side.
  const loadUsers = async () => {
    try {
      setLoading(true);
      const profiles = await getAllProfiles();
      const rows: UserRow[] = (profiles || []).map(p => ({
        ...p,
        status: "ACTIVE" as UserStatus,
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

  // ── Action handlers (toast-only stubs; wire to backend later) ────────────
  const setStatus = (id: string, status: UserStatus) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, status } : u)));
  };
  const handleUpdate = (u: UserRow) =>
    toast.info(`Update user dialog will open for ${u.first_name} ${u.last_name}`);
  const handleUnlock = (u: UserRow) => {
    setStatus(u.id, "ACTIVE");
    toast.success(`${u.first_name} ${u.last_name} unlocked`);
  };
  const handleLock = (u: UserRow) => {
    setStatus(u.id, "LOCKED");
    toast.success(`${u.first_name} ${u.last_name} locked`);
  };
  const handleDeactivate = (u: UserRow) => {
    setStatus(u.id, "INACTIVE");
    toast.success(`${u.first_name} ${u.last_name} marked inactive`);
  };
  const handleActivate = (u: UserRow) => {
    setStatus(u.id, "ACTIVE");
    toast.success(`${u.first_name} ${u.last_name} reactivated`);
  };
  const handleResetPassword = (u: UserRow) =>
    toast.success(`Password reset link sent to ${u.email}`);

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
            onClick={() => setAddOpen(true)}
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
                        <DropdownMenuContent align="end" className="w-44 border-2 border-[#87c4d8]/40 shadow-lg">
                          <DropdownMenuItem
                            onClick={() => handleUpdate(u)}
                            className="text-[11px] font-bold uppercase tracking-wide text-secondary cursor-pointer focus:bg-[#87c4d8]/15"
                          >
                            <Pencil className="h-3 w-3 mr-2" />
                            Update
                          </DropdownMenuItem>

                          {u.status === "LOCKED" ? (
                            <DropdownMenuItem
                              onClick={() => handleUnlock(u)}
                              className="text-[11px] font-bold uppercase tracking-wide text-secondary cursor-pointer focus:bg-[#87c4d8]/15"
                            >
                              <Unlock className="h-3 w-3 mr-2" />
                              Unlock
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleLock(u)}
                              className="text-[11px] font-bold uppercase tracking-wide text-secondary cursor-pointer focus:bg-[#87c4d8]/15"
                            >
                              <Lock className="h-3 w-3 mr-2" />
                              Lock
                            </DropdownMenuItem>
                          )}

                          {u.status === "INACTIVE" ? (
                            <DropdownMenuItem
                              onClick={() => handleActivate(u)}
                              className="text-[11px] font-bold uppercase tracking-wide text-secondary cursor-pointer focus:bg-[#87c4d8]/15"
                            >
                              <ShieldCheck className="h-3 w-3 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleDeactivate(u)}
                              className="text-[11px] font-bold uppercase tracking-wide text-secondary cursor-pointer focus:bg-[#87c4d8]/15"
                            >
                              <ShieldCheck className="h-3 w-3 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => handleResetPassword(u)}
                            className="text-[11px] font-bold uppercase tracking-wide text-secondary cursor-pointer focus:bg-[#87c4d8]/15"
                          >
                            <KeyRound className="h-3 w-3 mr-2" />
                            Reset Password
                          </DropdownMenuItem>
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

      {/* ── Add User modal ────────────────────────────────────────────────── */}
      {addOpen && (
        <AddUserDialog
          onClose={() => setAddOpen(false)}
          onCreate={(draft) => {
            const newUser: UserRow = {
              id: `local-${Date.now()}`,
              email: draft.email,
              first_name: draft.first_name,
              last_name: draft.last_name,
              role: draft.role,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              status: "ACTIVE",
            } as UserRow;
            setUsers(prev => [newUser, ...prev]);
            toast.success(`${draft.first_name} ${draft.last_name} added`);
            setAddOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Add User dialog ────────────────────────────────────────────────────────
interface AddUserDraft {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

function AddUserDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (draft: AddUserDraft) => void;
}) {
  const [draft, setDraft] = useState<AddUserDraft>({
    first_name: "",
    last_name: "",
    email: "",
    role: "clinician",
  });
  const [submitting, setSubmitting] = useState(false);

  const isValid =
    draft.first_name.trim() &&
    draft.last_name.trim() &&
    /^\S+@\S+\.\S+$/.test(draft.email) &&
    draft.role;

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    // The actual user-creation backend call is intentionally stubbed here —
    // wire it up to your auth provider / supabase invite when ready.
    await new Promise(r => setTimeout(r, 300));
    onCreate(draft);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl border-2 border-secondary/40 shadow-2xl w-full max-w-md overflow-hidden animate-enter">
        <div className="px-5 py-4 border-b border-secondary/15 bg-gradient-to-r from-secondary to-secondary/80">
          <h2 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add User
          </h2>
        </div>

        <div className="px-5 py-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name">
              <input
                type="text"
                value={draft.first_name}
                onChange={e => setDraft({ ...draft, first_name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border-2 border-[#87c4d8]/40 focus:outline-none focus:border-[#5B8AB8]/60 focus:ring-1 focus:ring-[#5B8AB8]/20"
              />
            </Field>
            <Field label="Last name">
              <input
                type="text"
                value={draft.last_name}
                onChange={e => setDraft({ ...draft, last_name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border-2 border-[#87c4d8]/40 focus:outline-none focus:border-[#5B8AB8]/60 focus:ring-1 focus:ring-[#5B8AB8]/20"
              />
            </Field>
          </div>

          <Field label="Email" icon={<Mail className="h-3 w-3 text-secondary/50" />}>
            <input
              type="email"
              value={draft.email}
              onChange={e => setDraft({ ...draft, email: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border-2 border-[#87c4d8]/40 focus:outline-none focus:border-[#5B8AB8]/60 focus:ring-1 focus:ring-[#5B8AB8]/20"
            />
          </Field>

          <Field label="Role">
            <select
              value={draft.role}
              onChange={e => setDraft({ ...draft, role: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border-2 border-[#87c4d8]/40 bg-white focus:outline-none focus:border-[#5B8AB8]/60 focus:ring-1 focus:ring-[#5B8AB8]/20"
            >
              <option value="clinician">Clinician</option>
              <option value="professor">Professor</option>
              <option value="clinical_admin">Clinical Admin</option>
              <option value="system_admin">System Admin</option>
            </select>
          </Field>
        </div>

        <div className="px-5 py-4 border-t border-secondary/15 bg-[#87c4d8]/5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-secondary border-2 border-[#87c4d8]/40 rounded-lg hover:bg-[#87c4d8]/15 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold uppercase tracking-wide bg-secondary text-white rounded-lg shadow-sm hover:bg-secondary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            {submitting ? "Adding…" : "Add User"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-secondary/70 mb-1">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
