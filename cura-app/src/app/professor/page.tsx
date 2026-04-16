"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProfileCard } from "@/components/sidebar/ProfileCard";
import { SchedulePlanner } from "@/components/sidebar/SchedulePlanner";
import { ReferralCard } from "@/components/referrals/ReferralCard";
import { getReferrals, Referral, deleteReferral, approveReferral } from "@/lib/api/referrals";

type ReferralStatus = "ALL" | "PENDING" | "APPROVED" | "DECLINED" | "ONGOING" | "COMPLETED";

export default function ProfessorDashboard() {
  const [activeStatus, setActiveStatus] = useState<ReferralStatus>("ALL");
  const [filterStatus, setFilterStatus] = useState("Active");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [filteredReferrals, setFilteredReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
  const [referralToApprove, setReferralToApprove] = useState<string | null>(null);
  const [isDeclineConfirmOpen, setIsDeclineConfirmOpen] = useState(false);
  const [referralToDecline, setReferralToDecline] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterReferrals();
  }, [activeStatus, filterStatus, referrals]);

  const loadData = async () => {
    try {
      const referralsData = await getReferrals();
      setReferrals(referralsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterReferrals = () => {
    let filtered = referrals;

    // Filter by status tab
    if (activeStatus !== "ALL") {
      filtered = filtered.filter(ref => {
        const status = ref.status?.toUpperCase() || "PENDING";
        
        // For professor dashboard: PENDING tab should show referrals that have been
        // accepted by students (accepted_by is not "None") and still have pending status
        if (activeStatus === "PENDING") {
          return status === "PENDING" && ref.accepted_by && ref.accepted_by !== "None";
        }
        
        return status === activeStatus;
      });
    }

    // Filter by active/inactive
    if (filterStatus === "Active") {
      filtered = filtered.filter(ref => {
        const status = ref.status?.toUpperCase() || "PENDING";
        return status !== "COMPLETED" && status !== "DECLINED";
      });
    }

    setFilteredReferrals(filtered);
  };

  const handleDeleteReferral = async (id: string) => {
    try {
      await deleteReferral(id);
      loadData();
    } catch (error) {
      console.error("Error deleting referral:", error);
    }
  };

  const handleUpdateReferral = (id: string) => {
    console.log("Update referral:", id);
  };

  const handleAcceptReferral = (id: string) => {
    console.log("Accept referral:", id);
  };

  const handleApproveReferral = (id: string) => {
    setReferralToApprove(id);
    setIsApproveConfirmOpen(true);
  };

  const confirmApproveReferral = async () => {
    if (!referralToApprove) return;

    try {
      console.log("Approving referral with ID:", referralToApprove);
      const result = await approveReferral(referralToApprove);
      console.log("Approval result:", result);
      setIsApproveConfirmOpen(false);
      setReferralToApprove(null);
      await loadData();
    } catch (error) {
      console.error("Error approving referral:", error);
      alert("Failed to approve referral. Please check the console for details.");
    }
  };

  const handleDeclineReferral = (id: string) => {
    setReferralToDecline(id);
    setIsDeclineConfirmOpen(true);
  };

  const confirmDeclineReferral = async () => {
    if (!referralToDecline) return;

    try {
      // TODO: Implement decline logic - update referral status to "declined"
      console.log("Declining referral:", referralToDecline);
      setIsDeclineConfirmOpen(false);
      setReferralToDecline(null);
      loadData();
    } catch (error) {
      console.error("Error declining referral:", error);
    }
  };

  const statusTabs: ReferralStatus[] = ["ALL", "PENDING", "APPROVED", "DECLINED", "ONGOING", "COMPLETED"];

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

      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Left Sidebar */}
          <div className="space-y-6">
            <ProfileCard />
            <SchedulePlanner />
          </div>

          {/* Main Content - Referrals */}
          <div className="bg-white/60 backdrop-blur-sm rounded shadow-lg border-2 border-gray-300 overflow-hidden">
            {/* Filter Header */}
            <div className="bg-muted border-b-2 border-gray-300 px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-secondary uppercase tracking-wide">Filter by Status</h2>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-300 rounded text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent bg-white uppercase tracking-wide"
                >
                  <option>Active</option>
                  <option>All</option>
                </select>
              </div>

              {/* Status Tabs */}
              <div className="flex gap-2 flex-wrap">
                {statusTabs.map(status => (
                  <button
                    key={status}
                    onClick={() => setActiveStatus(status)}
                    className={`px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wide transition-all ${
                      activeStatus === status
                        ? "bg-secondary text-white shadow"
                        : "bg-white text-gray-700 hover:bg-muted border-2 border-gray-300"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Referrals List */}
            <div className="p-6 space-y-3 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading referrals...</div>
              ) : filteredReferrals.length > 0 ? (
                filteredReferrals.map((referral) => (
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
                    showAccept={false}
                    showUpdate={true}
                    showApprove={activeStatus === "PENDING"}
                    showDecline={activeStatus === "PENDING"}
                    onUpdate={handleUpdateReferral}
                    onApprove={() => handleApproveReferral(referral.id)}
                    onDecline={() => handleDeclineReferral(referral.id)}
                    onDelete={() => handleDeleteReferral(referral.id)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No referrals found for the selected filter
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Approve Referral Confirmation Dialog */}
      {isApproveConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsApproveConfirmOpen(false)}
          />

          {/* Confirmation Modal */}
          <div className="relative bg-white rounded shadow-2xl border-2 border-gray-300 w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2 uppercase tracking-wide">Approve Referral</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to approve this referral?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsApproveConfirmOpen(false)}
                  className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded hover:bg-muted transition-colors uppercase tracking-wide"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmApproveReferral}
                  className="flex-1 px-6 py-2 bg-success text-white text-xs font-bold rounded hover:bg-success/90 transition-colors shadow uppercase tracking-wide"
                >
                  YES, APPROVE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decline Referral Confirmation Dialog */}
      {isDeclineConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsDeclineConfirmOpen(false)}
          />

          {/* Confirmation Modal */}
          <div className="relative bg-white rounded shadow-2xl border-2 border-gray-300 w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2 uppercase tracking-wide">Decline Referral</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to decline this referral?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeclineConfirmOpen(false)}
                  className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded hover:bg-muted transition-colors uppercase tracking-wide"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmDeclineReferral}
                  className="flex-1 px-6 py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors shadow uppercase tracking-wide"
                >
                  YES, DECLINE
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
