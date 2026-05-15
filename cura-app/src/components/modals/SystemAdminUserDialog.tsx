"use client";

import React, { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Profile, getProfessors } from "@/lib/api/profiles";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type ManageableRole = "clinician" | "professor" | "clinical_admin" | "system_admin";

export interface UserFormData {
  first_name: string;
  last_name: string;
  email: string;
  role: ManageableRole;
  // Clinician
  year_level?: string;
  clinical_department?: string; // also reused as "Clinical Section" for clinical_admin
  batch_name?: string;
  adviser_id?: string | null;
  // Professor
  subrole?: string;
  // Clinical Admin (Discipline is UI-only until column is added to schema)
  clinical_discipline?: string;
  // Common
  avatar_url?: string;
  password?: string;
}

interface SystemAdminUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit" | "view";
  /** Required when mode === "edit" or "view". */
  user?: Profile | null;
  /** Optional when mode === "view" â€” the dialog never calls it in that mode. */
  onSave: (data: UserFormData) => Promise<void> | void;
}

// â”€â”€â”€ Field option lists (kept in sync with EditProfileModal) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PROFESSOR_SUBROLES = ["Clinical Chair", "Discipline Head", "Department Head", "Professor"];
const YEAR_LEVELS = ["5th Year", "6th Year", "Residency"];
// The 4 canonical clinical sections (kept in sync with filterTaxonomy.ts).
const CLINICAL_SHIFTS = [
  "Oral Medicine (OM)",
  "Operative Dentistry (OP)",
  "Prosthodontics (Prostho)",
  "Postgraduate Orthodontics (Ortho)",
];
const CLINICAL_DISCIPLINES = ["OD", "OM", "OP", "Prostho", "Ortho"];
const CLINICAL_SECTIONS = ["OM", "OP", "Prostho", "Ortho", "OD"];

const EMPTY_FORM: UserFormData = {
  first_name: "",
  last_name: "",
  email: "",
  role: "clinician",
  year_level: "",
  clinical_department: "",
  batch_name: "",
  adviser_id: null,
  subrole: "",
  clinical_discipline: "",
  avatar_url: "",
  password: "",
};

/**
 * Unified Add / Edit user dialog used by the System Admin Users Management
 * page. Field set is driven by the selected role and mirrors the existing
 * `EditProfileModal` field structure so the UX stays consistent across the app.
 *
 * Uses Radix `Dialog` which renders via Portal â€” this guarantees the overlay
 * escapes the System Admin page's `.animate-enter` transform wrapper and
 * covers the entire viewport.
 */
