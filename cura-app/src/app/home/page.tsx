"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProfileCard } from "@/components/sidebar/ProfileCard";
import { AcceptedReferralsButton } from "@/components/sidebar/AcceptedReferralsButton";
import { SchedulePlanner } from "@/components/sidebar/SchedulePlanner";
import { ReferralCard, FeaturedReferralCard } from "@/components/referrals/ReferralCard";
import { CreateReferralModal } from "@/components/modals/CreateReferralModal";
import { NewPatientReferralModal } from "@/components/modals/NewPatientReferralModal";
import { ExistingPatientReferralModal } from "@/components/modals/ExistingPatientReferralModal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getReferrals, deleteReferral, acceptReferral, updateReferral, Referral } from "@/lib/api/referrals";
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
  
  // Advanced Filter State
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("");
  const [selectedTreatment, setSelectedTreatment] = useState<string>("");
  const [filteredReferrals, setFilteredReferrals] = useState<Referral[]>([]);
  const [isAdvancedFilterActive, setIsAdvancedFilterActive] = useState(false);

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

  const loadReferrals = async () => {
    try {
      setLoading(true);
      const data = await getReferrals();
      setReferrals(data || []);
      setFilteredReferrals(data || []);
      
      // Get random non-accepted referrals for featured carousel
      const nonAccepted = (data || []).filter(r => r.accepted_by === 'None');
      // Shuffle and take up to 3 random referrals
      const shuffled = [...nonAccepted].sort(() => Math.random() - 0.5);
      setFeaturedReferrals(shuffled.slice(0, 3));
    } catch (error) {
      console.error("Error loading referrals:", error);
    } finally {
      setLoading(false);
    }
  };

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

    console.log('Final filtered referrals:', filtered.length);
    setFilteredReferrals(filtered);
  };

  // Reset filters
  const handleResetFilters = () => {
    setSelectedSection("");
    setSelectedDiscipline("");
    setSelectedTreatment("");
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

  const handleDeleteReferral = (id: string) => {
    setReferralToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

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

  const handleUpdateReferral = async (id: string, updates: Partial<Referral>) => {
    try {
      // Convert Referral updates to ReferralFormData format
      const formDataUpdates = {
        chart_number: updates.chart_number,
        treatment: updates.treatment || undefined,
        age: updates.age || undefined,
        medical_alert: updates.medical_alert || undefined,
        clinical_section_origin: updates.clinical_section_origin,
        clinical_section_destination: updates.clinical_section_destination,
        clinical_discipline_origin: updates.clinical_discipline_origin || undefined,
        clinical_discipline_destination: updates.clinical_discipline_destination || undefined,
        treatment_service_origin: updates.treatment_service_origin || undefined,
        treatment_service_destination: updates.treatment_service_destination || undefined,
        medical_history: updates.medical_history || undefined,
        notes_and_special_indications: updates.notes_and_special_indications || undefined,
      };
      await updateReferral(id, formDataUpdates);
      loadReferrals();
    } catch (error) {
      console.error("Error updating referral:", error);
      alert("Failed to update referral. Please try again.");
    }
  };

  const handleAcceptReferral = (id: string) => {
    setReferralToAccept(id);
    setIsAcceptConfirmOpen(true);
  };

  const confirmAcceptReferral = async () => {
    if (!referralToAccept) return;

    try {
      await acceptReferral(referralToAccept, "Dr. Smith");
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
          <AcceptedReferralsButton />
          <SchedulePlanner />
        </aside>

        {/* Mobile Profile Card - Only shown on mobile */}
        <div className="lg:hidden">
          <ProfileCard refreshTrigger={profileRefreshTrigger} />
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
              <div className="bg-white/60 backdrop-blur-sm rounded shadow border border-gray-300 p-8 text-center text-muted-foreground">
                Loading referrals...
              </div>
            ) : filteredReferrals.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-sm rounded shadow border border-gray-300 p-8 text-center text-muted-foreground">
                No referrals yet. Create your first referral!
              </div>
            ) : (
              filteredReferrals
                .filter(referral => {
                  // Exclude pinned referrals (both pending and approved)
                  if (referral.is_featured && (referral.status === 'pending' || referral.status === 'approved')) {
                    return false;
                  }
                  return true;
                })
                .map((referral) => {
                  const age = referral.age || 0;
                  const specialCase = referral.special_case ? ` (${referral.special_case})` : '';
                  const title = `Referring ${age} yr. old patient for ${referral.treatment_service_destination}${specialCase}`;
                  
                  return (
                    <ReferralCard
                      key={referral.id}
                      id={referral.id}
                      title={title}
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
                      status={referral.status}
                      showAccept={referral.accepted_by === "None"}
                      createdAt={referral.created_at}
                      treatment={referral.treatment || undefined}
                      medicalHistory={referral.medical_history || undefined}
                      isFeatured={referral.is_featured}
                      onUpdate={(id: string, updates: Partial<Referral>) => handleUpdateReferral(id, updates)}
                      onAccept={() => handleAcceptReferral(referral.id)}
                      onDelete={handleDeleteReferral}
                    />
                  );
                })
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
          <div className="bg-white/60 backdrop-blur-sm rounded shadow border-2 border-gray-300">
            <div className="bg-secondary text-white text-xs font-bold py-2.5 px-4 text-center uppercase tracking-wide">
              ADVANCED FILTER SEARCH
            </div>
            <div className="p-4 space-y-3">
              {/* Clinical Section Dropdown */}
              <div className="relative">
                <select 
                  value={selectedSection}
                  onChange={(e) => handleSectionChange(e.target.value)}
                  className="w-full bg-white border-2 border-gray-300 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">By Clinical Section</option>
                  {filterTaxonomy.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name} ({section.shortName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Clinical Discipline Dropdown - Only enabled if section is selected, hidden for Prosthodontics */}
              {selectedSection !== "prostho" && (
                <div className="relative">
                  <select 
                    value={selectedDiscipline}
                    onChange={(e) => handleDisciplineChange(e.target.value)}
                    disabled={!selectedSection}
                    className={`w-full border-2 rounded px-3 py-2 text-xs font-semibold focus:outline-none ${
                      selectedSection 
                        ? 'bg-white border-gray-300 focus:ring-2 focus:ring-accent text-gray-900' 
                        : 'bg-muted border-gray-300 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <option value="">By Clinical Discipline</option>
                    {getAvailableDisciplines().map((discipline) => (
                      <option key={discipline.id} value={discipline.id}>
                        {discipline.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Treatment Service Dropdown - Only enabled if both section and discipline are selected (or Prosthodontics) */}
              <div className="relative">
                <select 
                  value={selectedTreatment}
                  onChange={(e) => handleTreatmentChange(e.target.value)}
                  disabled={!selectedSection || (!selectedDiscipline && selectedSection !== "prostho")}
                  className={`w-full border-2 rounded px-3 py-2 text-xs font-semibold focus:outline-none ${
                    selectedSection && (selectedDiscipline || selectedSection === "prostho")
                      ? 'bg-white border-gray-300 focus:ring-2 focus:ring-accent text-gray-900' 
                      : 'bg-muted border-gray-300 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <option value="">By Treatment Service</option>
                  {getAvailableTreatments().map((treatment) => (
                    <option key={treatment.id} value={treatment.id}>
                      {treatment.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleSearch}
                  className="flex-1 bg-secondary hover:bg-secondary/90 text-white text-xs font-bold uppercase tracking-wide shadow"
                >
                  SEARCH
                </Button>
                {(selectedSection || selectedDiscipline || selectedTreatment) && (
                  <Button 
                    onClick={handleResetFilters}
                    variant="outline"
                    className="text-xs font-bold uppercase tracking-wide"
                  >
                    RESET
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Featured Referrals */}
          <div className="bg-white/60 backdrop-blur-sm border-2 border-gray-300 rounded shadow overflow-hidden">
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
                      <FeaturedReferralCard
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
                        status={featuredReferrals[currentSlide].status}
                        createdAt={featuredReferrals[currentSlide].created_at}
                        treatment={featuredReferrals[currentSlide].treatment || undefined}
                        medicalHistory={featuredReferrals[currentSlide].medical_history || undefined}
                        isFeatured={featuredReferrals[currentSlide].is_featured}
                        onAccept={() => handleAcceptReferral(featuredReferrals[currentSlide].id)}
                        onUpdate={(id, updates) => handleUpdateReferral(id, updates)}
                        onDelete={handleDeleteReferral}
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
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmDeleteReferral}
                  className="flex-1 px-6 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
                >
                  YES, DELETE
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
                  onClick={() => setIsAcceptConfirmOpen(false)}
                  className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmAcceptReferral}
                  className="flex-1 px-6 py-2 bg-secondary text-white text-xs font-bold rounded-lg hover:bg-secondary/90 transition-colors"
                >
                  YES, ACCEPT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
