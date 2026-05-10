"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Referral } from "@/lib/api/referrals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MedicalAlertTagInput } from "@/components/ui/MedicalAlertTagInput";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { filterTaxonomy } from "@/lib/data/filterTaxonomy";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EditReferralModalProps {
  referral: Referral | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Referral>) => void | Promise<void>;
}

export function EditReferralModal({ referral, isOpen, onClose, onSave }: EditReferralModalProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [formData, setFormData] = useState({
    chart_number: "",
    age: "",
    sex: "",
    medical_alert: "",
    clinical_section_origin: "",
    clinical_section_destination: "",
    clinical_discipline_origin: "",
    clinical_discipline_destination: "",
    treatment_service_origin: "",
    treatment_service_destination: "",
    special_case: "",
    tentative_appointment_schedule: "",
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
        age: referral.age?.toString() || "",
        sex: referral.sex || "",
        medical_alert: referral.medical_alert || "",
        clinical_section_origin: referral.clinical_section_origin || "",
        clinical_section_destination: referral.clinical_section_destination || "",
        clinical_discipline_origin: referral.clinical_discipline_origin || "",
        clinical_discipline_destination: referral.clinical_discipline_destination || "",
        treatment_service_origin: referral.treatment_service_origin || "",
        treatment_service_destination: referral.treatment_service_destination || "",
        special_case: referral.special_case || "",
        tentative_appointment_schedule: (() => {
          const raw = referral.tentative_appointment_schedule;
          if (!raw) return "";
          const d = new Date(raw);
          const pad = (n: number) => String(n).padStart(2, '0');
          return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        })(),
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
  }, [referral?.id, isOpen]);

  if (!isOpen || !referral) return null;

  const handleSectionOriginChange = (sectionId: string) => {
    setSelectedSectionOrigin(sectionId);
    const section = filterTaxonomy.find(s => s.id === sectionId);
    
    // For Prosthodontics, auto-select the single discipline
    if (sectionId === "prostho" && section?.clinicalDisciplines.length === 1) {
      setSelectedDisciplineOrigin(section.clinicalDisciplines[0].id);
      setFormData(prev => ({
        ...prev,
        clinical_section_origin: section?.shortName || "",
        clinical_discipline_origin: section.clinicalDisciplines[0].name,
        treatment_service_origin: "",
      }));
    } else {
      setSelectedDisciplineOrigin("");
      setFormData(prev => ({
        ...prev,
        clinical_section_origin: section?.shortName || "",
        clinical_discipline_origin: "",
        treatment_service_origin: "",
      }));
    }
  };

  const handleSectionDestinationChange = (sectionId: string) => {
    setSelectedSectionDestination(sectionId);
    const section = filterTaxonomy.find(s => s.id === sectionId);
    
    // For Prosthodontics, auto-select the single discipline
    if (sectionId === "prostho" && section?.clinicalDisciplines.length === 1) {
      setSelectedDisciplineDestination(section.clinicalDisciplines[0].id);
      setFormData(prev => ({
        ...prev,
        clinical_section_destination: section?.shortName || "",
        clinical_discipline_destination: section.clinicalDisciplines[0].name,
        treatment_service_destination: "",
      }));
    } else {
      setSelectedDisciplineDestination("");
      setFormData(prev => ({
        ...prev,
        clinical_section_destination: section?.shortName || "",
        clinical_discipline_destination: "",
        treatment_service_destination: "",
      }));
    }
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

  const handleTreatmentOriginChange = (treatmentName: string) => {
    setFormData(prev => ({
      ...prev,
      treatment_service_origin: treatmentName,
    }));
  };

  const handleTreatmentDestinationChange = (treatmentName: string) => {
    setFormData(prev => ({
      ...prev,
      treatment_service_destination: treatmentName,
      special_case: treatmentName === "Special Case" ? prev.special_case : "",
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

  const confirmSave = async () => {
    const apptRaw = formData.tentative_appointment_schedule;
    let apptISO: string | null = null;
    if (apptRaw) {
      const d = new Date(apptRaw);
      const tzOffset = -d.getTimezoneOffset();
      const sign = tzOffset >= 0 ? '+' : '-';
      const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');
      apptISO = `${apptRaw.substring(0, 16)}:00${sign}${pad(tzOffset / 60)}:${pad(tzOffset % 60)}`;
    }
    await onSave(referral.id, {
      ...formData,
      age: formData.age ? parseInt(formData.age) : null,
      tentative_appointment_schedule: apptISO,
      edit_request_reason: null,
      edit_request_status: null,
    });
    setIsConfirmOpen(false);
  };

  return (
    <>
    <Dialog open={isOpen && !isConfirmOpen} onOpenChange={onClose}>
        <DialogContent className="bg-white max-w-[420px] w-[92vw] sm:w-full p-0 gap-0 rounded-xl overflow-hidden shadow-xl max-h-[85vh] overflow-y-auto [&>button:last-child]:hidden">
          <DialogHeader className="bg-secondary p-3 sm:p-4 sticky top-0 z-10 flex flex-row items-start justify-between">
            <div>
              <DialogTitle className="text-white font-bold text-xs sm:text-sm uppercase tracking-wide">
                Edit Referral
              </DialogTitle>
              <p className="text-white/70 text-[10px] mt-0.5">Update the referral details below</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/20 transition-colors mt-0.5"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">

            {/* Patient Info */}
            <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 space-y-2">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-wide block">Patient Info</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Chart Number *</label>
                  <Input
                    className="h-8 text-xs border-gray-300 focus:ring-secondary"
                    value={formData.chart_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, chart_number: e.target.value }))}
                    placeholder="Chart number"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Age</label>
                  <Input
                    className="h-8 text-xs border-gray-300 focus:ring-secondary"
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                    placeholder="Age"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Sex</label>
                  <select
                    className="w-full h-8 text-xs px-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary bg-white"
                    value={formData.sex}
                    onChange={(e) => setFormData(prev => ({ ...prev, sex: e.target.value }))}
                  >
                    <option value="">Select Sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Medical Alert */}
            <div className="bg-red-50 rounded-lg p-2.5 sm:p-3 border border-red-200">
              <label className="text-[10px] font-bold text-red-700 uppercase tracking-wide mb-1.5 block">Medical Alert</label>
              <MedicalAlertTagInput
                value={formData.medical_alert}
                onChange={(val) => setFormData(prev => ({ ...prev, medical_alert: val }))}
              />
            </div>

            {/* Clinical Pathway - Origin */}
            <div className="bg-blue-50 rounded-lg p-2.5 sm:p-3 border border-blue-200 space-y-2">
              <label className="text-[10px] font-bold text-blue-700 uppercase tracking-wide block">Clinical Pathway — Origin</label>
              <div>
                <label className="text-[10px] font-semibold text-blue-500 mb-1 block">Clinical Section</label>
                <select
                  value={selectedSectionOrigin}
                  onChange={(e) => handleSectionOriginChange(e.target.value)}
                  className="w-full h-8 text-xs px-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select Section</option>
                  {filterTaxonomy.map(section => (
                    <option key={section.id} value={section.id}>{section.name} ({section.shortName})</option>
                  ))}
                </select>
              </div>
              {selectedSectionOrigin !== "prostho" && (
                <div>
                  <label className="text-[10px] font-semibold text-blue-500 mb-1 block">Clinical Discipline</label>
                  <select
                    value={selectedDisciplineOrigin}
                    onChange={(e) => handleDisciplineOriginChange(e.target.value)}
                    disabled={!selectedSectionOrigin}
                    className="w-full h-8 text-xs px-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Discipline</option>
                    {getAvailableDisciplinesOrigin().map(discipline => (
                      <option key={discipline.id} value={discipline.id}>{discipline.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Clinical Pathway - Destination */}
            <div className="bg-green-50 rounded-lg p-2.5 sm:p-3 border border-green-200 space-y-2">
              <label className="text-[10px] font-bold text-green-700 uppercase tracking-wide block">Clinical Pathway — Destination</label>
              <div>
                <label className="text-[10px] font-semibold text-green-500 mb-1 block">Clinical Section</label>
                <select
                  value={selectedSectionDestination}
                  onChange={(e) => handleSectionDestinationChange(e.target.value)}
                  className="w-full h-8 text-xs px-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="">Select Section</option>
                  {filterTaxonomy.map(section => (
                    <option key={section.id} value={section.id}>{section.name} ({section.shortName})</option>
                  ))}
                </select>
              </div>
              {selectedSectionDestination !== "prostho" && (
                <div>
                  <label className="text-[10px] font-semibold text-green-500 mb-1 block">Clinical Discipline</label>
                  <select
                    value={selectedDisciplineDestination}
                    onChange={(e) => handleDisciplineDestinationChange(e.target.value)}
                    disabled={!selectedSectionDestination}
                    className="w-full h-8 text-xs px-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Discipline</option>
                    {getAvailableDisciplinesDestination().map(discipline => (
                      <option key={discipline.id} value={discipline.id}>{discipline.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-[10px] font-semibold text-green-500 mb-1 block">Treatment Service</label>
                <select
                  value={formData.treatment_service_destination}
                  onChange={(e) => handleTreatmentDestinationChange(e.target.value)}
                  disabled={!selectedDisciplineDestination}
                  className="w-full h-8 text-xs px-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Treatment Service</option>
                  {getAvailableTreatmentsDestination().map(treatment => (
                    <option key={treatment.id} value={treatment.name}>{treatment.name}</option>
                  ))}
                </select>
              </div>
              {formData.treatment_service_destination === "Special Case" && (
              <div>
                <label className="text-[10px] font-semibold text-green-500 mb-1 block">Special Case</label>
                <Input
                  className="h-8 text-xs border-green-300 focus:ring-green-500"
                  value={formData.special_case}
                  onChange={(e) => setFormData(prev => ({ ...prev, special_case: e.target.value }))}
                  placeholder="Enter special case if applicable"
                />
              </div>
              )}
            </div>

            {/* Tentative Appointment */}
            <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 border border-gray-200">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5 block">Tentative Appointment</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  className="w-full sm:flex-1 h-9 text-xs border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary font-medium"
                  type="date"
                  value={formData.tentative_appointment_schedule ? formData.tentative_appointment_schedule.split('T')[0] : ''}
                  onChange={(e) => {
                    const date = e.target.value;
                    const time = formData.tentative_appointment_schedule ? formData.tentative_appointment_schedule.split('T')[1]?.substring(0, 5) : '06:00';
                    setFormData(prev => ({ ...prev, tentative_appointment_schedule: `${date}T${time}` }));
                  }}
                />
                <select
                  className="w-28 h-9 text-xs border-2 border-secondary rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary bg-secondary font-bold text-white cursor-pointer hover:bg-secondary/90 transition-colors [&>option]:bg-white [&>option]:text-gray-700 [&>option]:font-semibold"
                  value={formData.tentative_appointment_schedule ? formData.tentative_appointment_schedule.split('T')[1]?.substring(0, 5) : '06:00'}
                  onChange={(e) => {
                    const date = formData.tentative_appointment_schedule ? formData.tentative_appointment_schedule.split('T')[0] : new Date().toISOString().split('T')[0];
                    setFormData(prev => ({ ...prev, tentative_appointment_schedule: `${date}T${e.target.value}` }));
                  }}
                >
                  {Array.from({ length: 25 }, (_, i) => {
                    const hour = Math.floor(i / 2) + 6;
                    const minute = i % 2 === 0 ? '00' : '30';
                    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                    const period = hour >= 12 ? 'pm' : 'am';
                    const value = `${String(hour).padStart(2, '0')}:${minute}`;
                    return (
                      <option key={value} value={value}>
                        {displayHour}:{minute}{period}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Notes & Special Indications */}
            <div className="bg-yellow-50 rounded-lg p-2.5 sm:p-3 border border-yellow-200">
              <label className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide mb-1.5 block">Notes & Special Indications</label>
              <RichTextEditor
                value={formData.notes_and_special_indications || ""}
                onChange={(val) => setFormData(prev => ({ ...prev, notes_and_special_indications: val }))}
                placeholder="Enter any notes or special indications..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-row gap-2 pt-1.5 w-full">
              <Button
                type="submit"
                className="flex-1 bg-secondary text-white text-[10px] font-bold hover:bg-secondary/90 h-8"
              >
                SAVE CHANGES
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 text-[10px] font-bold h-8"
                onClick={onClose}
              >
                CANCEL
              </Button>
            </div>

          </form>
        </DialogContent>
    </Dialog>

    {/* Separate confirmation dialog — portaled to body */}
    {isConfirmOpen && createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/20"
          onClick={() => setIsConfirmOpen(false)}
        />
        <div className="relative bg-white rounded shadow-2xl border-2 border-gray-300 w-full max-w-md mx-4 p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-secondary mb-2 uppercase tracking-wide">Save Changes</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to save the changes to this referral?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={confirmSave}
                className="flex-1 px-6 py-2 bg-success text-white text-xs font-bold rounded hover:bg-success/90 transition-colors shadow uppercase tracking-wide"
              >
                YES, SAVE
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="flex-1 px-6 py-2 border-2 border-gray-300 text-gray-700 text-xs font-bold rounded hover:bg-muted transition-colors uppercase tracking-wide"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}
