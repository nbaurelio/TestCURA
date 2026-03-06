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

  const handleSaveEvent = async () => {
    if (!formData.title || !formData.start_time || !formData.end_time) {
      setError("Please fill in all required fields");
      return;
    }

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

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    if (confirm(`Are you sure you want to delete "${selectedEvent.title}"?`)) {
      try {
        await deleteEvent(selectedEvent.id);
        await loadEvents();
        setIsEventDetailsOpen(false);
        setSelectedEvent(null);
      } catch (err) {
        console.error("Error deleting event:", err);
        alert("Failed to delete event");
      }
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
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 p-4 sm:p-6 max-w-[1200px] mx-auto w-full">
        {/* Header Bar */}
        <div className="bg-secondary rounded-xl p-3 flex items-center justify-between mb-6">
          <h1 className="text-white font-semibold text-sm sm:text-base">{userFirstName}&apos;s Schedule Planner</h1>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="text-white hover:text-white/80 text-xl font-bold"
          >
            +
          </button>
        </div>

        {/* Calendar Container */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Month Navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-4 px-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigateWeek('prev')}
                className="w-8 h-8 rounded-full border-2 border-primary text-primary flex items-center justify-center hover:bg-primary/10"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-semibold text-secondary text-lg min-w-[180px] text-center">{currentMonth}</span>
              <button 
                onClick={() => navigateWeek('next')}
                className="w-8 h-8 rounded-full border-2 border-primary text-primary flex items-center justify-center hover:bg-primary/10"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Year Filter */}
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="px-3 py-1.5 text-sm border-2 border-primary rounded-lg bg-white text-secondary font-semibold hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              
              {/* Today Button */}
              <button
                onClick={goToToday}
                className="px-4 py-1.5 text-sm bg-primary text-secondary font-semibold rounded-lg hover:bg-primary/90 transition-colors"
              >
                Today
              </button>
            </div>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-8 gap-1 px-2">
            <div className=""></div>
            {weekDates.map((date, idx) => (
              <div key={idx} className="text-center">
                <div className="bg-primary rounded-lg py-1.5 px-1.5">
                  <div className="text-[10px] font-semibold text-secondary">{days[idx]}</div>
                  <div className="text-sm font-bold text-secondary">{date.getDate()}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Schedule Grid */}
          <div className="max-h-[500px] overflow-y-auto px-2 pb-4">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading events...</div>
            ) : (
              times.map((time, timeIdx) => (
                <div key={time} className="grid grid-cols-8 gap-1" style={{ marginTop: timeIdx === 0 ? 0 : '0.25rem' }}>
                  <div className="p-1 text-xs text-gray-500 text-right pr-2 flex items-center justify-end">
                    {time}
                  </div>
                  {weekDates.map((date, idx) => {
                    const slotEvents = getEventsForTimeSlot(date, time);
                    const eventStartingHere = slotEvents.find(e => isEventStart(e, date, time));
                    
                    return (
                      <div
                        key={`${time}-${idx}`}
                        className="relative"
                      >
                        {eventStartingHere ? (
                          <div 
                            onClick={() => handleEventClick(eventStartingHere)}
                            className="bg-secondary text-white rounded-lg text-[10px] font-semibold overflow-hidden hover:bg-secondary/90 cursor-pointer transition-colors flex items-center justify-center p-1"
                            style={{
                              height: `calc(${getEventDurationInSlots(eventStartingHere) * 2}rem + ${(getEventDurationInSlots(eventStartingHere) - 1) * 0.25}rem)`,
                              position: 'absolute',
                              width: '100%',
                              zIndex: 10
                            }}
                          >
                            <span className="text-center">{eventStartingHere.title}</span>
                          </div>
                        ) : slotEvents.length === 0 ? (
                          <div 
                            onClick={() => handleTimeSlotClick(date, time)}
                            className="bg-gray-100 rounded-lg h-8 hover:bg-primary/20 cursor-pointer transition-colors" 
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
      <Dialog open={isEventDetailsOpen} onOpenChange={setIsEventDetailsOpen}>
        <DialogContent className="bg-background max-w-[400px] p-0 gap-0 rounded-lg overflow-hidden">
          <DialogHeader className="bg-primary p-4">
            <DialogTitle className="text-secondary font-bold text-base">
              EVENT DETAILS
            </DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="p-5 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-secondary mb-1">Event Name</h3>
                <p className="text-sm text-gray-700">{selectedEvent.title}</p>
              </div>
              
              {selectedEvent.description && (
                <div>
                  <h3 className="text-sm font-bold text-secondary mb-1">Description</h3>
                  <p className="text-sm text-gray-700">{selectedEvent.description}</p>
                </div>
              )}
              
              {selectedEvent.location && (
                <div>
                  <h3 className="text-sm font-bold text-secondary mb-1">Location</h3>
                  <p className="text-sm text-gray-700">{selectedEvent.location}</p>
                </div>
              )}
              
              <div>
                <h3 className="text-sm font-bold text-secondary mb-1">Start Time</h3>
                <p className="text-sm text-gray-700">
                  {new Date(selectedEvent.start_time).toLocaleString()}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-bold text-secondary mb-1">End Time</h3>
                <p className="text-sm text-gray-700">
                  {new Date(selectedEvent.end_time).toLocaleString()}
                </p>
              </div>
              
              {selectedEvent.notes && (
                <div>
                  <h3 className="text-sm font-bold text-secondary mb-1">Notes</h3>
                  <p className="text-sm text-gray-700">{selectedEvent.notes}</p>
                </div>
              )}

              <div className="flex justify-center gap-4 pt-4 border-t border-gray-200 mt-4">
                <Button className="px-8" onClick={handleEditEvent}>EDIT</Button>
                <Button variant="destructive" onClick={handleDeleteEvent}>DELETE</Button>
                <Button variant="outline" onClick={() => setIsEventDetailsOpen(false)}>
                  CLOSE
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Event Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-background max-w-[400px] p-0 gap-0 rounded-lg overflow-hidden">
          <DialogHeader className="bg-primary p-4">
            <DialogTitle className="text-secondary font-bold text-base">
              {isEditMode ? "EDIT EVENT" : "CREATE EVENT"}
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 space-y-2">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
                {error}
              </div>
            )}
            <div className="grid grid-cols-[120px_1fr] items-center gap-2">
              <label className="text-xs font-semibold text-secondary">EVENT NAME</label>
              <Input 
                className="h-8 text-sm" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-2">
              <label className="text-xs font-semibold text-secondary">DESCRIPTION</label>
              <Input 
                className="h-8 text-sm" 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-2">
              <label className="text-xs font-semibold text-secondary">LOCATION</label>
              <Input 
                className="h-8 text-sm" 
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-2">
              <label className="text-xs font-semibold text-secondary">EVENT START DATE</label>
              <Input 
                className="h-8 text-sm" 
                type="datetime-local" 
                value={formData.start_time}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-2">
              <label className="text-xs font-semibold text-secondary">EVENT END DATE</label>
              <Input 
                className="h-8 text-sm" 
                type="datetime-local" 
                value={formData.end_time}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-[120px_1fr] items-start gap-2">
              <label className="text-xs font-semibold text-secondary pt-1">NOTES</label>
              <textarea 
                className="h-16 text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" 
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>

            <div className="flex justify-center gap-4 pt-4 border-t border-gray-200 mt-4">
              <Button className="px-8" onClick={handleSaveEvent}>SAVE</Button>
              <Button variant="outline" onClick={() => {
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
              }}>
                CANCEL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
