"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProfileCard } from "@/components/sidebar/ProfileCard";
import { SchedulePlanner } from "@/components/sidebar/SchedulePlanner";
import { ReferralCard, FeaturedReferralCard } from "@/components/referrals/ReferralCard";
import { CreateReferralModal } from "@/components/modals/CreateReferralModal";
import { NewPatientReferralModal } from "@/components/modals/NewPatientReferralModal";
import { ExistingPatientReferralModal } from "@/components/modals/ExistingPatientReferralModal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getReferrals, deleteReferral, acceptReferral, Referral } from "@/lib/api/referrals";
import { filterTaxonomy, ClinicalSection, ClinicalDiscipline, TreatmentService } from "@/lib/data/filterTaxonomy";


export default function HomePage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isExistingPatientModalOpen, setIsExistingPatientModalOpen] = useState(false);
  const [isAcceptConfirmOpen, setIsAcceptConfirmOpen] = useState(false);
  const [referralToAccept, setReferralToAccept] = useState<string | null>(null);
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
    setSelectedDiscipline("");
    setSelectedTreatment("");
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
    // Start with only non-accepted referrals
    let filtered = referrals.filter(r => r.accepted_by === 'None');

    if (selectedSection) {
      const section = filterTaxonomy.find(s => s.id === selectedSection);
      if (section) {
        filtered = filtered.filter(r => 
          r.clinical_section_destination === section.shortName
        );
      }
    }

    if (selectedDiscipline) {
      const section = filterTaxonomy.find(s => s.id === selectedSection);
      const discipline = section?.clinicalDisciplines.find(d => d.id === selectedDiscipline);
      if (discipline) {
        filtered = filtered.filter(r => 
          r.clinical_discipline_destination === discipline.name
        );
      }
    }

    if (selectedTreatment) {
      const section = filterTaxonomy.find(s => s.id === selectedSection);
      const discipline = section?.clinicalDisciplines.find(d => d.id === selectedDiscipline);
      const treatment = discipline?.treatmentServices.find(t => t.id === selectedTreatment);
      if (treatment) {
        filtered = filtered.filter(r => 
          r.treatment_service_destination === treatment.name
        );
      }
    }

    setFilteredReferrals(filtered);
  };

  // Reset filters
  const handleResetFilters = () => {
    setSelectedSection("");
    setSelectedDiscipline("");
    setSelectedTreatment("");
    setFilteredReferrals(referrals);
  };

  const handleHeaderSearch = (query: string, category: string) => {
    if (!query.trim()) {
      setFilteredReferrals(referrals);
      return;
    }

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

  const handleDeleteReferral = async (id: string) => {
    if (!confirm("Are you sure you want to delete this referral?")) {
      return;
    }

    try {
      await deleteReferral(id);
      loadReferrals();
    } catch (error) {
      console.error("Error deleting referral:", error);
      alert("Failed to delete referral. Please try again.");
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
    <div className="min-h-screen flex flex-col bg-background">
      <Header 
        onProfileUpdate={() => setProfileRefreshTrigger(prev => prev + 1)}
        onSearch={handleHeaderSearch}
      />

      <main className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-5 p-4 lg:p-5 max-w-[1400px] mx-auto w-full">
        {/* Left Sidebar - Hidden on mobile, shown on lg+ */}
        <aside className="hidden lg:block w-[200px] flex-shrink-0 space-y-4">
          <ProfileCard refreshTrigger={profileRefreshTrigger} />
          <SchedulePlanner />
        </aside>

        {/* Mobile Profile Card - Only shown on mobile */}
        <div className="lg:hidden">
          <ProfileCard refreshTrigger={profileRefreshTrigger} />
        </div>

        {/* Center Content */}
        <section className="flex-1 order-2 lg:order-none">
          {/* Header with Make New Referral and Filter */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-secondary hover:bg-secondary/90 text-white font-semibold px-4 sm:px-6 text-sm sm:text-base w-full sm:w-auto"
            >
              MAKE NEW REFERRAL
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-gray-600">Filter by</span>
              <div className="relative">
                <select className="appearance-none bg-white border border-gray-300 rounded px-3 sm:px-4 py-2 pr-8 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Date</option>
                  <option>Status</option>
                  <option>Department</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Pinned/Featured Referrals - Accepted with Pending Status */}
          {referrals.filter(r => r.is_featured && r.status === 'pending').length > 0 && (
            <div className="mb-6">
              <div className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg p-3 sm:p-4 border-2 border-primary/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-secondary text-white text-xs font-bold px-3 py-1 rounded">
                    PINNED
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-secondary">Accepted Referrals</span>
                </div>
                <div className="space-y-3">
                  {referrals
                    .filter(r => r.is_featured && r.status === 'pending')
                    .map((referral) => {
                      const age = referral.age || 0;
                      const title = `Referring ${age} yr. old patient for ${referral.clinical_section_destination}`;
                      
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
                          showAccept={false}
                          onUpdate={() => console.log("Update", referral.id)}
                          onAccept={() => handleAcceptReferral(referral.id)}
                          onDelete={handleDeleteReferral}
                        />
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* Referrals List */}
          <div className="space-y-4">
            {loading ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
                Loading referrals...
              </div>
            ) : filteredReferrals.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
                No referrals yet. Create your first referral!
              </div>
            ) : (
              filteredReferrals
                .filter(referral => !(referral.is_featured && referral.status === 'pending'))
                .map((referral) => {
                  const age = referral.age || 0;
                  const title = `Referring ${age} yr. old patient for ${referral.clinical_section_destination}`;
                  
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
                      onUpdate={() => console.log("Update", referral.id)}
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
          <div className="bg-white rounded-lg shadow-sm">
            <div className="bg-secondary text-white text-xs font-semibold py-2 px-4 rounded-t-lg text-center">
              ADVANCED FILTER SEARCH (CLINICAL DESTINATION)
            </div>
            <div className="p-3 space-y-3">
              {/* Clinical Section Dropdown */}
              <div className="relative">
                <select 
                  value={selectedSection}
                  onChange={(e) => handleSectionChange(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">By Clinical Section</option>
                  {filterTaxonomy.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name} ({section.shortName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Clinical Discipline Dropdown - Only enabled if section is selected */}
              <div className="relative">
                <select 
                  value={selectedDiscipline}
                  onChange={(e) => handleDisciplineChange(e.target.value)}
                  disabled={!selectedSection}
                  className={`w-full border rounded px-3 py-2 text-xs focus:outline-none ${
                    selectedSection 
                      ? 'bg-white border-gray-300 focus:ring-2 focus:ring-primary text-gray-900' 
                      : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
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

              {/* Treatment Service Dropdown - Only enabled if both section and discipline are selected */}
              <div className="relative">
                <select 
                  value={selectedTreatment}
                  onChange={(e) => handleTreatmentChange(e.target.value)}
                  disabled={!selectedSection || !selectedDiscipline}
                  className={`w-full border rounded px-3 py-2 text-xs focus:outline-none ${
                    selectedSection && selectedDiscipline
                      ? 'bg-white border-gray-300 focus:ring-2 focus:ring-primary text-gray-900' 
                      : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
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
                  className="flex-1 bg-secondary hover:bg-secondary/90 text-white text-xs font-semibold"
                >
                  SEARCH
                </Button>
                {(selectedSection || selectedDiscipline || selectedTreatment) && (
                  <Button 
                    onClick={handleResetFilters}
                    variant="outline"
                    className="text-xs font-semibold"
                  >
                    RESET
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Featured Referrals */}
          <div className="bg-[#c5ddf5] rounded-2xl overflow-hidden">
            <div className="bg-secondary text-white text-xs font-bold py-2.5 px-4 text-center">
              FEATURED REFERRALS
            </div>
            <div className="p-4">
              {/* Carousel Container */}
              {featuredReferrals.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No non-accepted referrals available
                </div>
              ) : (
                <div className="relative flex items-center">
                  {/* Left Arrow */}
                  {featuredReferrals.length > 1 && (
                    <button
                      onClick={prevSlide}
                      className="absolute -left-2 z-10 text-gray-400 hover:text-secondary transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}

                  {/* Card */}
                  <div className="mx-4 w-full">
                    {featuredReferrals[currentSlide] && (
                      <FeaturedReferralCard
                        title={`Referring ${featuredReferrals[currentSlide].age || 0} yr. old patient for ${featuredReferrals[currentSlide].clinical_section_destination}`}
                        medicalAlert={featuredReferrals[currentSlide].medical_alert || undefined}
                        clinicalSectionOrigin={featuredReferrals[currentSlide].clinical_section_origin}
                        clinicalSectionDestination={featuredReferrals[currentSlide].clinical_section_destination}
                        clinicalDisciplineOrigin={featuredReferrals[currentSlide].clinical_discipline_origin || undefined}
                        clinicalDisciplineDestination={featuredReferrals[currentSlide].clinical_discipline_destination || undefined}
                        treatmentServiceOrigin={featuredReferrals[currentSlide].treatment_service_origin || undefined}
                        treatmentServiceDestination={featuredReferrals[currentSlide].treatment_service_destination || undefined}
                        notesAndIndications={featuredReferrals[currentSlide].notes_and_special_indications || undefined}
                        chartNumber={featuredReferrals[currentSlide].chart_number}
                        onAccept={() => handleAcceptReferral(featuredReferrals[currentSlide].id)}
                      />
                    )}
                  </div>

                  {/* Right Arrow */}
                  {featuredReferrals.length > 1 && (
                    <button
                      onClick={nextSlide}
                      className="absolute -right-2 z-10 text-gray-400 hover:text-secondary transition-colors"
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
                    className={`w-3 h-3 rounded-full transition-colors border-2 ${
                      idx === currentSlide 
                        ? "bg-secondary border-secondary" 
                        : "bg-white border-white shadow-sm"
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

      {/* Accept Referral Confirmation Dialog */}
      <Dialog open={isAcceptConfirmOpen} onOpenChange={setIsAcceptConfirmOpen}>
        <DialogContent className="bg-[#f5f0e1] max-w-[400px] p-0 gap-0 rounded-lg overflow-hidden border-2 border-primary">
          {/* Header */}
          <div className="bg-secondary p-4 text-center">
            <h2 className="text-white font-bold text-base">CONFIRM ACCEPTANCE</h2>
          </div>

          {/* Content */}
          <div className="p-6 text-center">
            <p className="text-secondary text-sm mb-6">
              Are you sure you want to accept this referral?
            </p>

            {/* Buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={confirmAcceptReferral}
                className="px-6 py-2 bg-secondary text-white text-sm font-semibold rounded hover:bg-secondary/90 transition-colors"
              >
                YES, ACCEPT
              </button>
              <button
                onClick={() => setIsAcceptConfirmOpen(false)}
                className="px-6 py-2 border-2 border-secondary text-secondary text-sm font-semibold rounded hover:bg-secondary/10 transition-colors"
              >
                CANCEL
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
