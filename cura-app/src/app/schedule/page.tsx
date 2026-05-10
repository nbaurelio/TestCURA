"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, ChevronLeft, ChevronRight, X, Clock, CalendarDays, Star, ChevronDown, Search } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { createEvent, getEvents, updateEvent, deleteEvent, hasEventsCache, EventFormData, getAdviseeEvents, getAllReferralEvents, getEventOverrides, upsertEventOverride, getEventStatusHistory, EventStatusChange } from "@/lib/api/events";
import { sendSystemNotification, requestNotificationPermission } from "@/lib/utils/notify";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { getMockUserProfile, getAdvisees, getProfile, getCurrentUserId } from "@/lib/api/profiles";
import { RouteGuard } from "@/components/auth/RouteGuard";

const days = ["SUN", "MON", "TUES", "WED", "THURS", "FRI", "SAT"];
const dates = [4, 5, 6, 7, 8, 9, 10];
const times = [
  "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM",
];

const STATUS_OPTIONS = [
  { value: "scheduled",          label: "Scheduled",          bg: "#3B82F6", ring: "#93C5FD" },
  { value: "treatment_rendered", label: "Treatment Rendered", bg: "#16A34A", ring: "#86EFAC" },
  { value: "canceled",           label: "Canceled",           bg: "#DC2626", ring: "#FCA5A5" },
  { value: "rescheduled",        label: "Rescheduled",        bg: "#D97706", ring: "#FCD34D" },
  { value: "no_show",            label: "No Show",            bg: "#6B7280", ring: "#D1D5DB" },
];

const EVENT_COLORS = [
  { label: "Red",    value: "#EF4444" },
  { label: "Pink",   value: "#EC4899" },
  { label: "Orange", value: "#F97316" },
  { label: "Yellow", value: "#EAB308" },
  { label: "Green",  value: "#22C55E" },
  { label: "Teal",   value: "#14B8A6" },
  { label: "Sky",    value: "#0EA5E9" },
  { label: "Purple", value: "#A855F7" },
  { label: "Dark",   value: "#374151" },
];

interface Event {
  id: string;
  user_id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  patient_name?: string;
  color?: string;
  notes?: string;
  medical_alert?: string;
  is_favorite?: boolean;
  status?: string;
  source?: string;
  advisee_name?: string;
}

// Helper to get the start of the current week (Sunday)
const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

