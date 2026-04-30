"use client";

import React, { useEffect, useState, useRef } from "react";
import { Search, X } from "lucide-react";
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
import { supabase } from "@/lib/supabase";

interface ExistingPatientReferralModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

const emptyForm = (): ReferralFormData => ({
  chart_number: "",
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

export function ExistingPatientReferralModal({
  open,
  onOpenChange,
  onSave,
}: ExistingPatientReferralModalProps) {
  const [formData, setFormData] = useState<ReferralFormData>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "found" | "not_found">("idle");

  // Origin cascading filter state
  const [originSection, setOriginSection] = useState("");
  const [originDiscipline, setOriginDiscipline] = useState("");
  const [originTreatment, setOriginTreatment] = useState("");

  // Destination cascading filter state
  const [destSection, setDestSection] = useState("");
  const [destDiscipline, setDestDiscipline] = useState("");
  const [destTreatment, setDestTreatment] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset form on close
  useEffect(() => {
    if (!open) {
      setFormData(emptyForm());
      setOriginSection(""); setOriginDiscipline(""); setOriginTreatment("");
      setDestSection(""); setDestDiscipline(""); setDestTreatment("");
      setLookupStatus("idle");
      setError(null);
    }
  }, [open]);

  const handleChange = (field: keyof ReferralFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-fill patient fields when chart number is typed
  const handleChartNumberChange = (value: string) => {
    handleChange("chart_number", value);
    setLookupStatus("idle");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) return;

    debounceRef.current = setTimeout(async () => {
      setLookupLoading(true);
      try {
        const referralsTable = supabase.from("referrals") as any;
        const { data, error: lookupError } = await referralsTable
          .select("treatment, age, medical_alert, medical_history, notes_and_special_indications")
          .eq("chart_number", value.trim())
          .maybeSingle();

        if (lookupError) throw lookupError;

        if (data) {
          setFormData(prev => ({
            ...prev,
            treatment: data.treatment ?? "",
            age: data.age ?? undefined,
            medical_alert: data.medical_alert ?? "",
            medical_history: data.medical_history ?? "",
            notes_and_special_indications: data.notes_and_special_indications ?? "",
          }));
          setLookupStatus("found");
        } else {
          setLookupStatus("not_found");
        }
      } catch (e) {
        console.error("Chart number lookup error:", e);
        setLookupStatus("not_found");
      } finally {
        setLookupLoading(false);
      }
    }, 600);
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
      treatment_service_destination: treatment?.name || ""
    }));
  };

  // Get available disciplines / treatments
  const getOriginDisciplines = () => {
    if (!originSection) return [];
    const section = filterTaxonomy.find(s => s.id === originSection);
    return section?.clinicalDisciplines || [];
  };

  const getOriginTreatments = () => {
    if (!originSection || !originDiscipline) return [];
    const section = filterTaxonomy.find(s => s.id === originSection);
    const discipline = section?.clinicalDisciplines.find(d => d.id === originDiscipline);
    return discipline?.treatmentServices || [];
  };

  const getDestDisciplines = () => {
    if (!destSection) return [];
    const section = filterTaxonomy.find(s => s.id === destSection);
    return section?.clinicalDisciplines || [];
  };

  const getDestTreatments = () => {
    if (!destSection || !destDiscipline) return [];
    const section = filterTaxonomy.find(s => s.id === destSection);
    const discipline = section?.clinicalDisciplines.find(d => d.id === destDiscipline);
    return discipline?.treatmentServices || [];
  };

  const handleSave = async () => {
    if (!formData.chart_number.trim()) {
      setError("Please enter a chart number.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await createReferral(formData, true);
      onSave?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Error saving referral:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to save referral";
      setError(errorMessage);
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
              Existing Patient Referral
            </DialogTitle>
            <p className="text-white/70 text-[10px] mt-0.5">Enter chart number to auto-fill patient details</p>
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

            {/* Chart Number with lookup */}
            <div>
              <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Chart Number *</label>
              <div className="relative">
                <Input
                  className={`h-8 text-xs pr-7 ${
                    lookupStatus === "found"
                      ? "border-green-400 bg-green-50 focus:ring-green-500"
                      : lookupStatus === "not_found"
                      ? "border-red-400 focus:ring-red-500"
                      : "border-gray-300 focus:ring-secondary"
                  }`}
                  value={formData.chart_number}
                  onChange={(e) => handleChartNumberChange(e.target.value)}
                  placeholder="e.g. 2026-00001"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {lookupLoading ? (
                    <span className="text-gray-400 animate-pulse">…</span>
                  ) : lookupStatus === "found" ? (
                    <span className="text-green-500 font-bold">✓</span>
                  ) : lookupStatus === "not_found" ? (
                    <span className="text-red-400 font-bold">✗</span>
                  ) : (
                    <Search className="h-3 w-3 text-gray-400" />
                  )}
                </span>
              </div>
              {lookupStatus === "not_found" && <p className="text-[10px] text-red-500 mt-1">Chart number not found.</p>}
              {lookupStatus === "found" && <p className="text-[10px] text-green-600 mt-1">Patient details loaded.</p>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Age</label>
                <Input
                  className={`h-8 text-xs border-gray-300 ${lookupStatus === "found" ? "focus:ring-secondary" : "bg-gray-100 cursor-not-allowed"}`}
                  type="number"
                  min="1"
                  max="99"
                  placeholder="1-99"
                  value={formData.age || ""}
                  onChange={(e) => handleChange("age", parseInt(e.target.value) || 0)}
                  readOnly={lookupStatus !== "found"}
                />
              </div>
            </div>
          </div>

          {/* Medical Alert */}
          <div className="bg-red-50 rounded-lg p-2.5 sm:p-3 border border-red-200">
            <label className="text-[10px] font-bold text-red-700 uppercase tracking-wide mb-1.5 block">Medical Alert</label>
            <MedicalAlertTagInput
              value={formData.medical_alert ?? ""}
              onChange={(val) => handleChange("medical_alert", val)}
              disabled={lookupStatus !== "found"}
              placeholder={lookupStatus !== "found" ? "Auto-filled from chart" : "Type an alert and press Enter..."}
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
            <div>
              <label className="text-[10px] font-semibold text-green-500 mb-1 block">Special Case</label>
              <Input
                className="h-8 text-xs border-green-300 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                value={formData.special_case}
                onChange={(e) => handleChange("special_case", e.target.value)}
                disabled={!destSection || (!destDiscipline && destSection !== "prostho") || !destTreatment}
                placeholder="Enter special case if applicable"
              />
            </div>
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
              disabled={lookupStatus !== "found"}
              placeholder="Auto-filled from chart"
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
