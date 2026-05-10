"use client";

import React from "react";
import { X, Calendar, Clock, FileText } from "lucide-react";
import { ActivityLog } from "@/lib/api/activity-logs";

interface ActivityLogDetailsModalProps {
  log: ActivityLog | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ActivityLogDetailsModal({ log, isOpen, onClose }: ActivityLogDetailsModalProps) {
  if (!isOpen || !log) return null;

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getActionLabel = (action: string) => {
    const actionMap: { [key: string]: string } = {
      'CREATE_REFERRAL': 'Created Referral',
      'UPDATE_REFERRAL': 'Updated Referral',
      'DELETE_REFERRAL': 'Deleted Referral',
      'ACCEPT_REFERRAL': 'Accepted Referral',
      'CREATE_EVENT': 'Created Event',
      'UPDATE_EVENT': 'Updated Event',
      'DELETE_EVENT': 'Deleted Event',
    };
    return actionMap[action] || action;
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'bg-green-50 border-green-200 text-green-700';
    if (action.includes('UPDATE')) return 'bg-blue-50 border-blue-200 text-blue-700';
    if (action.includes('DELETE')) return 'bg-red-50 border-red-200 text-red-700';
    if (action.includes('ACCEPT')) return 'bg-orange-50 border-orange-200 text-orange-700';
    return 'bg-gray-50 border-gray-200 text-gray-700';
  };

  // Parse metadata if it exists
  let metadata: any = null;
  try {
    if (log.metadata) {
      metadata = JSON.parse(log.metadata);
    }
  } catch (e) {
    console.error('Error parsing metadata:', e);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 pb-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white max-w-[380px] w-full rounded-xl overflow-hidden shadow-xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-secondary p-3 sm:p-4 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-white font-bold text-xs sm:text-sm uppercase tracking-wide">
            Activity Details
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
          {/* Action Type */}
          <div className={`rounded-lg p-2.5 sm:p-3 border ${getActionColor(log.action)}`}>
            <h3 className="text-[10px] font-bold uppercase tracking-wide mb-1.5">Action Type</h3>
            <p className="text-xs font-semibold">{getActionLabel(log.action)}</p>
          </div>

          {/* Description */}
          <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <FileText className="h-3 w-3 text-secondary" />
              <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wide">Description</h3>
            </div>
            <p className="text-xs text-gray-800 break-words">{log.description}</p>
          </div>

          {/* Referral Details (if available) */}
          {metadata && (metadata.chart_number || metadata.destination || metadata.referral_id) && (
            <div className="bg-purple-50 rounded-lg p-2.5 sm:p-3 border border-purple-200">
              <h3 className="text-[10px] font-bold text-purple-700 uppercase tracking-wide mb-2">Referral Details</h3>
              <div className="space-y-1.5">
                {metadata.chart_number && (
                  <div>
                    <span className="text-[10px] font-semibold text-purple-700">Chart Number: </span>
                    <span className="text-xs text-gray-800">{metadata.chart_number}</span>
                  </div>
                )}
                {metadata.age && (
                  <div>
                    <span className="text-[10px] font-semibold text-purple-700">Patient Age: </span>
                    <span className="text-xs text-gray-800">{metadata.age} years old</span>
                  </div>
                )}
                {metadata.destination && (
                  <div>
                    <span className="text-[10px] font-semibold text-purple-700">Destination: </span>
                    <span className="text-xs text-gray-800">{metadata.destination}</span>
                  </div>
                )}
                {metadata.medical_alert && (
                  <div>
                    <span className="text-[10px] font-semibold text-purple-700">Medical Alert: </span>
                    <span className="text-xs text-red-600 font-medium">{metadata.medical_alert}</span>
                  </div>
                )}
                {metadata.accepted_by && (
                  <div>
                    <span className="text-[10px] font-semibold text-purple-700">Accepted By: </span>
                    <span className="text-xs text-gray-800">{metadata.accepted_by}</span>
                  </div>
                )}
                {metadata.referral_id && (
                  <div>
                    <span className="text-[10px] font-semibold text-purple-700">Referral ID: </span>
                    <span className="text-xs text-gray-800 font-mono break-all">{metadata.referral_id}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Event Details (if available) */}
          {metadata && (metadata.title || metadata.event_id) && (
            <div className="bg-indigo-50 rounded-lg p-2.5 sm:p-3 border border-indigo-200">
              <h3 className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide mb-2">Event Details</h3>
              <div className="space-y-1.5">
                {metadata.title && (
                  <div>
                    <span className="text-[10px] font-semibold text-indigo-700">Event Title: </span>
                    <span className="text-xs text-gray-800">{metadata.title}</span>
                  </div>
                )}
                {metadata.description && (
                  <div>
                    <span className="text-[10px] font-semibold text-indigo-700">Description: </span>
                    <span className="text-xs text-gray-800">{metadata.description}</span>
                  </div>
                )}
                {metadata.location && (
                  <div>
                    <span className="text-[10px] font-semibold text-indigo-700">Location: </span>
                    <span className="text-xs text-gray-800">{metadata.location}</span>
                  </div>
                )}
                {metadata.start_time && (
                  <div>
                    <span className="text-[10px] font-semibold text-indigo-700">Start Time: </span>
                    <span className="text-xs text-gray-800">
                      {new Date(metadata.start_time).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                )}
                {metadata.end_time && (
                  <div>
                    <span className="text-[10px] font-semibold text-indigo-700">End Time: </span>
                    <span className="text-xs text-gray-800">
                      {new Date(metadata.end_time).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                )}
                {metadata.event_id && (
                  <div>
                    <span className="text-[10px] font-semibold text-indigo-700">Event ID: </span>
                    <span className="text-xs text-gray-800 font-mono break-all">{metadata.event_id}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timestamp Information */}
          <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 space-y-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Calendar className="h-3 w-3 text-secondary" />
                <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wide">Date</h3>
              </div>
              <p className="text-xs text-gray-800 font-medium">{formatDate(log.created_at)}</p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Clock className="h-3 w-3 text-secondary" />
                <h3 className="text-[10px] font-bold text-secondary uppercase tracking-wide">Time</h3>
              </div>
              <p className="text-xs text-gray-800 font-medium">{formatTime(log.created_at)}</p>
            </div>
          </div>

          {/* Full Timestamp */}
          <div className="bg-blue-50 rounded-lg p-2.5 sm:p-3 border border-blue-200">
            <h3 className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1.5">Full Timestamp</h3>
            <p className="text-[11px] text-gray-800">{formatDateTime(log.created_at)}</p>
          </div>

          {/* Close Button */}
          <div className="pt-1.5">
            <button
              onClick={onClose}
              className="w-full bg-secondary text-white text-[10px] font-bold hover:bg-secondary/90 h-8 rounded-lg transition-colors"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
