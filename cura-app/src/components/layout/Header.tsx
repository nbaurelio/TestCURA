"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, FileText, Bell, LogOut, User, Activity, ChevronDown, Calendar, MapPin, Clock, Archive, BellOff, BellRing } from "lucide-react";
import { getMockUserProfile, Profile, getMockUserProfileSync, hasProfileCache } from "@/lib/api/profiles";
import { useAuth } from "@/context/AuthContext";
import { useNotificationContext, SystemNotification } from "@/context/NotificationContext";
import { getReferralNotifications, getCalendarNotifications, formatActionLabel, getActionColor, getDNDState, setDNDState, ReferralNotification, CalendarNotification } from "@/lib/api/notifications";
import { sendSystemNotification } from "@/lib/utils/notify";
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
  const { logout, role } = useAuth();
  const { recentNotifications: contextNotifications, unreadCount: contextUnreadCount, markAsRead: markContextAsRead, clearNotifications: clearContextNotifications } = useNotificationContext();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  // Initialize with cached data to prevent avatar flickering on navigation
  const [profile, setProfile] = useState<Profile | null>(getMockUserProfileSync());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("medical_alert");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileCategoryOpen, setIsMobileCategoryOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const mobileCategoryRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  // Notification state
  const [referralNotifs, setReferralNotifs] = useState<ReferralNotification[]>([]);
  const [calendarNotifs, setCalendarNotifs] = useState<CalendarNotification[]>([]);
  const [isReferralPanelOpen, setIsReferralPanelOpen] = useState(false);
  const [isCalendarPanelOpen, setIsCalendarPanelOpen] = useState(false);
  const [isDNDEnabled, setIsDNDEnabled] = useState(false);
  const referralPanelRef = useRef<HTMLDivElement>(null);
  const calendarPanelRef = useRef<HTMLDivElement>(null);
  const seenNotifIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);
  const contextNotificationsRef = useRef(contextNotifications);

  // Keep ref in sync so loadNotifications always sees latest context notifications
  useEffect(() => {
    contextNotificationsRef.current = contextNotifications;
  }, [contextNotifications]);

  // Load DND state on mount
  useEffect(() => {
    setIsDNDEnabled(getDNDState());
  }, []);

  // Toggle DND state
  const toggleDND = useCallback(() => {
    const newState = !isDNDEnabled;
    setDNDState(newState);
    setIsDNDEnabled(newState);
    if (newState) {
      setReferralNotifs([]);
    } else {
      loadNotifications();
    }
  }, [isDNDEnabled]);

  const CATEGORIES = [
    { value: "medical_alert",   label: "Medical Alert" },
    { value: "origin",          label: "Origin" },
    { value: "destination",     label: "Destination" },
  ];

  const selectedLabel = CATEGORIES.find(c => c.value === searchCategory)?.label ?? "Medical Alert";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
      if (referralPanelRef.current && !referralPanelRef.current.contains(e.target as Node)) {
        setIsReferralPanelOpen(false);
      }
      if (calendarPanelRef.current && !calendarPanelRef.current.contains(e.target as Node)) {
        setIsCalendarPanelOpen(false);
      }
      if (mobileCategoryRef.current && !mobileCategoryRef.current.contains(e.target as Node)) {
        setIsMobileCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch notifications and merge with context notifications (from system notifications)
  const loadNotifications = useCallback(async () => {
    try {
      const [refNotifs, calNotifs] = await Promise.all([
        getReferralNotifications(),
        getCalendarNotifications(),
      ]);

      // Read latest context notifications via ref to avoid stale closure
      const latestContextNotifs = contextNotificationsRef.current;

      // Convert context notifications to ReferralNotification format and merge
      const contextReferralNotifs = latestContextNotifs
        .filter(n => n.type === "referral" || n.type === "system")
        .map(n => ({
          id: n.id,
          action: "SYSTEM_NOTIFICATION" as string,
          description: `${n.title}: ${n.body}`,
          created_at: n.created_at,
          metadata: null,
          read: n.read,
        }));

      // Convert context calendar notifications
      const contextCalendarNotifs = latestContextNotifs
        .filter(n => n.type === "calendar")
        .map(n => ({
          id: n.id,
          title: n.title,
          start_time: n.created_at, // Use created time as fallback
          end_time: n.created_at,
          location: undefined,
          patient_name: n.body,
          isUpcoming: true,
        }));

      // Merge and sort by date (newest first), remove duplicates by id
      const mergedReferral = [...contextReferralNotifs, ...refNotifs]
        .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 20);

      const mergedCalendar = [...contextCalendarNotifs, ...calNotifs]
        .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
        .slice(0, 20);

      setReferralNotifs(mergedReferral);
      setCalendarNotifs(mergedCalendar);

      // Fire Windows notifications for new INCOMING_* rows (professor/admin inbox)
      if (!isFirstLoad.current) {
        const INCOMING_ACTIONS = [
          "INCOMING_EDIT_REQUEST",
          "INCOMING_REREFER_REQUEST",
          "INCOMING_DELETION_REQUEST",
          "INCOMING_STATUS_CHANGE_REQUEST",
        ];
        const INCOMING_LABELS: Record<string, string> = {
          INCOMING_EDIT_REQUEST:          "📝 New Edit Request",
          INCOMING_REREFER_REQUEST:       "🔄 New Rerefer Request",
          INCOMING_DELETION_REQUEST:      "🗑️ New Deletion Request",
          INCOMING_STATUS_CHANGE_REQUEST: "📋 New Status Change Request",
        };
        for (const notif of refNotifs) {
          if (INCOMING_ACTIONS.includes(notif.action) && !seenNotifIds.current.has(notif.id)) {
            seenNotifIds.current.add(notif.id);
            sendSystemNotification(
              INCOMING_LABELS[notif.action] || "New Request",
              notif.description,
              "referral"
            );
          }
        }
      } else {
        // On first load, just seed the seen set — don't fire for old rows
        for (const notif of refNotifs) seenNotifIds.current.add(notif.id);
        isFirstLoad.current = false;
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    // Only fetch if no cached data exists
    if (!hasProfileCache()) {
      loadProfile();
    }
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
      <header className="sticky top-0 z-[60] flex items-center justify-between px-4 sm:px-6 py-0.5 bg-[#87c4d8] border-b border-[#6aafc8] shadow-[0_4px_16px_0_rgba(106,175,200,0.35)]">
        <Link href={role === "clinical_admin" ? "/clinical-admin" : role === "professor" ? "/professor" : "/home"} className="flex items-center gap-2.5">
          <Image
            src="/upcd_logo.png"
            alt="UPCD Logo"
            width={34}
            height={34}
            className="object-contain"
            priority
          />
          <div className="w-px h-7 bg-secondary mx-0.5" />
          <Image 
            src="/CURA_Full_WhiteTooth.png" 
            alt="CURA Logo" 
            width={100} 
            height={34}
            className="object-contain"
            priority
          />
        </Link>

        <div className="flex items-center gap-3 sm:gap-5">
          {/* Referral search — hidden for system admins (no referral context) */}
          {role !== "system_admin" && (
          <div className="hidden sm:flex items-center rounded-lg w-[200px] sm:w-[240px] md:w-[340px] border border-[#6aafc8] bg-white shadow-sm overflow-visible focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary/20 transition-all">
            <Search className="h-3.5 w-3.5 text-secondary/50 ml-3 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search referrals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-none outline-none flex-1 text-xs bg-transparent text-secondary placeholder:text-secondary/40 py-2 px-2.5"
            />
            {/* Custom category selector */}
            <div ref={categoryRef} className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsCategoryOpen(prev => !prev)}
                className="flex items-center gap-1 border-l border-[#6aafc8] px-2.5 py-2 text-[11px] font-bold text-secondary bg-blue-50 hover:bg-secondary hover:text-white transition-colors rounded-r-lg h-full"
              >
                <span className="whitespace-nowrap">{selectedLabel}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
              </button>
              {isCategoryOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => { setSearchCategory(cat.value); setIsCategoryOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${
                        searchCategory === cat.value
                          ? "bg-secondary text-white"
                          : "text-gray-700 hover:bg-secondary/10 hover:text-secondary"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          )}
          {role !== "system_admin" && (
          <button
            className="sm:hidden p-2 rounded hover:bg-[#6aafc8] transition-colors"
            onClick={() => {
              setIsMobileSearchOpen(prev => !prev);
              setTimeout(() => mobileSearchRef.current?.focus(), 100);
            }}
          >
            <Search className="h-5 w-5 text-secondary" />
          </button>
          )}
          {/* Referral Notifications — hidden for system admins */}
          {role !== "system_admin" && (
          <div ref={referralPanelRef} className="relative">
            <button
              onClick={() => {
                setIsReferralPanelOpen(p => !p);
                setIsCalendarPanelOpen(false);
                // Mark all context notifications as read when opening panel
                contextNotifications.filter(n => !n.read).forEach(n => markContextAsRead(n.id));
              }}
              className="p-2 rounded hover:bg-[#6aafc8] transition-colors relative"
            >
              {isDNDEnabled ? (
                <BellOff className="h-5 w-5 text-secondary/50" />
              ) : (
                <FileText className="h-5 w-5 text-secondary" />
              )}
              {!isDNDEnabled && contextUnreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1">
                  {contextUnreadCount > 9 ? "9+" : contextUnreadCount}
                </span>
              )}
            </button>
            {isReferralPanelOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border-2 border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="bg-secondary px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-xs uppercase tracking-wide">Referral Updates</p>
                    <p className="text-white/60 text-[9px]">Recent activity on your referrals</p>
                  </div>
                  <button
                    onClick={toggleDND}
                    className={`p-1.5 rounded transition-colors ${isDNDEnabled ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                    title={isDNDEnabled ? "Turn off Do Not Disturb" : "Turn on Do Not Disturb"}
                  >
                    {isDNDEnabled ? <BellOff className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {isDNDEnabled ? (
                    <div className="p-6 text-center">
                      <BellOff className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-400 font-medium">Notifications silenced</p>
                      <p className="text-[9px] text-gray-300 mt-1">Do Not Disturb is enabled</p>
                    </div>
                  ) : referralNotifs.length === 0 && contextNotifications.filter(n => n.type === "referral" || n.type === "system").length === 0 ? (
                    <div className="p-6 text-center">
                      <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-400 font-medium">No referral updates</p>
                    </div>
                  ) : (
                    <>
                      {contextNotifications.filter(n => n.type === "referral" || n.type === "system").map((notif) => (
                        <div key={notif.id} className={`px-3 py-2.5 border-b border-gray-100 hover:bg-gray-50 transition-colors ${!notif.read ? "bg-blue-50/40" : ""}`}>
                          <div className="flex items-start gap-2">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap mt-0.5 bg-blue-100 text-blue-700">
                              {notif.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-700 mt-1 line-clamp-2">{notif.body}</p>
                          <p className="text-[9px] text-gray-400 mt-1">
                            {new Date(notif.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                          </p>
                        </div>
                      ))}
                      {referralNotifs.map((notif) => (
                        <div key={notif.id} className="px-3 py-2.5 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start gap-2">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap mt-0.5 ${getActionColor(notif.action)}`}>
                              {formatActionLabel(notif.action)}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-700 mt-1 line-clamp-2">{notif.description}</p>
                          <p className="text-[9px] text-gray-400 mt-1">
                            {new Date(notif.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                          </p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
                <Link
                  href="/activity-logs"
                  onClick={() => setIsReferralPanelOpen(false)}
                  className="block text-center py-2 text-[10px] font-bold text-secondary uppercase tracking-wide hover:bg-secondary/5 border-t border-gray-100"
                >
                  View All Activity
                </Link>
              </div>
            )}
          </div>

          )}

          {/* Calendar Notifications â€” hidden for system admins */}
          {role !== "system_admin" && (
          <div ref={calendarPanelRef} className="relative">
            <button
              onClick={() => { setIsCalendarPanelOpen(p => !p); setIsReferralPanelOpen(false); }}
              className="p-2 rounded hover:bg-[#6aafc8] transition-colors relative"
            >
              <Clock className="h-5 w-5 text-secondary" />
              {calendarNotifs.filter(e => e.isRecent || e.isUpcoming).length > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1">
                  {calendarNotifs.filter(e => e.isRecent || e.isUpcoming).length > 9 ? "9+" : calendarNotifs.filter(e => e.isRecent || e.isUpcoming).length}
                </span>
              )}
            </button>
            {isCalendarPanelOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border-2 border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="bg-secondary px-4 py-2.5">
                  <p className="text-white font-bold text-xs uppercase tracking-wide">Upcoming Schedule</p>
                  <p className="text-white/60 text-[9px]">Your upcoming events & reminders</p>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {calendarNotifs.length === 0 ? (
                    <div className="p-6 text-center">
                      <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-400 font-medium">No upcoming events</p>
                    </div>
                  ) : (
                    calendarNotifs.map((event) => (
                      <div key={event.id} className="px-3 py-2.5 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <p className="text-xs text-gray-800 font-bold">{event.title}</p>
                          {event.isRecent ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 whitespace-nowrap">Now</span>
                          ) : event.isUpcoming && (() => {
                            const diffMs = new Date(event.start_time).getTime() - Date.now();
                            const diffH = diffMs / (1000 * 60 * 60);
                            const label = diffH <= 1 ? "< 1 hr" : diffH <= 24 ? "Today" : diffH <= 48 ? "Tomorrow" : "Upcoming";
                            const cls = diffH <= 1 ? "bg-orange-100 text-orange-700" : diffH <= 24 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700";
                            return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${cls}`}>{label}</span>;
                          })()}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1 text-[10px] text-gray-500">
                            <Clock className="h-3 w-3" />
                            {new Date(event.start_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </div>
                          )}
                        </div>
                        {event.patient_name && (
                          <p className="text-[10px] text-gray-500 mt-0.5">Patient: {event.patient_name}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <Link
                  href="/schedule"
                  onClick={() => setIsCalendarPanelOpen(false)}
                  className="block text-center py-2 text-[10px] font-bold text-secondary uppercase tracking-wide hover:bg-secondary/5 border-t border-gray-100"
                >
                  View Full Schedule
                </Link>
              </div>
            )}
          </div>
          )}

          {role !== "system_admin" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-[#6aafc8] transition-colors">
                <Avatar className="h-7 w-7 border-2 border-white/60 shadow-sm">
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
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer rounded-lg px-3 py-2 text-[10px] font-bold text-red-500 uppercase tracking-wide hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Logout
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>
      </header>

      {/* Mobile Search Bar */}
      {isMobileSearchOpen && role !== "system_admin" && (
        <div className="sm:hidden sticky top-[42px] z-40 bg-[#87c4d8] border-b border-[#6aafc8] px-4 py-2.5 shadow-md">
          <div className="flex items-center bg-white rounded-lg border border-[#6aafc8] shadow-sm overflow-visible">
            <Search className="h-3.5 w-3.5 text-secondary/50 ml-3 flex-shrink-0" />
            <input
              ref={mobileSearchRef}
              type="text"
              placeholder="Search referrals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-none outline-none flex-1 text-xs bg-transparent text-secondary placeholder:text-secondary/40 py-2.5 px-2.5"
            />
            {/* Category selector */}
            <div ref={mobileCategoryRef} className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileCategoryOpen(prev => !prev)}
                className="flex items-center gap-1 border-l border-[#6aafc8] px-2.5 py-2.5 text-[11px] font-bold text-secondary bg-blue-50 hover:bg-secondary hover:text-white transition-colors h-full"
              >
                <span className="whitespace-nowrap">{selectedLabel}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${isMobileCategoryOpen ? "rotate-180" : ""}`} />
              </button>
              {isMobileCategoryOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => { setSearchCategory(cat.value); setIsMobileCategoryOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${
                        searchCategory === cat.value
                          ? "bg-secondary text-white"
                          : "text-gray-700 hover:bg-secondary/10 hover:text-secondary"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => { setIsMobileSearchOpen(false); setSearchQuery(""); setIsMobileCategoryOpen(false); }}
              className="px-2.5 py-2 text-secondary/50 hover:text-secondary transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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
