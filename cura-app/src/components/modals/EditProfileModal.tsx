"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import { AlertTriangle, Plus, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { getMockUserProfile, updateProfile, Profile } from "@/lib/api/profiles";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

export function EditProfileModal({ open, onOpenChange, onSave }: EditProfileModalProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  // Two-step confirm flow for account deactivation.
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    year_level: "",
    clinical_department: "",
    batch_name: "",
    subrole: "",
    email: "",
    avatar_url: "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropComplete = useCallback((_: any, cap: any) => {
    setCroppedAreaPixels(cap);
  }, []);

  const getCroppedImg = (src: string, pixelCrop: any): Promise<string> => {
    return new Promise((resolve) => {
      const image = new window.Image();
      image.src = src;
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
    });
  };

  const handleCropConfirm = async () => {
    if (!cropSrc || !croppedAreaPixels) return;
    const cropped = await getCroppedImg(cropSrc, croppedAreaPixels);
    setAvatarPreview(cropped);
    setFormData(prev => ({ ...prev, avatar_url: cropped }));
    setCropSrc(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (open) {
      loadProfile();
      // Always start with blank password fields — the dialog never shows
      // the existing password, and a stale value would be misleading.
      setPassword("");
      setConfirmPassword("");
      setPasswordError(null);
      setConfirmDeactivate(false);
    }
  }, [open]);

  // Re-validate the password match in real time so the user sees feedback
  // as they type and the Save button enables/disables accordingly.
  useEffect(() => {
    if (!password && !confirmPassword) {
      setPasswordError(null);
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
    } else {
      setPasswordError(null);
    }
  }, [password, confirmPassword]);

  const loadProfile = async () => {
    try {
      const data = await getMockUserProfile();
      if (data) {
        setProfile(data);
        setFormData({
          first_name: data.first_name,
          last_name: data.last_name,
          year_level: data.year_level || "",
          clinical_department: data.clinical_department || "",
          batch_name: (data as any).batch_name || "",
          subrole: (data as any).subrole || "",
          email: data.email,
          avatar_url: data.avatar_url || "",
        });
        setAvatarPreview(data.avatar_url || null);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const handleSave = async () => {
    if (!profile) {
      console.error("No profile loaded");
      return;
    }

    // Block saving when the user has typed something into either password
    // field but the two values disagree. An empty pair is allowed and means
    // "keep the existing password".
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const updates: Record<string, any> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        year_level: formData.year_level,
        clinical_department: formData.clinical_department,
        batch_name: formData.batch_name,
        subrole: formData.subrole || null,
        email: formData.email,
        avatar_url: formData.avatar_url,
      };
      if (password.length > 0) {
        updates.password = password;
      }
      const result = await updateProfile(profile.id, updates as any);
      
      console.log("Update result:", result);
      
      if (result) {
        console.log("Profile updated successfully");
        if (onSave) {
          onSave();
        }
        onOpenChange(false);
      } else {
        console.error("Update returned null");
        alert("Failed to update profile. Please check console for details.");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!profile) return;
    try {
      setDeactivating(true);
      const result = await updateProfile(profile.id, { status: "INACTIVE" } as any);
      if (!result) {
        alert("Failed to deactivate account. Please try again.");
        setDeactivating(false);
        return;
      }
      // Clear the in-memory session and push the user back to the login
      // screen. Their next login attempt will be rejected by the INACTIVE
      // check in `/login`.
      logout();
      onOpenChange(false);
      router.replace("/login");
    } catch (err) {
      console.error("Error deactivating account:", err);
      alert("Failed to deactivate account. Please try again.");
      setDeactivating(false);
    }
  };

  const getInitials = () => {
    if (!formData.first_name || !formData.last_name) return "U";
    return `${formData.first_name[0]}${formData.last_name[0]}`.toUpperCase();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropSrc(reader.result as string);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  return (
    <>
    {/* Crop Dialog */}
    <Dialog open={!!cropSrc} onOpenChange={() => { setCropSrc(null); }}>
      <DialogContent className="bg-white max-w-[380px] w-[92vw] p-0 gap-0 rounded-xl overflow-hidden shadow-xl [&>button:last-child]:hidden">
        <DialogHeader className="bg-secondary p-3 sticky top-0 z-10">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-white font-bold text-xs uppercase tracking-wide">Crop Photo</DialogTitle>
              <p className="text-white/70 text-[10px] mt-0.5">Drag to reposition · Pinch or scroll to zoom</p>
            </div>
            <button type="button" onClick={() => setCropSrc(null)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/20 transition-colors mt-0.5 shrink-0">
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        </DialogHeader>

        {/* Crop area */}
        <div className="relative w-full bg-black" style={{ height: 280 }}>
          {cropSrc && (
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        {/* Zoom controls */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setZoom(z => Math.max(1, z - 0.1))} className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors">
              <ZoomOut className="h-4 w-4 text-gray-600" />
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-secondary h-1.5 cursor-pointer"
            />
            <button type="button" onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors">
              <ZoomIn className="h-4 w-4 text-gray-600" />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={handleCropConfirm} className="flex-1 py-2 text-xs font-bold bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors">
              USE PHOTO
            </button>
            <button type="button" onClick={() => setCropSrc(null)} className="flex-1 py-2 text-xs font-bold border-2 border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
              CANCEL
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-[380px] w-[92vw] p-0 gap-0 rounded-xl overflow-hidden shadow-xl max-h-[85vh] overflow-y-auto [&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100 [&>button]:top-3 [&>button]:right-3">
        <DialogHeader className="bg-secondary p-3 sm:p-4 sticky top-0 z-10">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-white font-bold text-xs sm:text-sm uppercase tracking-wide">
                Edit Profile
              </DialogTitle>
              <p className="text-white/70 text-[10px] mt-0.5">Update your profile information</p>
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

          {/* Avatar */}
          <div className="flex justify-center py-2">
            <div className="relative">
              <input
                type="file"
                id="avatar-upload"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <Avatar className="h-20 w-20 rounded-2xl border-2 border-gray-200 shadow-md">
                <AvatarImage src={avatarPreview || profile?.avatar_url || "https://via.placeholder.com/100x100/d4a574/ffffff?text=JD"} />
                <AvatarFallback className="rounded-2xl bg-gradient-to-br from-accent to-secondary text-white font-bold text-lg">{getInitials()}</AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-2 -right-2 w-7 h-7 bg-secondary rounded-full flex items-center justify-center shadow-md cursor-pointer hover:bg-secondary/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-white" />
              </label>
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 space-y-2">
            <label className="text-[10px] font-bold text-secondary uppercase tracking-wide block">Personal Info</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-1 block">First Name</label>
                <p className="text-xs font-semibold text-secondary bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">{formData.first_name || "—"}</p>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Last Name</label>
                <p className="text-xs font-semibold text-secondary bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">{formData.last_name || "—"}</p>
              </div>
            </div>
            {profile?.role === "clinical_admin" ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Clinical Discipline</label>
                  <p className="text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1.5 cursor-not-allowed">OD</p>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Clinical Section</label>
                  <p className="text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1.5 cursor-not-allowed">OM</p>
                </div>
              </div>
            ) : profile?.role === "professor" ? (
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Role</label>
                <select
                  className="h-8 w-full text-xs border border-gray-300 rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-secondary bg-white"
                  value={formData.subrole}
                  onChange={(e) => setFormData({...formData, subrole: e.target.value})}
                >
                  <option value="">Select role</option>
                  <option value="Clinical Chair">Clinical Chair</option>
                  <option value="Discipline Head">Discipline Head</option>
                  <option value="Department Head">Department Head</option>
                  <option value="Professor">Professor</option>
                </select>
              </div>
            ) : profile?.role === "system_admin" ? null : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Year Level</label>
                  <select
                    className="h-8 w-full text-xs border border-gray-300 rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-secondary bg-white"
                    value={formData.year_level}
                    onChange={(e) => setFormData({...formData, year_level: e.target.value})}
                  >
                    <option value="">Select year</option>
                    <option value="5th yr">5th yr</option>
                    <option value="6th yr">6th yr</option>
                    <option value="Residency">Residency</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Clinical Shift</label>
                  <select
                    className="h-8 w-full text-xs border border-gray-300 rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-secondary bg-white"
                    value={formData.clinical_department}
                    onChange={(e) => setFormData({...formData, clinical_department: e.target.value})}
                  >
                    <option value="">Select shift</option>
                    <option value="Oral Medicine (OM)">Oral Medicine (OM)</option>
                    <option value="Operative Dentistry (OP)">Operative Dentistry (OP)</option>
                    <option value="Prosthodontics (Prostho)">Prosthodontics (Prostho)</option>
                    <option value="Postgraduate Orthodontics (Ortho)">Postgraduate Orthodontics (Ortho)</option>
                  </select>
                </div>
              </div>
            )}
            {profile?.role !== "clinical_admin" && profile?.role !== "professor" && profile?.role !== "system_admin" && (
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Batch Name</label>
                <Input
                  className="h-8 text-xs border-gray-300 focus:ring-secondary"
                  value={formData.batch_name}
                  onChange={(e) => setFormData({...formData, batch_name: e.target.value})}
                  placeholder="e.g. Batch 2025"
                />
              </div>
            )}
          </div>

          {/* Account */}
          <div className="bg-blue-50 rounded-lg p-2.5 sm:p-3 border border-blue-200 space-y-2">
            <label className="text-[10px] font-bold text-blue-700 uppercase tracking-wide block">Account</label>
            <div>
              <label className="text-[10px] font-semibold text-blue-500 mb-1 block">Email Address</label>
              <Input
                className="h-8 text-xs border-blue-300 focus:ring-blue-500"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-blue-500 mb-1 block">New Password</label>
              <PasswordInput
                className={`h-8 text-xs ${passwordError ? "border-red-400 focus:ring-red-500" : "border-blue-300 focus:ring-blue-500"}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-blue-500 mb-1 block">Confirm Password</label>
              <PasswordInput
                className={`h-8 text-xs ${passwordError ? "border-red-400 focus:ring-red-500" : "border-blue-300 focus:ring-blue-500"}`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Leave blank to keep current"
              />
              {passwordError && (
                <p className="mt-1 text-[10px] font-semibold text-red-600">
                  {passwordError}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-row gap-2 pt-1.5 w-full">
            <Button
              className="flex-1 bg-secondary hover:bg-secondary/90 text-white text-[10px] font-bold uppercase h-8 disabled:opacity-50"
              onClick={handleSave}
              disabled={loading || !!passwordError || deactivating}
            >
              {loading ? "SAVING..." : "SAVE CHANGES"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-[10px] font-bold h-8"
              onClick={() => onOpenChange(false)}
              disabled={loading || deactivating}
            >
              CANCEL
            </Button>
          </div>

          {/* ── Danger zone: self-deactivation ─────────────────────────── */}
          <div className="mt-1 pt-2 border-t border-red-100">
            {!confirmDeactivate ? (
              <button
                type="button"
                onClick={() => setConfirmDeactivate(true)}
                disabled={loading || deactivating}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <AlertTriangle className="h-3 w-3" />
                Deactivate Account
              </button>
            ) : (
              <div className="rounded-md border border-red-200 bg-red-50 p-2.5 space-y-2">
                <div className="flex items-start gap-1.5 text-[10px] font-semibold text-red-700 leading-snug">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Deactivating signs you out and blocks future logins. Only
                    an administrator can reactivate your account.
                  </span>
                </div>
                <div className="flex flex-row gap-2">
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase h-8 disabled:opacity-50"
                    onClick={handleDeactivate}
                    disabled={deactivating}
                  >
                    {deactivating ? "DEACTIVATING..." : "YES, DEACTIVATE"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-[10px] font-bold h-8"
                    onClick={() => setConfirmDeactivate(false)}
                    disabled={deactivating}
                  >
                    KEEP ACCOUNT
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
