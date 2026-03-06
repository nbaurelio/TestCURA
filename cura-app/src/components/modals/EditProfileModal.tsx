"use client";

import React, { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
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
      <DialogContent className="bg-background max-w-[380px] p-0 gap-0 rounded-lg overflow-hidden">
        <DialogHeader className="bg-primary p-4">
          <DialogTitle className="text-secondary font-bold text-base">
            EDIT PROFILE
          </DialogTitle>
        </DialogHeader>

        <div className="p-5">
          <div className="flex justify-center mb-5">
            <div className="relative">
              <input
                type="file"
                id="avatar-upload"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <label
                htmlFor="avatar-upload"
                className="absolute -top-2 -left-2 w-7 h-7 bg-white border-2 border-secondary rounded-full flex items-center justify-center z-10 hover:bg-gray-100 cursor-pointer"
              >
                <Plus className="h-4 w-4 text-secondary" />
              </label>
              <Avatar className="h-[100px] w-[100px] rounded-[20px]">
                <AvatarImage src={avatarPreview || profile?.avatar_url || "https://via.placeholder.com/100x100/d4a574/ffffff?text=JD"} />
                <AvatarFallback className="rounded-[20px]">{getInitials()}</AvatarFallback>
              </Avatar>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-5 pb-5 border-b border-gray-200">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-secondary">First Name</label>
              <span className="text-sm text-gray-700 font-medium">{formData.first_name}</span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-secondary">Last Name</label>
              <span className="text-sm text-gray-700 font-medium">{formData.last_name}</span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-secondary">Year Level</label>
              <Input 
                className="h-8 text-sm" 
                value={formData.year_level}
                onChange={(e) => setFormData({...formData, year_level: e.target.value})}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-secondary">Clinical Department</label>
              <Input 
                className="h-8 text-sm" 
                value={formData.clinical_department}
                onChange={(e) => setFormData({...formData, clinical_department: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2.5 mb-5">
            <div className="grid grid-cols-[150px_1fr] items-center gap-2">
              <label className="text-xs font-semibold text-secondary">Email Address</label>
              <Input 
                className="h-8 text-sm" 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-[150px_1fr] items-center gap-2">
              <label className="text-xs font-semibold text-secondary">Password</label>
              <Input className="h-8 text-sm" type="password" placeholder="Leave blank to keep current" />
            </div>
            <div className="grid grid-cols-[150px_1fr] items-center gap-2">
              <label className="text-xs font-semibold text-secondary">Password Confirmation</label>
              <Input className="h-8 text-sm" type="password" placeholder="Leave blank to keep current" />
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-4 border-t border-gray-200">
            <Button className="px-8" onClick={handleSave} disabled={loading}>
              {loading ? "SAVING..." : "SAVE"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              CANCEL
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
