"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProfileCard } from "@/components/sidebar/ProfileCard";
import { SchedulePlanner } from "@/components/sidebar/SchedulePlanner";
import { ReferralCard } from "@/components/referrals/ReferralCard";
import { getReferrals, deleteReferral, updateReferral, Referral } from "@/lib/api/referrals";
import { getCurrentUserId } from "@/lib/api/profiles";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function EditRequestsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("medical_alert");

  const handleHeaderSearch = useCallback((query: string, category: string) => {
    setSearchQuery(query);
    setSearchCategory(category);
  }, []);

  useEffect(() => {
    loadReferrals();
  }, []);

  const loadReferrals = useCallback(async () => {
    try {
      const data = await getReferrals(false);
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

  const handleUpdateReferral = useCallback(async (id: string, updates: Partial<Referral>) => {
    try {
      await updateReferral(id, updates as any);
      loadReferrals();
    } catch (error) {
      console.error("Error updating referral:", error);
    }
  }, [loadReferrals]);

  const handleCancelEditRequest = useCallback(async (id: string) => {
    try {
      await updateReferral(id, { edit_request_reason: null, edit_request_status: null } as any);
      loadReferrals();
    } catch (error) {
      console.error("Error cancelling edit request:", error);
    }
  }, [loadReferrals]);

  const currentUserId = getCurrentUserId();

  // Memoize filtered edit requests
  const editRequests = useMemo(() => 
    referrals.filter(
      (referral) =>
        referral.user_id === currentUserId &&
        referral.edit_request_status &&
        (referral.edit_request_status === "pending" || referral.edit_request_status === "approved" || referral.edit_request_status === "declined")
    ),
    [referrals, currentUserId]
  );

  const searchedEditRequests = useMemo(() => {
    if (!searchQuery.trim()) return editRequests;
    const lowerQuery = searchQuery.toLowerCase();
    return editRequests.filter(r => {
      switch (searchCategory) {
        case "medical_alert": return r.medical_alert?.toLowerCase().includes(lowerQuery);
        case "origin": return r.clinical_section_origin?.toLowerCase().includes(lowerQuery) || r.clinical_discipline_origin?.toLowerCase().includes(lowerQuery) || r.treatment_service_origin?.toLowerCase().includes(lowerQuery);
        case "destination": return r.clinical_section_destination?.toLowerCase().includes(lowerQuery) || r.clinical_discipline_destination?.toLowerCase().includes(lowerQuery) || r.treatment_service_destination?.toLowerCase().includes(lowerQuery);
        case "created_by": return r.chart_number?.toLowerCase().includes(lowerQuery);
        case "accepted_by": return r.accepted_by?.toLowerCase().includes(lowerQuery);
        default: return true;
      }
    });
  }, [editRequests, searchQuery, searchCategory]);

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
        <Header onSearch={handleHeaderSearch} />

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
              EDIT REQUESTS
            </div>

            {/* Edit Requests List */}
            <div className="space-y-3">
              {loading ? (
                <div className="bg-white/60 backdrop-blur-sm rounded shadow border border-gray-300 p-8 text-center text-muted-foreground">
                  Loading edit requests...
                </div>
              ) : searchedEditRequests.length === 0 ? (
                <div className="bg-white/60 backdrop-blur-sm rounded shadow border border-gray-300 p-8 text-center text-muted-foreground">
                  {searchQuery.trim() ? "No referrals match your search." : "No edit requests yet."}
                </div>
              ) : (
                searchedEditRequests.map((referral) => (
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
                    showUpdate={true}
                    age={referral.age ?? undefined}
                    sex={referral.sex}
                    userId={referral.user_id}
                    editRequestPage={true}
                    editRequestReason={referral.edit_request_reason}
                    editRequestStatus={referral.edit_request_status}
                    rereferRequestStatus={referral.rerefer_request_status}
                    rereferRequestReason={referral.rerefer_request_reason}
                    deletionRequestStatus={referral.deletion_request_status}
                    onUpdate={handleUpdateReferral}
                    onDelete={() => handleDeleteReferral(referral.id)}
                    onEditRequestSubmitted={loadReferrals}
                    onCancelEditRequest={handleCancelEditRequest}
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
