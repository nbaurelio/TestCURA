"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, FileText, Bell, LogOut, User, Activity, ChevronDown } from "lucide-react";
import { getMockUserProfile, Profile } from "@/lib/api/profiles";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditProfileModal } from "@/components/modals/EditProfileModal";

interface HeaderProps {
  onProfileUpdate?: () => void;
  onSearch?: (query: string, category: string) => void;
}

export function Header({ onProfileUpdate, onSearch }: HeaderProps = {}) {
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("chart_number");

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (onSearch) {
      onSearch(searchQuery, searchCategory);
    }
  }, [searchQuery, searchCategory, onSearch]);

  const loadProfile = async () => {
    try {
      const data = await getMockUserProfile();
      setProfile(data);
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };
  
  // Get user's first name from database
  const userFirstName = profile?.first_name || "User";

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-2 bg-white border-b border-gray-200 shadow-sm">
        <Link href="/home" className="flex items-center">
          <Image 
            src="/CURA_Full.png" 
            alt="CURA Logo" 
            width={100} 
            height={34}
            className="object-contain"
            priority
          />
        </Link>

        <div className="flex items-center gap-3 sm:gap-5">
          <div className="hidden sm:flex items-center bg-gray-50 rounded px-3 sm:px-4 py-2 w-[150px] sm:w-[200px] md:w-[320px] border border-gray-300 hover:border-accent transition-colors">
            <input
              type="text"
              placeholder="Search referrals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-none outline-none flex-1 text-xs sm:text-sm bg-transparent text-gray-700 font-medium placeholder:text-gray-400"
            />
            <div className="flex items-center border-l border-gray-300 pl-2.5 pr-1">
              <select
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                className="text-xs text-gray-600 bg-transparent border-none outline-none cursor-pointer font-semibold appearance-none pr-4 hover:text-secondary transition-colors"
                style={{ backgroundImage: 'none' }}
              >
                <option value="chart_number">Chart #</option>
                <option value="medical_alert">Medical Alert</option>
                <option value="origin">Origin</option>
                <option value="destination">Destination</option>
                <option value="medical_history">Medical History</option>
                <option value="approved_by">Approved By</option>
              </select>
            </div>
            <Search className="h-4 w-4 text-gray-400 ml-2" />
          </div>

          <button className="sm:hidden p-2 rounded hover:bg-gray-100 transition-colors">
            <Search className="h-5 w-5 text-secondary" />
          </button>
          <button className="p-2 rounded hover:bg-gray-100 transition-colors">
            <FileText className="h-5 w-5 text-secondary" />
          </button>
          <button className="p-2 rounded hover:bg-gray-100 transition-colors relative">
            <Bell className="h-5 w-5 text-secondary" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-gray-100 transition-colors">
                <Avatar className="h-9 w-9 border-2 border-gray-300 shadow-sm">
                  <AvatarImage src={profile?.avatar_url || "https://via.placeholder.com/32x32/d4a574/ffffff?text=U"} />
                  <AvatarFallback className="bg-gradient-to-br from-accent to-secondary text-white text-xs font-bold">
                    {profile ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-secondary text-sm font-bold hidden sm:inline">{userFirstName}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-white border-2 border-gray-200 shadow-xl rounded-xl p-0 overflow-hidden">
              {/* Header banner */}
              <div className="bg-secondary px-3 py-2.5">
                <p className="text-white/70 text-[9px] uppercase tracking-wide">Signed in as</p>
                <p className="text-white font-bold text-xs">{userFirstName}</p>
              </div>
              <div className="p-1">
                <DropdownMenuItem
                  onClick={() => setIsEditProfileOpen(true)}
                  className="cursor-pointer rounded-lg px-3 py-2 text-[10px] font-bold text-secondary uppercase tracking-wide hover:bg-secondary hover:text-white transition-colors"
                >
                  <User className="mr-2 h-3.5 w-3.5" />
                  Edit My Profile
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2 text-[10px] font-bold text-secondary uppercase tracking-wide hover:bg-secondary hover:text-white transition-colors">
                  <Link href="/activity-logs">
                    <Activity className="mr-2 h-3.5 w-3.5" />
                    Activity Logs
                  </Link>
                </DropdownMenuItem>
                <div className="border-t border-gray-100 my-1" />
                <DropdownMenuItem className="cursor-pointer rounded-lg px-3 py-2 text-[10px] font-bold text-red-500 uppercase tracking-wide hover:bg-red-50 hover:text-red-600 transition-colors">
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Logout
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <EditProfileModal
        open={isEditProfileOpen}
        onOpenChange={setIsEditProfileOpen}
        onSave={() => {
          loadProfile();
          if (onProfileUpdate) {
            onProfileUpdate();
          }
        }}
      />
    </>
  );
}
