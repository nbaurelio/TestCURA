"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, ChevronLeft, ChevronRight, X } from "lucide-react";
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
import { createEvent, getEvents, updateEvent, deleteEvent, EventFormData } from "@/lib/api/events";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { getMockUserProfile } from "@/lib/api/profiles";
import { RouteGuard } from "@/components/auth/RouteGuard";

const days = ["SUN", "MON", "TUES", "WED", "THURS", "FRI", "SAT"];
const dates = [4, 5, 6, 7, 8, 9, 10];
const times = [
  "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM",
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
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  patient_name?: string;
  color?: string;
  notes?: string;
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
  });
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    loadEvents();
    loadUserName();
  }, []);

  useEffect(() => {
    const eventId = searchParams.get("event");
    if (eventId && events.length > 0) {
      const target = events.find(e => e.id === eventId);
      if (target) {
        setSelectedEvent(target);
        setIsEventDetailsOpen(true);
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

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await getEvents();
      console.log("Loaded events:", data);
      setEvents(data || []);
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
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
      };
      
      console.log("Saving event:", eventData);
      
      if (isEditMode && selectedEvent) {
        // Update existing event
        await updateEvent(selectedEvent.id, eventData);
      } else {
        // Create new event
        await createEvent(eventData);
      }
      
      await loadEvents();
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
      });
    } catch (err) {
      console.error("Error saving event:", err);
      setError("Failed to save event");
    }
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsEventDetailsOpen(true);
  };

  const handleEditEvent = () => {
    if (!selectedEvent) return;
    
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
      await deleteEvent(eventToDelete.id);
      await loadEvents();
      setIsDeleteConfirmOpen(false);
      setEventToDelete(null);
      setIsEventDetailsOpen(false);
      setSelectedEvent(null);
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

  // Get all overlapping events for a given day to determine max columns needed
  const getMaxColumnsForDay = (date: Date) => {
    let maxColumns = 1;
    times.forEach(time => {
      const slotEvents = getEventsForTimeSlot(date, time);
      maxColumns = Math.max(maxColumns, slotEvents.length);
    });
    return maxColumns;
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
        <div className="bg-secondary rounded p-4 flex items-center justify-between mb-6 shadow">
          <h1 className="text-white font-bold text-sm sm:text-base uppercase tracking-wide">{userFirstName}&apos;s Schedule Planner</h1>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="text-white hover:text-white/80 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
          >
            +
          </button>
        </div>

        {/* Calendar Container */}
        <div className="bg-white/60 backdrop-blur-sm rounded shadow border-2 border-gray-300 overflow-hidden">
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
            ) : (
              times.map((time, timeIdx) => (
                <div key={time} className="grid gap-2" style={{ gridTemplateColumns: '4rem repeat(7, 1fr)', marginTop: timeIdx === 0 ? 0 : '0.5rem' }}>
                  <div className="w-16 text-xs text-gray-600 text-right pr-1 flex items-center justify-end font-medium">
                    {time}
                  </div>
                  {weekDates.map((date, idx) => {
                    const slotEvents = getEventsForTimeSlot(date, time);
                    const maxColumns = getMaxColumnsForDay(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const columnWidth = `${100 / maxColumns}%`;
                    
                    return (
                      <div
                        key={`${time}-${idx}`}
                        className={`relative ${
                          isToday ? 'bg-secondary/5 rounded-lg' : ''
                        }`}
                      >
                        {slotEvents.length > 0 ? (
                          <div className="flex gap-0.5 absolute w-full" style={{ zIndex: 10 }}>
                            {slotEvents.map((ev, evIdx) => {
                              const isStarting = isEventStart(ev, date, time);
                              
                              if (isStarting) {
                                return (
                                  <div
                                    key={ev.id}
                                    onClick={() => handleEventClick(ev)}
                                    className="text-white rounded text-[10px] font-bold overflow-hidden cursor-pointer transition-opacity hover:opacity-80 flex items-center justify-center p-1 shadow"
                                    style={{
                                      backgroundColor: ev.color || "#1e3a5f",
                                      height: `calc(${getEventDurationInSlots(ev) * 2}rem + ${(getEventDurationInSlots(ev) - 1) * 0.5}rem)`,
                                      width: columnWidth,
                                      minWidth: 0,
                                    }}
                                  >
                                    <span className="text-center leading-tight truncate">{ev.title}</span>
                                  </div>
                                );
                              } else {
                                // Placeholder for continuing events to maintain column alignment
                                return (
                                  <div
                                    key={ev.id}
                                    style={{
                                      width: columnWidth,
                                      minWidth: 0,
                                    }}
                                  />
                                );
                              }
                            })}
                            {/* Fill remaining columns with empty space */}
                            {Array.from({ length: maxColumns - slotEvents.length }).map((_, i) => (
                              <div
                                key={`empty-${i}`}
                                style={{
                                  width: columnWidth,
                                  minWidth: 0,
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div 
                            onClick={() => handleTimeSlotClick(date, time)}
                            className={`rounded-lg h-8 hover:bg-primary/30 cursor-pointer transition-colors ${
                              isToday 
                                ? 'bg-secondary/10 border-2 border-secondary/30' 
                                : 'bg-gray-50 border border-gray-200'
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Event Details Modal */}
      <Dialog open={isEventDetailsOpen && !isDeleteConfirmOpen} onOpenChange={setIsEventDetailsOpen}>
        <DialogContent className="bg-white max-w-[380px] w-[92vw] sm:w-full p-0 gap-0 rounded-xl overflow-hidden shadow-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="p-3 sm:p-4 sticky top-0 z-10 flex flex-row items-center justify-between" style={{ backgroundColor: selectedEvent?.color || '#1e3a5f' }}>
            <DialogTitle className="text-white font-bold text-xs sm:text-sm uppercase tracking-wide">
              Event Details
            </DialogTitle>
            <button
              type="button"
              onClick={() => setIsEventDetailsOpen(false)}
              className="text-white/70 hover:text-white transition-colors rounded p-0.5 hover:bg-white/20"
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
              
              {/* Notes */}
              {selectedEvent.notes && (
                <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 border border-gray-200">
                  <h3 className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: selectedEvent.color }}>Notes</h3>
                  <div className="text-xs text-gray-800 break-words [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-0.5" dangerouslySetInnerHTML={{ __html: selectedEvent.notes }} />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1.5">
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
      <Dialog open={isModalOpen && !isSaveConfirmOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white max-w-[380px] w-[92vw] sm:w-full p-0 gap-0 rounded-xl overflow-hidden shadow-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="bg-secondary p-3 sm:p-4 sticky top-0 z-10 flex flex-row items-center justify-between">
            <DialogTitle className="text-white font-bold text-xs sm:text-sm uppercase tracking-wide">
              {isEditMode ? "Edit Event" : "Create Event"}
            </DialogTitle>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="text-white/70 hover:text-white transition-colors rounded p-0.5 hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>

          <form onSubmit={handleSaveEvent} className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                {error}
              </div>
            )}
            
            {/* Event Name */}
            <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5 block">Event Name *</label>
              <Input 
                className="h-8 text-xs border-gray-300 focus:ring-secondary" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Enter event name"
                required
              />
            </div>

            {/* Description */}
            <div className="bg-blue-50 rounded-lg p-2.5 sm:p-3 border border-blue-200">
              <label className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1.5 block">Description</label>
              <Input 
                className="h-8 text-xs border-blue-300 focus:ring-blue-500" 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Enter description"
              />
            </div>

            {/* Location */}
            <div>
              <label className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5 block">Location</label>
              <select
                className="h-9 w-full text-xs border-2 border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary bg-white font-semibold text-gray-700 cursor-pointer hover:border-secondary transition-colors"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
              >
                <option value="">Select location</option>
                <option value="Oral Medicine (OM)">Oral Medicine (OM)</option>
                <option value="Operative Dentistry (OP)">Operative Dentistry (OP)</option>
                <option value="Prosthodontics (Prostho)">Prosthodontics (Prostho)</option>
                <option value="Postgraduate Orthodontics (Ortho)">Postgraduate Orthodontics (Ortho)</option>
                <option value="Any">Any</option>
              </select>
            </div>

            {/* Patient Name */}
            <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5 block">Patient Name</label>
              <Input
                className="h-8 text-xs border-gray-300 focus:ring-secondary"
                value={formData.patient_name}
                onChange={(e) => setFormData({...formData, patient_name: e.target.value})}
                placeholder="Enter patient name"
              />
            </div>

            {/* Date & Time */}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5 block">Event Start Date & Time *</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input 
                    className="w-full sm:flex-1 h-9 text-xs border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary font-medium" 
                    type="date" 
                    value={formData.start_time ? formData.start_time.split('T')[0] : ''}
                    onChange={(e) => {
                      const date = e.target.value;
                      const time = formData.start_time ? formData.start_time.split('T')[1] : '06:00';
                      setFormData({...formData, start_time: `${date}T${time}`});
                    }}
                    required
                  />
                  <select
                    className="w-28 h-9 text-xs border-2 border-secondary rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary bg-secondary font-bold text-white cursor-pointer hover:bg-secondary/90 transition-colors [&>option]:bg-white [&>option]:text-gray-700 [&>option]:font-semibold"
                    value={formData.start_time ? formData.start_time.split('T')[1]?.substring(0, 5) : '06:00'}
                    onChange={(e) => {
                      const date = formData.start_time ? formData.start_time.split('T')[0] : new Date().toISOString().split('T')[0];
                      setFormData({...formData, start_time: `${date}T${e.target.value}`});
                    }}
                    required
                  >
                    {Array.from({ length: 25 }, (_, i) => {
                      const hour = Math.floor(i / 2) + 6;
                      const minute = i % 2 === 0 ? '00' : '30';
                      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                      const period = hour >= 12 ? 'pm' : 'am';
                      const value = `${String(hour).padStart(2, '0')}:${minute}`;
                      return (
                        <option key={value} value={value}>
                          {displayHour}:{minute}{period}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5 block">Event End Date & Time *</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input 
                    className="w-full sm:flex-1 h-9 text-xs border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary font-medium" 
                    type="date" 
                    value={formData.end_time ? formData.end_time.split('T')[0] : ''}
                    onChange={(e) => {
                      const date = e.target.value;
                      const time = formData.end_time ? formData.end_time.split('T')[1] : '06:30';
                      setFormData({...formData, end_time: `${date}T${time}`});
                    }}
                    required
                  />
                  <select
                    className="w-28 h-9 text-xs border-2 border-secondary rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary bg-secondary font-bold text-white cursor-pointer hover:bg-secondary/90 transition-colors [&>option]:bg-white [&>option]:text-gray-700 [&>option]:font-semibold"
                    value={formData.end_time ? formData.end_time.split('T')[1]?.substring(0, 5) : '06:30'}
                    onChange={(e) => {
                      const date = formData.end_time ? formData.end_time.split('T')[0] : new Date().toISOString().split('T')[0];
                      setFormData({...formData, end_time: `${date}T${e.target.value}`});
                    }}
                    required
                  >
                    {Array.from({ length: 25 }, (_, i) => {
                      const hour = Math.floor(i / 2) + 6;
                      const minute = i % 2 === 0 ? '00' : '30';
                      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                      const period = hour >= 12 ? 'pm' : 'am';
                      const value = `${String(hour).padStart(2, '0')}:${minute}`;
                      return (
                        <option key={value} value={value}>
                          {displayHour}:{minute}{period}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>

            {/* Event Color */}
            <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5 block">Event Color</label>
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
            <div className="flex flex-col sm:flex-row gap-2 pt-1.5">
              <Button 
                type="submit" 
                className="w-full sm:flex-1 bg-secondary text-white text-[10px] font-bold hover:bg-secondary/90 h-8"
              >
                SAVE
              </Button>
              <Button 
                type="button"
                variant="outline" 
                className="w-full sm:flex-1 text-[10px] font-bold h-8"
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
    <RouteGuard allowedRoles={["clinician", "professor"]}>
    <Suspense fallback={null}>
      <SchedulePageInner />
    </Suspense>
    </RouteGuard>
  );
}
