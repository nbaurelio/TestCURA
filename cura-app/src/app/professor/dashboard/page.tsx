"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { getReferrals, Referral } from "@/lib/api/referrals";
import { getAdvisees, getAllProfiles, getCurrentUserId, Profile } from "@/lib/api/profiles";
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
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const filtered = payload.filter((p: any) => p.name && p.name !== p.dataKey);
  return (
    <div className="bg-white border-2 border-[#87c4d8]/30 rounded-lg shadow-lg px-3 py-2">
      <p className="text-[11px] font-bold text-secondary">{label}</p>
      {(filtered.length > 0 ? filtered : payload.slice(0, 1)).map((p: any, i: number) => (
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

const OVERDUE_DAYS = 7;
const PERIOD_LABELS: Record<TimePeriod, string> = {
  week: "7 Days", "5weeks": "5 Weeks", "10weeks": "10 Weeks", "15weeks": "15 Weeks", all: "All Time",
};

// ─── Placeholder chart block ─────────────────────────────────────────────────
function ChartPlaceholder({ height = "h-[240px]" }: { height?: string }) {
  return (
    <div className={`${height} rounded-lg bg-[#87c4d8]/[0.06] border border-dashed border-[#87c4d8]/30 flex items-center justify-center`}>
      <div className="text-center">
        <BarChart3 className="h-8 w-8 text-[#87c4d8]/40 mx-auto mb-2" />
        <p className="text-[10px] text-[#87c4d8]/50 font-medium uppercase tracking-wide">Chart Placeholder</p>
      </div>
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, onClick }: {
  icon: React.ElementType; label: string; value: string; sub: string; color: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border-2 border-[#87c4d8]/30 shadow-sm p-4 flex items-start gap-3 hover:shadow-md hover:border-[#87c4d8]/50 transition-all ${onClick ? "cursor-pointer active:scale-[0.98]" : ""}`}
    >
      <div className="p-2.5 rounded-lg bg-[#87c4d8]/10">
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-secondary leading-tight mt-0.5">{value}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
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
type StatModalType = "total" | "completed" | "overdue" | "avgAcceptance" | "available" | "ongoing" | "deferred" | "blacklisted" | "avgCompletion" | "rereferred" | null;

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

  const columns: Record<NonNullable<StatModalType>, { key: string; label: string }[]> = {
    total: [
      { key: "chart", label: "Chart #" },
      { key: "clinician", label: "Advisee" },
      { key: "origin", label: "Origin" },
      { key: "destination", label: "Destination" },
      { key: "status", label: "Status" },
      { key: "created", label: "Created" },
      { key: "age", label: "Days Since" },
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
      { key: "clinician", label: "Advisee" },
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
        {/* Header */}
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
          <span className="text-[9px] text-secondary/40 font-medium uppercase tracking-wide">Advisee Analytics Dashboard</span>
          <span className="text-[9px] text-secondary/40 font-medium">Showing {rows.length} of {rows.length} records</span>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function ProfessorAnalyticsDashboard() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [advisees, setAdvisees] = useState<Profile[]>([]);
  const [allClinicians, setAllClinicians] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");
  const [selectedClinicianId, setSelectedClinicianId] = useState<string | null>(null);
  const [clinicianSearch, setClinicianSearch] = useState("");
  const [clinicianDropdownOpen, setClinicianDropdownOpen] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<"all" | "advisees">("all");

  useEffect(() => {
    (async () => {
      try {
        const profId = getCurrentUserId();
        const [refs, advs, allProfiles] = await Promise.all([
          getReferrals(true),
          getAdvisees(profId),
          getAllProfiles(),
        ]);
        setReferrals(refs || []);
        setAdvisees(advs || []);
        setAllClinicians((allProfiles || []).filter(p => p.role === "clinician"));
      } catch (e) {
        console.error("Dashboard load error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Scope helpers ───────────────────────────────────────────────────────────
  const adviseeIds = useMemo(() => new Set(advisees.map(a => a.id)), [advisees]);

  const periodStart = useMemo(() => getTimePeriodStart(timePeriod), [timePeriod]);

  // All referrals in the selected time period, optionally scoped to advisees
  const createdByAdvisee = useMemo(() => {
    return referrals.filter(r => {
      if (new Date(r.created_at) < periodStart) return false;
      if (scopeFilter === "advisees" && !adviseeIds.has(r.user_id)) return false;
      return true;
    });
  }, [referrals, periodStart, scopeFilter, adviseeIds]);

  // All referrals in the selected time period, optionally scoped to advisees
  const acceptedByAdvisee = useMemo(() => {
    return referrals.filter(r => {
      if (new Date(r.created_at) < periodStart) return false;
      if (scopeFilter === "advisees" && !adviseeIds.has(r.accepted_by_user_id || "")) return false;
      return true;
    });
  }, [referrals, periodStart, scopeFilter, adviseeIds]);

  // ── Stat-card scoped datasets — additionally filtered by selected clinician.
  // These power the summary cards/modal only. Charts continue to use the
  // unfiltered createdByAdvisee/acceptedByAdvisee datasets above.
  const cardCreated = useMemo(() => {
    if (!selectedClinicianId) return createdByAdvisee;
    return createdByAdvisee.filter(r => r.user_id === selectedClinicianId);
  }, [createdByAdvisee, selectedClinicianId]);

  const cardAccepted = useMemo(() => {
    if (!selectedClinicianId) return acceptedByAdvisee;
    return acceptedByAdvisee.filter(r => r.accepted_by_user_id === selectedClinicianId);
  }, [acceptedByAdvisee, selectedClinicianId]);

  // ── Computed stat values ───────────────────────────────────────────────────
  const totalRefs = cardCreated.length;

  const completedCount = useMemo(
    () => cardAccepted.filter(r => r.referral_status === "completed").length,
    [cardAccepted]
  );

  const completionRate = cardAccepted.length > 0
    ? ((completedCount / cardAccepted.length) * 100).toFixed(0) : "0";

  const avgCompletionDays = useMemo(() => {
    const diffs: number[] = [];
    cardCreated.forEach(r => {
      if (r.referral_status !== "completed") return;
      const d = daysBetween(r.accepted_at, r.referral_status_changed_at);
      if (d !== null && d >= 0) diffs.push(d);
    });
    if (diffs.length === 0) return null;
    return +(diffs.reduce((s, v) => s + v, 0) / diffs.length).toFixed(1);
  }, [cardCreated]);

  // Overdue = referral has been accepted, status is not completed, and more
  // than OVERDUE_DAYS have passed since accepted_at without completion.
  const overdueCount = useMemo(() => {
    const now = new Date().toISOString();
    return cardCreated.filter(r => {
      if (!r.accepted_at) return false;
      if (r.referral_status === "completed") return false;
      const age = daysBetween(r.accepted_at, now);
      return age !== null && age > OVERDUE_DAYS;
    }).length;
  }, [cardCreated]);

  const availableCount = useMemo(
    () => cardCreated.filter(r => r.accepted_by === "None" || !r.accepted_at).length,
    [cardCreated]
  );
  const ongoingCount = useMemo(
    () => cardCreated.filter(r => {
      if (r.accepted_by === "None" || !r.accepted_at) return false;
      const rs = r.referral_status?.toLowerCase();
      return !rs || rs === "ongoing";
    }).length,
    [cardCreated]
  );
  const deferredCount = useMemo(
    () => cardCreated.filter(r => r.referral_status === "deferred").length,
    [cardCreated]
  );
  const blacklistedCount = useMemo(
    () => cardCreated.filter(r => r.referral_status === "blacklisted").length,
    [cardCreated]
  );
  const rereferredCount = useMemo(
    () => cardCreated.filter(r => r.rerefer_request_status === "approved" || r.rerefer_request_status === "completed").length,
    [cardCreated]
  );

  // ── Advisee Referral Status — based on ACCEPTED referrals ─────────────────
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {
      Pending: 0, Ongoing: 0, Completed: 0, Deferred: 0, Blacklisted: 0, "Re-referred": 0,
    };
    acceptedByAdvisee.forEach(r => {
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
  }, [acceptedByAdvisee]);

  // ── Advisee Referrals Over Time — monthly count of accepted referrals ──────
  const timelineData = useMemo(() => {
    const buckets: Record<string, number> = {};
    acceptedByAdvisee.forEach(r => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => {
        const [y, m] = month.split("-");
        const monthName = new Date(+y, +m - 1).toLocaleString("en-US", { month: "short" });
        const label = `${monthName} '${y.slice(-2)}`;
        return { month: label, referrals: count };
      });
  }, [acceptedByAdvisee]);

  // ── Per-advisee referral volume by month (stacked bar) ──────────────────────
  const ADVISEE_VOLUME_COLORS = [
    "#5B8AB8", "#22C55E", "#F59E0B", "#A855F7",
    "#EF4444", "#14B8A6", "#F97316", "#EC4899",
    "#6366F1", "#84CC16", "#06B6D4", "#374151",
  ];
  const perAdviseeVolumeData = useMemo(() => {
    const monthSet = new Set<string>();
    const raw: Record<string, Record<string, number>> = {};
    acceptedByAdvisee.forEach(r => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const uid = r.accepted_by_user_id || "";
      const adv = allClinicians.find(a => a.id === uid);
      const name = adv ? `${adv.first_name} ${adv.last_name || ""}`.trim() : (r.accepted_by || "Unknown");
      monthSet.add(key);
      if (!raw[key]) raw[key] = {};
      raw[key][name] = (raw[key][name] || 0) + 1;
    });
    const months = Array.from(monthSet).sort();
    const adviseeNames = Array.from(
      new Set(acceptedByAdvisee.map(r => {
        const uid = r.accepted_by_user_id || "";
        const adv = allClinicians.find(a => a.id === uid);
        return adv ? `${adv.first_name} ${adv.last_name || ""}`.trim() : (r.accepted_by || "Unknown");
      }))
    ).sort();
    const rows = months.map(key => {
      const [y, m] = key.split("-");
      const label = `${new Date(+y, +m - 1).toLocaleString("en-US", { month: "short" })} '${y.slice(-2)}`;
      const entry: Record<string, any> = { month: label };
      adviseeNames.forEach(name => { entry[name] = raw[key]?.[name] || 0; });
      return entry;
    });
    return { rows, adviseeNames };
  }, [acceptedByAdvisee, allClinicians]);

  // ── Turnaround time per advisee (accepted_at → completed_at) ────────────────
  const turnaroundData = useMemo(() => {
    // Only completed referrals accepted by advisees
    const completed = acceptedByAdvisee.filter(r => r.referral_status === "completed");
    const adviseeMap: Record<string, { name: string; days: number[] }> = {};
    completed.forEach(r => {
      const d = daysBetween(r.accepted_at, r.referral_status_changed_at);
      if (d === null || d < 0) return;
      const uid = r.accepted_by_user_id || "";
      if (!adviseeMap[uid]) {
        const adv = allClinicians.find(a => a.id === uid);
        adviseeMap[uid] = {
          name: adv ? `${adv.first_name} ${adv.last_name || ""}`.trim() : (r.accepted_by || "Unknown"),
          days: [],
        };
      }
      adviseeMap[uid].days.push(d);
    });
    return Object.values(adviseeMap)
      .map(({ name, days }) => ({
        name,
        avg: +(days.reduce((s, v) => s + v, 0) / days.length).toFixed(1),
        min: Math.min(...days),
        max: Math.max(...days),
      }))
      .sort((a, b) => a.avg - b.avg);
  }, [acceptedByAdvisee, allClinicians]);

  // ── Case mix — treatment service distribution of accepted referrals ─────
  const CASE_MIX_COLORS = [
    "#5B8AB8", "#22C55E", "#F59E0B", "#EF4444", "#A855F7",
    "#3B82F6", "#EC4899", "#14B8A6", "#F97316", "#6366F1",
    "#84CC16", "#06B6D4",
  ];
  const caseMixData = useMemo(() => {
    const counts: Record<string, number> = {};
    acceptedByAdvisee.forEach(r => {
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
  }, [acceptedByAdvisee]);

  // ── Departmental Net Flow ─────────────────────────────────────────
  // Counts referrals per clinical section. "Incoming (demand)" = referrals
  // whose destination = this section. "Outgoing (supply)" = referrals whose
  // origin = this section. Net = incoming − outgoing; positive net means a
  // section is receiving more referrals than it sends out (a backlog/bottleneck);
  // negative net means it is a net referrer (surplus capacity).
  const netFlowData = useMemo(() => {
    const map: Record<string, { incoming: number; outgoing: number }> = {};
    const ensure = (s: string) => { if (!map[s]) map[s] = { incoming: 0, outgoing: 0 }; };
    acceptedByAdvisee.forEach(r => {
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
  }, [acceptedByAdvisee]);

  // ── Top Destination Sections — ranked by inbound volume ───────────────
  const DEST_COLORS = ["#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#A855F7", "#EC4899", "#14B8A6", "#5B8AB8"];
  const topDestinationData = useMemo(() => {
    const filtered = referrals.filter(r => {
      if (new Date(r.created_at) < periodStart) return false;
      if (scopeFilter === "advisees" && !adviseeIds.has(r.user_id)) return false;
      return true;
    });
    const counts: Record<string, number> = {};
    filtered.forEach(r => {
      const dest = r.clinical_section_destination;
      if (dest) counts[dest] = (counts[dest] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value], i) => ({ name, value, fill: DEST_COLORS[i % DEST_COLORS.length] }));
  }, [referrals, periodStart, scopeFilter, adviseeIds]);

  // ── Section volume — monthly incoming vs outgoing ─────────────────────
  // Bins all referrals by month, then for each month counts how many are
  // INCOMING (destination = selectedSection) and OUTGOING (origin =
  // selectedSection). When "all" is selected, every referral counts as both
  // incoming and outgoing for that month (so the two bars are identical and
  // represent total monthly volume).
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const availableSections = useMemo(() => {
    const sectionSet = new Set<string>();
    referrals.forEach(r => {
      if (r.clinical_section_origin) sectionSet.add(r.clinical_section_origin);
      if (r.clinical_section_destination) sectionSet.add(r.clinical_section_destination);
    });
    return Array.from(sectionSet).sort();
  }, [referrals]);
  const sectionVolumeData = useMemo(() => {
    const filtered = referrals.filter(r => {
      if (new Date(r.created_at) < periodStart) return false;
      if (scopeFilter === "advisees" && !adviseeIds.has(r.user_id)) return false;
      return true;
    });
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
  }, [referrals, periodStart, selectedSection, scopeFilter, adviseeIds]);

  // ── Referral Heatmap — section × status pressure ────────────────────────
  // For each clinical_section_destination, classify referrals into 4 buckets:
  //   • Completed : referral_status === "completed"
  //   • Overdue   : has accepted_at, not completed, and (now - accepted_at) > OVERDUE_DAYS (7 days)
  //   • Ongoing   : has accepted_at, not completed, and within 7 days of acceptance
  //   • Pending   : no accepted_at (awaiting acceptance) — age does not flip this to Overdue
  // Each cell shows the % of that section's referrals in that bucket and the
  // raw count below. Sections are sorted by total referrals (highest first).
  const HEATMAP_STATUSES = ["Pending", "Ongoing", "Completed", "Overdue", "Deferred", "Blacklisted", "Re-referred"] as const;
  const heatmapData = useMemo(() => {
    const now = new Date().toISOString();
    const map: Record<string, Record<string, number>> = {};
    const ensure = (s: string) => {
      if (!map[s]) map[s] = { Pending: 0, Ongoing: 0, Completed: 0, Overdue: 0, Deferred: 0, Blacklisted: 0, "Re-referred": 0 };
    };
    acceptedByAdvisee.forEach(r => {
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
        const age = daysBetween(r.accepted_at, now);
        if (age !== null && age > OVERDUE_DAYS) map[section].Overdue++;
        else map[section].Ongoing++;
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
  }, [acceptedByAdvisee]);

  // ── Referral Status Over Time — monthly stacked breakdown ──────────
  // Bins all referrals by their created_at month, then classifies each into
  // one of 5 buckets: Re-referred (priority), Completed, Deferred, Blacklisted,
  // or Ongoing (default for anything pending/in-progress). Months are sorted
  // chronologically. Used for a stacked bar chart showing referral volume and
  // composition over time.
  const STATUS_OVER_TIME_KEYS = ["Ongoing", "Completed", "Deferred", "Blacklisted", "Re-referred"] as const;
  const STATUS_OVER_TIME_COLORS: Record<string, string> = {
    Ongoing: "#3B82F6", Completed: "#22C55E",
    Deferred: "#EF4444", Blacklisted: "#374151", "Re-referred": "#A855F7",
  };
  const [statusTimeSection, setStatusTimeSection] = useState<string>("all");
  const statusOverTimeData = useMemo(() => {
    const filtered = referrals.filter(r => {
      if (new Date(r.created_at) < periodStart) return false;
      if (scopeFilter === "advisees" && !adviseeIds.has(r.user_id)) return false;
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
      // week
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
  }, [referrals, periodStart, statusTimeSection, scopeFilter, adviseeIds, timePeriod]);

  // ── Case mix progression controls ──────────────────────────────────
  const [cmpAdvisee, setCmpAdvisee] = useState("__all__");        // advisee uid or "__all__"
  const [cmpAdviseeSearch, setCmpAdviseeSearch] = useState("");
  const [cmpAdviseeOpen, setCmpAdviseeOpen] = useState(false);
  const [cmpSpecialOnly, setCmpSpecialOnly] = useState(false);    // special cases toggle

  // Section color map — matches filterTaxonomy shortNames
  const SECTION_COLORS: Record<string, string> = {
    "OM":     "#5B8AB8",
    "OP":     "#22C55E",
    "Prostho":"#F59E0B",
    "Ortho":  "#A855F7",
    "Unknown":"#9ca3af",
  };
  const SECTION_ORDER = ["OM", "OP", "Prostho", "Ortho", "Unknown"];

  // ── Case mix progression — grouped by clinical section over time ────────
  const caseMixProgressionData = useMemo(() => {
    const base = acceptedByAdvisee.filter(r => {
      if (cmpAdvisee !== "__all__" && r.accepted_by_user_id !== cmpAdvisee) return false;
      if (cmpSpecialOnly && !r.special_case) return false;
      return true;
    });
    const monthSet = new Set<string>();
    const raw: Record<string, Record<string, number>> = {};
    base.forEach(r => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const section = r.clinical_section_destination || "Unknown";
      monthSet.add(key);
      if (!raw[key]) raw[key] = {};
      raw[key][section] = (raw[key][section] || 0) + 1;
    });
    const months = Array.from(monthSet).sort();
    const sections = SECTION_ORDER.filter(s =>
      base.some(r => (r.clinical_section_destination || "Unknown") === s)
    );
    const rows = months.map(key => {
      const [y, m] = key.split("-");
      const label = `${new Date(+y, +m - 1).toLocaleString("en-US", { month: "short" })} '${y.slice(-2)}`;
      const entry: Record<string, any> = { month: label };
      sections.forEach(s => { entry[s] = raw[key]?.[s] || 0; });
      return entry;
    });
    return { rows, sections };
  }, [acceptedByAdvisee, cmpAdvisee, cmpSpecialOnly]);

  // ── Performance per advisee ─ referral count by status per advisee ──────
  // Each referral lands in exactly ONE bucket (the bars represent a 100%
  // breakdown). Priority: Re-referred (rerefer_request_status === "approved")
  // takes precedence over referral_status, so an approved re-referral counts
  // as Re-referred regardless of its current status.
  const performanceData = useMemo(() => {
    const map: Record<string, { name: string; Completed: number; Ongoing: number; Deferred: number; Blacklisted: number; Pending: number; Rereferred: number; total: number }> = {};
    acceptedByAdvisee.forEach(r => {
      const uid = r.accepted_by_user_id || "";
      if (!map[uid]) {
        const adv = allClinicians.find(a => a.id === uid);
        map[uid] = {
          name: adv ? `${adv.first_name} ${adv.last_name || ""}`.trim() : (r.accepted_by || "Unknown"),
          Completed: 0, Ongoing: 0, Deferred: 0, Blacklisted: 0, Pending: 0, Rereferred: 0, total: 0,
        };
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
  }, [acceptedByAdvisee, allClinicians]);

  // ── Referrals by Pathway — filterable by origin + destination section ────
  const PATHWAY_COLORS: Record<string, string> = {
    "OM":      "#5B8AB8",
    "OP":      "#22C55E",
    "Prostho": "#F59E0B",
    "Ortho":   "#A855F7",
    "Unknown": "#9ca3af",
  };
  const PATHWAY_SECTION_LIST = ["OM", "OP", "Prostho", "Ortho"];

  const [pathwayView, setPathwayView] = useState<"origin" | "destination">("destination");

  const originsData = useMemo(() => {
    const counts: Record<string, number> = {};
    acceptedByAdvisee.forEach(r => {
      const section = r.clinical_section_origin || "Unknown";
      counts[section] = (counts[section] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value, fill: PATHWAY_COLORS[name] || "#9ca3af" }));
  }, [acceptedByAdvisee]);

  const pathwayData = useMemo(() => {
    const counts: Record<string, number> = {};
    acceptedByAdvisee.forEach(r => {
      const key = pathwayView === "origin"
        ? (r.clinical_section_origin || "Unknown")
        : (r.clinical_section_destination || "Unknown");
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value, fill: PATHWAY_COLORS[name] || "#9ca3af" }));
  }, [acceptedByAdvisee, pathwayView]);

  // ── Patient age group distribution ──────────────────────────────────────
  // Filterable by treatment_service_destination via a predictive searchbox.
  const [ageServiceFilter, setAgeServiceFilter] = useState<string>("__all__");
  const [ageServiceSearch, setAgeServiceSearch] = useState<string>("");
  const [ageServiceOpen, setAgeServiceOpen] = useState(false);
  const ageAvailableServices = useMemo(() => {
    const set = new Set<string>();
    acceptedByAdvisee.forEach(r => {
      if (r.treatment_service_destination) set.add(r.treatment_service_destination);
    });
    return Array.from(set).sort();
  }, [acceptedByAdvisee]);
  const AGE_BUCKETS = [
    { label: "0–12", min: 0, max: 12, color: "#14B8A6" },
    { label: "13–17", min: 13, max: 17, color: "#3B82F6" },
    { label: "18–30", min: 18, max: 30, color: "#5B8AB8" },
    { label: "31–50", min: 31, max: 50, color: "#F59E0B" },
    { label: "51–65", min: 51, max: 65, color: "#EF4444" },
    { label: "65+", min: 66, max: 999, color: "#A855F7" },
  ];
  const ageGroupData = useMemo(() => {
    const counts = AGE_BUCKETS.map(b => ({ name: b.label, value: 0, fill: b.color }));
    acceptedByAdvisee.forEach(r => {
      if (ageServiceFilter !== "__all__" && r.treatment_service_destination !== ageServiceFilter) return;
      const age = r.age;
      if (age == null) return;
      const idx = AGE_BUCKETS.findIndex(b => age >= b.min && age <= b.max);
      if (idx >= 0) counts[idx].value++;
    });
    return counts;
  }, [acceptedByAdvisee, ageServiceFilter]);

  // ── Patient sex per treatment service ──────────────────────────────────
  // Groups acceptedByAdvisee referrals by treatment_service_destination and
  // counts Male / Female / Unspecified within each service. The dropdown
  // filter (with predictive search) lets the user narrow to one specific
  // service; otherwise all services with at least one referral are shown,
  // sorted by total volume descending.
  const [sexServiceFilter, setSexServiceFilter] = useState<string>("__all__");
  const [sexServiceSearch, setSexServiceSearch] = useState<string>("");
  const [sexServiceOpen, setSexServiceOpen] = useState(false);
  const sexAvailableServices = useMemo(() => {
    const set = new Set<string>();
    acceptedByAdvisee.forEach(r => {
      if (r.treatment_service_destination) set.add(r.treatment_service_destination);
    });
    return Array.from(set).sort();
  }, [acceptedByAdvisee]);
  const sexPerTreatmentData = useMemo(() => {
    const map: Record<string, { Male: number; Female: number; Unspecified: number; total: number }> = {};
    acceptedByAdvisee.forEach(r => {
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
  }, [acceptedByAdvisee, sexServiceFilter]);

  // ── Treatment Status per Service (Referred / Accepted / Completed) ──────
  const [txStatusFilter, setTxStatusFilter] = useState<string>("__all__");
  const [txStatusSearch, setTxStatusSearch] = useState<string>("");
  const [txStatusOpen, setTxStatusOpen] = useState(false);
  const txStatusAvailableServices = useMemo(() => {
    const set = new Set<string>();
    referrals.forEach(r => {
      if (r.treatment_service_destination) set.add(r.treatment_service_destination);
    });
    return Array.from(set).sort();
  }, [referrals]);
  const txStatusPerTreatmentData = useMemo(() => {
    const map: Record<string, { Referred: number; Accepted: number; Completed: number }> = {};
    const filtered = referrals.filter(r => {
      if (new Date(r.created_at) < periodStart) return false;
      if (scopeFilter === "advisees" && !adviseeIds.has(r.user_id)) return false;
      return true;
    });
    filtered.forEach(r => {
      const svc = r.treatment_service_destination || "Unspecified";
      if (txStatusFilter !== "__all__" && svc !== txStatusFilter) return;
      if (!map[svc]) map[svc] = { Referred: 0, Accepted: 0, Completed: 0 };
      // Every referral counts as "Referred"
      map[svc].Referred++;
      // If it has been accepted (accepted_at exists), count as Accepted
      if (r.accepted_at) map[svc].Accepted++;
      // If it is completed, count as Completed
      if (r.referral_status === "completed") map[svc].Completed++;
    });
    return Object.entries(map)
      .map(([service, v]) => ({ service, ...v }))
      .sort((a, b) => b.Referred - a.Referred);
  }, [referrals, periodStart, txStatusFilter, scopeFilter, adviseeIds]);

  // ── Exceptions & alerts ─────────────────────────────────────────────────
  const exceptionsData = useMemo(() => {
    const now = new Date().toISOString();
    let overdue = 0, medAlerts = 0, reReferred = 0, deferred = 0, blacklisted = 0;
    const alertList: { advisee: string; type: string; detail: string; color: string }[] = [];

    acceptedByAdvisee.forEach(r => {
      const adv = allClinicians.find(a => a.id === (r.accepted_by_user_id || ""));
      const advName = adv ? `${adv.first_name} ${adv.last_name || ""}`.trim() : (r.accepted_by || "Unknown");

      // Overdue: accepted, not completed, > 7 days since acceptance
      if (r.accepted_at && r.referral_status !== "completed") {
        const age = daysBetween(r.accepted_at, now);
        if (age !== null && age > OVERDUE_DAYS) {
          overdue++;
          alertList.push({ advisee: advName, type: "Overdue", detail: `${age}d since accepted`, color: "#EF4444" });
        }
      }
      // Medical alert
      if (r.medical_alert && r.medical_alert !== "None" && r.medical_alert !== "none") {
        medAlerts++;
        alertList.push({ advisee: advName, type: "Medical Alert", detail: r.medical_alert, color: "#F59E0B" });
      }
      // Re-referred
      if (r.rerefer_request_status === "approved") {
        reReferred++;
        alertList.push({ advisee: advName, type: "Re-referred", detail: r.chart_number, color: "#A855F7" });
      }
      // Deferred
      if (r.referral_status === "deferred") {
        deferred++;
        alertList.push({ advisee: advName, type: "Deferred", detail: r.chart_number, color: "#EF4444" });
      }
      // Blacklisted
      if (r.referral_status === "blacklisted") {
        blacklisted++;
        alertList.push({ advisee: advName, type: "Blacklisted", detail: r.chart_number, color: "#374151" });
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
  }, [acceptedByAdvisee, allClinicians]);

  // ── Status Summary Heatmap ────────────────────────────────────────────
  // One row per clinician, with columns covering EVERY referral status the
  // system tracks plus exception/alert flags. A single referral may contribute
  // to multiple columns (e.g. an ongoing referral past the SLA increments both
  // "Ongoing" and "Overdue"; a completed referral with a medical alert
  // increments both "Completed" and "Med. Alert"). Total = sum of all columns.
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
  const [heatSelectedCell, setHeatSelectedCell] = useState<{ advisee: string; colKey: string } | null>(null);
  const [heatSearch, setHeatSearch] = useState("");

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

    acceptedByAdvisee.forEach(r => {
      const uid = r.accepted_by_user_id || "unknown";
      const adv = allClinicians.find(a => a.id === uid);
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
      // Overdue = accepted, not completed, > 7 days since acceptance
      if (r.accepted_at && rs !== "completed") {
        const age = daysBetween(r.accepted_at, now);
        if (age !== null && age > OVERDUE_DAYS) { e.Overdue++; e.total++; e.details.Overdue.push({ chart: r.chart_number, detail: `${age}d overdue` }); }
      }
      if (r.medical_alert && r.medical_alert !== "None" && r.medical_alert !== "none") { e.MedAlert++; e.total++; e.details.MedAlert.push({ chart: r.chart_number, detail: r.medical_alert }); }
      if (r.rerefer_request_status === "approved") { e.Rereferred++; e.total++; e.details.Rereferred.push({ chart: r.chart_number, detail: "Re-referred" }); }
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [acceptedByAdvisee, allClinicians]);

  const avgAcceptanceDays = useMemo(() => {
    const diffs: number[] = [];
    cardAccepted.forEach(r => {
      const d = daysBetween(r.created_at, r.accepted_at);
      if (d !== null && d >= 0) diffs.push(d);
    });
    if (diffs.length === 0) return null;
    return +(diffs.reduce((s, v) => s + v, 0) / diffs.length).toFixed(1);
  }, [cardAccepted]);

  // ── Service-Relative Turnaround (Efficiency Gap) ──────────────────────────
  const [efficiencyOutlierOnly, setEfficiencyOutlierOnly] = useState(false);
  const [selectedService, setSelectedService] = useState<string>("__all__");
  const [serviceSearch, setServiceSearch] = useState("All Services (avg)");
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [adviseeFilter, setAdviseeFilter] = useState("");
  const [adviseeFilterDropdownOpen, setAdviseeFilterDropdownOpen] = useState(false);

  const efficiencyGapRaw = useMemo(() => {
    const completed = acceptedByAdvisee.filter(
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
      const adv = allClinicians.find(a => a.id === uid);
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
  }, [acceptedByAdvisee, allClinicians]);

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

  // ── Stat card detail modal ────────────────────────────────────────────────
  const [statModal, setStatModal] = useState<StatModalType>(null);
  const [adviseeSearch, setAdviseeSearch] = useState("");

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "—";
  const adviseeMap = useMemo(() => {
    const m = new Map<string, string>();
    allClinicians.forEach(a => m.set(a.id, `${a.first_name} ${a.last_name}`));
    return m;
  }, [allClinicians]);
  const findAdvisee = (id: string | null) => id ? (adviseeMap.get(id) ?? "—") : "—";
  const nowStr = new Date().toISOString();

  const statModalRows = useMemo(() => {
    switch (statModal) {
      case "total":
        return cardCreated.map(r => ({
          chart: r.chart_number,
          clinician: findAdvisee(r.user_id),
          origin: r.clinical_section_origin,
          destination: r.clinical_section_destination,
          status: !r.accepted_at ? "pending" : (r.referral_status || "ongoing"),
          created: fmtDate(r.created_at),
          age: daysBetween(r.created_at, nowStr),
        }));
      case "completed":
        return cardAccepted
          .filter(r => r.referral_status === "completed")
          .map(r => ({
            chart: r.chart_number,
            clinician: findAdvisee(r.user_id),
            acceptedBy: findAdvisee(r.accepted_by_user_id),
            origin: r.clinical_section_origin,
            destination: r.clinical_section_destination,
            created: fmtDate(r.created_at),
            completedAt: fmtDate(r.referral_status_changed_at),
            daysToComplete: daysBetween(r.created_at, r.referral_status_changed_at),
          }));
      case "overdue":
        return cardCreated
          .filter(r => {
            if (!r.accepted_at) return false;
            if (r.referral_status === "completed") return false;
            const age = daysBetween(r.accepted_at, nowStr);
            return age !== null && age > OVERDUE_DAYS;
          })
          .map(r => ({
            chart: r.chart_number,
            clinician: findAdvisee(r.user_id),
            origin: r.clinical_section_origin,
            destination: r.clinical_section_destination,
            created: fmtDate(r.created_at),
            daysOverdue: daysBetween(r.accepted_at, nowStr),
            status: r.referral_status || "ongoing",
          }))
          .sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0));
      case "avgAcceptance":
        return cardAccepted
          .filter(r => r.accepted_at)
          .map(r => ({
            chart: r.chart_number,
            clinician: findAdvisee(r.user_id),
            acceptedBy: findAdvisee(r.accepted_by_user_id),
            origin: r.clinical_section_origin,
            created: fmtDate(r.created_at),
            accepted: fmtDate(r.accepted_at),
            daysToAccept: daysBetween(r.created_at, r.accepted_at),
          }))
          .sort((a, b) => (b.daysToAccept || 0) - (a.daysToAccept || 0));
      case "available":
        return cardCreated
          .filter(r => r.accepted_by === "None" || !r.accepted_at)
          .map(r => ({
            chart: r.chart_number,
            clinician: findAdvisee(r.user_id),
            origin: r.clinical_section_origin,
            destination: r.clinical_section_destination,
            created: fmtDate(r.created_at),
            age: daysBetween(r.created_at, nowStr),
          }))
          .sort((a, b) => (b.age || 0) - (a.age || 0));
      case "ongoing":
        return cardCreated
          .filter(r => {
            if (r.accepted_by === "None" || !r.accepted_at) return false;
            const rs = r.referral_status?.toLowerCase();
            return !rs || rs === "ongoing";
          })
          .map(r => ({
            chart: r.chart_number,
            clinician: findAdvisee(r.user_id),
            acceptedBy: findAdvisee(r.accepted_by_user_id),
            origin: r.clinical_section_origin,
            destination: r.clinical_section_destination,
            created: fmtDate(r.created_at),
            accepted: fmtDate(r.accepted_at),
          }));
      case "deferred":
        return cardCreated
          .filter(r => r.referral_status === "deferred")
          .map(r => ({
            chart: r.chart_number,
            clinician: findAdvisee(r.user_id),
            acceptedBy: findAdvisee(r.accepted_by_user_id),
            origin: r.clinical_section_origin,
            destination: r.clinical_section_destination,
            created: fmtDate(r.created_at),
            deferredAt: fmtDate(r.referral_status_changed_at),
          }));
      case "blacklisted":
        return cardCreated
          .filter(r => r.referral_status === "blacklisted")
          .map(r => ({
            chart: r.chart_number,
            clinician: findAdvisee(r.user_id),
            acceptedBy: findAdvisee(r.accepted_by_user_id),
            origin: r.clinical_section_origin,
            destination: r.clinical_section_destination,
            created: fmtDate(r.created_at),
            blacklistedAt: fmtDate(r.referral_status_changed_at),
          }));
      case "avgCompletion":
        return cardCreated
          .filter(r => r.referral_status === "completed" && r.accepted_at && r.referral_status_changed_at)
          .map(r => ({
            chart: r.chart_number,
            clinician: findAdvisee(r.user_id),
            acceptedBy: findAdvisee(r.accepted_by_user_id),
            origin: r.clinical_section_origin,
            destination: r.clinical_section_destination,
            accepted: fmtDate(r.accepted_at),
            completedAt: fmtDate(r.referral_status_changed_at),
            daysToComplete: daysBetween(r.accepted_at, r.referral_status_changed_at),
          }))
          .sort((a, b) => (b.daysToComplete || 0) - (a.daysToComplete || 0));
      case "rereferred":
        return cardCreated
          .filter(r => r.rerefer_request_status === "approved" || r.rerefer_request_status === "completed")
          .map(r => ({
            chart: r.chart_number,
            clinician: findAdvisee(r.user_id),
            acceptedBy: findAdvisee(r.accepted_by_user_id),
            origin: r.clinical_section_origin,
            destination: r.clinical_section_destination,
            created: fmtDate(r.created_at),
          }));
      default:
        return [];
    }
  }, [statModal, cardCreated, cardAccepted, allClinicians]);

  const avgAcceptanceRows = useMemo(() =>
    acceptedByAdvisee
      .filter(r => r.accepted_at)
      .map(r => ({
        chart: r.chart_number,
        clinician: findAdvisee(r.user_id),
        acceptedBy: findAdvisee(r.accepted_by_user_id),
        origin: r.clinical_section_origin,
        created: fmtDate(r.created_at),
        accepted: fmtDate(r.accepted_at),
        daysToAccept: daysBetween(r.created_at, r.accepted_at),
      }))
      .sort((a, b) => (b.daysToAccept || 0) - (a.daysToAccept || 0))
  , [acceptedByAdvisee, allClinicians]);

  const statModalConfig: Record<NonNullable<StatModalType>, { title: string; accent: string }> = {
    total:         { title: "Total Referrals — Advisees",    accent: "#5B8AB8" },
    completed:     { title: "Completed Referrals",           accent: "#2D7A4F" },
    overdue:       { title: "Overdue Referrals",             accent: "#EF4444" },
    avgAcceptance: { title: "Acceptance Time — All Accepted", accent: "#3B82F6" },
    available:     { title: "Available Referrals",           accent: "#F59E0B" },
    ongoing:       { title: "Ongoing Referrals",              accent: "#3B82F6" },
    deferred:      { title: "Deferred Referrals",            accent: "#F97316" },
    blacklisted:   { title: "Blacklisted Referrals",         accent: "#374151" },
    avgCompletion: { title: "Avg. Completion Days — Completed Referrals", accent: "#059669" },
    rereferred:    { title: "Re-referred Referrals",         accent: "#A855F7" },
  };

  // ── Export handlers ─────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    const toastId = toast.loading("Generating Excel file — capturing charts, please wait…");
    try {
    const periodLabel = PERIOD_LABELS[timePeriod];
    const allRows = createdByAdvisee.map(r => ({
      chart: r.chart_number,
      advisee: findAdvisee(r.user_id),
      origin: r.clinical_section_origin,
      destination: r.clinical_section_destination,
      status: !r.accepted_at ? "pending" : (r.referral_status || "ongoing"),
      created: r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
      accepted: r.accepted_at ? new Date(r.accepted_at).toLocaleDateString() : "—",
      acceptedBy: findAdvisee(r.accepted_by_user_id),
      daysToAccept: daysBetween(r.created_at, r.accepted_at),
      daysSinceCreated: daysBetween(r.created_at, nowStr),
    }));

    const completedRows = acceptedByAdvisee
      .filter(r => r.referral_status === "completed")
      .map(r => ({
        chart: r.chart_number,
        advisee: findAdvisee(r.user_id),
        acceptedBy: findAdvisee(r.accepted_by_user_id),
        origin: r.clinical_section_origin,
        destination: r.clinical_section_destination,
        created: r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
        completed: r.referral_status_changed_at ? new Date(r.referral_status_changed_at).toLocaleDateString() : "—",
        daysToComplete: daysBetween(r.created_at, r.referral_status_changed_at),
      }));

    const overdueRows = createdByAdvisee
      .filter(r => {
        if (!r.accepted_at) return false;
        if (r.referral_status === "completed") return false;
        const age = daysBetween(r.accepted_at, nowStr);
        return age !== null && age > OVERDUE_DAYS;
      })
      .map(r => ({
        chart: r.chart_number,
        advisee: findAdvisee(r.user_id),
        origin: r.clinical_section_origin,
        destination: r.clinical_section_destination,
        created: r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
        daysOverdue: daysBetween(r.accepted_at, nowStr),
        status: r.referral_status || "ongoing",
      }));

    const { exportToExcel } = await lazyExport();
    await exportToExcel([
      {
        name: "All Referrals",
        headers: ["Chart #", "Advisee", "Origin", "Destination", "Status", "Created", "Accepted", "Accepted By", "Days to Accept", "Days Since"],
        rows: allRows.map(r => [r.chart, r.advisee, r.origin, r.destination, r.status, r.created, r.accepted, r.acceptedBy, r.daysToAccept, r.daysSinceCreated]),
      },
      {
        name: "Completed",
        headers: ["Chart #", "Created By", "Accepted By", "Origin", "Destination", "Created", "Completed", "Days"],
        rows: completedRows.map(r => [r.chart, r.advisee, r.acceptedBy, r.origin, r.destination, r.created, r.completed, r.daysToComplete]),
      },
      {
        name: "Overdue",
        headers: ["Chart #", "Advisee", "Origin", "Destination", "Created", "Days Overdue", "Status"],
        rows: overdueRows.map(r => [r.chart, r.advisee, r.origin, r.destination, r.created, r.daysOverdue, r.status]),
      },
      {
        name: "Avg Acceptance Time",
        headers: ["Chart #", "Created By", "Accepted By", "Origin Section", "Created", "Accepted", "Days to Accept"],
        rows: avgAcceptanceRows.map(r => [r.chart, r.clinician, r.acceptedBy, r.origin, r.created, r.accepted, r.daysToAccept]),
      },
      // ── Stat-card sheets (one per remaining card) ────────────────────────
      {
        name: "Available",
        headers: ["Chart #", "Advisee", "Origin", "Destination", "Created", "Age (days)"],
        rows: createdByAdvisee
          .filter(r => r.accepted_by === "None" || !r.accepted_at)
          .map(r => [
            r.chart_number,
            findAdvisee(r.user_id),
            r.clinical_section_origin,
            r.clinical_section_destination,
            r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
            daysBetween(r.created_at, nowStr),
          ]),
      },
      {
        name: "Ongoing",
        headers: ["Chart #", "Advisee", "Accepted By", "Origin", "Destination", "Created", "Accepted"],
        rows: createdByAdvisee
          .filter(r => {
            if (r.accepted_by === "None" || !r.accepted_at) return false;
            const rs = r.referral_status?.toLowerCase();
            return !rs || rs === "ongoing";
          })
          .map(r => [
            r.chart_number,
            findAdvisee(r.user_id),
            findAdvisee(r.accepted_by_user_id),
            r.clinical_section_origin,
            r.clinical_section_destination,
            r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
            r.accepted_at ? new Date(r.accepted_at).toLocaleDateString() : "—",
          ]),
      },
      {
        name: "Deferred",
        headers: ["Chart #", "Advisee", "Accepted By", "Origin", "Destination", "Created", "Deferred At"],
        rows: createdByAdvisee
          .filter(r => r.referral_status === "deferred")
          .map(r => [
            r.chart_number,
            findAdvisee(r.user_id),
            findAdvisee(r.accepted_by_user_id),
            r.clinical_section_origin,
            r.clinical_section_destination,
            r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
            r.referral_status_changed_at ? new Date(r.referral_status_changed_at).toLocaleDateString() : "—",
          ]),
      },
      {
        name: "Blacklisted",
        headers: ["Chart #", "Advisee", "Accepted By", "Origin", "Destination", "Created", "Blacklisted At"],
        rows: createdByAdvisee
          .filter(r => r.referral_status === "blacklisted")
          .map(r => [
            r.chart_number,
            findAdvisee(r.user_id),
            findAdvisee(r.accepted_by_user_id),
            r.clinical_section_origin,
            r.clinical_section_destination,
            r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
            r.referral_status_changed_at ? new Date(r.referral_status_changed_at).toLocaleDateString() : "—",
          ]),
      },
      {
        name: "Avg Completion",
        headers: ["Chart #", "Advisee", "Accepted By", "Origin", "Destination", "Accepted", "Completed", "Days to Complete"],
        rows: createdByAdvisee
          .filter(r => r.referral_status === "completed" && r.accepted_at && r.referral_status_changed_at)
          .map(r => [
            r.chart_number,
            findAdvisee(r.user_id),
            findAdvisee(r.accepted_by_user_id),
            r.clinical_section_origin,
            r.clinical_section_destination,
            r.accepted_at ? new Date(r.accepted_at).toLocaleDateString() : "—",
            r.referral_status_changed_at ? new Date(r.referral_status_changed_at).toLocaleDateString() : "—",
            daysBetween(r.accepted_at, r.referral_status_changed_at),
          ])
          .sort((a, b) => (Number(b[7]) || 0) - (Number(a[7]) || 0)),
      },
      {
        name: "Re-referred",
        headers: ["Chart #", "Advisee", "Accepted By", "Origin", "Destination", "Created"],
        rows: createdByAdvisee
          .filter(r => r.rerefer_request_status === "approved" || r.rerefer_request_status === "completed")
          .map(r => [
            r.chart_number,
            findAdvisee(r.user_id),
            findAdvisee(r.accepted_by_user_id),
            r.clinical_section_origin,
            r.clinical_section_destination,
            r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
          ]),
      },
    ], `CURA_Advisee_Analytics_${periodLabel}_${new Date().toISOString().slice(0, 10)}`, [
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
        id: "chart-top-dest", title: "Referral Acceptance per Section",
        headers: ["Section", "Referrals"],
        rows: topDestinationData.map((d: any) => [d.name, d.value]),
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
        rows: exceptionHeatmap.map(r => [r.name, r.Pending, r.Ongoing, r.Completed, r.Overdue, r.MedAlert, r.Rereferred, r.Deferred, r.Blacklisted, r.total]),
      },
    ]);
    toast.success("Excel file downloaded successfully!", { id: toastId });
    sendSystemNotification("📄 Excel Export Complete", "Your analytics dashboard has been exported to Excel.");
    } catch (err) {
      toast.error("Failed to generate Excel file. Please try again.", { id: toastId });
    } finally { setExporting(false); }
  };


  return (
    <RouteGuard allowedRoles={["professor"]}>
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
                  href="/professor"
                  className="p-2 rounded-lg border-2 border-[#87c4d8]/40 bg-white hover:bg-secondary hover:text-white hover:border-secondary text-secondary transition-all shadow-sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <div>
                  <h1 className="text-lg font-bold text-secondary uppercase tracking-wide">Overall Analytics</h1>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Referral performance across all clinicians &amp; advisees</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Clinician search filter (stat cards only) */}
                <div className="flex items-center gap-1.5 bg-white rounded-lg border-2 border-[#87c4d8]/30 px-2.5 py-1 shadow-sm h-[34px]">
                  <Search className="h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={clinicianSearch}
                    onChange={(e) => { setClinicianSearch(e.target.value); setClinicianDropdownOpen(true); }}
                    onFocus={() => setClinicianDropdownOpen(true)}
                    placeholder="Filter cards by clinician…"
                    className="text-[11px] font-medium text-secondary placeholder:text-gray-400 bg-transparent outline-none w-44"
                  />
                  {selectedClinicianId && (
                    <button
                      onClick={() => { setSelectedClinicianId(null); setClinicianSearch(""); setClinicianDropdownOpen(false); }}
                      className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      title="Clear filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Scope toggle */}
                <div className="flex gap-1 bg-white rounded-lg border-2 border-[#87c4d8]/30 p-1 shadow-sm">
                  {([["all", "All"], ["advisees", "My Advisees"]] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setScopeFilter(val)}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wide transition-all ${
                        scopeFilter === val
                          ? "bg-secondary text-white shadow"
                          : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Time period pills */}
                <div className="flex gap-1.5 bg-white rounded-lg border-2 border-[#87c4d8]/30 p-1 shadow-sm">
                  {(["week", "5weeks", "10weeks", "15weeks", "all"] as TimePeriod[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setTimePeriod(p)}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wide transition-all ${
                        timePeriod === p
                          ? "bg-secondary text-white shadow"
                          : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      }`}
                    >
                      {PERIOD_LABELS[p]}
                    </button>
                  ))}
                </div>

                {/* Export buttons */}
                <div className="flex gap-1">
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
            </div>

            {/* ── Active filter chip (only when a clinician is selected) ── */}
            {selectedClinicianId && (() => {
              const a = allClinicians.find(x => x.id === selectedClinicianId);
              if (!a) return null;
              return (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-[#87c4d8]/10 border border-[#87c4d8]/25 animate-enter-delay-1 w-fit">
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-wide">Cards filtered by:</span>
                  <span className="text-[11px] font-bold text-secondary">{a.last_name}, {a.first_name}</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                    {a.year_level || "—"} · {a.clinical_department || "—"}
                  </span>
                  <button
                    onClick={() => { setSelectedClinicianId(null); setClinicianSearch(""); }}
                    className="p-0.5 rounded hover:bg-white text-gray-400 hover:text-gray-600"
                    title="Clear filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })()}

            {/* ── Inline Clinician Search Results (renders on the page, not as overlay) ── */}
            {clinicianDropdownOpen && (() => {
              const q = clinicianSearch.trim().toLowerCase();
              const matches = allClinicians.filter(a => {
                if (!q) return true;
                const full = `${a.first_name} ${a.last_name}`.toLowerCase();
                return full.includes(q) || (a.year_level || "").toLowerCase().includes(q) || (a.clinical_department || "").toLowerCase().includes(q);
              });
              return (
                <div className="mb-4 p-3 rounded-lg bg-white border-2 border-[#87c4d8]/30 shadow-sm animate-enter-delay-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-wide">
                      {matches.length} {matches.length === 1 ? "match" : "matches"}{q && ` for "${clinicianSearch}"`}
                    </span>
                    <button
                      onClick={() => setClinicianDropdownOpen(false)}
                      className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      title="Close"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {matches.length === 0 ? (
                    <p className="text-[11px] text-gray-400 italic px-1 py-2">No clinicians match your search.</p>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      {matches.map(a => (
                        <button
                          key={a.id}
                          onClick={() => {
                            setSelectedClinicianId(a.id);
                            setClinicianSearch(`${a.first_name} ${a.last_name}`);
                            setClinicianDropdownOpen(false);
                          }}
                          className={`text-left px-3 py-2 rounded-md border transition-all ${
                            selectedClinicianId === a.id
                              ? "bg-[#87c4d8]/15 border-[#87c4d8] shadow-sm"
                              : "bg-gray-50 border-gray-200 hover:bg-[#87c4d8]/10 hover:border-[#87c4d8]/40"
                          }`}
                        >
                          <div className="text-[11px] font-bold text-secondary leading-tight truncate">{a.last_name}, {a.first_name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-gray-500 font-medium uppercase tracking-wide">
                            {a.year_level && <span>{a.year_level}</span>}
                            {a.year_level && a.clinical_department && <span className="text-gray-300">·</span>}
                            {a.clinical_department && <span className="truncate">{a.clinical_department}</span>}
                            {!a.year_level && !a.clinical_department && <span className="italic text-gray-400">No shift / year set</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Summary Cards ────────────────────────────────────── */}
            {(() => {
              const pct = (n: number) => totalRefs > 0 ? ((n / totalRefs) * 100).toFixed(1) : "0";
              return (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6 animate-enter-delay-2">
              <StatCard icon={FileText}       label="Total Referrals"  value={loading ? "…" : String(totalRefs)}                                          sub="Advisees' referrals"                                                                                          color="#5B8AB8" onClick={() => setStatModal("total")} />
              <StatCard icon={TrendingUp}     label="Completed"        value={loading ? "…" : String(completedCount)}                                     sub={loading ? "Completion rate" : `${completionRate}% completion rate`}                                                color="#2D7A4F" onClick={() => setStatModal("completed")} />
              <StatCard icon={AlertTriangle}  label="Overdue"          value={loading ? "…" : String(overdueCount)}                                       sub={loading ? `Pending > ${OVERDUE_DAYS} days` : `${pct(overdueCount)}% overdue rate`}                                color="#EF4444" onClick={() => setStatModal("overdue")} />
              <StatCard icon={Clock}          label="Avg. Acceptance"  value={loading ? "…" : (avgAcceptanceDays !== null ? `${avgAcceptanceDays}d` : "—")} sub="Created → Accepted"                                                                                           color="#3B82F6" onClick={() => setStatModal("avgAcceptance")} />
              <StatCard icon={Hourglass}      label="Available"        value={loading ? "…" : String(availableCount)}                                     sub={loading ? "Awaiting acceptance" : `${pct(availableCount)}% available rate`}                                        color="#F59E0B" onClick={() => setStatModal("available")} />
              <StatCard icon={Activity}        label="Ongoing"          value={loading ? "…" : String(ongoingCount)}                                        sub={loading ? "Currently in progress" : `${pct(ongoingCount)}% ongoing rate`}                                         color="#3B82F6" onClick={() => setStatModal("ongoing")} />
              <StatCard icon={Pause}          label="Deferred"         value={loading ? "…" : String(deferredCount)}                                      sub={loading ? "Deferred referrals" : `${pct(deferredCount)}% deferral rate`}                                          color="#F97316" onClick={() => setStatModal("deferred")} />
              <StatCard icon={Ban}            label="Blacklisted"      value={loading ? "…" : String(blacklistedCount)}                                   sub={loading ? "Blacklisted referrals" : `${pct(blacklistedCount)}% blacklist rate`}                                   color="#374151" onClick={() => setStatModal("blacklisted")} />
              <StatCard icon={TrendingUp}     label="Avg. Completion" value={loading ? "…" : (avgCompletionDays !== null ? `${avgCompletionDays}d` : "—")}  sub="Accepted → Completed"                                                                                         color="#059669" onClick={() => setStatModal("avgCompletion")} />
              <StatCard icon={Repeat}         label="Re-referred"      value={loading ? "…" : String(rereferredCount)}                                     sub={loading ? "Re-referred referrals" : `${pct(rereferredCount)}% re-referral rate`}                                  color="#A855F7" onClick={() => setStatModal("rereferred")} />
            </div>
              );
            })()}

            {/* ── Divider between stat cards and charts ── */}
            <div className="h-px bg-secondary/20 mb-4" />

            {/* ── Row 1: Performance per Clinician (1 col) + Efficiency Gap (2 col) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 animate-enter-delay-3">
              <ChartCard id="chart-perf-advisee" title="Performance per Clinician">
                {performanceData.length > 0 ? (
                  <div className="flex flex-col h-[260px]">
                    {/* Search box */}
                    <div className="relative mb-2 px-1">
                      <input
                        type="text"
                        value={adviseeSearch}
                        onChange={e => setAdviseeSearch(e.target.value)}
                        placeholder="All Advisees"
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
                      {(["Completed", "Ongoing", "Pending", "Deferred", "Blacklisted", "Re-referred"] as const).map(s => (
                        <div key={s} className="flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[s] }} />
                          <span className="text-[9px] text-gray-500 font-medium">{s}</span>
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
                              <Bar dataKey="Pending"    name="Pending"    stackId="a" fill={STATUS_COLORS.Pending}    radius={[0, 0, 0, 0]} />
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
                  <div className="h-[260px] flex items-center justify-center">
                    <p className="text-xs text-gray-400">No performance data available</p>
                  </div>
                )}
              </ChartCard>

              <ChartCard id="chart-efficiency-gap" title="Efficiency Gap" className="lg:col-span-2">
                {efficiencyGapRaw.rows.length > 0 ? (
                  <div className="flex flex-col h-[260px]">
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
                          placeholder="All Advisees"
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
                                  ? `No outliers — all advisees within ±${OUTLIER_THRESHOLD}d`
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
                  <div className="h-[260px] flex items-center justify-center">
                    <p className="text-xs text-gray-400">Need completed referrals to calculate efficiency</p>
                  </div>
                )}
              </ChartCard>

            </div>

            {/* ── Row 1.5: Section Referral Activity + Top Destination Sections ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 animate-enter-delay-3">
              <ChartCard id="chart-net-flow" title="Section Referral Activity" className="lg:col-span-2">
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

              <ChartCard id="chart-top-dest" title="Referral Acceptance per Section">
                {topDestinationData.length > 0 ? (
                  <div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={topDestinationData} layout="vertical" barSize={22} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#6b7280", fontWeight: 600 }} axisLine={false} tickLine={false} width={70} />
                        <Tooltip
                          content={({ active, payload, label }: any) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0];
                            return (
                              <div className="bg-white border-2 border-[#87c4d8]/30 rounded-lg shadow-lg px-3 py-2">
                                <p className="text-[11px] font-bold text-secondary">{label}</p>
                                <p className="text-[11px]" style={{ color: d.payload?.fill }}>
                                  {d.value} referral{d.value !== 1 ? "s" : ""}
                                </p>
                              </div>
                            );
                          }}
                          cursor={{ fill: "#87c4d8", fillOpacity: 0.08 }}
                        />
                        <Bar dataKey="value" name="Referrals" radius={[0, 4, 4, 0]}>
                          {topDestinationData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-2">
                      {topDestinationData.map((entry, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.fill }} />
                          <span className="text-[9px] font-semibold text-gray-500">{entry.name}</span>
                          <span className="text-[9px] font-bold text-secondary">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[220px] flex items-center justify-center">
                    <p className="text-xs text-gray-400">No destination data for this period</p>
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

            {/* ── Row 3 removed ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 animate-enter-delay-4" style={{display:"none"}}>
              <ChartCard id="chart-performance-hidden" title="Performance per Advisee" className="lg:col-span-2">
                {performanceData.length > 0 ? (
                  <div>
                    <div className={performanceData.length > 6 ? "overflow-x-auto" : ""}>
                    <div style={performanceData.length > 6 ? { minWidth: performanceData.length * 80 } : undefined}>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={performanceData} barSize={28}>
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
                            const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
                            return (
                              <div className="bg-white border-2 border-[#87c4d8]/30 rounded-lg shadow-lg px-3 py-2">
                                <p className="text-[11px] font-bold text-secondary mb-1">{label} — {total} total</p>
                                {payload.filter((p: any) => p.value > 0).map((p: any, i: number) => (
                                  <p key={i} className="text-[11px]" style={{ color: p.fill }}>
                                    {p.name}: <span className="font-bold">{p.value}</span>
                                  </p>
                                ))}
                              </div>
                            );
                          }}
                          cursor={{ fill: "#87c4d8", fillOpacity: 0.08 }}
                        />
                        <Bar dataKey="Completed" stackId="a" fill={STATUS_COLORS.Completed} radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Ongoing" stackId="a" fill={STATUS_COLORS.Ongoing} />
                        <Bar dataKey="Pending" stackId="a" fill={STATUS_COLORS.Pending} />
                        <Bar dataKey="Deferred" stackId="a" fill={STATUS_COLORS.Deferred} />
                        <Bar dataKey="Blacklisted" stackId="a" fill={STATUS_COLORS.Blacklisted} />
                        <Bar dataKey="Rereferred" name="Re-referred" stackId="a" fill={STATUS_COLORS["Re-referred"]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    </div>
                    </div>
                    {/* Legend */}
                    <div className="flex items-center justify-center gap-4 mt-2">
                      {(["Completed", "Ongoing", "Pending", "Deferred", "Blacklisted", "Re-referred"] as const).map(s => (
                        <div key={s} className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLORS[s] }} />
                          <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[280px] flex items-center justify-center">
                    <p className="text-xs text-gray-400">No performance data available</p>
                  </div>
                )}
              </ChartCard>

              <ChartCard id="chart-origins-hidden" title="Advisee Referral Origins">
                {originsData.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={originsData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={80}
                          paddingAngle={2}
                          strokeWidth={2}
                          stroke="#fff"
                        >
                          {originsData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0];
                            const total = originsData.reduce((s, e) => s + e.value, 0);
                            const pct = ((d.value / total) * 100).toFixed(0);
                            return (
                              <div className="bg-white border-2 border-[#87c4d8]/30 rounded-lg shadow-lg px-3 py-2">
                                <p className="text-[11px] font-bold text-secondary">{d.name}</p>
                                <p className="text-[11px]" style={{ color: d.payload?.fill }}>
                                  {d.value} referral{d.value !== 1 ? "s" : ""} ({pct}%)
                                </p>
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="w-full space-y-1.5 mt-2">
                      {originsData.map((entry, i) => {
                        const total = originsData.reduce((s, e) => s + e.value, 0);
                        const pct = ((entry.value / total) * 100).toFixed(0);
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.fill }} />
                            <span className="text-[10px] text-gray-600 truncate flex-1">{entry.name}</span>
                            <span className="text-[10px] font-bold text-secondary flex-shrink-0">{entry.value}</span>
                            <span className="text-[9px] text-gray-400 flex-shrink-0 w-8 text-right">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-[280px] flex items-center justify-center">
                    <p className="text-xs text-gray-400">No origin data available</p>
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
                  <ResponsiveContainer width="100%" height={180}>
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
                          const cmpW = row.Completed * scale;
                          return (
                            <div key={row.service} title={`${row.service} — Referred: ${row.Referred}, Accepted: ${row.Accepted}, Completed: ${row.Completed}`}>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] font-semibold text-gray-700 truncate">{row.service}</span>
                                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                                  <span className="text-[9px] font-bold text-[#F59E0B]">{row.Referred}</span>
                                  <span className="text-gray-300">/</span>
                                  <span className="text-[9px] font-bold text-[#3B82F6]">{row.Accepted}</span>
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

            {/* ── Row 5: Status Summary (full width) ──── */}
            <div className="grid grid-cols-1 gap-4 mb-4 animate-enter-delay-4">
              <ChartCard id="chart-exceptions" title="Referral Status Summary">
                {exceptionHeatmap.length > 0 ? (
                  <div className="flex flex-col h-[240px]">
                    {/* Search box */}
                    <div className="relative mb-2 px-1">
                      <input
                        type="text"
                        value={heatSearch}
                        onChange={e => setHeatSearch(e.target.value)}
                        placeholder="All Advisees"
                        className="w-full text-[10px] font-semibold rounded-md border border-[#87c4d8]/40 bg-[#87c4d8]/[0.06] px-2 py-1 pr-6 text-secondary placeholder-gray-400 focus:outline-none focus:border-[#5B8AB8]/60 focus:ring-1 focus:ring-[#5B8AB8]/20 transition-all"
                      />
                      {heatSearch ? (
                        <button onClick={() => setHeatSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[10px] leading-none">✕</button>
                      ) : (
                        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#87c4d8]" size={11} strokeWidth={2.5} />
                      )}
                      {heatSearch.trim() && (() => {
                        const q = heatSearch.trim().toLowerCase();
                        const suggestions = exceptionHeatmap.filter(r => r.name.toLowerCase().includes(q) && r.name.toLowerCase() !== q);
                        return suggestions.length > 0 ? (
                          <div className="absolute z-30 left-1 right-1 top-full mt-0.5 bg-white border border-[#87c4d8]/30 rounded-md shadow-lg overflow-hidden">
                            {suggestions.slice(0, 5).map((s, i) => (
                              <button key={i} onClick={() => setHeatSearch(s.name)} className="w-full text-left px-3 py-1.5 text-[10px] text-gray-700 hover:bg-[#87c4d8]/10 transition-colors">{s.name}</button>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </div>
                    {/* Intensity legend */}
                    <div className="flex items-center gap-3 mb-2 px-1">
                      <span className="text-[9px] text-gray-400 font-semibold">Intensity:</span>
                      {[
                        { label: "0", bg: "#f3f4f6" },
                        { label: "1–2", bg: "#fecaca" },
                        { label: "3–4", bg: "#f87171" },
                        { label: "5+", bg: "#b91c1c" },
                      ].map(({ label, bg }) => (
                        <div key={label} className="flex items-center gap-1">
                          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: bg }} />
                          <span className="text-[9px] text-gray-400">{label}</span>
                        </div>
                      ))}
                      <span className="text-[9px] text-gray-300 ml-auto italic">click cell to drill down</span>
                    </div>
                    {/* Heatmap grid */}
                    <div className="flex-1 min-h-0 overflow-auto">
                      <table className="w-full border-collapse text-[9px]">
                        <thead>
                          <tr>
                            <th className="sticky left-0 bg-white z-10 text-left pr-3 pb-1.5 font-semibold text-gray-400 w-[72px]">Advisee</th>
                            {EXCEPTION_COLS.map(col => (
                              <th key={col.key} className="pb-1.5 font-semibold text-center whitespace-nowrap px-1" style={{ color: col.color }}>{col.label}</th>
                            ))}
                            <th className="pb-1.5 font-semibold text-center text-gray-400 px-1">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exceptionHeatmap.filter(r => !heatSearch.trim() || r.name.toLowerCase().includes(heatSearch.trim().toLowerCase())).map(row => {
                            const heatBg = (val: number) => {
                              if (val === 0) return "#f3f4f6";
                              if (val <= 2)  return "#fecaca";
                              if (val <= 4)  return "#f87171";
                              return "#b91c1c";
                            };
                            const heatText = (val: number) => val >= 3 ? "#fff" : val > 0 ? "#7f1d1d" : "#d1d5db";
                            return (
                              <tr key={row.name}>
                                <td className="sticky left-0 bg-white z-10 pr-3 py-0.5 font-semibold text-gray-600 truncate max-w-[72px]" title={row.name}>{row.name}</td>
                                {EXCEPTION_COLS.map(col => {
                                  const val = row[col.key as keyof typeof row] as number;
                                  const isSelected = heatSelectedCell?.advisee === row.name && heatSelectedCell?.colKey === col.key;
                                  return (
                                    <td key={col.key} className="py-0.5 px-1 text-center">
                                      <div
                                        onClick={() => setHeatSelectedCell(val > 0 ? (isSelected ? null : { advisee: row.name, colKey: col.key }) : null)}
                                        className={`rounded mx-auto flex items-center justify-center font-bold transition-all ${val > 0 ? "cursor-pointer hover:ring-2 hover:ring-offset-1" : "cursor-default"} ${isSelected ? "ring-2 ring-offset-1 ring-gray-400" : ""}`}
                                        style={{ backgroundColor: heatBg(val), color: heatText(val), width: 32, height: 22, fontSize: 9, ringColor: col.color }}
                                        title={`${row.name} — ${col.label}: ${val}`}
                                      >
                                        {val > 0 ? val : ""}
                                      </div>
                                    </td>
                                  );
                                })}
                                <td className="py-0.5 px-1 text-center">
                                  <span className={`text-[9px] font-bold ${row.total >= 5 ? "text-red-700" : row.total >= 3 ? "text-orange-500" : "text-gray-400"}`}>{row.total || ""}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {/* Drill-down panel */}
                    {heatSelectedCell && (() => {
                      const row = exceptionHeatmap.find(r => r.name === heatSelectedCell.advisee);
                      const items = row?.details[heatSelectedCell.colKey] || [];
                      const col = EXCEPTION_COLS.find(c => c.key === heatSelectedCell.colKey)!;
                      return items.length > 0 ? (
                        <div className="mt-2 border-t border-gray-100 pt-2">
                          <div className="flex items-center justify-between mb-1 px-1">
                            <p className="text-[10px] font-bold text-gray-600">
                              {heatSelectedCell.advisee} — <span style={{ color: col.color }}>{col.label}</span>
                              <span className="text-gray-400 font-normal ml-1">({items.length} case{items.length !== 1 ? "s" : ""})</span>
                            </p>
                            <button onClick={() => setHeatSelectedCell(null)} className="text-[9px] text-gray-400 hover:text-gray-600">✕</button>
                          </div>
                          <div className="space-y-1 max-h-[80px] overflow-y-auto">
                            {items.map((item, i) => (
                              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1 border border-gray-100">
                                <span className="text-[9px] font-mono text-gray-500 flex-shrink-0">{item.chart}</span>
                                <span className="text-[9px] text-gray-600 truncate">{item.detail}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <div className="h-[240px] flex items-center justify-center">
                    <p className="text-xs text-gray-400">No exceptions or alerts found</p>
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
