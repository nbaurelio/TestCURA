"use client";

import React, { useState, useEffect, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Plus, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMockUserProfile, updateProfile, Profile } from "@/lib/api/profiles";
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    year_level: "",
    clinical_department: "",
    batch_name: "",
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
    }
  }, [open]);

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

    console.log("Saving profile with data:", {
      id: profile.id,
      updates: {
        first_name: formData.first_name,
        last_name: formData.last_name,
        year_level: formData.year_level,
        clinical_department: formData.clinical_department,
        email: formData.email,
      }
    });

    try {
      setLoading(true);
      const result = await updateProfile(profile.id, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        year_level: formData.year_level,
        clinical_department: formData.clinical_department,
        batch_name: formData.batch_name,
        email: formData.email,
        avatar_url: formData.avatar_url,
      } as any);
      
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
            <button type="button" onClick={() => setCropSrc(null)} className="flex-1 py-2 text-xs font-bold border-2 border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
              CANCEL
            </button>
            <button type="button" onClick={handleCropConfirm} className="flex-1 py-2 text-xs font-bold bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors">
              USE PHOTO
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
            <div>
              <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Batch Name</label>
              <Input
                className="h-8 text-xs border-gray-300 focus:ring-secondary"
                value={formData.batch_name}
                onChange={(e) => setFormData({...formData, batch_name: e.target.value})}
                placeholder="e.g. Batch 2025"
              />
            </div>
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
              <Input className="h-8 text-xs border-blue-300 focus:ring-blue-500" type="password" placeholder="Leave blank to keep current" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-blue-500 mb-1 block">Confirm Password</label>
              <Input className="h-8 text-xs border-blue-300 focus:ring-blue-500" type="password" placeholder="Leave blank to keep current" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-row gap-2 pt-1.5 w-full">
            <Button
              className="flex-1 bg-secondary hover:bg-secondary/90 text-white text-[10px] font-bold uppercase h-8 disabled:opacity-50"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "SAVING..." : "SAVE CHANGES"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-[10px] font-bold h-8"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              CANCEL
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
