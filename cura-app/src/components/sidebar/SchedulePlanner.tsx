"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Star, ArrowUpRight, Search, X as XIcon } from "lucide-react";
import { getEvents, updateEvent, hasEventsCache, getAdviseeEvents, getAllReferralEvents, getEventOverrides, upsertEventOverride } from "@/lib/api/events";
import { sendSystemNotification, requestNotificationPermission } from "@/lib/utils/notify";
import { getMockUserProfile, hasProfileCache, getMockUserProfileSync, getCurrentUserId, getAdvisees, getProfile, Profile } from "@/lib/api/profiles";

interface Event {
  id: string;
  user_id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  color?: string;
  notes?: string;
  is_favorite?: boolean;
  source?: string;
  advisee_name?: string;
}

interface SchedulePlannerProps {
  userName?: string;
  refreshKey?: number;
}

export function SchedulePlanner({
  userName,
  refreshKey,
}: SchedulePlannerProps) {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  // Only show loading on initial load if no cache exists
  const [loading, setLoading] = useState(!hasEventsCache());
  const [userFirstName, setUserFirstName] = useState<string>(userName || "[USER]");
  const [isProfessor, setIsProfessor] = useState(false);
  const [isClinicalAdmin, setIsClinicalAdmin] = useState(false);
  const [clinicalAdminId, setClinicalAdminId] = useState<string | null>(null);
  const [isMySectionActive, setIsMySectionActive] = useState(false);
  const [clinicalDepartment, setClinicalDepartment] = useState<string | null>(null);
  const [advisees, setAdvisees] = useState<Profile[]>([]);
  const [professorId, setProfessorId] = useState<string | null>(null);
  const adviseeEventIds = useRef<Set<string>>(new Set());
  const [adviseeFilter, setAdviseeFilter] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const loadUserName = useCallback(async () => {
    if (userName) {
      setUserFirstName(userName);
      return;
    }
    try {
      // Get from cache if available, otherwise fetch
      const profile = hasProfileCache() ? getMockUserProfileSync() : await getMockUserProfile();
      if (profile?.first_name) {
        setUserFirstName(profile.first_name);
      }
    } catch (error) {
      console.error("Error loading user name:", error);
    }
  }, [userName]);

  const loadEvents = useCallback(async (currentAdvisees?: Profile[], profId?: string, clinicalAdmin?: boolean, caId?: string) => {
    try {
      if (clinicalAdmin && caId) {
        const [allData, overrides] = await Promise.all([
          getAllReferralEvents(),
          getEventOverrides(caId),
        ]);
        const now = new Date();
        const userIds = new Set<string>((allData || []).map((e: any) => e.user_id).filter(Boolean));
        const nameMap: Record<string, string> = {};
        await Promise.all(Array.from(userIds).map(async (uid) => {
          try {
            const p = await getProfile(uid);
            if (p) nameMap[uid] = `${p.first_name} ${p.last_name}`.trim();
          } catch {}
        }));
        const allEvents: Event[] = (allData || []).map((e: any) => {
          const ov = (overrides as Record<string, { color?: string; is_favorite?: boolean }>)[e.id];
          return {
            ...e,
            color: ov?.color ?? "#1e3a5f",
            is_favorite: ov?.is_favorite ?? false,
            advisee_name: nameMap[e.user_id] || "Clinician",
          };
        });
        const upcomingEvents = allEvents
          .filter(event => new Date(event.end_time) > now)
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        const combined = [...upcomingEvents].sort((a, b) => {
          if (a.is_favorite && !b.is_favorite) return -1;
          if (!a.is_favorite && b.is_favorite) return 1;
          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        });
        setEvents(combined);
        setLoading(false);
        return;
      }

      const [ownData, adviseeData, overrides] = await Promise.all([
        getEvents(false),
        (currentAdvisees && currentAdvisees.length > 0)
          ? getAdviseeEvents(currentAdvisees.map(a => a.id))
          : Promise.resolve([]),
        profId ? getEventOverrides(profId) : Promise.resolve({} as Record<string, { color?: string; is_favorite?: boolean }>),
      ]);

      const now = new Date();
      const ownEvents: Event[] = (ownData || []).map((e: any) => ({ ...e }));

      const adviseeNameMap: Record<string, string> = {};
      if (currentAdvisees) {
        currentAdvisees.forEach(a => {
          adviseeNameMap[a.id] = `${a.first_name} ${a.last_name}`.trim();
        });
      }

      const newAdviseeIds = new Set<string>();
      const adviseeEvents: Event[] = (adviseeData || []).map((e: any) => {
        newAdviseeIds.add(e.id);
        const ov = (overrides as Record<string, { color?: string; is_favorite?: boolean }>)[e.id] || {};
        return {
          ...e,
          color: ov.color ?? "#1e3a5f",
          is_favorite: ov.is_favorite ?? false,
          advisee_name: adviseeNameMap[e.user_id] || "Advisee",
        };
      });
      adviseeEventIds.current = newAdviseeIds;

      const allEvents = [...ownEvents, ...adviseeEvents];
      const seen = new Set<string>();
      const unique = allEvents.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });

      const upcomingEvents = unique
        .filter(event => new Date(event.end_time) > now)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      const combined = [...upcomingEvents].sort((a, b) => {
        if (a.is_favorite && !b.is_favorite) return -1;
        if (!a.is_favorite && b.is_favorite) return 1;
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      });

      setEvents(combined);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const init = async () => {
      const profile = await getMockUserProfile(false);
      const isClinicalChair = profile?.role === "professor" && (profile as any)?.subrole === "Clinical Chair";
      if (isClinicalChair) {
        setIsClinicalAdmin(true);
        setClinicalAdminId(profile!.id);
        await loadEvents([], undefined, true, profile!.id);
      } else if (profile?.role === "professor") {
        setIsProfessor(true);
        setProfessorId(profile.id);
        const adv = await getAdvisees(profile.id);
        setAdvisees(adv);
        await loadEvents(adv, profile.id);
      } else if (profile?.role === "clinical_admin") {
        setIsClinicalAdmin(true);
        setClinicalAdminId(profile.id);
        if (profile.clinical_department) {
          const match = profile.clinical_department.match(/\(([^)]+)\)/);
          setClinicalDepartment(match ? match[1] : profile.clinical_department);
        }
        await loadEvents([], undefined, true, profile.id);
      } else {
        await loadEvents([], undefined);
      }
      loadUserName();
    };
    init();
  }, [loadEvents, loadUserName]);

  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      loadEvents(advisees.length > 0 ? advisees : [], professorId || undefined, isClinicalAdmin, clinicalAdminId || undefined);
    }
  }, [refreshKey, loadEvents, advisees, professorId, isClinicalAdmin, clinicalAdminId]);

  // Request browser notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Notify user at multiple intervals before a favorited event
  // Thresholds: 3 days, 1 day, 1 hour, 30 min
  useEffect(() => {
    if (events.length === 0) return;

    const THRESHOLDS = [
      { minutes: 4320, label: "3 days" },
      { minutes: 1440, label: "1 day" },
      { minutes: 60, label: "1 hour" },
      { minutes: 30, label: "30 minutes" },
    ];


    const checkUpcoming = () => {
      const now = new Date().getTime();
      events.forEach((event) => {
        if (!event.is_favorite) return;

        const eventTime = new Date(event.start_time).getTime();
        const diff = eventTime - now;
        if (diff <= 0) return; // Already started

        THRESHOLDS.forEach(({ minutes, label }) => {
          const key = `${event.id}_${minutes}`;
          if (notifiedRef.current.has(key)) return;
          if (diff <= minutes * 60 * 1000) {
            notifiedRef.current.add(key);
            sendSystemNotification(`⭐ Upcoming: ${event.title}`, `Starts in ${label}`);
          }
        });
      });
    };

    checkUpcoming();
    const interval = setInterval(checkUpcoming, 60 * 1000); // Check every minute
    return () => clearInterval(interval);
  }, [events]);

  // Memoize format functions to prevent recreation
  const formatTime = useCallback((startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const formatTimeStr = (date: Date) => {
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minutesStr = minutes < 10 ? '0' + minutes : minutes;
      return `${hours}:${minutesStr} ${ampm}`;
    };
    
    return `${formatTimeStr(start)} - ${formatTimeStr(end)}`;
  }, []);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const days = ['SUN', 'MON', 'TUES', 'WED', 'THURS', 'FRI', 'SAT'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  }, []);

  const adviseeNames = useMemo(() => {
    if (isClinicalAdmin) {
      const names = Array.from(new Set(events.map(e => e.advisee_name).filter(Boolean))) as string[];
      return names;
    }
    return advisees.map(a => `${a.first_name} ${a.last_name}`.trim());
  }, [advisees, isClinicalAdmin, events]);

  const suggestions = useMemo(() => {
    if (!adviseeFilter.trim()) return adviseeNames;
    const q = adviseeFilter.toLowerCase();
    return adviseeNames.filter(n => n.toLowerCase().includes(q));
  }, [adviseeFilter, adviseeNames]);

  const filteredEvents = useMemo(() => {
    let base = events;
    if (isMySectionActive && clinicalDepartment) {
      base = base.filter(e =>
        e.location && e.location.toLowerCase() === clinicalDepartment.toLowerCase()
      );
    }
    if ((!advisees.length && !isClinicalAdmin) || !adviseeFilter.trim()) return base;
    const q = adviseeFilter.toLowerCase();
    return base.filter(e =>
      e.advisee_name ? e.advisee_name.toLowerCase().includes(q) : false
    );
  }, [events, adviseeFilter, isProfessor, isClinicalAdmin, isMySectionActive, clinicalDepartment]);

  return (
    <div className="bg-white/60 backdrop-blur-sm border-2 border-gray-300 rounded shadow overflow-hidden">
        <h3 className="bg-secondary text-white text-xs font-bold py-2.5 px-4 text-center uppercase tracking-wide flex items-center justify-between">
          <span className="flex-1 text-center">{userFirstName}&apos;s Schedule</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => router.push("/schedule")}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/20 transition-colors"
              title="Open full schedule"
            >
              <ArrowUpRight className="h-3 w-3 text-white" />
            </button>
          </div>
        </h3>

        {(advisees.length > 0 || isClinicalAdmin) && (
          <div ref={searchRef} className="px-3 pt-3 pb-1 relative">
            <div className="flex items-center gap-1.5 bg-white border-2 border-gray-200 rounded-lg px-2.5 py-1.5 focus-within:border-secondary transition-colors">
              <Search className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={adviseeFilter}
                onChange={e => { setAdviseeFilter(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder={isClinicalAdmin ? "Filter by clinician..." : "Filter by advisee..."}
                className="flex-1 text-[11px] outline-none bg-transparent text-gray-700 placeholder-gray-400 min-w-0"
              />
              {adviseeFilter && (
                <button type="button" onClick={() => { setAdviseeFilter(""); setShowSuggestions(false); }} className="flex-shrink-0">
                  <XIcon className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-3 right-3 top-full mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                {suggestions.map(name => (
                  <button
                    key={name}
                    type="button"
                    onMouseDown={() => { setAdviseeFilter(name); setShowSuggestions(false); }}
                    className="w-full text-left px-3 py-2 text-[11px] text-gray-700 hover:bg-secondary/10 hover:text-secondary font-medium transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-4">
          {loading ? (
            <div className="text-center text-xs text-muted-foreground py-4">Loading events...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-4">
              {adviseeFilter.trim() ? `No events for "${adviseeFilter}"` : "No upcoming events"}
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div key={event.id} className="mb-3 last:mb-0">
                <div className="mb-2 flex items-center gap-1.5">
                  <span
                    className="text-white text-[10px] font-bold py-1.5 px-3 rounded inline-block uppercase tracking-wide"
                    style={{ backgroundColor: event.color || '#1e3a5f' }}
                  >
                    {formatDate(event.start_time)}
                  </span>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const newFav = !event.is_favorite;
                      try {
                        if (adviseeEventIds.current.has(event.id) && professorId) {
                          await upsertEventOverride(professorId, event.id, { is_favorite: newFav });
                        } else if (isClinicalAdmin && clinicalAdminId) {
                          await upsertEventOverride(clinicalAdminId, event.id, { is_favorite: newFav });
                        } else {
                          await updateEvent(event.id, { is_favorite: newFav } as any);
                        }
                        setEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, is_favorite: newFav } : ev));
                      } catch (err) {
                        console.error("Error toggling favorite:", err);
                      }
                    }}
                    className="hover:scale-110 transition-transform"
                    title={event.is_favorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Star className={`h-3.5 w-3.5 ${event.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`} />
                  </button>
                </div>

                <div
                  onClick={() => router.push(`/schedule?event=${event.id}`)}
                  className="bg-white rounded p-3 border-l-4 cursor-pointer hover:brightness-95 transition-all"
                  style={{
                    borderColor: event.color || '#1e3a5f',
                    borderWidth: '0 0 0 4px',
                    boxShadow: event.is_favorite
                      ? `0 0 6px 2px ${event.color || '#1e3a5f'}B3, 0 0 12px 4px ${event.color || '#1e3a5f'}66, 0 0 20px 6px ${event.color || '#1e3a5f'}33`
                      : '0 1px 3px rgba(0,0,0,0.08)',
                  }}
                >
                  {event.advisee_name && (
                    <div className="text-[9px] font-bold uppercase tracking-wide mb-1 px-1.5 py-0.5 rounded inline-block" style={{ backgroundColor: `${event.color || '#1e3a5f'}20`, color: event.color || '#1e3a5f' }}>
                      {event.advisee_name}
                    </div>
                  )}
                  <div className="text-xs font-bold mb-1" style={{ color: event.color || '#1e3a5f' }}>
                    {formatTime(event.start_time, event.end_time)}
                  </div>
                  <div className="text-sm font-semibold mb-1" style={{ color: event.color || '#1e3a5f' }}>
                    {event.title}
                  </div>
                  {event.location && (
                    <div className="text-xs text-muted-foreground">{event.location}</div>
                  )}
                  {event.notes && (
                    <div
                      className="text-xs italic mt-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
                      style={{ color: event.color || '#1e3a5f' }}
                      dangerouslySetInnerHTML={{ __html: event.notes }}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
    </div>
  );
}
