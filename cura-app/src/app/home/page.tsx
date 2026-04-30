"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProfileCard } from "@/components/sidebar/ProfileCard";
import { AcceptedReferralsButton } from "@/components/sidebar/AcceptedReferralsButton";
import { EditRequestsButton } from "@/components/sidebar/EditRequestsButton";
import { SchedulePlanner } from "@/components/sidebar/SchedulePlanner";
import { ReferralCard, MemoizedReferralCard, MemoizedFeaturedReferralCard } from "@/components/referrals/ReferralCard";
import { CreateReferralModal } from "@/components/modals/CreateReferralModal";
import { NewPatientReferralModal } from "@/components/modals/NewPatientReferralModal";
import { ExistingPatientReferralModal } from "@/components/modals/ExistingPatientReferralModal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getReferrals, deleteReferral, acceptReferral, updateReferral, fixStaleAcceptedBy, Referral } from "@/lib/api/referrals";
import { getMockUserProfile, getCurrentUserId, getProfile } from "@/lib/api/profiles";
import { supabase } from "@/lib/supabase";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { filterTaxonomy, ClinicalSection, ClinicalDiscipline, TreatmentService } from "@/lib/data/filterTaxonomy";


export default function HomePage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isExistingPatientModalOpen, setIsExistingPatientModalOpen] = useState(false);
  const [isAcceptConfirmOpen, setIsAcceptConfirmOpen] = useState(false);
  const [referralToAccept, setReferralToAccept] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [referralToDelete, setReferralToDelete] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [featuredReferrals, setFeaturedReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileRefreshTrigger, setProfileRefreshTrigger] = useState(0);
  const [currentUserName, setCurrentUserName] = useState<string>("Unknown User");
  const [acceptedReferralIds, setAcceptedReferralIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getProfile(getCurrentUserId()).then((p) => {
      if (p) {
        const fullName = `${p.first_name} ${p.last_name}`.trim();
        setCurrentUserName(fullName);
        fixStaleAcceptedBy(fullName).catch(() => {});
      }
    }).catch(() => {});

    // Fetch referral IDs accepted by the current user from activity logs
    const fetchAcceptedIds = async () => {
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
    };
    fetchAcceptedIds();
  }, []);
  
  // Advanced Filter State
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("");
  const [selectedTreatment, setSelectedTreatment] = useState<string>("");
  const [specialCaseFilter, setSpecialCaseFilter] = useState<string>("");
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [isDisciplineOpen, setIsDisciplineOpen] = useState(false);
  const [isTreatmentOpen, setIsTreatmentOpen] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const disciplineRef = useRef<HTMLDivElement>(null);
  const treatmentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sectionRef.current && !sectionRef.current.contains(e.target as Node)) setIsSectionOpen(false);
      if (disciplineRef.current && !disciplineRef.current.contains(e.target as Node)) setIsDisciplineOpen(false);
      if (treatmentRef.current && !treatmentRef.current.contains(e.target as Node)) setIsTreatmentOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [filteredReferrals, setFilteredReferrals] = useState<Referral[]>([]);
  const [isAdvancedFilterActive, setIsAdvancedFilterActive] = useState(false);

  // Counts for sidebar badges
  const currentUserId = getCurrentUserId();
  const acceptedCount = useMemo(() => 
    referrals.filter(r => r.is_featured && r.accepted_by && r.accepted_by !== "None" && acceptedReferralIds.has(r.id) && (r.status === "pending" || r.status === "approved")).length,
    [referrals, acceptedReferralIds]
  );
  const editRequestCount = useMemo(() => 
    referrals.filter(r => r.user_id === currentUserId && r.edit_request_status && (r.edit_request_status === "approved" || r.edit_request_status === "declined")).length,
    [referrals, currentUserId]
  );

  useEffect(() => {
    loadReferrals();
  }, []);

  // Auto-play featured referrals carousel
  useEffect(() => {
    if (featuredReferrals.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredReferrals.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [featuredReferrals.length]);

  const loadReferrals = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getReferrals();
      setReferrals(data || []);
      setFilteredReferrals(data || []);
      
      // Get random non-accepted referrals for featured carousel
      const nonAccepted = (data || []).filter(r => r.accepted_by === 'None');
      // Shuffle and take up to 3 random referrals using Fisher-Yates for better performance
      const shuffled = nonAccepted.length > 0 ? [...nonAccepted] : [];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setFeaturedReferrals(shuffled.slice(0, 3));
    } catch (error) {
      console.error("Error loading referrals:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get available disciplines based on selected section
  const getAvailableDisciplines = (): ClinicalDiscipline[] => {
    if (!selectedSection) return [];
    const section = filterTaxonomy.find(s => s.id === selectedSection);
    return section?.clinicalDisciplines || [];
  };

  // Get available treatment services based on selected discipline
  const getAvailableTreatments = (): TreatmentService[] => {
    if (!selectedSection || !selectedDiscipline) return [];
    const section = filterTaxonomy.find(s => s.id === selectedSection);
    const discipline = section?.clinicalDisciplines.find(d => d.id === selectedDiscipline);
    return discipline?.treatmentServices || [];
  };

  // Handle section change - reset dependent filters
  const handleSectionChange = (sectionId: string) => {
    setSelectedSection(sectionId);
    setSelectedTreatment("");
    
    // For Prosthodontics, auto-select the single discipline
    const section = filterTaxonomy.find(s => s.id === sectionId);
    if (sectionId === "prostho" && section?.clinicalDisciplines.length === 1) {
      setSelectedDiscipline(section.clinicalDisciplines[0].id);
    } else {
      setSelectedDiscipline("");
    }
  };

  // Handle discipline change - reset dependent filters
  const handleDisciplineChange = (disciplineId: string) => {
    setSelectedDiscipline(disciplineId);
    setSelectedTreatment("");
  };

  // Handle treatment change
  const handleTreatmentChange = (treatmentId: string) => {
    setSelectedTreatment(treatmentId);
  };

  // Apply filters
  const handleSearch = () => {
    setIsAdvancedFilterActive(true);
    // Start with only non-accepted referrals
    let filtered = referrals.filter(r => r.accepted_by === 'None');
    
    console.log('Starting filter with non-accepted referrals:', filtered.length);

    if (selectedSection) {
      const section = filterTaxonomy.find(s => s.id === selectedSection);
      if (section) {
        console.log('Filtering by section:', section.shortName);
        filtered = filtered.filter(r => {
          console.log('Referral section destination:', r.clinical_section_destination);
          return r.clinical_section_destination === section.shortName;
        });
        console.log('After section filter:', filtered.length);
      }
    }

    if (selectedDiscipline) {
      const section = filterTaxonomy.find(s => s.id === selectedSection);
      const discipline = section?.clinicalDisciplines.find(d => d.id === selectedDiscipline);
      if (discipline) {
        console.log('Filtering by discipline:', discipline.name);
        filtered = filtered.filter(r => {
          console.log('Referral discipline destination:', r.clinical_discipline_destination);
          return r.clinical_discipline_destination === discipline.name;
        });
        console.log('After discipline filter:', filtered.length);
      }
    }

    if (selectedTreatment) {
      const section = filterTaxonomy.find(s => s.id === selectedSection);
      const discipline = section?.clinicalDisciplines.find(d => d.id === selectedDiscipline);
      const treatment = discipline?.treatmentServices.find(t => t.id === selectedTreatment);
      if (treatment) {
        console.log('Filtering by treatment:', treatment.name);
        filtered = filtered.filter(r => {
          console.log('Referral treatment destination:', r.treatment_service_destination);
          return r.treatment_service_destination === treatment.name;
        });
        console.log('After treatment filter:', filtered.length);
      }
    }

    if (specialCaseFilter.trim()) {
      const q = specialCaseFilter.toLowerCase().trim();
      filtered = filtered.filter(r => r.special_case?.toLowerCase().includes(q));
    }

    console.log('Final filtered referrals:', filtered.length);
    setFilteredReferrals(filtered);
  };

  // Reset filters
  const handleResetFilters = () => {
    setSelectedSection("");
    setSelectedDiscipline("");
    setSelectedTreatment("");
    setSpecialCaseFilter("");
    setIsAdvancedFilterActive(false);
    setFilteredReferrals(referrals);
  };

  const handleHeaderSearch = (query: string, category: string) => {
    if (!query.trim()) {
      if (!isAdvancedFilterActive) {
        setFilteredReferrals(referrals);
      }
      return;
    }
    setIsAdvancedFilterActive(false);

    const lowerQuery = query.toLowerCase();
    const filtered = referrals.filter(referral => {
      switch (category) {
        case 'chart_number':
          return referral.chart_number?.toLowerCase().includes(lowerQuery);
        case 'medical_alert':
          return referral.medical_alert?.toLowerCase().includes(lowerQuery);
        case 'origin':
          return (
            referral.clinical_section_origin?.toLowerCase().includes(lowerQuery) ||
            referral.clinical_discipline_origin?.toLowerCase().includes(lowerQuery) ||
            referral.treatment_service_origin?.toLowerCase().includes(lowerQuery)
          );
        case 'destination':
          return (
            referral.clinical_section_destination?.toLowerCase().includes(lowerQuery) ||
            referral.clinical_discipline_destination?.toLowerCase().includes(lowerQuery) ||
            referral.treatment_service_destination?.toLowerCase().includes(lowerQuery)
          );
        case 'medical_history':
          return referral.medical_history?.toLowerCase().includes(lowerQuery);
        case 'approved_by':
          return referral.accepted_by?.toLowerCase().includes(lowerQuery);
        default:
          return false;
      }
    });

    setFilteredReferrals(filtered);
  };

  const handleReferralSaved = () => {
    loadReferrals();
  };

  const handleDeleteReferral = useCallback((id: string) => {
    setReferralToDelete(id);
    setIsDeleteConfirmOpen(true);
  }, []);

  const confirmDeleteReferral = async () => {
    if (!referralToDelete) return;

    try {
      await deleteReferral(referralToDelete);
      setIsDeleteConfirmOpen(false);
      setReferralToDelete(null);
      loadReferrals();
    } catch (error) {
      console.error("Error deleting referral:", error);
      alert("Failed to delete referral. Please try again.");
    }
  };

  const handleUpdateReferral = useCallback(async (id: string, updates: Partial<Referral>) => {
    // Optimistic update — instantly reflect changes in UI
    setReferrals(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    setFilteredReferrals(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    setFeaturedReferrals(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    try {
      await updateReferral(id, updates as any);
    } catch (error: any) {
      console.error("Error updating referral (full):", JSON.stringify(error, null, 2));
      const msg = error?.message || error?.error_description || JSON.stringify(error);
      alert(`Failed to update referral: ${msg}`);
    }
  }, []);

  const handleAcceptReferral = useCallback((id: string) => {
    setReferralToAccept(id);
    setIsAcceptConfirmOpen(true);
  }, []);

  const handleEditRequestSubmitted = useCallback(() => {
    loadReferrals();
  }, [loadReferrals]);

  // Memoize the filtered non-featured referrals to prevent recomputation
  const visibleReferrals = useMemo(() => {
    return filteredReferrals.filter(referral => {
      // Exclude pinned referrals (both pending and approved)
      if (referral.is_featured && (referral.status === 'pending' || referral.status === 'approved')) {
        return false;
      }
      return true;
    });
  }, [filteredReferrals]);

  const confirmAcceptReferral = async () => {
    if (!referralToAccept) return;

    try {
      await acceptReferral(referralToAccept, currentUserName);
      setIsAcceptConfirmOpen(false);
      setReferralToAccept(null);
      loadReferrals();
    } catch (error) {
      console.error("Error accepting referral:", error);
      alert("Failed to accept referral. Please try again.");
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredReferrals.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + featuredReferrals.length) % featuredReferrals.length);
  };

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
        <Header 
          onProfileUpdate={() => setProfileRefreshTrigger(prev => prev + 1)}
          onSearch={handleHeaderSearch}
        />

        <main className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-5 p-4 lg:p-5 max-w-[1400px] mx-auto w-full">
        {/* Left Sidebar - Hidden on mobile, shown on lg+ */}
        <aside className="hidden lg:block w-[200px] flex-shrink-0 space-y-4">
          <ProfileCard refreshTrigger={profileRefreshTrigger} />
          <AcceptedReferralsButton count={acceptedCount} />
          <EditRequestsButton count={editRequestCount} />
          <SchedulePlanner />
        </aside>

        {/* Mobile Profile Card & Buttons - Only shown on mobile */}
        <div className="lg:hidden space-y-3">
          <ProfileCard refreshTrigger={profileRefreshTrigger} />
          <div className="flex gap-3">
            <div className="flex-1">
              <AcceptedReferralsButton count={acceptedCount} />
            </div>
            <div className="flex-1">
              <EditRequestsButton count={editRequestCount} />
            </div>
          </div>
        </div>

        {/* Center Content */}
        <section className="flex-1 order-2 lg:order-none">
          {/* Header with Make New Referral and Filter */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-secondary hover:bg-secondary/90 text-white font-bold px-6 sm:px-8 text-xs sm:text-sm w-full sm:w-auto uppercase tracking-wide shadow"
            >
              MAKE NEW REFERRAL
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground font-semibold">Filter by</span>
              <div className="relative">
                <select className="appearance-none bg-white border-2 border-gray-300 rounded px-3 sm:px-4 py-2 pr-8 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent">
                  <option>Date</option>
                  <option>Status</option>
                  <option>Department</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Referrals List */}
          <div className="space-y-3">
            {loading ? (
              <div className="bg-[#87c4d8]/25 backdrop-blur-sm rounded shadow border border-[#87c4d8]/50 p-8 text-center text-muted-foreground">
                Loading referrals...
              </div>
            ) : visibleReferrals.length === 0 ? (
              <div className="bg-[#87c4d8]/25 backdrop-blur-sm rounded shadow border border-[#87c4d8]/50 p-8 text-center text-muted-foreground">
                No referrals yet. Create your first referral!
              </div>
            ) : (
              visibleReferrals.map((referral) => (
                <MemoizedReferralCard
                  key={referral.id}
                  id={referral.id}
                  title={`Referring ${referral.age || 0} yr. old patient for ${referral.treatment_service_destination}${referral.special_case ? ` (${referral.special_case})` : ''}`}
                  medicalAlert={referral.medical_alert || undefined}
                  clinicalSectionOrigin={referral.clinical_section_origin}
                  clinicalSectionDestination={referral.clinical_section_destination}
                  clinicalDisciplineOrigin={referral.clinical_discipline_origin || undefined}
                  clinicalDisciplineDestination={referral.clinical_discipline_destination || undefined}
                  treatmentServiceOrigin={referral.treatment_service_origin || undefined}
                  treatmentServiceDestination={referral.treatment_service_destination || undefined}
                  notesAndIndications={referral.notes_and_special_indications || undefined}
                  chartNumber={referral.chart_number}
                  acceptedBy={referral.accepted_by}
                  acceptedAt={referral.accepted_at}
                  status={referral.status}
                  showAccept={referral.accepted_by === "None"}
                  createdAt={referral.created_at}
                  treatment={referral.treatment || undefined}
                  medicalHistory={referral.medical_history || undefined}
                  isFeatured={referral.is_featured}
                  specialCase={referral.special_case || undefined}
                  tentativeAppointment={referral.tentative_appointment_schedule || undefined}
                  age={referral.age ?? undefined}
                  userId={referral.user_id}
                  onUpdate={handleUpdateReferral}
                  onAccept={handleAcceptReferral}
                  onDelete={handleDeleteReferral}
                  onEditRequestSubmitted={handleEditRequestSubmitted}
                />
              ))
            )}
          </div>

          {/* Mobile Schedule Planner - Only shown on mobile */}
          <div className="lg:hidden mt-4">
            <SchedulePlanner />
          </div>
        </section>

        {/* Right Sidebar */}
        <aside className="w-full lg:w-[220px] flex-shrink-0 space-y-4 order-1 lg:order-none">
          {/* Advanced Filter Search */}
          <div className="bg-white rounded shadow border-2 border-[#87c4d8]/50">
            <div className="bg-secondary text-white text-xs font-bold py-2.5 px-4 text-center uppercase tracking-wide">
              ADVANCED FILTER SEARCH
            </div>
            <div className="p-4 space-y-3">
              {/* Clinical Section Dropdown */}
              <div ref={sectionRef} className="relative">
                <button
                  type="button"
                  onClick={() => { setIsSectionOpen(p => !p); setIsDisciplineOpen(false); setIsTreatmentOpen(false); }}
                  className="w-full flex items-center justify-between border-2 border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold bg-white hover:border-secondary transition-colors text-left"
                >
                  <span className={selectedSection ? "text-secondary" : "text-gray-400"}>
                    {selectedSection ? filterTaxonomy.find(s => s.id === selectedSection)?.name + " (" + filterTaxonomy.find(s => s.id === selectedSection)?.shortName + ")" : "By Clinical Section"}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform flex-shrink-0 ${isSectionOpen ? "rotate-180" : ""}`} />
                </button>
                {isSectionOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-secondary/30 rounded-lg shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => { handleSectionChange(""); setIsSectionOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${!selectedSection ? "bg-secondary text-white" : "text-gray-500 hover:bg-secondary/10 hover:text-secondary"}`}
                    >
                      By Clinical Section
                    </button>
                    {filterTaxonomy.map(section => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => { handleSectionChange(section.id); setIsSectionOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${selectedSection === section.id ? "bg-secondary text-white" : "text-gray-700 hover:bg-secondary/10 hover:text-secondary"}`}
                      >
                        {section.name} ({section.shortName})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Clinical Discipline Dropdown */}
              {selectedSection !== "prostho" && (
                <div ref={disciplineRef} className="relative">
                  <button
                    type="button"
                    disabled={!selectedSection}
                    onClick={() => { setIsDisciplineOpen(p => !p); setIsSectionOpen(false); setIsTreatmentOpen(false); }}
                    className={`w-full flex items-center justify-between border-2 rounded-lg px-3 py-2 text-xs font-semibold text-left transition-colors ${
                      selectedSection ? "border-gray-200 bg-white hover:border-secondary" : "border-gray-100 bg-gray-50 cursor-not-allowed"
                    }`}
                  >
                    <span className={selectedDiscipline ? "text-secondary" : "text-gray-400"}>
                      {selectedDiscipline ? getAvailableDisciplines().find(d => d.id === selectedDiscipline)?.name : "By Clinical Discipline"}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform flex-shrink-0 ${isDisciplineOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isDisciplineOpen && selectedSection && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-secondary/30 rounded-lg shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => { handleDisciplineChange(""); setIsDisciplineOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${!selectedDiscipline ? "bg-secondary text-white" : "text-gray-500 hover:bg-secondary/10 hover:text-secondary"}`}
                      >
                        By Clinical Discipline
                      </button>
                      {getAvailableDisciplines().map(discipline => (
                        <button
                          key={discipline.id}
                          type="button"
                          onClick={() => { handleDisciplineChange(discipline.id); setIsDisciplineOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${selectedDiscipline === discipline.id ? "bg-secondary text-white" : "text-gray-700 hover:bg-secondary/10 hover:text-secondary"}`}
                        >
                          {discipline.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Treatment Service Dropdown */}
              <div ref={treatmentRef} className="relative">
                {(() => {
                  const isEnabled = !!selectedSection && (!!selectedDiscipline || selectedSection === "prostho");
                  return (
                    <>
                      <button
                        type="button"
                        disabled={!isEnabled}
                        onClick={() => { setIsTreatmentOpen(p => !p); setIsSectionOpen(false); setIsDisciplineOpen(false); }}
                        className={`w-full flex items-center justify-between border-2 rounded-lg px-3 py-2 text-xs font-semibold text-left transition-colors ${
                          isEnabled ? "border-gray-200 bg-white hover:border-secondary" : "border-gray-100 bg-gray-50 cursor-not-allowed"
                        }`}
                      >
                        <span className={selectedTreatment ? "text-secondary" : "text-gray-400"}>
                          {selectedTreatment ? getAvailableTreatments().find(t => t.id === selectedTreatment)?.name : "By Treatment Service"}
                        </span>
                        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform flex-shrink-0 ${isTreatmentOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isTreatmentOpen && isEnabled && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-secondary/30 rounded-lg shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => { handleTreatmentChange(""); setIsTreatmentOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${!selectedTreatment ? "bg-secondary text-white" : "text-gray-500 hover:bg-secondary/10 hover:text-secondary"}`}
                          >
                            By Treatment Service
                          </button>
                          {getAvailableTreatments().map(treatment => (
                            <button
                              key={treatment.id}
                              type="button"
                              onClick={() => { handleTreatmentChange(treatment.id); setIsTreatmentOpen(false); }}
                              className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${selectedTreatment === treatment.id ? "bg-secondary text-white" : "text-gray-700 hover:bg-secondary/10 hover:text-secondary"}`}
                            >
                              {treatment.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Special Case Input */}
              <input
                type="text"
                placeholder="By Special Case"
                value={specialCaseFilter}
                onChange={(e) => setSpecialCaseFilter(e.target.value)}
                disabled={!selectedSection || !selectedDiscipline || !selectedTreatment}
                className={`w-full px-3 py-2.5 text-xs font-semibold border-2 rounded-lg outline-none transition-all ${
                  !selectedSection || !selectedDiscipline || !selectedTreatment
                    ? "border-gray-100 bg-gray-50 text-gray-300 placeholder:text-gray-300 cursor-not-allowed"
                    : "border-gray-200 text-secondary placeholder:text-gray-400 focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                }`}
              />

              <div className="flex gap-2">
                <Button 
                  onClick={handleSearch}
                  className="flex-1 bg-secondary hover:bg-secondary/90 text-white text-xs font-bold uppercase tracking-wide shadow"
                >
                  SEARCH
                </Button>
                {(selectedSection || selectedDiscipline || selectedTreatment || specialCaseFilter) && (
                  <Button 
                    onClick={handleResetFilters}
                    variant="outline"
                    className="text-xs font-bold uppercase tracking-wide border-2 border-gray-200 hover:border-secondary hover:text-secondary"
                  >
                    RESET
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Featured Referrals */}
          <div className="bg-[#87c4d8]/25 backdrop-blur-sm border-2 border-[#87c4d8]/50 rounded shadow overflow-hidden">
            <div className="bg-secondary text-white text-xs font-bold py-2.5 px-4 text-center uppercase tracking-wide">
              FEATURED REFERRALS
            </div>
            <div className="p-4">
              {/* Carousel Container */}
              {featuredReferrals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No non-accepted referrals available
                </div>
              ) : (
                <div className="relative flex items-center">
                  {/* Left Arrow */}
                  {featuredReferrals.length > 1 && (
                    <button
                      onClick={prevSlide}
                      className="absolute -left-2 z-10 text-muted-foreground hover:text-secondary transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}

                  {/* Card */}
                  <div className="mx-4 w-full">
                    {featuredReferrals[currentSlide] && (
                      <MemoizedFeaturedReferralCard
                        id={featuredReferrals[currentSlide].id}
                        title={`Referring ${featuredReferrals[currentSlide].age || 0} yr. old patient for ${featuredReferrals[currentSlide].treatment_service_destination}${featuredReferrals[currentSlide].special_case ? ` (${featuredReferrals[currentSlide].special_case})` : ''}`}
                        medicalAlert={featuredReferrals[currentSlide].medical_alert || undefined}
                        clinicalSectionOrigin={featuredReferrals[currentSlide].clinical_section_origin}
                        clinicalSectionDestination={featuredReferrals[currentSlide].clinical_section_destination}
                        clinicalDisciplineOrigin={featuredReferrals[currentSlide].clinical_discipline_origin || undefined}
                        clinicalDisciplineDestination={featuredReferrals[currentSlide].clinical_discipline_destination || undefined}
                        treatmentServiceOrigin={featuredReferrals[currentSlide].treatment_service_origin || undefined}
                        treatmentServiceDestination={featuredReferrals[currentSlide].treatment_service_destination || undefined}
                        notesAndIndications={featuredReferrals[currentSlide].notes_and_special_indications || undefined}
                        chartNumber={featuredReferrals[currentSlide].chart_number}
                        acceptedBy={featuredReferrals[currentSlide].accepted_by}
                        acceptedAt={featuredReferrals[currentSlide].accepted_at}
                        status={featuredReferrals[currentSlide].status}
                        createdAt={featuredReferrals[currentSlide].created_at}
                        treatment={featuredReferrals[currentSlide].treatment || undefined}
                        medicalHistory={featuredReferrals[currentSlide].medical_history || undefined}
                        isFeatured={featuredReferrals[currentSlide].is_featured}
                        specialCase={featuredReferrals[currentSlide].special_case || undefined}
                        tentativeAppointment={featuredReferrals[currentSlide].tentative_appointment_schedule || undefined}
                        age={featuredReferrals[currentSlide].age ?? undefined}
                        userId={featuredReferrals[currentSlide].user_id}
                        onAccept={handleAcceptReferral}
                        onUpdate={handleUpdateReferral}
                        onDelete={handleDeleteReferral}
                        onEditRequestSubmitted={handleEditRequestSubmitted}
                      />
                    )}
                  </div>

                  {/* Right Arrow */}
                  {featuredReferrals.length > 1 && (
                    <button
                      onClick={nextSlide}
                      className="absolute -right-2 z-10 text-muted-foreground hover:text-secondary transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}
                </div>
              )}

              {/* Dot Indicators */}
              <div className="flex justify-center gap-2 mt-4">
                {featuredReferrals.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors border-2 ${
                      idx === currentSlide 
                        ? "bg-secondary border-secondary" 
                        : "bg-gray-300 border-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </aside>
      </main>

      <Footer />

      <CreateReferralModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onNewPatient={() => setIsNewPatientModalOpen(true)}
        onExistingPatient={() => setIsExistingPatientModalOpen(true)}
      />

      <NewPatientReferralModal
        open={isNewPatientModalOpen}
        onOpenChange={setIsNewPatientModalOpen}
        onSave={handleReferralSaved}
      />

      <ExistingPatientReferralModal
        open={isExistingPatientModalOpen}
        onOpenChange={setIsExistingPatientModalOpen}
        onSave={handleReferralSaved}
      />

      {/* Delete Referral Confirmation Dialog */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsDeleteConfirmOpen(false)}
          />

          {/* Confirmation Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2">Delete Referral</h3>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete this referral? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmDeleteReferral}
                  className="flex-1 px-6 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
                >
                  YES, DELETE
                </button>
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accept Referral Confirmation Dialog */}
      {isAcceptConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsAcceptConfirmOpen(false)}
          />

          {/* Confirmation Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-secondary/10 mb-4">
                <svg className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2">Confirm Acceptance</h3>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to accept this referral?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmAcceptReferral}
                  className="flex-1 px-6 py-2 bg-secondary text-white text-xs font-bold rounded-lg hover:bg-secondary/90 transition-colors"
                >
                  YES, ACCEPT
                </button>
                <button
                  onClick={() => setIsAcceptConfirmOpen(false)}
                  className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
    </RouteGuard>
  );
}
