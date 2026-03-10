"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Referral } from "@/lib/api/referrals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { filterTaxonomy } from "@/lib/data/filterTaxonomy";

interface EditReferralModalProps {
  referral: Referral | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Referral>) => void;
}

export function EditReferralModal({ referral, isOpen, onClose, onSave }: EditReferralModalProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [formData, setFormData] = useState({
    chart_number: "",
    treatment: "",
    age: "",
    medical_alert: "",
    clinical_section_origin: "",
    clinical_section_destination: "",
    clinical_discipline_origin: "",
    clinical_discipline_destination: "",
    treatment_service_origin: "",
    treatment_service_destination: "",
    medical_history: "",
    notes_and_special_indications: "",
  });

  const [selectedSectionOrigin, setSelectedSectionOrigin] = useState("");
  const [selectedSectionDestination, setSelectedSectionDestination] = useState("");
  const [selectedDisciplineOrigin, setSelectedDisciplineOrigin] = useState("");
  const [selectedDisciplineDestination, setSelectedDisciplineDestination] = useState("");

  useEffect(() => {
    if (referral && isOpen) {
      setFormData({
        chart_number: referral.chart_number || "",
        treatment: referral.treatment || "",
        age: referral.age?.toString() || "",
        medical_alert: referral.medical_alert || "",
        clinical_section_origin: referral.clinical_section_origin || "",
        clinical_section_destination: referral.clinical_section_destination || "",
        clinical_discipline_origin: referral.clinical_discipline_origin || "",
        clinical_discipline_destination: referral.clinical_discipline_destination || "",
        treatment_service_origin: referral.treatment_service_origin || "",
        treatment_service_destination: referral.treatment_service_destination || "",
        medical_history: referral.medical_history || "",
        notes_and_special_indications: referral.notes_and_special_indications || "",
      });

      // Find selected sections
      const sectionOrigin = filterTaxonomy.find(s => s.shortName === referral.clinical_section_origin);
      const sectionDestination = filterTaxonomy.find(s => s.shortName === referral.clinical_section_destination);
      
      setSelectedSectionOrigin(sectionOrigin?.id || "");
      setSelectedSectionDestination(sectionDestination?.id || "");

      // Find selected disciplines
      if (sectionOrigin) {
        const disciplineOrigin = sectionOrigin.clinicalDisciplines.find(d => d.name === referral.clinical_discipline_origin);
        setSelectedDisciplineOrigin(disciplineOrigin?.id || "");
      }
      if (sectionDestination) {
        const disciplineDestination = sectionDestination.clinicalDisciplines.find(d => d.name === referral.clinical_discipline_destination);
        setSelectedDisciplineDestination(disciplineDestination?.id || "");
      }
    }
  }, [referral, isOpen]);

  if (!isOpen || !referral) return null;

  const handleSectionOriginChange = (sectionId: string) => {
    setSelectedSectionOrigin(sectionId);
    setSelectedDisciplineOrigin("");
    const section = filterTaxonomy.find(s => s.id === sectionId);
    setFormData(prev => ({
      ...prev,
      clinical_section_origin: section?.shortName || "",
      clinical_discipline_origin: "",
      treatment_service_origin: "",
    }));
  };

  const handleSectionDestinationChange = (sectionId: string) => {
    setSelectedSectionDestination(sectionId);
    setSelectedDisciplineDestination("");
    const section = filterTaxonomy.find(s => s.id === sectionId);
    setFormData(prev => ({
      ...prev,
      clinical_section_destination: section?.shortName || "",
      clinical_discipline_destination: "",
      treatment_service_destination: "",
    }));
  };

  const handleDisciplineOriginChange = (disciplineId: string) => {
    setSelectedDisciplineOrigin(disciplineId);
    const section = filterTaxonomy.find(s => s.id === selectedSectionOrigin);
    const discipline = section?.clinicalDisciplines.find(d => d.id === disciplineId);
    setFormData(prev => ({
      ...prev,
      clinical_discipline_origin: discipline?.name || "",
      treatment_service_origin: "",
    }));
  };

  const handleDisciplineDestinationChange = (disciplineId: string) => {
    setSelectedDisciplineDestination(disciplineId);
    const section = filterTaxonomy.find(s => s.id === selectedSectionDestination);
    const discipline = section?.clinicalDisciplines.find(d => d.id === disciplineId);
    setFormData(prev => ({
      ...prev,
      clinical_discipline_destination: discipline?.name || "",
      treatment_service_destination: "",
    }));
  };

  const handleTreatmentOriginChange = (treatmentId: string) => {
    const section = filterTaxonomy.find(s => s.id === selectedSectionOrigin);
    const discipline = section?.clinicalDisciplines.find(d => d.id === selectedDisciplineOrigin);
    const treatment = discipline?.treatmentServices.find(t => t.id === treatmentId);
    setFormData(prev => ({
      ...prev,
      treatment_service_origin: treatment?.name || "",
    }));
  };

  const handleTreatmentDestinationChange = (treatmentId: string) => {
    const section = filterTaxonomy.find(s => s.id === selectedSectionDestination);
    const discipline = section?.clinicalDisciplines.find(d => d.id === selectedDisciplineDestination);
    const treatment = discipline?.treatmentServices.find(t => t.id === treatmentId);
    setFormData(prev => ({
      ...prev,
      treatment_service_destination: treatment?.name || "",
    }));
  };

  const getAvailableDisciplinesOrigin = () => {
    if (!selectedSectionOrigin) return [];
    const section = filterTaxonomy.find(s => s.id === selectedSectionOrigin);
    return section?.clinicalDisciplines || [];
  };

  const getAvailableDisciplinesDestination = () => {
    if (!selectedSectionDestination) return [];
    const section = filterTaxonomy.find(s => s.id === selectedSectionDestination);
    return section?.clinicalDisciplines || [];
  };

  const getAvailableTreatmentsOrigin = () => {
    if (!selectedSectionOrigin || !selectedDisciplineOrigin) return [];
    const section = filterTaxonomy.find(s => s.id === selectedSectionOrigin);
    const discipline = section?.clinicalDisciplines.find(d => d.id === selectedDisciplineOrigin);
    return discipline?.treatmentServices || [];
  };

  const getAvailableTreatmentsDestination = () => {
    if (!selectedSectionDestination || !selectedDisciplineDestination) return [];
    const section = filterTaxonomy.find(s => s.id === selectedSectionDestination);
    const discipline = section?.clinicalDisciplines.find(d => d.id === selectedDisciplineDestination);
    return discipline?.treatmentServices || [];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirmOpen(true);
  };

  const confirmSave = () => {
    onSave(referral.id, {
      ...formData,
      age: formData.age ? parseInt(formData.age) : null,
    });
    setIsConfirmOpen(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-secondary rounded-t-2xl px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-1">Edit Referral</p>
            <h2 className="text-white font-bold text-sm">Update Referral Details</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Status Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
              referral.status === 'approved'
                ? "bg-green-100 text-green-700 border border-green-300"
                : referral.accepted_by && referral.accepted_by !== 'None'
                ? "bg-orange-100 text-orange-700 border border-orange-300"
                : "bg-green-100 text-green-700 border border-green-300"
            }`}>
              {referral.status === 'approved' ? "APPROVED" : referral.accepted_by && referral.accepted_by !== 'None' ? "PENDING" : "AVAILABLE"}
            </span>
          </div>

          {/* Patient Information */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-secondary uppercase tracking-wide mb-3">Patient Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Chart Number</label>
                <Input
                  value={formData.chart_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, chart_number: e.target.value }))}
                  className="text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Age</label>
                <Input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                  className="text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Treatment</label>
              <Input
                value={formData.treatment}
                onChange={(e) => setFormData(prev => ({ ...prev, treatment: e.target.value }))}
                className="text-xs"
              />
            </div>
          </div>

          {/* Medical Alert */}
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <label className="block text-xs font-bold text-red-700 uppercase tracking-wide mb-2">Medical Alert</label>
            <textarea
              value={formData.medical_alert}
              onChange={(e) => setFormData(prev => ({ ...prev, medical_alert: e.target.value }))}
              className="w-full text-xs border border-red-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={2}
              placeholder="Enter any medical alerts..."
            />
          </div>

          {/* Clinical Pathway - Origin */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 space-y-3">
            <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wide">Clinical Pathway — Origin</h3>
            <div>
              <label className="block text-xs font-semibold text-blue-700 mb-1">Clinical Section</label>
              <select
                value={selectedSectionOrigin}
                onChange={(e) => handleSectionOriginChange(e.target.value)}
                className="w-full text-xs border border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Section</option>
                {filterTaxonomy.map(section => (
                  <option key={section.id} value={section.id}>{section.name} ({section.shortName})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-700 mb-1">Clinical Discipline</label>
              <select
                value={selectedDisciplineOrigin}
                onChange={(e) => handleDisciplineOriginChange(e.target.value)}
                disabled={!selectedSectionOrigin}
                className="w-full text-xs border border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Discipline</option>
                {getAvailableDisciplinesOrigin().map(discipline => (
                  <option key={discipline.id} value={discipline.id}>{discipline.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-700 mb-1">Treatment Service</label>
              <select
                value={formData.treatment_service_origin}
                onChange={(e) => handleTreatmentOriginChange(e.target.value)}
                disabled={!selectedDisciplineOrigin}
                className="w-full text-xs border border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Treatment Service</option>
                {getAvailableTreatmentsOrigin().map(treatment => (
                  <option key={treatment.id} value={treatment.id}>{treatment.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Clinical Pathway - Destination */}
          <div className="bg-green-50 rounded-xl p-4 border border-green-200 space-y-3">
            <h3 className="text-xs font-bold text-green-700 uppercase tracking-wide">Clinical Pathway — Destination</h3>
            <div>
              <label className="block text-xs font-semibold text-green-700 mb-1">Clinical Section</label>
              <select
                value={selectedSectionDestination}
                onChange={(e) => handleSectionDestinationChange(e.target.value)}
                className="w-full text-xs border border-green-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Section</option>
                {filterTaxonomy.map(section => (
                  <option key={section.id} value={section.id}>{section.name} ({section.shortName})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-green-700 mb-1">Clinical Discipline</label>
              <select
                value={selectedDisciplineDestination}
                onChange={(e) => handleDisciplineDestinationChange(e.target.value)}
                disabled={!selectedSectionDestination}
                className="w-full text-xs border border-green-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Discipline</option>
                {getAvailableDisciplinesDestination().map(discipline => (
                  <option key={discipline.id} value={discipline.id}>{discipline.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-green-700 mb-1">Treatment Service</label>
              <select
                value={formData.treatment_service_destination}
                onChange={(e) => handleTreatmentDestinationChange(e.target.value)}
                disabled={!selectedDisciplineDestination}
                className="w-full text-xs border border-green-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Treatment Service</option>
                {getAvailableTreatmentsDestination().map(treatment => (
                  <option key={treatment.id} value={treatment.id}>{treatment.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Medical History */}
          <div className="bg-gray-50 rounded-xl p-4">
            <label className="block text-xs font-bold text-secondary uppercase tracking-wide mb-2">Medical History</label>
            <textarea
              value={formData.medical_history}
              onChange={(e) => setFormData(prev => ({ ...prev, medical_history: e.target.value }))}
              className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary"
              rows={3}
              placeholder="Enter medical history..."
            />
          </div>

          {/* Notes & Special Indications */}
          <div className="bg-gray-50 rounded-xl p-4">
            <label className="block text-xs font-bold text-secondary uppercase tracking-wide mb-2">Notes & Special Indications</label>
            <textarea
              value={formData.notes_and_special_indications}
              onChange={(e) => setFormData(prev => ({ ...prev, notes_and_special_indications: e.target.value }))}
              className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary"
              rows={3}
              placeholder="Enter notes and special indications..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 text-xs font-bold"
            >
              CANCEL
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-secondary text-white text-xs font-bold hover:bg-secondary/90"
            >
              SAVE CHANGES
            </Button>
          </div>
        </form>
      </div>

      {/* Confirmation Dialog */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsConfirmOpen(false)}
          />

          {/* Confirmation Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-secondary/10 mb-4">
                <svg className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2">Confirm Changes</h3>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to save the changes to this referral?
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setIsConfirmOpen(false)}
                  variant="outline"
                  className="flex-1 text-xs font-bold"
                >
                  CANCEL
                </Button>
                <Button
                  type="button"
                  onClick={confirmSave}
                  className="flex-1 bg-secondary text-white text-xs font-bold hover:bg-secondary/90"
                >
                  YES, SAVE CHANGES
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
