"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MedicalAlertTagInput } from "@/components/ui/MedicalAlertTagInput";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { createReferral, ReferralFormData } from "@/lib/api/referrals";
import { filterTaxonomy } from "@/lib/data/filterTaxonomy";
import { getNextChartNumber } from "@/lib/api/referrals";

interface NewPatientReferralModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

export function NewPatientReferralModal({ 
  open, 
  onOpenChange,
  onSave,
}: NewPatientReferralModalProps) {
  const [formData, setFormData] = useState<ReferralFormData>({
    chart_number: "2025-00001",
    treatment: "",
    age: undefined,
    sex: "",
    medical_alert: "",
    clinical_section_origin: "",
    clinical_discipline_origin: "",
    treatment_service_origin: "",
    clinical_section_destination: "",
    clinical_discipline_destination: "",
    treatment_service_destination: "",
    special_case: "",
    medical_history: "",
    tentative_appointment_schedule: "",
    notes_and_special_indications: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const loadNextChartNumber = async () => {
      try {
        const next = await getNextChartNumber();
        setFormData((prev) => ({ ...prev, chart_number: next }));
      } catch (e) {
        console.error("Error getting next chart number:", e);
      }
    };

    loadNextChartNumber();
  }, [open]);

  // Origin cascading filter state
  const [originSection, setOriginSection] = useState("");
  const [originDiscipline, setOriginDiscipline] = useState("");
  const [originTreatment, setOriginTreatment] = useState("");

  // Destination cascading filter state
  const [destSection, setDestSection] = useState("");
  const [destDiscipline, setDestDiscipline] = useState("");
  const [destTreatment, setDestTreatment] = useState("");

  const handleChange = (field: keyof ReferralFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Origin filter handlers
  const handleOriginSectionChange = (sectionId: string) => {
    setOriginSection(sectionId);
    setOriginTreatment("");
    const section = filterTaxonomy.find(s => s.id === sectionId);
    
    // For Prosthodontics, auto-select the single discipline
    if (sectionId === "prostho" && section?.clinicalDisciplines.length === 1) {
      const discipline = section.clinicalDisciplines[0];
      setOriginDiscipline(discipline.id);
      setFormData(prev => ({ 
        ...prev, 
        clinical_section_origin: section?.shortName || "",
        clinical_discipline_origin: discipline.name,
        treatment_service_origin: ""
      }));
    } else {
      setOriginDiscipline("");
      setFormData(prev => ({ 
        ...prev, 
        clinical_section_origin: section?.shortName || "",
        clinical_discipline_origin: "",
        treatment_service_origin: ""
      }));
    }
  };

  const handleOriginDisciplineChange = (disciplineId: string) => {
    setOriginDiscipline(disciplineId);
    setOriginTreatment("");
    const section = filterTaxonomy.find(s => s.id === originSection);
    const discipline = section?.clinicalDisciplines.find(d => d.id === disciplineId);
    setFormData(prev => ({ 
      ...prev, 
      clinical_discipline_origin: discipline?.name || "",
      treatment_service_origin: ""
    }));
  };

  const handleOriginTreatmentChange = (treatmentId: string) => {
    setOriginTreatment(treatmentId);
    const section = filterTaxonomy.find(s => s.id === originSection);
    const discipline = section?.clinicalDisciplines.find(d => d.id === originDiscipline);
    const treatment = discipline?.treatmentServices.find(t => t.id === treatmentId);
    setFormData(prev => ({ 
      ...prev, 
      treatment_service_origin: treatment?.name || ""
    }));
  };

  // Destination filter handlers
  const handleDestSectionChange = (sectionId: string) => {
    setDestSection(sectionId);
    setDestTreatment("");
    const section = filterTaxonomy.find(s => s.id === sectionId);
    
    // For Prosthodontics, auto-select the single discipline
    if (sectionId === "prostho" && section?.clinicalDisciplines.length === 1) {
      const discipline = section.clinicalDisciplines[0];
      setDestDiscipline(discipline.id);
      setFormData(prev => ({ 
        ...prev, 
        clinical_section_destination: section?.shortName || "",
        clinical_discipline_destination: discipline.name,
        treatment_service_destination: ""
      }));
    } else {
      setDestDiscipline("");
      setFormData(prev => ({ 
        ...prev, 
        clinical_section_destination: section?.shortName || "",
        clinical_discipline_destination: "",
        treatment_service_destination: ""
      }));
    }
  };

  const handleDestDisciplineChange = (disciplineId: string) => {
    setDestDiscipline(disciplineId);
    setDestTreatment("");
    const section = filterTaxonomy.find(s => s.id === destSection);
    const discipline = section?.clinicalDisciplines.find(d => d.id === disciplineId);
    setFormData(prev => ({ 
      ...prev, 
      clinical_discipline_destination: discipline?.name || "",
      treatment_service_destination: ""
    }));
  };

  const handleDestTreatmentChange = (treatmentId: string) => {
    setDestTreatment(treatmentId);
    const section = filterTaxonomy.find(s => s.id === destSection);
    const discipline = section?.clinicalDisciplines.find(d => d.id === destDiscipline);
    const treatment = discipline?.treatmentServices.find(t => t.id === treatmentId);
    setFormData(prev => ({ 
      ...prev, 
      treatment_service_destination: treatment?.name || "",
      special_case: treatment?.name === "Special Case" ? prev.special_case : "",
    }));
  };

  // Get available disciplines for origin
  const getOriginDisciplines = () => {
    if (!originSection) return [];
    const section = filterTaxonomy.find(s => s.id === originSection);
    return section?.clinicalDisciplines || [];
  };

  // Get available treatments for origin
  const getOriginTreatments = () => {
    if (!originSection || !originDiscipline) return [];
    const section = filterTaxonomy.find(s => s.id === originSection);
    const discipline = section?.clinicalDisciplines.find(d => d.id === originDiscipline);
    return discipline?.treatmentServices || [];
  };

  // Get available disciplines for destination
  const getDestDisciplines = () => {
    if (!destSection) return [];
    const section = filterTaxonomy.find(s => s.id === destSection);
    return section?.clinicalDisciplines || [];
  };

  // Get available treatments for destination
  const getDestTreatments = () => {
    if (!destSection || !destDiscipline) return [];
    const section = filterTaxonomy.find(s => s.id === destSection);
    const discipline = section?.clinicalDisciplines.find(d => d.id === destDiscipline);
    return discipline?.treatmentServices || [];
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const saveData = { ...formData };
      if (saveData.tentative_appointment_schedule) {
        const d = new Date(saveData.tentative_appointment_schedule);
        const tzOffset = -d.getTimezoneOffset();
        const sign = tzOffset >= 0 ? '+' : '-';
        const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');
        const localISO = `${saveData.tentative_appointment_schedule.substring(0, 16)}:00${sign}${pad(tzOffset / 60)}:${pad(tzOffset % 60)}`;
        saveData.tentative_appointment_schedule = localISO;
      }
      await createReferral(saveData);
      onSave?.();
      onOpenChange(false);
      // Reset form
      setFormData({
        chart_number: "2025-00001",
        treatment: "",
        age: undefined,
        medical_alert: "",
        clinical_section_origin: "",
        clinical_discipline_origin: "",
        treatment_service_origin: "",
        clinical_section_destination: "",
        clinical_discipline_destination: "",
        treatment_service_destination: "",
        special_case: "",
        medical_history: "",
        tentative_appointment_schedule: "",
        notes_and_special_indications: "",
      });
      setOriginSection("");
      setOriginDiscipline("");
      setOriginTreatment("");
      setDestSection("");
      setDestDiscipline("");
      setDestTreatment("");
    } catch (err) {
      console.error("Error saving referral:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to save referral";
      if (errorMessage.toLowerCase().includes("chart number exists")) {
        setError("The chart number exists.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-[420px] w-[92vw] sm:w-full p-0 gap-0 rounded-xl overflow-hidden shadow-xl max-h-[85vh] overflow-y-auto [&>button:last-child]:hidden">
        <DialogHeader className="bg-secondary p-3 sm:p-4 sticky top-0 z-10 flex flex-row items-start justify-between">
          <div>
            <DialogTitle className="text-white font-bold text-xs sm:text-sm uppercase tracking-wide">
              New Patient Referral
            </DialogTitle>
            <p className="text-white/70 text-[10px] mt-0.5">Fill in the details below to create a referral</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/20 transition-colors mt-0.5"
          >
            <X className="h-3.5 w-3.5 text-white" />
          </button>
        </DialogHeader>

        <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
              {error}
            </div>
          )}

          {/* Patient Info */}
          <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 space-y-2">
            <label className="text-[10px] font-bold text-secondary uppercase tracking-wide block">Patient Info</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Chart Number *</label>
                <Input
                  className="h-8 text-xs border-gray-300 focus:ring-secondary"
                  value={formData.chart_number}
                  onChange={(e) => handleChange("chart_number", e.target.value)}
                  placeholder="e.g. 2026-00001"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Age</label>
                <Input
                  className="h-8 text-xs border-gray-300 focus:ring-secondary"
                  type="number"
                  min="1"
                  max="99"
                  placeholder="1-99"
                  value={formData.age || ""}
                  onChange={(e) => handleChange("age", parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Sex</label>
                <select
                  className="w-full h-8 text-xs px-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary bg-white"
                  value={formData.sex || ""}
                  onChange={(e) => handleChange("sex", e.target.value)}
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
              value={formData.medical_alert ?? ""}
              onChange={(val) => handleChange("medical_alert", val)}
            />
          </div>

          {/* Clinical Pathway - Origin */}
          <div className="bg-blue-50 rounded-lg p-2.5 sm:p-3 border border-blue-200 space-y-2">
            <label className="text-[10px] font-bold text-blue-700 uppercase tracking-wide block">Clinical Pathway — Origin</label>
            <div>
              <label className="text-[10px] font-semibold text-blue-500 mb-1 block">Clinical Section</label>
              <select
                value={originSection}
                onChange={(e) => handleOriginSectionChange(e.target.value)}
                className="w-full h-8 text-xs px-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Clinical Section</option>
                {filterTaxonomy.map((section) => (
                  <option key={section.id} value={section.id}>{section.name} ({section.shortName})</option>
                ))}
              </select>
            </div>
            {originSection !== "prostho" && (
              <div>
                <label className="text-[10px] font-semibold text-blue-500 mb-1 block">Clinical Discipline</label>
                <select
                  value={originDiscipline}
                  onChange={(e) => handleOriginDisciplineChange(e.target.value)}
                  disabled={!originSection}
                  className="w-full h-8 text-xs px-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Clinical Discipline</option>
                  {getOriginDisciplines().map((discipline) => (
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
                value={destSection}
                onChange={(e) => handleDestSectionChange(e.target.value)}
                className="w-full h-8 text-xs px-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="">Select Clinical Section</option>
                {filterTaxonomy.map((section) => (
                  <option key={section.id} value={section.id}>{section.name} ({section.shortName})</option>
                ))}
              </select>
            </div>
            {destSection !== "prostho" && (
              <div>
                <label className="text-[10px] font-semibold text-green-500 mb-1 block">Clinical Discipline</label>
                <select
                  value={destDiscipline}
                  onChange={(e) => handleDestDisciplineChange(e.target.value)}
                  disabled={!destSection}
                  className="w-full h-8 text-xs px-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Clinical Discipline</option>
                  {getDestDisciplines().map((discipline) => (
                    <option key={discipline.id} value={discipline.id}>{discipline.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-[10px] font-semibold text-green-500 mb-1 block">Treatment Service</label>
              <select
                value={destTreatment}
                onChange={(e) => handleDestTreatmentChange(e.target.value)}
                disabled={!destSection || (!destDiscipline && destSection !== "prostho")}
                className="w-full h-8 text-xs px-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Treatment Service</option>
                {getDestTreatments().map((treatment) => (
                  <option key={treatment.id} value={treatment.id}>{treatment.name}</option>
                ))}
              </select>
            </div>
            {formData.treatment_service_destination === "Special Case" && (
            <div>
              <label className="text-[10px] font-semibold text-green-500 mb-1 block">Special Case</label>
              <Input
                className="h-8 text-xs border-green-300 focus:ring-green-500"
                value={formData.special_case}
                onChange={(e) => handleChange("special_case", e.target.value)}
                placeholder="Enter special case if applicable"
              />
            </div>
            )}
          </div>

          {/* Appointment */}
          <div>
            <label className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5 block">Tentative Appointment</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                className="w-full sm:flex-1 h-9 text-xs border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary font-medium"
                type="date"
                value={formData.tentative_appointment_schedule ? formData.tentative_appointment_schedule.split('T')[0] : ''}
                onChange={(e) => {
                  const date = e.target.value;
                  const time = formData.tentative_appointment_schedule ? formData.tentative_appointment_schedule.split('T')[1] : '06:00';
                  handleChange("tentative_appointment_schedule", `${date}T${time}`);
                }}
              />
              <select
                className="w-28 h-9 text-xs border-2 border-secondary rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary bg-secondary font-bold text-white cursor-pointer hover:bg-secondary/90 transition-colors [&>option]:bg-white [&>option]:text-gray-700 [&>option]:font-semibold"
                value={formData.tentative_appointment_schedule ? formData.tentative_appointment_schedule.split('T')[1]?.substring(0, 5) : '06:00'}
                onChange={(e) => {
                  const date = formData.tentative_appointment_schedule ? formData.tentative_appointment_schedule.split('T')[0] : new Date().toISOString().split('T')[0];
                  handleChange("tentative_appointment_schedule", `${date}T${e.target.value}`);
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

          {/* Notes */}
          <div className="bg-yellow-50 rounded-lg p-2.5 sm:p-3 border border-yellow-200">
            <label className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide mb-1.5 block">Notes & Special Indications</label>
            <RichTextEditor
              value={formData.notes_and_special_indications || ""}
              onChange={(val) => handleChange("notes_and_special_indications", val)}
              placeholder="Enter any notes or special indications..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-row gap-2 pt-1.5 w-full">
            <Button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-secondary hover:bg-secondary/90 text-white text-[10px] font-bold uppercase h-8 disabled:opacity-50"
            >
              {loading ? "SAVING..." : "SAVE"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 text-[10px] font-bold h-8"
            >
              CANCEL
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