export function SystemAdminUserDialog({
  open,
  onOpenChange,
  mode,
  user,
  onSave,
}: SystemAdminUserDialogProps) {
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Adviser dropdown: fetched lazily on first open and reused across re-opens.
  const [professors, setProfessors] = useState<Profile[]>([]);
  useEffect(() => {
    if (!open || professors.length > 0) return;
    getProfessors().then(setProfessors).catch(err => console.error("Failed to load professors", err));
  }, [open, professors.length]);

  // Hydrate the form whenever the dialog opens. In edit mode we prefill from
  // the supplied `user`; in add mode we reset to empty defaults.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmPassword("");
    if ((mode === "edit" || mode === "view") && user) {
      setForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        role: ((user.role as ManageableRole) || "clinician"),
        year_level: user.year_level || "",
        clinical_department: user.clinical_department || "",
        batch_name: (user as any).batch_name || "",
        adviser_id: (user as any).adviser_id || null,
        subrole: (user as any).subrole || "",
        clinical_discipline: "",
        avatar_url: user.avatar_url || "",
        // In view mode we surface the stored plaintext password so the
        // System Admin can confirm credentials. Edit mode starts blank —
        // an empty value means "keep current" on save.
        password: mode === "view" ? ((user as any).password || "") : "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, mode, user]);

  const update = <K extends keyof UserFormData>(key: K, value: UserFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const initials = (() => {
    const f = form.first_name?.[0] || "";
    const l = form.last_name?.[0] || "";
    return (f + l).toUpperCase() || "U";
  })();

  // Avatar preview: re-uses the same crop-less direct-upload pattern as the
  // sidebar profile card. Cropping is intentionally omitted â€” the System Admin
  // is provisioning accounts in bulk, not personalising them pixel-perfect.
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => update("avatar_url", reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    setError(null);

    // Required-field validation
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First and last name are required.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setError("Enter a valid email address.");
      return;
    }
    // Add mode: password is required.
    if (mode === "add") {
      if (!form.password || form.password.length < 6) {
        setError("Password is required and must be at least 6 characters.");
        return;
      }
      if (form.password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }
    // Edit mode: a new password is optional, but if typed it must match.
    if (mode === "edit" && form.password && form.password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      await onSave(form);
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to save user.");
    } finally {
      setSubmitting(false);
    }
  };

  // In view mode every field is locked and the password section is hidden.
  const readOnly = mode === "view";

  // --- Role-specific Personal Info fields ---
  const renderRoleFields = () => {
    if (form.role === "clinical_admin") {
      return (
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="Clinical Discipline"
            value={form.clinical_discipline || ""}
            onChange={v => update("clinical_discipline", v)}
            options={CLINICAL_DISCIPLINES}
            placeholder="Select discipline"
            disabled={readOnly}
          />
          <SelectField
            label="Clinical Section"
            value={form.clinical_department || ""}
            onChange={v => update("clinical_department", v)}
            options={CLINICAL_SECTIONS}
            placeholder="Select section"
            disabled={readOnly}
          />
        </div>
      );
    }

    if (form.role === "professor") {
      return (
        <SelectField
          label="Role"
          value={form.subrole || ""}
          onChange={v => update("subrole", v)}
          options={PROFESSOR_SUBROLES}
          placeholder="Select role"
          disabled={readOnly}
        />
      );
    }

    if (form.role === "system_admin") {
      // System admins have no clinical fields
      return null;
    }

    // clinician (default)
    return (
      <>
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="Year Level"
            value={form.year_level || ""}
            onChange={v => update("year_level", v)}
            options={YEAR_LEVELS}
            placeholder="Select year"
            disabled={readOnly}
          />
          <SelectField
            label="Clinical Shift"
            value={form.clinical_department || ""}
            onChange={v => update("clinical_department", v)}
            options={CLINICAL_SHIFTS}
            placeholder="Select shift"
            disabled={readOnly}
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Batch Name</label>
          <Input
            className="h-8 text-xs border-gray-300 focus:ring-secondary"
            value={form.batch_name || ""}
            onChange={e => update("batch_name", e.target.value)}
            placeholder="e.g. Batch 2025"
            disabled={readOnly}
          />
        </div>
        {/* Adviser: assigns this clinician as an advisee of the chosen
            professor. Stored as `adviser_id` on the profiles table. */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Adviser</label>
          <select
            className="w-full h-8 text-xs border border-gray-300 rounded px-2 focus:ring-secondary focus:border-secondary disabled:opacity-60 disabled:cursor-not-allowed bg-white"
            value={form.adviser_id || ""}
            onChange={e => update("adviser_id", e.target.value || null)}
            disabled={readOnly}
          >
            <option value="">No adviser</option>
            {professors.map(p => (
              <option key={p.id} value={p.id}>
                {`${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email}
              </option>
            ))}
          </select>
        </div>
      </>
    );
  };

  const titleText =
    mode === "add" ? "Add User" : mode === "view" ? "View Profile" : "Edit Profile";
  const subtitleText =
    mode === "add"
      ? "Provision a new account"
      : mode === "view"
        ? "User account details (read-only)"
        : "Update this user's information";
  const submitText = mode === "add" ? (submitting ? "ADDING..." : "ADD USER") : (submitting ? "SAVING..." : "SAVE CHANGES");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-[420px] w-[92vw] p-0 gap-0 rounded-xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto [&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100 [&>button]:top-3 [&>button]:right-3">
        <DialogHeader className="bg-secondary p-3 sm:p-4 sticky top-0 z-10">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-white font-bold text-xs sm:text-sm uppercase tracking-wide">
                {titleText}
              </DialogTitle>
              <p className="text-white/70 text-[10px] mt-0.5">{subtitleText}</p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/20 transition-colors mt-0.5 shrink-0"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        </DialogHeader>

        <div className="p-3 sm:p-4 space-y-2.5">
          {/* â”€â”€ Avatar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="flex justify-center py-2">
            <div className="relative">
              <input
                type="file"
                id="sa-avatar-upload"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <Avatar className="h-20 w-20 rounded-2xl border-2 border-gray-200 shadow-md">
                <AvatarImage src={form.avatar_url || undefined} />
                <AvatarFallback className="rounded-2xl bg-gradient-to-br from-accent to-secondary text-white font-bold text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!readOnly && (
                <label
                  htmlFor="sa-avatar-upload"
                  className="absolute -bottom-2 -right-2 w-7 h-7 bg-secondary rounded-full flex items-center justify-center shadow-md cursor-pointer hover:bg-secondary/90 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 text-white" />
                </label>
              )}
            </div>
          </div>

          {/* â”€â”€ Role selector (only when adding) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {mode === "add" && (
            <div className="bg-amber-50 rounded-lg p-2.5 sm:p-3 border border-amber-200">
              <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wide block mb-1.5">
                Account Role
              </label>
              <select
                className="h-8 w-full text-xs border border-amber-300 rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                value={form.role}
                onChange={e => update("role", e.target.value as ManageableRole)}
              >
                <option value="clinician">Clinician</option>
                <option value="professor">Professor</option>
                <option value="clinical_admin">Clinical Admin</option>
                <option value="system_admin">System Admin</option>
              </select>
            </div>
          )}

          {/* â”€â”€ Personal Info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 space-y-2">
            <label className="text-[10px] font-bold text-secondary uppercase tracking-wide block">
              Personal Info
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-1 block">First Name</label>
                <Input
                  className="h-8 text-xs border-gray-300 focus:ring-secondary"
                  value={form.first_name}
                  onChange={e => update("first_name", e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Last Name</label>
                <Input
                  className="h-8 text-xs border-gray-300 focus:ring-secondary"
                  value={form.last_name}
                  onChange={e => update("last_name", e.target.value)}
                  disabled={readOnly}
                />
              </div>
            </div>
            {renderRoleFields()}
          </div>

          {/* â”€â”€ Account â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="bg-blue-50 rounded-lg p-2.5 sm:p-3 border border-blue-200 space-y-2">
            <label className="text-[10px] font-bold text-blue-700 uppercase tracking-wide block">Account</label>
            <div>
              <label className="text-[10px] font-semibold text-blue-500 mb-1 block">Email Address</label>
              <Input
                className="h-8 text-xs border-blue-300 focus:ring-blue-500"
                type="email"
                value={form.email}
                onChange={e => update("email", e.target.value)}
                placeholder="user@example.com"
                disabled={readOnly}
              />
            </div>
            {/* View mode: show the currently-stored password (read-only).
                Edit mode: New Password + Confirm Password for resetting. */}
            {mode === "view" && (
              <div>
                <label className="text-[10px] font-semibold text-blue-500 mb-1 block">Password</label>
                <PasswordInput
                  className="h-8 text-xs border-blue-300 focus:ring-blue-500"
                  value={form.password || ""}
                  onChange={() => {}}
                  placeholder="(no password set)"
                  readOnly
                  disabled
                />
              </div>
            )}
            {mode === "edit" && (
              <>
                <div>
                  <label className="text-[10px] font-semibold text-blue-500 mb-1 block">New Password</label>
                  <PasswordInput
                    className="h-8 text-xs border-blue-300 focus:ring-blue-500"
                    value={form.password || ""}
                    onChange={e => update("password", e.target.value)}
                    placeholder="Leave blank to keep current"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-blue-500 mb-1 block">Confirm Password</label>
                  <PasswordInput
                    className="h-8 text-xs border-blue-300 focus:ring-blue-500"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                  />
                </div>
              </>
            )}
            {mode === "add" && (
              <>
                <div>
                  <label className="text-[10px] font-semibold text-blue-500 mb-1 block">Password</label>
                  <PasswordInput
                    className="h-8 text-xs border-blue-300 focus:ring-blue-500"
                    value={form.password || ""}
                    onChange={e => update("password", e.target.value)}
                    placeholder="Enter password"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-blue-500 mb-1 block">Confirm Password</label>
                  <PasswordInput
                    className="h-8 text-xs border-blue-300 focus:ring-blue-500"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                  />
                </div>
              </>
            )}
          </div>

          {/* â”€â”€ Inline error â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[11px] font-semibold text-red-600">
              {error}
            </div>
          )}

          {/* â”€â”€ Action buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {readOnly ? (
            <div className="pt-1.5 w-full">
              <Button
                className="w-full bg-secondary hover:bg-secondary/90 text-white text-[10px] font-bold uppercase h-8"
                onClick={() => onOpenChange(false)}
              >
                CLOSE
              </Button>
            </div>
          ) : (
            <div className="flex flex-row gap-2 pt-1.5 w-full">
              <Button
                className="flex-1 bg-secondary hover:bg-secondary/90 text-white text-[10px] font-bold uppercase h-8 disabled:opacity-50"
                onClick={handleSave}
                disabled={submitting}
              >
                {submitText}
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-[10px] font-bold h-8"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                CANCEL
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// â”€â”€â”€ Small reusable select field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-gray-500 mb-1 block">{label}</label>
      <select
        className="h-8 w-full text-xs border border-gray-300 rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-secondary bg-white disabled:opacity-60 disabled:cursor-not-allowed"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">{placeholder || "Select"}</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
