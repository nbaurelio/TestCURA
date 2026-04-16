"use client";

import React, { useState, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
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
import { getProfile } from "@/lib/api/profiles";

const days = ["SUN", "MON", "TUES", "WED", "THURS", "FRI", "SAT"];
const dates = [4, 5, 6, 7, 8, 9, 10];
const times = [
  "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM",
];

interface Event {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  notes?: string;
}

// Helper to get the start of the current week (Sunday)
const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

export default function SchedulePage() {
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
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
    loadUserName();
  }, []);

  const loadUserName = async () => {
    try {
      const mockUserId = "00000000-0000-0000-0000-000000000000";
      const profile = await getProfile(mockUserId);
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
    });
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
                className="px-3 py-1.5 text-sm border-2 border-gray-300 rounded bg-white text-secondary font-bold hover:bg-muted focus:outline-none focus:ring-2 focus:ring-accent uppercase tracking-wide"
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

          {/* Days Header */}
          <div className="grid grid-cols-8 gap-2 px-4 py-3 bg-muted border-b border-gray-300">
            <div className="w-5 pr-1"></div>
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

          {/* Schedule Grid */}
          <div className="max-h-[500px] overflow-y-auto px-4 pb-4 pt-2">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading events...</div>
            ) : (
              times.map((time, timeIdx) => (
                <div key={time} className="grid grid-cols-8 gap-2" style={{ marginTop: timeIdx === 0 ? 0 : '0.5rem' }}>
                  <div className="w-16 text-xs text-gray-600 text-right pr-1 flex items-center justify-end font-medium">
                    {time}
                  </div>
                  {weekDates.map((date, idx) => {
                    const slotEvents = getEventsForTimeSlot(date, time);
                    const eventStartingHere = slotEvents.find(e => isEventStart(e, date, time));
                    const isToday = date.toDateString() === new Date().toDateString();
                    
                    return (
                      <div
                        key={`${time}-${idx}`}
                        className={`relative ${
                          isToday ? 'bg-secondary/5 rounded-lg' : ''
                        }`}
                      >
                        {eventStartingHere ? (
                          <div 
                            onClick={() => handleEventClick(eventStartingHere)}
                            className="bg-secondary text-white rounded text-[10px] font-bold overflow-hidden hover:bg-secondary/90 cursor-pointer transition-colors flex items-center justify-center p-2 shadow"
                            style={{
                              height: `calc(${getEventDurationInSlots(eventStartingHere) * 2}rem + ${(getEventDurationInSlots(eventStartingHere) - 1) * 0.5}rem)`,
                              position: 'absolute',
                              width: '100%',
                              zIndex: 10
                            }}
                          >
                            <span className="text-center leading-tight">{eventStartingHere.title}</span>
                          </div>
                        ) : slotEvents.length === 0 ? (
                          <div 
                            onClick={() => handleTimeSlotClick(date, time)}
                            className={`rounded-lg h-8 hover:bg-primary/30 cursor-pointer transition-colors ${
                              isToday 
                                ? 'bg-secondary/10 border-2 border-secondary/30' 
                                : 'bg-gray-50 border border-gray-200'
                            }`}
                          />
                        ) : (
                          <div className="h-8" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Event Details Modal */}
      <Dialog open={isEventDetailsOpen && !isDeleteConfirmOpen} onOpenChange={setIsEventDetailsOpen}>
        <DialogContent className="bg-white max-w-[380px] w-[92vw] sm:w-full p-0 gap-0 rounded-xl overflow-hidden shadow-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="bg-secondary p-3 sm:p-4 sticky top-0 z-10">
            <DialogTitle className="text-white font-bold text-xs sm:text-sm uppercase tracking-wide">
              Event Details
            </DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
              {/* Event Name */}
              <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
                <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5">Event Name</h3>
                <p className="text-xs text-gray-800 font-medium break-words">{selectedEvent.title}</p>
              </div>
              
              {/* Description */}
              {selectedEvent.description && (
                <div className="bg-blue-50 rounded-lg p-2.5 sm:p-3 border border-blue-200">
                  <h3 className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1.5">Description</h3>
                  <p className="text-xs text-gray-800 break-words">{selectedEvent.description}</p>
                </div>
              )}
              
              {/* Location */}
              {selectedEvent.location && (
                <div className="bg-green-50 rounded-lg p-2.5 sm:p-3 border border-green-200">
                  <h3 className="text-[10px] font-bold text-green-700 uppercase tracking-wide mb-1.5">Location</h3>
                  <p className="text-xs text-gray-800 break-words">{selectedEvent.location}</p>
                </div>
              )}
              
              {/* Time Information */}
              <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 space-y-2">
                <div>
                  <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5">Start Time</h3>
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
                  <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5">End Time</h3>
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
                <div className="bg-yellow-50 rounded-lg p-2.5 sm:p-3 border border-yellow-200">
                  <h3 className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide mb-1.5">Notes</h3>
                  <p className="text-xs text-gray-800 break-words">{selectedEvent.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1.5">
                <Button 
                  className="w-full sm:flex-1 bg-secondary text-white text-[10px] font-bold hover:bg-secondary/90 h-8" 
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
          <DialogHeader className="bg-secondary p-3 sm:p-4 sticky top-0 z-10">
            <DialogTitle className="text-white font-bold text-xs sm:text-sm uppercase tracking-wide">
              {isEditMode ? "Edit Event" : "Create Event"}
            </DialogTitle>
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
            <div className="bg-green-50 rounded-lg p-2.5 sm:p-3 border border-green-200">
              <label className="text-[10px] font-bold text-green-700 uppercase tracking-wide mb-1.5 block">Location</label>
              <Input 
                className="h-8 text-xs border-green-300 focus:ring-green-500" 
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="Enter location"
              />
            </div>

            {/* Date & Time */}
            <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 space-y-2">
              <div>
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5 block">Event Start Date & Time *</label>
                <Input 
                  className="h-8 text-xs border-gray-300 focus:ring-secondary" 
                  type="datetime-local" 
                  value={formData.start_time}
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5 block">Event End Date & Time *</label>
                <Input 
                  className="h-8 text-xs border-gray-300 focus:ring-secondary" 
                  type="datetime-local" 
                  value={formData.end_time}
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  required
                />
              </div>
            </div>

            {/* Notes */}
            <div className="bg-yellow-50 rounded-lg p-2.5 sm:p-3 border border-yellow-200">
              <label className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide mb-1.5 block">Notes</label>
              <textarea 
                className="w-full h-16 text-xs px-3 py-2 border border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500" 
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
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
                  onClick={() => setIsSaveConfirmOpen(false)}
                  className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmSaveEvent}
                  className="flex-1 px-6 py-2 bg-secondary text-white text-xs font-bold rounded-lg hover:bg-secondary/90 transition-colors"
                >
                  {isEditMode ? 'YES, SAVE CHANGES' : 'YES, CREATE'}
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
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmDeleteEvent}
                  className="flex-1 px-6 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
                >
                  YES, DELETE
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
