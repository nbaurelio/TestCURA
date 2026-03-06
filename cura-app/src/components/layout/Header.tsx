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
      <header className="flex items-center justify-between px-3 sm:px-5 py-2 sm:py-3 bg-primary">
        <Link href="/home" className="flex items-center">
          <Image 
            src="/cura-logo-header.png" 
            alt="CURA Logo" 
            width={40} 
            height={15}
            className="object-contain"
            priority
          />
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center bg-white rounded-full px-3 sm:px-4 py-1.5 w-[150px] sm:w-[200px] md:w-[300px] border border-gray-200">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-none outline-none flex-1 text-xs sm:text-sm bg-transparent text-gray-600"
            />
            <div className="flex items-center border-l border-gray-300 pl-2 pr-1">
              <select
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                className="text-xs text-gray-600 bg-transparent border-none outline-none cursor-pointer font-medium appearance-none pr-4"
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
            <Search className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 ml-2" />
          </div>

          <Search className="sm:hidden h-5 w-5 text-secondary cursor-pointer" />
          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-secondary cursor-pointer hover:text-secondary/80" />
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-secondary cursor-pointer hover:text-secondary/80" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || "https://via.placeholder.com/32x32/d4a574/ffffff?text=U"} />
                  <AvatarFallback className="bg-amber-200 text-amber-800 text-xs">
                    {profile ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-secondary text-sm font-medium hidden sm:inline">{userFirstName}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white border-gray-200">
              <DropdownMenuItem
                onClick={() => setIsEditProfileOpen(true)}
                className="cursor-pointer font-medium text-secondary text-sm"
              >
                <User className="mr-2 h-4 w-4" />
                EDIT MY PROFILE
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer font-medium text-secondary text-sm">
                <Link href="/activity-logs">
                  <Activity className="mr-2 h-4 w-4" />
                  ACTIVITY LOGS
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer font-medium text-red-600 text-sm">
                <LogOut className="mr-2 h-4 w-4" />
                LOGOUT
              </DropdownMenuItem>
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
