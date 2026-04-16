"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getEvents } from "@/lib/api/events";
import { getProfile } from "@/lib/api/profiles";

interface Event {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  color?: string;
  notes?: string;
}

interface SchedulePlannerProps {
  userName?: string;
}

export function SchedulePlanner({
  userName,
}: SchedulePlannerProps) {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFirstName, setUserFirstName] = useState<string>(userName || "[USER]");

  useEffect(() => {
    loadEvents();
    loadUserName();
  }, [userName]);

  const loadUserName = async () => {
    if (userName) {
      setUserFirstName(userName);
      return;
    }
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
      // Get top 3 most recent events
      const recentEvents = (data || []).slice(0, 3);
      setEvents(recentEvents);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (startTime: string, endTime: string) => {
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
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['SUN', 'MON', 'TUES', 'WED', 'THURS', 'FRI', 'SAT'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  return (
    <div className="bg-white/60 backdrop-blur-sm border-2 border-gray-300 rounded shadow overflow-hidden">
        <h3 className="bg-secondary text-white text-xs font-bold py-2.5 px-4 text-center uppercase tracking-wide">
          {userFirstName}&apos;s Schedule
        </h3>

        <div className="p-4">
          {loading ? (
            <div className="text-center text-xs text-muted-foreground py-4">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-4">No upcoming events</div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="mb-3 last:mb-0">
                <div className="mb-2">
                  <span
                    className="text-white text-[10px] font-bold py-1.5 px-3 rounded inline-block uppercase tracking-wide"
                    style={{ backgroundColor: event.color || '#1e3a5f' }}
                  >
                    {formatDate(event.start_time)}
                  </span>
                </div>

                <div
                  onClick={() => router.push(`/schedule?event=${event.id}`)}
                  className="bg-white rounded p-3 border-l-4 cursor-pointer hover:brightness-95 transition-all"
                  style={{ borderColor: event.color || '#1e3a5f', borderWidth: '0 0 0 4px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
                >
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
