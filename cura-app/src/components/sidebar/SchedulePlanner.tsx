"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getEvents } from "@/lib/api/events";
import { getProfile } from "@/lib/api/profiles";

interface Event {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  notes?: string;
}

interface SchedulePlannerProps {
  userName?: string;
}

export function SchedulePlanner({
  userName,
}: SchedulePlannerProps) {
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
    <Link href="/schedule" className="block">
      <div className="bg-[#c5ddf5] rounded-2xl p-4 cursor-pointer hover:bg-[#b8d4f0] transition-colors">
        <h3 className="bg-secondary text-white text-xs font-bold py-2.5 px-4 rounded-lg mb-4 text-center">
          {userFirstName}&apos;s Schedule Planner
        </h3>

        {loading ? (
          <div className="text-center text-xs text-gray-600 py-4">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="text-center text-xs text-gray-600 py-4">No upcoming events</div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="mb-3">
              <div className="mb-2">
                <span className="bg-secondary text-white text-[11px] font-bold py-1.5 px-3 rounded-md inline-block">
                  {formatDate(event.start_time)}
                </span>
              </div>

              <div className="bg-white/80 rounded-xl p-3 mb-3 shadow-sm">
                <div className="text-sm font-bold text-secondary">
                  {formatTime(event.start_time, event.end_time)}
                </div>
                <div className="text-sm font-semibold text-secondary">
                  {event.title}
                </div>
                {event.location && (
                  <div className="text-xs text-gray-500">{event.location}</div>
                )}
                {event.notes && (
                  <div className="text-xs text-[#5a8ac4] italic mt-1">{event.notes}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Link>
  );
}