function SchedulePageInner() {
  const now = new Date();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(now.toLocaleDateString('en-US', { month: 'long' }));
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(now));
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFirstName, setUserFirstName] = useState<string>("[USER]");
  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    location: "",
    patient_name: "",
    color: "#1e3a5f",
    notes: "",
    medical_alert: "",
    is_favorite: false,
    status: "scheduled",
  });
  const [error, setError] = useState<string | null>(null);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{ event: Event; x: number; y: number } | null>(null);
  const [professorId, setProfessorId] = useState<string | null>(null);
  const [isClinicalAdmin, setIsClinicalAdmin] = useState(false);
  const [clinicalAdminId, setClinicalAdminId] = useState<string | null>(null);
  const [isMySectionActive, setIsMySectionActive] = useState(false);
  const [clinicalDepartment, setClinicalDepartment] = useState<string | null>(null);
  const adviseeEventIds = React.useRef<Set<string>>(new Set());
  const [statusHistory, setStatusHistory] = useState<EventStatusChange[]>([]);
  const [statusChangers, setStatusChangers] = useState<Record<string, string>>({});
  const [adviseeNames, setAdviseeNames] = useState<string[]>([]);
  const [adviseeFilter, setAdviseeFilter] = useState("");
  const [showAdviseeFilterSuggestions, setShowAdviseeFilterSuggestions] = useState(false);
  const adviseeSearchRef = React.useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const profile = await getMockUserProfile(false);
      const isClinicalChair = profile?.role === "professor" && (profile as any)?.subrole === "Clinical Chair";
      if (isClinicalChair) {
        setIsClinicalAdmin(true);
        setClinicalAdminId(profile!.id);
        await loadEvents(undefined, true, profile!.id);
      } else if (profile?.role === "professor") {
        setProfessorId(profile.id);
        await loadEvents(profile.id);
      } else if (profile?.role === "clinical_admin") {
        setIsClinicalAdmin(true);
        setClinicalAdminId(profile.id);
        if (profile.clinical_department) {
          const match = profile.clinical_department.match(/\(([^)]+)\)/);
          setClinicalDepartment(match ? match[1] : profile.clinical_department);
        }
        await loadEvents(undefined, true, profile.id);
      } else {
        await loadEvents();
      }
      loadUserName();
      requestNotificationPermission();
    };
    init();
  }, []);

  useEffect(() => {
    const eventId = searchParams.get("event");
    if (eventId && events.length > 0) {
      const target = events.find(e => e.id === eventId);
      if (target) {
        setSelectedEvent(target);
        setIsEventDetailsOpen(true);
        router.replace("/schedule", { scroll: false });
      }
    }
  }, [searchParams, events]);

  const loadUserName = async () => {
    try {
      const profile = await getMockUserProfile();
      if (profile?.first_name) {
        setUserFirstName(profile.first_name);
      }
    } catch (error) {
      console.error("Error loading user name:", error);
    }
  };

  const loadEvents = async (profId?: string, clinicalAdmin?: boolean, caId?: string) => {
    try {
      setLoading(true);
      const newAdviseeIds = new Set<string>();

      if (clinicalAdmin && caId) {
        const [allData, overrides] = await Promise.all([
          getAllReferralEvents(),
          getEventOverrides(caId),
        ]);
        const userIds = new Set<string>((allData || []).map((e: any) => e.user_id).filter(Boolean));
        const nameMap: Record<string, string> = {};
        await Promise.all(Array.from(userIds).map(async (uid) => {
          try {
            const p = await getProfile(uid);
            if (p) nameMap[uid] = `${p.first_name} ${p.last_name}`.trim();
          } catch {}
        }));
        const ov = overrides as Record<string, { color?: string; is_favorite?: boolean }>;
        const taggedEvents = (allData || []).map((e: any) => {
          const o = ov[e.id];
          return {
            ...e,
            color: o?.color ?? "#1e3a5f",
            is_favorite: o?.is_favorite ?? false,
            advisee_name: nameMap[e.user_id] || "Clinician",
          };
        });
        const clinicianNameList = Array.from(new Set(taggedEvents.map((e: any) => e.advisee_name))) as string[];
        setAdviseeNames(clinicianNameList);
        setEvents(taggedEvents);
        setLoading(false);
        return;
      }

      const profile = profId ? { id: profId, role: "professor" } : await getMockUserProfile(false);
      const ownData = await getEvents();
      let allEvents = [...(ownData || [])];

      if (profile?.role === "professor") {
        const [advisees, overrides] = await Promise.all([
          getAdvisees(profile.id),
          getEventOverrides(profile.id),
        ]);
        if (advisees.length > 0) {
          const adviseeNameMap: Record<string, string> = {};
          advisees.forEach(a => { adviseeNameMap[a.id] = `${a.first_name} ${a.last_name}`.trim(); });
          setAdviseeNames(advisees.map(a => `${a.first_name} ${a.last_name}`.trim()));
          const adviseeData = await getAdviseeEvents(advisees.map(a => a.id));
          const ov = overrides as Record<string, { color?: string; is_favorite?: boolean }>;
          const taggedAdviseeEvents = (adviseeData || []).map((e: any) => {
            newAdviseeIds.add(e.id);
            const o = ov[e.id] || {};
            return {
              ...e,
              color: o.color ?? "#1e3a5f",
              is_favorite: o.is_favorite ?? false,
              advisee_name: adviseeNameMap[e.user_id] || "Advisee",
            };
          });
          const seen = new Set(allEvents.map((e: any) => e.id));
          taggedAdviseeEvents.forEach((e: any) => { if (!seen.has(e.id)) allEvents.push(e); });
        }
      }

      adviseeEventIds.current = newAdviseeIds;
      setEvents(allEvents);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.start_time || !formData.end_time) {
      setError("Please fill in all required fields");
      return;
    }
    setIsSaveConfirmOpen(true);
  };

  const confirmSaveEvent = async () => {
    try {
      setError(null);
      
      // Convert datetime-local format to ISO string for database
      const eventData = {
        ...formData,
        location: formData.location === "__custom__" ? "" : formData.location,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
      };
      
      console.log("Saving event:", eventData);
      
      if (isEditMode && selectedEvent) {
        if (adviseeEventIds.current.has(selectedEvent.id) && professorId) {
          // Professor editing advisee event — save color/favorite as override
          await upsertEventOverride(professorId, selectedEvent.id, {
            color: eventData.color,
            is_favorite: eventData.is_favorite,
          });
          // Also save non-visual fields to the event record normally
          await updateEvent(selectedEvent.id, {
            title: eventData.title,
            description: eventData.description,
            start_time: eventData.start_time,
            end_time: eventData.end_time,
            location: eventData.location,
            patient_name: eventData.patient_name,
            notes: eventData.notes,
            medical_alert: eventData.medical_alert,
            status: eventData.status,
          });
        } else if (isClinicalAdmin && clinicalAdminId) {
          // Clinical admin editing a clinician event — save color/favorite as override
          await upsertEventOverride(clinicalAdminId, selectedEvent.id, {
            color: eventData.color,
            is_favorite: eventData.is_favorite,
          });
          // Save all other fields directly
          await updateEvent(selectedEvent.id, {
            title: eventData.title,
            description: eventData.description,
            start_time: eventData.start_time,
            end_time: eventData.end_time,
            location: eventData.location,
            patient_name: eventData.patient_name,
            notes: eventData.notes,
            medical_alert: eventData.medical_alert,
            status: eventData.status,
          });
        } else {
          await updateEvent(selectedEvent.id, eventData);
        }
        sendSystemNotification("✅ Event Updated", `"${formData.title}" has been successfully updated.`);
      } else {
        // Create new event
        await createEvent(eventData);
        sendSystemNotification("✅ Event Created", `"${formData.title}" has been successfully created.`);
      }
      
      await loadEvents(professorId || undefined, isClinicalAdmin, clinicalAdminId || undefined);
      setIsSaveConfirmOpen(false);
      setIsModalOpen(false);
      setIsEditMode(false);
      setSelectedEvent(null);
      setFormData({
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        location: "",
        patient_name: "",
        color: "#1e3a5f",
        notes: "",
        is_favorite: false,
      });
    } catch (err) {
      console.error("Error saving event:", err);
      setError("Failed to save event");
    }
  };

  const handleViewEvent = async (event: Event) => {
    setSelectedEvent(event);
    setStatusHistory([]);
    setStatusChangers({});
    setIsEventDetailsOpen(true);
    try {
      const history = await getEventStatusHistory(event.id);
      setStatusHistory(history);
      const ids = Array.from(new Set(history.map(h => h.changed_by).filter(Boolean))) as string[];
      const map: Record<string, string> = {};
      await Promise.all(ids.map(async uid => {
        const p = await getProfile(uid);
        if (p) map[uid] = `${p.first_name} ${p.last_name}`;
      }));
      setStatusChangers(map);
    } catch {}
  };

  const handleEditEvent = () => {
    if (!selectedEvent) return;
    if (adviseeEventIds.current.has(selectedEvent.id)) return;
    
    const formatDateTime = (isoString: string) => {
      const date = new Date(isoString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    setFormData({
      title: selectedEvent.title,
      description: selectedEvent.description || "",
      start_time: formatDateTime(selectedEvent.start_time),
      end_time: formatDateTime(selectedEvent.end_time),
      location: selectedEvent.location || "",
      patient_name: selectedEvent.patient_name || "",
      color: selectedEvent.color || "#1e3a5f",
      notes: selectedEvent.notes || "",
      medical_alert: selectedEvent.medical_alert || "",
      is_favorite: selectedEvent.is_favorite || false,
      status: selectedEvent.status || "scheduled",
    });
    setIsEditMode(true);
    setIsEventDetailsOpen(false);
    setIsModalOpen(true);
  };

  const handleDeleteEvent = () => {
    if (!selectedEvent) return;
    setEventToDelete(selectedEvent);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    
    try {
      const deletedTitle = eventToDelete.title;
      await deleteEvent(eventToDelete.id);
      await loadEvents(professorId || undefined, isClinicalAdmin, clinicalAdminId || undefined);
      setIsDeleteConfirmOpen(false);
      setEventToDelete(null);
      setIsEventDetailsOpen(false);
      setSelectedEvent(null);
      sendSystemNotification("🗑️ Event Deleted", `"${deletedTitle}" has been removed from your schedule.`);
    } catch (err) {
      console.error("Error deleting event:", err);
      alert("Failed to delete event");
    }
  };

  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
    setSelectedYear(newDate.getFullYear());
    
    const monthName = newDate.toLocaleDateString('en-US', { month: 'long' });
    setCurrentMonth(monthName);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    // Jump to the first week of January in the selected year
    const newDate = getStartOfWeek(new Date(year, 0, 1));
    setCurrentWeekStart(newDate);
    const monthName = newDate.toLocaleDateString('en-US', { month: 'long' });
    setCurrentMonth(monthName);
  };

  const goToToday = () => {
    const today = new Date();
    const weekStart = getStartOfWeek(today);
    setCurrentWeekStart(weekStart);
    setSelectedYear(today.getFullYear());
    const monthName = today.toLocaleDateString('en-US', { month: 'long' });
    setCurrentMonth(monthName);
  };

  const isEventStart = (event: Event, date: Date, time: string) => {
    const [timeStr, period] = time.split(' ');
    let [hours, minutes] = timeStr.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    const eventStart = new Date(event.start_time);
    const slotStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
    
    // Check if event starts in this slot (within 30 minutes)
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + 30);
    
    return eventStart >= slotStart && eventStart < slotEnd;
  };

  const getEventDurationInSlots = (event: Event) => {
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);
    const durationMs = eventEnd.getTime() - eventStart.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    return Math.ceil(durationMinutes / 30); // Number of 30-minute slots
  };

  const getEventsForTimeSlot = (date: Date, time: string) => {
    const [timeStr, period] = time.split(' ');
    let [hours, minutes] = timeStr.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return events.filter(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      const slotStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + 30);
      
      return eventStart < slotEnd && eventEnd > slotStart;
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  };

  const roundToNearestHalfHour = (dateTimeString: string): string => {
    if (!dateTimeString) return dateTimeString;
    
    const date = new Date(dateTimeString);
    const minutes = date.getMinutes();
    const hours = date.getHours();
    
    // Round to nearest 30 minutes
    const roundedMinutes = minutes < 15 ? 0 : minutes < 45 ? 30 : 0;
    const roundedHours = minutes >= 45 ? hours + 1 : hours;
    
    // Enforce 6am-6pm range
    const clampedHours = Math.max(6, Math.min(18, roundedHours));
    
    date.setHours(clampedHours);
    date.setMinutes(roundedMinutes);
    date.setSeconds(0);
    date.setMilliseconds(0);
    
    // Convert back to datetime-local format
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hour}:${minute}`;
  };

  const handleTimeSlotClick = (date: Date, time: string) => {
    const [timeStr, period] = time.split(' ');
    let [hours, minutes] = timeStr.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    const startDateTime = new Date(date);
    startDateTime.setHours(hours, minutes, 0, 0);
    
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + 30);
    
    const formatDateTime = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    setFormData({
      ...formData,
      start_time: formatDateTime(startDateTime),
      end_time: formatDateTime(endDateTime),
    });
    setIsModalOpen(true);
  };

  const weekDates = getWeekDates();

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/bg-homepage.png)' }}
      />
      
      {/* White Opaque Overlay */}
      <div className="fixed inset-0 z-0 bg-white/60" />
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <Header />

      <main className="flex-1 p-4 sm:p-6 max-w-[1200px] mx-auto w-full">
        <Link href="/home" className="text-secondary text-sm mb-4 inline-block hover:underline">
          ← Back to Home
        </Link>

        {/* Header Bar */}
        <div className="bg-secondary rounded p-4 flex items-center justify-between shadow animate-enter" style={{ marginBottom: adviseeNames.length > 0 ? '0' : '1.5rem', borderRadius: adviseeNames.length > 0 ? '0.5rem 0.5rem 0 0' : '0.5rem' }}>
          <h1 className="text-white font-bold text-sm sm:text-base uppercase tracking-wide">{userFirstName}&apos;s Schedule Planner</h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setIsEditMode(false);
                setSelectedEvent(null);
                setError(null);
                setFormData({
                  title: "",
                  description: "",
                  start_time: "",
                  end_time: "",
                  location: "",
                  patient_name: "",
                  color: "#1e3a5f",
                  notes: "",
                  medical_alert: "",
                  is_favorite: false,
                  status: "scheduled",
                });
                setIsModalOpen(true);
              }} 
              className="text-white hover:text-white/80 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Advisee/Clinician Filter Bar */}
        {adviseeNames.length > 0 && (
          <div ref={adviseeSearchRef} className="bg-secondary/10 border-x-2 border-b-2 border-secondary/30 rounded-b px-4 py-2.5 mb-6 relative">
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-secondary flex-shrink-0" />
              <input
                type="text"
                value={adviseeFilter}
                onChange={e => { setAdviseeFilter(e.target.value); setShowAdviseeFilterSuggestions(true); }}
                onFocus={() => setShowAdviseeFilterSuggestions(true)}
                onBlur={() => setTimeout(() => setShowAdviseeFilterSuggestions(false), 150)}
                placeholder={isClinicalAdmin ? "Filter calendar by clinician..." : "Filter calendar by advisee..."}
                className="flex-1 text-xs outline-none bg-transparent text-secondary font-medium placeholder-secondary/50 min-w-0"
              />
              {adviseeFilter ? (
                <button type="button" onClick={() => { setAdviseeFilter(""); setShowAdviseeFilterSuggestions(false); }} className="text-secondary/60 hover:text-secondary transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            {showAdviseeFilterSuggestions && (
              <div className="absolute left-4 right-4 top-full mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                {(adviseeFilter.trim()
                  ? adviseeNames.filter(n => n.toLowerCase().includes(adviseeFilter.toLowerCase()))
                  : adviseeNames
                ).map(name => (
                  <button
                    key={name}
                    type="button"
                    onMouseDown={() => { setAdviseeFilter(name); setShowAdviseeFilterSuggestions(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-secondary/10 hover:text-secondary font-medium transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Calendar Container */}
        <div className="bg-white/60 backdrop-blur-sm rounded shadow border-2 border-gray-300 overflow-hidden animate-enter-delay-1">
          {/* Month Navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-4 px-6 border-b-2 border-gray-300 bg-muted">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigateWeek('prev')}
                className="w-8 h-8 rounded border-2 border-accent text-accent flex items-center justify-center hover:bg-accent hover:text-white transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-bold text-secondary text-lg min-w-[180px] text-center uppercase tracking-wide">{currentMonth}</span>
              <button 
                onClick={() => navigateWeek('next')}
                className="w-8 h-8 rounded border-2 border-accent text-accent flex items-center justify-center hover:bg-accent hover:text-white transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Year Filter */}
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="px-3 py-1.5 text-sm border-2 border-gray-300 rounded-md bg-white text-secondary font-bold hover:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary uppercase tracking-wide cursor-pointer transition-colors"
              >
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              
              {/* Today Button */}
              <button
                onClick={goToToday}
                className="px-4 py-1.5 text-sm bg-secondary text-white font-bold rounded hover:bg-secondary/90 transition-colors shadow uppercase tracking-wide"
              >
                Today
              </button>
            </div>
          </div>

          {/* Schedule Grid (header inside for alignment) */}
          <div className="max-h-[500px] overflow-y-auto [scrollbar-gutter:stable]">
            {/* Sticky Days Header */}
            <div className="grid gap-2 px-4 py-3 bg-muted border-b border-gray-300 sticky top-0 z-20" style={{ gridTemplateColumns: '4rem repeat(7, 1fr)' }}>
              <div className="w-16 shrink-0"></div>
              {weekDates.map((date, idx) => {
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <div key={idx} className="text-center">
                    <div className={`rounded py-2 px-2 ${
                      isToday
                        ? 'bg-secondary border-2 border-secondary shadow'
                        : 'bg-white border-2 border-gray-300'
                    }`}>
                      <div className={`text-[10px] font-bold uppercase tracking-wide ${
                        isToday ? 'text-white' : 'text-secondary'
                      }`}>{days[idx]}</div>
                      <div className={`text-sm font-bold ${
                        isToday ? 'text-white' : 'text-secondary'
                      }`}>{date.getDate()}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time rows */}
            <div className="px-4 pb-4 pt-2">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading events...</div>
            ) : (() => {
              // Constants: each 30-min slot row = 2rem height + 0.5rem gap
              const SLOT_H = 2;   // rem per 30-min slot
              const SLOT_GAP = 0.5; // rem gap between rows

              const baseEvents = isMySectionActive && clinicalDepartment
                ? events.filter(e => e.location && e.location.toLowerCase() === clinicalDepartment.toLowerCase())
                : events;
              const displayEvents = adviseeFilter.trim()
                ? baseEvents.filter(e => e.advisee_name
                    ? e.advisee_name.toLowerCase().includes(adviseeFilter.toLowerCase())
                    : !adviseeEventIds.current.has(e.id)
                  )
                : baseEvents;

              // Compute top offset (rem) of an event relative to the first time slot row
              const getTopRem = (ev: Event, date: Date) => {
                const [firstTimeStr, firstPeriod] = times[0].split(' ');
                let [fh, fm] = firstTimeStr.split(':').map(Number);
                if (firstPeriod === 'PM' && fh !== 12) fh += 12;
                if (firstPeriod === 'AM' && fh === 12) fh = 0;
                const gridStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), fh, fm, 0, 0);
                const evStart = new Date(ev.start_time);
                const diffMins = (evStart.getTime() - gridStart.getTime()) / 60000;
                const slotIndex = diffMins / 30;
                return slotIndex * (SLOT_H + SLOT_GAP);
              };

              const getHeightRem = (ev: Event) => {
                const durationMins = (new Date(ev.end_time).getTime() - new Date(ev.start_time).getTime()) / 60000;
                const slots = Math.max(1, Math.ceil(durationMins / 30));
                return slots * SLOT_H + (slots - 1) * SLOT_GAP;
              };

              // Greedy column assignment for a day's events
              const assignColumns = (dayEvents: Event[]) => {
                const sorted = [...dayEvents].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
                const cols: number[] = [];       // assigned column index per event
                const colEnds: number[] = [];    // end time (ms) of last event in each column

                sorted.forEach(ev => {
                  const start = new Date(ev.start_time).getTime();
                  const end = new Date(ev.end_time).getTime();
                  let placed = false;
                  for (let c = 0; c < colEnds.length; c++) {
                    if (colEnds[c] <= start) {
                      cols.push(c);
                      colEnds[c] = end;
                      placed = true;
                      break;
                    }
                  }
                  if (!placed) {
                    cols.push(colEnds.length);
                    colEnds.push(end);
                  }
                });

                const totalCols = colEnds.length || 1;
                return sorted.map((ev, i) => ({ ev, col: cols[i], totalCols }));
              };

              // Total grid height in rem
              const totalHeight = times.length * SLOT_H + (times.length - 1) * SLOT_GAP;

              return (
                <div className="grid gap-2" style={{ gridTemplateColumns: '4rem repeat(7, 1fr)' }}>
                  {/* Time labels column */}
                  <div className="relative" style={{ height: `${totalHeight}rem` }}>
                    {times.map((time, timeIdx) => (
                      <div
                        key={time}
                        className="absolute w-full text-xs text-gray-600 text-right pr-1 flex items-center justify-end font-medium"
                        style={{
                          top: `${timeIdx * (SLOT_H + SLOT_GAP)}rem`,
                          height: `${SLOT_H}rem`,
                        }}
                      >
                        {time}
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {weekDates.map((date, idx) => {
                    const isToday = date.toDateString() === new Date().toDateString();
                    const dayEvents = displayEvents.filter(ev => {
                      const evStart = new Date(ev.start_time);
                      const evEnd = new Date(ev.end_time);
                      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
                      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
                      return evStart <= dayEnd && evEnd >= dayStart;
                    });
                    const assigned = assignColumns(dayEvents);

                    return (
                      <div
                        key={idx}
                        className={`relative ${isToday ? 'bg-secondary/5 rounded-lg' : ''}`}
                        style={{ height: `${totalHeight}rem` }}
                      >
                        {/* Clickable slot backgrounds */}
                        {times.map((time, timeIdx) => (
                          <div
                            key={time}
                            onClick={() => handleTimeSlotClick(date, time)}
                            className={`absolute w-full rounded-lg cursor-pointer hover:bg-primary/30 transition-colors ${
                              isToday
                                ? 'bg-secondary/10 border-2 border-secondary/30'
                                : 'bg-gray-50 border border-gray-200'
                            }`}
                            style={{
                              top: `${timeIdx * (SLOT_H + SLOT_GAP)}rem`,
                              height: `${SLOT_H}rem`,
                            }}
                          />
                        ))}

                        {/* Events */}
                        {assigned.map(({ ev, col, totalCols }) => {
                          const topRem = getTopRem(ev, date);
                          const heightRem = getHeightRem(ev);
                          const widthPct = 100 / totalCols;
                          const leftPct = col * widthPct;
                          return (
                            <div
                              key={ev.id}
                              onClick={() => handleViewEvent(ev)}
                              onMouseEnter={(e) => setTooltip({ event: ev, x: e.clientX, y: e.clientY })}
                              onMouseMove={(e) => setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                              onMouseLeave={() => setTooltip(null)}
                              className="absolute text-white rounded text-[10px] font-bold overflow-hidden cursor-pointer transition-all hover:brightness-110 hover:scale-[1.02] flex items-center justify-center p-1"
                              style={{
                                top: `${topRem}rem`,
                                height: `${heightRem}rem`,
                                left: `calc(${leftPct}% + 1px)`,
                                width: `calc(${widthPct}% - 2px)`,
                                backgroundColor: ev.color || "#1e3a5f",
                                boxShadow: ev.is_favorite
                                  ? `0 0 6px 2px ${ev.color || "#1e3a5f"}B3, 0 0 12px 4px ${ev.color || "#1e3a5f"}66, 0 0 20px 6px ${ev.color || "#1e3a5f"}33`
                                  : "0 1px 3px 0 rgba(0,0,0,0.1)",
                                zIndex: 10,
                              }}
                            >
                              <span className="text-center leading-tight truncate flex items-center gap-0.5">
                                {ev.is_favorite && <Star className="h-2.5 w-2.5 fill-yellow-300 text-yellow-300 flex-shrink-0" />}
                                {ev.title}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Fixed-position event tooltip portal - renders outside all overflow containers */}
      {tooltip && (() => {
        const isReferral = tooltip.event.source === "referral" || tooltip.event.title?.startsWith("Referral Appointment");
        const statusOpt = STATUS_OPTIONS.find(o => o.value === (tooltip.event.status || "scheduled")) || STATUS_OPTIONS[0];
        const x = tooltip.x;
        const y = tooltip.y;
        const offRight = x + 200 > window.innerWidth;
        const formatTooltipTime = (start: string, end: string) => {
          const fmt = (d: Date) => { let h = d.getHours(); const m = d.getMinutes(); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return `${h}:${m.toString().padStart(2,"0")} ${ap}`; };
          return `${fmt(new Date(start))} – ${fmt(new Date(end))}`;
        };
        return (
          <div
            className="fixed z-[9999] pointer-events-none"
            style={{
              left: offRight ? x - 210 : x + 14,
              top: y - 10,
            }}
          >
            <div
              className="rounded-xl shadow-2xl px-3 py-2.5 min-w-[160px] max-w-[220px]"
              style={{ backgroundColor: tooltip.event.color || "#1e3a5f", boxShadow: `0 8px 24px ${tooltip.event.color || "#1e3a5f"}66` }}
            >
              {tooltip.event.is_favorite && (
                <div className="flex items-center gap-1 mb-1">
                  <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-[8px] text-yellow-300 font-bold uppercase tracking-wide">Favorited</span>
                </div>
              )}
              <p className="text-[10px] font-bold text-white leading-snug mb-1.5 break-words">{tooltip.event.title}</p>
              <div className="flex items-center gap-1 mb-2">
                <Clock className="h-2.5 w-2.5 text-white/70 flex-shrink-0" />
                <span className="text-[9px] text-white/90 font-medium">{formatTooltipTime(tooltip.event.start_time, tooltip.event.end_time)}</span>
              </div>
              {isReferral && (
                <span
                  className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-white px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: statusOpt.bg, boxShadow: `0 0 0 1.5px ${statusOpt.ring}` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white/70 inline-block flex-shrink-0" />
                  {statusOpt.label}
                </span>
              )}
            </div>
          </div>
        );
      })()}

      {/* Event Details Modal */}
      <Dialog open={isEventDetailsOpen && !isDeleteConfirmOpen} onOpenChange={setIsEventDetailsOpen}>
        <DialogContent className="bg-white max-w-[380px] w-[92vw] sm:w-full p-0 gap-0 rounded-xl overflow-hidden shadow-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="p-3 sm:p-4 sticky top-0 z-10 flex flex-row items-start justify-between" style={{ backgroundColor: selectedEvent?.color || '#1e3a5f' }}>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                {selectedEvent?.is_favorite && <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />}
                <DialogTitle className="text-white font-bold text-xs sm:text-sm uppercase tracking-wide">
                  Event Details
                </DialogTitle>
              </div>
              {(() => {
                const isReferral = selectedEvent?.source === "referral" || selectedEvent?.title?.startsWith("Referral Appointment");
                const s = selectedEvent?.status || "scheduled";
                const opt = STATUS_OPTIONS.find(o => o.value === s) || STATUS_OPTIONS[0];
                return (isReferral || selectedEvent?.advisee_name) ? (
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    {isReferral && (
                      <span
                        className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-white px-2.5 py-0.5 rounded-full"
                        style={{ backgroundColor: opt.bg, boxShadow: `0 0 0 2px ${opt.ring}` }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white/70 inline-block" />
                        {opt.label}
                      </span>
                    )}
                    {selectedEvent?.advisee_name && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-white px-2.5 py-0.5 rounded-full bg-white/25">
                        {selectedEvent.advisee_name}
                      </span>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
            <button
              type="button"
              onClick={() => setIsEventDetailsOpen(false)}
              className="text-white/70 hover:text-white transition-colors rounded p-0.5 hover:bg-white/20 mt-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>

          {selectedEvent && (
            <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
              {/* Event Name */}
              <div className="rounded-lg p-2.5 sm:p-3 border" style={{ backgroundColor: `${selectedEvent.color}18`, borderColor: `${selectedEvent.color}40` }}>
                <h3 className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: selectedEvent.color }}>Event Name</h3>
                <p className="text-xs text-gray-800 font-bold break-words uppercase tracking-wide">{selectedEvent.title}</p>
              </div>

              {/* Description */}
              {selectedEvent.description && (
                <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 border border-gray-200">
                  <h3 className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: selectedEvent.color }}>Description</h3>
                  <p className="text-xs text-gray-800 break-words italic">{selectedEvent.description}</p>
                </div>
              )}

              {/* Location */}
              {selectedEvent.location && (
                <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 border border-gray-200">
                  <h3 className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: selectedEvent.color }}>Location</h3>
                  <p className="text-xs text-gray-800 break-words">{selectedEvent.location}</p>
                </div>
              )}

              {/* Patient Name */}
              {selectedEvent.patient_name && (
                <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 border border-gray-200">
                  <h3 className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: selectedEvent.color }}>Patient Name</h3>
                  <p className="text-xs text-gray-800 font-medium underline break-words">{selectedEvent.patient_name}</p>
                </div>
              )}
              
              {/* Time Information */}
              <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 space-y-2 border border-gray-200">
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: selectedEvent.color }}>Start Time</h3>
                  <p className="text-[11px] sm:text-xs text-gray-800 font-medium">
                    {new Date(selectedEvent.start_time).toLocaleString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: selectedEvent.color }}>End Time</h3>
                  <p className="text-[11px] sm:text-xs text-gray-800 font-medium">
                    {new Date(selectedEvent.end_time).toLocaleString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </p>
                </div>
              </div>
              
              {/* Medical Alert */}
              {selectedEvent.medical_alert && (
                <div className="bg-red-50 rounded-lg p-2.5 sm:p-3 border border-red-200">
                  <h3 className="text-[10px] font-bold uppercase tracking-wide mb-1.5 text-red-700">Medical Alert</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEvent.medical_alert.split(",").map((a: string) => a.trim()).filter(Boolean).map((alert: string, i: number) => (
                      <span key={i} className="inline-flex items-center bg-red-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-sm">
                        {alert}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedEvent.notes && (
                <div className="bg-yellow-50 rounded-lg p-2.5 sm:p-3 border border-yellow-200">
                  <h3 className="text-[10px] font-bold uppercase tracking-wide mb-1.5 text-yellow-700">Notes & Special Indications</h3>
                  <div className="text-xs text-gray-800 break-words [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-0.5" dangerouslySetInnerHTML={{ __html: selectedEvent.notes }} />
                </div>
              )}

              {/* Status History */}
              {statusHistory.length > 0 && (() => {
                const isReferralEv = selectedEvent.source === "referral" || selectedEvent.title?.startsWith("Referral Appointment");
                if (!isReferralEv) return null;
                return (
                  <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 border border-gray-200">
                    <h3 className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: selectedEvent.color || '#1e3a5f' }}>Status History</h3>
                    <div className="relative pl-4">
                      <div className="absolute left-[5px] top-1 bottom-1 w-[2px]" style={{ backgroundColor: `${selectedEvent.color || '#1e3a5f'}40` }} />
                      <div className="space-y-3">
                        {statusHistory.map((change, i) => {
                          const opt = STATUS_OPTIONS.find(o => o.value === change.status);
                          const isLatestEntry = i === statusHistory.length - 1;
                          return (
                            <div key={i} className="relative">
                              <div
                                className="absolute -left-4 top-[3px] w-[10px] h-[10px] rounded-full border-2 border-white shadow-sm"
                                style={{ backgroundColor: opt?.bg || '#6B7280' }}
                              />
                              <div className={`p-2 rounded border ${
                                isLatestEntry ? 'border-2' : 'border'
                              }`} style={isLatestEntry ? { borderColor: opt?.ring || '#9CA3AF', backgroundColor: `${opt?.bg || '#6B7280'}15` } : { borderColor: '#E5E7EB' }}>
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <span
                                      className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-white px-2 py-0.5 rounded-full"
                                      style={{ backgroundColor: opt?.bg || '#6B7280', boxShadow: `0 0 0 1.5px ${opt?.ring || '#9CA3AF'}` }}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-white/70 inline-block flex-shrink-0" />
                                      {opt?.label || change.status}
                                    </span>
                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                      by <span className="font-medium text-gray-700">{change.changed_by && statusChangers[change.changed_by] ? statusChangers[change.changed_by] : "Unknown"}</span>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-gray-400 text-right shrink-0">
                                    {new Date(change.changed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1.5">
                {!adviseeEventIds.current.has(selectedEvent?.id ?? "") &&
                 (!(selectedEvent?.source === "referral" || selectedEvent?.title?.startsWith("Referral Appointment")) ||
                  selectedEvent?.user_id === getCurrentUserId()) && (
                  <>
                    <Button 
                      className="w-full sm:flex-1 text-white text-[10px] font-bold h-8"
                      style={{ backgroundColor: selectedEvent?.color || '#1e3a5f' }}
                      onClick={handleEditEvent}
                    >
                      EDIT
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full sm:flex-1 border-2 border-red-500 text-red-600 text-[10px] font-bold hover:bg-red-50 h-8"
                      onClick={handleDeleteEvent}
                    >
                      DELETE
                    </Button>
                  </>
                )}
                <Button 
                  variant="outline" 
                  className="w-full sm:flex-1 text-[10px] font-bold h-8"
                  onClick={() => setIsEventDetailsOpen(false)}
                >
                  CLOSE
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Event Modal */}
      <Dialog open={isModalOpen && !isSaveConfirmOpen} onOpenChange={(open) => { if (!open) { setIsEditMode(false); setSelectedEvent(null); setError(null); setIsStatusDropdownOpen(false); } setIsModalOpen(open); }}>
        <DialogContent className="bg-white max-w-[420px] w-[92vw] sm:w-full p-0 gap-0 rounded-xl overflow-hidden shadow-xl max-h-[85vh] overflow-y-auto [&>button:last-child]:hidden">
          <DialogHeader className="bg-secondary p-3 sm:p-4 sticky top-0 z-10 flex flex-row items-start justify-between">
            <div>
              <DialogTitle className="text-white font-bold text-xs sm:text-sm uppercase tracking-wide">
                {isEditMode ? "Edit Event" : "Create Event"}
              </DialogTitle>
              {isEditMode && (selectedEvent?.source === "referral" || selectedEvent?.title?.startsWith("Referral Appointment")) ? (
                <div className="relative mt-1" onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    const opt = STATUS_OPTIONS.find(o => o.value === (formData.status || "scheduled")) || STATUS_OPTIONS[0];
                    return (
                      <button
                        type="button"
                        onClick={() => setIsStatusDropdownOpen(p => !p)}
                        className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-white px-2.5 py-0.5 rounded-full transition-all hover:brightness-110 active:scale-95"
                        style={{ backgroundColor: opt.bg, boxShadow: `0 0 0 2px ${opt.ring}` }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white/70 inline-block" />
                        {opt.label}
                        <ChevronDown className="h-2.5 w-2.5 text-white/80" />
                      </button>
                    );
                  })()}
                  {isStatusDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100 min-w-[170px]">
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setFormData({...formData, status: opt.value}); setIsStatusDropdownOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.bg }} />
                          <span className="text-[10px] font-semibold text-gray-700">{opt.label}</span>
                          {formData.status === opt.value && <span className="ml-auto text-[10px] text-gray-400">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-white/70 text-[10px] mt-0.5">Fill in the details below to schedule an event</p>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <button
                type="button"
                onClick={() => setFormData({...formData, is_favorite: !formData.is_favorite})}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/20 transition-colors"
                title={formData.is_favorite ? "Remove from favorites" : "Mark as favorite"}
              >
                <Star className={`h-3.5 w-3.5 transition-colors ${formData.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-white/50"}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/20 transition-colors"
              >
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveEvent} className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                {error}
              </div>
            )}

            {/* Event Info */}
            <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 space-y-2">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-wide block">Event Info</label>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Event Name *</label>
                {isEditMode ? (
                  <p className="h-8 flex items-center text-xs font-semibold text-gray-700 px-2 bg-gray-100 border border-gray-200 rounded-md">{formData.title}</p>
                ) : (
                  <Input
                    className="h-8 text-xs border-gray-300 focus:ring-secondary"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Enter event name"
                    required
                  />
                )}
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Patient Name <span className="text-gray-400 font-normal">(optional)</span></label>
                <Input
                  className="h-8 text-xs border-gray-300 focus:ring-secondary"
                  value={formData.patient_name}
                  onChange={(e) => setFormData({...formData, patient_name: e.target.value})}
                  placeholder="Enter patient name"
                />
              </div>
            </div>

            {/* Description */}
            <div className="bg-blue-50 rounded-lg p-2.5 sm:p-3 border border-blue-200">
              <label className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1.5 block">Description</label>
              {isEditMode ? (
                <p className="text-xs text-gray-700 italic px-2 py-1.5 bg-blue-100 border border-blue-200 rounded-md min-h-[32px]">{formData.description || <span className="text-gray-400">No description</span>}</p>
              ) : (
                <Input
                  className="h-8 text-xs border-blue-300 focus:ring-blue-500"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Enter description"
                />
              )}
            </div>

            {/* Medical Alert - shown in edit mode if set */}
            {isEditMode && formData.medical_alert && (
              <div className="bg-red-50 rounded-lg p-2.5 sm:p-3 border border-red-200">
                <label className="text-[10px] font-bold text-red-700 uppercase tracking-wide mb-1.5 block">Medical Alert</label>
                <div className="flex flex-wrap gap-1.5">
                  {formData.medical_alert.split(",").map((a) => a.trim()).filter(Boolean).map((alert, i) => (
                    <span key={i} className="inline-flex items-center bg-red-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-sm">
                      {alert}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            <div className="bg-green-50 rounded-lg p-2.5 sm:p-3 border border-green-200 space-y-2">
              <label className="text-[10px] font-bold text-green-700 uppercase tracking-wide block">Location</label>
              {(() => {
                const PRESETS = ["Oral Medicine (OM)", "Operative Dentistry (OP)", "Prosthodontics (Prostho)", "Postgraduate Orthodontics (Ortho)"];
                const loc = formData.location || "";
                const isCustom = loc === "__custom__" || (loc !== "" && !PRESETS.includes(loc));
                return (
                  <>
                    <div>
                      <label className="text-[10px] font-semibold text-green-500 mb-1 block">Clinical Section</label>
                      <select
                        className="w-full h-8 text-xs px-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                        value={isCustom ? "__custom__" : loc}
                        onChange={(e) => setFormData({...formData, location: e.target.value === "__custom__" ? "__custom__" : e.target.value})}
                      >
                        <option value="">Select location</option>
                        {PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
                        <option value="__custom__">Any (type your own)</option>
                      </select>
                    </div>
                    {isCustom && (
                      <div>
                        <label className="text-[10px] font-semibold text-green-500 mb-1 block">Custom Location</label>
                        <Input
                          className="h-8 text-xs border-green-300 focus:ring-green-500"
                          value={loc === "__custom__" ? "" : loc}
                          onChange={(e) => setFormData({...formData, location: e.target.value || "__custom__"})}
                          placeholder="Type custom location…"
                          autoFocus
                        />
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Schedule */}
            <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 space-y-2">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-wide block">Schedule</label>
              {/* Date */}
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Date *</label>
                <input
                  type="date"
                  className="w-full h-8 text-xs px-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary bg-white font-medium text-gray-700 cursor-pointer"
                  value={formData.start_time ? formData.start_time.split('T')[0] : ''}
                  onChange={(e) => {
                    const date = e.target.value;
                    const sTime = formData.start_time ? formData.start_time.split('T')[1] : '06:00';
                    const eTime = formData.end_time ? formData.end_time.split('T')[1] : '06:30';
                    setFormData({...formData, start_time: `${date}T${sTime}`, end_time: `${date}T${eTime}`, ...(isEditMode ? { status: 'rescheduled' } : {})});
                  }}
                  required
                />
              </div>
              {/* Time */}
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Time *</label>
                <div className="flex items-center gap-2">
                  <select
                    className="flex-1 h-8 text-xs px-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary bg-white font-medium text-gray-700 cursor-pointer"
                    value={formData.start_time ? formData.start_time.split('T')[1]?.substring(0, 5) : '06:00'}
                    onChange={(e) => {
                      const date = formData.start_time ? formData.start_time.split('T')[0] : new Date().toISOString().split('T')[0];
                      setFormData({...formData, start_time: `${date}T${e.target.value}`, ...(isEditMode ? { status: 'rescheduled' } : {})});
                    }}
                    required
                  >
                    {Array.from({ length: 25 }, (_, i) => {
                      const hour = Math.floor(i / 2) + 6;
                      const minute = i % 2 === 0 ? '00' : '30';
                      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                      const period = hour >= 12 ? 'pm' : 'am';
                      const value = `${String(hour).padStart(2, '0')}:${minute}`;
                      return <option key={`s-${value}`} value={value}>{displayHour}:{minute}{period}</option>;
                    })}
                  </select>
                  <span className="text-[10px] font-bold text-gray-400">–</span>
                  <select
                    className="flex-1 h-8 text-xs px-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary bg-white font-medium text-gray-700 cursor-pointer"
                    value={formData.end_time ? formData.end_time.split('T')[1]?.substring(0, 5) : '06:30'}
                    onChange={(e) => {
                      const date = formData.end_time ? formData.end_time.split('T')[0] : (formData.start_time ? formData.start_time.split('T')[0] : new Date().toISOString().split('T')[0]);
                      setFormData({...formData, end_time: `${date}T${e.target.value}`, ...(isEditMode ? { status: 'rescheduled' } : {})});
                    }}
                    required
                  >
                    {Array.from({ length: 25 }, (_, i) => {
                      const hour = Math.floor(i / 2) + 6;
                      const minute = i % 2 === 0 ? '00' : '30';
                      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                      const period = hour >= 12 ? 'pm' : 'am';
                      const value = `${String(hour).padStart(2, '0')}:${minute}`;
                      return <option key={`e-${value}`} value={value}>{displayHour}:{minute}{period}</option>;
                    })}
                  </select>
                </div>
              </div>
            </div>

            {/* Event Color */}
            <div className="bg-purple-50 rounded-lg p-2.5 sm:p-3 border border-purple-200">
              <label className="text-[10px] font-bold text-purple-700 uppercase tracking-wide mb-1.5 block">Event Color</label>
              <div className="flex flex-wrap gap-2">
                {EVENT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => setFormData({...formData, color: c.value})}
                    className="w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none"
                    style={{
                      backgroundColor: c.value,
                      boxShadow: formData.color === c.value ? `0 0 0 2px white, 0 0 0 4px ${c.value}` : "none",
                      transform: formData.color === c.value ? "scale(1.15)" : undefined,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-yellow-50 rounded-lg p-2.5 sm:p-3 border border-yellow-200">
              <label className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide mb-1.5 block">Notes</label>
              <RichTextEditor
                value={formData.notes || ""}
                onChange={(val) => setFormData({...formData, notes: val})}
                placeholder="Enter any additional notes..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-row gap-2 pt-1.5 w-full">
              <Button
                type="submit"
                className="flex-1 bg-secondary hover:bg-secondary/90 text-white text-[10px] font-bold uppercase h-8"
              >
                SAVE
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 text-[10px] font-bold h-8"
                onClick={() => {
                  setIsModalOpen(false);
                  setIsEditMode(false);
                  setSelectedEvent(null);
                  setError(null);
                  setFormData({
                    title: "",
                    description: "",
                    start_time: "",
                    end_time: "",
                    location: "",
                    patient_name: "",
                    color: "#1e3a5f",
                    notes: "",
                    medical_alert: "",
                    is_favorite: false,
                    status: "scheduled",
                  });
                }}
              >
                CANCEL
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Save Event Confirmation Dialog */}
      {isSaveConfirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsSaveConfirmOpen(false)}
          />

          {/* Confirmation Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-secondary/10 mb-4">
                <svg className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2">{isEditMode ? 'Save Changes' : 'Create Event'}</h3>
              <p className="text-sm text-gray-600 mb-6">
                {isEditMode 
                  ? 'Are you sure you want to save the changes to this event?' 
                  : 'Are you sure you want to create this event?'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmSaveEvent}
                  className="flex-1 px-6 py-2 bg-secondary text-white text-xs font-bold rounded-lg hover:bg-secondary/90 transition-colors"
                >
                  {isEditMode ? 'YES, SAVE CHANGES' : 'YES, CREATE'}
                </button>
                <button
                  onClick={() => setIsSaveConfirmOpen(false)}
                  className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Event Confirmation Dialog */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsDeleteConfirmOpen(false)}
          />

          {/* Confirmation Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2">Delete Event</h3>
              <p className="text-sm text-gray-600 mb-2">
                Are you sure you want to delete <span className="font-semibold">"{eventToDelete?.title}"</span>?
              </p>
              <p className="text-xs text-gray-500 mb-6">
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmDeleteEvent}
                  className="flex-1 px-6 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
                >
                  YES, DELETE
                </button>
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        <Footer />
      </div>
    </div>
  );
}

export default function SchedulePage() {
  return (
    <RouteGuard allowedRoles={["clinician", "professor", "clinical_admin"]}>
    <Suspense fallback={null}>
      <SchedulePageInner />
    </Suspense>
    </RouteGuard>
  );
}
