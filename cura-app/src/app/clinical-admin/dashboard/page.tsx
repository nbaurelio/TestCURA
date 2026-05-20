"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { getReferrals, Referral } from "@/lib/api/referrals";
import { getAllProfiles, Profile } from "@/lib/api/profiles";
import { getAllEvents } from "@/lib/api/events";
import {
  ArrowLeft,
  FileText,
  TrendingUp,
  AlertTriangle,
  Clock,
  Users,
  PieChart as PieChartIcon,
  Activity,
  BarChart3,
  X,
  FileSpreadsheet,
  Search,
  Hourglass,
  Pause,
  Ban,
  Repeat,
  Calendar as CalendarIcon,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  CheckCircle,
  CalendarDays,
  RefreshCw,
  UserCheck,
  FilePlus,
} from "lucide-react";
// Lazy-loaded at call site to avoid blocking page compilation
const lazyExport = () => import("@/lib/utils/dashboardExport");
import { toast } from "sonner";
import { sendSystemNotification } from "@/lib/utils/notify";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  ComposedChart, Line, Area, AreaChart, PieChart, Pie, ReferenceLine, Legend,
} from "recharts";

// ─── Status colors ──────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  Pending:     "#F59E0B",
  Ongoing:     "#3B82F6",
  Completed:   "#22C55E",
  Deferred:    "#EF4444",
  Blacklisted: "#374151",
  "Re-referred": "#A855F7",
  Overdue:     "#DC2626",
  MedAlert:    "#EC4899",
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const visible = payload.filter((p: any) => p.value !== 0 && p.value !== undefined);
  if (visible.length === 0) return null;
  return (
    <div className="bg-white border-2 border-[#87c4d8]/30 rounded-lg shadow-lg px-3 py-2">
      <p className="text-[11px] font-bold text-secondary">{label}</p>
      {visible.map((p: any, i: number) => (
        <p key={i} className="text-[11px]" style={{ color: p.color || p.fill }}>
          {p.name || p.dataKey}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Time period helpers ─────────────────────────────────────────────────────
type TimePeriod = "week" | "5weeks" | "10weeks" | "15weeks" | "all";

function getTimePeriodStart(period: TimePeriod): Date {
  const now = new Date();
  switch (period) {
    case "week":    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    case "5weeks":  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 35);
    case "10weeks": return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 70);
    case "15weeks": return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 105);
    case "all":     return new Date(2000, 0, 1);
  }
}

function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function overdueStartDate(r: { tentative_appointment_schedule?: string | null }): string | null {
  return r.tentative_appointment_schedule ?? null;
}

const OVERDUE_DAYS = 7;
const PERIOD_LABELS: Record<TimePeriod, string> = {
  week: "7 Days", "5weeks": "5 Weeks", "10weeks": "10 Weeks", "15weeks": "15 Weeks", all: "All Time",
};

function getBucketKey(d: Date, period: TimePeriod): string {
  if (period === "all") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  } else if (period === "week") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } else {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.getFullYear(), d.getMonth(), diff);
    return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, "0")}-${String(mon.getDate()).padStart(2, "0")}`;
  }
}

function formatBucketLabel(key: string, period: TimePeriod): string {
  if (period === "all") {
    const [y, m] = key.split("-");
    return `${new Date(+y, +m - 1).toLocaleString("en-US", { month: "short" })} '${y.slice(-2)}`;
  }
  const [y, m, day] = key.split("-");
  return new Date(+y, +m - 1, +day).toLocaleString("en-US", { month: "short", day: "numeric" });
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, onClick }: {
  icon: React.ElementType; label: string; value: string; sub: string; color: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border-2 border-[#87c4d8]/30 shadow-sm p-3 flex items-start gap-2.5 hover:shadow-md hover:border-[#87c4d8]/50 transition-all ${onClick ? "cursor-pointer active:scale-[0.98]" : ""}`}
    >
      <div className="p-2 rounded-lg bg-[#87c4d8]/10">
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-secondary leading-tight mt-0.5">{value}</p>
        <p className="text-[9px] text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ─── Chart Card ──────────────────────────────────────────────────────────────
function ChartCard({ id, title, children, className = "" }: {
  id?: string; title: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div id={id} className={`bg-white rounded-lg border-2 border-[#87c4d8]/30 shadow-sm overflow-hidden ${className}`}>
      <div className="px-5 py-3 border-b-2 border-[#87c4d8]/20 bg-[#87c4d8]/[0.06]">
        <h3 className="text-[11px] font-bold text-secondary uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Stat Detail Modal ──────────────────────────────────────────────────────
type StatModalType = "total" | "recentlyCreated" | "accepted" | "completed" | "overdue" | "avgAcceptance" | "available" | "ongoing" | "deferred" | "blacklisted" | "avgCompletion" | "rereferred" | null;

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  ongoing:     { bg: "bg-blue-50",   text: "text-blue-700" },
  completed:   { bg: "bg-green-50",  text: "text-green-700" },
  deferred:    { bg: "bg-red-50",    text: "text-red-700" },
  blacklisted: { bg: "bg-gray-100",  text: "text-gray-700" },
  pending:     { bg: "bg-amber-50",  text: "text-amber-700" },
};

function StatDetailModal({ type, onClose, rows, title, accent }: {
  type: StatModalType;
  onClose: () => void;
  rows: any[];
  title: string;
  accent: string;
}) {
  if (!type) return null;

  const columns: Record<NonNullable<StatModalType>, { key: string; label: string; width?: string }[]> = {
    total: [
      { key: "chart", label: "Chart #" },
      { key: "clinician", label: "Clinician" },
      { key: "origin", label: "Origin" },
      { key: "destination", label: "Destination" },
      { key: "status", label: "Status" },
      { key: "created", label: "Created" },
      { key: "age", label: "Days Since" },
    ],
    recentlyCreated: [
      { key: "chart", label: "Chart #" },
      { key: "clinician", label: "Clinician" },
      { key: "origin", label: "Origin" },
      { key: "destination", label: "Destination" },
      { key: "status", label: "Status" },
      { key: "created", label: "Created" },
      { key: "age", label: "Days Since" },
    ],
    accepted: [
      { key: "chart", label: "Chart #" },
      { key: "clinician", label: "Created By" },
      { key: "acceptedBy", label: "Accepted By" },
      { key: "origin", label: "Origin" },
      { key: "destination", label: "Destination" },
      { key: "created", label: "Created" },
      { key: "accepted", label: "Accepted" },
      { key: "daysToAccept", label: "Days to Accept" },
    ],
    completed: [
      { key: "chart", label: "Chart #" },
      { key: "clinician", label: "Created By" },
      { key: "acceptedBy", label: "Accepted By" },
      { key: "origin", label: "Origin" },
      { key: "destination", label: "Destination" },
      { key: "created", label: "Created" },
      { key: "completedAt", label: "Completed" },
      { key: "daysToComplete", label: "Days" },
    ],
    overdue: [
      { key: "chart", label: "Chart #" },
      { key: "clinician", label: "Clinician" },
      { key: "origin", label: "Origin" },
      { key: "destination", label: "Destination" },
      { key: "created", label: "Created" },
      { key: "daysOverdue", label: "Days Overdue" },
      { key: "status", label: "Status" },
    ],
    avgAcceptance: [
      { key: "chart", label: "Chart #" },
      { key: "clinician", label: "Created By" },
      { key: "acceptedBy", label: "Accepted By" },
      { key: "origin", label: "Origin" },
      { key: "created", label: "Created" },
      { key: "accepted", label: "Accepted" },
      { key: "daysToAccept", label: "Days to Accept" },
    ],
    available: [
      { key: "chart", label: "Chart #" },
      { key: "clinician", label: "Created By" },
      { key: "origin", label: "Origin" },
      { key: "destination", label: "Destination" },
      { key: "created", label: "Created" },
      { key: "age", label: "Days in System" },
    ],
    ongoing: [
      { key: "chart", label: "Chart #" },
      { key: "clinician", label: "Created By" },
      { key: "acceptedBy", label: "Accepted By" },
      { key: "origin", label: "Origin" },
      { key: "destination", label: "Destination" },
      { key: "created", label: "Created" },
      { key: "accepted", label: "Accepted" },
    ],
    deferred: [
      { key: "chart", label: "Chart #" },
      { key: "clinician", label: "Created By" },
      { key: "acceptedBy", label: "Accepted By" },
      { key: "origin", label: "Origin" },
      { key: "destination", label: "Destination" },
      { key: "created", label: "Created" },
      { key: "deferredAt", label: "Deferred At" },
    ],
    blacklisted: [
      { key: "chart", label: "Chart #" },
      { key: "clinician", label: "Created By" },
      { key: "acceptedBy", label: "Accepted By" },
      { key: "origin", label: "Origin" },
      { key: "destination", label: "Destination" },
      { key: "created", label: "Created" },
      { key: "blacklistedAt", label: "Blacklisted At" },
    ],
    avgCompletion: [
      { key: "chart", label: "Chart #" },
      { key: "clinician", label: "Created By" },
      { key: "acceptedBy", label: "Accepted By" },
      { key: "origin", label: "Origin" },
      { key: "destination", label: "Destination" },
      { key: "accepted", label: "Accepted" },
      { key: "completedAt", label: "Completed" },
      { key: "daysToComplete", label: "Days" },
    ],
    rereferred: [
      { key: "chart", label: "Chart #" },
      { key: "clinician", label: "Created By" },
      { key: "acceptedBy", label: "Accepted By" },
      { key: "origin", label: "Origin" },
      { key: "destination", label: "Destination" },
      { key: "created", label: "Created" },
    ],
  };

  const cols = columns[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-secondary/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-xl shadow-2xl border border-secondary/20 w-full max-w-4xl max-h-[80vh] flex flex-col animate-[fadeIn_0.2s_ease-out] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header — dark blue */}
        <div className="flex items-center justify-between px-6 py-4 bg-secondary text-white">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full ring-2 ring-white/30" style={{ backgroundColor: accent }} />
            <h2 className="text-[13px] font-bold uppercase tracking-wide">{title}</h2>
            <span className="text-[10px] font-bold text-white/60 bg-white/15 px-2.5 py-0.5 rounded-full">{rows.length} referrals</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="h-4 w-4 text-white/70" />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {rows.length > 0 ? (
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#f5f7fa]">
                  {cols.map(col => (
                    <th key={col.key} className="text-left px-4 py-3 font-bold text-secondary uppercase tracking-wide text-[9px] border-b-2 border-secondary/10 bg-[#f5f7fa]">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, i: number) => (
                  <tr key={i} className={`border-b border-secondary/[0.06] hover:bg-[#87c4d8]/[0.06] transition-colors ${i % 2 === 0 ? "bg-white" : "bg-secondary/[0.02]"}`}>
                    {cols.map(col => (
                      <td key={col.key} className="px-4 py-2.5">
                        {col.key === "status" ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[row[col.key]?.toLowerCase?.() || "pending"]?.bg || "bg-gray-100"} ${STATUS_BADGE[row[col.key]?.toLowerCase?.() || "pending"]?.text || "text-gray-700"}`}>
                            {row[col.key] || "Pending"}
                          </span>
                        ) : col.key === "daysOverdue" || col.key === "daysToAccept" || col.key === "daysToComplete" || col.key === "age" ? (
                          <span className={`font-bold ${(row[col.key] || 0) > OVERDUE_DAYS ? "text-red-600" : "text-secondary/70"}`}>
                            {row[col.key] ?? "—"}
                          </span>
                        ) : col.key === "chart" ? (
                          <span className="font-bold text-secondary">{row[col.key] ?? "—"}</span>
                        ) : (
                          <span className="text-secondary/60 truncate block max-w-[140px]" title={row[col.key]}>
                            {row[col.key] ?? "—"}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-32 flex items-center justify-center">
              <p className="text-xs text-secondary/40">No referrals in this category</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-secondary/[0.04] border-t border-secondary/10 flex items-center justify-between">
          <span className="text-[9px] text-secondary/40 font-medium uppercase tracking-wide">Clinical Admin Dashboard</span>
          <span className="text-[9px] text-secondary/40 font-medium">Showing {rows.length} of {rows.length} records</span>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function ClinicalAdminAnalyticsDashboard() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [clinicians, setClinicians] = useState<Profile[]>([]);
  const [professors, setProfessors] = useState<Profile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);

  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [clinicianSearch, setClinicianSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [refs, allProfiles, eventsData] = await Promise.all([
          getReferrals(true),
          getAllProfiles(),
          getAllEvents(),
        ]);
        setReferrals(refs || []);
        setAllProfiles(allProfiles || []);
        setAllEvents(eventsData || []);
        // Clinical admin sees all clinicians
        setClinicians((allProfiles || []).filter(p => p.role === "clinician"));
        setProfessors((allProfiles || []).filter(p => p.role === "professor"));
      } catch (e) {
        console.error("Dashboard load error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Scope helpers ───────────────────────────────────────────────────────────
  const clinicianIds = useMemo(() => new Set(clinicians.map(a => a.id)), [clinicians]);

  const periodStart = useMemo(() => {
    if (customRange?.start) return new Date(customRange.start);
    return new Date(2000, 0, 1);
  }, [customRange]);

  const periodEnd = useMemo(() => {
    if (customRange?.end) {
      const d = new Date(customRange.end);
      d.setHours(23, 59, 59, 999);
      return d;
    }
    return null;
  }, [customRange]);

  // Referrals CREATED by clinicians (Total Referrals, Overdue)
  const createdByClinician = useMemo(() => {
    return referrals.filter(r => {
      if (clinicianIds.size > 0 && !clinicianIds.has(r.user_id)) return false;
      const created = new Date(r.created_at);
      if (created < periodStart) return false;
      if (periodEnd && created > periodEnd) return false;
      return true;
    });
  }, [referrals, clinicianIds, periodStart, periodEnd]);

  // Referrals ACCEPTED by clinicians (Completed, Avg Acceptance, Status chart)
  const acceptedByClinician = useMemo(() => {
    return referrals.filter(r => {
      if (clinicianIds.size > 0 && !clinicianIds.has(r.accepted_by_user_id || "")) return false;
      const created = new Date(r.created_at);
      if (created < periodStart) return false;
      if (periodEnd && created > periodEnd) return false;
      return true;
    });
  }, [referrals, clinicianIds, periodStart, periodEnd]);

  // ── Unfiltered (all-time) variants ───────────────────────────────────────
  // The summary stat cards must always reflect the full college-wide picture
  // and ignore the period-pill filter (which now scopes only the charts).
  const createdByClinicianAll = useMemo(() => {
    return referrals.filter(r => clinicianIds.size === 0 || clinicianIds.has(r.user_id));
  }, [referrals, clinicianIds]);

  const acceptedByClinicianAll = useMemo(() => {
    return referrals.filter(r => clinicianIds.size === 0 || clinicianIds.has(r.accepted_by_user_id || ""));
  }, [referrals, clinicianIds]);

  // ── Computed stat values ──────────────────────────────────────────────────
  // Stat cards use the period-filtered variants so the time filter affects them.
  const totalRefs = createdByClinician.length;

  const completedCount = useMemo(
    () => acceptedByClinician.filter(r => r.referral_status === "completed").length,
    [acceptedByClinician]
  );

  const completionRate = acceptedByClinician.length > 0
    ? ((completedCount / acceptedByClinician.length) * 100).toFixed(0) : "0";

  const avgCompletionDays = useMemo(() => {
    const diffs: number[] = [];
    createdByClinician.forEach(r => {
      if (r.referral_status !== "completed") return;
      const d = daysBetween(r.accepted_at, r.referral_status_changed_at);
      if (d !== null && d >= 0) diffs.push(d);
    });
    if (diffs.length === 0) return null;
    return +(diffs.reduce((s, v) => s + v, 0) / diffs.length).toFixed(1);
  }, [createdByClinician]);

  const overdueCount = useMemo(() => {
    const now = new Date().toISOString();
    return acceptedByClinician.filter(r => {
      if (!r.accepted_at) return false;
      const rs = r.referral_status?.toLowerCase();
      if (rs === "completed" || rs === "deferred" || rs === "blacklisted") return false;
      const startDate = overdueStartDate(r);
      if (!startDate) return false;
      if (new Date(startDate) > new Date()) return false;
      const age = daysBetween(startDate, now);
      return age !== null && age > OVERDUE_DAYS;
    }).length;
  }, [acceptedByClinician]);

  // ── Referral Status — based on ACCEPTED referrals ─────────────────────────
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {
      Pending: 0, Ongoing: 0, Completed: 0, Deferred: 0, Blacklisted: 0, "Re-referred": 0,
    };
    acceptedByClinician.forEach(r => {
      if (r.rerefer_request_status === "approved") { counts["Re-referred"]++; return; }
      const rs = r.referral_status?.toLowerCase();
      if (rs === "completed") counts.Completed++;
      else if (rs === "deferred") counts.Deferred++;
      else if (rs === "blacklisted") counts.Blacklisted++;
      else if (rs === "ongoing") counts.Ongoing++;
      else counts.Pending++;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [acceptedByClinician]);

  // ── Referrals Over Time — interval driven by timePeriod ──────────────────
  const timelineData = useMemo(() => {
    const buckets: Record<string, number> = {};
    acceptedByClinician.forEach(r => {
      const key = getBucketKey(new Date(r.created_at), timePeriod);
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({ month: formatBucketLabel(key, timePeriod), referrals: count }));
  }, [acceptedByClinician, timePeriod]);

  // ── Departmental Net Flow ─────────────────────────────────────────
  const netFlowData = useMemo(() => {
    const map: Record<string, { incoming: number; outgoing: number }> = {};
    const ensure = (s: string) => { if (!map[s]) map[s] = { incoming: 0, outgoing: 0 }; };
    acceptedByClinician.forEach(r => {
      const dest = r.clinical_section_destination || "Unknown";
      const orig = r.clinical_section_origin    || "Unknown";
      ensure(dest); map[dest].incoming++;
      ensure(orig); map[orig].outgoing++;
    });
    return Object.entries(map)
      .map(([section, { incoming, outgoing }]) => ({
        section,
        incoming,
        outgoing: -outgoing,          // negative for diverging left bar
        net: incoming - outgoing,
      }))
      .sort((a, b) => b.net - a.net); // hottest bottleneck first
  }, [acceptedByClinician]);

  // ── Turnaround time per clinician ────────────────────────────────────────
  const turnaroundData = useMemo(() => {
    const completed = acceptedByClinician.filter(r => r.referral_status === "completed");
    const clinicianMap: Record<string, { name: string; days: number[] }> = {};
    completed.forEach(r => {
      const d = daysBetween(r.accepted_at, r.referral_status_changed_at);
      if (d === null || d < 0) return;
      const uid = r.accepted_by_user_id || "";
      if (!clinicianMap[uid]) {
        const cln = clinicians.find(a => a.id === uid);
        clinicianMap[uid] = {
          name: cln ? `${cln.first_name} ${cln.last_name?.[0] || ""}.` : (r.accepted_by || "Unknown"),
          days: [],
        };
      }
      clinicianMap[uid].days.push(d);
    });
    return Object.values(clinicianMap)
      .map(({ name, days }) => ({
        name,
        avg: +(days.reduce((s, v) => s + v, 0) / days.length).toFixed(1),
        min: Math.min(...days),
        max: Math.max(...days),
      }))
      .sort((a, b) => a.avg - b.avg);
  }, [acceptedByClinician, clinicians]);

  // ── Case mix — treatment service distribution ─────────────────────────────
  const CASE_MIX_COLORS = [
    "#5B8AB8", "#22C55E", "#F59E0B", "#EF4444", "#A855F7",
    "#3B82F6", "#EC4899", "#14B8A6", "#F97316", "#6366F1",
    "#84CC16", "#06B6D4",
  ];
  const caseMixData = useMemo(() => {
    const counts: Record<string, number> = {};
    acceptedByClinician.forEach(r => {
      const svc = r.treatment_service_destination || "Unknown";
      counts[svc] = (counts[svc] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value], i) => ({
        name,
        value,
        fill: CASE_MIX_COLORS[i % CASE_MIX_COLORS.length],
      }));
  }, [acceptedByClinician]);


  // ── Referral origins ─────────────────────────────────────────────────────
  const ORIGIN_COLORS = [
    "#5B8AB8", "#22C55E", "#F59E0B", "#EF4444", "#A855F7",
    "#3B82F6", "#EC4899", "#14B8A6",
  ];
  const originsData = useMemo(() => {
    const counts: Record<string, number> = {};
    acceptedByClinician.forEach(r => {
      const origin = r.clinical_section_origin || "Unknown";
      counts[origin] = (counts[origin] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value], i) => ({ name, value, fill: ORIGIN_COLORS[i % ORIGIN_COLORS.length] }));
  }, [acceptedByClinician]);

  const OVERDUE_DAYS_HM = 14;


  // ── Exceptions & alerts ─────────────────────────────────────────────────
  const exceptionsData = useMemo(() => {
    const now = new Date().toISOString();
    let overdue = 0, medAlerts = 0, reReferred = 0, deferred = 0, blacklisted = 0;
    const alertList: { clinician: string; type: string; detail: string; color: string }[] = [];

    acceptedByClinician.forEach(r => {
      const cln = clinicians.find(a => a.id === (r.accepted_by_user_id || ""));
      const clnName = cln ? `${cln.first_name} ${cln.last_name?.[0] || ""}.` : (r.accepted_by || "Unknown");

      if ((!r.referral_status || r.referral_status === "ongoing" || r.referral_status === "pending") && r.accepted_at) {
        const startDate = overdueStartDate(r);
        if (startDate && new Date(startDate) <= new Date()) {
          const age = daysBetween(startDate, now);
          if (age !== null && age > OVERDUE_DAYS) {
            overdue++;
            alertList.push({ clinician: clnName, type: "Overdue", detail: `${age}d since appointment`, color: "#EF4444" });
          }
        }
      }
      if (r.medical_alert && r.medical_alert !== "None" && r.medical_alert !== "none") {
        medAlerts++;
        alertList.push({ clinician: clnName, type: "Medical Alert", detail: r.medical_alert, color: "#F59E0B" });
      }
      if (r.rerefer_request_status === "approved") {
        reReferred++;
        alertList.push({ clinician: clnName, type: "Re-referred", detail: r.chart_number, color: "#A855F7" });
      }
      if (r.referral_status === "deferred") {
        deferred++;
        alertList.push({ clinician: clnName, type: "Deferred", detail: r.chart_number, color: "#EF4444" });
      }
      if (r.referral_status === "blacklisted") {
        blacklisted++;
        alertList.push({ clinician: clnName, type: "Blacklisted", detail: r.chart_number, color: "#374151" });
      }
    });

    const summary = [
      { name: "Overdue", value: overdue, fill: "#EF4444" },
      { name: "Med. Alerts", value: medAlerts, fill: "#F59E0B" },
      { name: "Re-referred", value: reReferred, fill: "#A855F7" },
      { name: "Deferred", value: deferred, fill: "#F97316" },
      { name: "Blacklisted", value: blacklisted, fill: "#374151" },
    ];
    return { summary, alertList };
  }, [acceptedByClinician, clinicians]);

  // ── SLA Compliance Rate — % reviewed within 53 days, by month ─────────
  const SLA_TARGET_DAYS = 7;
  const SLA_TARGET_PERCENT = 80;
  const slaData = useMemo(() => {
    const buckets: Record<string, { total: number; compliant: number }> = {};
    createdByClinician.forEach(r => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!buckets[key]) buckets[key] = { total: 0, compliant: 0 };
      buckets[key].total++;
      if (r.accepted_at) {
        const days = daysBetween(r.created_at, r.accepted_at);
        if (days !== null && days <= SLA_TARGET_DAYS) {
          buckets[key].compliant++;
        }
      }
    });
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { total, compliant }]) => {
        const [y, m] = month.split("-");
        const monthName = new Date(+y, +m - 1).toLocaleString("en-US", { month: "short" });
        return {
          month: `${monthName} '${y.slice(-2)}`,
          compliance: total > 0 ? +((compliant / total) * 100).toFixed(1) : 0,
          total,
          compliant,
        };
      });
  }, [createdByClinician]);

  // ── Professor Workload Distribution ────────────────────────────────────
  const WORKLOAD_COLORS: Record<string, string> = {
    Pending: "#F59E0B", Completed: "#22C55E", Overdue: "#EF4444",
  };
  const professorWorkloadData = useMemo(() => {
    return professors.map(prof => {
      // Find advisees for this professor
      const adviseeIds = new Set(
        allProfiles.filter(p => p.adviser_ids?.includes(prof.id)).map(p => p.id)
      );
      // Get referrals created by this professor's advisees within period
      const adviseeReferrals = referrals.filter(r =>
        adviseeIds.has(r.user_id) && new Date(r.created_at) >= periodStart
      );
      const now = new Date();
      let pending = 0, completed = 0, overdue = 0;
      adviseeReferrals.forEach(r => {
        const rs = r.referral_status?.toLowerCase();
        if (rs === "completed") {
          completed++;
        } else if (r.accepted_at && (() => { const sd = overdueStartDate(r); return sd && new Date(sd) <= now && (daysBetween(sd, now.toISOString()) ?? 0) > OVERDUE_DAYS; })()) {
          overdue++;
        } else if (!r.accepted_at || rs === "ongoing") {
          pending++;
        } else if (rs === "deferred" || rs === "blacklisted") {
          pending++;
        } else {
          pending++;
        }
      });
      return {
        name: `${prof.last_name}`,
        Pending: pending,
        Completed: completed,
        Overdue: overdue,
        total: pending + completed + overdue,
      };
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);
  }, [professors, allProfiles, referrals, periodStart]);

  // ── Quality / Exception Indicators (Detailed) ─────────────────────────
  const qualityIndicatorsData = useMemo(() => {
    const now = new Date();
    let reReferrals = 0, editRequests = 0, deletionRequests = 0, overdue = 0;
    const reReferralList: { chart: string; clinician: string; reason: string }[] = [];
    const editRequestList: { chart: string; clinician: string; reason: string }[] = [];
    const deletionRequestList: { chart: string; clinician: string; reason: string }[] = [];
    const overdueList: { chart: string; clinician: string; days: number }[] = [];

    createdByClinician.forEach(r => {
      const clinician = clinicians.find(c => c.id === r.user_id);
      const name = clinician ? `${clinician.first_name} ${clinician.last_name}` : "Unknown";

      if (r.rerefer_request_status === "pending" || r.rerefer_request_status === "approved") {
        reReferrals++;
        reReferralList.push({ chart: r.chart_number, clinician: name, reason: r.rerefer_request_reason || "—" });
      }
      if (r.edit_request_status === "pending") {
        editRequests++;
        editRequestList.push({ chart: r.chart_number, clinician: name, reason: r.edit_request_reason || "—" });
      }
      if (r.deletion_request_status === "pending") {
        deletionRequests++;
        deletionRequestList.push({ chart: r.chart_number, clinician: name, reason: r.deletion_request_reason || "—" });
      }
      if (r.accepted_at) {
        const sd = overdueStartDate(r);
        if (sd && new Date(sd) <= now) {
          const age = daysBetween(sd, now.toISOString());
          if (age !== null && age > OVERDUE_DAYS) {
            overdue++;
            overdueList.push({ chart: r.chart_number, clinician: name, days: age });
          }
        }
      }
    });

    const summary = [
      { name: "Re-referrals", value: reReferrals, fill: "#A855F7" },
      { name: "Edit Requests", value: editRequests, fill: "#3B82F6" },
      { name: "Deletion Requests", value: deletionRequests, fill: "#EF4444" },
      { name: "Overdue", value: overdue, fill: "#F59E0B" },
    ];
    return { summary, reReferralList, editRequestList, deletionRequestList, overdueList, total: reReferrals + editRequests + deletionRequests + overdue };
  }, [createdByClinician, clinicians]);

  // ── Available sections (derived from referrals) ────────────────────────
  const availableSections = useMemo(() => {
    const sectionSet = new Set<string>();
    referrals.forEach(r => {
      if (r.clinical_section_origin) sectionSet.add(r.clinical_section_origin);
      if (r.clinical_section_destination) sectionSet.add(r.clinical_section_destination);
    });
    return Array.from(sectionSet).sort();
  }, [referrals]);

  // ── Section volume — monthly incoming vs outgoing ─────────────────────
  const sectionVolumeData = useMemo(() => {
    const filtered = referrals.filter(r => new Date(r.created_at) >= periodStart);
    const buckets: Record<string, { incoming: number; outgoing: number }> = {};

    filtered.forEach(r => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!buckets[key]) buckets[key] = { incoming: 0, outgoing: 0 };

      const isIncoming = selectedSection === "all" || r.clinical_section_destination === selectedSection;
      const isOutgoing = selectedSection === "all" || r.clinical_section_origin === selectedSection;

      if (isIncoming) buckets[key].incoming++;
      if (isOutgoing) buckets[key].outgoing++;
    });

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, counts]) => {
        const [y, m] = month.split("-");
        const monthName = new Date(+y, +m - 1).toLocaleString("en-US", { month: "short" });
        return { month: `${monthName} '${y.slice(-2)}`, Incoming: counts.incoming, Outgoing: counts.outgoing };
      });
  }, [referrals, periodStart, selectedSection]);

  // ── Referral Treatment — Referred / Accepted / Completed per discipline ──
  const referralTreatmentData = useMemo(() => {
    const filtered = referrals.filter(r => new Date(r.created_at) >= periodStart);
    const map: Record<string, { Referred: number; Accepted: number; Ongoing: number; Completed: number }> = {};
    filtered.forEach(r => {
      const discipline = r.clinical_discipline_destination || r.clinical_discipline_origin || r.clinical_section_destination || r.clinical_section_origin;
      if (!discipline) return;
      if (!map[discipline]) map[discipline] = { Referred: 0, Accepted: 0, Ongoing: 0, Completed: 0 };
      map[discipline].Referred++;
      const rs = r.referral_status?.toLowerCase();
      if (rs && ["accepted", "ongoing", "completed", "overdue"].includes(rs)) map[discipline].Accepted++;
      if (!rs || rs === "ongoing") map[discipline].Ongoing++;
      if (rs === "completed") map[discipline].Completed++;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b.Referred - a.Referred)
      .map(([name, vals]) => ({ name, ...vals }));
  }, [referrals, periodStart]);



  const avgAcceptanceDays = useMemo(() => {
    const diffs: number[] = [];
    acceptedByClinicianAll.forEach(r => {
      const d = daysBetween(r.created_at, r.accepted_at);
      if (d !== null && d >= 0) diffs.push(d);
    });
    if (diffs.length === 0) return null;
    return +(diffs.reduce((s, v) => s + v, 0) / diffs.length).toFixed(1);
  }, [acceptedByClinicianAll]);

  // ══════════════════════════════════════════════════════════════════════

  // ── PORTED FROM Overall Analytics (professor dashboard) ───────────────

  // All chart-supporting state + useMemos. Scope: ALL clinician referrals.

  // ══════════════════════════════════════════════════════════════════════

  const AGE_BUCKETS = [
    { label: "0–12", min: 0, max: 12, color: "#14B8A6" },
    { label: "13–17", min: 13, max: 17, color: "#3B82F6" },
    { label: "18–30", min: 18, max: 30, color: "#5B8AB8" },
    { label: "31–50", min: 31, max: 50, color: "#F59E0B" },
    { label: "51–65", min: 51, max: 65, color: "#EF4444" },
    { label: "65+", min: 66, max: 999, color: "#A855F7" },
  ];

  const EXCEPTION_COLS = [
    { key: "Pending",    label: "Pending",     color: "#94A3B8" },
    { key: "Ongoing",    label: "Ongoing",     color: "#3B82F6" },
    { key: "Completed",  label: "Completed",   color: "#22C55E" },
    { key: "Overdue",    label: "Overdue",     color: "#EF4444" },
    { key: "MedAlert",   label: "Med. Alert",  color: "#F59E0B" },
    { key: "Rereferred", label: "Re-referred", color: "#A855F7" },
    { key: "Deferred",   label: "Deferred",    color: "#F97316" },
    { key: "Blacklisted",label: "Blacklisted", color: "#374151" },
  ];

  const HEATMAP_STATUSES = ["Pending", "Ongoing", "Completed", "Overdue", "Deferred", "Blacklisted", "Re-referred"] as const;

  const [adviseeSearch, setAdviseeSearch] = useState("");
  const [disciplineSearch, setDisciplineSearch] = useState("");

  const STATUS_OVER_TIME_KEYS = ["Ongoing", "Completed", "Deferred", "Blacklisted", "Re-referred"] as const;
  const STATUS_OVER_TIME_COLORS: Record<string, string> = {
    Ongoing: "#3B82F6", Completed: "#22C55E",
    Deferred: "#EF4444", Blacklisted: "#374151", "Re-referred": "#A855F7",
  };

  const [selectedService, setSelectedService] = useState<string>("__all__");

  const [serviceSearch, setServiceSearch] = useState("All Services (avg)");

  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);

  const [adviseeFilter, setAdviseeFilter] = useState("");

  const [adviseeFilterDropdownOpen, setAdviseeFilterDropdownOpen] = useState(false);


  // ── Service-Relative Turnaround (Efficiency Gap) ──────────────────────────
  const [efficiencyOutlierOnly, setEfficiencyOutlierOnly] = useState(false);

  const [statusTimeSection, setStatusTimeSection] = useState<string>("all");


  // ── Patient age group distribution ──────────────────────────────────────
  // Filterable by treatment_service_destination via a predictive searchbox.
  const [ageServiceFilter, setAgeServiceFilter] = useState<string>("__all__");

  const [ageServiceSearch, setAgeServiceSearch] = useState<string>("");

  const [ageServiceOpen, setAgeServiceOpen] = useState(false);


  // ── Patient sex per treatment service ──────────────────────────────────
  // Groups acceptedByClinician referrals by treatment_service_destination and
  // counts Male / Female / Unspecified within each service. The dropdown
  // filter (with predictive search) lets the user narrow to one specific
  // service;

  const [sexServiceFilter, setSexServiceFilter] = useState<string>("__all__");

  const [sexServiceSearch, setSexServiceSearch] = useState<string>("");

  const [sexServiceOpen, setSexServiceOpen] = useState(false);


  // ── Treatment Status per Service (Referred / Accepted / Completed) ──────
  const [txStatusFilter, setTxStatusFilter] = useState<string>("__all__");

  const [txStatusSearch, setTxStatusSearch] = useState<string>("");

  const [txStatusOpen, setTxStatusOpen] = useState(false);

  const [heatSelectedCell, setHeatSelectedCell] = useState<{ advisee: string; colKey: string } | null>(null);

  const [heatSearch, setHeatSearch] = useState("");


  // ── Performance per advisee ─ referral count by status per advisee ──────
  // Each referral lands in exactly ONE bucket (the bars represent a 100%
  // breakdown). Priority: Re-referred (rerefer_request_status === "approved")
  // takes precedence over referral_status, so an approved re-referral counts
  // as Re-referred regardless of its current status.
  const performanceData = useMemo(() => {
    const map: Record<string, { name: string; Completed: number; Ongoing: number; Deferred: number; Blacklisted: number; Pending: number; Rereferred: number; Overdue: number; MedAlert: number; total: number }> = {};
    const now = new Date();
    acceptedByClinician.forEach(r => {
      const uid = r.accepted_by_user_id || "";
      if (!uid) return;
      if (!map[uid]) {
        const adv = clinicians.find(a => a.id === uid);
        map[uid] = {
          name: adv ? `${adv.first_name} ${adv.last_name || ""}`.trim() : (r.accepted_by || "Unknown"),
          Completed: 0, Ongoing: 0, Deferred: 0, Blacklisted: 0, Pending: 0, Rereferred: 0, Overdue: 0, MedAlert: 0, total: 0,
        };
      }
      const _perfRs = r.referral_status?.toLowerCase();
      if (r.accepted_at && _perfRs !== "completed" && _perfRs !== "deferred" && _perfRs !== "blacklisted") {
        const _perfSd = overdueStartDate(r);
        if (_perfSd && new Date(_perfSd) <= new Date(now)) {
          const age = daysBetween(_perfSd, now.toISOString());
          if (age !== null && age > OVERDUE_DAYS) map[uid].Overdue++;
        }
      }
      if (r.medical_alert && r.medical_alert !== "None" && r.medical_alert !== "none") {
        map[uid].MedAlert++;
      }
      if (r.rerefer_request_status === "approved") {
        map[uid].Rereferred++;
      } else {
        const rs = r.referral_status?.toLowerCase();
        if (rs === "completed") map[uid].Completed++;
        else if (rs === "deferred") map[uid].Deferred++;
        else if (rs === "blacklisted") map[uid].Blacklisted++;
        else if (rs === "ongoing") map[uid].Ongoing++;
        else map[uid].Pending++;
      }
      map[uid].total++;
    });
    return Object.values(map).sort((a, b) => b.Completed - a.Completed);
  }, [acceptedByClinician, clinicians]);

  const heatmapData = useMemo(() => {
    const now = new Date().toISOString();
    const map: Record<string, Record<string, number>> = {};
    const ensure = (s: string) => {
      if (!map[s]) map[s] = { Pending: 0, Ongoing: 0, Completed: 0, Overdue: 0, Deferred: 0, Blacklisted: 0, "Re-referred": 0 };
    };
    acceptedByClinician.forEach(r => {
      const section = r.clinical_section_destination || "Unknown";
      ensure(section);
      if (r.rerefer_request_status === "approved") { map[section]["Re-referred"]++; return; }
      const rs = r.referral_status?.toLowerCase();
      if (rs === "completed") { map[section].Completed++; return; }
      if (rs === "deferred") { map[section].Deferred++; return; }
      if (rs === "blacklisted") { map[section].Blacklisted++; return; }
      if (!r.accepted_at) {
        map[section].Pending++;
      } else {
        const startDate = overdueStartDate(r);
        if (startDate && new Date(startDate) <= new Date(now) && (daysBetween(startDate, now) ?? 0) > OVERDUE_DAYS) {
          map[section].Overdue++;
        } else {
          map[section].Ongoing++;
        }
      }
    });
    return Object.entries(map)
      .map(([section, counts]) => {
        const total = Object.values(counts).reduce((s, v) => s + v, 0);
        return {
          section,
          total,
          cells: HEATMAP_STATUSES.map(st => ({
            status: st,
            count: counts[st],
            pct: total > 0 ? +((counts[st] / total) * 100).toFixed(0) : 0,
          })),
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [acceptedByClinician]);

  const statusOverTimeData = useMemo(() => {
    const filtered = referrals.filter(r => {
      if (new Date(r.created_at) < periodStart) return false;
      if (statusTimeSection !== "all" && r.clinical_section_destination !== statusTimeSection) return false;
      return true;
    });

    // Adaptive bucket granularity driven by the selected time-period pill.
    // 7 Days  → 7 daily buckets; N Weeks → N weekly buckets; All Time → monthly.
    type Granularity = "day" | "week" | "month";
    const cfg: { gran: Granularity; count: number } =
      timePeriod === "week"    ? { gran: "day",   count: 7  } :
      timePeriod === "5weeks"  ? { gran: "week",  count: 5  } :
      timePeriod === "10weeks" ? { gran: "week",  count: 10 } :
      timePeriod === "15weeks" ? { gran: "week",  count: 15 } :
                                 { gran: "month", count: 0  };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayMs = 24 * 60 * 60 * 1000;
    const dayKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const monthKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    // Pre-populate ordered buckets so the chart always renders the full window.
    const ordered: { key: string; label: string }[] = [];
    if (cfg.gran === "day") {
      for (let i = cfg.count - 1; i >= 0; i--) {
        const d = new Date(today.getTime() - i * dayMs);
        ordered.push({ key: dayKey(d), label: d.toLocaleString("en-US", { month: "short", day: "numeric" }) });
      }
    } else if (cfg.gran === "week") {
      for (let i = cfg.count - 1; i >= 0; i--) {
        const start = new Date(today.getTime() - ((i + 1) * 7 - 1) * dayMs);
        ordered.push({ key: `w-${i}`, label: start.toLocaleString("en-US", { month: "short", day: "numeric" }) });
      }
    } else {
      const monthSet = new Set<string>();
      filtered.forEach(r => monthSet.add(monthKey(new Date(r.created_at))));
      Array.from(monthSet).sort().forEach(key => {
        const [y, m] = key.split("-");
        ordered.push({ key, label: `${new Date(+y, +m - 1).toLocaleString("en-US", { month: "short" })} '${y.slice(-2)}` });
      });
    }

    const counts: Record<string, Record<string, number>> = {};
    ordered.forEach(b => { counts[b.key] = { Ongoing: 0, Completed: 0, Deferred: 0, Blacklisted: 0, "Re-referred": 0 }; });

    const bucketOf = (d: Date): string | null => {
      if (cfg.gran === "day")   return dayKey(d);
      if (cfg.gran === "month") return monthKey(d);
      const dayDiff = Math.floor((today.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / dayMs);
      const weekIdx = Math.floor(dayDiff / 7);
      return weekIdx >= 0 && weekIdx < cfg.count ? `w-${weekIdx}` : null;
    };

    filtered.forEach(r => {
      const key = bucketOf(new Date(r.created_at));
      if (!key || !counts[key]) return;
      if (r.rerefer_request_status === "approved") { counts[key]["Re-referred"]++; return; }
      const rs = r.referral_status?.toLowerCase();
      if (rs === "completed") counts[key].Completed++;
      else if (rs === "deferred") counts[key].Deferred++;
      else if (rs === "blacklisted") counts[key].Blacklisted++;
      else counts[key].Ongoing++;
    });

    return ordered.map(b => ({ month: b.label, ...counts[b.key] }));
  }, [referrals, periodStart, statusTimeSection, timePeriod]);

  const ageGroupData = useMemo(() => {
    const counts = AGE_BUCKETS.map(b => ({ name: b.label, value: 0, fill: b.color }));
    acceptedByClinician.forEach(r => {
      if (ageServiceFilter !== "__all__" && r.treatment_service_destination !== ageServiceFilter) return;
      const age = r.age;
      if (age == null) return;
      const idx = AGE_BUCKETS.findIndex(b => age >= b.min && age <= b.max);
      if (idx >= 0) counts[idx].value++;
    });
    return counts;
  }, [acceptedByClinician, ageServiceFilter]);


  const efficiencyGapRaw = useMemo(() => {
    const completed = acceptedByClinician.filter(
      r => r.referral_status === "completed" && r.accepted_at && r.referral_status_changed_at
    );

    // Step 1: global baseline per service
    const serviceTotals: Record<string, number[]> = {};
    completed.forEach(r => {
      const svc = r.treatment_service_destination || r.clinical_section_destination || "Unknown";
      const d = daysBetween(r.accepted_at, r.referral_status_changed_at);
      if (d === null || d < 0) return;
      if (!serviceTotals[svc]) serviceTotals[svc] = [];
      serviceTotals[svc].push(d);
    });
    const serviceBaseline: Record<string, number> = {};
    Object.entries(serviceTotals).forEach(([svc, vals]) => {
      serviceBaseline[svc] = +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1);
    });
    const serviceList = Object.keys(serviceTotals).sort();

    // Step 2: per-advisee days per service
    const adviseeServiceMap: Record<string, Record<string, number[]>> = {};
    completed.forEach(r => {
      const uid = r.accepted_by_user_id || "";
      const svc = r.treatment_service_destination || r.clinical_section_destination || "Unknown";
      const d = daysBetween(r.accepted_at, r.referral_status_changed_at);
      if (d === null || d < 0) return;
      if (!adviseeServiceMap[uid]) adviseeServiceMap[uid] = {};
      if (!adviseeServiceMap[uid][svc]) adviseeServiceMap[uid][svc] = [];
      adviseeServiceMap[uid][svc].push(d);
    });

    // Step 3: per-advisee gap per service
    const rows = Object.entries(adviseeServiceMap).map(([uid, services]) => {
      const adv = clinicians.find(a => a.id === uid);
      const name = adv ? `${adv.first_name} ${adv.last_name || ""}`.trim() : "Unknown";
      const gapByService: Record<string, number> = {};
      Object.entries(services).forEach(([svc, days]) => {
        const baseline = serviceBaseline[svc];
        if (baseline == null) return;
        const avg = days.reduce((s, v) => s + v, 0) / days.length;
        gapByService[svc] = +(avg - baseline).toFixed(1);
      });
      // Weighted overall gap
      const vals = Object.values(gapByService);
      const overallGap = vals.length > 0 ? +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : 0;
      return { name, gapByService, overallGap };
    });

    return { rows, serviceBaseline, serviceList };
  }, [acceptedByClinician, clinicians]);


  const efficiencyGapData = useMemo(() => {
    const { rows, serviceBaseline, serviceList } = efficiencyGapRaw;
    if (selectedService === "__all__") {
      return rows
        .map(r => ({ name: r.name, gap: r.overallGap }))
        .sort((a, b) => a.gap - b.gap);
    }
    return rows
      .filter(r => r.gapByService[selectedService] !== undefined)
      .map(r => ({ name: r.name, gap: r.gapByService[selectedService] }))
      .sort((a, b) => a.gap - b.gap);
  }, [efficiencyGapRaw, selectedService]);

  const ageAvailableServices = useMemo(() => {
    const set = new Set<string>();
    acceptedByClinician.forEach(r => {
      if (r.treatment_service_destination) set.add(r.treatment_service_destination);
    });
    return Array.from(set).sort();
  }, [acceptedByClinician]);

  const sexAvailableServices = useMemo(() => {
    const set = new Set<string>();
    acceptedByClinician.forEach(r => {
      if (r.treatment_service_destination) set.add(r.treatment_service_destination);
    });
    return Array.from(set).sort();
  }, [acceptedByClinician]);

  const sexPerTreatmentData = useMemo(() => {
    const map: Record<string, { Male: number; Female: number; Unspecified: number; total: number }> = {};
    acceptedByClinician.forEach(r => {
      const svc = r.treatment_service_destination || "Unspecified";
      if (sexServiceFilter !== "__all__" && svc !== sexServiceFilter) return;
      if (!map[svc]) map[svc] = { Male: 0, Female: 0, Unspecified: 0, total: 0 };
      const sex = (r.sex || "").toLowerCase();
      if (sex === "male") map[svc].Male++;
      else if (sex === "female") map[svc].Female++;
      else map[svc].Unspecified++;
      map[svc].total++;
    });
    return Object.entries(map)
      .map(([service, v]) => ({ service, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [acceptedByClinician, sexServiceFilter]);

  const txStatusAvailableServices = useMemo(() => {
    const set = new Set<string>();
    referrals.forEach(r => {
      if (r.treatment_service_destination) set.add(r.treatment_service_destination);
    });
    return Array.from(set).sort();
  }, [referrals]);

  const txStatusPerTreatmentData = useMemo(() => {
    const map: Record<string, { Referred: number; Accepted: number; Ongoing: number; Completed: number }> = {};
    const filtered = referrals.filter(r => {
      if (new Date(r.created_at) < periodStart) return false;
      return true;
    });
    filtered.forEach(r => {
      const svc = r.treatment_service_destination || "Unspecified";
      if (txStatusFilter !== "__all__" && svc !== txStatusFilter) return;
      if (!map[svc]) map[svc] = { Referred: 0, Accepted: 0, Ongoing: 0, Completed: 0 };
      // Every referral counts as "Referred"
      map[svc].Referred++;
      // If it has been accepted (accepted_at exists), count as Accepted
      if (r.accepted_at) map[svc].Accepted++;
      // If ongoing
      const rs = r.referral_status?.toLowerCase();
      if (!rs || rs === "ongoing") { if (r.accepted_at) map[svc].Ongoing++; }
      // If it is completed, count as Completed
      if (rs === "completed") map[svc].Completed++;
    });
    return Object.entries(map)
      .map(([service, v]) => ({ service, ...v }))
      .sort((a, b) => b.Referred - a.Referred);
  }, [referrals, periodStart, txStatusFilter]);


  const exceptionHeatmap = useMemo(() => {
    const now = new Date().toISOString();
    type Row = {
      name: string;
      Pending: number; Ongoing: number; Completed: number;
      Overdue: number; MedAlert: number; Rereferred: number;
      Deferred: number; Blacklisted: number;
      total: number;
      details: Record<string, { chart: string; detail: string }[]>;
    };
    const map: Record<string, Row> = {};

    acceptedByClinician.forEach(r => {
      const uid = r.accepted_by_user_id || "unknown";
      const adv = clinicians.find(a => a.id === uid);
      const name = adv ? `${adv.first_name} ${adv.last_name || ""}`.trim() : (r.accepted_by || "Unknown");
      if (!map[uid]) map[uid] = {
        name,
        Pending: 0, Ongoing: 0, Completed: 0,
        Overdue: 0, MedAlert: 0, Rereferred: 0, Deferred: 0, Blacklisted: 0,
        total: 0,
        details: { Pending: [], Ongoing: [], Completed: [], Overdue: [], MedAlert: [], Rereferred: [], Deferred: [], Blacklisted: [] },
      };
      const e = map[uid];
      const rs = r.referral_status?.toLowerCase();

      // Status columns (mutually exclusive for a given referral)
      if (rs === "completed") {
        e.Completed++; e.total++; e.details.Completed.push({ chart: r.chart_number, detail: "Completed" });
      } else if (rs === "deferred") {
        e.Deferred++; e.total++; e.details.Deferred.push({ chart: r.chart_number, detail: "Deferred" });
      } else if (rs === "blacklisted") {
        e.Blacklisted++; e.total++; e.details.Blacklisted.push({ chart: r.chart_number, detail: "Blacklisted" });
      } else if (!r.accepted_at) {
        e.Pending++; e.total++; e.details.Pending.push({ chart: r.chart_number, detail: "Awaiting acceptance" });
      } else {
        // ongoing / null → in-progress
        e.Ongoing++; e.total++; e.details.Ongoing.push({ chart: r.chart_number, detail: "In progress" });
      }

      // Exception/alert columns (additive — can overlap with status columns)
      // Overdue = accepted, has appointment, appointment passed, >7 days since appointment
      if (r.accepted_at && rs !== "completed") {
        const startDate = overdueStartDate(r);
        if (startDate && new Date(startDate) <= new Date(now)) {
          const age = daysBetween(startDate, now);
          if (age !== null && age > OVERDUE_DAYS) { e.Overdue++; e.total++; e.details.Overdue.push({ chart: r.chart_number, detail: `${age}d overdue` }); }
        }
      }
      if (r.medical_alert && r.medical_alert !== "None" && r.medical_alert !== "none") { e.MedAlert++; e.total++; e.details.MedAlert.push({ chart: r.chart_number, detail: r.medical_alert }); }
      if (r.rerefer_request_status === "approved") { e.Rereferred++; e.total++; e.details.Rereferred.push({ chart: r.chart_number, detail: "Re-referred" }); }
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [acceptedByClinician, clinicians]);

  // ── Stat card detail modal ────────────────────────────────────────────────
  const availableCount = useMemo(
    () => createdByClinician.filter(r => r.accepted_by === "None" || !r.accepted_at).length,
    [createdByClinician]
  );
  const ongoingCount = useMemo(() => {
    const now = new Date().toISOString();
    return acceptedByClinician.filter(r => {
      const rs = r.referral_status?.toLowerCase();
      if (!rs && !r.accepted_at) return false;
      if (rs && rs !== "ongoing") return false;
      const startDate = overdueStartDate(r);
      if (startDate && new Date(startDate) <= new Date() && (daysBetween(startDate, now) ?? 0) > OVERDUE_DAYS) return false;
      return true;
    }).length;
  }, [acceptedByClinician]);
  const deferredCount = useMemo(
    () => acceptedByClinician.filter(r => r.referral_status === "deferred").length,
    [acceptedByClinician]
  );
  const blacklistedCount = useMemo(
    () => acceptedByClinician.filter(r => r.referral_status === "blacklisted").length,
    [acceptedByClinician]
  );
  const rereferredCount = useMemo(
    () => acceptedByClinician.filter(r => r.rerefer_request_status === "approved" || r.rerefer_request_status === "completed").length,
    [acceptedByClinician]
  );
  const acceptedCount = useMemo(
    () => acceptedByClinician.filter(r => r.accepted_by !== "None" && r.accepted_at).length,
    [acceptedByClinician]
  );
  const recentlyCreatedCount = useMemo(
    () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return createdByClinician.filter(r => new Date(r.created_at) >= sevenDaysAgo).length;
    },
    [createdByClinician]
  );

  const [statModal, setStatModal] = useState<StatModalType>(null);

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "—";
  const profileMap = useMemo(() => {
    const m = new Map<string, string>();
    allProfiles.forEach(p => m.set(p.id, `${p.first_name} ${p.last_name}`));
    return m;
  }, [allProfiles]);
  const findName = (id: string | null) => {
    if (!id) return "—";
    return profileMap.get(id) ?? "—";
  };
  const nowStr = new Date().toISOString();

  const statModalRows = useMemo(() => {
    switch (statModal) {
      case "total":
        return createdByClinicianAll.map(r => ({
          chart: r.chart_number,
          clinician: findName(r.user_id),
          origin: r.clinical_section_origin,
          destination: r.clinical_section_destination,
          status: !r.accepted_at ? "pending" : (r.referral_status || "ongoing"),
          created: fmtDate(r.created_at),
          age: daysBetween(r.created_at, nowStr),
        }));
      case "completed":
        return acceptedByClinicianAll
          .filter(r => r.referral_status === "completed")
          .map(r => ({
            chart: r.chart_number,
            clinician: findName(r.user_id),
            acceptedBy: findName(r.accepted_by_user_id),
            origin: r.clinical_section_origin,
            destination: r.clinical_section_destination,
            created: fmtDate(r.created_at),
            completedAt: fmtDate(r.referral_status_changed_at),
            daysToComplete: daysBetween(r.created_at, r.referral_status_changed_at),
          }));
      case "overdue":
        return createdByClinicianAll
          .filter(r => {
            if (!r.accepted_at) return false;
            if (r.referral_status && r.referral_status !== "ongoing") return false;
            const startDate = overdueStartDate(r);
            if (!startDate) return false;
            if (new Date(startDate) > new Date()) return false;
            const age = daysBetween(startDate, nowStr);
            return age !== null && age > OVERDUE_DAYS;
          })
          .map(r => ({
            chart: r.chart_number,
            clinician: findName(r.user_id),
            origin: r.clinical_section_origin,
            destination: r.clinical_section_destination,
            created: fmtDate(r.created_at),
            daysOverdue: daysBetween(overdueStartDate(r), nowStr),
            status: r.referral_status || "ongoing",
          }))
          .sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0));
      case "recentlyCreated": {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return createdByClinicianAll
          .filter(r => new Date(r.created_at) >= sevenDaysAgo)
          .map(r => ({
            chart: r.chart_number,
            clinician: findName(r.user_id),
            origin: r.clinical_section_origin,
            destination: r.clinical_section_destination,
            status: !r.accepted_at ? "pending" : (r.referral_status || "ongoing"),
            created: fmtDate(r.created_at),
            age: daysBetween(r.created_at, nowStr),
          }))
          .sort((a, b) => (b.age || 0) - (a.age || 0));
      }
      case "accepted":
        return acceptedByClinicianAll
          .filter(r => r.accepted_at)
          .map(r => ({
            chart: r.chart_number,
            clinician: findName(r.user_id),
            acceptedBy: findName(r.accepted_by_user_id),
            origin: r.clinical_section_origin,
            destination: r.clinical_section_destination,
            created: fmtDate(r.created_at),
            accepted: fmtDate(r.accepted_at),
            daysToAccept: daysBetween(r.created_at, r.accepted_at),
          }))
          .sort((a, b) => (b.daysToAccept || 0) - (a.daysToAccept || 0));
      case "avgAcceptance":
        return acceptedByClinicianAll
          .filter(r => r.accepted_at)
          .map(r => ({
            chart: r.chart_number,
            clinician: findName(r.user_id),
            acceptedBy: findName(r.accepted_by_user_id),
            origin: r.clinical_section_origin,
            created: fmtDate(r.created_at),
            accepted: fmtDate(r.accepted_at),
            daysToAccept: daysBetween(r.created_at, r.accepted_at),
          }))
          .sort((a, b) => (b.daysToAccept || 0) - (a.daysToAccept || 0));
      case "available":
        return createdByClinicianAll
          .filter(r => r.accepted_by === "None" || !r.accepted_at)
          .map(r => ({
            chart: r.chart_number,
            clinician: findName(r.user_id),
            origin: r.clinical_section_origin,
            destination: r.clinical_section_destination,
            created: fmtDate(r.created_at),
            age: daysBetween(r.created_at, nowStr),
          }))
          .sort((a, b) => (b.age || 0) - (a.age || 0));
      case "ongoing":
        return createdByClinicianAll
          .filter(r => {
            if (r.accepted_by === "None" || !r.accepted_at) return false;
            const rs = r.referral_status?.toLowerCase();
            return !rs || rs === "ongoing";
          })
          .map(r => ({
            chart: r.chart_number,
            clinician: findName(r.user_id),
            acceptedBy: findName(r.accepted_by_user_id),
            origin: r.clinical_section_origin,
            destination: r.clinical_section_destination,
            created: fmtDate(r.created_at),
            accepted: fmtDate(r.accepted_at),
          }));
      case "deferred":
        return createdByClinicianAll
          .filter(r => r.referral_status === "deferred")
          .map(r => ({
            chart: r.chart_number,
            clinician: findName(r.user_id),
            acceptedBy: findName(r.accepted_by_user_id),
            origin: r.clinical_section_origin,
            destination: r.clinical_section_destination,
            created: fmtDate(r.created_at),
            deferredAt: fmtDate(r.referral_status_changed_at),
          }));
      case "blacklisted":
        return createdByClinicianAll
          .filter(r => r.referral_status === "blacklisted")
          .map(r => ({
            chart: r.chart_number,
            clinician: findName(r.user_id),
            acceptedBy: findName(r.accepted_by_user_id),
            origin: r.clinical_section_origin,
            destination: r.clinical_section_destination,
            created: fmtDate(r.created_at),
            blacklistedAt: fmtDate(r.referral_status_changed_at),
          }));
      case "avgCompletion":
        return createdByClinicianAll
          .filter(r => r.referral_status === "completed" && r.accepted_at && r.referral_status_changed_at)
          .map(r => ({
            chart: r.chart_number,
            clinician: findName(r.user_id),
            acceptedBy: findName(r.accepted_by_user_id),
            origin: r.clinical_section_origin,
            destination: r.clinical_section_destination,
            accepted: fmtDate(r.accepted_at),
            completedAt: fmtDate(r.referral_status_changed_at),
            daysToComplete: daysBetween(r.accepted_at, r.referral_status_changed_at),
          }))
          .sort((a, b) => (b.daysToComplete || 0) - (a.daysToComplete || 0));
      case "rereferred":
        return createdByClinicianAll
          .filter(r => r.rerefer_request_status === "approved" || r.rerefer_request_status === "completed")
          .map(r => ({
            chart: r.chart_number,
            clinician: findName(r.user_id),
            acceptedBy: findName(r.accepted_by_user_id),
            origin: r.clinical_section_origin,
            destination: r.clinical_section_destination,
            created: fmtDate(r.created_at),
          }));
      default:
        return [];
    }
  }, [statModal, createdByClinicianAll, acceptedByClinicianAll, allProfiles]);

  const statModalConfig: Record<NonNullable<StatModalType>, { title: string; accent: string }> = {
    total:         { title: "Total Referrals — All Clinicians",  accent: "#5B8AB8" },
    recentlyCreated: { title: "Recently Created Referrals (Last 7 days)", accent: "#10B981" },
    accepted:      { title: "Accepted Referrals",                accent: "#0EA5E9" },
    completed:     { title: "Completed Referrals",               accent: "#2D7A4F" },
    overdue:       { title: "Overdue Referrals",                 accent: "#EF4444" },
    avgAcceptance: { title: "Acceptance Time — All Accepted",    accent: "#3B82F6" },
    available:     { title: "Available Referrals",               accent: "#F59E0B" },
    ongoing:       { title: "Ongoing Referrals",                  accent: "#3B82F6" },
    deferred:      { title: "Deferred Referrals",                accent: "#F97316" },
    blacklisted:   { title: "Blacklisted Referrals",             accent: "#374151" },
    avgCompletion: { title: "Avg. Completion Days — Completed Referrals", accent: "#059669" },
    rereferred:    { title: "Re-referred Referrals",             accent: "#A855F7" },
  };

  // ── Export handlers ─────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    const toastId = toast.loading("Generating Excel file — capturing charts, please wait…");
    try {
    const periodLabel = PERIOD_LABELS[timePeriod];
    const allRows = createdByClinician.map(r => ({
      chart: r.chart_number,
      clinician: findName(r.user_id),
      origin: r.clinical_section_origin,
      destination: r.clinical_section_destination,
      status: !r.accepted_at ? "pending" : (r.referral_status || "ongoing"),
      created: r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
      accepted: r.accepted_at ? new Date(r.accepted_at).toLocaleDateString() : "—",
      acceptedBy: findName(r.accepted_by_user_id),
      daysToAccept: daysBetween(r.created_at, r.accepted_at),
      daysSinceCreated: daysBetween(r.created_at, nowStr),
    }));

    const completedRows = acceptedByClinician
      .filter(r => r.referral_status === "completed")
      .map(r => ({
        chart: r.chart_number,
        clinician: findName(r.user_id),
        acceptedBy: findName(r.accepted_by_user_id),
        origin: r.clinical_section_origin,
        destination: r.clinical_section_destination,
        created: r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
        completed: r.referral_status_changed_at ? new Date(r.referral_status_changed_at).toLocaleDateString() : "—",
        daysToComplete: daysBetween(r.created_at, r.referral_status_changed_at),
      }));

    const overdueRows = createdByClinician
      .filter(r => {
        if (!r.accepted_at) return false;
        if (r.referral_status && r.referral_status !== "ongoing") return false;
        const startDate = overdueStartDate(r);
        if (!startDate) return false;
        if (new Date(startDate) > new Date()) return false;
        const age = daysBetween(startDate, nowStr);
        return age !== null && age > OVERDUE_DAYS;
      })
      .map(r => ({
        chart: r.chart_number,
        clinician: findName(r.user_id),
        origin: r.clinical_section_origin,
        destination: r.clinical_section_destination,
        created: r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
        daysOverdue: daysBetween(overdueStartDate(r), nowStr),
        status: r.referral_status || "ongoing",
      }));

    const slaRows = slaData.map(d => [d.month, d.compliance, d.compliant, d.total]);

    const { exportToExcel } = await lazyExport();
    await exportToExcel([
      {
        name: "All Referrals",
        headers: ["Chart #", "Clinician", "Origin", "Destination", "Status", "Created", "Accepted", "Accepted By", "Days to Accept", "Days Since"],
        rows: allRows.map(r => [r.chart, r.clinician, r.origin, r.destination, r.status, r.created, r.accepted, r.acceptedBy, r.daysToAccept, r.daysSinceCreated]),
      },
      {
        name: "Completed",
        headers: ["Chart #", "Created By", "Accepted By", "Origin", "Destination", "Created", "Completed", "Days"],
        rows: completedRows.map(r => [r.chart, r.clinician, r.acceptedBy, r.origin, r.destination, r.created, r.completed, r.daysToComplete]),
      },
      {
        name: "Overdue",
        headers: ["Chart #", "Clinician", "Origin", "Destination", "Created", "Days Overdue", "Status"],
        rows: overdueRows.map(r => [r.chart, r.clinician, r.origin, r.destination, r.created, r.daysOverdue, r.status]),
      },
      // ── Stat-card sheets ─────────────────────────────────────────────
      {
        name: "Recently Created",
        headers: ["Chart #", "Clinician", "Origin", "Destination", "Status", "Created", "Days Since"],
        rows: (() => {
          const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return createdByClinician
            .filter(r => new Date(r.created_at) >= sevenDaysAgo)
            .map(r => [
              r.chart_number,
              findName(r.user_id),
              r.clinical_section_origin,
              r.clinical_section_destination,
              !r.accepted_at ? "pending" : (r.referral_status || "ongoing"),
              r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
              daysBetween(r.created_at, nowStr),
            ]);
        })(),
      },
      {
        name: "Accepted",
        headers: ["Chart #", "Created By", "Accepted By", "Origin", "Destination", "Created", "Accepted", "Days to Accept"],
        rows: acceptedByClinician
          .filter(r => r.accepted_at)
          .map(r => [
            r.chart_number,
            findName(r.user_id),
            findName(r.accepted_by_user_id),
            r.clinical_section_origin,
            r.clinical_section_destination,
            r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
            r.accepted_at ? new Date(r.accepted_at).toLocaleDateString() : "—",
            daysBetween(r.created_at, r.accepted_at),
          ]),
      },
      {
        name: "Available",
        headers: ["Chart #", "Clinician", "Origin", "Destination", "Created", "Age (days)"],
        rows: createdByClinician
          .filter(r => r.accepted_by === "None" || !r.accepted_at)
          .map(r => [
            r.chart_number,
            findName(r.user_id),
            r.clinical_section_origin,
            r.clinical_section_destination,
            r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
            daysBetween(r.created_at, nowStr),
          ]),
      },
      {
        name: "Ongoing",
        headers: ["Chart #", "Clinician", "Accepted By", "Origin", "Destination", "Created", "Accepted"],
        rows: createdByClinician
          .filter(r => {
            if (r.accepted_by === "None" || !r.accepted_at) return false;
            const rs = r.referral_status?.toLowerCase();
            return !rs || rs === "ongoing";
          })
          .map(r => [
            r.chart_number,
            findName(r.user_id),
            findName(r.accepted_by_user_id),
            r.clinical_section_origin,
            r.clinical_section_destination,
            r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
            r.accepted_at ? new Date(r.accepted_at).toLocaleDateString() : "—",
          ]),
      },
      {
        name: "Deferred",
        headers: ["Chart #", "Clinician", "Accepted By", "Origin", "Destination", "Created", "Deferred At"],
        rows: createdByClinician
          .filter(r => r.referral_status === "deferred")
          .map(r => [
            r.chart_number,
            findName(r.user_id),
            findName(r.accepted_by_user_id),
            r.clinical_section_origin,
            r.clinical_section_destination,
            r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
            r.referral_status_changed_at ? new Date(r.referral_status_changed_at).toLocaleDateString() : "—",
          ]),
      },
      {
        name: "Blacklisted",
        headers: ["Chart #", "Clinician", "Accepted By", "Origin", "Destination", "Created", "Blacklisted At"],
        rows: createdByClinician
          .filter(r => r.referral_status === "blacklisted")
          .map(r => [
            r.chart_number,
            findName(r.user_id),
            findName(r.accepted_by_user_id),
            r.clinical_section_origin,
            r.clinical_section_destination,
            r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
            r.referral_status_changed_at ? new Date(r.referral_status_changed_at).toLocaleDateString() : "—",
          ]),
      },
      {
        name: "Re-referred",
        headers: ["Chart #", "Clinician", "Accepted By", "Origin", "Destination", "Created"],
        rows: createdByClinician
          .filter(r => r.rerefer_request_status === "approved" || r.rerefer_request_status === "completed")
          .map(r => [
            r.chart_number,
            findName(r.user_id),
            findName(r.accepted_by_user_id),
            r.clinical_section_origin,
            r.clinical_section_destination,
            r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
          ]),
      },
      {
        name: "SLA Compliance",
        headers: ["Month", "Compliance %", "Compliant", "Total"],
        rows: slaRows,
      },
    ], `CURA_Clinical_Admin_${periodLabel}_${new Date().toISOString().slice(0, 10)}`, [
      // ── Row 1 ────────────────────────────────────────────────────────────
      {
        id: "chart-perf-advisee", title: "Performance per Clinician",
        headers: ["Clinician", "Completed", "Ongoing", "Pending", "Deferred", "Blacklisted", "Re-referred", "Total"],
        rows: performanceData.map((d: any) => [d.name, d.Completed, d.Ongoing, d.Pending, d.Deferred, d.Blacklisted, d.Rereferred, d.total]),
      },
      {
        id: "chart-efficiency-gap", title: "Efficiency Gap",
        headers: ["Clinician", "Gap (days)"],
        rows: efficiencyGapData.map((d: any) => [d.name, d.gap]),
      },
      // ── Row 1.5 ──────────────────────────────────────────────────────────
      {
        id: "chart-net-flow", title: "Section Referral Activity",
        headers: ["Section", "Incoming", "Outgoing", "Net"],
        rows: netFlowData.map((d: any) => [d.section, d.incoming, Math.abs(d.outgoing), d.net]),
      },
      {
        id: "chart-top-dest", title: "Referral Treatment",
        headers: ["Section", "Referred", "Accepted", "Completed"],
        rows: referralTreatmentData.map((d: any) => [d.name, d.Referred, d.Accepted, d.Completed]),
      },
      // ── Row 2 ────────────────────────────────────────────────────────────
      {
        id: "chart-referral-heatmap", title: "Referral Heatmap",
        headers: [
          "Section", "Total",
          ...HEATMAP_STATUSES.flatMap(s => [s, `${s} %`]),
        ],
        rows: heatmapData.map((d: any) => [
          d.section, d.total,
          ...d.cells.flatMap((c: any) => [c.count, `${c.pct}%`]),
        ]),
      },
      {
        id: "chart-status-time", title: "Referral Status Over Time",
        headers: ["Month", ...STATUS_OVER_TIME_KEYS],
        rows: statusOverTimeData.map((d: any) => [d.month, ...STATUS_OVER_TIME_KEYS.map(k => d[k] ?? 0)]),
      },
      // ── Row 4 ────────────────────────────────────────────────────────────
      {
        id: "chart-age", title: "Patient Age Groups per Treatment",
        headers: ["Age Group", "Count"],
        rows: ageGroupData.map((d: any) => [d.name, d.value]),
      },
      {
        id: "chart-sex-treatment", title: "Patient Sex Groups per Treatment",
        headers: ["Service", "Male", "Female", "Unspecified", "Total"],
        rows: sexPerTreatmentData.map((d: any) => [d.service, d.Male, d.Female, d.Unspecified, d.total]),
      },
      {
        id: "chart-tx-status", title: "Referral Status per Treatment",
        headers: ["Service", "Referred", "Accepted", "Completed"],
        rows: txStatusPerTreatmentData.map((d: any) => [d.service, d.Referred, d.Accepted, d.Completed]),
      },
      // ── Row 5 ────────────────────────────────────────────────────────────
      {
        id: "chart-exceptions", title: "Referral Status Summary",
        headers: ["Clinician", "Pending", "Ongoing", "Completed", "Overdue", "Med. Alert", "Re-referred", "Deferred", "Blacklisted", "Total"],
        rows: exceptionHeatmap.map((r: any) => [r.name, r.Pending, r.Ongoing, r.Completed, r.Overdue, r.MedAlert, r.Rereferred, r.Deferred, r.Blacklisted, r.total]),
      },
    ]);
    toast.success("Excel file downloaded successfully!", { id: toastId });
    sendSystemNotification("📄 Excel Export Complete", "Your analytics dashboard has been exported to Excel.");
    } catch (err) {
      toast.error("Failed to generate Excel file. Please try again.", { id: toastId });
    } finally { setExporting(false); }
  };


  return (
    <RouteGuard allowedRoles={["clinical_admin"]}>
      <div className="min-h-screen flex flex-col relative">
        {/* Background */}
        <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url(/bg-homepage.png)" }} />
        <div className="fixed inset-0 z-0 bg-white/60" />

        <div className="relative z-10 min-h-screen flex flex-col">
          <Header />

          <main id="dashboard-content" className="flex-1 max-w-7xl mx-auto w-full p-6">

            {loading && (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <svg className="h-10 w-10 animate-spin text-[#1B3A5C]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm font-medium text-[#1B3A5C]/60">Loading analytics data…</p>
              </div>
            )}

            {!loading && <>
            {/* ── Header Bar ──────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-6 animate-enter">
              <div className="flex items-center gap-3">
                <Link
                  href="/clinical-admin"
                  className="p-2 rounded-lg border-2 border-[#87c4d8]/40 bg-white hover:bg-secondary hover:text-white hover:border-secondary text-secondary transition-all shadow-sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <div>
                  <h1 className="text-lg font-bold text-secondary uppercase tracking-wide">Clinical Analytics</h1>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Referral performance across all clinicians</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* Unified time filter: preset pills + custom date range */}
                <div className="flex items-center gap-0 bg-white rounded-lg border-2 border-[#87c4d8]/30 p-1 shadow-sm">
                  {(["week", "5weeks", "10weeks", "15weeks", "all"] as TimePeriod[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setTimePeriod(p)}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-all ${
                        timePeriod === p
                          ? "bg-secondary text-white shadow"
                          : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      }`}
                    >
                      {PERIOD_LABELS[p]}
                    </button>
                  ))}

                  {/* Divider */}
                  <div className="w-px h-5 bg-[#87c4d8]/40 mx-1.5 flex-shrink-0" />

                  {/* Date range inputs */}
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${customRange ? "bg-secondary/10" : ""}`}>
                    <CalendarIcon className={`h-3 w-3 flex-shrink-0 ${customRange ? "text-secondary" : "text-gray-400"}`} />
                    <input
                      type="date"
                      value={customRange?.start || ""}
                      onChange={e => setCustomRange(prev => ({ start: e.target.value, end: prev?.end || "" }))}
                      className={`text-[10px] font-bold uppercase tracking-wide bg-transparent outline-none w-[88px] ${customRange?.start ? "text-secondary" : "text-gray-400"}`}
                      title="Range start"
                    />
                    <span className="text-gray-300 text-[10px] font-bold">–</span>
                    <input
                      type="date"
                      value={customRange?.end || ""}
                      onChange={e => setCustomRange(prev => ({ start: prev?.start || "", end: e.target.value }))}
                      className={`text-[10px] font-bold uppercase tracking-wide bg-transparent outline-none w-[88px] ${customRange?.end ? "text-secondary" : "text-gray-400"}`}
                      title="Range end"
                    />
                    {customRange && (customRange.start || customRange.end) && (
                      <button
                        onClick={() => setCustomRange(null)}
                        className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-secondary transition-colors ml-0.5"
                        title="Clear custom range"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Export button */}
                <button
                  onClick={handleExportExcel}
                  disabled={exporting}
                  className={`p-2 rounded-lg border-2 border-[#87c4d8]/30 bg-white transition-all shadow-sm ${exporting ? 'opacity-50 cursor-wait' : 'hover:bg-green-50 hover:border-green-300 text-gray-400 hover:text-green-600'}`}
                  title={exporting ? "Generating Excel…" : "Export to Excel"}
                >
                  {exporting ? (
                    <svg className="h-4 w-4 animate-spin text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* ── Scope Banner ──────────────────────────────────────── */}
            <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-lg bg-[#87c4d8]/10 border border-[#87c4d8]/25 animate-enter-delay-1">
              <Users className="h-3.5 w-3.5 text-[#87c4d8]" />
              <p className="text-[11px] text-secondary font-medium">
                Showing data for <span className="font-bold">{loading ? "…" : clinicians.length} clinician(s)</span> across all sections.
                All metrics below reflect college-wide referral activity.
              </p>
            </div>

            {/* ── Summary Cards ────────────────────────────────────── */}
            {/* Referral Statistics Section */}
            {(() => {
              const pct = (n: number) => totalRefs > 0 ? ((n / totalRefs) * 100).toFixed(1) : "0";
              const pctAcc = (n: number) => acceptedCount > 0 ? ((n / acceptedCount) * 100).toFixed(1) : "0";
              return (
            <div className="mb-2">
              <h3 className="text-xs font-bold text-secondary uppercase tracking-wide mb-3 px-1">Referral Statistics</h3>
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-4 animate-enter-delay-2">
                {/* Row 1 */}
                <StatCard icon={FileText}       label="Total Referrals"  value={loading ? "…" : String(totalRefs)}                                          sub="All clinicians' referrals"                                                                                            color="#5B8AB8" onClick={() => setStatModal("total")} />
                <StatCard icon={FilePlus}       label="Recently Created" value={loading ? "…" : String(recentlyCreatedCount)}                                 sub={loading ? "Last 7 days" : `${((recentlyCreatedCount / totalRefs) * 100).toFixed(1)}% of total`}                 color="#10B981" onClick={() => setStatModal("recentlyCreated")} />
                <StatCard icon={UserCheck}      label="Accepted"         value={loading ? "…" : String(acceptedCount)}                                    sub={loading ? "Accepted referrals" : `${((acceptedCount / totalRefs) * 100).toFixed(1)}% acceptance rate`}               color="#0EA5E9" onClick={() => setStatModal("accepted")} />
                <StatCard icon={TrendingUp}     label="Completed"        value={loading ? "…" : String(completedCount)}                                     sub={loading ? "Completion rate" : `${completionRate}% completion rate`}             color="#2D7A4F" onClick={() => setStatModal("completed")} />
                <StatCard icon={Hourglass}      label="Available"        value={loading ? "…" : String(availableCount)}                                     sub={loading ? "Awaiting acceptance" : `${pct(availableCount)}% available rate`}    color="#F59E0B" onClick={() => setStatModal("available")} />
                <StatCard icon={Repeat}         label="Re-referred"      value={loading ? "…" : String(rereferredCount)}                                     sub={loading ? "Re-referred referrals" : `${pctAcc(rereferredCount)}% re-referral rate`} color="#A855F7" onClick={() => setStatModal("rereferred")} />
                {/* Row 2 */}
                <StatCard icon={AlertTriangle}  label="Overdue"          value={loading ? "…" : String(overdueCount)}                                       sub={loading ? `Pending > ${OVERDUE_DAYS} days` : `${pctAcc(overdueCount)}% overdue rate`}  color="#EF4444" onClick={() => setStatModal("overdue")} />
                <StatCard icon={Activity}       label="Ongoing"          value={loading ? "…" : String(ongoingCount)}                                        sub={loading ? "Currently in progress" : `${pctAcc(ongoingCount)}% ongoing rate`}       color="#3B82F6" onClick={() => setStatModal("ongoing")} />
                <StatCard icon={Pause}          label="Deferred"         value={loading ? "…" : String(deferredCount)}                                      sub={loading ? "Deferred referrals" : `${pctAcc(deferredCount)}% deferral rate`}         color="#F97316" onClick={() => setStatModal("deferred")} />
                <StatCard icon={Ban}            label="Blacklisted"      value={loading ? "…" : String(blacklistedCount)}                                   sub={loading ? "Blacklisted referrals" : `${pctAcc(blacklistedCount)}% blacklist rate`}   color="#374151" onClick={() => setStatModal("blacklisted")} />
                <StatCard icon={Clock}          label="Avg. Acceptance"  value={loading ? "…" : (avgAcceptanceDays !== null ? `${avgAcceptanceDays}d` : "—")} sub="Created → Accepted"                                                           color="#3B82F6" />
                <StatCard icon={TrendingUp}     label="Avg. Completion"  value={loading ? "…" : (avgCompletionDays !== null ? `${avgCompletionDays}d` : "—")} sub="Accepted → Completed"                                                         color="#059669" />
              </div>
            </div>
              );
            })()}

            {/* Event Statistics Section */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-secondary uppercase tracking-wide mb-3 px-1">Event Statistics</h3>
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 animate-enter-delay-2">
                <StatCard icon={CalendarIcon}     label="Total Events"   value={loading ? "…" : String(allEvents.filter(e => e.source === "referral" || e.title?.startsWith("Referral Appointment")).length)}                                                    sub="Referral-linked events"                                                                                 color="#5B8AB8" />
                <StatCard icon={CalendarIcon}     label="Scheduled"      value={loading ? "…" : String(allEvents.filter(e => (e.status === "scheduled" || !e.status) && (e.source === "referral" || e.title?.startsWith("Referral Appointment"))).length)}                    sub="Scheduled events"                                                                          color="#3B82F6" />
                <StatCard icon={CheckCircle}    label="Treatment Rendered" value={loading ? "…" : String(allEvents.filter(e => e.status === "treatment_rendered" && (e.source === "referral" || e.title?.startsWith("Referral Appointment"))).length)}                 sub="Completed treatments"                                                                      color="#22C55E" />
                <StatCard icon={X}              label="Canceled"       value={loading ? "…" : String(allEvents.filter(e => e.status === "canceled" && (e.source === "referral" || e.title?.startsWith("Referral Appointment"))).length)}                       sub="Canceled appointments"                                                                     color="#EF4444" />
                <StatCard icon={RefreshCw}      label="Rescheduled"    value={loading ? "…" : String(allEvents.filter(e => e.status === "rescheduled" && (e.source === "referral" || e.title?.startsWith("Referral Appointment"))).length)}                    sub="Rescheduled appointments"                                                                  color="#F59E0B" />
                <StatCard icon={AlertTriangle}  label="No Show"        value={loading ? "…" : String(allEvents.filter(e => e.status === "no_show" && (e.source === "referral" || e.title?.startsWith("Referral Appointment"))).length)}                       sub="Missed appointments"                                                                        color="#6B7280" />
              </div>
            </div>

            {/* ── Divider between stat cards and charts ── */}
            <div className="h-px bg-secondary/20 mb-4" />


            {/* ── Row 1: Performance per Clinician (1/2) + Efficiency Gap (1/2) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 animate-enter-delay-3">
              <ChartCard id="chart-perf-advisee" title="Performance per Clinician">
                {performanceData.length > 0 ? (
                  <div className="flex flex-col h-[320px]">
                    {/* Search box */}
                    <div className="relative mb-2 px-1">
                      <input
                        type="text"
                        value={adviseeSearch}
                        onChange={e => setAdviseeSearch(e.target.value)}
                        placeholder="All Clinicians"
                        className="w-full text-[11px] rounded-md border border-[#87c4d8]/40 bg-[#87c4d8]/[0.06] px-2.5 py-1.5 pr-6 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#5B8AB8]/60 focus:ring-1 focus:ring-[#5B8AB8]/20 transition-all"
                      />
                      {adviseeSearch ? (
                        <button
                          onClick={() => setAdviseeSearch("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[10px] leading-none"
                        >✕</button>
                      ) : (
                        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#87c4d8]" size={12} strokeWidth={2.5} />
                      )}
                      {/* Predictive dropdown */}
                      {adviseeSearch.trim() && (() => {
                        const q = adviseeSearch.trim().toLowerCase();
                        const suggestions = performanceData.filter(d => d.name.toLowerCase().includes(q) && d.name.toLowerCase() !== q);
                        return suggestions.length > 0 ? (
                          <div className="absolute z-20 left-1 right-1 top-full mt-0.5 bg-white border border-[#87c4d8]/30 rounded-md shadow-lg overflow-hidden">
                            {suggestions.slice(0, 5).map((s, i) => (
                              <button
                                key={i}
                                onClick={() => setAdviseeSearch(s.name)}
                                className="w-full text-left px-3 py-1.5 text-[11px] text-gray-700 hover:bg-[#87c4d8]/10 transition-colors"
                              >
                                {s.name}
                              </button>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2 px-1">
                      {(["Completed", "Ongoing", "Overdue", "Deferred", "Blacklisted", "Re-referred"] as const).map(s => (
                        <div key={s} className="flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[s] }} />
                          <span className="text-[9px] text-gray-500 font-medium">{s === "MedAlert" ? "Med Alert" : s}</span>
                        </div>
                      ))}
                    </div>
                    {/* Chart */}
                    <div className="flex-1 min-h-0 overflow-y-auto">
                      {(() => {
                        const filtered = adviseeSearch.trim()
                          ? performanceData.filter(d => d.name.toLowerCase().includes(adviseeSearch.trim().toLowerCase()))
                          : performanceData;
                        return filtered.length > 0 ? (
                          <ResponsiveContainer width="100%" height={Math.max(200, filtered.length * 36)}>
                            <BarChart data={filtered} layout="vertical" barSize={18} margin={{ left: 4, right: 16, top: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                              <XAxis
                                type="number"
                                tick={{ fontSize: 10, fill: "#9ca3af" }}
                                axisLine={false}
                                tickLine={false}
                                allowDecimals={false}
                              />
                              <YAxis
                                dataKey="name"
                                type="category"
                                tick={{ fontSize: 10, fill: "#6b7280", fontWeight: 600 }}
                                axisLine={false}
                                tickLine={false}
                                width={70}
                              />
                              <Tooltip
                                content={({ active, payload, label }: any) => {
                                  if (!active || !payload?.length) return null;
                                  return (
                                    <div className="bg-white border-2 border-[#87c4d8]/30 rounded-lg shadow-lg px-3 py-2">
                                      <p className="text-[11px] font-bold text-secondary mb-1">{label}</p>
                                      {payload.map((p: any, i: number) => (
                                        p.value > 0 && (
                                          <p key={i} className="text-[11px]" style={{ color: p.fill }}>
                                            {p.name}: <span className="font-bold">{p.value}</span>
                                          </p>
                                        )
                                      ))}
                                    </div>
                                  );
                                }}
                                cursor={{ fill: "#87c4d8", fillOpacity: 0.08 }}
                              />
                              <Bar dataKey="Completed"  name="Completed"  stackId="a" fill={STATUS_COLORS.Completed}  radius={[0, 0, 0, 0]} />
                              <Bar dataKey="Ongoing"    name="Ongoing"    stackId="a" fill={STATUS_COLORS.Ongoing}    radius={[0, 0, 0, 0]} />
                              <Bar dataKey="Overdue"    name="Overdue"    stackId="a" fill={STATUS_COLORS.Overdue}    radius={[0, 0, 0, 0]} />
                              <Bar dataKey="Deferred"   name="Deferred"   stackId="a" fill={STATUS_COLORS.Deferred}   radius={[0, 0, 0, 0]} />
                              <Bar dataKey="Blacklisted" name="Blacklisted" stackId="a" fill={STATUS_COLORS.Blacklisted} radius={[0, 0, 0, 0]} />
                              <Bar dataKey="Rereferred" name="Re-referred" stackId="a" fill={STATUS_COLORS["Re-referred"]} radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <p className="text-xs text-gray-400">No match for "{adviseeSearch}"</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="h-[320px] flex items-center justify-center">
                    <p className="text-xs text-gray-400">No performance data available</p>
                  </div>
                )}
              </ChartCard>

              <ChartCard id="chart-efficiency-gap" title="Efficiency Gap">
                {efficiencyGapRaw.rows.length > 0 ? (
                  <div className="flex flex-col h-[320px]">
                    {/* Controls row */}
                    <div className="flex items-center mb-2 px-1 gap-2">
                      {/* Advisee name filter */}
                      <div className="relative flex-1 min-w-0">
                        <input
                          type="text"
                          value={adviseeFilter}
                          onChange={e => { setAdviseeFilter(e.target.value); setAdviseeFilterDropdownOpen(true); }}
                          onFocus={() => setAdviseeFilterDropdownOpen(true)}
                          onBlur={() => setTimeout(() => setAdviseeFilterDropdownOpen(false), 150)}
                          placeholder="All Clinicians"
                          className="w-full text-[10px] font-semibold rounded-md border border-[#87c4d8]/40 bg-[#87c4d8]/[0.06] px-2 py-1 pr-6 text-secondary placeholder-gray-400 focus:outline-none focus:border-[#5B8AB8]/60 focus:ring-1 focus:ring-[#5B8AB8]/20 transition-all"
                        />
                        {adviseeFilter ? (
                          <button
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => { setAdviseeFilter(""); setAdviseeFilterDropdownOpen(false); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[10px] leading-none"
                          >✕</button>
                        ) : (
                          <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-[#87c4d8]" size={11} strokeWidth={2.5} />
                        )}
                        {adviseeFilterDropdownOpen && (() => {
                          const q = adviseeFilter.trim().toLowerCase();
                          const names = efficiencyGapRaw.rows.map(r => r.name);
                          const suggestions = q ? names.filter(n => n.toLowerCase().includes(q)) : names;
                          return suggestions.length > 0 ? (
                            <div className="absolute z-30 left-0 right-0 top-full mt-0.5 bg-white border border-[#87c4d8]/30 rounded-md shadow-lg overflow-hidden max-h-[140px] overflow-y-auto">
                              {suggestions.map((name, i) => (
                                <button
                                  key={i}
                                  onMouseDown={e => e.preventDefault()}
                                  onClick={() => { setAdviseeFilter(name); setAdviseeFilterDropdownOpen(false); }}
                                  className={`w-full text-left px-3 py-1.5 text-[10px] transition-colors ${
                                    adviseeFilter === name ? "bg-[#87c4d8]/20 text-secondary font-semibold" : "hover:bg-[#87c4d8]/10 text-gray-700"
                                  }`}
                                >{name}</button>
                              ))}
                            </div>
                          ) : null;
                        })()}
                      </div>
                      {/* Searchable service picker */}
                      <div className="relative flex-1 min-w-0">
                        <input
                          type="text"
                          value={serviceSearch}
                          onChange={e => {
                            setServiceSearch(e.target.value);
                            setServiceDropdownOpen(true);
                          }}
                          onFocus={() => setServiceDropdownOpen(true)}
                          onBlur={() => setTimeout(() => setServiceDropdownOpen(false), 150)}
                          placeholder="Search service…"
                          className="w-full text-[10px] font-semibold rounded-md border border-[#87c4d8]/40 bg-[#87c4d8]/[0.06] px-2 py-1 pr-6 text-secondary placeholder-gray-400 focus:outline-none focus:border-[#5B8AB8]/60 focus:ring-1 focus:ring-[#5B8AB8]/20 transition-all"
                        />
                        {serviceSearch && serviceSearch !== "All Services (avg)" ? (
                          <button
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => { setServiceSearch("All Services (avg)"); setSelectedService("__all__"); setServiceDropdownOpen(false); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[10px] leading-none"
                          >✕</button>
                        ) : (
                          <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-[#87c4d8]" size={11} strokeWidth={2.5} />
                        )}
                        {/* Predictive dropdown */}
                        {serviceDropdownOpen && (() => {
                          const q = serviceSearch.trim().toLowerCase();
                          const allOption = { value: "__all__", label: "All Services (avg)", sub: "" };
                          const svcOptions = efficiencyGapRaw.serviceList.map(svc => ({
                            value: svc,
                            label: svc,
                            sub: `avg ${efficiencyGapRaw.serviceBaseline[svc]}d`,
                          }));
                          const allItems = [allOption, ...svcOptions];
                          const filtered = q === "" || q === "all services (avg)"
                            ? allItems
                            : allItems.filter(o => o.label.toLowerCase().includes(q));
                          return filtered.length > 0 ? (
                            <div className="absolute z-30 left-0 right-0 top-full mt-0.5 bg-white border border-[#87c4d8]/30 rounded-md shadow-lg overflow-hidden max-h-[160px] overflow-y-auto">
                              {filtered.map((opt, i) => (
                                <button
                                  key={i}
                                  onMouseDown={e => e.preventDefault()}
                                  onClick={() => {
                                    setSelectedService(opt.value);
                                    setServiceSearch(opt.value === "__all__" ? "All Services (avg)" : opt.label);
                                    setServiceDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-1.5 transition-colors flex items-center justify-between gap-2 ${
                                    selectedService === opt.value
                                      ? "bg-[#87c4d8]/20 text-secondary"
                                      : "hover:bg-[#87c4d8]/10 text-gray-700"
                                  }`}
                                >
                                  <span className="text-[10px] font-medium truncate">{opt.label}</span>
                                  {opt.sub && <span className="text-[9px] text-gray-400 whitespace-nowrap">{opt.sub}</span>}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="absolute z-30 left-0 right-0 top-full mt-0.5 bg-white border border-[#87c4d8]/30 rounded-md shadow-lg px-3 py-2">
                              <p className="text-[10px] text-gray-400">No match for "{serviceSearch}"</p>
                            </div>
                          );
                        })()}
                      </div>
                      {/* Outlier toggle */}
                      <button
                        onClick={() => setEfficiencyOutlierOnly(v => !v)}
                        className={`text-[9px] font-semibold px-2 py-1 rounded-md border whitespace-nowrap transition-all ${
                          efficiencyOutlierOnly
                            ? "bg-red-50 border-red-300 text-red-600"
                            : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {efficiencyOutlierOnly ? "⚠ Outliers" : "All"}
                      </button>
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-3 mb-1.5 px-1">
                      <div className="flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#22C55E]" />
                        <span className="text-[9px] text-gray-500 font-medium">Faster than avg</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#EF4444]" />
                        <span className="text-[9px] text-gray-500 font-medium">Slower than avg</span>
                      </div>
                    </div>
                    {/* Chart */}
                    <div className="flex-1 min-h-0 overflow-y-auto">
                      {(() => {
                        const OUTLIER_THRESHOLD = 2;
                        const adviseeQ = adviseeFilter.trim().toLowerCase();
                        const displayed = efficiencyGapData
                          .filter(d => !adviseeQ || d.name.toLowerCase().includes(adviseeQ))
                          .filter(d => !efficiencyOutlierOnly || d.gap > OUTLIER_THRESHOLD);
                        if (displayed.length === 0) {
                          return (
                            <div className="h-full flex items-center justify-center">
                              <p className="text-xs text-gray-400 text-center px-4">
                                {efficiencyOutlierOnly
                                  ? `No outliers — all clinicians within ±${OUTLIER_THRESHOLD}d`
                                  : "No data for this service"}
                              </p>
                            </div>
                          );
                        }
                        return (
                          <ResponsiveContainer width="100%" height={Math.max(180, displayed.length * 34)}>
                            <BarChart data={displayed} layout="vertical" barSize={16} margin={{ left: 4, right: 28, top: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                              <XAxis
                                type="number"
                                tick={{ fontSize: 10, fill: "#9ca3af" }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={v => `${v > 0 ? "+" : ""}${v}d`}
                              />
                              <YAxis
                                dataKey="name"
                                type="category"
                                tick={{ fontSize: 10, fill: "#6b7280", fontWeight: 600 }}
                                axisLine={false}
                                tickLine={false}
                                width={70}
                              />
                              <ReferenceLine x={0} stroke="#6b7280" strokeWidth={1.5} strokeDasharray="4 2" label={{ value: "avg", position: "insideTopRight", fontSize: 9, fill: "#9ca3af" }} />
                              <Tooltip
                                content={({ active, payload, label }: any) => {
                                  if (!active || !payload?.length) return null;
                                  const gap = payload[0]?.value ?? 0;
                                  const isFast = gap <= 0;
                                  const svcLabel = selectedService === "__all__" ? "all services" : selectedService;
                                  return (
                                    <div className="bg-white border-2 border-[#87c4d8]/30 rounded-lg shadow-lg px-3 py-2">
                                      <p className="text-[11px] font-bold text-secondary mb-0.5">{label}</p>
                                      <p className="text-[11px]" style={{ color: isFast ? "#22C55E" : "#EF4444" }}>
                                        {isFast ? "Efficiency Gain" : "Efficiency Lag"}:{" "}
                                        <span className="font-bold">{gap > 0 ? "+" : ""}{gap}d</span>
                                      </p>
                                      <p className="text-[10px] text-gray-400">vs. avg for {svcLabel}</p>
                                    </div>
                                  );
                                }}
                                cursor={{ fill: "#87c4d8", fillOpacity: 0.08 }}
                              />
                              <Bar dataKey="gap" name="Gap" radius={[0, 4, 4, 0]}>
                                {displayed.map((entry, i) => (
                                  <Cell
                                    key={i}
                                    fill={entry.gap <= 0 ? "#22C55E" : "#EF4444"}
                                    fillOpacity={Math.min(1, 0.45 + Math.abs(entry.gap) / 10)}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="h-[320px] flex items-center justify-center">
                    <p className="text-xs text-gray-400">Need completed referrals to calculate efficiency</p>
                  </div>
                )}
              </ChartCard>

            </div>

            {/* ── Row 1.5: Section Referral Activity + Top Destination Sections ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 animate-enter-delay-3">
              <ChartCard id="chart-net-flow" title="Section Referral Activity">
                {netFlowData.length > 0 ? (
                  <div className="flex flex-col h-[260px]">
                    {/* Legend */}
                    <div className="flex items-center gap-4 mb-2 px-1">
                      <div className="flex items-center gap-1">
                        <span className="inline-block w-3 h-2.5 rounded-sm bg-[#3B82F6]" />
                        <span className="text-[9px] text-gray-500 font-medium">Incoming</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="inline-block w-3 h-2.5 rounded-sm bg-[#F97316]" />
                        <span className="text-[9px] text-gray-500 font-medium">Outgoing</span>
                      </div>
                      <span className="text-[9px] text-gray-300 ml-auto italic">sorted by backlog</span>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto">
                      <ResponsiveContainer width="100%" height={Math.max(200, netFlowData.length * 38)}>
                        <BarChart data={netFlowData} layout="vertical" barSize={14} margin={{ left: 4, right: 16, top: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 9, fill: "#9ca3af" }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => String(Math.abs(v))}
                            allowDecimals={false}
                          />
                          <YAxis
                            dataKey="section"
                            type="category"
                            tick={{ fontSize: 10, fill: "#6b7280", fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                            width={64}
                          />
                          <ReferenceLine x={0} stroke="#d1d5db" strokeWidth={1.5} />
                          <Tooltip
                            content={({ active, payload, label }: any) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0]?.payload;
                              const net = d?.net ?? 0;
                              return (
                                <div className="bg-white border-2 border-[#87c4d8]/30 rounded-lg shadow-lg px-3 py-2">
                                  <p className="text-[11px] font-bold text-secondary mb-1">{label}</p>
                                  <p className="text-[11px] text-[#3B82F6]">Incoming: <span className="font-bold">{d?.incoming}</span></p>
                                  <p className="text-[11px] text-[#F97316]">Outgoing: <span className="font-bold">{Math.abs(d?.outgoing ?? 0)}</span></p>
                                  <p className={`text-[11px] font-bold mt-1 ${net > 0 ? "text-red-500" : net < 0 ? "text-green-500" : "text-gray-400"}`}>
                                    Net: {net > 0 ? `+${net} backlog` : net < 0 ? `${net} surplus` : "balanced"}
                                  </p>
                                </div>
                              );
                            }}
                            cursor={{ fill: "#87c4d8", fillOpacity: 0.08 }}
                          />
                          <Bar dataKey="incoming" name="Incoming" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="outgoing" name="Outgoing" fill="#F97316" radius={[4, 0, 0, 4]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="h-[260px] flex items-center justify-center">
                    <p className="text-xs text-gray-400">No referral flow data available</p>
                  </div>
                )}
              </ChartCard>

              <ChartCard id="chart-top-dest" title="Referral Treatment per Discipline" className="lg:col-span-2">
                {referralTreatmentData.length > 0 ? (
                  <div className="flex flex-col h-[260px]">
                    {/* Search box */}
                    <div className="relative mb-2 px-1">
                      <input
                        type="text"
                        value={disciplineSearch}
                        onChange={e => setDisciplineSearch(e.target.value)}
                        placeholder="All Disciplines"
                        className="w-full text-[11px] rounded-md border border-[#87c4d8]/40 bg-[#87c4d8]/[0.06] px-2.5 py-1.5 pr-6 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#5B8AB8]/60 focus:ring-1 focus:ring-[#5B8AB8]/20 transition-all"
                      />
                      {disciplineSearch ? (
                        <button onClick={() => setDisciplineSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[10px] leading-none">✕</button>
                      ) : (
                        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#87c4d8]" size={12} strokeWidth={2.5} />
                      )}
                      {disciplineSearch.trim() && (() => {
                        const q = disciplineSearch.trim().toLowerCase();
                        const suggestions = referralTreatmentData.filter(d => d.name.toLowerCase().includes(q) && d.name.toLowerCase() !== q);
                        return suggestions.length > 0 ? (
                          <div className="absolute z-20 left-1 right-1 top-full mt-0.5 bg-white border border-[#87c4d8]/30 rounded-md shadow-lg overflow-hidden">
                            {suggestions.slice(0, 5).map((s, i) => (
                              <button key={i} onClick={() => setDisciplineSearch(s.name)} className="w-full text-left px-3 py-1.5 text-[11px] text-gray-700 hover:bg-[#87c4d8]/10 transition-colors">{s.name}</button>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-4 mb-2 px-1">
                      {[{ label: "Referred", color: "#5B8AB8" }, { label: "Accepted", color: "#22C55E" }, { label: "Ongoing", color: "#3B82F6" }, { label: "Completed", color: "#059669" }].map(l => (
                        <div key={l.label} className="flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                          <span className="text-[9px] text-gray-500 font-medium">{l.label}</span>
                        </div>
                      ))}
                    </div>
                    {/* Chart */}
                    <div className="flex-1 min-h-0 overflow-y-auto">
                      {(() => {
                        const filtered = disciplineSearch.trim()
                          ? referralTreatmentData.filter(d => d.name.toLowerCase().includes(disciplineSearch.trim().toLowerCase()))
                          : referralTreatmentData;
                        if (filtered.length === 0) return (
                          <div className="h-full flex items-center justify-center">
                            <p className="text-xs text-gray-400">No match for &quot;{disciplineSearch}&quot;</p>
                          </div>
                        );
                        return (
                          <ResponsiveContainer width="100%" height={Math.max(180, filtered.length * 52)}>
                            <BarChart data={filtered} layout="vertical" barSize={12} margin={{ left: 4, right: 24, top: 0, bottom: 0 }} barCategoryGap="35%">
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#6b7280", fontWeight: 600 }} axisLine={false} tickLine={false} width={110} />
                              <Tooltip
                                content={({ active, payload, label }: any) => {
                                  if (!active || !payload?.length) return null;
                                  return (
                                    <div className="bg-white border-2 border-[#87c4d8]/30 rounded-lg shadow-lg px-3 py-2">
                                      <p className="text-[11px] font-bold text-secondary mb-1">{label}</p>
                                      {payload.map((p: any, i: number) => (
                                        p.value > 0 && (
                                          <p key={i} className="text-[11px]" style={{ color: p.fill }}>
                                            {p.name}: <span className="font-bold">{p.value}</span>
                                          </p>
                                        )
                                      ))}
                                    </div>
                                  );
                                }}
                                cursor={{ fill: "#87c4d8", fillOpacity: 0.08 }}
                              />
                              <Bar dataKey="Referred"  name="Referred"  stackId="a" fill="#5B8AB8" radius={[0, 0, 0, 0]} />
                              <Bar dataKey="Accepted"  name="Accepted"  stackId="a" fill="#22C55E" radius={[0, 0, 0, 0]} />
                              <Bar dataKey="Ongoing"   name="Ongoing"   stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                              <Bar dataKey="Completed" name="Completed" stackId="a" fill="#059669" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="h-[260px] flex items-center justify-center">
                    <p className="text-xs text-gray-400">No treatment data for this period</p>
                  </div>
                )}
              </ChartCard>
            </div>

            {/* ── Row 2: Referral Heatmap + Referral Status Over Time ──────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 animate-enter-delay-4">
              <ChartCard id="chart-referral-heatmap" title="Referral Heatmap">
                {heatmapData.length > 0 ? (
                  <div className="flex flex-col h-[260px]">
                    {/* Column headers */}
                    <div className="grid gap-0.5 mb-1" style={{ gridTemplateColumns: `80px repeat(7, 1fr)` }}>
                      <div />
                      {HEATMAP_STATUSES.map(s => {
                        const colorMap: Record<string, string> = { Pending: "#F59E0B", Ongoing: "#3B82F6", Completed: "#22C55E", Overdue: "#EF4444", Deferred: "#F97316", Blacklisted: "#374151", "Re-referred": "#A855F7" };
                        return (
                          <div key={s} className="text-center text-[7px] font-bold uppercase tracking-wide pb-1" style={{ color: colorMap[s] }}>{s}</div>
                        );
                      })}
                    </div>
                    {/* Rows — flex-1 so they stretch to fill vertical space */}
                    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-0.5">
                      {heatmapData.map((row) => (
                        <div key={row.section} className="grid gap-0.5 items-stretch flex-1 min-h-[28px]" style={{ gridTemplateColumns: `80px repeat(7, 1fr)` }}>
                          <span className="text-[9px] font-semibold text-gray-600 truncate pr-1 self-center" title={row.section}>{row.section}</span>
                          {row.cells.map((cell) => {
                            const baseColorMap: Record<string, number[]> = { Completed: [34,197,94], Ongoing: [59,130,246], Pending: [245,158,11], Overdue: [239,68,68], Deferred: [249,115,22], Blacklisted: [55,65,81], "Re-referred": [168,85,247] };
                            const baseColor = baseColorMap[cell.status] || [107,114,128];
                            const alpha = Math.max(0.07, cell.pct / 100);
                            const bg = `rgba(${baseColor[0]},${baseColor[1]},${baseColor[2]},${alpha})`;
                            const textColor = cell.pct > 50 ? `rgb(${baseColor[0]},${baseColor[1]},${baseColor[2]})` : "#6b7280";
                            return (
                              <div
                                key={cell.status}
                                title={`${row.section} — ${cell.status}: ${cell.count} (${cell.pct}%)`}
                                className="rounded flex flex-col items-center justify-center cursor-default transition-all hover:brightness-95"
                                style={{ backgroundColor: bg }}
                              >
                                <span className="text-[11px] font-bold leading-none" style={{ color: textColor }}>{cell.count}</span>
                                <span className="text-[7px] text-gray-400 leading-none mt-0.5">{cell.pct}%</span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    {/* Footer legend */}
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1 flex-wrap flex-shrink-0">
                      <span className="text-[8px] text-gray-400 mr-1">Intensity:</span>
                      {[10,30,60,90].map(p => (
                        <div key={p} className="flex items-center gap-0.5">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: `rgba(239,68,68,${Math.max(0.07, p/100)})` }} />
                          <span className="text-[8px] text-gray-400">{p}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[280px] flex items-center justify-center">
                    <p className="text-xs text-gray-400">No heatmap data available</p>
                  </div>
                )}
              </ChartCard>

              <ChartCard id="chart-status-time" title="Referral Status Over Time">
                <div className="mb-2 px-1">
                  <select
                    value={statusTimeSection}
                    onChange={e => setStatusTimeSection(e.target.value)}
                    className="text-[11px] font-semibold rounded-md border border-[#87c4d8]/40 bg-[#87c4d8]/[0.06] px-2.5 py-1.5 text-secondary focus:outline-none focus:border-[#5B8AB8]/60 focus:ring-1 focus:ring-[#5B8AB8]/20 transition-all w-full"
                  >
                    <option value="all">All Sections</option>
                    {availableSections.map(s => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
                {statusOverTimeData.length > 0 ? (
                  <div className="flex flex-col h-[270px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusOverTimeData} barSize={18} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#6b7280", fontWeight: 600 }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          content={({ active, payload, label }: any) => {
                            if (!active || !payload?.length) return null;
                            const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
                            return (
                              <div className="bg-white border-2 border-[#87c4d8]/30 rounded-lg shadow-lg px-3 py-2">
                                <p className="text-[11px] font-bold text-secondary mb-1">{label} — {total} total</p>
                                {[...payload].reverse().map((p: any, i: number) => p.value > 0 && (
                                  <p key={i} className="text-[11px]" style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
                                ))}
                              </div>
                            );
                          }}
                          cursor={{ fill: "#87c4d8", fillOpacity: 0.08 }}
                        />
                        {STATUS_OVER_TIME_KEYS.map(key => (
                          <Bar key={key} dataKey={key} name={key} stackId="status" fill={STATUS_OVER_TIME_COLORS[key]} radius={0} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-2">
                      {STATUS_OVER_TIME_KEYS.map(key => (
                        <div key={key} className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: STATUS_OVER_TIME_COLORS[key] }} />
                          <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">{key}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[290px] flex items-center justify-center">
                    <p className="text-xs text-gray-400">No timeline data available</p>
                  </div>
                )}
              </ChartCard>
            </div>

            {/* ── Row 4: Age | Sex per Treatment | Referral Status per Treatment ──── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 animate-enter-delay-4">
              <ChartCard id="chart-age" title="Patient Age Groups per Treatment">
                {/* Treatment-service searchbox filter */}
                <div className="relative mb-3 px-1">
                  <input
                    type="text"
                    value={ageServiceSearch}
                    onChange={e => { setAgeServiceSearch(e.target.value); setAgeServiceOpen(true); }}
                    onFocus={() => setAgeServiceOpen(true)}
                    onBlur={() => setTimeout(() => setAgeServiceOpen(false), 150)}
                    placeholder="All Treatment Services"
                    className="w-full text-[11px] font-semibold rounded-md border border-[#87c4d8]/40 bg-[#87c4d8]/[0.06] px-2.5 py-1.5 pr-7 text-secondary placeholder-gray-400 focus:outline-none focus:border-[#5B8AB8]/60 focus:ring-1 focus:ring-[#5B8AB8]/20 transition-all"
                  />
                  {ageServiceFilter !== "__all__" ? (
                    <button
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => { setAgeServiceFilter("__all__"); setAgeServiceSearch(""); setAgeServiceOpen(false); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[10px] leading-none"
                    >✕</button>
                  ) : (
                    <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#87c4d8]" size={12} strokeWidth={2.5} />
                  )}
                  {ageServiceOpen && (() => {
                    const q = ageServiceSearch.trim().toLowerCase();
                    const opts = [
                      { value: "__all__", label: "All Treatment Services" },
                      ...ageAvailableServices.map(s => ({ value: s, label: s })),
                    ];
                    const filtered = q === "" ? opts : opts.filter(o => o.label.toLowerCase().includes(q));
                    return filtered.length > 0 ? (
                      <div className="absolute z-30 left-1 right-1 top-full mt-0.5 bg-white border border-[#87c4d8]/30 rounded-md shadow-lg overflow-hidden max-h-[160px] overflow-y-auto">
                        {filtered.map((opt, i) => (
                          <button
                            key={i}
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => {
                              setAgeServiceFilter(opt.value);
                              setAgeServiceSearch(opt.value === "__all__" ? "" : opt.label);
                              setAgeServiceOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
                              ageServiceFilter === opt.value
                                ? "bg-[#87c4d8]/20 text-secondary font-semibold"
                                : "hover:bg-[#87c4d8]/10 text-gray-700"
                            }`}
                          >{opt.label}</button>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
                {ageGroupData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={ageGroupData} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "#6b7280", fontWeight: 600 }}
                        axisLine={{ stroke: "#e5e7eb" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={({ active, payload, label }: any) => {
                          if (!active || !payload?.length) return null;
                          const total = ageGroupData.reduce((s, e) => s + e.value, 0);
                          const pct = total > 0 ? ((payload[0].value / total) * 100).toFixed(0) : "0";
                          return (
                            <div className="bg-white border-2 border-[#87c4d8]/30 rounded-lg shadow-lg px-3 py-2">
                              <p className="text-[11px] font-bold text-secondary">Age {label}</p>
                              <p className="text-[11px]" style={{ color: payload[0]?.payload?.fill }}>
                                {payload[0].value} patient{payload[0].value !== 1 ? "s" : ""} ({pct}%)
                              </p>
                            </div>
                          );
                        }}
                        cursor={{ fill: "#87c4d8", fillOpacity: 0.08 }}
                      />
                      <Bar dataKey="value" name="Patients" radius={[4, 4, 0, 0]}>
                        {ageGroupData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[180px] flex items-center justify-center">
                    <p className="text-xs text-gray-400">No age data available</p>
                  </div>
                )}
              </ChartCard>

              <ChartCard id="chart-sex-treatment" title="Patient Sex Groups per Treatment">
                {/* Treatment-service searchbox filter */}
                <div className="relative mb-3 px-1">
                  <input
                    type="text"
                    value={sexServiceSearch}
                    onChange={e => { setSexServiceSearch(e.target.value); setSexServiceOpen(true); }}
                    onFocus={() => setSexServiceOpen(true)}
                    onBlur={() => setTimeout(() => setSexServiceOpen(false), 150)}
                    placeholder="All Treatment Services"
                    className="w-full text-[11px] font-semibold rounded-md border border-[#87c4d8]/40 bg-[#87c4d8]/[0.06] px-2.5 py-1.5 pr-7 text-secondary placeholder-gray-400 focus:outline-none focus:border-[#5B8AB8]/60 focus:ring-1 focus:ring-[#5B8AB8]/20 transition-all"
                  />
                  {sexServiceFilter !== "__all__" ? (
                    <button
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => { setSexServiceFilter("__all__"); setSexServiceSearch(""); setSexServiceOpen(false); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[10px] leading-none"
                    >✕</button>
                  ) : (
                    <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#87c4d8]" size={12} strokeWidth={2.5} />
                  )}
                  {sexServiceOpen && (() => {
                    const q = sexServiceSearch.trim().toLowerCase();
                    const opts = [
                      { value: "__all__", label: "All Treatment Services" },
                      ...sexAvailableServices.map(s => ({ value: s, label: s })),
                    ];
                    const filtered = q === "" ? opts : opts.filter(o => o.label.toLowerCase().includes(q));
                    return filtered.length > 0 ? (
                      <div className="absolute z-30 left-1 right-1 top-full mt-0.5 bg-white border border-[#87c4d8]/30 rounded-md shadow-lg overflow-hidden max-h-[160px] overflow-y-auto">
                        {filtered.map((opt, i) => (
                          <button
                            key={i}
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => {
                              setSexServiceFilter(opt.value);
                              setSexServiceSearch(opt.value === "__all__" ? "" : opt.label);
                              setSexServiceOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
                              sexServiceFilter === opt.value
                                ? "bg-[#87c4d8]/20 text-secondary font-semibold"
                                : "hover:bg-[#87c4d8]/10 text-gray-700"
                            }`}
                          >{opt.label}</button>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
                {sexPerTreatmentData.length > 0 ? (
                  <div className="flex flex-col">
                    {/* Scrollable list of services, each with a proportional gender-mix bar */}
                    <div className="overflow-y-auto pr-1" style={{ maxHeight: 200 }}>
                      <div className="flex flex-col gap-1.5">
                        {sexPerTreatmentData.map(row => {
                          const total = row.total || 1;
                          const malePct = (row.Male / total) * 100;
                          const femalePct = (row.Female / total) * 100;
                          const unspecPct = (row.Unspecified / total) * 100;
                          return (
                            <div key={row.service} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-center" title={`${row.service} — Male: ${row.Male}, Female: ${row.Female}, Unspecified: ${row.Unspecified}`}>
                              <div className="min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[10px] font-semibold text-gray-700 truncate">{row.service}</span>
                                  <span className="text-[9px] text-gray-400 ml-2 flex-shrink-0">{row.total}</span>
                                </div>
                                <div className="flex h-2 w-full rounded-full overflow-hidden bg-gray-100">
                                  {row.Male > 0 && (
                                    <div className="bg-[#3B82F6] h-full" style={{ width: `${malePct}%` }} title={`Male: ${row.Male} (${malePct.toFixed(0)}%)`} />
                                  )}
                                  {row.Female > 0 && (
                                    <div className="bg-[#EC4899] h-full" style={{ width: `${femalePct}%` }} title={`Female: ${row.Female} (${femalePct.toFixed(0)}%)`} />
                                  )}
                                  {row.Unspecified > 0 && (
                                    <div className="bg-[#9CA3AF] h-full" style={{ width: `${unspecPct}%` }} title={`Unspecified: ${row.Unspecified} (${unspecPct.toFixed(0)}%)`} />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Legend */}
                    <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-[#3B82F6]" /><span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">Male</span></div>
                      <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-[#EC4899]" /><span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">Female</span></div>
                      <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-[#9CA3AF]" /><span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">Unspecified</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="h-[140px] flex items-center justify-center">
                    <p className="text-xs text-gray-400">No data for this service</p>
                  </div>
                )}
              </ChartCard>

              <ChartCard id="chart-tx-status" title="Referral Status per Treatment">
                {/* Treatment-service searchbox filter */}
                <div className="relative mb-3 px-1">
                  <input
                    type="text"
                    value={txStatusSearch}
                    onChange={e => { setTxStatusSearch(e.target.value); setTxStatusOpen(true); }}
                    onFocus={() => setTxStatusOpen(true)}
                    onBlur={() => setTimeout(() => setTxStatusOpen(false), 150)}
                    placeholder="All Treatment Services"
                    className="w-full text-[11px] font-semibold rounded-md border border-[#87c4d8]/40 bg-[#87c4d8]/[0.06] px-2.5 py-1.5 pr-7 text-secondary placeholder-gray-400 focus:outline-none focus:border-[#5B8AB8]/60 focus:ring-1 focus:ring-[#5B8AB8]/20 transition-all"
                  />
                  {txStatusFilter !== "__all__" ? (
                    <button
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => { setTxStatusFilter("__all__"); setTxStatusSearch(""); setTxStatusOpen(false); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[10px] leading-none"
                    >✕</button>
                  ) : (
                    <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#87c4d8]" size={12} strokeWidth={2.5} />
                  )}
                  {txStatusOpen && (() => {
                    const q = txStatusSearch.trim().toLowerCase();
                    const opts = [
                      { value: "__all__", label: "All Treatment Services" },
                      ...txStatusAvailableServices.map(s => ({ value: s, label: s })),
                    ];
                    const filtered = q === "" ? opts : opts.filter(o => o.label.toLowerCase().includes(q));
                    return filtered.length > 0 ? (
                      <div className="absolute z-30 left-1 right-1 top-full mt-0.5 bg-white border border-[#87c4d8]/30 rounded-md shadow-lg overflow-hidden max-h-[160px] overflow-y-auto">
                        {filtered.map((opt, i) => (
                          <button
                            key={i}
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => {
                              setTxStatusFilter(opt.value);
                              setTxStatusSearch(opt.value === "__all__" ? "" : opt.label);
                              setTxStatusOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
                              txStatusFilter === opt.value
                                ? "bg-[#87c4d8]/20 text-secondary font-semibold"
                                : "hover:bg-[#87c4d8]/10 text-gray-700"
                            }`}
                          >{opt.label}</button>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
                {txStatusPerTreatmentData.length > 0 ? (
                  <div className="flex flex-col">
                    <div className="overflow-y-auto pr-1" style={{ maxHeight: 220 }}>
                      <div className="flex flex-col gap-2">
                        {txStatusPerTreatmentData.map(row => {
                          const max = Math.max(...txStatusPerTreatmentData.map(r => r.Referred));
                          const scale = max > 0 ? 100 / max : 0;
                          const refW = row.Referred * scale;
                          const accW = row.Accepted * scale;
                          const ongW = row.Ongoing * scale;
                          const cmpW = row.Completed * scale;
                          return (
                            <div key={row.service} title={`${row.service} — Referred: ${row.Referred}, Accepted: ${row.Accepted}, Ongoing: ${row.Ongoing}, Completed: ${row.Completed}`}>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] font-semibold text-gray-700 truncate">{row.service}</span>
                                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                                  <span className="text-[9px] font-bold text-[#F59E0B]">{row.Referred}</span>
                                  <span className="text-gray-300">/</span>
                                  <span className="text-[9px] font-bold text-[#3B82F6]">{row.Accepted}</span>
                                  <span className="text-gray-300">/</span>
                                  <span className="text-[9px] font-bold text-[#6366F1]">{row.Ongoing}</span>
                                  <span className="text-gray-300">/</span>
                                  <span className="text-[9px] font-bold text-[#22C55E]">{row.Completed}</span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-[2px]">
                                <div className="flex h-[5px] w-full rounded-full overflow-hidden bg-gray-100">
                                  <div className="bg-[#F59E0B] h-full rounded-full" style={{ width: `${refW}%` }} />
                                </div>
                                <div className="flex h-[5px] w-full rounded-full overflow-hidden bg-gray-100">
                                  <div className="bg-[#3B82F6] h-full rounded-full" style={{ width: `${accW}%` }} />
                                </div>
                                <div className="flex h-[5px] w-full rounded-full overflow-hidden bg-gray-100">
                                  <div className="bg-[#6366F1] h-full rounded-full" style={{ width: `${ongW}%` }} />
                                </div>
                                <div className="flex h-[5px] w-full rounded-full overflow-hidden bg-gray-100">
                                  <div className="bg-[#22C55E] h-full rounded-full" style={{ width: `${cmpW}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Legend */}
                    <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-[#F59E0B]" /><span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">Referred</span></div>
                      <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-[#3B82F6]" /><span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">Accepted</span></div>
                      <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-[#6366F1]" /><span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">Ongoing</span></div>
                      <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-[#22C55E]" /><span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">Completed</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="h-[180px] flex items-center justify-center">
                    <p className="text-xs text-gray-400">No data for this service</p>
                  </div>
                )}
              </ChartCard>
            </div>




          </>}
          </main>

          <Footer />
        </div>
      </div>
      {/* ── Stat Detail Modal ─────────────────────────────────────── */}
      {statModal && (
        <StatDetailModal
          type={statModal}
          onClose={() => setStatModal(null)}
          rows={statModalRows}
          title={statModalConfig[statModal].title}
          accent={statModalConfig[statModal].accent}
        />
      )}
    </RouteGuard>
  );
}
