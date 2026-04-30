"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProfileCard } from "@/components/sidebar/ProfileCard";
import { SchedulePlanner } from "@/components/sidebar/SchedulePlanner";
import { ReferralCard } from "@/components/referrals/ReferralCard";
import { getReferrals, deleteReferral, updateReferral, Referral } from "@/lib/api/referrals";
import { getCurrentUserId, getProfile } from "@/lib/api/profiles";
import { supabase } from "@/lib/supabase";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function AcceptedReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [acceptedReferralIds, setAcceptedReferralIds] = useState<Set<string>>(new Set());
  const [logsLoaded, setLogsLoaded] = useState(false);

  useEffect(() => {
    const fetchUserName = async () => {
      const profile = await getProfile(getCurrentUserId());
      if (profile) {
        setCurrentUserName(`${profile.first_name} ${profile.last_name}`);
      }
    };
    const fetchAcceptedByCurrentUser = async () => {
      const userId = getCurrentUserId();
      const { data } = await (supabase.from("activity_logs") as any)
        .select("metadata")
        .eq("action", "ACCEPT_REFERRAL")
        .eq("user_id", userId);
      if (data) {
        const ids = new Set<string>(
          (data as any[]).map((log: any) => {
            try {
              const parsed = typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata;
              return parsed?.referral_id;
            } catch { return null; }
          }).filter(Boolean)
        );
        setAcceptedReferralIds(ids);
      }
      setLogsLoaded(true);
    };
    fetchUserName();
    fetchAcceptedByCurrentUser();
    loadReferrals();
  }, []);

  const loadReferrals = useCallback(async () => {
    try {
      const data = await getReferrals(false); // Bypass cache for fresh data
      setReferrals(data || []);
    } catch (error) {
      console.error("Error loading referrals:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteReferral = useCallback(async (id: string) => {
    try {
      await deleteReferral(id);
      loadReferrals();
    } catch (error) {
      console.error("Error deleting referral:", error);
    }
  }, [loadReferrals]);

  const handleUpdateReferral = (id: string) => {
    console.log("Update referral:", id);
  };

  const handleStatusChange = useCallback(async (id: string, newStatus: string) => {
    try {
      await updateReferral(id, { referral_status: newStatus } as any);
      loadReferrals();
    } catch (error) {
      console.error("Error updating referral status:", error);
    }
  }, [loadReferrals]);

  // Only show referrals accepted by the current user, identified by activity log
  const acceptedReferrals = useMemo(() => {
    if (!logsLoaded) return [];
    return referrals.filter(
      (referral) =>
        referral.is_featured &&
        referral.accepted_by &&
        referral.accepted_by !== "None" &&
        acceptedReferralIds.has(referral.id) &&
        (referral.status === "pending" || referral.status === "approved")
    );
  }, [referrals, acceptedReferralIds, logsLoaded]);

  return (
    <RouteGuard allowedRoles={["clinician"]}>
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

        <main className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-5 p-4 lg:p-5 max-w-[1400px] mx-auto w-full">
          {/* Left Sidebar - Hidden on mobile, shown on lg+ */}
          <aside className="hidden lg:block w-[200px] flex-shrink-0 space-y-4">
            <ProfileCard />
            <SchedulePlanner />
          </aside>

          {/* Mobile Profile Card - Only shown on mobile */}
          <div className="lg:hidden">
            <ProfileCard />
          </div>

          {/* Main Content */}
          <section className="flex-1">
            {/* Back to Home Link */}
            <Link href="/home" className="text-secondary text-sm mb-4 inline-block hover:underline font-semibold">
              ← Back to Home
            </Link>

            {/* Page Header */}
            <div className="bg-secondary text-white text-sm font-bold py-3 px-5 rounded shadow mb-5 uppercase tracking-wide">
              ACCEPTED REFERRALS
            </div>

            {/* Accepted Referrals List */}
            <div className="space-y-3">
              {loading ? (
                <div className="bg-white/60 backdrop-blur-sm rounded shadow border border-gray-300 p-8 text-center text-muted-foreground">
                  Loading accepted referrals...
                </div>
              ) : acceptedReferrals.length === 0 ? (
                <div className="bg-white/60 backdrop-blur-sm rounded shadow border border-gray-300 p-8 text-center text-muted-foreground">
                  No accepted referrals yet.
                </div>
              ) : (
                acceptedReferrals.map((referral) => (
                  <ReferralCard
                    key={referral.id}
                    id={referral.id}
                    title={`Referring ${referral.age} yr. old patient for ${referral.treatment_service_destination}${referral.special_case ? ` (${referral.special_case})` : ''}`}
                    medicalAlert={referral.medical_alert || undefined}
                    clinicalSectionOrigin={referral.clinical_section_origin || undefined}
                    clinicalSectionDestination={referral.clinical_section_destination}
                    clinicalDisciplineOrigin={referral.clinical_discipline_origin || undefined}
                    clinicalDisciplineDestination={referral.clinical_discipline_destination || undefined}
                    treatmentServiceOrigin={referral.treatment_service_origin || undefined}
                    treatmentServiceDestination={referral.treatment_service_destination || undefined}
                    notesAndIndications={referral.notes_and_special_indications || undefined}
                    chartNumber={referral.chart_number}
                    acceptedBy={referral.accepted_by || undefined}
                    acceptedAt={referral.accepted_at}
                    status={referral.status}
                    showAccept={false}
                    showUpdate={false}
                    userId={referral.user_id}
                    acceptedReferralsPage={true}
                    referralStatus={referral.referral_status}
                    rereferRequestStatus={referral.rerefer_request_status}
                    onStatusChange={handleStatusChange}
                    onRerefer={() => loadReferrals()}
                    onDelete={() => handleDeleteReferral(referral.id)}
                  />
                ))
              )}
            </div>

            {/* Mobile Schedule Planner - Only shown on mobile */}
            <div className="lg:hidden mt-4">
              <SchedulePlanner />
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </div>
    </RouteGuard>
  );
}
