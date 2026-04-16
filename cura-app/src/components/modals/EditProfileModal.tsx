"use client";

import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
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
    email: "",
    avatar_url: "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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
        email: formData.email,
        avatar_url: formData.avatar_url,
      });
      
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
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatarPreview(base64String);
        setFormData({...formData, avatar_url: base64String});
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-[380px] w-[92vw] p-0 gap-0 rounded-xl overflow-hidden shadow-xl max-h-[85vh] overflow-y-auto [&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100 [&>button]:top-3 [&>button]:right-3">
        <DialogHeader className="bg-secondary p-3 sm:p-4 sticky top-0 z-10">
          <DialogTitle className="text-white font-bold text-xs sm:text-sm uppercase tracking-wide">
            Edit Profile
          </DialogTitle>
          <p className="text-white/70 text-[10px] mt-0.5">Update your profile information</p>
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
                <Input
                  className="h-8 text-xs border-gray-300 focus:ring-secondary"
                  value={formData.year_level}
                  onChange={(e) => setFormData({...formData, year_level: e.target.value})}
                  placeholder="e.g. 4th Year"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Clinical Dept.</label>
                <Input
                  className="h-8 text-xs border-gray-300 focus:ring-secondary"
                  value={formData.clinical_department}
                  onChange={(e) => setFormData({...formData, clinical_department: e.target.value})}
                  placeholder="e.g. Prostho"
                />
              </div>
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
  );
}
