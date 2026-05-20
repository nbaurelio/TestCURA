"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Calendar, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { ActivityLog } from "@/lib/api/activity-logs";
import { getReferralById, getReferralByChartNumber, Referral } from "@/lib/api/referrals";
import { ViewDetailsModal } from "@/components/modals/ViewDetailsModal";

interface ActivityLogDetailsModalProps {
  log: ActivityLog | null;
  isOpen: boolean;
  onClose: () => void;
  // When provided, the description's first/second-person pronouns ("You",
  // "your") are rewritten to the actor's name so admins reviewing other
  // users' logs see neutral, third-person phrasing.
  actorName?: string;
}

// Rewrites first/second-person pronouns in an activity-log description into
// third-person using the actor's name. Preserves the original casing of the
// matched word to keep all-caps / title-case tables looking right.
export function depersonalizeDescription(description: string, actorName?: string): string {
  if (!actorName) return description;
  const name = actorName.trim();
  if (!name) return description;
  const possessive = `${name}'s`;
  return description
    // "Your" / "your" / "YOUR" → possessive form
    .replace(/\byour\b/gi, (m) => {
      if (m === m.toUpperCase()) return possessive.toUpperCase();
      return possessive;
    })
    // "You" / "you" / "YOU" → name (preserve casing of leading character)
    .replace(/\byou\b/gi, (m) => {
      if (m === m.toUpperCase()) return name.toUpperCase();
      return name;
    });
}

export function ActivityLogDetailsModal({ log, isOpen, onClose, actorName }: ActivityLogDetailsModalProps) {
  // Track when we're on the client so createPortal doesn't blow up during SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Deep-link state: when a chart number is clicked we resolve it to a
  // Referral and hand it off to ViewDetailsModal.
  const [linkedReferral, setLinkedReferral] = useState<Referral | null>(null);
  const [resolvingReferral, setResolvingReferral] = useState(false);

  if (!mounted) return null;
  // Stay mounted while the deep-linked View Details modal is open even after
  // the activity dialog has been dismissed — otherwise the secondary modal
  // unmounts before the user sees it.
  if ((!isOpen || !log) && !linkedReferral) return null;

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
    // Fallback: turn the raw enum-style code into something readable, e.g.
    // `DECLINE_EDIT_REQUEST` → `DECLINE EDIT REQUEST`.
    return actionMap[action] || action.replace(/_/g, " ");
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
    if (log?.metadata) {
      metadata = JSON.parse(log.metadata);
    }
  } catch (e) {
    console.error('Error parsing metadata:', e);
  }

  // Portal to <body> so the fixed-position overlay isn't trapped by any
  // transformed ancestor (e.g. the page's `.animate-enter` wrapper) and
  // covers the entire viewport, sidebar and header included.
  return createPortal(
    <>
    {isOpen && log && (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 px-4 pb-6">
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
            <p className="text-xs text-gray-800 break-words">
              {renderDescriptionWithChartLinks(
                depersonalizeDescription(log.description, actorName),
                metadata,
                async (chartNumber) => {
                  if (resolvingReferral) return;
                  setResolvingReferral(true);
                  console.log("[ActivityLog] Resolving referral for chart", chartNumber, "metadata:", metadata);
                  // Prefer the referral_id stored in metadata — it's the
                  // canonical pointer and immune to chart-number reuse.
                  let referral: Referral | null = null;
                  if (metadata?.referral_id) {
                    referral = await getReferralById(metadata.referral_id);
                    console.log("[ActivityLog] getReferralById →", referral);
                  }
                  if (!referral) {
                    referral = await getReferralByChartNumber(chartNumber);
                    console.log("[ActivityLog] getReferralByChartNumber →", referral);
                  }
                  setResolvingReferral(false);
                  if (referral) {
                    // Dismiss the activity dialog first so the View Details
                    // modal (Radix Dialog, lower default z-index) isn't
                    // stacked behind this portal.
                    setLinkedReferral(referral);
                    onClose();
                  } else {
                    // Most common cause: the referral was deleted after the
                    // log entry was written. Tell the user instead of
                    // silently doing nothing.
                    toast.error(`Referral ${chartNumber} could not be found. It may have been deleted.`);
                  }
                },
                resolvingReferral,
              )}
            </p>
          </div>

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
    )}
    {/* Deep-link target: opens the standard View Details modal when the
        chart number in the description is clicked. */}
    <ViewDetailsModal
      referral={linkedReferral}
      isOpen={!!linkedReferral}
      onClose={() => setLinkedReferral(null)}
    />
    </>,
    document.body,
  );
}

// ─── Description renderer ──────────────────────────────────────────────────
// Splits the description on the chart-number pattern (`YYYY-NNNNN`) and
// renders each match as a clickable link that resolves the referral via the
// supplied callback. Falls back to plain text if no match is found.
function renderDescriptionWithChartLinks(
  description: string,
  metadata: any,
  onChartClick: (chartNumber: string) => void,
  loading: boolean,
): React.ReactNode {
  // Match a year-prefixed chart number, e.g. 2026-00130. The trailing digits
  // are bounded between 3 and 6 to stay generous without accidentally
  // grabbing date-like sequences.
  const regex = /(\b\d{4}-\d{3,6}\b)/g;
  const parts = description.split(regex);
  if (parts.length === 1) {
    // No chart number in the text — render as plain text.
    return description;
  }
  return parts.map((part, idx) => {
    if (regex.test(part)) {
      // `regex.test` advances lastIndex on global regexes — reset before the
      // next iteration so subsequent splits still work as expected.
      regex.lastIndex = 0;
      const chartNumber = part;
      return (
        <button
          key={idx}
          type="button"
          disabled={loading}
          onClick={() => onChartClick(chartNumber)}
          className="font-semibold text-secondary underline underline-offset-2 hover:text-secondary/80 disabled:opacity-50 disabled:cursor-wait"
        >
          {chartNumber}
        </button>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}
